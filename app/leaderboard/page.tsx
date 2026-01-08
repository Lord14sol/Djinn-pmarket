'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

// DATOS DE ÉLITE: REYES DEL BAZAR
const topDjinns = [
    { rank: 1, user: 'Kch123', profit: '+$2,055,127', lastPool: 'BTC HIT $150K', avatar: '🦁', slug: 'btc-hit-150k' },
    { rank: 2, user: 'SeriouslySirius', profit: '+$1,242,655', lastPool: 'GTA 6 DELAY', avatar: '🦅', slug: 'gta-6-delay' },
    { rank: 3, user: 'OnchainScammer', profit: '+$871,423', lastPool: 'SOLANA MOBILE 3', avatar: ' foxes', slug: 'solana-mobile-3' },
    { rank: 4, user: 'Lord_Prophet', profit: '+$750,200', lastPool: 'SOLANA TO $500', avatar: '👑', slug: 'sol-500' },
    { rank: 5, user: 'AlphaOracle', profit: '+$620,110', lastPool: 'ETH MERGE 2', avatar: '🔮', slug: 'eth-merge' },
];

const biggestWins = [
    { rank: 1, user: 'Bossoskil', market: 'Miami vs. Ohio State', bet: '$385,511', profit: '+$1,446,914', avatar: '🐳', slug: 'miami-ohio' },
    { rank: 2, user: 'Beachboy4', market: 'Elche CF vs. Villarreal', bet: '$729,038', profit: '+$1,664,838', avatar: '🌊', slug: 'elche-villarreal' },
    { rank: 3, user: 'DegenKing', market: 'Solana to $500', bet: '$120,000', profit: '+$980,200', avatar: '🔱', slug: 'sol-500' },
];

export default function LeaderboardPage() {
    const [timeframe, setTimeframe] = useState('All');
    const [viewLimit, setViewLimit] = useState(10);

    return (
        <main className="min-h-screen bg-black text-white selection:bg-[#F492B7] selection:text-black font-sans pb-32">
            <Navbar />

            <div className="max-w-[1450px] mx-auto grid grid-cols-12 gap-16 pt-44 px-10">

                {/* --- RANKING PRINCIPAL (IZQUIERDA) --- */}
                <div className="col-span-12 lg:col-span-8 animate-in fade-in slide-in-from-left-4 duration-700">
                    <h1 className="text-8xl font-black mb-16 tracking-tighter uppercase leading-none drop-shadow-[0_0_35px_rgba(244,146,183,0.2)]">
                        Leaderboard
                    </h1>

                    {/* SELECTORES DE TIEMPO PREMIUM */}
                    <div className="flex gap-5 mb-16">
                        {['Today', 'All'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t)}
                                className={`px-12 py-5 rounded-full text-[12px] tracking-[0.3em] transition-all border-2 font-black uppercase ${timeframe === t
                                    ? 'bg-[#F492B7] text-black border-[#F492B7] shadow-[0_0_40px_rgba(244,146,183,0.4)] scale-105'
                                    : 'text-white border-white/10 hover:border-white/30 hover:bg-white/5'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* LISTA DE DJINNS */}
                    <div className="space-y-5">
                        {topDjinns.map((djinn) => (
                            <div
                                key={djinn.rank}
                                className="flex items-center justify-between py-8 px-12 rounded-[40px] bg-[#0D0D0D] border border-white/5 hover:border-[#F492B7]/40 hover:-translate-y-2 transition-all duration-500 group shadow-2xl"
                            >
                                <div className="flex items-center gap-10">
                                    <span className="text-5xl font-black italic tracking-tighter text-[#F492B7]/30 group-hover:text-[#F492B7] transition-colors duration-500">
                                        #{djinn.rank}
                                    </span>
                                    <div className="flex items-center gap-8">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center text-4xl shrink-0 border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                                            {djinn.avatar}
                                        </div>
                                        <div className="flex flex-col">
                                            <Link href={`/profile/${djinn.user.toLowerCase()}`} className="text-2xl font-black text-white hover:text-[#F492B7] transition-colors tracking-tight uppercase">
                                                {djinn.user}
                                            </Link>
                                            <Link href={`/market/${djinn.slug}`} className="text-[10px] text-gray-600 font-bold mt-2 uppercase tracking-[0.2em] hover:text-white transition-colors flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#F492B7]/50" />
                                                Last: {djinn.lastPool}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black text-[#10B981] italic tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                        {djinn.profit}
                                    </div>
                                    <div className="text-[9px] font-black text-gray-700 uppercase tracking-widest mt-1">Total Profit</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- BIGGEST WINS (DERECHA) --- */}
                <div className="col-span-12 lg:col-span-4 lg:pt-40 animate-in fade-in slide-in-from-right-4 duration-700">
                    <div className="bg-[#0D0D0D] border border-white/5 rounded-[50px] p-12 sticky top-40 shadow-2xl border-t border-t-white/10">
                        <h2 className="text-3xl font-black text-white mb-10 tracking-tighter uppercase flex items-center gap-3">
                            <span className="text-[#F492B7]">⚡</span> Biggest wins
                        </h2>

                        {/* SELECTOR TOP - ESTILO DJINN */}
                        <div className="flex gap-2 bg-black/50 p-1.5 rounded-2xl border border-white/5 mb-14 w-full">
                            {[3, 5, 10].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => setViewLimit(num)}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${viewLimit === num
                                        ? 'bg-[#F492B7] text-black shadow-lg shadow-[#F492B7]/20'
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    TOP {num}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-16">
                            {biggestWins.map((win) => (
                                <div key={win.rank} className="flex gap-8 group relative">
                                    <div className="text-5xl font-black italic text-[#F492B7]/20 absolute -left-4 -top-2 group-hover:text-[#F492B7]/40 transition-colors">
                                        #{win.rank}
                                    </div>

                                    <div className="flex-1 relative z-10 pl-6">
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0 group-hover:rotate-12 transition-transform">
                                                {win.avatar}
                                            </div>
                                            <Link href={`/profile/${win.user.toLowerCase()}`} className="text-lg font-black text-white hover:text-[#F492B7] transition-colors uppercase tracking-tight">
                                                {win.user}
                                            </Link>
                                        </div>

                                        <Link href={`/market/${win.slug}`} className="block text-sm text-gray-400 font-medium mb-6 leading-snug hover:text-white transition-all uppercase tracking-tight italic">
                                            "{win.market}"
                                        </Link>

                                        <div className="flex justify-between items-end border-t border-white/5 pt-5">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-gray-600 font-black tracking-widest uppercase">Position</span>
                                                <span className="text-lg font-bold text-white tracking-tighter">{win.bet}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[9px] text-gray-600 font-black tracking-widest uppercase">Bounty</span>
                                                <span className="block text-3xl font-black text-[#10B981] tracking-tighter italic">
                                                    {win.profit}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-12 py-5 rounded-2xl border-2 border-dashed border-white/10 text-gray-500 font-black uppercase text-[10px] tracking-[0.3em] hover:border-[#F492B7]/40 hover:text-[#F492B7] transition-all">
                            View All Conquers
                        </button>
                    </div>
                </div>

            </div>
        </main>
    );
}

function MiniCard({ label, value, color = "text-white" }: any) {
    return (
        <div className="bg-[#0D0D0D] border border-white/5 p-8 rounded-[2.5rem] shadow-xl border-t border-t-white/10">
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-3 font-bold">{label}</p>
            <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
        </div>
    );
}