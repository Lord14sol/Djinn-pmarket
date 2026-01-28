import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, CartesianGrid
} from 'recharts';
import { createChart, ColorType, CrosshairMode, IChartApi, CandlestickSeries } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Activity, Zap } from 'lucide-react';

// --- TYPES ---
export interface ChartDataPoint {
    time: number; // ms
    [key: string]: any; // Allow dynamic keys (e.g. "YES", "NO", or specific outcome names)
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
    tradeEvent?: { id: string; side: 'YES' | 'NO', amount: number, outcome: string } | null;
    outcomeNames?: string[];
    selectedOutcome?: string;
    onOutcomeChange?: (name: string) => void;
    outcomeSupplies?: Record<string, number>;
}

// --- CONSTANTS ---
const TIMEFRAMES = [
    { label: '1s', val: '1s', ms: 1000, isMicro: true },
    { label: '5s', val: '5s', ms: 5 * 1000, isMicro: true },
    { label: '15s', val: '15s', ms: 15 * 1000, isMicro: true },
    { label: '1M', val: '1m', ms: 60 * 1000, isMicro: false },
    { label: '5M', val: '5m', ms: 5 * 60 * 1000, isMicro: false },
    { label: '15M', val: '15m', ms: 15 * 60 * 1000, isMicro: false },
    { label: '30M', val: '30m', ms: 30 * 60 * 1000, isMicro: false },
    { label: '1H', val: '1h', ms: 60 * 60 * 1000, isMicro: false },
    { label: '6H', val: '6h', ms: 6 * 60 * 60 * 1000, isMicro: false },
    { label: '1D', val: '1d', ms: 24 * 60 * 60 * 1000, isMicro: false },
    { label: '3D', val: '3d', ms: 3 * 24 * 60 * 60 * 1000, isMicro: false },
    { label: '1W', val: '1w', ms: 7 * 24 * 60 * 60 * 1000, isMicro: false },
    { label: 'ALL', val: 'all', ms: 365 * 24 * 60 * 60 * 1000, isMicro: false }, // Use large number for ALL
];

// --- HELPERS ---

// Aggregate raw line data into candles dynamically based on timeframe
const aggregateCandles = (data: ChartDataPoint[], intervalMs: number, key: string): CandleData[] => {
    if (!data.length) return [];

    // Sort just in case
    const sorted = [...data].sort((a, b) => a.time - b.time);

    const buckets: Record<number, number[]> = {};
    const candles: CandleData[] = [];

    // Group by bucket
    sorted.forEach(pt => {
        const bucketTime = Math.floor(pt.time / intervalMs) * intervalMs;
        if (!buckets[bucketTime]) buckets[bucketTime] = [];
        if (pt[key] !== undefined) {
            buckets[bucketTime].push(Number(pt[key]));
        }
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

            // LightWeight Charts expects seconds for time (UNIX)
            candles.push({
                time: time / 1000,
                open: open, // Percent 0-100
                high: high,
                low: low,
                close: close
            });
        }
    });

    return candles;
};

// --- SUB-COMPONENTS ---

