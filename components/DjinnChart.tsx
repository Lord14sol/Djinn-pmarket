"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { cn, formatCompact } from "@/lib/utils";
import { TrendingUp, Activity, MousePointer2, Move, Type, Hash, Plus, Minus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Dynamic Imports for Heavy Chart Components (Rule 2.4)
const ProbabilityChart = dynamic(() => import("./ProbabilityChart"), {
    loading: () => <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">Loading Chart...</div>,
    ssr: false
});

const CandleChart = dynamic(() => import("./CandleChart"), {
    loading: () => <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">Loading Candles...</div>,
    ssr: false
});

// --- TYPES & CONSTANTS ---
type MarketMode = "PROBABILITY" | "DJINN";
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

const COLORS: Record<string, string> = {
    CHILE: "#EF4444",
    PERU: "#10B981",
    Brazil: "#FCD116",
    Argentina: "#75AADB",
    France: "#002395",
    Yes: "#F492B7",
    No: "#10B981",
    YES: "#F492B7",
    NO: "#10B981",
};

const getColor = (title: string) => {
    const t = String(title).toUpperCase();
    return COLORS[t] || COLORS[title] || (t === 'YES' ? COLORS.YES : COLORS.NO) || "#fff";
};

// --- SUB-COMPONENTS ---

// 1. ToolBar (Left Side)
// 1. ToolBar (Left Side)
const TradingToolbar = ({ activeTool, onToolChange }: { activeTool: string, onToolChange: (t: string) => void }) => (
    <div className="flex flex-col items-center gap-4 py-4 px-2 border-r border-zinc-800 bg-zinc-950/50 w-12 text-zinc-500 z-20">
        <div
            onClick={() => onToolChange('cursor')}
            className={cn("p-2 rounded cursor-pointer transition-all", activeTool === 'cursor' ? "bg-zinc-800 text-blue-400" : "hover:bg-zinc-900")}
        >
            <MousePointer2 size={16} />
        </div>
        <div
            onClick={() => onToolChange('crosshair')}
            className={cn("p-2 rounded cursor-pointer transition-all", activeTool === 'crosshair' ? "bg-zinc-800 text-blue-400" : "hover:bg-zinc-900")}
        >
            <Move size={16} />
        </div>
        <div className="w-4 h-[1px] bg-zinc-800 my-1" />
        {/* Visual placeholders for now, but selectable */}
        <div onClick={() => onToolChange('trend')} className={cn("p-2 rounded cursor-pointer", activeTool === 'trend' ? "bg-zinc-800 text-brand" : "hover:bg-zinc-900")}><TrendingUp size={16} /></div>
        <div onClick={() => onToolChange('fib')} className={cn("p-2 rounded cursor-pointer", activeTool === 'fib' ? "bg-zinc-800 text-brand" : "hover:bg-zinc-900")}><Hash size={16} /></div>
        <div onClick={() => onToolChange('text')} className={cn("p-2 rounded cursor-pointer", activeTool === 'text' ? "bg-zinc-800 text-brand" : "hover:bg-zinc-900")}><Type size={16} /></div>
        <div className="mt-auto flex flex-col gap-2">
            <div className="p-2 hover:bg-zinc-900 rounded cursor-pointer"><Plus size={16} /></div>
            <div className="p-2 hover:bg-zinc-900 rounded cursor-pointer"><Minus size={16} /></div>
        </div>
    </div>
);

// 2. Pro Header (Pump.fun Style)
const PumpHeader = ({ data, outcome, supply, firstCandle, outcomes, selectedOutcome, onOutcomeChange, mode, setMode, ath }: {
    data: any,
    outcome: string,
    supply?: number,
    firstCandle?: any,
    outcomes: (string | OutcomeObject)[],
    selectedOutcome: string,
    onOutcomeChange?: (outcome: string) => void,
    mode: MarketMode,
    setMode: (mode: MarketMode) => void,
    ath: number
}) => {
    // ATH Progress Logic: (Current Mcap / ATH) * 100
    // data.close is PROBABILITY (0-100)
    const prob = data.close || 50;

    // BONDING CURVE MATH (Phase 1)
    const VIRTUAL_OFFSET = 12_000_000;
    const P_START = 0.000001;
    const P_50 = 0.000005;
    const PHASE1_END = 100_000_000;
    const SLOPE = (P_50 - P_START) / PHASE1_END;

    const p = Math.max(0.01, Math.min(0.99, prob / 100)); // 0.01 - 0.99
    const derivedSupply = (VIRTUAL_OFFSET * p) / (1 - p);
    const derivedPriceSol = P_START + (SLOPE * derivedSupply);
    const mcapSol = derivedSupply * derivedPriceSol;

    // Logic: If current Mcap > ATH, it is the new ATH (100%).
    // If lower, percentage of ATH.
    // Initial state (ATH=0): 100%.
    const progress = useMemo(() => {
        if (ath <= 0) return 100;
        const pct = (mcapSol / ath) * 100;
        // Allow it to momentarily go above 100 if we just broke ATH before update
        return Math.min(Math.max(pct, 0), 100);
    }, [mcapSol, ath]);

    const safeClose = derivedPriceSol; // Use derived price for ROI calcs
    const safeInceptionOpen = firstCandle?.open || safeClose;


    // ROI from Floor (Inception)
    const roi = safeInceptionOpen > 0 ? ((safeClose - safeInceptionOpen) / safeInceptionOpen) * 100 : 0;
    const isPositive = roi >= 0;

    return (
        <div className="flex flex-col gap-4 font-mono w-full">
            {/* TOP ROW: Outcome Tabs (Visible in both modes for selection) */}
            {mode === "DJINN" ? (
                <div className="flex flex-wrap gap-2 mb-4 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800/50 w-fit">
                    {outcomes.map((o) => {
                        const title = typeof o === 'string' ? o : o.title;
                        const id = typeof o === 'string' ? o : o.id;
                        // Case-insensitive comparison prevents visual bugs
                        const isActive = (selectedOutcome || '').toLowerCase() === (title || '').toLowerCase();
                        // const itemColor = getColor(title); // Optional colored dot
                        return (
                            <button
                                key={id}
                                onClick={() => onOutcomeChange?.(title)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2",
                                    isActive
                                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                )}
                            >
                                {title}
                            </button>
                        );
                    })}
                </div>
            ) : null}


            {/* METADATA ROW: Title & Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {/* Outcome Token Icon */}
                    <div className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center bg-zinc-900 text-lg shadow-lg relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {outcome.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-white text-xl font-bold tracking-tight">
                                {outcome} <span className="text-zinc-600 text-base">/ {mode === 'DJINN' ? 'SOL' : '%'}</span>
                            </h2>
                            <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1", isPositive ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10")}>
                                {isPositive && '🚀'} {isPositive ? '+' : ''}{roi.toFixed(2)}%
                            </span>
                        </div>
                        {mode === "DJINN" ? (
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                                <span className="flex items-center gap-1">
                                    MCap: <span className="text-zinc-300 font-bold">{formatCompact(mcapSol)} SOL</span>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span className="flex items-center gap-1">
                                    Price: <span className="text-zinc-300 font-bold">{derivedPriceSol.toFixed(9)}</span>
                                </span>
                            </div>
                        ) : null}
                        {mode === "PROBABILITY" ? (
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                                <span className="flex items-center gap-1">
                                    Current Probability
                                </span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Mode Switcher */}
                <div className="bg-zinc-900 p-0.5 rounded-lg flex border border-zinc-800">
                    <button
                        onClick={() => setMode("PROBABILITY")}
                        className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2", mode === "PROBABILITY" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        <Activity size={12} /> Prob %
                    </button>
                    <button
                        onClick={() => setMode("DJINN")}
                        className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2", mode === "DJINN" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        <TrendingUp size={12} /> Djinn
                    </button>
                </div>
            </div>

            {/* ATH PROGRESS BAR (King of the Hill Style) */}
            {mode === "DJINN" ? (
                <div className="relative w-full h-8 bg-zinc-900 rounded stroke-zinc-800 border border-zinc-800 overflow-hidden group">
                    {/* The Fill Bar */}
                    <div
                        className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-900/40 via-emerald-500/20 to-emerald-500/40 transition-all duration-300 ease-out border-r border-emerald-500/50"
                        style={{ width: `${progress}%` }}
                    />

                    <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", progress >= 99 ? "bg-emerald-500" : "bg-zinc-600")} />
                            ATH Progress
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="text-zinc-400">Current: {formatCompact(mcapSol)}</span>
                            <span className="text-zinc-600">/</span>
                            <span className="text-zinc-400">ATH: {formatCompact(ath)}</span>
                            <span className="text-emerald-400 font-bold ml-1">({progress.toFixed(1)}%)</span>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

// --- MAIN COMPONENT ---

interface TheDjinnChartProps {
    outcomes?: (string | OutcomeObject)[];
    candleData?: Record<string, any[]>;
    probabilityData?: any[];
    tradeEvent?: TradeEvent | null;
    selectedOutcome?: string;
    onOutcomeChange?: (outcome: string) => void;
    outcomeSupplies?: Record<string, number>;
    solPrice?: number;
}

function TheDjinnChart({
    outcomes = ["YES", "NO"],
    candleData = {},
    probabilityData = [],
    tradeEvent,
    selectedOutcome: propSelectedOutcome,
    onOutcomeChange,
    outcomeSupplies = {},
    solPrice = 180
}: TheDjinnChartProps) {
    const [mode, setMode] = useState<MarketMode>("PROBABILITY");
    const [internalSelectedOutcome, setInternalSelectedOutcome] = useState(() => {
        const first = outcomes[0];
        return typeof first === 'string' ? first : first?.title || 'YES';
    });
    const selectedOutcome = propSelectedOutcome || internalSelectedOutcome;

    // Session ATH Tracking
    const [athMap, setAthMap] = useState<Record<string, number>>({});
    const [timeframe, setTimeframe] = useState<'5M' | '15M' | '30M' | '1H' | '6H' | '12H' | '1D' | '3D' | '1W' | '1M' | 'ALL'>('1D');

    // Bubble State
    const [bubbles, setBubbles] = useState<Bubble[]>([]);

    // Tool State
    const [activeTool, setActiveTool] = useState('cursor');

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

    // 2. ATH Tracking Effect
    useEffect(() => {
        const currentCandles = candleData[selectedOutcome] || [];
        if (currentCandles.length === 0) return;

        const lastCandle = currentCandles[currentCandles.length - 1];
        const supply = outcomeSupplies[selectedOutcome] || 0;
        const currentMcap = (supply) * lastCandle.close;

        setAthMap(prev => {
            const oldAth = prev[selectedOutcome] || 0;
            return currentMcap > oldAth ? { ...prev, [selectedOutcome]: currentMcap } : prev;
        });
    }, [candleData, selectedOutcome, outcomeSupplies]);

    // 3. Derived Data: Probability Line
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

    const currentCandles = candleData[selectedOutcome] || [];
    const activeCandle = currentCandles.length > 0 ? currentCandles[currentCandles.length - 1] : { open: 0, high: 0, low: 0, close: 0 };
    const supply = outcomeSupplies[selectedOutcome];

    // 4. Derived Data: Current Probabilities
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

        const totalRawShares = Object.values(outcomeSupplies).reduce((sum, val) => sum + Number(val || 0), 0);
        if (totalRawShares < 1000) {
            outcomes.forEach(o => {
                const title = typeof o === 'string' ? o : o.title;
                probs[title] = 100 / outcomes.length;
            });
            return probs;
        }

        let totalAdjusted = 0;
        const adjustedSupplies: Record<string, number> = {};

        outcomes.forEach(o => {
            const title = typeof o === 'string' ? o : o.title;
            const raw = Number(outcomeSupplies[title] || 0);
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

    return (
        <div className="w-full max-w-4xl mx-auto bg-black rounded-xl border border-zinc-800 shadow-2xl overflow-hidden relative font-sans">
            {/* TOP PANEL: HEADER */}
            <div className="p-4 bg-zinc-950/90 border-b border-zinc-900">
                <PumpHeader
                    data={{ close: activeCandle.close }}
                    outcome={selectedOutcome}
                    supply={supply}
                    firstCandle={currentCandles[0]}
                    outcomes={outcomes}
                    selectedOutcome={selectedOutcome}
                    onOutcomeChange={(o) => {
                        setInternalSelectedOutcome(o);
                        onOutcomeChange?.(o);
                    }}
                    mode={mode}
                    setMode={setMode}
                    ath={athMap[selectedOutcome] || 0}
                />
            </div>

            {/* MAIN CHART BODY using Grid for Sidebar */}
            <div className="flex h-[450px] bg-[#09090b]">
                {/* LEFT TOOLBAR (Only in Djinn Mode) */}
                {mode === "DJINN" ? (
                    <div className="border-r border-zinc-800 bg-zinc-950/50">
                        <TradingToolbar activeTool={activeTool} onToolChange={setActiveTool} />
                    </div>
                ) : null}

                {/* CHART AREA */}
                <div className="flex-1 relative w-full h-full">
                    {mode === "PROBABILITY" ? (
                        <ProbabilityChart
                            data={safeProbData}
                            outcomes={outcomes}
                            bubbles={bubbles}
                            timeframe={timeframe}
                            setTimeframe={setTimeframe}
                            currentProbabilities={currentProbabilities}
                        />
                    ) : (
                        <CandleChart
                            data={currentCandles}
                            selectedOutcome={selectedOutcome}
                            solPrice={solPrice}
                            activeTool={activeTool}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// 4. Memoization (Rule 5.4)
export default React.memo(TheDjinnChart);
// Helper para guardar puntos si se implementa estado local en el futuro
// const savePoint = (probs: any) => { ... }

