'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import LostSOLLeaderboard from '@/components/LostSOLLeaderboard';

// DATOS INICIALES (MOCK)
const initialDjinns = [
    { user: 'Kch123', profit: 2055127, avatar: '🦁', slug: 'kch123' },
    { user: 'SeriouslySirius', profit: 1242655, avatar: '🦅', slug: 'seriouslysirius' },
    { user: 'OnchainScammer', profit: 871423, avatar: '🦊', slug: 'onchainscammer' },
    { user: 'Lord_Prophet', profit: 750200, avatar: '👑', slug: 'lord_prophet' },
    { user: 'AlphaOracle', profit: 620110, avatar: '🔮', slug: 'alphaoracle' },
    { user: 'CryptoZard', profit: 450000, avatar: '🧙‍♂️', slug: 'cryptozard' },
    { user: 'SolHunter', profit: 320000, avatar: '🐕', slug: 'solhunter' },
    { user: 'WhaleWatcher', profit: 280000, avatar: '🐳', slug: 'whalewatcher' },
];

const biggestWins = [
    { rank: 1, user: 'Bossoskil', market: 'Miami vs. Ohio State', bet: '$385,511', profit: '$1,446,914', avatar: '🐳', slug: 'bossoskil' },
    { rank: 2, user: 'Beachboy4', market: 'Elche CF vs. Villarreal', bet: '$729,038', profit: '$1,664,838', avatar: '🌊', slug: 'beachboy4' },
    { rank: 3, user: 'DegenKing', market: 'Solana to $500', bet: '$120,000', profit: '$980,200', avatar: '🔱', slug: 'degenking' },
];

const mockLosers = [
    { rank: 1, wallet: 'Giga...4xKc', username: 'DiamondHandsRekt', totalLost: 42.5, lossCount: 12 },
    { rank: 2, wallet: 'Dege...nPro', username: 'YOLOmaster2025', totalLost: 28.3, lossCount: 8 },
    { rank: 3, wallet: 'Moon...boi1', username: 'BetItAll', totalLost: 19.7, lossCount: 15 },
    { rank: 4, wallet: 'Ape...xWGMI', totalLost: 15.2, lossCount: 6 },
    { rank: 5, wallet: 'Sol...Max99', totalLost: 12.8, lossCount: 4 },
    { rank: 6, wallet: 'Pump...Dump', totalLost: 10.5, lossCount: 9 },
    { rank: 7, wallet: 'Rekt...Again', totalLost: 8.9, lossCount: 7 },
    { rank: 8, wallet: 'FOMO...King', totalLost: 7.2, lossCount: 5 },
    { rank: 9, wallet: 'Paper...Hand', totalLost: 5.6, lossCount: 3 },
    { rank: 10, wallet: 'NoLuck...Sol', totalLost: 4.1, lossCount: 2 },
];

