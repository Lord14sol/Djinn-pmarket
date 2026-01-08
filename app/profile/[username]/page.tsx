'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Mock data actualizado para incluir tipos de mercado
const mockBets = [
    {
        id: '1',
        market: 'Will BTC hit $150k?',
        type: 'binary', // Binario estándar
        position: 'YES',
        amount: 4500.50,
        status: 'active',
        outcome: null
    },
    {
        id: '2',
        market: 'Argentina GDP > 3%',
        type: 'binary',
        position: 'NO',
        amount: 120.00,
        status: 'won',
        outcome: '+$240'
    },
    {
        id: '3',
        market: 'WHO WILL WIN THE 2026 WORLD CUP?',
        type: 'multiple', // Estilo PolyMarket
        position: 'Argentina', // Aquí mostramos el candidato, no solo YES/NO
        amount: 105000.00,
        status: 'active',
        outcome: null
    },
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
                            style={{ fontWeight: 700 }}>
                            @{username}
                        </h1>
                        <p className="text-gray-500 text-sm italic">Member since Dec 2024</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Profit</p>
                        <p className="text-3xl font-black text-green-400">{mockStats.totalProfit}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Win Rate</p>
                        <p className="text-3xl font-black text-[#F492B7]">{mockStats.winRate}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Bets</p>
                        <p className="text-3xl font-black text-white">{mockStats.totalBets}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Active</p>
                        <p className="text-3xl font-black text-blue-400">{mockStats.activeBets}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'active'
                            ? 'bg-[#F492B7] text-black shadow-[0_0_20px_rgba(244,146,183,0.3)]'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Active Bets
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history'
                            ? 'bg-[#F492B7] text-black shadow-[0_0_20px_rgba(244,146,183,0.3)]'
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
                            className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-[#F492B7]/30 transition-all group"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex-1">
                                    <h3 className="text-white text-xl font-black mb-3 group-hover:text-[#F492B7] transition-colors uppercase italic">
                                        {bet.market}
                                    </h3>
                                    <div className="flex items-center gap-4">
                                        {/* Badge dinámico: Si es binario usa colores, si es múltiple usa estilo neutral/elegante */}
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${bet.type === 'multiple'
                                                ? 'bg-white/10 text-white'
                                                : bet.position === 'YES'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-red-500/20 text-red-400 border border-red-500/20'
                                            }`}>
                                            {bet.position}
                                        </span>
                                        <span className="text-gray-500 text-sm font-bold tracking-tight">
                                            Investment: ${bet.amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    {bet.status === 'won' ? (
                                        <>
                                            <p className="text-3xl font-black text-emerald-400">{bet.outcome}</p>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Profit</p>
                                        </>
                                    ) : (
                                        <div className="px-5 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">In Progress</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredBets.length === 0 && (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <p className="text-gray-500 text-lg italic">Sir, no {activeTab} bets were found in the terminal.</p>
                    </div>
                )}
            </div>
        </div>
    );
}