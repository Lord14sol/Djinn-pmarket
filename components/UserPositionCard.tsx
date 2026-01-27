'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatCompact } from '@/lib/utils';
import { getSpotPrice } from '@/lib/core-amm';

interface UserPosition {
    side: 'YES' | 'NO';
    shares: number;
    entryPrice: number;
    invested: number;
    withdrawn: number;
}

interface UserPositionCardProps {
    yesSupply: number;
    noSupply: number;
    userPositions: {
        yes?: UserPosition;
        no?: UserPosition;
    };
}

export default function UserPositionCard({
    yesSupply,
    noSupply,
    userPositions
}: UserPositionCardProps) {
    const { publicKey } = useWallet();
    const [isExpanded, setIsExpanded] = useState(true);

    if (!publicKey || (!userPositions.yes && !userPositions.no)) {
        return null;
    }

    // Calculate current prices
    const yesCurrentPrice = getSpotPrice(yesSupply);
    const noCurrentPrice = getSpotPrice(noSupply);

    // Calculate totals
    let totalInvested = 0;
    let totalWithdrawn = 0;
    let totalCurrentValue = 0;

    const positions: Array<UserPosition & { side: 'YES' | 'NO'; currentPrice: number; currentValue: number; pnl: number; roi: number }> = [];

    if (userPositions.yes && userPositions.yes.shares > 0) {
        const pos = userPositions.yes;
        const currentValue = pos.shares * yesCurrentPrice;
        const pnl = currentValue - pos.invested + pos.withdrawn;
        const roi = pos.invested > 0 ? (pnl / pos.invested) * 100 : 0;

        totalInvested += pos.invested;
        totalWithdrawn += pos.withdrawn;
        totalCurrentValue += currentValue;

        positions.push({
            ...pos,
            side: 'YES',
            currentPrice: yesCurrentPrice,
            currentValue,
            pnl,
            roi
        });
    }

    if (userPositions.no && userPositions.no.shares > 0) {
        const pos = userPositions.no;
        const currentValue = pos.shares * noCurrentPrice;
        const pnl = currentValue - pos.invested + pos.withdrawn;
        const roi = pos.invested > 0 ? (pnl / pos.invested) * 100 : 0;

        totalInvested += pos.invested;
        totalWithdrawn += pos.withdrawn;
        totalCurrentValue += currentValue;

        positions.push({
            ...pos,
            side: 'NO',
            currentPrice: noCurrentPrice,
            currentValue,
            pnl,
            roi
        });
    }

    const totalPnL = totalCurrentValue - totalInvested + totalWithdrawn;
    const totalROI = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Emoji logic
    const getEmoji = (pnl: number) => {
        if (pnl > 0) return '🚀';
        if (pnl < -0.01) return '📉';
        return '➖';
    };

    const totalEmoji = getEmoji(totalPnL);

    return (
        <div className="w-full bg-gradient-to-br from-[#0B0E14] to-[#1a1d24] border border-[#F492B7]/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(244,146,183,0.15)]">
            {/* Header */}
            <div
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{totalEmoji}</span>
                        <div>
                            <h3 className="text-white font-bold text-lg">Your Position</h3>
                            <p className="text-gray-400 text-xs">
                                {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                            </p>
                        </div>
                    </div>

                    {/* Total P&L Display */}
                    <div className="text-right">
                        <div className={`text-2xl font-black ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(4)} SOL
                        </div>
                        <div className={`text-sm font-bold ${totalROI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(2)}% ROI
                        </div>
                    </div>

                    {/* Expand/Collapse Icon */}
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-white/10">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-white/5">
                        <div>
                            <div className="text-xs text-gray-400 mb-1">Invested</div>
                            <div className="text-white font-bold">{totalInvested.toFixed(4)} SOL</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 mb-1">Current Value</div>
                            <div className="text-white font-bold">{totalCurrentValue.toFixed(4)} SOL</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 mb-1">Withdrawn</div>
                            <div className="text-white font-bold">{totalWithdrawn.toFixed(4)} SOL</div>
                        </div>
                    </div>

                    {/* Individual Positions */}
                    <div className="p-4 space-y-3">
                        {positions.map((pos) => {
                            const isYes = pos.side === 'YES';
                            const bgColor = isYes ? 'bg-emerald-500/10' : 'bg-red-500/10';
                            const borderColor = isYes ? 'border-emerald-500/30' : 'border-red-500/30';
                            const textColor = isYes ? 'text-emerald-400' : 'text-red-400';
                            const pnlColor = pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400';

                            return (
                                <div
                                    key={pos.side}
                                    className={`${bgColor} border ${borderColor} rounded-xl p-4`}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{getEmoji(pos.pnl)}</span>
                                            <span className={`${textColor} font-black text-lg`}>
                                                {pos.side}
                                            </span>
                                        </div>
                                        <div className={`${pnlColor} font-black text-lg`}>
                                            {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(4)} SOL
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">Holdings</div>
                                            <div className="text-white font-mono">
                                                {formatCompact(pos.shares)} shares
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">Current Value</div>
                                            <div className="text-white font-mono">
                                                {pos.currentValue.toFixed(4)} SOL
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">Entry Price</div>
                                            <div className="text-white font-mono">
                                                {pos.entryPrice.toFixed(9)} SOL
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">Current Price</div>
                                            <div className="text-white font-mono">
                                                {pos.currentPrice.toFixed(9)} SOL
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">Invested</div>
                                            <div className="text-white font-mono">
                                                {pos.invested.toFixed(4)} SOL
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs mb-1">ROI</div>
                                            <div className={`${pnlColor} font-bold`}>
                                                {pos.roi >= 0 ? '+' : ''}{pos.roi.toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price Change Indicator */}
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400">Price Change</span>
                                            <span className={pnlColor}>
                                                {pos.currentPrice > pos.entryPrice ? '↗' : '↘'}
                                                {' '}
                                                {((pos.currentPrice / pos.entryPrice - 1) * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Performance Summary */}
                    {totalROI > 0 && (
                        <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-[#F492B7]/10 border-t border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🎉</span>
                                <div className="flex-1">
                                    <div className="text-white font-bold">You're in profit!</div>
                                    <div className="text-gray-400 text-xs">
                                        Keep holding or take partial profits
                                    </div>
                                </div>
                                <div className="text-emerald-400 font-black text-xl">
                                    {totalROI.toFixed(0)}x
                                </div>
                            </div>
                        </div>
                    )}

                    {totalROI < -10 && (
                        <div className="p-4 bg-red-500/10 border-t border-red-500/30">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">⚠️</span>
                                <div className="flex-1">
                                    <div className="text-white font-bold">Position underwater</div>
                                    <div className="text-gray-400 text-xs">
                                        Consider your exit strategy or hold for recovery
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
