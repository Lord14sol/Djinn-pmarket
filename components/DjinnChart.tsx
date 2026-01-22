"use client";
import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Bar, Cell } from 'recharts';
import { format } from 'date-fns';

// Types
interface ChartDataPoint {
    time: number;
    yes: number; // 0-1 (probability)
    no: number;  // 0-1 (probability)
    timestamp?: Date;
}

interface CandleDataPoint {
    time: number;
    open: number;
    close: number;
    high: number;
    low: number;
}

interface DjinnChartProps {
    data: ChartDataPoint[];
    volume?: string;
    settlementDate?: string;
    onTimeframeChange?: (tf: string) => void;
    yesLabel?: string;
    noLabel?: string;
}

// Timeframe options
const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D'];

// Helper to aggregate data into candles
const aggregateToCandles = (data: ChartDataPoint[], intervalMs: number): CandleDataPoint[] => {
    if (!data.length) return [];

    const sorted = [...data].sort((a, b) => a.time - b.time);
    const candles: CandleDataPoint[] = [];

    // Align to interval
    let currentBucketStart = Math.floor(sorted[0].time / intervalMs) * intervalMs;
    let currentBucket: ChartDataPoint[] = [];

    sorted.forEach(point => {
        if (point.time >= currentBucketStart + intervalMs) {
            // Close current bucket
            if (currentBucket.length > 0) {
                const open = currentBucket[0].yes;
                const close = currentBucket[currentBucket.length - 1].yes;
                const highs = currentBucket.map(p => p.yes);
                const high = Math.max(...highs);
                const low = Math.min(...highs);
                candles.push({ time: currentBucketStart, open, close, high, low });
            }
            // Start new bucket
            currentBucketStart = Math.floor(point.time / intervalMs) * intervalMs;
            currentBucket = [];
        }
        currentBucket.push(point);
    });

    // Push last bucket
    if (currentBucket.length > 0) {
        const open = currentBucket[0].yes;
        const close = currentBucket[currentBucket.length - 1].yes;
        const highs = currentBucket.map(p => p.yes);
        const high = Math.max(...highs);
        const low = Math.min(...highs);
        candles.push({ time: currentBucketStart, open, close, high, low });
    }

    return candles;
};

// Custom Candle Shape
const Candlestick = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload || props; // Safely get data

    const isUp = close >= open;
    const color = isUp ? '#10B981' : '#F492B7'; // Green or Pink

    // Calculate Coordinates
    let yOpen, yClose, yHigh, yLow;

    if (props.yAxis && props.yAxis.scale) {
        // Use Recharts Axis Scale if available
        const { yAxis } = props;
        yOpen = yAxis.scale(open);
        yClose = yAxis.scale(close);
        yHigh = yAxis.scale(high);
        yLow = yAxis.scale(low);
    } else {
        // Fallback: Calculate scale from Bar dimensions (assuming dataKey="high" so y corresponds to high)
        // Recharts draws bars from 0 (bottom) to value (top).
        // height = bar height (pixels)
        // y = top of the bar (pixels)
        // zeroY = y + height (bottom of the bar, corresponds to value 0)
        // scale = height / value (pixels per unit)

        // However, we are switching Bar dataKey to "high" to ensure the full wick fits.
        // So `y` is the position of `high`.
        // `height` is the distance from 0 to `high`.

        const zeroY = y + height;
        const scale = high !== 0 ? height / high : 0;

        yHigh = y; // Since dataKey is high
        yLow = zeroY - low * scale;
        yOpen = zeroY - open * scale;
        yClose = zeroY - close * scale;
    }

    const barWidth = Math.max(width * 0.6, 2);
    const xCenter = x + width / 2;

    return (
        <g>
            {/* Vick */}
            <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={color} strokeWidth={1} />
            {/* Body */}
            <rect
                x={xCenter - barWidth / 2}
                y={Math.min(yOpen, yClose)}
                width={barWidth}
                height={Math.max(Math.abs(yOpen - yClose), 1)}
                fill={color}
                rx={1}
            />
        </g>
    );
};

// Format X-axis based on timeframe
const formatXAxis = (timestamp: number, timeframe: string): string => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return timeframe === '1D' || timeframe === '4H'
        ? format(date, 'MMM d')
        : format(date, 'h:mm a');
};

// Custom Tooltip for Candles
const CandleTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload; // Access the full data object
    return (
        <div className="bg-[#0B0E14] border border-white/10 p-3 rounded-lg shadow-xl">
            <div className="text-gray-400 text-xs mb-2 font-mono">
                {format(new Date(label), 'MMM d, h:mm a')}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <span className="text-gray-500">O:</span> <span className="text-white">{(data.open * 100).toFixed(1)}%</span>
                <span className="text-gray-500">H:</span> <span className="text-white">{(data.high * 100).toFixed(1)}%</span>
                <span className="text-gray-500">L:</span> <span className="text-white">{(data.low * 100).toFixed(1)}%</span>
                <span className="text-gray-500">C:</span> <span className={`${data.close >= data.open ? 'text-[#10B981]' : 'text-[#F492B7]'}`}>{(data.close * 100).toFixed(1)}%</span>
            </div>
        </div>
    );
};

