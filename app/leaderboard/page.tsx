'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const topDjinns = [
    { rank: 1, user: 'Kch123', profit: '+$2,055,127', lastPool: 'BTC HIT $150K', avatar: '🦁', slug: 'btc-hit-150k' },
    { rank: 2, user: 'SeriouslySirius', profit: '+$1,242,655', lastPool: 'GTA 6 DELAY', avatar: '🦅', slug: 'gta-6-delay' },
    { rank: 3, user: 'OnchainScammer', profit: '+$871,423', lastPool: 'SOLANA MOBILE 3', avatar: '🦊', slug: 'solana-mobile-3' },
];

const biggestWins = [
    { rank: 1, user: 'Bossoskil', market: 'Miami vs. Ohio State', bet: '$385,511', profit: '+$1,446,914', avatar: '🐳', slug: 'miami-ohio' },
    { rank: 2, user: 'Beachboy4', market: 'Elche CF vs. Villarreal', bet: '$729,038', profit: '+$1,664,838', avatar: '🌊', slug: 'elche-villarreal' },
    { rank: 3, user: 'DegenKing', market: 'Solana to $500', bet: '$120,000', profit: '+$980,200', avatar: '👑', slug: 'sol-500' },
];

export default function LeaderboardPage() {
    const [timeframe, setTimeframe] = useState('All');
    const [viewLimit, setViewLimit] = useState(10);

    return (
        <div className="min-h-screen bg-black pt-40 px-6 pb-20 selection:bg-[#F492B7] selection:text-black font-sans">
            <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-12">

                {/* RANKING PRINCIPAL */}
                <div className="col-span-12 lg:col-span-8">
                    <h1 className="text-7xl text-white mb-16 tracking-[-0.05em]" style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                        Leaderboard
                    </h1>

                    {/* SELECTORES DE TIEMPO MASIVOS */}
                    <div className="flex gap-4 mb-14">
                        {['Today', 'All'].map((t) => (
                            <button key={t} onClick={() => setTimeframe(t)}
                                className={`px-10 py-4 rounded-full text-[14px] tracking-[0.2em] transition-all border-2 font-bold ${timeframe === t
                                        ? 'bg-[#F492B7] text-black border-[#F492B7] shadow-[0_0_25px_rgba(244,146,183,0.4)]'
                                        : 'text-white border-white/10 hover:border-white/40'
                                    }`}>
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {topDjinns.map((djinn) => (
                            <div key={djinn.rank} className="flex items-center justify-between py-6 px-10 rounded-[30px] bg-black border border-white/[0.04] hover:border-[#F492B7]/30 hover:-translate-y-1 transition-all duration-300 group">
                                <div className="flex items-center gap-8">
                                    <span className="text-4xl font-[900] italic tracking-tighter text-[#F492B7]">#{djinn.rank}</span>
                                    <div className="flex items-center gap-6">
                                        <Link href={`/profile/${djinn.user.toLowerCase()}`} className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center text-3xl shrink-0 overflow-hidden border border-white/10">
                                            {djinn.avatar}
                                        </Link>
                                        <div className="flex flex-col">
                                            <Link href={`/profile/${djinn.user.toLowerCase()}`} className="text-[22px] text-white hover:text-[#F492B7] transition-colors tracking-tight leading-none" style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                                                @{djinn.user}
                                            </Link>
                                            <Link href={`/market/${djinn.slug}`} className="text-[11px] text-gray-500 italic mt-2 uppercase tracking-widest hover:text-white transition-colors">
                                                Last: {djinn.lastPool}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right text-4xl font-[900] text-green-400 italic tracking-tighter leading-none">
                                    {djinn.profit}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BIGGEST WINS (Derecha) */}
                <div className="col-span-12 lg:col-span-4 lg:pt-36">
                    <div className="bg-black border border-white/[0.04] rounded-[40px] p-10 sticky top-40">
                        <h2 className="text-[22px] text-white mb-10 tracking-tight" style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                            Biggest wins
                        </h2>

                        {/* SELECTOR TOP DEBAJO DEL TÍTULO - MAS GRANDE */}
                        <div className="flex gap-3 bg-white/[0.03] p-2 rounded-2xl border border-white/5 mb-12 w-fit">
                            {[3, 5, 10].map((num) => (
                                <button key={num} onClick={() => setViewLimit(num)}
                                    className={`px-8 py-3 rounded-xl text-[12px] transition-all font-bold ${viewLimit === num
                                            ? 'bg-[#F492B7] text-black shadow-[0_0_20px_rgba(244,146,183,0.3)]'
                                            : 'text-white hover:bg-white/5'
                                        }`}>
                                    TOP {num}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-12">
                            {biggestWins.map((win) => (
                                <div key={win.rank} className="flex gap-6 group">
                                    <div className="text-4xl font-[900] italic text-[#F492B7] leading-none pt-1">#{win.rank}</div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-4">
                                            <Link href={`/profile/${win.user.toLowerCase()}`} className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center text-xl shrink-0 overflow-hidden hover:scale-110 transition-transform">
                                                {win.avatar}
                                            </Link>
                                            <Link href={`/profile/${win.user.toLowerCase()}`} className="text-[18px] text-white hover:text-[#F492B7] transition-colors font-bold" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                                                @{win.user}
                                            </Link>
                                        </div>

                                        <Link href={`/market/${win.slug}`} className="block text-[13px] text-white italic mb-4 font-medium tracking-tight hover:text-[#F492B7] transition-all">
                                            {win.market}
                                        </Link>

                                        <div className="flex justify-between items-end">
                                            <span className="text-[11px] text-white font-bold tracking-widest uppercase opacity-100">BET: {win.bet}</span>
                                            <span className="text-3xl font-[900] text-green-400 italic tracking-tighter leading-none">{win.profit}</span>
                                        </div>
                                        <div className="h-[1px] w-full bg-white/5 mt-10 group-hover:bg-[#F492B7]/20 transition-colors"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}