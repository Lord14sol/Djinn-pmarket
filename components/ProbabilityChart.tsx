"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
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

// POLYMARKET-STYLE TOOLTIP - Floating with big numbers
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
                    minute: '2-digit'
                });
            }
        } catch {
            formattedDate = '';
        }
    }

    return (
        <div className="bg-[#1a1d2e] rounded-lg p-3 border border-gray-700 pointer-events-none shadow-xl min-w-[180px]">
            {formattedDate && (
                <div className="text-center mb-2 pb-2 border-b border-gray-700">
                    <span className="text-[11px] font-mono text-gray-400">
                        {formattedDate}
                    </span>
                </div>
            )}
            <div className="flex flex-col gap-2">
                {payload
                    .filter((p: any) => p.value !== undefined && p.value !== null && typeof p.value === 'number')
                    .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
                    .map((p: any) => (
                        <div key={p.name} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: p.stroke }}
                                />
                                <span className="text-xs font-semibold text-gray-300">
                                    {p.name}
                                </span>
                            </div>
                            <span
                                className="text-lg font-black tabular-nums"
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

// PULSING DOT at end of line
const PulsingDot = React.memo((props: any) => {
    const { cx, cy, stroke } = props;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

    return (
        <g>
            <motion.circle
                cx={cx}
                cy={cy}
                r="10"
                fill="none"
                stroke={stroke}
                strokeWidth={2}
                initial={{ r: 6, opacity: 0.8 }}
                animate={{ r: 16, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
            <circle cx={cx} cy={cy} r="5" fill={stroke} stroke="#1a1d2e" strokeWidth={2} />
        </g>
    );
});

PulsingDot.displayName = 'PulsingDot';

// TIMEFRAMES
const TIMEFRAMES = {
    '1H': { label: '1H', seconds: 3600 },
    '6H': { label: '6H', seconds: 21600 },
    '1D': { label: '1D', seconds: 86400 },
    '1W': { label: '1W', seconds: 604800 },
    '1M': { label: '1M', seconds: 2592000 },
    'ALL': { label: 'ALL', seconds: Infinity }
} as const;

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

    // Time format
    const formatTimeLabel = (timestamp: number, tf: string): string => {
        const date = new Date(timestamp * 1000);
        switch (tf) {
            case '1H':
            case '6H':
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            case '1D':
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            case '1W':
            case '1M':
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            case 'ALL':
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            default:
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
    };

    useEffect(() => {
        const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(interval);
    }, []);

    const outcomeKeys = useMemo(() => outcomes.map(o => typeof o === 'string' ? o : o.title), [outcomes]);

    const baseSortedData = useMemo(() => {
        if (!data || data.length === 0) return null;
        const sorted = [...data].sort((a: any, b: any) => a.time - b.time);
        const uniqueData: any[] = [];
        let lastTime = -1;
        for (const point of sorted) {
            if (!point.time || isNaN(point.time)) continue;
            if (point.time !== lastTime) {
                uniqueData.push(point);
                lastTime = point.time;
            } else {
                uniqueData[uniqueData.length - 1] = point;
            }
        }
        return uniqueData;
    }, [data]);

    const downsampledData = useMemo(() => {
        if (!baseSortedData) return null;
        const targetPoints = 500;
        if (baseSortedData.length <= targetPoints) return baseSortedData;
        const factor = Math.ceil(baseSortedData.length / targetPoints);
        return baseSortedData.filter((_, i) => i % factor === 0 || i === baseSortedData.length - 1);
    }, [baseSortedData]);

    const syncedData = useMemo(() => {
        if (!downsampledData) {
            const fallbackProbs: any = {};
            outcomeKeys.forEach(title => { fallbackProbs[title] = 100 / outcomeKeys.length; });
            return [{ time: now - 86400 * 365, ...fallbackProbs }, { time: now, ...fallbackProbs }];
        }
        const sorted = [...downsampledData];
        const last = sorted[sorted.length - 1];
        if (currentProbabilities && Object.keys(currentProbabilities).length > 0) {
            const livePoint: any = { time: now, ...currentProbabilities };
            if (last && (now - last.time > 30)) sorted.push(livePoint);
            else if (last) sorted[sorted.length - 1] = { ...last, ...currentProbabilities, time: Math.max(last.time, now) };
        } else if (last && now - last.time > 30) sorted.push({ ...last, time: now });
        return sorted;
    }, [downsampledData, outcomeKeys, currentProbabilities, now]);

    const { filteredData, domainMin, domainMax } = useMemo(() => {
        if (!syncedData || syncedData.length === 0) return { filteredData: [], domainMin: 'dataMin', domainMax: 'dataMax' };
        const config = TIMEFRAMES[timeframe as keyof typeof TIMEFRAMES] || TIMEFRAMES['1H'];
        const windowStart = config.seconds === Infinity ? 0 : now - config.seconds;
        let filtered = syncedData.filter((d: any) => d.time >= windowStart && d.time <= now);
        if (filtered.length === 0 && syncedData.length > 0) {
            const lastPoint = syncedData[syncedData.length - 1];
            filtered = [{ ...lastPoint, time: windowStart }, { ...lastPoint, time: now }];
        } else if (filtered.length === 1) {
            const singlePoint = filtered[0];
            filtered = [{ ...singlePoint, time: windowStart }, singlePoint, { ...singlePoint, time: now }];
        } else if (filtered.length > 0 && filtered[0].time > windowStart) {
            const firstInsideIndex = syncedData.indexOf(filtered[0]);
            if (firstInsideIndex > 0) filtered.unshift({ ...syncedData[firstInsideIndex - 1], time: windowStart });
            else filtered.unshift({ ...filtered[0], time: windowStart });
        }
        return {
            filteredData: filtered,
            domainMin: timeframe === 'ALL' && syncedData.length > 0 ? syncedData[0].time : windowStart,
            domainMax: now
        };
    }, [syncedData, timeframe, now]);

    const displayProbs = useMemo(() => hoverData || currentProbabilities, [hoverData, currentProbabilities]);

    const handleMouseMove = useCallback((e: any) => {
        if (e.activePayload && e.activePayload.length > 0) setHoverData(e.activePayload[0].payload);
    }, []);

    const handleMouseLeave = useCallback(() => setHoverData(null), []);

    return (
        <div className="w-full h-full flex flex-col relative bg-[#1a1d2e] rounded-2xl overflow-hidden">
            {/* LEGEND BAR - Polymarket style */}
            <div className="px-5 pt-4 pb-2 flex flex-wrap items-center gap-x-6 gap-y-2">
                {outcomeKeys.map((title, idx) => {
                    const color = getOutcomeColor(title, idx);
                    const val = displayProbs[title] ?? 0;
                    return (
                        <div
                            key={title}
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => onOutcomeChange?.(title)}
                        >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-sm text-gray-300 font-medium">{title}</span>
                            <span className="text-sm font-bold" style={{ color }}>{val.toFixed(0)}%</span>
                        </div>
                    );
                })}
            </div>

            {/* BIG NUMBERS - Hover indicator at top right */}
            {hoverData && (
                <div className="absolute top-3 right-4 z-20 flex flex-col items-end gap-1">
                    {outcomeKeys.map((title, idx) => {
                        const color = getOutcomeColor(title, idx);
                        const val = hoverData[title] ?? 0;
                        return (
                            <div key={title} className="flex items-center gap-2 bg-[#2a2d3e]/90 backdrop-blur-sm px-3 py-1 rounded-lg">
                                <span className="text-xs text-gray-400">{title}</span>
                                <span className="text-2xl font-black tabular-nums" style={{ color }}>
                                    {val.toFixed(1)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CHART */}
            <div className="flex-1 w-full min-h-0 relative px-2">
                {/* Trade Bubbles */}
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    <AnimatePresence mode="popLayout">
                        {bubbles.slice(0, 3).map(b => (
                            <motion.div
                                key={b.id}
                                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                                animate={{ opacity: 1, x: 30, y: -40, scale: 1 }}
                                exit={{ opacity: 0, y: -80 }}
                                transition={{ duration: 3, ease: "easeOut" }}
                                style={{ top: `${b.y}%`, left: '2%' }}
                                className="absolute"
                            >
                                <div
                                    className="px-3 py-1.5 rounded-lg bg-[#2a2d3e]/90 backdrop-blur-sm text-sm font-bold"
                                    style={{ color: b.color }}
                                >
                                    {b.text}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={filteredData}
                        margin={{ top: 20, right: 50, left: 10, bottom: 10 }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* Grid lines - subtle horizontal only */}
                        <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
                        <ReferenceLine y={25} stroke="#374151" strokeWidth={1} strokeDasharray="3 3" />
                        <ReferenceLine y={50} stroke="#374151" strokeWidth={1} strokeDasharray="3 3" />
                        <ReferenceLine y={75} stroke="#374151" strokeWidth={1} strokeDasharray="3 3" />
                        <ReferenceLine y={100} stroke="#374151" strokeWidth={1} />

                        <XAxis
                            dataKey="time"
                            type="number"
                            scale="time"
                            domain={[domainMin || 'dataMin', domainMax || 'dataMax']}
                            axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                            tickLine={false}
                            tickFormatter={(timestamp) => formatTimeLabel(timestamp, timeframe)}
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                            minTickGap={60}
                        />

                        <YAxis
                            orientation="right"
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                            axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                            tickFormatter={(val) => `${val}%`}
                            width={45}
                        />

                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />

                        {/* LINES - Polymarket stepAfter style, clean without shadows */}
                        {outcomeKeys.map((title, idx) => {
                            const color = getOutcomeColor(title, idx);
                            return (
                                <Line
                                    key={title}
                                    type="stepAfter"
                                    dataKey={title}
                                    stroke={color}
                                    strokeWidth={2.5}
                                    dot={(props: any) => {
                                        const { index, cx, ...restProps } = props;
                                        if (index === filteredData.length - 1) {
                                            return <PulsingDot {...restProps} cx={cx} stroke={color} />;
                                        }
                                        return null;
                                    }}
                                    activeDot={{ r: 6, strokeWidth: 2, fill: color, stroke: '#1a1d2e' }}
                                    isAnimationActive={false}
                                    connectNulls
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* BOTTOM BAR - Volume & Timeframes */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-gray-700/50">
                {/* Volume & Date */}
                <div className="flex items-center gap-4 text-xs">
                    {volume && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Vol:</span>
                            <span className="text-white font-semibold">{volume}</span>
                        </div>
                    )}
                    {resolutionDate && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Ends:</span>
                            <span className="text-white font-semibold">{resolutionDate}</span>
                        </div>
                    )}
                </div>

                {/* Timeframe Selector */}
                <div className="flex items-center gap-1 bg-[#2a2d3e] rounded-lg p-1">
                    {Object.keys(TIMEFRAMES).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf as any)}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                                timeframe === tf
                                    ? "bg-[#3b3f54] text-white"
                                    : "text-gray-400 hover:text-white hover:bg-[#3b3f54]/50"
                            )}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* BRAND WATERMARK */}
            <div className="absolute top-3 right-4 flex items-center gap-1.5 opacity-40 pointer-events-none">
                <div className="relative w-6 h-6">
                    <Image src="/djinn-logo.png?v=3" alt="Djinn" fill className="object-contain" priority unoptimized />
                </div>
                <span className="text-sm text-white font-semibold" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                    Djinn
                </span>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.timeframe === nextProps.timeframe &&
        prevProps.selectedOutcome === nextProps.selectedOutcome &&
        prevProps.data === nextProps.data &&
        prevProps.currentProbabilities === nextProps.currentProbabilities &&
        prevProps.volume === nextProps.volume
    );
});
