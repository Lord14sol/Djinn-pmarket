/**
 * POST /api/webhooks — Register a webhook URL for bot notifications
 * GET  /api/webhooks — List registered webhooks for authenticated bot
 * DELETE /api/webhooks/[id] — Remove a webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_EVENTS = [
    'market_created',
    'market_resolved',
    'chronos_round',
    'bounty_available',
    'bounty_expiring',
    'bot_frozen',
    'bot_unfrozen',
    'vault_circuit_breaker',
    'vault_deposit',
    'vault_withdrawal',
    'slash_proposal',
    'slash_resolved',
    'tier_upgrade',
];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, events, botPublicKey } = body;

        // Validate URL
        if (!url || !url.startsWith('https://')) {
            return NextResponse.json(
                { error: 'Webhook URL must be HTTPS' },
                { status: 400 }
            );
        }

        // Validate events
        if (!events || !Array.isArray(events) || events.length === 0) {
            return NextResponse.json(
                { error: 'Must specify at least one event' },
                { status: 400 }
            );
        }

        const invalidEvents = events.filter((e: string) => !VALID_EVENTS.includes(e));
        if (invalidEvents.length > 0) {
            return NextResponse.json(
                { error: `Invalid events: ${invalidEvents.join(', ')}` },
                { status: 400 }
            );
        }

        // Generate webhook secret for HMAC signing
        const secret = crypto.randomBytes(32).toString('hex');

        const { data, error } = await supabase
            .from('bot_webhooks')
            .insert({
                bot_public_key: botPublicKey,
                url,
                events,
                secret,
                is_active: true,
                failure_count: 0,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            id: data.id,
            url: data.url,
            events: data.events,
            secret, // Only shown once at creation
            message: 'Webhook registered. Save the secret — it won\'t be shown again.',
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: 'Internal server error', details: err.message },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const botPublicKey = searchParams.get('bot');

        if (!botPublicKey) {
            return NextResponse.json(
                { error: 'bot query parameter required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('bot_webhooks')
            .select('id, url, events, is_active, failure_count, created_at')
            .eq('bot_public_key', botPublicKey);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ webhooks: data });
    } catch (err: any) {
        return NextResponse.json(
            { error: 'Internal server error', details: err.message },
            { status: 500 }
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK DELIVERY HELPER (used by event emitters)
// ═══════════════════════════════════════════════════════════════════════════════

export async function deliverWebhook(
    webhookUrl: string,
    secret: string,
    payload: any
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const body = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Djinn-Signature': `sha256=${signature}`,
                'X-Djinn-Event': payload.event,
                'X-Djinn-Delivery': crypto.randomUUID(),
            },
            body,
            signal: AbortSignal.timeout(10_000), // 10s timeout
        });

        return {
            success: response.ok,
            statusCode: response.status,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.message,
        };
    }
}

/**
 * Emit an event to all registered webhooks for a given event type
 * Called by platform services when events occur
 */
export async function emitWebhookEvent(
    eventType: string,
    eventData: any,
    targetBots?: string[] // Filter to specific bots, or all if undefined
): Promise<void> {
    let query = supabase
        .from('bot_webhooks')
        .select('*')
        .eq('is_active', true)
        .contains('events', [eventType]);

    if (targetBots && targetBots.length > 0) {
        query = query.in('bot_public_key', targetBots);
    }

    const { data: webhooks } = await query;
    if (!webhooks || webhooks.length === 0) return;

    const payload = {
        event: eventType,
        data: eventData,
        timestamp: Math.floor(Date.now() / 1000),
    };

    // Deliver to all matching webhooks in parallel
    const results = await Promise.allSettled(
        webhooks.map(async (wh: any) => {
            const result = await deliverWebhook(wh.url, wh.secret, payload);

            // Track failures — disable after 3 consecutive failures
            if (!result.success) {
                const newCount = wh.failure_count + 1;
                await supabase
                    .from('bot_webhooks')
                    .update({
                        failure_count: newCount,
                        is_active: newCount < 3,
                    })
                    .eq('id', wh.id);
            } else if (wh.failure_count > 0) {
                // Reset failure count on success
                await supabase
                    .from('bot_webhooks')
                    .update({ failure_count: 0 })
                    .eq('id', wh.id);
            }
        })
    );
}
