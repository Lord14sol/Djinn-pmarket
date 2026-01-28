"use client";
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { cn, formatCompact } from "@/lib/utils";
import { getOutcomeColor } from "@/lib/market-colors";

export type Bubble = {
    id: string;
    text: string;
    color: string;
    y: number;
};

interface ProbabilityChartProps {
    data: any[];
    outcomes: (string | { id: string; title: string })[];
    bubbles: Bubble[];
    timeframe: '1m' | '5m' | '15m' | '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL';
    setTimeframe: (tf: '1m' | '5m' | '15m' | '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL') => void;
    currentProbabilities: Record<string, number>;
    volume?: string;
    resolutionDate?: string;
    selectedOutcome?: string;
    onOutcomeChange?: (outcome: string) => void;
}

// OPTIMIZED: Memoized Custom Tooltip
const CustomTooltip = React.memo(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0]?.payload;
    const timestamp = dataPoint?.time || Number(label);

    let formattedDate = '';
    if (timestamp && typeof timestamp === 'number' && timestamp > 1000000) {
        try {
            const date = new Date(timestamp * 1000);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        } catch {
            formattedDate = '';
        }
    }

    return (
        <div className="bg-zinc-950/95 backdrop-blur-xl rounded-xl p-4 border border-white/20 pointer-events-none shadow-2xl min-w-[140px]">
            {formattedDate && (
                <div className="text-center mb-3 pb-2 border-b border-white/10">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                        {formattedDate}
                    </span>
                </div>
            )}
            <div className="flex flex-col gap-2 items-start">
                {payload
                    .filter((p: any) => p.value !== undefined && p.value !== null && typeof p.value === 'number')
                    .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
                    .map((p: any) => (
                        <div key={p.name} className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: p.stroke }}>
                                {p.name}
                            </span>
                            <span
                                className="text-3xl font-black tabular-nums tracking-tighter leading-none"
                                style={{ color: p.stroke }}
                            >
                                {Number(p.value).toFixed(1)}%
                            </span>
                        </div>
                    ))}
            </div>
        </div>
    );
});

CustomTooltip.displayName = 'CustomTooltip';

