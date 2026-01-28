
"use client";

import React, { useMemo } from 'react';
import { formatCompact } from '@/lib/utils';
import { getSpotPrice } from '@/lib/core-amm';
import { getOutcomeColor } from '@/lib/market-colors';
import { Bet } from '@/lib/supabase-db';
import { motion } from 'framer-motion';

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

    // Pre-calculate all holdings data
    const holdingsData = holdings.map(h => {
        let currentSpot = 0;
        if (h.side === 'YES') currentSpot = getSpotPrice(yesSupply);
        else currentSpot = getSpotPrice(noSupply);

        const currentValue = h.shares * currentSpot;
        const profitSol = currentValue - h.invested;
        const roiPercent = h.invested > 0 ? ((profitSol / h.invested) * 100) : 0;
        const isProfit = profitSol >= 0;

        const outcomeName = marketOutcomes ?
            (h.side === 'YES' ? (marketOutcomes[0]?.title || 'YES') : (marketOutcomes[1]?.title || 'NO'))
            : h.side;

        const outcomeColor = getOutcomeColor(outcomeName);

        return {
            ...h,
            currentSpot,
            currentValue,
            profitSol,
            roiPercent,
            isProfit,
            outcomeName,
            outcomeColor
        };
    });

    // Sort so YES comes first
    const sortedHoldings = [...holdingsData].sort((a, b) => {
        if (a.side === 'YES') return -1;
        if (b.side === 'YES') return 1;
        return 0;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
        >
            {/* Single row - 50/50 split with relief effect */}
            <div className="flex flex-row items-stretch bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_16px_rgba(0,0,0,0.4)] overflow-hidden">
                {sortedHoldings.map((h, idx) => (
                    <div
                        key={idx}
                        className={`flex-1 p-5 ${idx > 0 ? 'border-l border-white/10' : ''} relative group flex flex-col justify-center`}
                    >
                        {/* Relief inner glow/shadow */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

                        <div className="flex flex-row items-center justify-around w-full">
                            {/* Outcome name */}
                            <span
                                className="text-4xl font-black italic tracking-tighter"
                                style={{ color: h.outcomeColor }}
                            >
                                {h.outcomeName}
                            </span>

                            {/* Shares */}
                            <span className="text-2xl text-white font-black">
                                {formatCompact(h.shares)}
                            </span>

                            {/* ROI & Profit Block (ROI on same level, Profit below) */}
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">🚀</span>
                                    <span className={`text-xl font-black ${h.isProfit ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                        {h.roiPercent > 0 ? '+' : ''}{h.roiPercent.toFixed(1)}%
                                    </span>
                                </div>
                                {/* Profit below ROI */}
                                <div className={`text-[11px] font-black tracking-wider uppercase opacity-80 ${h.isProfit ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                    {h.profitSol >= 0 ? '+' : ''}{h.profitSol.toFixed(3)} SOL
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
