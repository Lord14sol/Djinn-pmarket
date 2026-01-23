"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, CandlestickData, HistogramData, Time } from "lightweight-charts";
import { cn, formatCompact } from "@/lib/utils";
import { TrendingUp, Activity, MousePointer2, Move, Type, Hash, Plus, Minus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
const TradingToolbar = () => (
    <div className="flex flex-col items-center gap-4 py-4 px-2 border-r border-zinc-800 bg-zinc-950/50 w-10 text-zinc-500">
        <div className="p-1 hover:bg-zinc-800 rounded cursor-pointer text-blue-400"><MousePointer2 size={16} /></div>
        <div className="p-1 hover:bg-zinc-800 rounded cursor-pointer"><Move size={16} /></div>
        <div className="w-4 h-[1px] bg-zinc-800 my-1" />
        <div className="p-1 hover:bg-zinc-800 rounded cursor-pointer"><TrendingUp size={16} /></div>
        <div className="p-1 hover:bg-zinc-800 rounded cursor-pointer"><Hash size={16} /></div>
        <div className="p-1 hover:bg-zinc-800 rounded cursor-pointer"><Type size={16} /></div>
        <div className="mt-auto flex flex-col gap-2">
            <div className="p-1 hover:bg-zinc-800 rounded cursor-pointer"><Plus size={16} /></div>
            <div className="p-1 hover:bg-zinc-800 rounded cursor-pointer"><Minus size={16} /></div>
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
    const safeClose = data.close || 0;
    const mcapSol = (supply || 0) * safeClose;

    // Logic: If current Mcap > ATH, it is the new ATH (100%).
    // If lower, percentage of ATH.
    // Initial state (ATH=0): 100%.
    const progress = useMemo(() => {
        if (ath <= 0) return 100;
        const pct = (mcapSol / ath) * 100;
        // Allow it to momentarily go above 100 if we just broke ATH before update
        return Math.min(Math.max(pct, 0), 100);
    }, [mcapSol, ath]);

    const color = getColor(outcome);
    const safeInceptionOpen = firstCandle?.open || safeClose;

    // ROI from Floor (Inception)
    const roi = safeInceptionOpen > 0 ? ((safeClose - safeInceptionOpen) / safeInceptionOpen) * 100 : 0;
    const isPositive = roi >= 0;

    return (
        <div className="flex flex-col gap-4 font-mono w-full">
            {/* TOP ROW: Outcome Tabs (Visible in both modes for selection) */}
            {mode === "DJINN" && (
                <div className="flex flex-wrap gap-2 mb-4 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800/50 w-fit">
                    {outcomes.map((o) => {
                        const title = typeof o === 'string' ? o : o.title;
                        const id = typeof o === 'string' ? o : o.id;
                        const isActive = selectedOutcome === title;
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
            )}


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
                            <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", isPositive ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10")}>
                                {isPositive ? '+' : ''}{roi.toFixed(2)}%
                            </span>
                        </div>
                        {mode === "DJINN" && (
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                                <span className="flex items-center gap-1">
                                    MCap: <span className="text-zinc-300 font-bold">{formatCompact(mcapSol)} SOL</span>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span className="flex items-center gap-1">
                                    Price: <span className="text-zinc-300 font-bold">{safeClose.toFixed(9)}</span>
                                </span>
                            </div>
                        )}
                        {mode === "PROBABILITY" && (
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                                <span className="flex items-center gap-1">
                                    Current Probability
                                </span>
                            </div>
                        )}
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
            {mode === "DJINN" && (
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
            )}
        </div>
    );
};

// 3. Glow Point (The Visual Oracle style - Visix)
const GlowPoint = (props: any) => {
    const { cx, cy, stroke, payload, dataKey } = props;
    if (cx === undefined || cy === undefined) return null;

    // Use a safer ID for gradients to avoid collisions
    const gradId = `glow-point-${String(dataKey).replace(/\s+/g, '-')}`;

    return (
        <g className="filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
            <defs>
                <radialGradient id={gradId}>
                    <stop offset="0%" stopColor={stroke} stopOpacity="1" />
                    <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx={cx} cy={cy} r="6" fill={stroke} strokeWidth={2} stroke="#fff" />
            <circle cx={cx} cy={cy} r="12" fill={`url(#${gradId})`} opacity="0.4">
                <animate attributeName="r" from="8" to="16" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
            </circle>
        </g>
    );
};


// --- MAIN COMPONENT ---

interface TheDjinnChartProps {
    outcomes?: (string | OutcomeObject)[];
    candleData?: Record<string, CandlestickData[]>;
    probabilityData?: any[];
    tradeEvent?: TradeEvent | null;
    selectedOutcome?: string;
    onOutcomeChange?: (outcome: string) => void;
    outcomeSupplies?: Record<string, number>;
}

export default function TheDjinnChart({
    outcomes = ["YES", "NO"],
    candleData = {},
    probabilityData = [],
    tradeEvent,
    selectedOutcome: propSelectedOutcome,
    onOutcomeChange,
    outcomeSupplies = {}
}: TheDjinnChartProps) {
    const [mode, setMode] = useState<MarketMode>("PROBABILITY");
    const [internalSelectedOutcome, setInternalSelectedOutcome] = useState(() => {
        const first = outcomes[0];
        return typeof first === 'string' ? first : first?.title || 'YES';
    });
    const selectedOutcome = propSelectedOutcome || internalSelectedOutcome;

    // Session ATH Tracking
    const [athMap, setAthMap] = useState<Record<string, number>>({});
    const [timeframe, setTimeframe] = useState<'1H' | '1D' | 'ALL'>('ALL');

    // Bubble State
    const [bubbles, setBubbles] = useState<Bubble[]>([]);

    useEffect(() => {
        if (tradeEvent) {
            const newBubble: Bubble = {
                id: Date.now().toString() + Math.random(),
                text: `+${formatCompact(tradeEvent.amount)}`,
                color: tradeEvent.color,
                y: Math.random() * 60 + 20 // 20% to 80% height
            };
            setBubbles(prev => [...prev, newBubble]);
            setTimeout(() => {
                setBubbles(prev => prev.filter(b => b.id !== newBubble.id));
            }, 3500);
        }
    }, [tradeEvent]);

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

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);

    // Derived Data
    const safeProbData = useMemo(() => {
        let baseData = probabilityData.length > 0 ? [...probabilityData] : [];
        if (baseData.length === 1) {
            baseData = [{ ...baseData[0], dateStr: 'Start', time: baseData[0].time - 3600 }, baseData[0]];
        }
        if (baseData.length === 0) {
            const now = Math.floor(Date.now() / 1000);
            baseData = [{ time: now - 3600 }, { time: now }];
        }

        // Filter by Timeframe
        if (timeframe !== 'ALL') {
            const now = Math.floor(Date.now() / 1000);
            const cutoff = timeframe === '1H' ? (now - 3600) : (now - 86400);
            baseData = baseData.filter(d => d.time >= cutoff);
        }

        return baseData;
    }, [probabilityData, timeframe]);

    const currentCandles = candleData[selectedOutcome] || [];
    const activeCandle = currentCandles.length > 0 ? currentCandles[currentCandles.length - 1] : { open: 0, high: 0, low: 0, close: 0 };
    const supply = outcomeSupplies[selectedOutcome];

    // ROI Calc
    const firstCandle = currentCandles[0];
    const safeClose = activeCandle.close || 0;
    const safeInceptionOpen = firstCandle?.open || safeClose;
    const roi = safeInceptionOpen > 0 ? ((safeClose - safeInceptionOpen) / safeInceptionOpen) * 100 : 0;
    const isPositive = roi >= 0;

    // --- CHART EFFECT ---
    useEffect(() => {
        if (mode !== "DJINN" || !chartContainerRef.current) return;

        if (chartInstanceRef.current) chartInstanceRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#71717a' },
            grid: { vertLines: { color: '#27272a' }, horzLines: { color: '#27272a' } },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            crosshair: { mode: CrosshairMode.Normal },
            timeScale: { borderColor: '#27272a', shiftVisibleRangeOnNewBar: true, timeVisible: true, secondsVisible: true },
            rightPriceScale: { borderColor: '#27272a' },
        });

        // 1. Candlestick Series
        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#10B981', downColor: '#EF4444', borderVisible: false, wickUpColor: '#10B981', wickDownColor: '#EF4444',
        });

        // 2. Volume Series (Histogram)
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '', // Overlay mode
        });

        // Configure Volume Scale
        chart.priceScale('').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        // Hydrate Data
        const data = currentCandles;
        if (data.length > 0) {
            series.setData(data as any);

            // Mock Volume Data derived from candles
            const volumeData = data.map((c: any) => ({
                time: c.time,
                value: (c.high - c.low) * 1000000 + (Math.random() * 100), // Synthetic volume
                color: c.close >= c.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            }));
            volumeSeries.setData(volumeData as any);
        }

        chart.timeScale().fitContent();

        chartInstanceRef.current = chart;
        seriesRef.current = series;
        volumeSeriesRef.current = volumeSeries;

        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartInstanceRef.current = null;
        };
    }, [mode, selectedOutcome]); // Hard Re-Mount on outcome change for safety

    // Live Update Effect
    useEffect(() => {
        if (mode === "DJINN" && seriesRef.current && chartInstanceRef.current) {
            seriesRef.current.setData(currentCandles as any);

            const volumeData = currentCandles.map((c: any) => ({
                time: c.time,
                value: (c.high - c.low) * 1000000 + 50,
                color: c.close >= c.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            }));
            if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volumeData as any);
        }
    }, [currentCandles, mode]);


    return (
        <div className="w-full max-w-4xl mx-auto bg-black rounded-xl border border-zinc-800 shadow-2xl overflow-hidden relative font-sans">

            {/* TOP PANEL: HEADER */}
            <div className="p-4 bg-zinc-950/90 border-b border-zinc-900">
                {mode === "DJINN" ? (
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
                ) : (
                    <div className="flex justify-between items-center w-full min-h-[60px]">
                        {/* Simple Label / Stats */}
                        <div className="flex flex-col gap-1">
                            <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Global Probability</span>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-2xl font-black tracking-tight", isPositive ? "text-emerald-400" : "text-rose-400")}>
                                    {selectedOutcome} {formatCompact(activeCandle.close * 100)}%
                                </span>
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
                )}
            </div>

            {/* MAIN CHART BODY using Grid for Sidebar */}
            <div className="flex h-[450px] bg-[#09090b]">
                {/* LEFT TOOLBAR */}
                {mode === "DJINN" && <TradingToolbar />}

                {/* CHART AREA */}
                <div className="flex-1 relative w-full h-full">
                    {mode === "PROBABILITY" ? (
                        <div className="w-full h-full p-4 flex flex-col relative">
                            {/* BUBBLES LAYER */}
                            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                                <AnimatePresence>
                                    {bubbles.map(b => (
                                        <motion.div
                                            key={b.id}
                                            initial={{ opacity: 0, x: -20, scale: 0.8 }}
                                            animate={{ opacity: 1, x: 20, y: -50, scale: 1 }}
                                            exit={{ opacity: 0, y: -100 }}
                                            transition={{ duration: 3, ease: "easeOut" }}
                                            style={{ top: `${b.y}%`, left: '0%' }}
                                            className="absolute flex items-center gap-2"
                                        >
                                            <div className="px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700 text-xs font-bold shadow-xl backdrop-blur-md whitespace-nowrap" style={{ color: b.color }}>
                                                {b.text}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* CHART */}
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={safeProbData}>
                                        <defs>
                                            {outcomes.map((o) => {
                                                const title = typeof o === 'string' ? o : o.title;
                                                const c = getColor(title);
                                                const gradId = `colorProb-${title.replace(/\s+/g, '-')}`;
                                                return (
                                                    <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={c} stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                                                    </linearGradient>
                                                );
                                            })}
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" strokeOpacity={0.4} />
                                        <XAxis
                                            dataKey="time"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#52525b', fontSize: 10 }}
                                            tickFormatter={(val) => new Date(val * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            minTickGap={50}
                                        />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-zinc-950/90 backdrop-blur border border-zinc-800 p-3 rounded-lg shadow-xl text-xs z-50">
                                                            <div className="text-zinc-500 mb-2">{new Date(Number(label) * 1000).toLocaleString()}</div>
                                                            {payload.map((p: any) => (
                                                                <div key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
                                                                    <span className="text-zinc-300 font-bold">{p.name}</span>
                                                                    <span className="text-zinc-400 font-mono ml-auto">{(Number(p.value)).toFixed(1)}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        {outcomes.map((o) => {
                                            const title = typeof o === 'string' ? o : o.title;
                                            const gradId = `colorProb-${title.replace(/\s+/g, '-')}`;
                                            return (
                                                <Area
                                                    key={title}
                                                    type="stepAfter"
                                                    dataKey={title}
                                                    stroke={getColor(title)}
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill={`url(#${gradId})`}
                                                    activeDot={{ r: 4, strokeWidth: 0, fill: getColor(title) }}
                                                />
                                            );
                                        })}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* BOTTOM CONTROLS (Timeframe) */}
                            <div className="flex justify-end pt-2 border-t border-zinc-800/50 mt-2">
                                <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50 backdrop-blur-sm">
                                    {['1H', '1D', 'ALL'].map((tf) => (
                                        <button
                                            key={tf}
                                            onClick={() => setTimeframe(tf as any)}
                                            className={cn(
                                                "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                                                timeframe === tf ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            {tf}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // DJINN MODE: Lightweight Chart Container
                        <div ref={chartContainerRef} className="w-full h-full" />
                    )}
                </div>
            </div>
        </div>
    );
}
