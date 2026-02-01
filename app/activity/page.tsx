'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import * as supabaseDb from '@/lib/supabase-db';
import Link from 'next/link';

export default function ActivityPage() {
    const [activity, setActivity] = useState<any[]>([]);

    useEffect(() => {
        // Load initial
        supabaseDb.getActivity(0, 50).then(setActivity);

        // Subscribe to real-time updates
        const sub = supabaseDb.subscribeToGlobalActivity((payload: any) => {
            if (payload.new) {
                setActivity(prev => [payload.new, ...prev].slice(0, 50));
            }
        });

        return () => { sub.unsubscribe(); };
    }, []);

    const timeAgo = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / 1000;
        if (diff < 60) return `${Math.floor(diff)}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32">
            <Navbar />
            <div className="max-w-4xl mx-auto pt-32 px-4">

                <h1 className="text-4xl font-black tracking-tighter mb-8 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                    Global Activity
                </h1>

                <div className="bg-[#0E0E0E] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Feed</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-green-500 uppercase">Real-time</span>
                        </div>
                    </div>

                    <div className="divide-y divide-white/5">
                        {activity.map((act, i) => {
                            const isWhale = act.sol_amount >= 10;
                            const isSuperWhale = act.sol_amount >= 100;

                            return (
                                <Link
                                    href={`/market/${act.market_slug}`}
                                    key={i}
                                    className={`block p-6 hover:bg-white/5 transition-colors ${isSuperWhale ? 'bg-gradient-to-r from-[#F492B7]/10 to-transparent' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="relative">
                                            <img
                                                src={act.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${act.wallet_address}`}
                                                className={`w-12 h-12 rounded-full border-2 ${isSuperWhale ? 'border-[#F492B7]' : 'border-white/10'}`}
                                            />
                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0E0E0E] flex items-center justify-center text-[10px] font-black ${act.action === 'YES' ? 'bg-[#10B981] text-black' : 'bg-red-500 text-white'}`}>
                                                {act.action.charAt(0)}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-white font-bold truncate">{act.username}</span>
                                                <span className="text-gray-500 text-xs">bought</span>
                                                <span className={`font-black ${act.action === 'YES' ? 'text-[#10B981]' : 'text-red-500'}`}>{act.action}</span>
                                            </div>
                                            <p className="text-gray-400 text-sm truncate hover:text-[#F492B7] transition-colors">{act.market_title}</p>
                                        </div>

                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-2 mb-1">
                                                <span className="text-xl font-black text-white">{act.amount.toFixed(2)} USD</span>
                                                {isWhale && <span className="text-xl">🐳</span>}
                                            </div>
                                            <div className="flex items-center justify-end gap-2 text-xs text-gray-500 font-mono">
                                                <span>{act.sol_amount.toFixed(2)} SOL</span>
                                                <span>•</span>
                                                <span>{act.shares.toFixed(1)} Shares</span>
                                                <span>•</span>
                                                <span>{timeAgo(act.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
