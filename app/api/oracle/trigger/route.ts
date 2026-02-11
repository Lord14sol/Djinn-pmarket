import { NextResponse } from 'next/server';
import { GRADUATION_MCAP_SOL, getIgnitionStatusMcap } from '@/lib/core-amm';

// Dynamic imports to avoid build-time errors
async function getOracleModule() {
    return await import('../../../../lib/oracle');
}

async function getSupabaseModule() {
    return await import('../../../../lib/supabase-db');
}

/**
 * POST /api/oracle/trigger
 * Triggers Cerberus verification for a market when it reaches MCAP threshold
 *
 * Body:
 * - market_slug: string (required)
 * - market_title: string (required)
 * - current_mcap_sol: number (required) - Current MCAP in SOL
 * - force?: boolean - Force trigger even if under threshold
 */
export async function POST(request: Request) {
    try {
        // --- SECURITY CHECK ---
        const adminSecret = request.headers.get('x-admin-secret');
        if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
            console.warn('[API] Unauthorized oracle trigger attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { market_slug, market_title, current_mcap_sol, force = false } = body;

        if (!market_slug || !market_title || current_mcap_sol === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: market_slug, market_title, current_mcap_sol' },
                { status: 400 }
            );
        }

        const { logOracleEvent, getOracleConfig } = await getOracleModule();
        const { getMarketBySlug, updateMarketVerificationStatus } = await getSupabaseModule();

        // Check MCAP threshold
        const ignitionStatus = getIgnitionStatusMcap(current_mcap_sol);
        const isViralMode = ignitionStatus === 'VIRAL';

        if (!isViralMode && !force) {
            return NextResponse.json({
                triggered: false,
                reason: 'MCAP threshold not reached',
                current_mcap_sol,
                required_mcap_sol: GRADUATION_MCAP_SOL,
                progress: (current_mcap_sol / GRADUATION_MCAP_SOL) * 100,
                ignition_status: ignitionStatus
            });
        }

        // Check if market exists and hasn't been verified yet
        const market = await getMarketBySlug(market_slug);
        if (!market) {
            return NextResponse.json(
                { error: 'Market not found' },
                { status: 404 }
            );
        }

        // Check if already in verification queue
        if (market.verification_status === 'pending' || market.verification_status === 'verified') {
            return NextResponse.json({
                triggered: false,
                reason: 'Market already in verification queue or verified',
                verification_status: market.verification_status
            });
        }

        // Check if oracle bot is enabled
        const config = await getOracleConfig();
        if (!config.bot_enabled) {
            // Mark for manual verification
            await updateMarketVerificationStatus(market_slug, 'pending_manual');
            await logOracleEvent('system', `Market ${market_slug} reached MCAP but bot is disabled. Marked for manual verification.`);

            return NextResponse.json({
                triggered: false,
                reason: 'Oracle bot disabled - marked for manual verification',
                verification_status: 'pending_manual'
            });
        }

        // Trigger Cerberus verification
        await logOracleEvent('system', `🎯 MCAP TRIGGER: ${market_slug} reached ${current_mcap_sol.toFixed(2)} SOL (${(current_mcap_sol / GRADUATION_MCAP_SOL * 100).toFixed(1)}%)`);

        // Update market status to pending verification
        await updateMarketVerificationStatus(market_slug, 'pending');

        // Import and run the OracleBot
        const { OracleBot } = await import('../../../../lib/oracle/bot');
        const bot = new OracleBot();
        await bot.init();

        // Run analysis in background (don't await to respond fast)
        bot.analyzeMarket(market_slug, market_title).catch((err: Error) => {
            console.error(`[CERBERUS] Analysis failed for ${market_slug}:`, err);
            logOracleEvent('error', `Analysis failed for ${market_slug}: ${err.message}`);
        });

        await logOracleEvent('system', `🐕 CERBERUS activated for: ${market_title}`);

        return NextResponse.json({
            triggered: true,
            market_slug,
            current_mcap_sol,
            threshold_mcap_sol: GRADUATION_MCAP_SOL,
            ignition_status: ignitionStatus,
            message: 'Cerberus verification started'
        });

    } catch (error) {
        console.error('Error in oracle trigger:', error);
        return NextResponse.json(
            { error: 'Failed to trigger oracle', details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * GET /api/oracle/trigger
 * Check if a market is ready for verification trigger
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const market_slug = searchParams.get('market_slug');
        const current_mcap_sol = parseFloat(searchParams.get('mcap') || '0');

        if (!market_slug) {
            // Return general trigger info
            return NextResponse.json({
                graduation_mcap_sol: GRADUATION_MCAP_SOL,
                graduation_mcap_usd: GRADUATION_MCAP_SOL * 100, // Assuming $100/SOL
                description: 'Market verification triggers when MCAP reaches this threshold'
            });
        }

        const ignitionStatus = getIgnitionStatusMcap(current_mcap_sol);
        const progress = (current_mcap_sol / GRADUATION_MCAP_SOL) * 100;

        return NextResponse.json({
            market_slug,
            current_mcap_sol,
            graduation_mcap_sol: GRADUATION_MCAP_SOL,
            progress: Math.min(100, progress),
            ignition_status: ignitionStatus,
            ready_for_trigger: ignitionStatus === 'VIRAL',
            trigger_url: `/api/oracle/trigger`
        });

    } catch (error) {
        console.error('Error checking trigger status:', error);
        return NextResponse.json(
            { error: 'Failed to check trigger status', details: String(error) },
            { status: 500 }
        );
    }
}
