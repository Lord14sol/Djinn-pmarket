'use client';

import React, { useEffect, useState } from 'react';
import { useModal } from '@/lib/ModalContext';
import { X, ArrowRight, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { formatCompact } from '@/lib/utils';
import Image from 'next/image';


// Helper: Simple Time Ago (No date-fns dependency)
function timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Types
interface ActivityItem {
    id: string;
    username: string;
    avatarUrl: string | null;
    type: 'BUY' | 'SELL';
    side: 'YES' | 'NO';
    amountShares: number;
    amountUsd: number;
    marketTitle: string;
    marketImage: string | null;
    timestamp: number;
    txSignature: string;
    profit?: number; // Only for SELL
}

// Mock Data Generator
const generateMockActivity = (): ActivityItem[] => {
    return Array.from({ length: 15 }).map((_, i) => ({
        id: `mock-${i}`,
        username: i % 3 === 0 ? 'CryptoKing' : i % 2 === 0 ? 'SolanaWhale' : `User${Math.floor(Math.random() * 9999)}`,
        avatarUrl: null,
        type: Math.random() > 0.3 ? 'BUY' : 'SELL',
        side: Math.random() > 0.5 ? 'YES' : 'NO',
        amountShares: Math.random() * 1000 + 50,
        amountUsd: Math.random() * 500 + 10,
        marketTitle: i % 2 === 0 ? 'Will BTC hit $100k by Q4?' : 'Will Solana flip Ethereum in 2025?',
        marketImage: null,
        timestamp: Date.now() - Math.floor(Math.random() * 10000000),
        txSignature: 'Sig...',
        profit: Math.random() > 0.5 ? Math.random() * 50 : undefined
    }));
};

export default function ActivityFeedModal() {
    const { isActivityFeedOpen, closeActivityFeed } = useModal();
    const [activity, setActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        if (isActivityFeedOpen) {
            // Load activity (Mock for now, will connect to Supabase later)
            setActivity(generateMockActivity());
        }
    }, [isActivityFeedOpen]);

    if (!isActivityFeedOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={closeActivityFeed}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-[#0E0E0E] rounded-[2rem] border border-white/10 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden">


                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F492B7]/10 flex items-center justify-center border border-[#F492B7]/20">
                            <TrendingUp className="text-[#F492B7]" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Global Activity</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Live Trades</p>
                        </div>
                    </div>
                    <button
                        onClick={closeActivityFeed}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>

                {/* Feed List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {activity.map((item) => (
                        <div key={item.id} className="p-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                            {/* User & Time */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 overflow-hidden">
                                        {/* Avatar placeholder */}
                                        <div className="w-full h-full flex items-center justify-center text-[10px]">🧞</div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-300 font-mono">
                                        {item.username}
                                    </span>
                                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">• {timeAgo(item.timestamp)}</span>
                                </div>
                                <a
                                    href={`https://solscan.io/tx/${item.txSignature}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-gray-600 hover:text-white transition-colors flex items-center gap-1"
                                >
                                    <span>Verify</span> <ArrowRight size={8} />
                                </a>
                            </div>

                            {/* Action Card */}
                            <div className="flex items-start gap-4">
                                {/* Direction Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'BUY'
                                    ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                                    : 'bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20'
                                    }`}>
                                    {item.type === 'BUY' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Action Title */}
                                    <div className="flex flex-wrap items-baseline gap-2 mb-1">
                                        <span className={`text-base font-black uppercase tracking-wide ${item.type === 'BUY' ? 'text-[#10B981]' : 'text-[#F97316]'
                                            }`}>
                                            {item.type === 'BUY' ? 'Bought' : 'Sold'} {item.side}
                                        </span>
                                        <span className="text-sm font-bold text-gray-400">Position</span>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-3 gap-2 mt-2 mb-3">
                                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">Outcome</span>
                                            <span className={`text-sm font-black ${item.side === 'YES' ? 'text-[#10B981]' : 'text-[#F97316]'}`}>
                                                {item.side}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">Shares</span>
                                            <span className="text-sm font-mono font-bold text-white">
                                                {formatCompact(item.amountShares)}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">Value</span>
                                            <span className="text-sm font-mono font-bold text-[#10B981]">
                                                ${item.amountUsd.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Profit Pill (If SELL) */}
                                    {item.type === 'SELL' && item.profit !== undefined && (
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-2 border ${item.profit > 0
                                            ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
                                            : 'bg-gray-700/20 text-gray-400 border-gray-700/30'
                                            }`}>
                                            {item.profit > 0 ? 'Profit: ' : 'Net: '} ${Math.abs(item.profit).toFixed(2)}
                                        </div>
                                    )}

                                    {/* Market Link */}
                                    <div className="flex items-center gap-2 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] text-[#F492B7] font-bold">MARKET:</span>
                                        <span className="text-xs text-gray-300 truncate font-medium">{item.marketTitle}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Gradient */}
                <div className="h-6 bg-gradient-to-t from-[#0E0E0E] to-transparent pointer-events-none absolute bottom-0 left-0 right-0 rounded-b-[2rem]" />
            </div>
        </div>
    );
}
