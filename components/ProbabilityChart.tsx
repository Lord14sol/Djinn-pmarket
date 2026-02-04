"use client";
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
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

// NEO-BRUTALIST CUSTOM TOOLTIP - Big Numbers like Polymarket/Kalshi
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
        <div className="bg-white rounded-xl p-4 border-4 border-black pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-w-[160px]">
            {formattedDate && (
                <div className="text-center mb-3 pb-2 border-b-2 border-black/20">
                    <span className="text-[10px] font-black text-black/60 uppercase tracking-wider">
                        {formattedDate}
                    </span>
                </div>
            )}
            <div className="flex flex-col gap-3">
                {payload
                    .filter((p: any) => p.value !== undefined && p.value !== null && typeof p.value === 'number')
                    .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))
                    .map((p: any) => (
                        <div key={p.name} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full border-2 border-black"
                                    style={{ backgroundColor: p.stroke }}
                                />
                                <span className="text-xs font-black uppercase tracking-wider text-black">
                                    {p.name}
                                </span>
                            </div>
                            <span
                                className="text-2xl font-black tabular-nums tracking-tighter"
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

// PULSING DOT - Live indicator at line end
const PulsingDot = React.memo((props: any) => {
    const { cx, cy, stroke } = props;

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

    return (
        <g>
            <motion.circle
                cx={cx}
                cy={cy}
                r="8"
                fill="none"
                stroke={stroke}
                strokeWidth={2}
                initial={{ r: 8, opacity: 0.6 }}
                animate={{ r: 20, opacity: 0 }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />
            <circle
                cx={cx}
                cy={cy}
                r="6"
                fill={stroke}
                stroke="white"
                strokeWidth={3}
            />
        </g>
    );
});

PulsingDot.displayName = 'PulsingDot';

// TIMEFRAMES CONFIG
const TIMEFRAMES = {
    '1m': { label: '1m', seconds: 60 },
    '5m': { label: '5m', seconds: 300 },
    '15m': { label: '15m', seconds: 900 },
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

    // Time Format Helper
    const formatTimeLabel = (timestamp: number, tf: string): string => {
        const date = new Date(timestamp * 1000);
        switch (tf) {
            case '1m':
            case '5m':
            case '15m':
            case '1H':
            case '6H':
                return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            case '1D':
                return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
            case '1W':
            case '1M':
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            case 'ALL':
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
            default:
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
    };

    // 1s tick for live updates
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Math.floor(Date.now() / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Outcome keys
    const outcomeKeys = useMemo(() => {
        return outcomes.map(o => typeof o === 'string' ? o : o.title);
    }, [outcomes]);

    // Sort and dedupe data
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

    // Downsample for performance
    const downsampledData = useMemo(() => {
        if (!baseSortedData) return null;
        const targetPoints = 500;
        if (baseSortedData.length <= targetPoints) return baseSortedData;
        const factor = Math.ceil(baseSortedData.length / targetPoints);
        return baseSortedData.filter((_, i) => i % factor === 0 || i === baseSortedData.length - 1);
    }, [baseSortedData]);

    // Sync with live data
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
            const livePoint: any = { time: now, ...currentProbabilities };
            if (last && (now - last.time > 30)) {
                sorted.push(livePoint);
            } else if (last) {
                sorted[sorted.length - 1] = { ...last, ...currentProbabilities, time: Math.max(last.time, now) };
            }
        } else if (last && now - last.time > 30) {
            sorted.push({ ...last, time: now });
        }

        return sorted;
    }, [downsampledData, outcomeKeys, currentProbabilities, now]);

    // Filter by timeframe
    const { filteredData, domainMin, domainMax } = useMemo(() => {
        if (!syncedData || syncedData.length === 0) {
            return { filteredData: [], domainMin: 'dataMin', domainMax: 'dataMax' };
        }

        const config = TIMEFRAMES[timeframe as keyof typeof TIMEFRAMES] || TIMEFRAMES['1H'];
        const windowStart = config.seconds === Infinity ? 0 : now - config.seconds;

        let filtered = syncedData.filter((d: any) => d.time >= windowStart && d.time <= now);

        if (filtered.length === 0 && syncedData.length > 0) {
            const lastPoint = syncedData[syncedData.length - 1];
            filtered = [{ ...lastPoint, time: windowStart }, { ...lastPoint, time: now }];
        } else if (filtered.length === 1) {
            const singlePoint = filtered[0];
            filtered = [{ ...singlePoint, time: windowStart }, singlePoint, { ...singlePoint, time: now }];
        } else if (filtered.length > 0) {
            if (filtered[0].time > windowStart) {
                const firstInsideIndex = syncedData.indexOf(filtered[0]);
                if (firstInsideIndex > 0) {
                    const prev = syncedData[firstInsideIndex - 1];
                    filtered.unshift({ ...prev, time: windowStart });
                } else {
                    filtered.unshift({ ...filtered[0], time: windowStart });
                }
            }
        }

        return {
            filteredData: filtered,
            domainMin: timeframe === 'ALL' && syncedData.length > 0 ? syncedData[0].time : windowStart,
            domainMax: now
        };
    }, [syncedData, timeframe, now]);

    // Display probabilities (hover or current)
    const displayProbs = useMemo(() => {
        return hoverData || currentProbabilities;
    }, [hoverData, currentProbabilities]);

    // Y-Axis domain
    const { yAxisDomain, yAxisTicks } = useMemo(() => {
        if (['1D', '1W', '1M', 'ALL'].includes(timeframe)) {
            return { yAxisDomain: [0, 100] as [number, number], yAxisTicks: [0, 25, 50, 75, 100] };
        }

        if (!filteredData || filteredData.length === 0) {
            return { yAxisDomain: [0, 100] as [number, number], yAxisTicks: [0, 25, 50, 75, 100] };
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
        for (let i = smartMin; i <= smartMax; i += 25) {
            ticks.push(i);
        }
        if (!ticks.includes(smartMin)) ticks.unshift(smartMin);
        if (!ticks.includes(smartMax)) ticks.push(smartMax);

        return { yAxisDomain: [smartMin, smartMax] as [number, number], yAxisTicks: [...new Set(ticks)].sort((a, b) => a - b) };
    }, [filteredData, outcomeKeys, timeframe]);

    // Mouse handlers
    const handleMouseMove = useCallback((e: any) => {
        if (e.activePayload && e.activePayload.length > 0) {
            const payload = e.activePayload[0].payload;
            setHoverData(payload);
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHoverData(null);
    }, []);

    return (
        <div className="w-full h-full flex flex-col relative">
            {/* NEO-BRUTALIST CHART CONTAINER */}
            <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col h-full">

                {/* TOP BAR - Outcomes with Big Numbers */}
                <div className="bg-gray-50 border-b-4 border-black px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* OUTCOME LEGEND WITH BIG NUMBERS */}
                        <div className="flex items-center gap-4">
                            {outcomeKeys.map((title, idx) => {
                                const color = getOutcomeColor(title, idx);
                                const val = displayProbs[title] ?? 0;
                                const isHovered = hoverData !== null;

                                return (
                                    <div
                                        key={title}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2 rounded-xl border-2 border-black transition-all cursor-pointer",
                                            selectedOutcome === title
                                                ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                                                : "bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                                        )}
                                        onClick={() => onOutcomeChange?.(title)}
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full border-2 border-black"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className={cn(
                                            "text-sm font-black uppercase tracking-wider",
                                            selectedOutcome === title ? "text-white" : "text-black"
                                        )}>
                                            {title}
                                        </span>
                                        <span
                                            className={cn(
                                                "text-3xl font-black tabular-nums tracking-tighter transition-all",
                                                isHovered ? "scale-110" : ""
                                            )}
                                            style={{ color: selectedOutcome === title ? 'white' : color }}
                                        >
                                            {val.toFixed(1)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* BRAND */}
                        <div className="flex items-center gap-1.5 opacity-60">
                            <div className="relative w-8 h-8">
                                <Image src="/djinn-logo.png?v=3" alt="Djinn" fill className="object-contain" priority unoptimized />
                            </div>
                            <span className="text-lg text-black font-bold" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                                Djinn
                            </span>
                        </div>
                    </div>
                </div>

                {/* CHART AREA - Clean Lines Only */}
                <div className="flex-1 w-full min-h-0 relative bg-white p-4">
                    {/* Trade Bubbles */}
                    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                        <AnimatePresence mode="popLayout">
                            {bubbles.slice(0, 3).map(b => (
                                <motion.div
                                    key={b.id}
                                    initial={{ opacity: 0, x: -20, scale: 0.8 }}
                                    animate={{ opacity: 1, x: 40, y: -60, scale: 1 }}
                                    exit={{ opacity: 0, y: -120 }}
                                    transition={{ duration: 3, ease: "easeOut" }}
                                    style={{ top: `${b.y}%`, left: '5%' }}
                                    className="absolute"
                                >
                                    <div
                                        className="px-4 py-2 rounded-xl bg-white border-2 border-black text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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
                            margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                        >
                            {/* HORIZONTAL GRID LINES - Clean dashed */}
                            {yAxisTicks.map((tick) => (
                                <ReferenceLine
                                    key={tick}
                                    y={tick}
                                    stroke="#e5e7eb"
                                    strokeWidth={1}
                                    strokeDasharray="6 4"
                                />
                            ))}

                            {/* X AXIS */}
                            <XAxis
                                dataKey="time"
                                type="number"
                                scale="time"
                                domain={[domainMin || 'dataMin', domainMax || 'dataMax']}
                                axisLine={{ stroke: '#000', strokeWidth: 2 }}
                                tickLine={{ stroke: '#000', strokeWidth: 1 }}
                                tickFormatter={(timestamp) => formatTimeLabel(timestamp, timeframe)}
                                tick={{ fill: '#000', fontSize: 11, fontWeight: 700 }}
                                minTickGap={60}
                            />

                            {/* Y AXIS */}
                            <YAxis
                                orientation="right"
                                domain={yAxisDomain}
                                ticks={yAxisTicks}
                                allowDataOverflow={true}
                                axisLine={{ stroke: '#000', strokeWidth: 2 }}
                                tickLine={{ stroke: '#000', strokeWidth: 1 }}
                                tick={{ fill: '#000', fontSize: 12, fontWeight: 700 }}
                                tickFormatter={(val) => `${val}%`}
                                width={50}
                            />

                            {/* TOOLTIP */}
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{
                                    stroke: '#000',
                                    strokeWidth: 2,
                                    strokeDasharray: '6 4'
                                }}
                            />

                            {/* LINES - Clean, no shadows, step interpolation */}
                            {outcomeKeys.map((title, idx) => {
                                const color = getOutcomeColor(title, idx);
                                return (
                                    <Line
                                        key={title}
                                        type="stepAfter"
                                        dataKey={title}
                                        stroke={color}
                                        strokeWidth={3}
                                        dot={(props: any) => {
                                            const { index, cx, ...restProps } = props;
                                            if (index === filteredData.length - 1) {
                                                return <PulsingDot {...restProps} cx={cx} stroke={color} />;
                                            }
                                            return null;
                                        }}
                                        activeDot={{
                                            r: 8,
                                            strokeWidth: 3,
                                            fill: color,
                                            stroke: '#fff'
                                        }}
                                        isAnimationActive={false}
                                        connectNulls
                                        onClick={() => onOutcomeChange?.(title)}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* BOTTOM BAR - Volume & Timeframes */}
                <div className="bg-gray-50 border-t-4 border-black px-6 py-3 flex items-center justify-between">
                    {/* VOLUME */}
                    <div className="flex items-center gap-4">
                        {volume && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border-2 border-black">
                                <span className="text-xs font-black text-black/50 uppercase tracking-wider">Vol</span>
                                <span className="text-sm font-black text-black">{volume}</span>
                            </div>
                        )}
                        {resolutionDate && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border-2 border-black">
                                <span className="text-xs font-black text-black/50 uppercase tracking-wider">Ends</span>
                                <span className="text-sm font-black text-black">{resolutionDate}</span>
                            </div>
                        )}
                    </div>

                    {/* TIMEFRAME SELECTOR */}
                    <div className="flex items-center gap-1 bg-white rounded-xl border-2 border-black p-1">
                        {Object.keys(TIMEFRAMES).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf as any)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                                    timeframe === tf
                                        ? "bg-black text-white"
                                        : "bg-transparent text-black hover:bg-gray-100"
                                )}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>
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
