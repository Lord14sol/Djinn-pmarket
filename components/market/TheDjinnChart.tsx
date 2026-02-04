import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { createChart, ColorType, CrosshairMode, IChartApi, CandlestickSeries } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Activity, Zap } from 'lucide-react';
import { getOutcomeColor } from '@/lib/market-colors';

// --- TYPES ---
export interface ChartDataPoint {
    time: number;
    [key: string]: any;
}

export interface CandleData {
    time: number;
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
    data: ChartDataPoint[];
    volume?: string;
    onHover?: (val: number | null) => void;
    tradeEvent?: { id: string; side: 'YES' | 'NO', amount: number, outcome: string } | null;
    outcomeNames?: string[];
    selectedOutcome?: string;
    onOutcomeChange?: (name: string) => void;
    outcomeSupplies?: Record<string, number>;
}

// TIMEFRAMES - Simplified for speed
const TIMEFRAMES = [
    { label: '1M', val: '1m', ms: 60 * 1000 },
    { label: '5M', val: '5m', ms: 5 * 60 * 1000 },
    { label: '15M', val: '15m', ms: 15 * 60 * 1000 },
    { label: '30M', val: '30m', ms: 30 * 60 * 1000 },
    { label: '1H', val: '1h', ms: 60 * 60 * 1000 },
    { label: '6H', val: '6h', ms: 6 * 60 * 60 * 1000 },
    { label: '1D', val: '1d', ms: 24 * 60 * 60 * 1000 },
    { label: '1W', val: '1w', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: 'ALL', val: 'all', ms: 365 * 24 * 60 * 60 * 1000 },
];

// BIG NUMBER TOOLTIP - Polymarket style
const BigNumberTooltip = React.memo(({ active, payload, label, outcomes }: any) => {
    if (!active || !payload || !payload.length) return null;

    const timestamp = payload[0]?.payload?.time;
    let formattedDate = '';
    if (timestamp) {
        try {
            formattedDate = format(timestamp, 'MMM d, h:mm:ss a');
        } catch {
            formattedDate = '';
        }
    }

    return (
        <div className="bg-black/95 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-2xl min-w-[200px]">
            {formattedDate && (
                <div className="text-center mb-3 pb-2 border-b border-white/10">
                    <span className="text-[11px] font-mono text-gray-400">{formattedDate}</span>
                </div>
            )}
            <div className="flex flex-col gap-3">
                {payload
                    .filter((p: any) => p.value !== undefined && typeof p.value === 'number')
                    .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
                    .map((p: any, idx: number) => (
                        <div key={p.dataKey} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.stroke }} />
                                <span className="text-sm font-semibold text-gray-300">{p.dataKey}</span>
                            </div>
                            <span className="text-3xl font-black tabular-nums" style={{ color: p.stroke }}>
                                {Number(p.value).toFixed(1)}%
                            </span>
                        </div>
                    ))}
            </div>
        </div>
    );
});

BigNumberTooltip.displayName = 'BigNumberTooltip';

// Pulsing dot at line end
const PulsingDot = React.memo(({ cx, cy, stroke }: any) => {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    return (
        <g>
            <circle cx={cx} cy={cy} r="12" fill="none" stroke={stroke} strokeWidth={2} opacity={0.3}>
                <animate attributeName="r" from="6" to="16" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r="5" fill={stroke} stroke="#000" strokeWidth={2} />
        </g>
    );
});

PulsingDot.displayName = 'PulsingDot';

// Trade bubbles
const TradeBubblesOverlay = React.memo(({ bubbles }: { bubbles: TradeBubble[] }) => (
    <div className="absolute bottom-16 left-4 pointer-events-none z-20">
        <AnimatePresence mode='popLayout'>
            {bubbles.slice(0, 3).map(b => (
                <motion.div
                    key={b.id}
                    initial={{ y: 20, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3 }}
                    className={`mb-2 px-3 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-2 ${
                        b.side === 'YES' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                    }`}
                >
                    <span className="text-[10px] font-black uppercase">{b.outcomeName}</span>
                    <span className="font-mono text-xs font-bold">+{b.amountSol.toFixed(2)} SOL</span>
                </motion.div>
            ))}
        </AnimatePresence>
    </div>
));

TradeBubblesOverlay.displayName = 'TradeBubblesOverlay';

