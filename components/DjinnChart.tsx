"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, CandlestickData, Time } from "lightweight-charts";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCompact } from "@/lib/utils";
import { TrendingUp, Activity } from "lucide-react";

// --- TIPOS & CONSTANTES ---
type MarketMode = "PROBABILITY" | "DJINN";
export type TradeEvent = { id: string; outcome: string; amount: number; color: string };

interface OutcomeObject {
    id: string;
    title: string;
    [key: string]: any;
}

const COLORS: Record<string, string> = {
    Brazil: "#FCD116",    // Amarillo
    Argentina: "#75AADB", // Celeste
    France: "#002395",    // Azul
    Yes: "#10B981",       // Verde
    No: "#EF4444",        // Rojo
};

// --- SUB-COMPONENTES ---

// 1. Header estilo Pump.fun con Bonding Curve
const PumpHeader = ({ data, outcome, supply, firstCandle }: { data: any, outcome: string, supply?: number, firstCandle?: any }) => {
    // Progress relative to 100M (PHASE1_END in lib/core-amm)
    const progress = useMemo(() => {
        if (supply !== undefined) return Math.min((supply / 100_000_000) * 100, 100);
        // Fallback to price-based derivation if supply missing
        return Math.min(((data.close || 0) / 0.8) * 100, 100);
    }, [supply, data.close]);

    // ROI based on session inception price (first candle)
    const safeInceptionOpen = firstCandle?.open || data.open || 0.000001;
    const safeClose = data.close || 0.000001;
    const roi = ((safeClose - safeInceptionOpen) / safeInceptionOpen) * 100;

    // Mcap = Supply * Price. 
    const mcapSol = (supply || 0) * safeClose;

    return (
        <div className="mb-4 space-y-3 font-mono border-b border-zinc-800 pb-4">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-white text-lg font-bold flex items-center gap-2">
                        {outcome} / SOL <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">MEME/BONDING</span>
                    </h2>
                    <div className="text-zinc-500 text-xs mt-1">
                        Market Cap: <span className="text-[#10B981] font-bold">{formatCompact(mcapSol)} SOL</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider">ROI since inception</div>
                    <div className={`text-xl font-bold tracking-tight ${roi >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                        {roi >= 0 ? '🚀 +' : '🔻 '}{Math.abs(roi).toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* BARRA DE PROGRESO DE BONDING CURVE */}
            <div className="relative w-full h-6 bg-zinc-900 rounded-sm border border-zinc-700 overflow-hidden group cursor-help">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                    className="h-full bg-yellow-400 relative z-10 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                />
                <div className="absolute inset-0 flex items-center justify-between px-2 z-20 pointer-events-none mix-blend-difference text-white">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Bonding Curve Progress</span>
                    <span className="text-[10px] font-mono">{progress.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
};

// 2. Punto Palpitante (Kalshi Style) para Recharts
const PulsingDot = (props: any) => {
    const { cx, cy, stroke, payload, dataKey, chartData } = props;
    const isLast = payload.time === chartData[chartData.length - 1].time;
    if (!isLast) return null;
    return (
        <g>
            <circle cx={cx} cy={cy} r="10" fill={stroke} opacity="0.2">
                <animate attributeName="r" from="4" to="14" dur="1.5s" begin="0s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r="4" fill={stroke} stroke="#fff" strokeWidth={2} />
        </g>
    );
};

// 3. Burbuja de Trading Flotante
const TradeBubble = ({ trade }: { trade: TradeEvent }) => (
    <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="absolute bottom-16 right-4 flex items-center gap-3 px-4 py-2 rounded-full shadow-2xl border border-white/10 backdrop-blur-md z-30"
        style={{ background: `linear-gradient(to right, ${trade.color}20, black)` }}
    >
        <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]" style={{ color: trade.color, backgroundColor: trade.color }} />
        <div className="flex flex-col leading-none">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Bought {trade.outcome}</span>
            <span className="text-sm font-bold text-white font-mono">+{formatCompact(trade.amount)} Shares</span>
        </div>
    </motion.div>
);

// --- COMPONENTE PRINCIPAL ---

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

    const [hoverData, setHoverData] = useState<any>(null);
    const [bubbles, setBubbles] = useState<TradeEvent[]>([]);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    // Watch for trade events passed from parent
    useEffect(() => {
        if (tradeEvent) {
            const newTrade = {
                id: Math.random().toString(),
                outcome: tradeEvent.outcome,
                amount: tradeEvent.amount,
                color: COLORS[tradeEvent.outcome] || (tradeEvent.outcome === 'YES' ? COLORS.Yes : COLORS.No) || "#fff",
            };
            setBubbles(prev => [...prev.slice(-2), newTrade]);
            setTimeout(() => setBubbles(prev => prev.filter(p => p.id !== newTrade.id)), 4000);
        }
    }, [tradeEvent]);

    // Derived State for Header
    // If no probability data, use empty array to avoid crash
    const safeProbData = useMemo(() => {
        if (probabilityData.length > 0) return probabilityData;
        const fallbackPoint: any = { time: Math.floor(Date.now() / 1000), dateStr: 'Now' };
        outcomes.forEach(o => {
            const title = typeof o === 'string' ? o : o.title;
            fallbackPoint[title] = 100 / outcomes.length;
        });
        return [fallbackPoint];
    }, [probabilityData, outcomes]);
    const activePoint = hoverData || safeProbData[safeProbData.length - 1];

    // Get current candle for selected outcome
    const currentCandles = candleData[selectedOutcome] || [];
    const activeCandle = currentCandles.length > 0 ? currentCandles[currentCandles.length - 1] : { open: 0, high: 0, low: 0, close: 0 };

    // Unified data object 
    const activeData = {
        ...activePoint,
        ...activeCandle
    };

    // Efecto para renderizar TradingView (Djinn Mode)
    useEffect(() => {
        if (mode !== "DJINN" || !chartContainerRef.current) return;

        // Cleanup previous chart
        if (chartInstanceRef.current) {
            chartInstanceRef.current.remove();
        }

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#71717a' },
            grid: { vertLines: { color: '#27272a' }, horzLines: { color: '#27272a' } },
            width: chartContainerRef.current.clientWidth,
            height: 350,
            crosshair: { mode: CrosshairMode.Normal },
            timeScale: { borderColor: '#27272a', shiftVisibleRangeOnNewBar: true },
            rightPriceScale: { borderColor: '#27272a', scaleMargins: { top: 0.2, bottom: 0.1 } },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#10B981', downColor: '#EF4444', borderVisible: false, wickUpColor: '#10B981', wickDownColor: '#EF4444',
        });

        // Load data for the selected outcome
        const data = candleData[selectedOutcome] || [];
        // Ensure time is sorted and unique mostly handled by parent, but basic check
        // LWCharts expects { time, open, high, low, close }
        // We cast to any because our time might be number (Unix) which valid 
        if (data.length > 0) {
            series.setData(data as any);
        }

        chart.timeScale().fitContent();

        chartInstanceRef.current = chart;
        seriesRef.current = series;

        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartInstanceRef.current = null;
        };
    }, [mode, selectedOutcome]); // Re-create chart when outcome changes to ensure fresh state

    // Independent Effect to update data without destroying chart if only data changes
    useEffect(() => {
        if (mode === "DJINN" && seriesRef.current && candleData[selectedOutcome]) {
            seriesRef.current.setData(candleData[selectedOutcome] as any);
        }
    }, [candleData, mode, selectedOutcome]);


    const displayValue = mode === "PROBABILITY"
        ? `${(activeData[selectedOutcome] || 50).toFixed(1)}%`
        : `${(activeData.close || 0).toFixed(6)} SOL`;

    return (
        <div className="w-full max-w-4xl mx-auto p-1 bg-black rounded-xl border border-zinc-800 shadow-2xl overflow-hidden relative font-sans">

            {/* HEADER CONTROL */}
            <div className="p-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
                {mode === "DJINN" && (
                    <PumpHeader
                        data={activeData}
                        outcome={selectedOutcome}
                        supply={outcomeSupplies[selectedOutcome]}
                        firstCandle={candleData[selectedOutcome]?.[0]}
                    />
                )}
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex flex-col gap-2">
                        {/* Outcome Tabs (ONLY VISIBLE IN DJINN MODE) */}
                        {mode === "DJINN" && (
                            <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg w-fit">
                                {outcomes.map(o => {
                                    const title = typeof o === 'string' ? o : o.title;
                                    const id = typeof o === 'string' ? o : o.id;
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => {
                                                setInternalSelectedOutcome(title);
                                                if (onOutcomeChange) onOutcomeChange(title);
                                            }}
                                            className={cn(
                                                "px-3 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-2 border border-transparent",
                                                selectedOutcome === title
                                                    ? "bg-zinc-800 text-white border-zinc-700 shadow-sm"
                                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                            )}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full" style={{
                                                background: COLORS[title] || (title === 'YES' ? COLORS.Yes : COLORS.No) || '#fff'
                                            }} />
                                            {title} / SOL
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Main Number Display (Solo visible en Prob Mode, en Djinn Mode lo maneja PumpHeader) */}
                        {mode === "PROBABILITY" && (
                            <div>
                                <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-0.5">Winning Probability</div>
                                <div className="text-6xl font-bold tracking-tighter text-white" style={{
                                    color: COLORS[selectedOutcome] || (selectedOutcome === 'YES' ? COLORS.Yes : COLORS.No) || '#fff'
                                }}>
                                    {displayValue}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mode Switcher */}
                    <div className="bg-zinc-900 p-1 rounded-lg flex border border-zinc-800">
                        <button
                            onClick={() => setMode("PROBABILITY")}
                            className={cn("px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2", mode === "PROBABILITY" ? "bg-zinc-800 text-white shadow" : "text-zinc-500")}
                        >
                            <Activity size={14} /> Market %
                        </button>
                        <button
                            onClick={() => setMode("DJINN")}
                            className={cn("px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2", mode === "DJINN" ? "bg-[#10B981] text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-zinc-500")}
                        >
                            <TrendingUp size={14} /> Djinn Mode
                        </button>
                    </div>
                </div>
            </div>

            {/* CHART CANVAS */}
            <div className="h-[420px] w-full relative bg-[#09090b]">
                {mode === "PROBABILITY" ? (
                    <div className="w-full h-full pt-4" onMouseLeave={() => setHoverData(null)}>
                        {probabilityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={safeProbData} onMouseMove={(e) => { if (e.activePayload) setHoverData(e.activePayload[0].payload); }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                                    <XAxis dataKey="dateStr" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip content={() => null} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    {outcomes.map(o => {
                                        const title = typeof o === 'string' ? o : o.title;
                                        return (
                                            <Line
                                                key={title}
                                                type="monotone"
                                                dataKey={title}
                                                stroke={COLORS[title] || (title === 'YES' ? COLORS.Yes : COLORS.No) || "#fff"}
                                                strokeWidth={3}
                                                strokeOpacity={1}
                                                dot={<PulsingDot chartData={safeProbData} />}
                                                activeDot={{ r: 6, strokeWidth: 0, fill: "#fff" }}
                                                animationDuration={400}
                                            />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            // Fallback if truly no data (should basically never happen with safeProbData)
                            <div className="flex items-center justify-center h-full text-zinc-600">
                                <Activity className="animate-pulse mr-2" /> Initializing Market Data...
                            </div>
                        )}
                        <AnimatePresence>
                            {bubbles.map(b => <TradeBubble key={b.id} trade={b} />)}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col p-4 animate-in fade-in duration-300">
                        <PumpHeader data={activeData} outcome={selectedOutcome} />
                        <div ref={chartContainerRef} className="flex-1 w-full min-h-0 border border-zinc-800 rounded bg-black/40" />
                        <div className="mt-2 flex gap-4 text-[10px] text-zinc-600 font-mono select-none">
                            <span>O: <span className="text-zinc-400">{activeData.open?.toFixed(8)}</span></span>
                            <span>H: <span className="text-zinc-400">{activeData.high?.toFixed(8)}</span></span>
                            <span>L: <span className="text-zinc-400">{activeData.low?.toFixed(8)}</span></span>
                            <span>C: <span className={(activeData.close || 0) >= (activeData.open || 0) ? "text-green-500" : "text-red-500"}>{activeData.close?.toFixed(8)}</span></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
