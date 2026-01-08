'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Mock data - replace with real data later
const mockBets = [
    { id: '1', market: 'Will BTC hit $150k?', position: 'YES', amount: 4500.50, status: 'active', outcome: null },
    { id: '2', market: 'Argentina GDP > 3%', position: 'NO', amount: 120.00, status: 'won', outcome: '+$240' },
    { id: '3', market: 'Solana Mobile 3 Launch', position: 'YES', amount: 105000.00, status: 'active', outcome: null },
];

const mockStats = {
    totalProfit: '+$127,450',
    winRate: '68%',
    totalBets: 247,
    activeBets: 12,
};

export default function ProfilePage() {
    const params = useParams();
    const username = params.username as string;
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

    const filteredBets = activeTab === 'active'
        ? mockBets.filter(b => b.status === 'active')
        : mockBets.filter(b => b.status !== 'active');

    return (
        <div className="min-h-screen bg-black pt-40 px-6 pb-20 selection:bg-[#F492B7] selection:text-black">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-6 mb-16">
                    <div className="w-24 h-24 rounded-full bg-[#F492B7]/10 border-2 border-[#F492B7]/30 flex items-center justify-center text-5xl">
                        🦁
                    </div>
                    <div>
                        <h1 className="text-5xl text-white mb-2 tracking-tight"
                            style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                            @{username}
                        </h1>
                        <p className="text-gray-500 text-sm">Member since Dec 2024</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Total Profit</p>
                        <p className="text-3xl font-black text-green-400">{mockStats.totalProfit}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Win Rate</p>
                        <p className="text-3xl font-black text-[#F492B7]">{mockStats.winRate}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Total Bets</p>
                        <p className="text-3xl font-black text-white">{mockStats.totalBets}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Active</p>
                        <p className="text-3xl font-black text-blue-400">{mockStats.activeBets}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-8 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'active'
                                ? 'bg-[#F492B7] text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Active Bets
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-8 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'history'
                                ? 'bg-[#F492B7] text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        History
                    </button>
                </div>

                {/* Bets List */}
                <div className="space-y-4">
                    {filteredBets.map((bet) => (
                        <div
                            key={bet.id}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#F492B7]/30 transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-white text-lg font-bold mb-2">{bet.market}</h3>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${bet.position === 'YES'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {bet.position}
                                        </span>
                                        <span className="text-gray-400 text-sm">
                                            ${bet.amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {bet.status === 'won' && bet.outcome && (
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-green-400">{bet.outcome}</p>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Won</p>
                                    </div>
                                )}

                                {bet.status === 'active' && (
                                    <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                                        <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">Active</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredBets.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">No {activeTab} bets found</p>
                    </div>
                )}
            </div>
        </div>
    );
}