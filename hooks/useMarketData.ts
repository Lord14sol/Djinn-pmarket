
import useSWR, { useSWRConfig } from 'swr';
import * as supabaseDb from '@/lib/supabase-db';
import { useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

// --- Types ---
// Re-export types for convenience
export type { MarketData, Market, Activity, Holder } from '@/lib/supabase-db';

// --- Keys ---
export const MARKET_DATA_KEY = (slug: string) => `market-data-${slug}`;
export const MARKET_INFO_KEY = (slug: string) => `market-info-${slug}`;
export const MARKET_ACTIVITY_KEY = (slug: string) => `market-activity-${slug}`;
export const MARKET_HOLDERS_KEY = (slug: string) => `market-holders-${slug}`;

export function useMarketData(slug: string) {
    // Hooks Config (if needed)

    // 1. Market Data (Live Price, Volume)
    const { data: marketData, error: marketDataError, mutate: mutateMarketData } = useSWR(
        slug ? MARKET_DATA_KEY(slug) : null,
        () => supabaseDb.getMarketData(slug),
        {
            refreshInterval: 0, // Real-time subs handle this
            revalidateOnFocus: true,
        }
    );

    // 2. Market Info (Static Details, Resolution)
    const { data: marketInfo, error: marketInfoError, mutate: mutateMarketInfo } = useSWR(
        slug ? MARKET_INFO_KEY(slug) : null,
        () => supabaseDb.getMarket(slug),
        {
            revalidateOnFocus: false, // Mostly static
            dedupingInterval: 60000,
        }
    );

    // 3. Activity (Recent Trades)
    const { data: activityList, mutate: mutateActivity } = useSWR(
        slug ? MARKET_ACTIVITY_KEY(slug) : null,
        async () => {
            // Replicate logic: slug + outcome IDs (if needed, but basic slug is fine for now)
            // Note: In page.tsx, it creates a list of targetSlugs.
            // For now, we'll fetch just by main slug, or we can expand if we pass outcomes.
            return supabaseDb.getActivity(0, 50, [slug]);
        },
        {
            refreshInterval: 0,
            revalidateOnFocus: true,
        }
    );

    // 4. Top Holders
    const { data: holders, mutate: mutateHolders } = useSWR(
        slug ? MARKET_HOLDERS_KEY(slug) : null,
        () => supabaseDb.getTopHolders(slug),
        {
            refreshInterval: 0,
            revalidateOnFocus: true,
        }
    );

    // --- Real-time Subscriptions ---
    useEffect(() => {
        if (!slug) return;

        let marketSub: RealtimeChannel | null = null;
        let activitySub: RealtimeChannel | null = null;

        // Subscribe to Market Data (Price/Volume)
        marketSub = supabaseDb.subscribeToMarketData(slug, (payload) => {
            console.log("⚡ Realtime Market Data:", payload);
            if (payload.new) {
                // Optimistically update SWR cache
                mutateMarketData(payload.new, false);
            }
        });

        // Subscribe to Activity
        activitySub = supabaseDb.subscribeToActivity(slug, (payload) => {
            console.log("⚡ Realtime Activity:", payload);
            if (payload.new) {
                // Add new item to start of list
                mutateActivity((currentList) => {
                    return [payload.new, ...(currentList || [])].slice(0, 50);
                }, false);

                // Also refresh holders when new activity occurs
                mutateHolders();

                // And refresh market data (volume might have changed)
                mutateMarketData();
            }
        });

        return () => {
            if (marketSub) marketSub.unsubscribe();
            if (activitySub) activitySub.unsubscribe();
        };
    }, [slug, mutateMarketData, mutateActivity, mutateHolders]);

    // Cleanup helper to fully reload everything
    const refreshAll = () => {
        mutateMarketData();
        mutateMarketInfo();
        mutateActivity();
        mutateHolders();
    };

    return {
        marketData,
        marketInfo,
        activityList: activityList || [],
        holders: holders || {}, // ✅ Empty object for multi-outcome support (Record<string, Holder[]>)
        isLoading: !marketData && !marketInfo, // Basic loading state
        isError: marketDataError || marketInfoError,
        refreshAll,
        mutateActivity,
        mutateHolders,
        mutateMarketData
    };
}
