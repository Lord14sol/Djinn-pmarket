"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { formatCompact } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

// Dynamic Import for Probability Chart
const ProbabilityChart = dynamic(() => import("./ProbabilityChart"), {
    loading: () => <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">Loading Chart...</div>,
    ssr: false
});

// --- TYPES & CONSTANTS ---
export type TradeEvent = { id: string; outcome: string; amount: number; color: string };

type Bubble = {
    id: string;
    text: string;
    color: string;
    y: number;
};

interface OutcomeObject {
    id: string;
    title: string;
    [key: string]: any;
}

// --- MAIN COMPONENT ---

interface TheDjinnChartProps {
    outcomes?: (string | OutcomeObject)[];
    probabilityData?: any[];
    tradeEvent?: TradeEvent | null;
    outcomeSupplies?: Record<string, number>;
}

function TheDjinnChart({
    outcomes = ["YES", "NO"],
    probabilityData = [],
    tradeEvent,
    outcomeSupplies = {},
}: TheDjinnChartProps) {
    const [timeframe, setTimeframe] = useState<'5M' | '15M' | '30M' | '1H' | '6H' | '12H' | '1D' | '3D' | '1W' | '1M' | 'ALL'>('1D');

    // Bubble State
    const [bubbles, setBubbles] = useState<Bubble[]>([]);

    // 1. Trade Event Effect (Bubbles)
    useEffect(() => {
        if (tradeEvent) {
            const newBubble: Bubble = {
                id: Date.now().toString() + Math.random(),
                text: `${tradeEvent.outcome} +${formatCompact(tradeEvent.amount)}`,
                color: tradeEvent.color,
                y: Math.random() * 60 + 20 // 20% to 80% height
            };
            setBubbles(prev => [...prev, newBubble]);
            setTimeout(() => {
                setBubbles(prev => prev.filter(b => b.id !== newBubble.id));
            }, 3500);
        }
    }, [tradeEvent]);

    // 2. Derived Data: Probability Line
    const safeProbData = useMemo(() => {
        let baseData = probabilityData.length > 0 ? [...probabilityData] : [];
        if (baseData.length === 1) {
            baseData = [{ ...baseData[0], dateStr: 'Start', time: baseData[0].time - 3600 }, baseData[0]];
        }
        if (baseData.length === 0) {
            const now = Math.floor(Date.now() / 1000);
            baseData = [{ time: now - 3600 }, { time: now }];
        }
        return baseData;
    }, [probabilityData]);

    // 3. Derived Data: Current Probabilities
    const currentProbabilities = useMemo(() => {
        const probs: Record<string, number> = {};
        const VIRTUAL_FLOOR = 1_000_000;

        if (!outcomeSupplies || Object.keys(outcomeSupplies).length === 0) {
            outcomes.forEach(o => {
                const title = typeof o === 'string' ? o : o.title;
                probs[title] = 100 / outcomes.length;
            });
            return probs;
        }

        // Case-insensitive normalization map
        const suppliesMapNormalized: Record<string, number> = {};
        Object.keys(outcomeSupplies).forEach(k => {
            suppliesMapNormalized[k.toLowerCase()] = outcomeSupplies[k];
        });

        const totalRawShares = Object.values(outcomeSupplies).reduce((sum, val) => sum + Number(val || 0), 0);

        let totalAdjusted = 0;
        const adjustedSupplies: Record<string, number> = {};

        outcomes.forEach(o => {
            const title = typeof o === 'string' ? o : o.title;
            const raw = Number(outcomeSupplies[title] || suppliesMapNormalized[title.toLowerCase()] || 0);
            const adj = raw + VIRTUAL_FLOOR;
            adjustedSupplies[title] = adj;
            totalAdjusted += adj;
        });

        outcomes.forEach(o => {
            const title = typeof o === 'string' ? o : o.title;
            const probability = (adjustedSupplies[title] / totalAdjusted) * 100;
            probs[title] = probability;
        });

        return probs;
    }, [outcomeSupplies, outcomes]);

    // ROI Calculation logic will move to inside ProbabilityChart or remain here to pass down
    // For now, passing necessary data to ProbabilityChart

    return (
        <div className="w-full max-w-4xl mx-auto bg-black rounded-xl border border-zinc-800 shadow-2xl overflow-hidden relative font-sans h-[450px]">
            {/* CHART AREA */}
            <div className="w-full h-full bg-[#09090b]">
                <ProbabilityChart
                    data={safeProbData}
                    outcomes={outcomes}
                    bubbles={bubbles}
                    timeframe={timeframe}
                    setTimeframe={setTimeframe}
                    currentProbabilities={currentProbabilities}
                />
            </div>
        </div>
    );
}

export default React.memo(TheDjinnChart);

