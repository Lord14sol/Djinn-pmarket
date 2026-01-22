'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as supabaseDb from '@/lib/supabase-db';

export default function MyBetsPage() {
    const router = useRouter();
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    const [activeBets, setActiveBets] = useState<any[]>([]);
    const [closedBets, setClosedBets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<'active' | 'closed'>('active');

    useEffect(() => {
        if (!publicKey) {
            setIsLoading(false);
            return;
        }
        loadBets(publicKey.toBase58());
    }, [publicKey]);

    const loadBets = async (walletAddress: string) => {
        setIsLoading(true);
        try {
            const bets = await supabaseDb.getUserBets(walletAddress);

            // Process bets
            const processedBets = await Promise.all(bets.map(async (bet: any) => {
                const marketData = await supabaseDb.getMarketData(bet.market_slug);
                const currentPrice = marketData?.live_price || bet.entry_price || 50;

                // Logic based on YES/NO side
                const purchasePrice = bet.side === 'YES' ? currentPrice : (100 - currentPrice);
                const invested = bet.amount || 0;
                const shares = bet.shares || 0;

                const currentValue = shares * (purchasePrice / 100);
                const profit = currentValue - invested;
                const change = invested > 0 ? ((profit / invested) * 100).toFixed(1) : '0.0';

                return {
                    id: bet.id || bet.market_slug,
                    title: bet.market_slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                    invested,
                    current: currentValue,
                    side: bet.side,
                    change: `${profit >= 0 ? '+' : ''}${change}%`,
                    profit,
                    market_slug: bet.market_slug,
                    claimed: bet.claimed
                };
            }));

            setActiveBets(processedBets.filter(b => !b.claimed));
            setClosedBets(processedBets.filter(b => b.claimed));

        } catch (error) {
            console.error('Error loading bets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCashOut = (betId: string) => {
        // Placeholder for cash out logic if we want to implement it here directly
        // For now, redirect to market page to sell
        const bet = activeBets.find(b => b.id === betId);
        if (bet) {
            router.push(`/market/${bet.market_slug}`);
        }
    };

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center pt-32">
                <div className="text-center">
                    <h1 className="text-3xl font-black mb-4">Connect Wallet</h1>
                    <p className="text-gray-500">Please connect your wallet to view your bets</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white font-sans pb-40 selection:bg-[#F492B7] pt-32 px-6 md:px-14">
            <div className="max-w-[1200px] mx-auto">
                <header className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">My Bets</h1>
                        <p className="text-gray-500">Track your active positions and performance</p>
                    </div>
                    {/* Tabs */}
                    <div className="flex bg-white/5 rounded-xl p-1">
                        <button
                            onClick={() => setTab('active')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'active' ? 'bg-[#F492B7] text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setTab('closed')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'closed' ? 'bg-[#F492B7] text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            History
                        </button>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F492B7]"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(tab === 'active' ? activeBets : closedBets).length > 0 ? (
                            (tab === 'active' ? activeBets : closedBets).map((bet: any) => (
                                <BetCard key={bet.id} bet={bet} onCashOut={handleCashOut} router={router} />
                            ))
                        ) : (
                            <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[3.5rem] bg-white/[0.01]">
                                <p className="text-gray-600 font-black uppercase tracking-[0.4em] italic opacity-40 text-xl">
                                    No {tab} bets found
                                </p>
                                <button
                                    onClick={() => router.push('/')}
                                    className="mt-6 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold transition-all"
                                >
                                    Explore Markets
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

function BetCard({ bet, onCashOut, router }: any) {
    const [showShareModal, setShowShareModal] = useState(false);
    const isPositive = bet.profit >= 0;

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowShareModal(true);
    };

    return (
        <>
            <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-[2rem] p-6 hover:border-[#F492B7]/30 transition-all group relative overflow-hidden">
                {/* Background glow based on profit */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${isPositive ? 'bg-[#10B981]/10' : 'bg-red-500/10'} rounded-full blur-2xl pointer-events-none`}></div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <span className={`text-[11px] font-black px-4 py-2 rounded-lg ${bet.side === 'YES' ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>{bet.side}</span>
                        <button
                            onClick={handleShare}
                            className="text-gray-500 hover:text-[#F492B7] transition-colors text-xs font-bold flex items-center gap-1"
                        >
                            📤 Share
                        </button>
                    </div>

                    {/* Title */}
                    <h4 onClick={() => router.push(`/market/${bet.market_slug}`)} className="text-lg font-bold text-white mb-6 leading-tight hover:text-[#F492B7] cursor-pointer line-clamp-2">{bet.title}</h4>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Invested</p>
                            <p className="text-white text-xl font-black">${Math.round(bet.invested)}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Value</p>
                            <p className="text-white text-xl font-black">${Math.round(bet.current)}</p>
                        </div>
                    </div>

                    {/* Profit */}
                    <div className={`rounded-xl p-4 mb-4 ${isPositive ? 'bg-[#10B981]/10 border border-[#10B981]/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`text-3xl ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>{isPositive ? '↗' : '↘'}</span>
                                <span className={`text-2xl font-black ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>{isPositive ? '+' : ''}${Math.round(bet.profit)}</span>
                            </div>
                            <span className={`text-xl font-black ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>{bet.change}</span>
                        </div>
                    </div>

                    {/* Sell Shares button */}
                    <button onClick={() => onCashOut(bet.id)} className="w-full bg-gradient-to-r from-[#F492B7] to-[#E056A0] text-black py-4 rounded-xl text-sm font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(244,146,183,0.2)]">
                        Manage Position
                    </button>
                </div>
            </div>

            {/* SHARE MODAL */}
            {showShareModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl" onClick={() => setShowShareModal(false)}>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <div className="w-[400px] bg-gradient-to-br from-[#0D0D0D] to-black border border-white/20 rounded-3xl p-8 relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-40 h-40 ${isPositive ? 'bg-[#10B981]/20' : 'bg-red-500/20'} rounded-full blur-3xl pointer-events-none`}></div>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-xl font-bold text-white">Djinn</span>
                            </div>
                            <div className="relative z-10">
                                <span className={`text-xs font-black px-3 py-1.5 rounded-lg ${bet.side === 'YES' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/20 text-red-500'}`}>
                                    {bet.side}
                                </span>
                                <h3 className="text-xl font-bold text-white mt-4 mb-6 leading-tight">{bet.title}</h3>
                                <div className={`text-center py-6 rounded-2xl ${isPositive ? 'bg-[#10B981]/10' : 'bg-red-500/10'}`}>
                                    <p className={`text-5xl font-[900] ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>
                                        {isPositive ? '+' : ''}{bet.change}
                                    </p>
                                    <p className="text-gray-500 text-xs mt-2 uppercase">Profit/Loss</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
