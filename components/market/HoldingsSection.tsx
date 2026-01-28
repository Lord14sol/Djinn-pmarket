
"use client";

import React, { useMemo } from 'react';
import { formatCompact } from '@/lib/utils';
import { getSpotPrice } from '@/lib/core-amm';
import { getOutcomeColor } from '@/lib/market-colors';
import { Bet } from '@/lib/supabase-db';
import { TrendingUp, TrendingDown, Wallet, ArrowRight, Rocket } from 'lucide-react';
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
            {/* Glassmorphic Container - Removed dark bg to be fully transparent interactions */}
            {/* <div className="absolute inset-0 bg-[#0E0E0E]/80 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl z-0" /> */}
            <div className="absolute inset-0 bg-transparent z-0" />

            {/* Ambient Glow - Reduced */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/5 blur-[80px] rounded-full pointer-events-none z-0 transition-opacity duration-1000 group-hover:opacity-50" />

            <div className="relative z-10 p-6 md:p-8">
                {/* Header Removed */}

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
                            // For ROI coloring, we use standard green/red, or maybe match neon theme?
                            // User asked for "same color as lines" for the BIG letters (Outcome).
                            // ROI/Profit colors: Standard financial green/red is best for clarity, or custom neon green/red.
                            const roiColor = isProfit ? 'text-[#00FF94]' : 'text-[#FF3B30]';

                            // Formatting
                            const outcomeName = marketOutcomes ?
                                (h.side === 'YES' ? (marketOutcomes[0]?.title || 'YES') : (marketOutcomes[1]?.title || 'NO'))
                                : h.side;

                            // Get dynamic color for the BIG Outcome Text
                            const outcomeColor = getOutcomeColor(outcomeName);

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 30, rotateX: 10 }}
                                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.15, type: "spring", bounce: 0.4 }}
                                    className="relative group perspective-1000 mb-6"
                                >
                                    {/* NEON BORDER WRAPPER - REMOVED per user request for "transparent black" */}
                                    {/* <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/50 via-purple-500/50 to-orange-500/50 rounded-[2rem] opacity-50 blur-[2px] group-hover:opacity-100 transition duration-500" /> */}

                                    {/* GLASS CARD CONTAINER - Transparent Black */}
                                    <div className="relative bg-black/20 backdrop-blur-md rounded-[1.8rem] px-6 py-4 flex flex-row items-center justify-between gap-4 overflow-hidden border border-white/5 shadow-xl hover:bg-black/30 transition-colors">

                                        {/* LEFT: MASSIVE TYPOGRAPHY (Outcome & Shares) - Slightly smaller */}
                                        <div className="flex flex-col items-start z-10">
                                            {/* HUGE OUTCOME TEXT (Neon Colored) */}
                                            <h2
                                                className="text-4xl sm:text-5xl font-black tracking-tighter leading-none filter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                                style={{
                                                    color: outcomeColor,
                                                    textShadow: `0 0 20px ${outcomeColor}30`
                                                }}
                                            >
                                                {outcomeName}
                                            </h2>

                                            {/* HUGE SHARES TEXT (White) */}
                                            <div className="text-xl sm:text-2xl font-bold text-white tracking-widest mt-1 drop-shadow-md flex items-baseline gap-2">
                                                {formatCompact(h.shares)} <span className="opacity-50 text-xs font-medium">SHARES</span>
                                            </div>
                                        </div>

                                        {/* RIGHT: ROI & PROFIT (Rocket Style) */}
                                        <div className="flex flex-col items-end z-10">
                                            {/* ROI + ROCKET ROW - No Animation */}
                                            <div className={`flex items-center gap-2 text-2xl sm:text-3xl font-black italic tracking-tighter ${roiColor} drop-shadow-md`}>
                                                <Rocket className="w-5 h-5 sm:w-6 sm:h-6" />
                                                <span>{roiPercent > 0 ? '+' : ''}{roiPercent.toFixed(0)}%</span>
                                            </div>

                                            {/* PROFIT/LOSS SOL */}
                                            <div className="text-sm sm:text-base text-zinc-200 font-mono font-medium mt-0.5 tracking-tight">
                                                {profitSol > 0 ? '+' : ''}{profitSol.toFixed(3)} SOL
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
