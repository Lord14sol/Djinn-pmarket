
"use client";

import React, { useMemo } from 'react';
import { formatCompact } from '@/lib/utils';
import { getSpotPrice } from '@/lib/core-amm';
import { Bet } from '@/lib/supabase-db';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface HoldingsSectionProps {
    bets: Bet[];
    currentYesPrice: number; // Probability (0-100) or Spot Price? Spot Price in SOL is better for value calc
    currentNoPrice: number;
    yesSupply: number;
    noSupply: number;
    marketOutcomes?: any[];
}

export default function HoldingsSection({ bets, currentYesPrice, currentNoPrice, yesSupply, noSupply, marketOutcomes }: HoldingsSectionProps) {

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
        });

        return Object.values(groups);
    }, [bets]);

    if (holdings.length === 0) return null;

    return (
        <div className="bg-[#0E0E0E] rounded-[2rem] border border-white/5 p-8 mb-6 relative overflow-hidden">
            {/* Background decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex items-center gap-2 mb-6">
                <Wallet className="w-5 h-5 text-[#10B981]" />
                <h3 className="text-lg font-bold text-white">Your Holdings</h3>
            </div>

            <div className="grid gap-4">
                {holdings.map((h, idx) => {
                    // Pricing Logic
                    // 1. Get Current Spot Price (SOL per Share)
                    // If we have precise supplies passing in, calculating fresh spot is best.
                    // Otherwise use the passed in "price" (assuming it's Probability) -> derive Spot?
                    // Simpler: Use getSpotPrice(supply)

                    let currentSpot = 0;
                    if (h.side === 'YES') currentSpot = getSpotPrice(yesSupply);
                    else currentSpot = getSpotPrice(noSupply);

                    // Value
                    const currentValue = h.shares * currentSpot;
                    const profitSol = currentValue - h.invested;
                    const roiPercent = h.invested > 0 ? ((profitSol / h.invested) * 100) : 0;

                    const isProfit = profitSol >= 0;
                    const colorClass = isProfit ? 'text-[#10B981]' : 'text-[#EF4444]';
                    const bgClass = isProfit ? 'bg-[#10B981]/10 border-[#10B981]/20' : 'bg-[#EF4444]/10 border-[#EF4444]/20';

                    // Formatting
                    const outcomeName = marketOutcomes ?
                        (h.side === 'YES' ? (marketOutcomes[0]?.title || 'YES') : (marketOutcomes[1]?.title || 'NO'))
                        : h.side;

                    return (
                        <div key={idx} className={`p-4 rounded-xl border ${bgClass} flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:bg-opacity-80`}>

                            {/* LEFT: Position Info */}
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${isProfit ? 'bg-[#10B981] text-black' : 'bg-[#EF4444] text-white'}`}>
                                    {h.side.substring(0, 1)}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white uppercase tracking-wider">{outcomeName}</div>
                                    <div className="text-xs text-gray-400 font-mono">
                                        {formatCompact(h.shares)} Shares
                                    </div>
                                </div>
                            </div>

                            {/* CENTER: ROI Badge */}
                            <div className="flex flex-col items-center">
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${colorClass} ${bgClass} backdrop-blur-md`}>
                                    {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    <span>{roiPercent > 0 ? '+' : ''}{roiPercent.toFixed(2)}% ROI</span>
                                </div>
                            </div>

                            {/* RIGHT: Profit/Value */}
                            <div className="text-right w-full md:w-auto">
                                <div className={`text-lg font-black font-mono ${colorClass}`}>
                                    {profitSol > 0 ? '+' : ''}{profitSol.toFixed(4)} SOL
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                                    Value: {currentValue.toFixed(4)} SOL
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}
