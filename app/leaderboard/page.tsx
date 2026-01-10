'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// DATOS INICIALES
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

export default function LeaderboardPage() {
    const [liveTraders, setLiveTraders] = useState<any[]>([]);

    useEffect(() => {
        const syncLiveTraders = () => {
            const savedProfile = localStorage.getItem('djinn_user_profile');
            if (savedProfile) {
                const profile = JSON.parse(savedProfile);
                if (profile.profit > 0) {
                    setLiveTraders([{
                        user: profile.username,
                        profit: profile.profit,
                        avatar: '👤',
                        isYou: true,
                        slug: profile.username.toLowerCase()
                    }]);
                }
            }
        };
        syncLiveTraders();
        window.addEventListener('storage', syncLiveTraders);
        return () => window.removeEventListener('storage', syncLiveTraders);
    }, []);

    const sortedDjinns = [...initialDjinns, ...liveTraders]
        .sort((a, b) => b.profit - a.profit)
        .map((djinn, idx) => ({ ...djinn, rank: idx + 1 }));

    const podium = sortedDjinns.slice(0, 3);
    const list = sortedDjinns.slice(3, 10);

    return (
        <main className="min-h-screen bg-black text-white pb-40 pt-40 px-10">
            <div className="max-w-[1600px] mx-auto">

                {/* TÍTULO LIMPIO */}
                <h1 className="text-3xl font-bold mb-16 tracking-tight text-left">
                    Leaderboard
                </h1>

                {/* PODIO CENTRADO CON 3 CARDS */}
                <div className="flex items-end justify-center gap-6 mb-32 max-w-[1200px] mx-auto">
                    {/* RANK 2 - IZQUIERDA */}
                    <PodiumCard djinn={podium[1]} height="h-[360px]" />

                    {/* RANK 1 - CENTRO MÁS GRANDE CON GLOW ROSA */}
                    <div className="relative z-20">
                        <div className="absolute -inset-2 bg-gradient-to-r from-[#F492B7] to-purple-600 rounded-[3rem] blur-xl opacity-40"></div>
                        <PodiumCard djinn={podium[0]} height="h-[460px]" isFirst={true} />
                    </div>

                    {/* RANK 3 - DERECHA */}
                    <PodiumCard djinn={podium[2]} height="h-[320px]" />
                </div>

                <div className="grid grid-cols-12 gap-12">
                    {/* LISTA PRINCIPAL - IZQUIERDA */}
                    <div className="col-span-12 lg:col-span-8 space-y-4">
                        {list.map((djinn) => (
                            <div
                                key={djinn.user}
                                className="flex items-center justify-between py-7 px-10 rounded-3xl bg-[#0D0D0D] border border-white/5 hover:border-[#F492B7]/30 transition-all group"
                            >
                                <div className="flex items-center gap-8">
                                    {/* NÚMERO RANK */}
                                    <span className="text-2xl font-bold text-gray-500 w-16 shrink-0">
                                        #{djinn.rank}
                                    </span>

                                    <div className="flex items-center gap-6">
                                        {/* AVATAR */}
                                        <Link
                                            href={`/profile/${djinn.slug}`}
                                            className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-3xl shrink-0 border border-white/5 hover:scale-110 transition-transform"
                                        >
                                            {djinn.avatar}
                                        </Link>

                                        {/* USERNAME - Tipografía limpia */}
                                        <Link
                                            href={`/profile/${djinn.slug}`}
                                            className="text-lg font-bold tracking-tight text-white hover:text-[#F492B7] transition-colors"
                                        >
                                            {djinn.user}
                                            {djinn.isYou && (
                                                <span className="ml-3 text-[9px] bg-[#F492B7] text-black px-2 py-1 rounded-full font-black">YOU</span>
                                            )}
                                        </Link>
                                    </div>
                                </div>

                                {/* PROFIT - Estilo Activity: italic bold verde */}
                                <div className="text-right">
                                    <div className="text-3xl font-black italic text-emerald-400 tracking-tight">
                                        ${djinn.profit.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-600 tracking-wider mt-1">
                                        All Time Profit
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* BIGGEST WINS - DERECHA */}
                    <div className="col-span-12 lg:col-span-4">
                        <div className="bg-[#0D0D0D] border border-white/5 rounded-3xl p-8 sticky top-40">
                            <div className="flex items-center gap-2 mb-10">
                                <h2 className="text-xl font-bold tracking-tight">
                                    Biggest Wins
                                </h2>
                            </div>

                            <div className="space-y-8">
                                {biggestWins.map((win) => (
                                    <div key={win.user} className="relative pl-8 border-l-2 border-white/10 pb-6">
                                        <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-[#F492B7] border-2 border-black"></div>

                                        <div className="flex items-center gap-3 mb-3">
                                            <Link
                                                href={`/profile/${win.slug}`}
                                                className="text-2xl hover:scale-110 transition-transform"
                                            >
                                                {win.avatar}
                                            </Link>
                                            <Link
                                                href={`/profile/${win.slug}`}
                                                className="text-base font-bold text-white hover:text-[#F492B7] transition-colors"
                                            >
                                                {win.user}
                                            </Link>
                                        </div>

                                        <p className="text-xs text-gray-500 mb-4 font-medium">
                                            "{win.market}"
                                        </p>

                                        <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="text-[9px] text-gray-600 font-bold block mb-1">Position</span>
                                                    <span className="text-base font-bold text-white">{win.bet}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] text-gray-600 font-bold block mb-1">Bounty</span>
                                                    {/* Profit estilo Activity: italic bold grande */}
                                                    <span className="text-2xl font-black italic text-emerald-400">{win.profit}</span>
                                                </div>
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

// COMPONENTE PODIO - ÉPICO
function PodiumCard({ djinn, height, isFirst = false, rank }: any) {
    if (!djinn) return null;

    // Colores y estilos según el rank
    const getRankStyles = () => {
        if (djinn.rank === 1) {
            return {
                border: 'border-t-8 border-t-[#F492B7]',
                ring: 'ring-4 ring-[#F492B7] shadow-[0_0_40px_rgba(244,146,183,0.5)]',
                badge: 'bg-gradient-to-r from-[#F492B7] to-[#ff6fb7] text-black',
                icon: '👑',
                glow: true
            };
        } else if (djinn.rank === 2) {
            return {
                border: 'border-t-6 border-t-gray-300',
                ring: 'ring-2 ring-gray-300 shadow-[0_0_20px_rgba(200,200,200,0.3)]',
                badge: 'bg-gradient-to-r from-gray-300 to-gray-400 text-black',
                icon: '🥈',
                glow: false
            };
        } else {
            return {
                border: 'border-t-4 border-t-amber-600',
                ring: 'ring-2 ring-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.3)]',
                badge: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white',
                icon: '🥉',
                glow: false
            };
        }
    };

    const styles = getRankStyles();

    return (
        <div className={`relative ${height} w-[320px] bg-gradient-to-b from-[#0D0D0D] to-[#080808] ${styles.border} rounded-[3rem] p-10 flex flex-col items-center justify-center transition-all duration-500 shadow-2xl hover:translate-y-[-10px] group`}>

            {/* Glow de fondo para Rank 1 */}
            {styles.glow && (
                <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-b from-[#F492B7]/10 to-transparent pointer-events-none"></div>
            )}

            {/* AVATAR FLOTANTE ARRIBA */}
            <Link
                href={`/profile/${djinn.slug}`}
                className={`absolute -top-16 w-32 h-32 rounded-full border-[5px] border-black overflow-hidden bg-[#0A0A0A] flex items-center justify-center text-6xl hover:scale-110 transition-transform ${styles.ring}`}
            >
                {djinn.avatar}
            </Link>

            <div className="text-center mt-20 w-full relative z-10">
                {/* BADGE DE RANK */}
                <div className="flex justify-center mb-4">
                    <span className={`text-xs font-black px-4 py-1.5 rounded-full ${styles.badge} tracking-widest`}>
                        #{djinn.rank}
                    </span>
                </div>

                {/* USERNAME */}
                <Link
                    href={`/profile/${djinn.slug}`}
                    className="text-xl font-bold tracking-tight mb-8 block hover:text-[#F492B7] transition-colors truncate px-4"
                >
                    {djinn.user}
                </Link>

                {/* PROFIT - Verde grande */}
                <div className="bg-white/5 border border-white/10 px-6 py-5 rounded-2xl">
                    <p className="text-3xl font-black italic tracking-tight leading-tight text-emerald-400">
                        ${djinn.profit.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold tracking-wider mt-2 text-gray-600">
                        All Time Profit
                    </p>
                </div>
            </div>

            {/* Chispas para Rank 1 */}
            {djinn.rank === 1 && (
                <>
                    <span className="absolute top-10 left-4 text-[10px] text-[#F492B7] animate-ping drop-shadow-[0_0_4px_#F492B7]">✦</span>
                    <span className="absolute top-20 right-4 text-[10px] text-[#F492B7] animate-ping drop-shadow-[0_0_4px_#F492B7]" style={{ animationDelay: '0.5s' }}>✦</span>
                    <span className="absolute bottom-20 left-6 text-[8px] text-[#F492B7] animate-pulse drop-shadow-[0_0_3px_#F492B7]">✦</span>
                    <span className="absolute bottom-16 right-6 text-[8px] text-[#F492B7] animate-pulse drop-shadow-[0_0_3px_#F492B7]" style={{ animationDelay: '0.3s' }}>✦</span>
                </>
            )}
        </div>
    );
}