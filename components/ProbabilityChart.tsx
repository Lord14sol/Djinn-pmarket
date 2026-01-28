"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { cn, formatCompact } from "@/lib/utils";
import { getOutcomeColor } from "@/lib/market-colors";
import { Clock, BarChart3 } from "lucide-react";

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

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Get timestamp from payload's data point (more reliable than label)
    const dataPoint = payload[0]?.payload;
    const timestamp = dataPoint?.time || Number(label);

    // Format date based on timestamp validity
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
            {/* Date at the Top */}
            {formattedDate && (
                <div className="text-center mb-3 pb-2 border-b border-white/10">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                        {formattedDate}
                    </span>
                </div>
            )}

            {/* Large Percentage Data Points */}
            <div className="flex flex-col gap-2 items-start">
                {payload
                    .filter((p: any) => p.value !== undefined && p.value !== null && typeof p.value === 'number')
                    .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
                    .map((p: any) => (
                        <div key={p.name} className="flex flex-col">
                            {/* Line Name (Small) */}
                            <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: p.stroke }}>
                                {p.name}
                            </span>
                            {/* Big Number (Colored) */}
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
};

// Pulsing Dot Component (Clean & Modern)
const PulsingDot = (props: any) => {
    const { cx, cy, stroke } = props;
    // Removed internal offset - use cx directly

    // Safety check
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

    return (
        <g>
            {/* Outer Pulsing Ring - Larger & clearer */}
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
            {/* Inner Solid Dot - Pure Color, No White Border */}
            <circle cx={cx} cy={cy} r="5" fill={stroke} />
        </g>
    );
};

