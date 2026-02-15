'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import StarfieldBg from '@/components/StarfieldBg';
import { useSound } from '@/components/providers/SoundProvider';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA — Replace with API call to /api/bot/[id]
// ═══════════════════════════════════════════════════════════════════════════════

const TIER_CONFIG = {
    Novice: { color: 'text-gray-600', bg: 'bg-gray-200', icon: '🌱', border: 'border-gray-300' },
    Verified: { color: 'text-blue-600', bg: 'bg-blue-100', icon: '✅', border: 'border-blue-300' },
    Elite: { color: 'text-amber-500', bg: 'bg-amber-100', icon: '👑', border: 'border-amber-400' },
};

const CATEGORY_ICONS: Record<string, string> = {
    All: '🌐', Sports: '⚽', Crypto: '₿', Politics: '🏛️', Other: '🔮',
};

const mockBotData: Record<string, any> = {
    'alpha-sniper': {
        name: 'AlphaSniper', owner: 'Lord_Prophet', avatar: '🤖',
        tier: 'Elite', category: 'Crypto', isActive: true, isPaperTrading: false,
        metadataUri: 'https://arweave.net/abc123',
        registeredAt: '2025-06-15', reputation: 92,
        stats: { totalTrades: 4821, winRate: 73.2, pnl: 2847500, totalVolume: 42150000, winningTrades: 3529, losingTrades: 1292 },
        verification: { accuracy: 91.3, bountiesEarned: 128500, totalSubmissions: 342 },
        vault: { totalAum: 8540000, numDepositors: 47, isPaused: false, hwm: 9200000, performanceFee: 20 },
        recentTrades: [
            { market: 'BTC > $120K by March', position: 'Yes', amount: 5000, result: 'won', pnl: 3200, date: '2026-02-12' },
            { market: 'Lakers Win NBA Finals', position: 'No', amount: 8000, result: 'won', pnl: 5600, date: '2026-02-10' },
            { market: 'SOL > $300 EOW', position: 'Yes', amount: 3500, result: 'lost', pnl: -3500, date: '2026-02-08' },
            { market: 'ETH/BTC Ratio > 0.04', position: 'Yes', amount: 6000, result: 'won', pnl: 4800, date: '2026-02-05' },
            { market: 'Fed Rate Cut Feb', position: 'No', amount: 10000, result: 'won', pnl: 7200, date: '2026-02-01' },
            { market: 'Trump EO on Crypto', position: 'Yes', amount: 4000, result: 'won', pnl: 2400, date: '2026-01-28' },
        ],
        theses: [
            { title: 'BTC Momentum Analysis Q1 2026', confidence: 87, date: '2026-02-10', summary: 'Strong accumulation pattern detected. Whale wallets adding 2.3% weekly. Target $135K.' },
            { title: 'Sports Betting Alpha: NBA Playoffs', confidence: 72, date: '2026-02-05', summary: 'Historical data shows underdog value in Western Conference matchups post All-Star break.' },
        ],
    },
};

// fallback for unknown bots
const fallbackBot = {
    name: 'Unknown Bot', owner: 'unknown', avatar: '❓',
    tier: 'Novice' as const, category: 'All', isActive: false, isPaperTrading: false,
    metadataUri: '', registeredAt: '—', reputation: 0,
    stats: { totalTrades: 0, winRate: 0, pnl: 0, totalVolume: 0, winningTrades: 0, losingTrades: 0 },
    verification: { accuracy: 0, bountiesEarned: 0, totalSubmissions: 0 },
    recentTrades: [], theses: [],
};

type Tab = 'trades' | 'theses' | 'vault';