// Aggregate candles for DJINN mode
const aggregateCandles = (data: ChartDataPoint[], intervalMs: number, key: string): CandleData[] => {
    if (!data.length) return [];
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const buckets: Record<number, number[]> = {};

    sorted.forEach(pt => {
        const bucketTime = Math.floor(pt.time / intervalMs) * intervalMs;
        if (!buckets[bucketTime]) buckets[bucketTime] = [];
        if (pt[key] !== undefined) buckets[bucketTime].push(Number(pt[key]));
    });

    return Object.keys(buckets).sort((a, b) => Number(a) - Number(b)).map(t => {
        const time = Number(t);
        const values = buckets[time];
        return {
            time: time / 1000,
            open: values[0],
            close: values[values.length - 1],
            high: Math.max(...values),
            low: Math.min(...values)
        };
    }).filter(c => c.open !== undefined);
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
    const [timeframe, setTimeframe] = useState(TIMEFRAMES.find(t => t.val === '15m') || TIMEFRAMES[2]);
    const outcomes = useMemo(() => props.outcomeNames || ['YES', 'NO'], [props.outcomeNames]);
    const [djinnOutcome, setDjinnOutcome] = useState<string>(outcomes[0]);
    const [bubbles, setBubbles] = useState<TradeBubble[]>([]);
    const [hoverValues, setHoverValues] = useState<Record<string, number> | null>(null);

    const lastProcessedEventId = useRef<string | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const tvChartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<any>(null);

    // Sync external outcome
    useEffect(() => {
        if (props.selectedOutcome && outcomes.includes(props.selectedOutcome)) {
            setDjinnOutcome(props.selectedOutcome);
        }
    }, [props.selectedOutcome, outcomes]);

    useEffect(() => {
        onOutcomeChange?.(djinnOutcome);
    }, [djinnOutcome, onOutcomeChange]);

    // Trade events -> bubbles
    useEffect(() => {
        if (tradeEvent && tradeEvent.id !== lastProcessedEventId.current) {
            lastProcessedEventId.current = tradeEvent.id;
            const newBubble: TradeBubble = {
                id: tradeEvent.id,
                side: tradeEvent.side,
                amountSol: tradeEvent.amount,
                outcomeName: tradeEvent.outcome
            };
            setBubbles(prev => [...prev, newBubble]);
            setTimeout(() => setBubbles(prev => prev.filter(b => b.id !== newBubble.id)), 4000);
        }
    }, [tradeEvent]);

    // FAST FILTER - Memoized with stable reference
    const filteredLineData = useMemo(() => {
        if (!data.length) return [];
        const now = data[data.length - 1].time;
        const cutoff = now - timeframe.ms;
        return data.filter(d => d.time >= cutoff);
    }, [data, timeframe.ms]);

    // Handle timeframe change - instant, no animation
    const handleTimeframeChange = useCallback((tf: typeof TIMEFRAMES[0]) => {
        setTimeframe(tf);
    }, []);

    // Mouse move handler
    const handleMouseMove = useCallback((e: any) => {
        if (e.activePayload && e.activePayload[0]) {
            const payload = e.activePayload[0].payload;
            const values: Record<string, number> = {};
            outcomes.forEach(o => {
                if (payload[o] !== undefined) values[o] = payload[o];
            });
            setHoverValues(values);
            onHover?.(payload[outcomes[0]]);
        }
    }, [outcomes, onHover]);

    const handleMouseLeave = useCallback(() => {
        setHoverValues(null);
        onHover?.(null);
    }, [onHover]);

    // DJINN Mode chart setup
    useEffect(() => {
        if (mode === 'DJINN' && chartContainerRef.current) {
            if (tvChartRef.current) {
                tvChartRef.current.remove();
                tvChartRef.current = null;
            }

            const chart = createChart(chartContainerRef.current, {
                layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#fff' },
                grid: { vertLines: { color: '#ffffff10' }, horzLines: { color: '#ffffff10' } },
                width: chartContainerRef.current.clientWidth,
                height: 400,
                crosshair: { mode: CrosshairMode.Normal },
                timeScale: { timeVisible: true, secondsVisible: true, borderColor: '#ffffff20' },
                rightPriceScale: { borderColor: '#ffffff20' }
            });

            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#10B981', downColor: '#EF4444',
                borderVisible: false, wickUpColor: '#10B981', wickDownColor: '#EF4444'
            });

            seriesRef.current = candleSeries;
            tvChartRef.current = chart;

            const handleResize = () => {
                if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            };
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                tvChartRef.current?.remove();
                tvChartRef.current = null;
            };
        }
    }, [mode]);

    // Update DJINN candles
    useEffect(() => {
        if (mode === 'DJINN' && seriesRef.current && data.length > 0) {
            const aggregated = aggregateCandles(data, timeframe.ms, djinnOutcome);
            seriesRef.current.setData(aggregated);
            tvChartRef.current?.timeScale().fitContent();
        }
    }, [data, timeframe.ms, djinnOutcome, mode]);

    const lastPoint = filteredLineData[filteredLineData.length - 1];

    return (
        <div className="flex flex-col w-full h-full bg-[#0a0a0a] rounded-2xl relative overflow-hidden border border-white/10">
            {/* TOP BAR */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                {/* Mode Toggle */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMode('MARKET')}
                        className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1.5 border ${
                            mode === 'MARKET'
                                ? 'bg-[#10B981] text-white border-[#10B981]'
                                : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'
                        }`}
                    >
                        <Activity size={14} />
                        Probability
                    </button>
                </div>

                {/* Live indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400">LIVE</span>
                </div>
            </div>

            {/* BIG HOVER NUMBERS - Appears when hovering */}
            {hoverValues && (
                <div className="absolute top-16 right-4 z-30 flex flex-col items-end gap-2">
                    {outcomes.map((outcome, idx) => {
                        const color = getOutcomeColor(outcome, idx);
                        const val = hoverValues[outcome] ?? 0;
                        return (
                            <div key={outcome} className="flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-sm font-semibold text-gray-400">{outcome}</span>
                                <span className="text-4xl font-black tabular-nums tracking-tight" style={{ color }}>
                                    {val.toFixed(1)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CHART AREA */}
            <div className="flex-1 w-full relative min-h-[400px]">
                {mode === 'MARKET' ? (
                    <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={filteredLineData}
                                margin={{ top: 30, right: 60, left: 10, bottom: 10 }}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={handleMouseLeave}
                            >
                                {/* Grid lines - subtle horizontal */}
                                <ReferenceLine y={0} stroke="#333" strokeWidth={1} />
                                <ReferenceLine y={25} stroke="#333" strokeWidth={1} strokeDasharray="4 4" />
                                <ReferenceLine y={50} stroke="#333" strokeWidth={1} strokeDasharray="4 4" />
                                <ReferenceLine y={75} stroke="#333" strokeWidth={1} strokeDasharray="4 4" />
                                <ReferenceLine y={100} stroke="#333" strokeWidth={1} />

                                <XAxis
                                    dataKey="time"
                                    tickFormatter={(t) => {
                                        if (timeframe.ms <= 60 * 60 * 1000) return format(t, 'h:mm a');
                                        if (timeframe.ms <= 24 * 60 * 60 * 1000) return format(t, 'h:mm a');
                                        return format(t, 'MMM d');
                                    }}
                                    axisLine={{ stroke: '#333' }}
                                    tickLine={false}
                                    tick={{ fill: '#666', fontSize: 11 }}
                                    minTickGap={80}
                                />
                                <YAxis
                                    orientation="right"
                                    domain={[0, 100]}
                                    ticks={[0, 25, 50, 75, 100]}
                                    axisLine={{ stroke: '#333' }}
                                    tickLine={false}
                                    tick={{ fill: '#666', fontSize: 11 }}
                                    tickFormatter={(val) => `${val}%`}
                                    width={50}
                                />

                                <Tooltip content={<BigNumberTooltip outcomes={outcomes} />} cursor={{ stroke: '#666', strokeDasharray: '4 4' }} />

                                {/* CLEAN LINES - No fill, no shadow */}
                                {outcomes.map((outcome, idx) => {
                                    const color = getOutcomeColor(outcome, idx);
                                    return (
                                        <Line
                                            key={outcome}
                                            type="stepAfter"
                                            dataKey={outcome}
                                            stroke={color}
                                            strokeWidth={2.5}
                                            dot={(dotProps: any) => {
                                                if (dotProps.index === filteredLineData.length - 1) {
                                                    return <PulsingDot {...dotProps} stroke={color} />;
                                                }
                                                return <React.Fragment key={dotProps.index} />;
                                            }}
                                            activeDot={{ r: 6, strokeWidth: 2, fill: color, stroke: '#000' }}
                                            isAnimationActive={false}
                                            connectNulls
                                        />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                        <TradeBubblesOverlay bubbles={bubbles} />
                    </div>
                ) : (
                    <div ref={chartContainerRef} className="w-full h-[400px]" />
                )}
            </div>

            {/* TIMEFRAMES - Fast switching */}
            <div className="flex items-center gap-1 border-t border-white/10 px-4 py-3 bg-black/50">
                <div className="flex items-center gap-1 flex-1">
                    {TIMEFRAMES.map(tf => (
                        <button
                            key={tf.val}
                            onClick={() => handleTimeframeChange(tf)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                timeframe.val === tf.val
                                    ? 'bg-white text-black'
                                    : 'text-gray-500 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
