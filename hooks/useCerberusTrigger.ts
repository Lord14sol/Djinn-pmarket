'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GRADUATION_MCAP_SOL, getIgnitionStatusMcap } from '@/lib/core-amm';

interface MarketMcapData {
    slug: string;
    title: string;
    totalPoolSol: number;
    estimatedMcapSol: number;
}

/**
 * Hook that monitors market MCAP and triggers Cerberus verification
 * when the graduation threshold is reached.
 *
 * @param marketData - Current market data with pool values
 * @param enabled - Whether to enable automatic trigger checking
 */
export function useCerberusTrigger(
    marketData: MarketMcapData | null,
    enabled: boolean = true
) {
    const triggeredRef = useRef<Set<string>>(new Set());
    const lastCheckRef = useRef<number>(0);

    const triggerVerification = useCallback(async (market: MarketMcapData) => {
        // Prevent duplicate triggers
        if (triggeredRef.current.has(market.slug)) {
            console.log(`[CERBERUS] Already triggered for ${market.slug}, skipping`);
            return;
        }

        // Mark as triggered immediately to prevent race conditions
        triggeredRef.current.add(market.slug);

        try {
            console.log(`[CERBERUS] 🎯 Triggering verification for ${market.slug} (MCAP: ${market.estimatedMcapSol.toFixed(2)} SOL)`);

            const response = await fetch('/api/oracle/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    market_slug: market.slug,
                    market_title: market.title,
                    current_mcap_sol: market.estimatedMcapSol
                })
            });

            const result = await response.json();

            if (result.triggered) {
                console.log(`[CERBERUS] ✅ Verification started for ${market.slug}`);
            } else {
                console.log(`[CERBERUS] ⚠️ Trigger skipped: ${result.reason}`);
                // Remove from triggered set if it wasn't actually triggered
                // (allows retry if conditions change)
                if (result.reason !== 'Market already in verification queue or verified') {
                    triggeredRef.current.delete(market.slug);
                }
            }

            return result;
        } catch (error) {
            console.error(`[CERBERUS] ❌ Trigger failed for ${market.slug}:`, error);
            // Remove from triggered set to allow retry
            triggeredRef.current.delete(market.slug);
            return null;
        }
    }, []);

    useEffect(() => {
        if (!enabled || !marketData) return;

        // Throttle checks to every 10 seconds
        const now = Date.now();
        if (now - lastCheckRef.current < 10000) return;
        lastCheckRef.current = now;

        const { slug, title, estimatedMcapSol } = marketData;
        const ignitionStatus = getIgnitionStatusMcap(estimatedMcapSol);

        // Check if we've reached VIRAL mode (100% of graduation MCAP)
        if (ignitionStatus === 'VIRAL') {
            console.log(`[CERBERUS] 🔥 VIRAL MODE DETECTED for ${slug}!`);
            triggerVerification(marketData);
        }
    }, [marketData, enabled, triggerVerification]);

    return {
        graduationMcapSol: GRADUATION_MCAP_SOL,
        triggerVerification,
        isTriggered: marketData ? triggeredRef.current.has(marketData.slug) : false
    };
}

/**
 * Hook for monitoring multiple markets (used in admin/oracle dashboard)
 */
export function useCerberusMonitor(pollingIntervalMs: number = 60000) {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const checkAllMarkets = useCallback(async () => {
        try {
            // Fetch all active markets
            const response = await fetch('/api/markets');
            if (!response.ok) return;

            const markets = await response.json();

            // Filter for markets that haven't been verified yet
            const unverifiedMarkets = markets.filter((m: any) =>
                !m.resolved &&
                (!m.verification_status || m.verification_status === 'none')
            );

            // Check each market's MCAP
            for (const market of unverifiedMarkets) {
                const totalPoolSol = (market.total_yes_pool || 0) + (market.total_no_pool || 0);
                const estimatedMcapSol = totalPoolSol * 1.5; // Conservative multiplier

                const ignitionStatus = getIgnitionStatusMcap(estimatedMcapSol);

                if (ignitionStatus === 'VIRAL') {
                    console.log(`[CERBERUS MONITOR] 🎯 Market ${market.slug} ready for verification`);

                    // Trigger verification
                    await fetch('/api/oracle/trigger', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            market_slug: market.slug,
                            market_title: market.title,
                            current_mcap_sol: estimatedMcapSol
                        })
                    });
                }
            }
        } catch (error) {
            console.error('[CERBERUS MONITOR] Error checking markets:', error);
        }
    }, []);

    const startMonitoring = useCallback(() => {
        if (intervalRef.current) return;

        console.log(`[CERBERUS MONITOR] Starting with ${pollingIntervalMs}ms interval`);
        checkAllMarkets(); // Initial check
        intervalRef.current = setInterval(checkAllMarkets, pollingIntervalMs);
    }, [pollingIntervalMs, checkAllMarkets]);

    const stopMonitoring = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            console.log('[CERBERUS MONITOR] Stopped');
        }
    }, []);

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        startMonitoring,
        stopMonitoring,
        checkAllMarkets,
        isMonitoring: !!intervalRef.current
    };
}
