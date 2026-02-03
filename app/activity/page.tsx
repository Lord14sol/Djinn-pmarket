'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ExternalLink, Activity, Clock, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { getGlobalActivities, getProfile } from '@/lib/supabase-db';

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
        const fetchActivities = async () => {
            const data = await getGlobalActivities(500); // Fetch more for filtering
            setActivities(data);
            setLoading(false);

            // Fetch profiles for unique users
            const uniqueUsers = [...new Set(data.map((a: any) => a.user).filter(Boolean))];
            const profileMap: Record<string, any> = {};

            await Promise.all(
                uniqueUsers.slice(0, 50).map(async (wallet: string) => {
                    try {
                        const profile = await getProfile(wallet);
                        if (profile) profileMap[wallet] = profile;
                    } catch (e) { /* ignore */ }
                })
            );
            setProfiles(profileMap);
        };

        fetchActivities();
        const interval = setInterval(fetchActivities, 8000);
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
        <div className="min-h-screen bg-transparent text-white font-sans selection:bg-[#F492B7] selection:text-black pt-28 pb-12 px-4 md:px-8 relative overflow-hidden">

            {/* HEADER */}
            <div className="relative z-10 max-w-6xl mx-auto mb-6">
                <Link href="/markets" className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Markets
                </Link>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-3">
                    <Activity className="w-8 h-8 md:w-10 md:h-10 text-[#F492B7]" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        Global Activity
                    </span>
                </h1>
                <p className="text-gray-400 mt-2 text-lg">
                    Real-time stream of all trades across Djinn.
                </p>
            </div>

            {/* FILTER BAR */}
            <div className="relative z-10 max-w-6xl mx-auto mb-4">
                <div className="flex flex-wrap gap-3 items-center p-4 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">

                    {/* TYPE FILTERS */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 uppercase font-bold mr-2">Type:</span>
                        {TYPE_FILTERS.map(type => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${typeFilter === type
                                    ? type === 'Buys'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : type === 'Sells'
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            : 'bg-[#F492B7]/20 text-[#F492B7] border border-[#F492B7]/30'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {type === 'Buys' && <TrendingUp className="w-3 h-3 inline mr-1" />}
                                {type === 'Sells' && <TrendingDown className="w-3 h-3 inline mr-1" />}
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />

                    {/* SIZE FILTERS */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 uppercase font-bold mr-2">
                            <Filter className="w-3 h-3 inline mr-1" />
                            Size:
                        </span>
                        {SIZE_FILTERS.map(filter => (
                            <button
                                key={filter.label}
                                onClick={() => setSizeFilter(filter)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sizeFilter.label === filter.label
                                    ? 'bg-[#F492B7] text-black shadow-lg'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* GLASS TABLE */}
            <div className="relative z-10 max-w-6xl mx-auto">
                <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">

                    {/* TABLE HEADER */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 bg-black/20 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-3 md:col-span-2">Trader</div>
                        <div className="col-span-2 md:col-span-1 text-center">Side</div>
                        <div className="col-span-3 md:col-span-2 text-right">Amount</div>
                        <div className="hidden md:block md:col-span-4 pl-4">Market</div>
                        <div className="col-span-4 md:col-span-3 text-right">Time</div>
                    </div>

                    {/* ROWS */}
                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                        <AnimatePresence mode="popLayout">
                            {loading ? (
                                [...Array(8)].map((_, i) => (
                                    <div key={`skel-${i}`} className="h-16 animate-pulse bg-white/5" />
                                ))
                            ) : filteredActivities.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    No trades match your filters. Try adjusting the criteria.
                                </div>
                            ) : (
                                filteredActivities.slice(0, 100).map((activity, idx) => {
                                    const market = activity.markets || {};
                                    const isBuy = activity.type === 'buy';
                                    const isYes = activity.outcome_index === 0;
                                    const actionColor = isBuy
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                        : 'bg-red-500/10 border-red-500/20 text-red-400';
                                    const amountSol = activity.amount || 0;
                                    const amountUsd = amountSol * SOL_PRICE;

                                    // Get profile
                                    const userProfile = profiles[activity.user];
                                    const avatarUrl = userProfile?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${activity.user}`;
                                    const username = userProfile?.username || (activity.user ? `${activity.user.slice(0, 4)}...${activity.user.slice(-4)}` : 'Anon');

                                    return (
                                        <motion.div
                                            key={activity.id || idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors"
                                        >
                                            {/* TRADER */}
                                            <div className="col-span-3 md:col-span-2 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-800 border border-white/10 overflow-hidden flex-shrink-0">
                                                    <img
                                                        src={avatarUrl}
                                                        alt="User"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <Link href={`/profile/${username}`} className="flex flex-col hover:text-[#F492B7] transition-colors">
                                                    <span className="text-sm font-bold text-gray-200 truncate max-w-[80px]">
                                                        {username}
                                                    </span>
                                                </Link>
                                            </div>

                                            {/* SIDE */}
                                            <div className="col-span-2 md:col-span-1 flex justify-center">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${actionColor}`}>
                                                    {isBuy ? 'BUY' : 'SELL'} {isYes ? 'YES' : 'NO'}
                                                </span>
                                            </div>

                                            {/* AMOUNT */}
                                            <div className="col-span-3 md:col-span-2 text-right">
                                                <div className="text-sm font-bold text-white font-mono">
                                                    {amountSol.toFixed(2)} SOL
                                                </div>
                                                <div className="text-[10px] text-gray-500">
                                                    ≈ ${amountUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                </div>
                                            </div>

                                            {/* MARKET */}
                                            <div className="hidden md:flex col-span-4 pl-4 items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-gray-800 flex-shrink-0 flex items-center justify-center text-lg overflow-hidden">
                                                    {market.banner_url && market.banner_url.startsWith('http') ? (
                                                        <img src={market.banner_url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        market.banner_url || '🔮'
                                                    )}
                                                </div>
                                                <Link href={`/market/${market.slug || '#'}`} className="truncate hover:text-[#F492B7] transition-colors">
                                                    <span className="text-sm font-medium text-gray-300 truncate block max-w-[250px]">
                                                        {market.title || 'Unknown Market'}
                                                    </span>
                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                        Pool: {((market.total_yes_pool || 0) + (market.total_no_pool || 0)).toFixed(1)} SOL
                                                    </div>
                                                </Link>
                                            </div>

                                            {/* TIME */}
                                            <div className="col-span-4 md:col-span-3 text-right flex flex-col items-end">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                                    <Clock className="w-3 h-3" />
                                                    {activity.created_at ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }) : 'Just now'}
                                                </div>
                                                <a
                                                    href={`https://solscan.io/tx/${activity.tx_signature || ''}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] text-[#F492B7]/60 hover:text-[#F492B7] flex items-center mt-1 gap-1"
                                                >
                                                    Verify <ExternalLink className="w-2 h-2" />
                                                </a>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>

                    {/* FOOTER */}
                    <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-between items-center text-xs text-gray-400">
                        <span>Showing {Math.min(filteredActivities.length, 100)} of {filteredActivities.length} trades</span>
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Live Feed Active
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