const TradeBubblesOverlay = ({ bubbles }: { bubbles: TradeBubble[] }) => {
    return (
        <div className="absolute bottom-10 left-0 right-0 h-48 pointer-events-none overflow-hidden flex flex-col-reverse items-center gap-1 z-20 pb-4">
            <AnimatePresence mode='popLayout'>
                {bubbles.map(b => (
                    <motion.div
                        key={b.id}
                        initial={{ y: 50, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.4, type: 'spring' }}
                        className={`px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md flex items-center gap-2 ${b.side === 'YES'
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                            }`}
                    >
                        <span className="text-[10px] font-black uppercase text-white">{b.outcomeName}</span>
                        <span className="font-mono text-xs font-bold shadow-black drop-shadow-md">+{b.amountSol.toFixed(2)} SOL</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};


// --- MAIN COMPONENT ---
export default function TheDjinnChart({
    data,
    tradeEvent,
    onHover,
    onOutcomeChange,
    ...props
}: TheDjinnChartProps) {
    const [mode, setMode] = useState<'MARKET' | 'DJINN'>('MARKET');
    // Default to 1M for better responsiveness? User asked for sync with timeframes.
    // Let's default to standard 1H view if they want to see "move" from 50%
    const [timeframe, setTimeframe] = useState(TIMEFRAMES.find(t => t.val === '1m') || TIMEFRAMES[4]);
    const [showMicros, setShowMicros] = useState(false); // Toggle to show seconds frames

    // Outcomes
    const outcomes = useMemo(() => props.outcomeNames || ['YES', 'NO'], [props.outcomeNames]);
    const [djinnOutcome, setDjinnOutcome] = useState<string>(outcomes[0]);

    // Sync external choice
    useEffect(() => {
        if (props.selectedOutcome && outcomes.includes(props.selectedOutcome)) {
            setDjinnOutcome(props.selectedOutcome);
        }
    }, [props.selectedOutcome, outcomes]);

    // Notify parent on change
    useEffect(() => {
        onOutcomeChange?.(djinnOutcome);
    }, [djinnOutcome]);

    const [bubbles, setBubbles] = useState<TradeBubble[]>([]);

    // BUBBLE LOOP FIX: Ref to track processed event IDs
    const lastProcessedEventId = useRef<string | null>(null);

    // Chart Refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const tvChartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<any>(null);

    // Handle Trade Events -> Bubbles
    useEffect(() => {
        if (tradeEvent && tradeEvent.id !== lastProcessedEventId.current) {
            lastProcessedEventId.current = tradeEvent.id;

            const newBubble: TradeBubble = {
                id: tradeEvent.id, // Use actual event ID
                side: tradeEvent.side,
                amountSol: tradeEvent.amount,
                outcomeName: tradeEvent.outcome
            };
            setBubbles(prev => [...prev, newBubble]);
            setTimeout(() => setBubbles(prev => prev.filter(b => b.id !== newBubble.id)), 4000);
        }
    }, [tradeEvent]);


    // --- FILTER DATA (MARKET MODE) ---
    const filteredLineData = useMemo(() => {
        if (!data.length) return [];
        const now = data[data.length - 1].time;
        // If timeframe is huge, show all.
        const cutoff = now - timeframe.ms;
        return data.filter(d => d.time >= cutoff);
    }, [data, timeframe]);


    // --- DJINN MODE (Candlesticks) ---
    useEffect(() => {
        if (mode === 'DJINN' && chartContainerRef.current) {
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
    }, [mode]);

    // --- AGGREGATE DJINN DATA ---
    useEffect(() => {
        if (mode === 'DJINN' && seriesRef.current && data.length > 0) {
            // FIX: Use timeframe.ms for grouping
            const aggregated = aggregateCandles(data, timeframe.ms, djinnOutcome);
            seriesRef.current.setData(aggregated);

            if (tvChartRef.current) {
                tvChartRef.current.timeScale().fitContent();
            }
        }
    }, [data, timeframe, djinnOutcome, mode]); // Re-run when data or timeframe changes


    const lastPoint = filteredLineData.length ? filteredLineData[filteredLineData.length - 1] : null;

    return (
        <div className="flex flex-col w-full h-full bg-[#020202] rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
            {/* TOP BAR */}
            <div className="flex flex-col gap-2 p-4 px-6 border-b border-white/5 z-20 bg-[#020202]/80 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* MODE */}
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

                        {/* OUTCOME SELECTOR (Djinn Mode) */}
                        {mode === 'DJINN' && (
                            <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 ml-2">
                                {outcomes.map((outcome, idx) => {
                                    const isSelected = djinnOutcome === outcome;
                                    const color = idx === 0 ? '#10B981' : (idx === 1 ? '#EF4444' : '#FCD116');
                                    return (
                                        <button
                                            key={outcome}
                                            onClick={() => setDjinnOutcome(outcome)}
                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all border ${isSelected
                                                ? `bg-[${color}]/20 text-[${color}] border-[${color}]/50`
                                                : 'text-gray-500 hover:text-white border-transparent'
                                                }`}
                                            style={{
                                                color: isSelected ? color : undefined,
                                                borderColor: isSelected ? wrapperHexAlpha(color, 0.5) : undefined,
                                                backgroundColor: isSelected ? wrapperHexAlpha(color, 0.2) : undefined
                                            }}
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

            {/* CHART */}
            <div className="flex-1 w-full bg-[#020202] relative min-h-[350px]">
                {mode === 'MARKET' ? (
                    <div className="w-full h-[350px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={filteredLineData}
                                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                                onMouseMove={(e) => {
                                    // Dynamic Key Access
                                    if (e.activePayload && e.activePayload[0]) {
                                        const val = e.activePayload[0].payload[outcomes[0]];
                                        onHover?.(val);
                                    }
                                }}
                                onMouseLeave={() => onHover?.(null)}
                            >
                                <defs>
                                    <linearGradient id="colorOutcome0" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorOutcome1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={(t) => {
                                        if (timeframe.ms < 60 * 1000) return format(t, 'h:mm:ss');
                                        if (timeframe.ms <= 24 * 60 * 60 * 1000) return format(t, 'h:mm a');
                                        return format(t, 'MMM d');
                                    }}
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
                                    ticks={[0, 25, 50, 75, 100]}
                                    tick={{ fill: '#e5e7eb', fontSize: 10, fontFamily: 'monospace', opacity: 0.8 }}
                                    tickFormatter={(val) => `${val}%`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0B0E14', borderColor: '#333', borderRadius: '8px' }}
                                    itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                                    labelStyle={{ color: '#6B7280', fontSize: '10px', marginBottom: '4px' }}
                                    labelFormatter={(label) => format(label, 'MMM d, h:mm:ss a')}
                                />
                                <Area
                                    type="stepAfter"
                                    dataKey={outcomes[0] || 'YES'}
                                    stroke="#10B981"
                                    strokeWidth={3}
                                    isAnimationActive={false}
                                />
                                {outcomes[1] && (
                                    <Area
                                        type="stepAfter"
                                        dataKey={outcomes[1]}
                                        stroke="#EF4444"
                                        strokeWidth={3}
                                        isAnimationActive={false}
                                    />
                                )}
                                {/* GRID ON TOP FOR VISIBILITY - SOLID LINES */}
                                <CartesianGrid vertical={false} stroke="#ffffff" strokeOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                        <TradeBubblesOverlay bubbles={bubbles} />
                    </div>
                ) : (
                    <div ref={chartContainerRef} className="w-full h-[350px]" />
                )}
            </div>

            {/* TIMEFRAMES */}
            <div className="flex items-center gap-1 border-t border-white/5 bg-[#020202]/50 px-2 min-h-[44px]">
                <button
                    onClick={() => setShowMicros(!showMicros)}
                    className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-r border-white/5 mr-1 h-full
                        ${showMicros ? 'text-[#F492B7] bg-[#F492B7]/10' : 'text-gray-500 hover:text-white'}`}
                >
                    <Zap size={10} className={showMicros ? "fill-current" : ""} />
                    <span>{showMicros ? 'Micros' : 'Macro'}</span>
                </button>

                <div className="flex overflow-x-auto no-scrollbar gap-1 py-2 flex-1 items-center">
                    {TIMEFRAMES.filter(tf => {
                        // Simplify: Always show all if not micros, else show micros. 
                        // Or just list them all? No, list by mode.
                        return showMicros ? tf.isMicro : !tf.isMicro;
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

            {/* BG WATERMARK */}
            <div className="absolute top-[80px] left-8 pointer-events-none opacity-20 z-0">
                <h1 className="text-6xl font-serif font-medium text-white leading-none tracking-tight mix-blend-overlay">Djinn</h1>
            </div>
        </div>
    );
}

// Helper for dynamic colors
function wrapperHexAlpha(hex: string, alpha: number) {
    if (!hex) return 'rgba(255,255,255,0.1)';
    // Simple hex to rgba
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
