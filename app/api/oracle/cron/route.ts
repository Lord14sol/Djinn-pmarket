import { NextResponse } from 'next/server';
import { GRADUATION_MCAP_SOL, getIgnitionStatusMcap } from '@/lib/core-amm';

// Dynamic imports
async function getOracleModule() {
    return await import('../../../../lib/oracle');
}

async function getSupabaseModule() {
    return await import('../../../../lib/supabase-db');
}

/**
 * GET /api/oracle/cron
 *
 * Automated cron job endpoint for Cerberus Oracle.
 * This endpoint performs three main tasks:
 *
 * 1. MCAP TRIGGER CHECK: Find markets that have reached $34k MCAP and trigger verification
 * 2. RESOLUTION CHECK: Find expired markets with approved verdicts and resolve them
 * 3. STATUS REPORT: Return summary of all actions taken
 *
 * Can be called by:
 * - Vercel Cron Jobs (vercel.json)
 * - External cron services
 * - Manual admin trigger
 *
 * Security: Add CRON_SECRET header validation in production
 */
export async function GET(request: Request) {
    const startTime = Date.now();
    const results = {
        triggered_verifications: [] as string[],
        resolved_markets: [] as string[],
        errors: [] as string[],
        stats: {
            markets_checked: 0,
            markets_at_viral: 0,
            markets_expired: 0,
            processing_time_ms: 0
        }
    };

    try {
        // --- SECURITY CHECK ---
        const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('x-admin-secret');
        const expectedCronSecret = process.env.CRON_SECRET;
        const expectedAdminSecret = process.env.ADMIN_SECRET;

        // Block unauthorized access if any secret is configured
        if ((expectedCronSecret && cronSecret !== expectedCronSecret) &&
            (expectedAdminSecret && cronSecret !== expectedAdminSecret)) {
            console.warn('[CRON] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { logOracleEvent, getOracleConfig } = await getOracleModule();
        const {
            getActiveMarketsForMcapMonitoring,
            getMarketsPendingResolution,
            getApprovedSuggestions,
            updateMarketVerificationStatus,
            resolveMarket
        } = await getSupabaseModule();
        const { OracleBot } = await import('../../../../lib/oracle/bot');

        // Check if oracle is enabled
        const config = await getOracleConfig();

        await logOracleEvent('system', '🔄 CERBERUS CRON JOB STARTED');

        // ═══════════════════════════════════════════════════════════════
        // PHASE 1: MCAP TRIGGER CHECK
        // ═══════════════════════════════════════════════════════════════
        const activeMarkets = await getActiveMarketsForMcapMonitoring();
        results.stats.markets_checked = activeMarkets.length;

        for (const market of activeMarkets) {
            try {
                // Estimate MCAP (pool value * bonding curve multiplier)
                const estimatedMcapSol = market.total_pool_sol * 1.5;
                const ignitionStatus = getIgnitionStatusMcap(estimatedMcapSol);

                if (ignitionStatus === 'VIRAL') {
                    results.stats.markets_at_viral++;

                    if (config.bot_enabled) {
                        // Update status to pending
                        await updateMarketVerificationStatus(market.slug, 'pending');

                        // Run verification in background
                        const bot = new OracleBot();
                        await bot.init();
                        bot.analyzeMarket(market.slug, market.title).catch((err: Error) => {
                            console.error(`[CRON] Verification failed for ${market.slug}:`, err);
                            results.errors.push(`Verification failed: ${market.slug}`);
                        });

                        results.triggered_verifications.push(market.slug);
                        await logOracleEvent('system', `🎯 Triggered verification: ${market.slug} (${estimatedMcapSol.toFixed(1)} SOL)`);
                    } else {
                        // Mark for manual verification
                        await updateMarketVerificationStatus(market.slug, 'pending_manual');
                        await logOracleEvent('system', `⚠️ Bot disabled, marked for manual: ${market.slug}`);
                    }
                }
            } catch (err) {
                console.error(`[CRON] Error processing market ${market.slug}:`, err);
                results.errors.push(`Error: ${market.slug} - ${String(err)}`);
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // PHASE 2: RESOLUTION CHECK
        // ═══════════════════════════════════════════════════════════════
        const pendingResolution = await getMarketsPendingResolution();
        const approvedSuggestions = await getApprovedSuggestions();
        results.stats.markets_expired = pendingResolution.length;

        for (const market of pendingResolution) {
            try {
                // Find verdict for this market
                let verdict: 'YES' | 'NO' | 'VOID' | null = null;

                if (market.cerberus_verdict) {
                    verdict = market.cerberus_verdict;
                } else {
                    const suggestion = approvedSuggestions.find(s => s.market_slug === market.slug);
                    if (suggestion) {
                        verdict = suggestion.suggested_outcome;
                    }
                }

                if (verdict && (verdict === 'YES' || verdict === 'NO')) {
                    // Execute resolution
                    const result = await resolveMarket(market.slug, verdict);

                    if (!result.error) {
                        results.resolved_markets.push(market.slug);
                        await logOracleEvent('system', `✅ Auto-resolved: ${market.slug} → ${verdict}`);
                    } else {
                        results.errors.push(`Resolution failed: ${market.slug}`);
                    }
                }
            } catch (err) {
                console.error(`[CRON] Error resolving market ${market.slug}:`, err);
                results.errors.push(`Resolution error: ${market.slug} - ${String(err)}`);
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // FINAL REPORT
        // ═══════════════════════════════════════════════════════════════
        results.stats.processing_time_ms = Date.now() - startTime;

        await logOracleEvent('system', `🏁 CRON COMPLETE: ${results.triggered_verifications.length} verified, ${results.resolved_markets.length} resolved, ${results.errors.length} errors (${results.stats.processing_time_ms}ms)`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            graduation_threshold_sol: GRADUATION_MCAP_SOL,
            bot_enabled: config.bot_enabled,
            ...results
        });

    } catch (error) {
        console.error('[CRON] Critical error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Cron job failed',
                details: String(error),
                ...results
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/oracle/cron
 * Manual trigger with options
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'trigger_all') {
            // Trigger immediate cron run
            const response = await GET(request);
            return response;
        }

        return NextResponse.json({
            error: 'Invalid action',
            available_actions: ['trigger_all']
        }, { status: 400 });

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to process request', details: String(error) },
            { status: 500 }
        );
    }
}
