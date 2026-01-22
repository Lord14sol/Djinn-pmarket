'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts';
import { createChart, ColorType, CrosshairMode, IChartApi, CandlestickSeries } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Activity, Zap, BarChart2 } from 'lucide-react';

// --- TYPES ---
export interface ChartDataPoint {
    time: number; // ms
    yes: number; // 0-100
    no: number;  // 0-100
    timestamp?: Date;
}

export interface CandleData {
    time: number; // seconds
    open: number;
    high: number;
    low: number;
    close: number;
}

interface TradeBubble {
    id: string;
    side: 'YES' | 'NO';
    amountSol: number;
    outcomeName: string;
}

interface TheDjinnChartProps {
    data: ChartDataPoint[]; // Primary Probability Data (High Res)
    volume?: string;
    onHover?: (val: number | null) => void;
    tradeEvent?: { side: 'YES' | 'NO', amount: number, outcome: string } | null;
    outcomeNames?: string[];
    selectedOutcome?: string;
}

// --- CONSTANTS ---
const TIMEFRAMES = [
    { label: '1s', val: '1s', ms: 1000, isMicro: true },
    { label: '5s', val: '5s', ms: 5 * 1000, isMicro: true },
    { label: '15s', val: '15s', ms: 15 * 1000, isMicro: true },
    { label: '30s', val: '30s', ms: 30 * 1000, isMicro: true },
    { label: '1M', val: '1m', ms: 60 * 1000, isMicro: false },
    { label: '3M', val: '3m', ms: 3 * 60 * 1000, isMicro: false },
    { label: '5M', val: '5m', ms: 5 * 60 * 1000, isMicro: false },
    { label: '15M', val: '15m', ms: 15 * 60 * 1000, isMicro: false },
    { label: '1H', val: '1h', ms: 60 * 60 * 1000, isMicro: false },
    { label: '6H', val: '6h', ms: 6 * 60 * 60 * 1000, isMicro: false },
    { label: '12H', val: '12h', ms: 12 * 60 * 60 * 1000, isMicro: false },
    { label: '24H', val: '24h', ms: 24 * 60 * 60 * 1000, isMicro: false },
    { label: '3D', val: '3d', ms: 3 * 24 * 60 * 60 * 1000, isMicro: false },
    { label: '1W', val: '1w', ms: 7 * 24 * 60 * 60 * 1000, isMicro: false },
    { label: '1Mo', val: '1mo', ms: 30 * 24 * 60 * 60 * 1000, isMicro: false },
];

// --- HELPERS ---

// Aggregate raw line data into candles dynamically based on timeframe
const aggregateCandles = (data: ChartDataPoint[], intervalMs: number, key: 'yes' | 'no'): CandleData[] => {
    if (!data.length) return [];

    // Sort just in case
    const sorted = [...data].sort((a, b) => a.time - b.time);

    const buckets: Record<number, number[]> = {};
    const candles: CandleData[] = [];

    // Group by bucket
    sorted.forEach(pt => {
        const bucketTime = Math.floor(pt.time / intervalMs) * intervalMs;
        if (!buckets[bucketTime]) buckets[bucketTime] = [];
        buckets[bucketTime].push(pt[key]);
    });

    // Create candles
    Object.keys(buckets).sort((a, b) => Number(a) - Number(b)).forEach(t => {
        const time = Number(t);
        const values = buckets[time];
        if (values.length > 0) {
            const open = values[0];
            const close = values[values.length - 1];
            const high = Math.max(...values);
            const low = Math.min(...values);

            // TradingView expects seconds for time
            candles.push({
                time: time / 1000,
                open: open / 100,
                high: high / 100,
                low: low / 100,
                close: close / 100
            });
        }
    });

    return candles;
};

// --- SUB-COMPONENTS ---

