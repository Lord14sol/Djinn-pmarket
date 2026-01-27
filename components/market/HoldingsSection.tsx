
"use client";

import React, { useMemo } from 'react';
import { formatCompact } from '@/lib/utils';
import { getSpotPrice } from '@/lib/core-amm';
import { Bet } from '@/lib/supabase-db';
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HoldingsSectionProps {
    bets: Bet[];
    yesSupply: number;
    noSupply: number;
    marketOutcomes?: any[];
}

export default function HoldingsSection({ bets, yesSupply, noSupply, marketOutcomes }: HoldingsSectionProps) {

    // Group bets by Outcome (YES/NO or Multi)
    const holdings = useMemo(() => {
        if (!bets || bets.length === 0) return [];

        const groups: Record<string, { side: string, shares: number, invested: number, entryPrice: number }> = {};

        bets.forEach(bet => {
            const key = bet.side;
            if (!groups[key]) {
                groups[key] = { side: key, shares: 0, invested: 0, entryPrice: 0 };
            }
            groups[key].shares += Number(bet.shares);
            groups[key].invested += Number(bet.sol_amount);
        });

        // Calculate AVG Entry
        Object.keys(groups).forEach(k => {
            const g = groups[k];
            g.entryPrice = g.shares > 0 ? (g.invested / g.shares) : 0;
            // Remove empty positions (e.g. after selling all)
            // Note: Floating point errors might leave 0.000001 shares, ideally we'd filter strictly
        });

        // Filter out effectively zero positions
        return Object.values(groups).filter(g => g.shares > 0.001);
    }, [bets]);

    if (holdings.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 relative group"
        >
            {/* Glassmorphic Container */}
            <div className="absolute inset-0 bg-[#0E0E0E]/80 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl z-0" />

            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/5 blur-[80px] rounded-full pointer-events-none z-0 transition-opacity duration-1000 group-hover:opacity-50" />

            <div className="relative z-10 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10B981]/20 to-transparent border border-[#10B981]/30 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-[#10B981]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Your Positions</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">Live Performance</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4">
                    <AnimatePresence>
                        {holdings.map((h, idx) => {
                            // Pricing Logic
                            let currentSpot = 0;
                            if (h.side === 'YES') currentSpot = getSpotPrice(yesSupply);
                            else currentSpot = getSpotPrice(noSupply);

                            // Value
                            const currentValue = h.shares * currentSpot;
                            const profitSol = currentValue - h.invested;
                            const roiPercent = h.invested > 0 ? ((profitSol / h.invested) * 100) : 0;

                            const isProfit = profitSol >= 0;
                            const colorClass = isProfit ? 'text-[#10B981]' : 'text-[#EF4444]';
                            const bgBase = isProfit ? 'bg-[#10B981]' : 'bg-[#EF4444]';
                            const borderClass = isProfit ? 'border-[#10B981]/20' : 'border-[#EF4444]/20';

                            // Formatting
                            const outcomeName = marketOutcomes ?
                                (h.side === 'YES' ? (marketOutcomes[0]?.title || 'YES') : (marketOutcomes[1]?.title || 'NO'))
                                : h.side;

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`relative overflow-hidden p-[1px] rounded-2xl bg-gradient-to-r from-white/10 to-transparent ${borderClass}`}
                                >
                                    <div className={`relative bg-[#0A0A0A] rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-6`}>

                                        {/* LEFT: Position Info */}
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-lg ${bgBase} ${isProfit ? 'text-black' : 'text-white'}`}>
                                                {h.side.substring(0, 1)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-bold text-white uppercase tracking-wider">{outcomeName}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-mono">LONG</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 font-mono flex items-center gap-2">
                                                    <span>{formatCompact(h.shares)} Shares</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                    <span>Avg: {h.entryPrice.toFixed(5)} SOL</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT: Stats */}
                                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">

                                            {/* PnL Badge */}
                                            <div className={`flex flex-col items-end`}>
                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold shadow-inner ${isProfit ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]' : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'}`}>
                                                    {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                    <span>{roiPercent > 0 ? '+' : ''}{roiPercent.toFixed(2)}%</span>
                                                </div>
                                                <span className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wider opacity-60">ROI</span>
                                            </div>

                                            <div className="w-[1px] h-10 bg-white/10 mx-2 hidden md:block" />

                                            {/* Value */}
                                            <div className="text-right">
                                                <div className={`text-xl font-black font-mono tracking-tight ${colorClass}`}>
                                                    {profitSol > 0 ? '+' : ''}{profitSol.toFixed(4)} <span className="text-xs opacity-50">SOL</span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center justify-end gap-1">
                                                    Total Value: <span className="text-gray-300">{currentValue.toFixed(4)}</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