export default function ProbabilityChart({
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
    // HEARTBEAT: Force update every 5 seconds to keep the chart "moving"
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Math.floor(Date.now() / 1000));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // PASO 1: Construir dataset (Optimized)

    // 1a. Memoize base sorting (expensive operation)
    const baseSortedData = useMemo(() => {
        if (!data || data.length === 0) return null;
        return [...data].sort((a: any, b: any) => a.time - b.time);
    }, [data]);

    // 1b. Apply live updates (cheap operation)
    const syncedData = useMemo(() => {
        if (!baseSortedData) {
            // Fallback for empty data
            const fallbackProbs: any = {};
            outcomes.forEach(o => {
                const title = typeof o === 'string' ? o : o.title;
                fallbackProbs[title] = 100 / outcomes.length;
            });
            return [{ time: now - 86400 * 365, ...fallbackProbs }, { time: now, ...fallbackProbs }];
        }

        const sorted = [...baseSortedData];
        const last = sorted[sorted.length - 1];

        if (currentProbabilities && Object.keys(currentProbabilities).length > 0) {
            const livePoint: any = {
                time: now,
                ...currentProbabilities
            };

            // Append live point if significant time passed
            if (last && (now - last.time > 5)) {
                sorted.push(livePoint);
            } else if (last) {
                // Update last point if very recent (Immutable update)
                sorted[sorted.length - 1] = { ...last, ...currentProbabilities };
            }
        } else if (last && now - last.time > 10) {
            sorted.push({ ...last, time: now });
        }

        return sorted;
    }, [baseSortedData, outcomes, currentProbabilities, now]);

    // PASO 2: Determine Cutoff and Domain
    const { filteredData, domainMin } = useMemo(() => {
        let cutoffSeconds = 0;

        switch (timeframe) {
            case '1m': cutoffSeconds = 60; break;
            case '5m': cutoffSeconds = 300; break;
            case '15m': cutoffSeconds = 900; break;
            case '1H': cutoffSeconds = 3600; break;
            case '6H': cutoffSeconds = 21600; break;
            case '1D': cutoffSeconds = 86400; break;
            case '1W': cutoffSeconds = 604800; break;
            case '1M': cutoffSeconds = 2592000; break; // 30 Days
            case 'ALL': cutoffSeconds = 0; break;
        }

        const windowStart = timeframe === 'ALL' ? (syncedData[0]?.time || now) : (now - cutoffSeconds);

        // Filter Data
        let filtered = syncedData;
        if (timeframe !== 'ALL') {
            filtered = syncedData.filter(d => d.time >= windowStart);
        }

        // CRITICAL FIX: Ensure we have a point at 'windowStart' for the lines to draw from the left edge
        if (timeframe !== 'ALL' && filtered.length > 0 && filtered[0].time > windowStart) {
            // Find the last point in full data that is BEFORE windowStart
            const previousPoint = syncedData.filter(d => d.time < windowStart).pop();
            if (previousPoint) {
                filtered = [{ ...previousPoint, time: windowStart }, ...filtered];
            } else {
                filtered = [{ ...filtered[0], time: windowStart }, ...filtered];
            }
        }

        // Ensure at least 2 points for valid line drawing
        if (filtered.length === 1) {
            filtered = [{ ...filtered[0], time: windowStart }, filtered[0]];
        }

        // OPTIMIZATION: Downsample massive datasets for performance (Max ~300 points)
        // Recharts lags with >1000 points.
        if (filtered.length > 300) {
            const factor = Math.ceil(filtered.length / 300);
            filtered = filtered.filter((_, i) => i % factor === 0 || i === filtered.length - 1);
        }

        const dMin = timeframe === 'ALL' ? 'dataMin' : windowStart;

        return { filteredData: filtered, domainMin: dMin };
    }, [syncedData, timeframe, now]);

    // Display Data (Hover vs Current)
    const displayProbs = hoverData || currentProbabilities;

    return (
        <div className="w-full h-full flex flex-col relative group">
            {/* GLASSMORPHISM BACKGROUND */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl shadow-black/50" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 rounded-2xl pointer-events-none" />

            {/* BRAND HEADER: TOP RIGHT - Star/Logo First, then Name - Shifted slightly left */}
            <div className="absolute top-2 right-10 z-20 flex items-center gap-0 pointer-events-none">
                <div className="relative w-12 h-12 -mr-1.5">
                    <Image src="/djinn-logo.png?v=3" alt="Djinn Logo" fill className="object-contain" priority unoptimized />
                </div>
                <span className="text-2xl text-white mt-0.5 relative z-10" style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                    Djinn
                </span>
            </div>

            {/* HEADER: TOP RIGHT (Timeframes) */}


            {/* HEADER: BOTTOM LEFT (Volume Only - Plain Text) */}
            <div className="absolute bottom-4 left-4 z-30 pointer-events-none">
                {volume && (
                    <span className="text-sm font-medium text-zinc-100 font-mono tracking-tight shadow-black drop-shadow-md">
                        {volume} <span className="text-zinc-500 ml-0.5">vol</span>
                    </span>
                )}
            </div>

            {/* HEADER: BOTTOM RIGHT (Timeframes - Moved Lower) */}
            <div className="absolute bottom-1 right-4 z-30 flex gap-0.5 pointer-events-auto">
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

            {/* PRO LEGEND HEADER (Moved to top left to align with branding) */}
            <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-4 pointer-events-none">
                {outcomes.map((o) => {
                    const title = typeof o === 'string' ? o : o.title;
                    const color = getOutcomeColor(title);
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

            {/* BUBBLES */}
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
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

            {/* CHART */}
            <div className="flex-1 w-full min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        key={`chart-${timeframe}`}
                        data={filteredData}
                        margin={{ top: 80, right: 25, left: 10, bottom: 5 }}
                        onMouseMove={(e) => {
                            if (e.activePayload && e.activePayload.length > 0) {
                                const payload = e.activePayload[0].payload;
                                setHoverData(payload);
                            }
                        }}
                        onMouseLeave={() => setHoverData(null)}
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
                            tick={{ fill: '#ffffff', fontSize: 10, fontWeight: 600 }}
                            interval="preserveStartEnd"
                            tickFormatter={(val) => {
                                if (!val || typeof val !== 'number' || val <= 0) return '';
                                const date = new Date(val * 1000);
                                if (isNaN(date.getTime())) return '';

                                // Format based on timeframe
                                if (timeframe === '1m') {
                                    return date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
                                }
                                if (timeframe === '5m' || timeframe === '15m') {
                                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                                if (timeframe === '1H' || timeframe === '6H') {
                                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                                if (timeframe === '1D') {
                                    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                }
                                // Long timeframes: date only
                                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                            }}
                            minTickGap={50}
                            tickCount={6}
                        />
                        <YAxis
                            orientation="right"
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 700 }} // White & Bolder
                            tickFormatter={(val) => `${val}%`}
                            width={35}
                        />
                        <Tooltip content={CustomTooltip} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '5 5' }} />

                        {outcomes.map((o) => {
                            const title = typeof o === 'string' ? o : o.title;
                            const color = getOutcomeColor(title);
                            return (
                                <Line
                                    key={title}
                                    type="monotone"
                                    dataKey={title}
                                    stroke={color}
                                    strokeWidth={3}
                                    dot={(props: any) => {
                                        const { index, cx, ...restProps } = props;
                                        // Only show dot for the LAST data point
                                        if (index === filteredData.length - 1) {
                                            // Shift back slightly (6px) - dots stay inside chart area
                                            return <PulsingDot {...restProps} cx={cx - 6} key={title} stroke={color} />;
                                        }
                                        return <></>;
                                    }}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                                    isAnimationActive={false} // CRITICAL for performance on timeframe switch
                                    animationDuration={0}
                                    connectNulls
                                    style={{ cursor: 'pointer', filter: `drop-shadow(0 0 4px ${color})` }} // Light glow only
                                    onClick={() => onOutcomeChange?.(title)}
                                />
                            );
                        })}

                        <Brush
                            dataKey="time"
                            height={20}
                            stroke="transparent"
                            fill="transparent"
                            tickFormatter={() => ''}
                            travellerWidth={10}
                            wrapperStyle={{ opacity: 0.5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* OLD TIMEFRAME CONTROLS REMOVED */}
        </div>
    );
}