export default function BotProfilePage() {
    const params = useParams();
    const { play } = useSound();
    const botId = params.id as string;
    const bot = mockBotData[botId] || fallbackBot;
    const tier = TIER_CONFIG[bot.tier as keyof typeof TIER_CONFIG];
    const [activeTab, setActiveTab] = useState<Tab>('trades');

    const formatNumber = (n: number) => {
        if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
        return n.toLocaleString();
    };

    return (
        <main className="min-h-screen bg-black text-white pb-20 pt-28 px-6 relative font-sans overflow-hidden">
            <StarfieldBg />
            <style jsx global>{`::selection { background-color: #F492B7; color: black; }`}</style>

            <div className="max-w-[1200px] mx-auto relative z-10">

                {/* BACK LINK */}
                <Link href="/bots" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold text-sm mb-6 transition-colors">
                    ← back to leaderboard
                </Link>

                {/* ═══════════ HERO CARD ═══════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-4 border-black rounded-[2rem] p-8 mb-8 shadow-[8px_8px_0px_0px_#F492B7] relative overflow-hidden"
                >
                    {/* BG Decoration */}
                    <div className="absolute top-0 right-0 text-[180px] font-black text-gray-100/50 leading-none select-none -translate-y-8 translate-x-4">
                        {bot.avatar}
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 rounded-2xl border-4 border-black bg-gray-100 flex items-center justify-center text-5xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                {bot.avatar}
                            </div>
                            <div className={`absolute -bottom-2 -right-2 px-2 py-1 rounded-full border-2 border-black text-xs font-black ${tier.bg}`}>
                                {tier.icon} {bot.tier}
                            </div>
                            <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full border-2 border-white ${bot.isActive ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h1 className="text-4xl font-black text-black lowercase tracking-tight">{bot.name}</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                <Link href={`/profile/${bot.owner.toLowerCase()}`} className="bg-gray-100 hover:bg-[#F492B7] border-2 border-black rounded-full px-3 py-1 text-sm font-bold text-black transition-colors">
                                    @{bot.owner}
                                </Link>
                                <span className="bg-gray-100 border border-gray-300 rounded-full px-3 py-1 text-xs font-bold text-gray-600">
                                    {CATEGORY_ICONS[bot.category]} {bot.category}
                                </span>
                                <span className="text-gray-400 text-xs font-bold">Since {bot.registeredAt}</span>
                                {bot.isPaperTrading && (
                                    <span className="bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-full px-3 py-1 text-xs font-black uppercase">📄 Paper</span>
                                )}
                            </div>
                        </div>

                        {/* Reputation Circle */}
                        <div className="flex flex-col items-center">
                            <div className={`w-20 h-20 rounded-full border-4 border-black flex items-center justify-center text-3xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${bot.reputation >= 80 ? 'bg-[#10B981] text-white' :
                                    bot.reputation >= 60 ? 'bg-yellow-300 text-black' :
                                        'bg-red-400 text-white'
                                }`}>
                                {bot.reputation}
                            </div>
                            <span className="text-[10px] font-black uppercase text-gray-400 mt-1">Reputation</span>
                        </div>
                    </div>
                </motion.div>

                {/* ═══════════ STAT CARDS ═══════════ */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {[
                        { label: 'PnL', value: `${bot.stats.pnl >= 0 ? '+' : ''}$${formatNumber(bot.stats.pnl)}`, color: bot.stats.pnl >= 0 ? 'bg-[#10B981]' : 'bg-red-500', txtColor: 'text-white' },
                        { label: 'Win Rate', value: `${bot.stats.winRate}%`, color: bot.stats.winRate >= 65 ? 'bg-[#10B981]' : 'bg-yellow-400', txtColor: bot.stats.winRate >= 65 ? 'text-white' : 'text-black' },
                        { label: 'Total Trades', value: bot.stats.totalTrades.toLocaleString(), color: 'bg-white', txtColor: 'text-black' },
                        { label: 'Volume', value: `$${formatNumber(bot.stats.totalVolume)}`, color: 'bg-white', txtColor: 'text-black' },
                        { label: 'Accuracy', value: `${bot.verification.accuracy}%`, color: 'bg-purple-100', txtColor: 'text-purple-700' },
                        { label: 'Bounties', value: `$${formatNumber(bot.verification.bountiesEarned)}`, color: 'bg-[#F492B7]', txtColor: 'text-black' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`${stat.color} border-3 border-black rounded-2xl p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
                        >
                            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">{stat.label}</div>
                            <div className={`text-2xl font-black italic ${stat.txtColor}`}>{stat.value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* ═══════════ TAB BAR ═══════════ */}
                <div className="bg-[#121212] border-2 border-white/20 rounded-full p-1.5 flex gap-1.5 backdrop-blur-md mb-8 w-fit">
                    {([
                        { key: 'trades' as Tab, label: '📊 Trades', count: bot.recentTrades?.length },
                        { key: 'theses' as Tab, label: '📝 Theses', count: bot.theses?.length },
                        { key: 'vault' as Tab, label: '🏦 Vault', count: bot.vault ? 1 : 0 },
                    ]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); play('toggle'); }}
                            className={`px-5 py-2 rounded-full text-sm font-black lowercase transition-all border-2 ${activeTab === tab.key
                                    ? 'bg-white border-white text-black shadow-[3px_3px_0px_0px_#F492B7] -translate-y-0.5'
                                    : 'bg-transparent border-white/20 text-gray-400 hover:text-white hover:border-white/40'
                                }`}
                        >
                            {tab.label} {tab.count ? `(${tab.count})` : ''}
                        </button>
                    ))}
                </div>

                {/* ═══════════ TAB CONTENT ═══════════ */}

                {/* TRADES TAB */}
                {activeTab === 'trades' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border-4 border-black rounded-[2rem] overflow-hidden">
                        <div className="flex items-center justify-between px-8 py-4 bg-black text-white border-b-4 border-black">
                            <span className="text-sm font-black uppercase tracking-widest text-[#F492B7]">Recent Trades</span>
                            <div className="flex gap-8 text-sm font-black uppercase tracking-widest">
                                <span>Position</span>
                                <span className="w-20 text-right">Amount</span>
                                <span className="w-20 text-right">PnL</span>
                            </div>
                        </div>
                        <div className="divide-y-2 divide-black">
                            {(bot.recentTrades || []).map((trade: any, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center justify-between py-4 px-6 hover:bg-[#FFF5F7] transition-colors"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center text-xs font-black ${trade.result === 'won' ? 'bg-[#10B981] text-white' : 'bg-red-400 text-white'
                                            }`}>
                                            {trade.result === 'won' ? 'W' : 'L'}
                                        </div>
                                        <div>
                                            <div className="font-black text-black text-sm">{trade.market}</div>
                                            <div className="text-gray-400 text-xs font-bold">{trade.date}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <span className={`font-bold text-sm px-3 py-1 rounded-full border-2 border-black ${trade.position === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                            }`}>
                                            {trade.position}
                                        </span>
                                        <span className="font-bold text-black w-20 text-right">${trade.amount.toLocaleString()}</span>
                                        <span className={`font-black w-20 text-right text-lg italic ${trade.pnl >= 0 ? 'text-[#10B981]' : 'text-red-500'
                                            }`}>
                                            {trade.pnl >= 0 ? '+' : ''}${Math.abs(trade.pnl).toLocaleString()}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                            {(!bot.recentTrades || bot.recentTrades.length === 0) && (
                                <div className="py-12 text-center text-gray-400">
                                    <div className="text-3xl mb-2">📊</div>
                                    <div className="font-black">no trades yet</div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* THESES TAB */}
                {activeTab === 'theses' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {(bot.theses || []).map((thesis: any, i: number) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-[8px_8px_0px_0px_#F492B7] transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-black text-black text-xl">{thesis.title}</h3>
                                    <div className={`px-3 py-1 rounded-full border-2 border-black font-black text-sm ${thesis.confidence >= 80 ? 'bg-[#10B981] text-white' :
                                            thesis.confidence >= 60 ? 'bg-yellow-300 text-black' :
                                                'bg-red-400 text-white'
                                        }`}>
                                        {thesis.confidence}% confidence
                                    </div>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed mb-3">{thesis.summary}</p>
                                <div className="text-gray-400 text-xs font-bold">{thesis.date}</div>
                            </motion.div>
                        ))}
                        {(!bot.theses || bot.theses.length === 0) && (
                            <div className="bg-white border-4 border-black rounded-[2rem] py-12 text-center text-gray-400">
                                <div className="text-3xl mb-2">📝</div>
                                <div className="font-black">no theses published</div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* VAULT TAB */}
                {activeTab === 'vault' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {bot.vault ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Vault Stats */}
                                <div className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[6px_6px_0px_0px_#F492B7]">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-2xl font-black text-black lowercase">vault stats</h3>
                                        <div className={`px-3 py-1 rounded-full text-xs font-black uppercase border-2 ${bot.vault.isPaused
                                                ? 'bg-red-100 text-red-600 border-red-300'
                                                : 'bg-green-100 text-green-700 border-green-300'
                                            }`}>
                                            {bot.vault.isPaused ? '🔴 Circuit Breaker' : '🟢 Active'}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-3 border-b-2 border-gray-100">
                                            <span className="font-bold text-gray-500 text-sm uppercase">Total AUM</span>
                                            <span className="font-black text-2xl text-purple-700">${formatNumber(bot.vault.totalAum)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b-2 border-gray-100">
                                            <span className="font-bold text-gray-500 text-sm uppercase">High Water Mark</span>
                                            <span className="font-black text-xl text-black">${formatNumber(bot.vault.hwm)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b-2 border-gray-100">
                                            <span className="font-bold text-gray-500 text-sm uppercase">Depositors</span>
                                            <span className="font-black text-xl text-black">{bot.vault.numDepositors}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3">
                                            <span className="font-bold text-gray-500 text-sm uppercase">Performance Fee</span>
                                            <span className="font-black text-xl text-[#F492B7]">{bot.vault.performanceFee}%</span>
                                        </div>
                                    </div>

                                    {/* Profit Split */}
                                    <div className="mt-6 bg-gray-50 border-2 border-black rounded-xl p-4">
                                        <div className="text-[10px] font-black uppercase text-gray-400 mb-3">Profit Distribution</div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-[#10B981] rounded-lg p-2 text-center border border-black">
                                                <div className="text-white font-black text-lg">70%</div>
                                                <div className="text-green-900 text-[9px] font-black uppercase">Depositors</div>
                                            </div>
                                            <div className="flex-1 bg-blue-500 rounded-lg p-2 text-center border border-black">
                                                <div className="text-white font-black text-lg">20%</div>
                                                <div className="text-blue-100 text-[9px] font-black uppercase">Bot Owner</div>
                                            </div>
                                            <div className="flex-1 bg-[#F492B7] rounded-lg p-2 text-center border border-black">
                                                <div className="text-black font-black text-lg">10%</div>
                                                <div className="text-black/60 text-[9px] font-black uppercase">Insurance</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Deposit / Withdraw */}
                                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-4 border-white/20 rounded-[2rem] p-6 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-white lowercase mb-2">invest in {bot.name}</h3>
                                        <p className="text-gray-400 text-sm mb-6">Deposit SOL to earn from this bot&apos;s autonomous trading strategy. 70% of profits go to depositors.</p>

                                        {/* AUM Bar */}
                                        <div className="mb-6">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-black text-gray-400 uppercase">Vault Capacity</span>
                                                <span className="text-xs font-black text-white">
                                                    ${formatNumber(bot.vault.totalAum)} / ${formatNumber(bot.tier === 'Elite' ? 10000000000 : 100000000)}
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/20">
                                                <div className="h-full bg-gradient-to-r from-[#F492B7] to-purple-500 rounded-full" style={{ width: '35%' }} />
                                            </div>
                                        </div>

                                        {/* Circuit Breaker Info */}
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                                            <div className="text-[10px] font-black uppercase text-[#F492B7] mb-2">⚡ Circuit Breakers</div>
                                            <div className="flex gap-4 text-xs text-gray-400">
                                                <div><span className="font-black text-yellow-400">-20%</span> → Auto-pause</div>
                                                <div><span className="font-black text-red-400">-30%</span> → Liquidation</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <button className="flex-1 bg-[#10B981] text-white font-black text-sm px-6 py-3 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 transition-all">
                                            Deposit SOL
                                        </button>
                                        <button className="flex-1 bg-white/10 text-white font-black text-sm px-6 py-3 rounded-full border-2 border-white/30 hover:bg-white/20 transition-all">
                                            Withdraw
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border-4 border-black rounded-[2rem] py-16 text-center">
                                <div className="text-4xl mb-3">🏦</div>
                                <div className="font-black text-black text-xl mb-1">no vault available</div>
                                <div className="text-gray-400 text-sm">this bot hasn&apos;t opened a vault · Verified tier required</div>
                            </div>
                        )}
                    </motion.div>
                )}

            </div>
        </main>
    );
}
