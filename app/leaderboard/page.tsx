'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK DATA GENERATOR ---
const generateStats = (baseProfit: number, baseVolume: number) => ({
    daily: { profit: baseProfit * 0.05, volume: baseVolume * 0.02 },
    weekly: { profit: baseProfit * 0.2, volume: baseVolume * 0.1 },
    monthly: { profit: baseProfit * 0.6, volume: baseVolume * 0.4 },
    all_time: { profit: baseProfit, volume: baseVolume },
});

const initialDjinns = [
    { user: 'Kch123', avatar: '🦁', slug: 'kch123', stats: generateStats(5864652, 105134846) },
    { user: 'SeriouslySirius', avatar: '🦅', slug: 'seriouslysirius', stats: generateStats(5562048, 86249502) },
    { user: '0x006cc834', avatar: '🦊', slug: '0x006cc834', stats: generateStats(4241921, 37848692) },
    { user: 'Lord_Prophet', avatar: '👑', slug: 'lord_prophet', stats: generateStats(2632212, 35274916) },
    { user: 'gmanas', avatar: '🔮', slug: 'gmanas', stats: generateStats(2397970, 192173116) },
    { user: 'MCGenius', avatar: '🧙‍♂️', slug: 'mcgenius', stats: generateStats(2068652, 14033524) },
    { user: 'MrSparkly', avatar: '🐕', slug: 'mrsparkly', stats: generateStats(1984537, 43850056) },
    { user: 'RN1', avatar: '🐳', slug: 'rn1', stats: generateStats(1879038, 66025929) },
    { user: 'WhaleWatcher', avatar: '🌊', slug: 'whalewatcher', stats: generateStats(1500000, 50000000) },
    { user: 'DegenKing', avatar: '🔱', slug: 'degenking', stats: generateStats(1200000, 40000000) }
];