export default function DjinnChart({
    data,
    volume = "$0",
    settlementDate = "TBD",
    onTimeframeChange,
    yesLabel = "YES",
    noLabel = "NO"
}: DjinnChartProps) {
    const [timeframe, setTimeframe] = useState('1H');
    const [chartMode, setChartMode] = useState<'line' | 'djinn'>('line');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Handle timeframe change
    const handleTimeframeChange = (tf: string) => {
        setTimeframe(tf);
        onTimeframeChange?.(tf);
    };

    // Filter AND Aggregate Data
    const { lineData, candleData } = useMemo(() => {
        if (!data || data.length === 0) return { lineData: [], candleData: [] };

        const now = Date.now();
        let cutoffTime = 0;
        let intervalMs = 60 * 1000; // Default 1m

        switch (timeframe) {
            case '1m':
                cutoffTime = now - 60 * 60 * 1000; // Last hour
                intervalMs = 60 * 1000;
                break;
            case '5m':
                cutoffTime = now - 6 * 60 * 60 * 1000; // Last 6h
                intervalMs = 5 * 60 * 1000;
                break;
            case '15m':
                cutoffTime = now - 24 * 60 * 60 * 1000; // Last 24h
                intervalMs = 15 * 60 * 1000;
                break;
            case '1H':
                cutoffTime = now - 7 * 24 * 60 * 60 * 1000; // Last 7d
                intervalMs = 60 * 60 * 1000;
                break;
            case '4H':
                cutoffTime = now - 30 * 24 * 60 * 60 * 1000; // Last 30d
                intervalMs = 4 * 60 * 60 * 1000;
                break;
            case '1D':
                cutoffTime = 0; // All time
                intervalMs = 24 * 60 * 60 * 1000;
                break;
            default: cutoffTime = now - 24 * 60 * 60 * 1000;
        }

        const filtered = data.filter(d => d.time >= cutoffTime);
        // fallback
        const finalData = filtered.length > 0 ? filtered : data.slice(-50);

        if (chartMode === 'djinn') {
            return { lineData: [], candleData: aggregateToCandles(finalData, intervalMs) };
        } else {
            return { lineData: finalData, candleData: [] };
        }
    }, [data, timeframe, chartMode]);

    const currentYes = data[data.length - 1]?.yes ?? 0.5;
    const currentNo = data[data.length - 1]?.no ?? 0.5;

    if (!mounted) {
        return <div className="h-[450px] w-full bg-[#020202] animate-pulse rounded-xl" />;
    }

    return (
        <div className="flex flex-col w-full h-full bg-[#020202] rounded-2xl border border-white/5 p-6 relative overflow-hidden">
            {/* HEADER ROW */}
            <div className="flex items-center justify-between mb-6 z-10 relative">

                {/* Mode Toggle */}
                <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5">
                    <button
                        onClick={() => setChartMode('line')}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 ${chartMode === 'line' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                        Focus
                    </button>
                    <button
                        onClick={() => setChartMode('djinn')}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 ${chartMode === 'djinn' ? 'bg-[#F492B7] text-black shadow-[0_0_10px_rgba(244,146,183,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M2 20h20" /><path d="M6 16v-4" /><path d="M10 18v-8" /><path d="M14 14v-4" /><path d="M18 12v-2" /></svg>
                        Djinn Mode
                    </button>
                </div>

                {/* Date / Refresh */}
                <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span>Ends {settlementDate}</span>
                    </div>
                    <button className="hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 animate-reverse-spin hover:animate-spin">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* CHART AREA */}
            <div className="h-[320px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    {chartMode === 'line' ? (
                        <LineChart data={lineData}>
                            <defs>
                                <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <ReferenceLine y={0.5} stroke="#333" strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time"
                                tickFormatter={(val) => formatXAxis(val, timeframe)}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
                                minTickGap={40}
                            />
                            <YAxis
                                orientation="right"
                                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                                domain={[0, 1]}
                                ticks={[0, 0.25, 0.5, 0.75, 1]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
                                width={40}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0B0E14', borderColor: '#333' }}
                                itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                                labelStyle={{ color: '#888', marginBottom: '5px' }}
                                labelFormatter={(label) => format(new Date(label), 'MMM d, h:mm a')}
                                formatter={(val: number) => [`${(val * 100).toFixed(1)}%`]}
                            />
                            <Line
                                type="stepAfter"
                                dataKey="yes"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#10B981' }}
                            />
                            <Line
                                type="stepAfter"
                                dataKey="no"
                                stroke="#F492B7"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#F492B7' }}
                            />
                        </LineChart>
                    ) : (
                        <ComposedChart data={candleData}>
                            <ReferenceLine y={0.5} stroke="#333" strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time"
                                tickFormatter={(val) => formatXAxis(val, timeframe)}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
                                minTickGap={40}
                            />
                            <YAxis
                                orientation="right"
                                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                                domain={[0, 1]}
                                ticks={[0, 0.25, 0.5, 0.75, 1]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
                                width={40}
                            />
                            <Tooltip content={<CandleTooltip />} cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '3 3' }} />
                            {/* We use Bar with Custom Shape for Candles */}
                            <Bar
                                dataKey="high" // Using 'high' ensures the bar covers the full candle range for scaling
                                shape={<Candlestick />}
                                isAnimationActive={false}
                            >
                                {candleData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.close >= entry.open ? '#10B981' : '#F492B7'} />
                                ))}
                            </Bar>
                        </ComposedChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* TIMEFRAME CONTROLS */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                <div className="flex items-center gap-4">
                    <span className="text-[#10B981] font-bold text-sm">YES {(currentYes * 100).toFixed(0)}%</span>
                    <span className="text-[#F492B7] font-bold text-sm">NO {(currentNo * 100).toFixed(0)}%</span>
                </div>

                <div className="flex bg-white/5 rounded-lg p-1 gap-1">
                    {TIMEFRAMES.map(t => (
                        <button
                            key={t}
                            onClick={() => handleTimeframeChange(t)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${timeframe === t
                                ? 'bg-[#333] text-white shadow-sm'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#F492B7] opacity-[0.03] blur-[100px] pointer-events-none" />
        </div>
    );
}