const TradeBubblesOverlay = ({ bubbles }: { bubbles: TradeBubble[] }) => {
    return (
        <div className="absolute bottom-10 left-0 right-0 h-32 pointer-events-none overflow-hidden flex justify-center items-end gap-2 z-20">
            <AnimatePresence>
                {bubbles.map(b => (
                    <motion.div
                        key={b.id}
                        initial={{ y: 50, opacity: 0, scale: 0.8 }}
                        animate={{ y: -20, opacity: 1, scale: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                        className={`px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md flex items-center gap-2 ${b.side === 'YES'
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                            }`}
                    >
                        <span className="text-[10px] font-black uppercase text-white">{b.outcomeName}</span>
                        <span className="font-mono text-xs font-bold shadow-black drop-shadow-md">+{b.amountSol} SOL</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};


// --- MAIN COMPONENT ---
export default function TheDjinnChart({
    data,
    volume,
    onHover,
    tradeEvent,
    ...props
}: TheDjinnChartProps) {
    const [mode, setMode] = useState<'MARKET' | 'DJINN'>('MARKET');
    const [timeframe, setTimeframe] = useState(TIMEFRAMES.find(t => t.val === '1h') || TIMEFRAMES[4]);
    const [showMicros, setShowMicros] = useState(false); // Toggle to show seconds frames

    // Default to first outcome (YES/Option A)
    const outcomes = useMemo(() => props.outcomeNames || ['YES', 'NO'], [props.outcomeNames]);
    const [djinnOutcome, setDjinnOutcome] = useState<string>(outcomes[0]);

    // Sync from prop
    useEffect(() => {
        if (props.selectedOutcome && outcomes.includes(props.selectedOutcome)) {
            setDjinnOutcome(props.selectedOutcome);
        }
    }, [props.selectedOutcome, outcomes]);

    const [bubbles, setBubbles] = useState<TradeBubble[]>([]);

    // Chart Refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const tvChartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<any>(null); // Keep track of series to update data

    // Derived Data
    const lastPoint = data[data.length - 1];

    // Handle Trade Events -> Bubbles
    useEffect(() => {
        if (tradeEvent) {
            const newBubble: TradeBubble = {
                id: Math.random().toString(36),
                side: tradeEvent.side,
                amountSol: tradeEvent.amount,
                outcomeName: tradeEvent.outcome
            };
            setBubbles(prev => [...prev, newBubble]);
            setTimeout(() => setBubbles(prev => prev.filter(b => b.id !== newBubble.id)), 3000);
        }
    }, [tradeEvent]);


    // --- FILTER DATA BY TIMEFRAME (FOR RECHARTS LINE) ---
    const filteredLineData = useMemo(() => {
        // Simple filter: only show data points within the last X duration OR agg if too many?
        // For Recharts line, showing "all" points in the window is best for smoothness.
        // We calculate start time.
        if (!data.length) return [];
        const now = data[data.length - 1].time;
        // If data is real-time, 'now' is close to Date.now().

        // We want to show the tail end of the data matching timeframe duration
        // Unless timeframe is > total history, then show all.
        // Let's just slice based on time range.
        const cutoff = now - timeframe.ms;
        return data.filter(d => d.time >= cutoff);
    }, [data, timeframe]);


    // --- DJINN MODE (Lightweight Charts) ---
    useEffect(() => {
        if (mode === 'DJINN' && chartContainerRef.current) {
            // Clean up old chart
            if (tvChartRef.current) {
                tvChartRef.current.remove();
                tvChartRef.current = null;
            }

            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: '#9CA3AF',
                    fontFamily: 'monospace',
                },
                grid: {
                    vertLines: { color: '#ffffff05' },
                    horzLines: { color: '#ffffff05' }
                },
                width: chartContainerRef.current.clientWidth,
                height: 350,
                crosshair: { mode: CrosshairMode.Normal },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: true,
                    borderColor: '#ffffff10'
                },
                rightPriceScale: {
                    borderColor: '#ffffff10',
                    scaleMargins: { top: 0.1, bottom: 0.1 }
                }
            });

            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#10B981',
                downColor: '#EF4444',
                borderVisible: false,
                wickUpColor: '#10B981',
                wickDownColor: '#EF4444'
            });

            seriesRef.current = candleSeries;
            tvChartRef.current = chart;

            const handleResize = () => {
                if (chartContainerRef.current) {
                    chart.applyOptions({ width: chartContainerRef.current.clientWidth });
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (tvChartRef.current) {
                    tvChartRef.current.remove();
                    tvChartRef.current = null;
                }
            };
        }
    }, [mode]); // Re-create chart only on mode switch

    // --- UPDATE DJINN DATA (On data/timeframe/outcome change) ---
    useEffect(() => {
        if (mode === 'DJINN' && seriesRef.current) {
            // 1. Aggregate
            // Map outcome name to 'yes' (index 0) or 'no' (index 1)
            const isFirst = djinnOutcome === outcomes[0];
            const key = isFirst ? 'yes' : 'no';

            const candles = aggregateCandles(data, timeframe.ms / 60 / 1000 * 60, key);
            // Fix: intervalMs arg in aggregateCandles is used as:
            // Math.floor(pt.time / intervalMs) * intervalMs
            // So we need intervalMs to be in MS.
            // aggregateCandles definition: (data, intervalMs, key)
            // timeframe.ms is correct.

            const aggregated = aggregateCandles(data, timeframe.ms, key);
            seriesRef.current.setData(aggregated);

            if (tvChartRef.current) tvChartRef.current.timeScale().fitContent();
        }
    }, [data, timeframe, djinnOutcome, mode, outcomes]);


    return (
        <div className="flex flex-col w-full h-full bg-[#020202] rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
            {/* TOP BAR: Mode & Timeframes */}
            <div className="flex flex-col gap-2 p-4 px-6 border-b border-white/5 z-20 bg-[#020202]/80 backdrop-blur-md">

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* MODE TOGGLE */}
                        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                            <button
                                onClick={() => setMode('MARKET')}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5
                                ${mode === 'MARKET' ? 'bg-[#10B981] text-white shadow-lg shadow-[#10B981]/20' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Activity size={12} />
                                Market
                            </button>
                            <button
                                onClick={() => setMode('DJINN')}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5
                                ${mode === 'DJINN' ? 'bg-[#F492B7] text-white shadow-lg shadow-[#F492B7]/20' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Zap size={12} />
                                Djinn
                            </button>
                        </div>

                        {/* DJINN OUTCOME SELECTOR (Only in Djinn Mode) */}
                        {mode === 'DJINN' && (
                            <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 ml-2 animate-in fade-in slide-in-from-left-2">
                                {outcomes.map((outcome, idx) => {
                                    const isSelected = djinnOutcome === outcome;
                                    const baseColor = idx === 0 ? '#10B981' : '#EF4444';
                                    const bgClass = isSelected
                                        ? (idx === 0 ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50' : 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50')
                                        : 'text-gray-500 hover:text-white border-transparent';

                                    return (
                                        <button
                                            key={outcome}
                                            onClick={() => setDjinnOutcome(outcome)}
                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all border ${bgClass}`}
                                        >
                                            {outcome}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CHART AREA */}
            <div className="flex-1 w-full bg-[#020202] relative min-h-[350px]">
                {mode === 'MARKET' ? (
                    <div className="w-full h-[350px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={filteredLineData}
                                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                                onMouseMove={(e) => {
                                    if (e.activePayload) onHover?.(e.activePayload[0].payload.yes);
                                }}
                                onMouseLeave={() => onHover?.(null)}
                            >
                                <defs>
                                    <linearGradient id="colorYes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorNo" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={(t) => format(t, timeframe.ms > 24 * 3600 * 1000 ? 'MMM d' : 'h:mm a')}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
                                    minTickGap={50}
                                />
                                <YAxis
                                    orientation="right"
                                    domain={[0, 100]}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
                                    tickFormatter={(val) => `${val}%`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0B0E14', borderColor: '#333', borderRadius: '8px' }}
                                    itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                                    labelStyle={{ color: '#6B7280', fontSize: '10px', marginBottom: '4px' }}
                                    labelFormatter={(label) => format(label, 'MMM d, h:mm:ss a')}
                                />
                                <Area
                                    type="monotoneX"
                                    dataKey="yes"
                                    stroke="#10B981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorYes)"
                                    isAnimationActive={false}
                                />
                                <Area
                                    type="monotoneX"
                                    dataKey="no"
                                    stroke="#EF4444"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorNo)"
                                    isAnimationActive={false}
                                />
                                {/* PULSING DOT (MANUAL) */}
                                {lastPoint && (
                                    <>
                                        <ReferenceLine x={lastPoint.time} stroke="#333" strokeDasharray="3 3" />
                                        {/* YES DOT */}
                                        <ReferenceLine
                                            segment={[{ x: lastPoint.time, y: lastPoint.yes }, { x: lastPoint.time, y: lastPoint.yes }]}
                                            stroke="none"
                                            label={(props: any) => (
                                                <g>
                                                    <circle cx={props.viewBox.x} cy={props.viewBox.y} r="4" fill="#10B981" />
                                                    <circle cx={props.viewBox.x} cy={props.viewBox.y} r="12" stroke="#10B981" fill="none" opacity="0.5">
                                                        <animate attributeName="r" from="4" to="12" dur="1.5s" repeatCount="indefinite" />
                                                        <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                                                    </circle>
                                                </g>
                                            )}
                                        />
                                    </>
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                        <TradeBubblesOverlay bubbles={bubbles} />
                    </div>
                ) : (
                    <div ref={chartContainerRef} className="w-full h-[350px]" />
                )}
            </div>

            {/* BOTTOM BAR: Timeframes */}
            {/* BOTTOM BAR: Timeframes */}
            <div className="flex items-center gap-1 border-t border-white/5 bg-[#020202]/50 px-2 min-h-[44px]">
                {/* LIVE TOGGLE Button (For Djinn Mode) */}
                {mode === 'DJINN' && (
                    <button
                        onClick={() => setShowMicros(!showMicros)}
                        className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-r border-white/5 mr-1 h-full
                        ${showMicros ? 'text-[#F492B7] bg-[#F492B7]/10' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Zap size={10} className={showMicros ? "fill-current" : ""} />
                        <span>Live</span>
                    </button>
                )}

                {/* SCROLLABLE LIST */}
                <div className="flex overflow-x-auto no-scrollbar gap-1 py-2 flex-1 items-center">
                    {TIMEFRAMES.filter(tf => {
                        if (mode === 'MARKET') return !tf.isMicro; // Market only shows standard
                        return showMicros ? tf.isMicro : !tf.isMicro; // Djinn toggles
                    }).map(tf => (
                        <button
                            key={tf.val}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all whitespace-nowrap
                                ${timeframe.val === tf.val
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'}`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* BRANDING */}
            <div className="absolute top-[80px] left-8 pointer-events-none opacity-20 z-0">
                <h1 className="text-6xl font-serif font-medium text-white leading-none tracking-tight mix-blend-overlay">Djinn</h1>
            </div>
        </div>
    );
}