const biggestWinsAllTime = [
    {
        rank: 1,
        user: 'beachboy4',
        wallet: '8xK...9zLq',
        market_title: 'Real Sociedad de Fútbol vs. Villarreal CF',
        market_slug: 'real-sociedad-vs-villarreal',
        market_image: '⚽️',
        bet: 2701565,
        payout: 6947364,
        slug: 'beachboy4'
    },
    {
        rank: 2,
        user: 'beachboy4',
        wallet: '8xK...9zLq',
        market_title: 'Tottenham Hotspur FC vs. Brighton',
        market_slug: 'tottenham-vs-brighton',
        market_image: '⚽️',
        bet: 3322439,
        payout: 6809952,
        slug: 'beachboy4'
    },
    {
        rank: 3,
        user: 'beachboy4',
        wallet: '8xK...9zLq',
        market_title: 'Olympique de Marseille vs. Paris SG',
        market_slug: 'marseille-vs-psg',
        market_image: '⚽️',
        bet: 3458339,
        payout: 6378346,
        slug: 'beachboy4'
    },
    {
        rank: 4,
        user: 'Bossoskil',
        wallet: 'Bo5...Ssk1',
        market_title: 'Miami vs. Ohio State',
        market_slug: 'miami-vs-ohio',
        market_image: '🏈',
        bet: 385511,
        payout: 1446914,
        slug: 'bossoskil'
    },
    {
        rank: 5,
        user: 'DegenKing',
        wallet: 'DeG...K1nG',
        market_title: 'Solana to $500',
        market_slug: 'solana-500',
        market_image: '🚀',
        bet: 120000,
        payout: 980200,
        slug: 'degenking'
    },
    {
        rank: 6,
        user: '',
        wallet: 'Ah7...Mq9x',
        market_title: 'Will GPT-5 release in 2025?',
        market_slug: 'gpt5-2025',
        market_image: '🤖',
        bet: 50000,
        payout: 850000,
        slug: 'Ah7Mq9x'
    },
    {
        rank: 7,
        user: 'CryptoWhale',
        wallet: 'CwH...99Yz',
        market_title: 'Bitcoin > $100k by EOY',
        market_slug: 'btc-100k-eoy',
        market_image: '💰',
        bet: 75000,
        payout: 720000,
        slug: 'cryptowhale'
    },
    {
        rank: 8,
        user: '',
        wallet: 'SoL...FaSt',
        market_title: 'Fed Rate Cut March',
        market_slug: 'fed-cut-march',
        market_image: '🏦',
        bet: 40000,
        payout: 650000,
        slug: 'SoLFaSt'
    },
    {
        rank: 9,
        user: 'ElonFan',
        wallet: 'El0...nMus',
        market_title: 'SpaceX Starship Launch Success',
        market_slug: 'spacex-starship',
        market_image: '🚀',
        bet: 30000,
        payout: 500000,
        slug: 'elonfan'
    },
    {
        rank: 10,
        user: 'MoonBoi',
        wallet: 'M00...nB01',
        market_title: 'ETH Flips BTC',
        market_slug: 'eth-flips-btc',
        market_image: '🌙',
        bet: 20000,
        payout: 450000,
        slug: 'moonboi'
    },
];

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export default function LeaderboardPage() {
    const { publicKey } = useWallet();
    const [period, setPeriod] = useState<TimePeriod>('monthly');
    const [liveTraders, setLiveTraders] = useState<any[]>(initialDjinns);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAchievement, setShowAchievement] = useState(false);

    useEffect(() => {
        const syncLiveTraders = () => {
            const savedProfile = localStorage.getItem('djinn_user_profile');
            if (savedProfile) {
                try {
                    const profile = JSON.parse(savedProfile);
                    // Add "You" to the list if likely to rank
                    // For demo purposes, we will append "You" if meaningful stats exist
                    if (profile.profit > 0 || profile.gems > 0) {
                        const userStats = {
                            daily: { profit: (profile.profit || 0) * 0.1, volume: (profile.profit || 0) * 2 },
                            weekly: { profit: (profile.profit || 0) * 0.3, volume: (profile.profit || 0) * 5 },
                            monthly: { profit: profile.profit || 0, volume: (profile.profit || 0) * 10 },
                            all_time: { profit: profile.profit || 0, volume: (profile.profit || 0) * 15 },
                        };

                        setLiveTraders(prev => {
                            // Check if exists
                            const exists = prev.find(p => p.slug === profile.username.toLowerCase() || (publicKey && p.slug === publicKey.toBase58()));
                            if (exists) return prev;

                            return [...prev, {
                                user: profile.username || 'You',
                                avatar: profile.pfp || '👤',
                                slug: profile.username.toLowerCase(),
                                isYou: true,
                                stats: userStats
                            }];
                        });
                    }
                } catch (e) {
                    console.error("Error parsing profile for leaderboard", e);
                }
            }
        };
        syncLiveTraders();
    }, [publicKey]);

    // Sort Data based on Period
    const sortedTraders = [...liveTraders]
        .map(t => ({
            ...t,
            currentProfit: t.stats[period].profit,
            currentVolume: t.stats[period].volume
        }))
        .sort((a, b) => b.currentProfit - a.currentProfit)
        .map((t, i) => ({ ...t, rank: i + 1 }));

    // Filter by Search
    const filteredTraders = sortedTraders.filter(t =>
        t.user.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Find You and Trigger Achievement
    useEffect(() => {
        const you = sortedTraders.find(t => t.isYou);
        const hasSeenAchievement = localStorage.getItem('djinn_trophy_seen');

        if (you?.rank === 1 && !hasSeenAchievement && period === 'monthly') {
            setShowAchievement(true);
            localStorage.setItem('djinn_trophy_seen', 'true');
            setTimeout(() => {
                setShowAchievement(false);
            }, 6000); // 6s display
        }
    }, [sortedTraders, period]);

    return (
        <main className="min-h-screen bg-transparent text-white pb-20 pt-28 px-6 relative">
            {/* ACHIEVEMENT TOAST */}
            <AnimatePresence>
                {showAchievement && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        onClick={() => setShowAchievement(false)}
                        className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-[#1a1a1a] border-2 border-[#FFD700] rounded-lg p-4 flex items-center gap-4 shadow-[0_0_30px_rgba(255,215,0,0.3)] min-w-[320px] cursor-pointer hover:scale-[1.02] transition-transform"
                    >
                        <div className="w-12 h-12 bg-[#FFD700]/20 rounded-full flex items-center justify-center border border-[#FFD700]">
                            <img src="/gold-trophy.png" alt="Trophy" className="w-8 h-8 object-contain drop-shadow-md" />
                        </div>
                        <div>
                            <p className="text-[#FFD700] text-xs font-black uppercase tracking-widest mb-1">UNLOCKED</p>
                            <p className="text-white font-bold text-lg">The Champion</p>
                            <p className="text-gray-400 text-xs">Reached Rank #1 on Leaderboard</p>
                        </div>
                    </motion.div>
                )}
                {/* BIGGEST WIN UNLOCK TOAST */}
                {true && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 1 }}
                        onClick={(e) => {
                            // This is a demo toast in an 'if(true)', but let's make it clickable if it were real
                            (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                        className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-[#0A0A0A] border border-[#10B981]/50 rounded-2xl p-4 flex items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] min-w-[320px] cursor-pointer hover:scale-[1.02] transition-transform"
                    >
                        <div className="relative shrink-0 w-12 h-12">
                            <img src="/gems-trophy.png" className="w-full h-full object-contain drop-shadow-lg" />
                        </div>
                        <div>
                            <p className="text-[#10B981] text-[10px] font-black uppercase tracking-[0.2em] mb-0.5">UNLOCKED</p>
                            <h4 className="text-xl font-black text-white italic tracking-tighter leading-none mb-0.5">Djinn</h4>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Top 1 Biggest Win All Time</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN: LEADERBOARD */}
                <div className="lg:col-span-7">
                    <h1 className="text-4xl font-black tracking-tight mb-8">Leaderboard</h1>

                    {/* FILTERS */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                        {/* Time Tabs */}
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                            {(['daily', 'weekly', 'monthly', 'all_time'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${period === p
                                        ? 'bg-white text-black shadow-lg'
                                        : 'text-gray-500 hover:text-white'
                                        }`}
                                >
                                    {p.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                    </div>

                    {/* TABLE HEADERS */}
                    <div className="flex items-center justify-end gap-12 mb-2 px-4 text-xs font-black text-white uppercase tracking-widest hidden sm:flex">
                        <span>Profit/Loss</span>
                        <span className="w-24 text-right">Volume</span>
                    </div>

                    {/* TABLE */}
                    <div className="space-y-2">
                        {filteredTraders.map((trader) => (
                            <Link
                                href={`/profile/${trader.slug}`}
                                key={trader.slug}
                                className="group block"
                            >
                                <div className={`flex items-center justify-between py-4 px-4 rounded-xl transition-all border border-transparent hover:border-white/5 hover:bg-white/5 ${trader.isYou ? 'bg-[#F492B7]/10 border-[#F492B7]/20' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <span className={`w-8 text-lg font-bold ${trader.rank <= 3 ? 'text-[#F492B7]' : 'text-gray-600'}`}>
                                            {trader.rank}
                                        </span>

                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden border border-white/5">
                                                {trader.avatar.startsWith('http') ? (
                                                    <img src={trader.avatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-lg">{trader.avatar}</div>
                                                )}
                                            </div>
                                            {/* GOLD TROPHY FOR RANK 1 */}
                                            {trader.rank === 1 && (
                                                <div className="absolute -bottom-2 -right-2 w-8 h-8 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] transform hover:scale-110 transition-transform z-10">
                                                    <img src="/gold-trophy.png" alt="Gold Trophy" className="w-full h-full object-contain" />
                                                </div>
                                            )}
                                        </div>

                                        <span className="font-bold text-white group-hover:text-[#F492B7] transition-colors text-base ml-2">
                                            {trader.user}
                                            {trader.isYou && <span className="ml-2 text-[9px] bg-[#F492B7] text-black px-1.5 rounded font-black uppercase align-middle">You</span>}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-12 text-right">
                                        <span className="font-black text-[#10B981] italic tracking-tight text-lg">
                                            +${trader.currentProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                        <span className="font-black text-white italic tracking-tight text-lg w-24 hidden sm:block drop-shadow-sm">
                                            ${trader.currentVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* STICKY USER FOOTER (If Logged In & Ranked) */}
                    {true /* Always show for demo if needed, but using live logic */ && filteredTraders.find(t => t.isYou) && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[600px] bg-[#121212] border border-white/10 rounded-full px-6 py-4 shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-5">
                            {(() => {
                                const navYou = filteredTraders.find(t => t.isYou);
                                if (!navYou) return null;
                                return (
                                    <>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-400">#{navYou.rank}</span>
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F492B7] to-purple-600 flex items-center justify-center text-sm overflow-hidden">
                                                {navYou.avatar.startsWith('http') ? <img src={navYou.avatar} className="w-full h-full" /> : navYou.avatar}
                                            </div>
                                            <span className="font-black text-white text-base">{navYou.user} (You)</span>
                                        </div>
                                        <span className="font-black text-[#10B981] text-lg">
                                            +${navYou.currentProfit.toLocaleString()}
                                        </span>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: BIGGEST WINS SIDEBAR - LARGER & FLOATY */}
                <div className="lg:col-span-5 transition-all duration-300">
                    <div className="bg-[#050505] border border-white/15 rounded-3xl p-10 sticky top-32 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-3xl relative overflow-hidden group/sidebar">

                        {/* Subtle Top Glow */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black tracking-tighter text-white drop-shadow-md italic">Biggest Wins</h2>

                            {/* ALL TIME STAMP (Reverted to Seal/Stamp Look) */}
                            <div className="relative border-4 border-[#F492B7]/50 text-[#F492B7] px-4 py-1 rounded-lg transform -rotate-12 opacity-90 mix-blend-screen shadow-[0_0_15px_rgba(244,146,183,0.3)]">
                                <span className="text-sm font-black italic uppercase tracking-[0.3em]">ALL TIME</span>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {biggestWinsAllTime.slice(0, 5).map((win, i) => (
                                <div key={i} className="flex gap-4 group items-start p-4 mb-4 rounded-2xl border border-transparent hover:bg-white/5 hover:border-white/5 transition-all cursor-default">
                                    <span className={`text-xl font-black pt-1 w-6 ${i < 3 ? 'text-[#F492B7]' : 'text-gray-600'}`}>{win.rank}</span>

                                    <div className="flex-1 min-w-0">
                                        {/* Row 1: User */}
                                        <div className="flex items-center gap-3 mb-2">
                                            <Link href={`/profile/${win.slug}`} className="relative block shrink-0 group-hover:scale-110 transition-transform">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center text-base overflow-hidden">
                                                    <span className="opacity-50">👤</span>
                                                </div>

                                                {/* GEMS TROPHY (Overlay on PFP) */}
                                                {win.rank === 1 && (
                                                    <div className="absolute -bottom-2 -right-2 w-7 h-7 filter drop-shadow-md z-10">
                                                        <img src="/gems-trophy.png" className="w-full h-full object-contain" alt="Trophy" />
                                                    </div>
                                                )}
                                            </Link>
                                            <Link href={`/profile/${win.slug}`} className="font-bold text-base text-gray-200 hover:text-white transition-colors truncate">
                                                {win.user ? win.user : win.wallet}
                                            </Link>
                                        </div>

                                        {/* Row 2: Market Title (Clickable) */}
                                        <Link href={`/market/${win.market_slug}`} className="block text-sm font-black text-white hover:text-[#F492B7] transition-colors line-clamp-2 mb-3 leading-snug">
                                            {win.market_title}
                                        </Link>

                                        {/* Row 3: Stats Grid */}
                                        <div className="flex items-end justify-between rounded-lg p-2 relative overflow-hidden">

                                            <div className="flex flex-col gap-1 relative z-10 pl-2">
                                                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Initial</span>
                                                {/* MATCH GREEN STYLE BUT WHITE */}
                                                <span className="text-white font-black italic text-2xl tracking-tighter drop-shadow-sm">${win.bet.toLocaleString()}</span>
                                            </div>

                                            <div className="flex flex-col items-end gap-1 relative z-10">
                                                <span className="text-[9px] text-[#10B981] font-black uppercase tracking-widest">Profit</span>
                                                <span className="text-[#10B981] font-black italic text-2xl tracking-tighter drop-shadow-sm">+${(win.payout - win.bet).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}