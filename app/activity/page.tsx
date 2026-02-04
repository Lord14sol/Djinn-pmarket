'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ExternalLink, Activity, Clock, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { getGlobalActivities, getProfile } from '@/lib/supabase-db';
import StarBackground from '@/components/ui/StarBackground';

// Mock SOL Price (or fetch real)
const SOL_PRICE = 185;

// Size filter options
const SIZE_FILTERS = [
    { label: 'All', min: 0, max: Infinity },
    { label: '$100+', min: 100, max: Infinity },
    { label: '$1K+', min: 1000, max: Infinity },
    { label: '$10K+', min: 10000, max: Infinity },
    { label: '$100K+', min: 100000, max: Infinity },
];

// Type filter options
const TYPE_FILTERS = ['All', 'Buys', 'Sells'];

export default function ActivityPage() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<Record<string, any>>({});

    // Filters
    const [sizeFilter, setSizeFilter] = useState(SIZE_FILTERS[0]);
    const [typeFilter, setTypeFilter] = useState('All');

    useEffect(() => {
        let profilesFetched = false; // Only fetch profiles once

        const fetchActivities = async () => {
            try {
                const data = await getGlobalActivities(100); // Reduced from 500
                setActivities(data);
                setLoading(false);

                // Fetch profiles ONLY ONCE (not on every poll)
                if (!profilesFetched && data.length > 0) {
                    profilesFetched = true;
                    const uniqueUsers = [...new Set(data.map((a: any) => a.user).filter(Boolean))];
                    const profileMap: Record<string, any> = {};

                    // Limit to 20 profiles max to reduce API calls
                    await Promise.all(
                        uniqueUsers.slice(0, 20).map(async (wallet: string) => {
                            try {
                                const profile = await getProfile(wallet);
                                if (profile) profileMap[wallet] = profile;
                            } catch (e) { /* ignore */ }
                        })
                    );
                    setProfiles(profileMap);
                }
            } catch (e) {
                console.warn('Activity fetch failed:', e);
                setLoading(false);
            }
        };

        fetchActivities();
        const interval = setInterval(fetchActivities, 60000); // Changed from 8s to 60s
        return () => clearInterval(interval);
    }, []);

    // Filtered activities
    const filteredActivities = useMemo(() => {
        return activities.filter(a => {
            const amountUsd = (a.amount || 0) * SOL_PRICE;

            // Size filter (USD)
            if (amountUsd < sizeFilter.min || amountUsd > sizeFilter.max) return false;

            // Type filter
            if (typeFilter === 'Buys' && a.type !== 'buy') return false;
            if (typeFilter === 'Sells' && a.type !== 'sell') return false;

            return true;
        });
    }, [activities, sizeFilter, typeFilter]);

    return (
        <div className="min-h-screen bg-[#050505] text-black font-sans selection:bg-[#F492B7] selection:text-black pt-28 pb-12 px-4 md:px-8 relative overflow-hidden">

            {/* Animated Stars Background */}
            <div className="absolute inset-0 z-0 opacity-60 pointer-events-none text-white">
                <StarBackground />
            </div>

            {/* HEADER */}
            <div className="relative z-10 max-w-6xl mx-auto mb-6 text-center md:text-left">
                <Link href="/markets" className="inline-flex items-center text-gray-500 hover:text-white mb-4 transition-colors font-black uppercase tracking-widest text-[10px]">
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Back to Markets
                </Link>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                    {/* RESTORED MATCHING TITLE STYLE */}
                    <div className="bg-[#F492B7] border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_#FFF] flex items-center gap-3">
                        <Activity className="w-8 h-8 text-black" />
                        <h1 className="text-4xl font-black text-black lowercase tracking-tight">global activity</h1>
                    </div>

                    {/* FILTER BAR - MOVED UP FOR COMPACTNESS */}
                    <div className="flex flex-wrap gap-3 items-center p-2 rounded-full bg-[#121212] border-2 border-white/20 backdrop-blur-md shadow-lg">

                        {/* TYPE FILTERS */}
                        <div className="flex items-center gap-1">
                            {TYPE_FILTERS.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border-2 relative overflow-hidden ${typeFilter === type
                                        ? type === 'Buys'
                                            ? 'bg-[#10B981] border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                            : type === 'Sells'
                                                ? 'bg-[#EF4444] border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                                : 'bg-white border-white text-black shadow-[2px_2px_0px_0px_#F492B7]'
                                        : 'bg-transparent border-gray-700 text-gray-500 hover:text-white hover:border-gray-500'
                                        }`}
                                >
                                    <span className="relative z-10 flex items-center">
                                        {type === 'Buys' && <TrendingUp className="w-3 h-3 inline mr-1" />}
                                        {type === 'Sells' && <TrendingDown className="w-3 h-3 inline mr-1" />}
                                        {type}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="w-0.5 h-6 bg-white/10 mx-1 hidden md:block" />

                        {/* SIZE FILTERS */}
                        <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-gray-500 uppercase font-black mr-1">
                                <Filter className="w-3 h-3 inline mr-1" />
                                Size:
                            </span>
                            {SIZE_FILTERS.map(filter => (
                                <button
                                    key={filter.label}
                                    onClick={() => setSizeFilter(filter)}
                                    className={`px-2 py-1 rounded-full text-[10px] font-black transition-all border-2 ${sizeFilter.label === filter.label
                                        ? 'bg-[#F492B7] border-black text-black shadow-[2px_2px_0px_0px_#FFF]'
                                        : 'bg-transparent border-gray-700 text-gray-500 hover:text-white hover:border-gray-500'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* TABLE CONTAINER */}
                <div className="relative z-10 max-w-6xl mx-auto">
                    <div className="bg-white border-4 border-black rounded-[3rem] overflow-hidden">

                        {/* TABLE HEADER */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-black border-b-4 border-black text-[10px] font-black text-white uppercase tracking-widest">
                            <div className="col-span-3 md:col-span-2 text-[#F492B7]">Trader</div>
                            <div className="col-span-2 md:col-span-1 text-center">Side</div>
                            <div className="col-span-3 md:col-span-2 text-right">Amount</div>
                            <div className="hidden md:block md:col-span-4 pl-2">Market</div>
                            <div className="col-span-4 md:col-span-3 text-right">Time</div>
                        </div>

                        {/* ROWS */}
                        <div className="max-h-[70vh] overflow-y-auto bg-white custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    [...Array(12)].map((_, i) => (
                                        <div key={`skel-${i}`} className="h-10 animate-pulse bg-gray-50 flex items-center px-4 border-b border-gray-100">
                                            <div className="w-full h-3 bg-gray-200 rounded-full"></div>
                                        </div>
                                    ))
                                ) : filteredActivities.length === 0 ? (
                                    <div className="p-12 text-center text-black font-bold text-sm">
                                        No trades match your filters. Try adjusting the criteria.
                                    </div>
                                ) : (
                                    filteredActivities.slice(0, 100).map((activity, idx) => {
                                        const market = activity.markets || {};
                                        const isBuy = activity.type === 'buy';
                                        const isYes = activity.outcome_index === 0;
                                        const actionColor = isBuy
                                            ? 'bg-[#10B981] border-black text-black'
                                            : 'bg-[#EF4444] border-black text-white';
                                        const amountSol = activity.amount || 0;
                                        const amountUsd = amountSol * SOL_PRICE;

                                        // Get profile
                                        const userProfile = profiles[activity.user];
                                        const avatarUrl = userProfile?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${activity.user}`;
                                        const username = userProfile?.username || (activity.user ? `${activity.user.slice(0, 4)}...${activity.user.slice(-4)}` : 'Anon');

                                        return (
                                            <motion.div
                                                key={activity.id || idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ delay: idx * 0.01 }}
                                                className={`grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-[#FFF5F7] transition-colors group border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                            >
                                                {/* TRADER */}
                                                <div className="col-span-3 md:col-span-2 flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-black overflow-hidden flex-shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                                        <img
                                                            src={avatarUrl}
                                                            alt="User"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <Link href={`/profile/${username}`} className="flex flex-col group/link min-w-0">
                                                        <span className="text-xs font-black text-black truncate group-hover:text-[#F492B7] transition-colors">
                                                            {username}
                                                        </span>
                                                    </Link>
                                                </div>

                                                {/* SIDE */}
                                                <div className="col-span-2 md:col-span-1 flex justify-center">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${actionColor}`}>
                                                        {isBuy ? 'BUY' : 'SELL'} {isYes ? 'YES' : 'NO'}
                                                    </span>
                                                </div>

                                                {/* AMOUNT */}
                                                <div className="col-span-3 md:col-span-2 text-right">
                                                    <div className="text-xs font-black text-black font-mono tracking-tight">
                                                        {amountSol.toFixed(2)} SOL
                                                    </div>
                                                    <div className="text-[9px] font-bold text-gray-400 font-mono">
                                                        ${amountUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                    </div>
                                                </div>

                                                {/* MARKET */}
                                                <div className="hidden md:flex col-span-4 pl-2 items-center gap-2 overflow-hidden">
                                                    <div className="w-6 h-6 rounded bg-gray-100 border border-black flex-shrink-0 flex items-center justify-center text-xs overflow-hidden">
                                                        {market.banner_url && market.banner_url.startsWith('http') ? (
                                                            <img src={market.banner_url} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            market.banner_url || '🔮'
                                                        )}
                                                    </div>
                                                    <Link href={`/market/${market.slug || '#'}`} className="truncate group/market">
                                                        <span className="text-xs font-bold text-black group-hover:text-[#F492B7] transition-colors truncate block">
                                                            {market.title || 'Unknown Market'}
                                                        </span>
                                                    </Link>
                                                </div>

                                                {/* TIME */}
                                                <div className="col-span-4 md:col-span-3 text-right flex flex-col items-end justify-center">
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold font-mono">
                                                        {activity.created_at ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }) : 'Just now'}
                                                    </div>
                                                    <a
                                                        href={`https://solscan.io/tx/${activity.tx_signature || ''}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[9px] font-bold text-black/50 hover:text-[#F492B7] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        View <ExternalLink className="w-2 h-2" />
                                                    </a>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>

                        {/* FOOTER */}
                        <div className="px-4 py-2 bg-gray-50 border-t-2 border-black flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <span>Showing {Math.min(filteredActivities.length, 100)} recent trades</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
// End of file