export default function LeaderboardPage() {
    const [liveTraders, setLiveTraders] = useState<any[]>([]);
    const [view, setView] = useState<'winners' | 'losers'>('winners');

    useEffect(() => {
        const syncLiveTraders = () => {
            const savedProfile = localStorage.getItem('djinn_user_profile');
            if (savedProfile) {
                try {
                    const profile = JSON.parse(savedProfile);
                    // Only show if positive profit
                    if (profile.profit > 0 || profile.gems > 0) {
                        setLiveTraders([{
                            user: profile.username || 'You',
                            profit: profile.profit || 0,
                            avatar: profile.pfp || '👤', // Use real PFP if available
                            isYou: true,
                            slug: profile.username.toLowerCase() // Ensure slug matches profile
                        }]);
                    }
                } catch (e) {
                    console.error("Error parsing profile for leaderboard", e);
                }
            }
        };
        syncLiveTraders();
        window.addEventListener('storage', syncLiveTraders);
        return () => window.removeEventListener('storage', syncLiveTraders);
    }, []);

    // Merge Mock + Live User, sort by profit
    // Fix: Filter duplicates if "You" is already in the list with same name
    const allTraders = [...initialDjinns];
    if (liveTraders.length > 0) {
        // Remove mock entry if it has same name as real user
        const realUser = liveTraders[0];
        const existingIdx = allTraders.findIndex(t => t.user.toLowerCase() === realUser.user.toLowerCase());
        if (existingIdx !== -1) {
            allTraders[existingIdx] = { ...allTraders[existingIdx], ...realUser, isYou: true };
        } else {
            allTraders.push(realUser);
        }
    }

    const sortedDjinns = allTraders
        .sort((a, b) => b.profit - a.profit)
        .map((djinn, idx) => ({ ...djinn, rank: idx + 1 }));

    const podium = [sortedDjinns[1], sortedDjinns[0], sortedDjinns[2]].filter(Boolean); // Order: 2, 1, 3 for visual podium
    const list = sortedDjinns.slice(3, 20);

    return (
        <main className="min-h-screen bg-black text-white pb-40 pt-32 px-6">
            <div className="max-w-[1400px] mx-auto">

                {/* HEADER - MINIMAL */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-black tracking-tight mb-2">
                        Leaderboard
                    </h1>
                    <p className="text-gray-500 text-sm">Review the most profitable (and least profitable) traders</p>

                    {/* TOGGLE SWITCH */}
                    <div className="inline-flex mt-8 p-1 bg-white/5 rounded-full border border-white/10">
                        <button
                            onClick={() => setView('winners')}
                            className={`px-8 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${view === 'winners' ? 'bg-[#F492B7] text-black shadow-[0_0_15px_rgba(244,146,183,0.3)]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <span className="mr-2">🏆</span> Winners
                        </button>
                        <button
                            onClick={() => setView('losers')}
                            className={`px-8 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${view === 'losers' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <span className="mr-2">💀</span> Rekt
                        </button>
                    </div>
                </div>

                {view === 'winners' ? (
                    <>
                        {/* PODIUM SECTION - OLYMPIC STYLE */}
                        <div className="relative mb-32 max-w-[1100px] mx-auto">
                            {/* Background glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-radial from-[#F492B7]/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none"></div>

                            {/* Podium Container */}
                            <div className="flex items-end justify-center gap-6 relative z-10">
                                {/* RANK 2 - Silver */}
                                {podium[0] && (
                                    <div className="flex flex-col items-center">
                                        <PodiumCard djinn={podium[0]} rank={2} />
                                        <div className="w-full h-24 bg-gradient-to-b from-[#1A1A1A] to-[#0D0D0D] rounded-b-2xl border-x border-b border-white/10 flex items-center justify-center mt-[-1px]">
                                            <span className="text-6xl font-black text-gray-600/50">2</span>
                                        </div>
                                    </div>
                                )}

                                {/* RANK 1 - Gold (Center, Tallest) */}
                                {podium[1] && (
                                    <div className="flex flex-col items-center -mb-8 z-20">
                                        <PodiumCard djinn={podium[1]} rank={1} />
                                        <div className="w-full h-36 bg-gradient-to-b from-[#1A1A1A] to-[#0D0D0D] rounded-b-2xl border-x border-b border-[#F492B7]/30 flex items-center justify-center mt-[-1px] relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#F492B7]/10 to-transparent"></div>
                                            <span className="text-8xl font-black text-[#F492B7]/30 relative z-10">1</span>
                                        </div>
                                    </div>
                                )}

                                {/* RANK 3 - Bronze */}
                                {podium[2] && (
                                    <div className="flex flex-col items-center">
                                        <PodiumCard djinn={podium[2]} rank={3} />
                                        <div className="w-full h-16 bg-gradient-to-b from-[#1A1A1A] to-[#0D0D0D] rounded-b-2xl border-x border-b border-white/10 flex items-center justify-center mt-[-1px]">
                                            <span className="text-5xl font-black text-amber-900/30">3</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="mb-20 max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-5 duration-500">
                        {/* Hall of Shame Component */}
                        <LostSOLLeaderboard losers={mockLosers} />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 relative z-10">
                    {/* LIST SECTION */}
                    <div className="col-span-1 md:col-span-8 space-y-3">
                        <div className="flex items-center justify-between px-8 pb-4 text-xs font-black text-gray-500 uppercase tracking-widest">
                            <span className="w-16">Rank</span>
                            <span className="flex-1">Trader</span>
                            <span className="text-right">Total Profit</span>
                        </div>

                        {list.map((djinn) => (
                            <Link
                                href={`/profile/${djinn.slug}`}
                                key={djinn.user}
                                className="block"
                            >
                                <div className="flex items-center justify-between py-5 px-8 rounded-2xl bg-[#0D0D0D] border border-white/5 hover:border-[#F492B7]/30 hover:bg-white/5 transition-all group cursor-pointer relative overflow-hidden">
                                    {/* Hover glow */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#F492B7]/0 to-[#F492B7]/0 group-hover:from-[#F492B7]/5 group-hover:to-transparent transition-all duration-500"></div>

                                    <div className="flex items-center gap-6 relative z-10">
                                        <span className={`text-xl font-black w-16 ${djinn.rank <= 10 ? 'text-white' : 'text-gray-600'}`}>
                                            #{djinn.rank}
                                        </span>

                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl border border-white/5 overflow-hidden">
                                                {djinn.avatar.startsWith('http') ? (
                                                    <img src={djinn.avatar} alt={djinn.user} className="w-full h-full object-cover" />
                                                ) : (
                                                    djinn.avatar
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-bold text-white group-hover:text-[#F492B7] transition-colors">
                                                        {djinn.user}
                                                    </span>
                                                    {(djinn as any).isYou && (
                                                        <span className="text-[9px] bg-[#F492B7] text-black px-1.5 py-0.5 rounded font-black uppercase">You</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-medium">
                                                    @{djinn.slug}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right relative z-10">
                                        <div className="text-xl font-black italic text-[#10B981] tracking-tight group-hover:scale-105 transition-transform origin-right">
                                            ${djinn.profit.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* SIDEBAR - BIGGEST WINS */}
                    <div className="col-span-1 md:col-span-4">
                        <div className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border-2 border-[#F492B7]/20 rounded-3xl p-8 sticky top-32 relative shadow-[0_0_40px_rgba(244,146,183,0.08)]">
                            {/* Gradient top border effect */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F492B7]/50 to-transparent rounded-t-3xl"></div>

                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-lg font-black tracking-tight uppercase text-white">Biggest Wins</h2>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">All Time</span>
                            </div>

                            <div className="space-y-6">
                                {biggestWins.map((win, i) => (
                                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-[#F492B7]/30 transition-all group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="relative">
                                                <Link href={`/profile/${win.slug}`}>
                                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg border border-white/10 group-hover:border-[#F492B7]/50 transition-colors">
                                                        {win.avatar}
                                                    </div>
                                                </Link>
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F492B7] rounded-full flex items-center justify-center text-[10px] font-black text-black">#{win.rank}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <Link href={`/profile/${win.slug}`} className="text-sm font-bold text-white hover:text-[#F492B7] transition-colors block truncate">
                                                    {win.user}
                                                </Link>
                                                <p className="text-[10px] text-gray-500 truncate">
                                                    {win.market}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end pt-3 border-t border-white/5">
                                            <div>
                                                <p className="text-[9px] uppercase text-gray-600 font-bold">Bet</p>
                                                <p className="text-sm font-bold text-white">{win.bet}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] uppercase text-gray-600 font-bold">Won</p>
                                                <p className="text-xl font-black italic text-[#10B981]">{win.profit}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

// PREMIUM PODIUM CARD
function PodiumCard({ djinn, rank }: any) {
    if (!djinn) return null;

    const isFirst = rank === 1;
    const isSecond = rank === 2;

    // Rank-based accent colors
    const accentColor = isFirst ? '#F492B7' : isSecond ? '#C0C0C0' : '#CD7F32';
    const accentColorRGB = isFirst ? '244,146,183' : isSecond ? '192,192,192' : '205,127,50';

    return (
        <Link href={`/profile/${djinn.slug}`} className="block group w-[280px]">
            <div className="relative rounded-t-3xl overflow-visible transition-all duration-500 group-hover:-translate-y-2">

                {/* Card Background with gradient border effect */}
                <div className="absolute inset-0 rounded-3xl p-[2px]" style={{
                    background: isFirst
                        ? `linear-gradient(180deg, rgba(${accentColorRGB}, 0.6) 0%, rgba(${accentColorRGB}, 0.1) 100%)`
                        : `linear-gradient(180deg, rgba(${accentColorRGB}, 0.4) 0%, rgba(${accentColorRGB}, 0.05) 100%)`
                }}>
                    <div className="w-full h-full bg-[#0A0A0A] rounded-3xl"></div>
                </div>

                {/* Glow effect for #1 */}
                {isFirst && (
                    <div className="absolute -inset-4 bg-[#F492B7]/20 rounded-[3rem] blur-2xl opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none"></div>
                )}

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-between p-6 pt-10">

                    {/* Top Section - Avatar & Badge */}
                    <div className="flex flex-col items-center">
                        {/* Avatar Container */}
                        <div className="relative mb-4">
                            <div
                                className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl overflow-hidden transition-transform duration-300 group-hover:scale-110`}
                                style={{
                                    background: `linear-gradient(180deg, rgba(${accentColorRGB}, 0.2) 0%, rgba(0,0,0,0.8) 100%)`,
                                    border: `3px solid ${accentColor}`,
                                    boxShadow: isFirst ? `0 0 30px rgba(${accentColorRGB}, 0.4)` : 'none'
                                }}
                            >
                                {djinn.avatar.startsWith('http') ? (
                                    <img src={djinn.avatar} alt={djinn.user} className="w-full h-full object-cover" />
                                ) : (
                                    djinn.avatar
                                )}
                            </div>
                        </div>

                        {/* Rank Badge */}
                        <div
                            className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest mb-6"
                            style={{
                                background: `linear-gradient(90deg, ${accentColor}20, ${accentColor}40, ${accentColor}20)`,
                                border: `1px solid ${accentColor}50`,
                                color: accentColor
                            }}
                        >
                            Rank #{rank}
                        </div>
                    </div>

                    {/* Bottom Section - Name & Profit */}
                    <div className="text-center w-full">
                        {/* Username */}
                        <h3 className="text-xl font-bold text-white mb-4 truncate px-2 group-hover:text-[#F492B7] transition-colors">
                            {djinn.user}
                            {djinn.isYou && (
                                <span className="ml-2 text-[8px] bg-[#F492B7] text-black px-1.5 py-0.5 rounded font-black align-middle">YOU</span>
                            )}
                        </h3>

                        {/* Profit Card */}
                        <div
                            className="rounded-2xl p-5 backdrop-blur-sm"
                            style={{
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                border: '1px solid rgba(255,255,255,0.08)'
                            }}
                        >
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Total Profit</p>
                            <p className="text-3xl font-black italic text-[#10B981] tracking-tight">
                                ${djinn.profit.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}