// OPTIMIZED: Simplified Pulsing Dot with requestAnimationFrame
const PulsingDot = React.memo((props: any) => {
    const { cx, cy, stroke } = props;

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

    return (
        <g>
            <motion.circle
                cx={cx}
                cy={cy}
                r="6"
                fill="none"
                stroke={stroke}
                strokeWidth={3}
                initial={{ r: 6, opacity: 0.5 }}
                animate={{ r: 20, opacity: 0 }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />
            <circle cx={cx} cy={cy} r="5" fill={stroke} />
        </g>
    );
});

PulsingDot.displayName = 'PulsingDot';

export default React.memo(function ProbabilityChart({
    data,
    outcomes,
    bubbles,
    timeframe,
    setTimeframe,
    currentProbabilities,
    volume,
    resolutionDate,
    selectedOutcome,
    onOutcomeChange
}: ProbabilityChartProps) {
    const [hoverData, setHoverData] = useState<any>(null);
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));

    // OPTIMIZATION 1: Reduce heartbeat frequency to reduce re-renders
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Math.floor(Date.now() / 1000));
        }, 10000); // Changed from 5s to 10s for better performance
        return () => clearInterval(interval);
    }, []);

    // OPTIMIZATION 2: Deep memoization with stable references
    const outcomeKeys = useMemo(() => {
        return outcomes.map(o => typeof o === 'string' ? o : o.title);
    }, [outcomes]);

    // OPTIMIZATION 3: Memoize base data processing separately
    const baseSortedData = useMemo(() => {
        if (!data || data.length === 0) return null;
        return [...data].sort((a: any, b: any) => a.time - b.time);
    }, [data]);

    // OPTIMIZATION 4: Smart downsampling BEFORE sync
    const downsampledData = useMemo(() => {
        if (!baseSortedData) return null;

        // Adaptive downsampling based on data size
        const targetPoints = 500; // Increased from 300 for better quality
        if (baseSortedData.length <= targetPoints) return baseSortedData;

        const factor = Math.ceil(baseSortedData.length / targetPoints);
        return baseSortedData.filter((_, i) => i % factor === 0 || i === baseSortedData.length - 1);
    }, [baseSortedData]);

    // OPTIMIZATION 5: Sync with live data (minimal processing)
    const syncedData = useMemo(() => {
        if (!downsampledData) {
            const fallbackProbs: any = {};
            outcomeKeys.forEach(title => {
                fallbackProbs[title] = 100 / outcomeKeys.length;
            });
            return [{ time: now - 86400 * 365, ...fallbackProbs }, { time: now, ...fallbackProbs }];
        }

        const sorted = [...downsampledData];
        const last = sorted[sorted.length - 1];

        if (currentProbabilities && Object.keys(currentProbabilities).length > 0) {
            const livePoint: any = {
                time: now,
                ...currentProbabilities
            };

            // STABILITY FIX: Increase buffer to 30s to prevent jitter/bouncing of tail
            if (last && (now - last.time > 30)) {
                sorted.push(livePoint);
            } else if (last) {
                // In-place update for smoother animation
                sorted[sorted.length - 1] = { ...last, ...currentProbabilities, time: Math.max(last.time, now) };
            }
        } else if (last && now - last.time > 30) {
            sorted.push({ ...last, time: now });
        }

        return sorted;
    }, [downsampledData, outcomeKeys, currentProbabilities, now]);

    // OPTIMIZATION 6: Memoize timeframe calculation
    const timeframeConfig = useMemo(() => {
        const configs: Record<string, number> = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '1H': 3600,
            '6H': 21600,
            '1D': 86400,
            '1W': 604800,
            '1M': 2592000,
            'ALL': 0
        };
        return configs[timeframe] || 0;
    }, [timeframe]);

    // OPTIMIZATION 7: Efficient filtering with single pass
    const { filteredData, domainMin } = useMemo(() => {
        const cutoffSeconds = timeframeConfig;
        const windowStart = timeframe === 'ALL' ? (syncedData[0]?.time || now) : (now - cutoffSeconds);

        let filtered = syncedData;
        if (timeframe !== 'ALL') {
            filtered = syncedData.filter(d => d.time >= windowStart);

            if (filtered.length > 0 && filtered[0].time > windowStart) {
                const previousPoint = syncedData.filter(d => d.time < windowStart).pop();
                if (previousPoint) {
                    filtered = [{ ...previousPoint, time: windowStart }, ...filtered];
                } else {
                    filtered = [{ ...filtered[0], time: windowStart }, ...filtered];
                }
            }
        }

        if (filtered.length === 1) {
            filtered = [{ ...filtered[0], time: windowStart }, filtered[0]];
        }

        const dMin = timeframe === 'ALL' ? 'dataMin' : windowStart;
        return { filteredData: filtered, domainMin: dMin };
    }, [syncedData, timeframe, timeframeConfig, now]);

    // OPTIMIZATION 8: Stable display probabilities reference
    const displayProbs = useMemo(() => {
        return hoverData || currentProbabilities;
    }, [hoverData, currentProbabilities]);

    // OPTIMIZATION 9: Adaptive Y-Axis with stable calculation
    const { yAxisDomain, yAxisTicks } = useMemo(() => {
        if (['1D', '1W', '1M', 'ALL'].includes(timeframe)) {
            return {
                yAxisDomain: [0, 100] as [number, number],
                yAxisTicks: [0, 25, 50, 75, 100]
            };
        }

        if (!filteredData || filteredData.length === 0) {
            return {
                yAxisDomain: [0, 100] as [number, number],
                yAxisTicks: [0, 25, 50, 75, 100]
            };
        }

        let minVal = 100;
        let maxVal = 0;

        filteredData.forEach((point: any) => {
            outcomeKeys.forEach(title => {
                const val = point[title];
                if (typeof val === 'number') {
                    if (val < minVal) minVal = val;
                    if (val > maxVal) maxVal = val;
                }
            });
        });

        const spread = maxVal - minVal;
        const padding = Math.max(spread * 0.2, 10);
        const smartMin = Math.max(0, Math.floor((minVal - padding / 2) / 5) * 5);
        const smartMax = Math.min(100, Math.ceil((maxVal + padding / 2) / 5) * 5);

        const ticks = [];
        for (let i = smartMin; i <= smartMax; i += 5) {
            ticks.push(i);
        }

        return {
            yAxisDomain: [smartMin, smartMax] as [number, number],
            yAxisTicks: ticks
        };
    }, [filteredData, outcomeKeys, timeframe]);

    // OPTIMIZATION 10: Memoized handlers
    const handleMouseMove = useCallback((e: any) => {
        if (e.activePayload && e.activePayload.length > 0) {
            const payload = e.activePayload[0].payload;
            setHoverData(payload);
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHoverData(null);
    }, []);

    // OPTIMIZATION 11: Memoized timeframe formatter
    const tickFormatter = useCallback((val: number) => {
        if (!val || typeof val !== 'number' || val <= 0) return '';
        const date = new Date(val * 1000);
        if (isNaN(date.getTime())) return '';

        switch (timeframe) {
            case '1m':
            case '5m':
            case '15m':
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            case '1H':
            case '6H':
            case '1D':
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            case '1W':
            case '1M':
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            case 'ALL':
                // For ALL, show date if range > 1 day, else time
                const range = (filteredData[filteredData.length - 1]?.time || 0) - (filteredData[0]?.time || 0);
                if (range > 86400) return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            default:
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }, [timeframe, filteredData]);

    return (
        <div className="w-full h-full flex flex-col relative group">
            {/* GLASSMORPHISM BACKGROUND */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl shadow-black/50" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 rounded-2xl pointer-events-none" />

            {/* BRAND HEADER */}
            <div className="absolute top-2 right-10 z-20 flex items-center gap-0 pointer-events-none">
                <div className="relative w-12 h-12 -mr-1.5">
                    <Image src="/djinn-logo.png?v=3" alt="Djinn Logo" fill className="object-contain" priority unoptimized />
                </div>
                <span className="text-2xl text-white mt-0.5 relative z-10" style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                    Djinn
                </span>
            </div>

            {/* VOLUME */}
            <div className="absolute bottom-2 left-4 z-30 pointer-events-none">
                {volume && (
                    <span className="text-sm font-medium text-zinc-100 font-mono tracking-tight shadow-black drop-shadow-md">
                        {volume} <span className="text-zinc-500 ml-0.5">vol</span>
                    </span>
                )}
            </div>

            {/* TIMEFRAMES - OPTIMIZED: Memoized buttons */}
            <div className="absolute bottom-2 right-4 z-30 flex gap-0.5 pointer-events-auto">
                {['1m', '5m', '15m', '1H', '6H', '1D', '1W', '1M', 'ALL'].map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf as any)}
                        className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-black transition-all whitespace-nowrap backdrop-blur-sm cursor-pointer border border-transparent hover:border-white/20",
                            timeframe === tf
                                ? "bg-white text-black shadow-lg shadow-white/10 scale-105"
                                : "text-zinc-400 hover:text-white hover:bg-white/10"
                        )}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-4 pointer-events-none">
                {outcomeKeys.map((title, idx) => {
                    const color = getOutcomeColor(title, idx);
                    const val = displayProbs[title] ?? 0;
                    return (
                        <div key={title} className="flex items-center gap-2 bg-zinc-950/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-zinc-800/30">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full ring-1 ring-white/20" style={{ backgroundColor: color }} />
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">{title}</span>
                            </div>
                            <span className="text-lg font-black tabular-nums tracking-tight leading-none" style={{ color: color }}>
                                {val.toFixed(0)}<span className="text-[10px] align-top opacity-50 ml-0.5">%</span>
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* BUBBLES - OPTIMIZED: Removed excessive animations */}
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                <AnimatePresence mode="popLayout">
                    {bubbles.slice(0, 5).map(b => ( // Limit to 5 bubbles max
                        <motion.div
                            key={b.id}
                            initial={{ opacity: 0, x: -20, scale: 0.8 }}
                            animate={{ opacity: 1, x: 20, y: -50, scale: 1 }}
                            exit={{ opacity: 0, y: -100 }}
                            transition={{ duration: 3, ease: "easeOut" }}
                            style={{ top: `${b.y}%`, left: '0%' }}
                            className="absolute flex items-center gap-2"
                        >
                            <div
                                className="px-3 py-1 rounded-full bg-zinc-900/90 border text-xs font-bold shadow-xl backdrop-blur-md whitespace-nowrap"
                                style={{ color: b.color, borderColor: b.color }}
                            >
                                {b.text}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* CHART - CRITICAL OPTIMIZATIONS */}
            <div className="flex-1 w-full min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={filteredData}
                        margin={{ top: 80, right: 25, left: 10, bottom: 60 }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        <CartesianGrid
                            vertical={false}
                            stroke="#ffffff"
                            strokeOpacity={0.15}
                            strokeWidth={1}
                            strokeDasharray="2 4"
                        />
                        <XAxis
                            dataKey="time"
                            type="number"
                            scale="linear"
                            domain={['dataMin', 'dataMax']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#ffffff', fontSize: 12, fontWeight: 700 }}
                            dy={10}
                            minTickGap={80} // Increased from 50 to prevent overlap (blurry text)
                            tickCount={5}   // Reduced from 6 for cleaner layout
                        />
                        <YAxis
                            orientation="right"
                            domain={yAxisDomain}
                            ticks={yAxisTicks}
                            allowDataOverflow={true}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 700 }}
                            tickFormatter={(val) => `${val}%`}
                            width={35}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '5 5' }} />
                        {outcomeKeys.map((title, idx) => {
                            const color = getOutcomeColor(title, idx);
                            return (
                                <Line
                                    key={title}
                                    type="monotone"
                                    dataKey={title}
                                    stroke={color}
                                    strokeWidth={3}
                                    dot={(props: any) => {
                                        const { index, cx, ...restProps } = props;
                                        if (index === filteredData.length - 1) {
                                            return <PulsingDot {...restProps} cx={cx - 6} stroke={color} />;
                                        }
                                        return null;
                                    }}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                    connectNulls
                                    style={{ cursor: 'pointer', filter: `drop-shadow(0 0 4px ${color})` }}
                                    onClick={() => onOutcomeChange?.(title)}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // OPTIMIZATION 12: Custom comparison for React.memo
    return (
        prevProps.timeframe === nextProps.timeframe &&
        prevProps.selectedOutcome === nextProps.selectedOutcome &&
        prevProps.data === nextProps.data &&
        prevProps.currentProbabilities === nextProps.currentProbabilities &&
        prevProps.volume === nextProps.volume
    );
});
