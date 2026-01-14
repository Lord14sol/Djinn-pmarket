'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Wallet, TrendingUp, Gift } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import * as supabaseDb from '@/lib/supabase-db';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { PublicKey } from '@solana/web3.js';

interface Position {
    id: string;
    market_slug: string;
    market_title: string;
    side: 'YES' | 'NO';
    amount: number;
    sol_amount: number;
    shares: number;
    entry_price: number;
    currentPrice?: number;
    payout?: number;
    resolved?: boolean;
    won?: boolean;
}

interface ActivePositionsWidgetProps {
    walletAddress: string | null;
    currentSlug?: string;
    onSell?: (position: Position) => void;
    onCollect?: (position: Position) => void;
}

export default function ActivePositionsWidget({
    walletAddress,
    currentSlug,
    onSell,
    onCollect
}: ActivePositionsWidgetProps) {
    const [positions, setPositions] = useState<Position[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refundingId, setRefundingId] = useState<string | null>(null);

    // --- PROTOCOL HOOK ---
    const { sellShares } = useDjinnProtocol();

    const handleRefund = async (position: Position) => {
        if (!walletAddress) return;

        if (!confirm(`Sell your ${position.side} position on "${position.market_title}"? This will return SOL to your wallet based on the current curve price.`)) {
            return;
        }

        setRefundingId(position.id);

        try {
            // 1. Fetch Market Details for Keys (PDA, Mints)
            const marketData: any = await supabaseDb.getMarket(position.market_slug);

            if (!marketData || !marketData.market_pda) {
                console.error("Market data missing keys", marketData);
                alert("Cannot sell: Market contract data not found (PDA missing).");
                return;
            }

            console.log("Selling on market:", marketData);

            // 2. Call On-Chain Sell
            const tx = await sellShares(
                new PublicKey(marketData.market_pda),
                position.side.toLowerCase() as 'yes' | 'no',
                position.shares,
                new PublicKey(marketData.yes_token_mint || "So11111111111111111111111111111111111111112"),
                new PublicKey(marketData.no_token_mint || "So11111111111111111111111111111111111111112"),
                0 // minSolOut
            );

            console.log("✅ On-Chain Sell Success:", tx);

            // 3. Update Supabase
            // A. Cancel/Update Bet
            await supabaseDb.cancelBet(walletAddress, position.market_slug);

            // B. Log Activity
            const profile = await supabaseDb.getProfile(walletAddress);
            await supabaseDb.createActivity({
                wallet_address: walletAddress,
                username: profile?.username || walletAddress.slice(0, 6),
                avatar_url: profile?.avatar_url || null,
                action: 'SELL' as any,
                amount: position.amount,
                sol_amount: position.sol_amount,
                shares: position.shares,
                market_title: position.market_title,
                market_slug: position.market_slug
            });

            // Remove from local state
            setPositions(prev => prev.filter(p => p.id !== position.id));
            window.dispatchEvent(new Event('bet-updated'));

            alert(`✅ Sold! Shares burned and SOL returned to wallet.`);

        } catch (error: any) {
            console.error('Refund error:', error);
            alert(`Error processing sell: ${error.message || error}`);
        } finally {
            setRefundingId(null);
        }
    };

    useEffect(() => {
        if (!walletAddress) {
            setPositions([]);
            setLoading(false);
            return;
        }

        const loadPositions = async () => {
            try {
                // Get user's bets
                const bets = await supabaseDb.getUserBets(walletAddress);

                // Filter unclaimed bets and map to Position format
                const activePositions: Position[] = bets
                    .filter(bet => !bet.claimed)
                    .map(bet => ({
                        id: bet.id || '',
                        market_slug: bet.market_slug,
                        market_title: bet.market_slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        side: bet.side,
                        amount: bet.amount,
                        sol_amount: bet.sol_amount,
                        shares: bet.shares,
                        entry_price: bet.entry_price,
                        payout: bet.payout,
                        resolved: bet.payout !== undefined && bet.payout !== null,
                        won: bet.payout !== undefined && bet.payout > 0
                    }));

                setPositions(activePositions);
            } catch (error) {
                console.error('Error loading positions:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPositions();

        // Listen for bet updates to sync with profile
        const handleBetUpdate = () => {
            setLoading(true);
            loadPositions();
        };

        window.addEventListener('bet-updated', handleBetUpdate);
        window.addEventListener('storage', handleBetUpdate);

        return () => {
            window.removeEventListener('bet-updated', handleBetUpdate);
            window.removeEventListener('storage', handleBetUpdate);
        };
    }, [walletAddress]);

    if (!walletAddress || positions.length === 0) return null;

    // Filter to show current market positions first, then others
    const currentMarketPositions = positions.filter(p => p.market_slug === currentSlug);
    const otherPositions = positions.filter(p => p.market_slug !== currentSlug);
    const sortedPositions = [...currentMarketPositions, ...otherPositions];

    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-6 right-6 z-40 bg-[#F492B7] text-black font-black px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
                <Wallet size={18} />
                <span className="text-sm">{positions.length} Position{positions.length > 1 ? 's' : ''}</span>
                <ChevronUp size={16} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-40 w-80 bg-[#0E0E0E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/50">
                <div className="flex items-center gap-2">
                    <Image src="/star.png" alt="Djinn" width={16} height={16} />
                    <span className="text-white font-bold text-sm">Your Positions</span>
                    <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{positions.length}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Positions List */}
            {isExpanded && (
                <div className="max-h-64 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-600 text-sm">Loading...</div>
                    ) : (
                        sortedPositions.slice(0, 5).map((position) => (
                            <div
                                key={position.id}
                                className={`p-4 border-b border-white/5 last:border-0 ${position.market_slug === currentSlug ? 'bg-white/5' : ''}`}
                            >
                                {/* Position Header */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/market/${position.market_slug}`}
                                            className="text-white font-bold text-xs hover:text-[#F492B7] transition-colors line-clamp-2"
                                        >
                                            {position.market_title}
                                        </Link>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ml-2 flex-shrink-0 ${position.side === 'YES' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/20 text-red-500'
                                        }`}>
                                        {position.side}
                                    </span>
                                </div>

                                {/* Position Details */}
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Invested</p>
                                        <p className="text-white font-bold text-sm">${position.amount.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">SOL</p>
                                        <p className="text-[#F492B7] font-bold text-sm">{position.sol_amount.toFixed(4)}</p>
                                    </div>
                                </div>

                                {/* Action Button */}
                                {position.resolved && position.won ? (
                                    <button
                                        onClick={() => onCollect?.(position)}
                                        className="w-full py-2 rounded-xl bg-gradient-to-r from-[#F492B7] to-[#E056A0] text-black font-black text-xs uppercase flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                    >
                                        <Gift size={14} />
                                        Collect ${position.payout?.toFixed(2)}
                                    </button>
                                ) : position.resolved && !position.won ? (
                                    <div className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-xs text-center">
                                        Market Lost
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleRefund(position)}
                                        disabled={refundingId === position.id}
                                        className={`w-full py-2 rounded-xl border font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors ${refundingId === position.id ? 'border-gray-700 text-gray-600 cursor-wait' : 'border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300'}`}
                                    >
                                        {refundingId === position.id ? 'Processing...' : 'Sell Shares'}
                                    </button>
                                )}
                            </div>
                        ))
                    )}

                    {positions.length > 5 && (
                        <Link
                            href="/profile"
                            className="block p-3 text-center text-[#F492B7] font-bold text-xs hover:bg-white/5 transition-colors"
                        >
                            View All {positions.length} Positions →
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
