"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
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
    timeframe: '5M' | '15M' | '30M' | '1H' | '6H' | '12H' | '1D' | '3D' | '1W' | '1M' | 'ALL';
    setTimeframe: (tf: '5M' | '15M' | '30M' | '1H' | '6H' | '12H' | '1D' | '3D' | '1W' | '1M' | 'ALL') => void;
    currentProbabilities: Record<string, number>;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl p-3">
            <div className="text-[10px] text-zinc-400 mb-2 font-mono">
                {new Date(Number(label) * 1000).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>
            <div className="space-y-1">
                {payload
                    .sort((a: any, b: any) => b.value - a.value)
                    .map((p: any) => (
                        <div key={p.name} className="flex items-center gap-3">
                            <div className="flex items-center gap-2 w-20">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: p.stroke }}
                                />
                                <span className="text-xs font-bold text-zinc-200 uppercase">{p.name}</span>
                            </div>
                            <span
                                className="text-sm font-bold font-mono"
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

export default function ProbabilityChart({
    data,
    outcomes,
    bubbles,
    timeframe,
    setTimeframe,
    currentProbabilities
}: ProbabilityChartProps) {
    const [hoverData, setHoverData] = useState<any>(null);

    // PASO 1: Construir dataset
    const syncedData = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);

        if (!data || data.length === 0) {
            // Fallback for empty data
            const fallbackProbs: any = {};
            outcomes.forEach(o => {
                const title = typeof o === 'string' ? o : o.title;
                fallbackProbs[title] = 100 / outcomes.length;
            });
            return [{ time: now - 3600, ...fallbackProbs }, { time: now, ...fallbackProbs }];
        }

        // Clone and sort
        const sorted = [...data].sort((a: any, b: any) => a.time - b.time);

        // Ensure last point reflects current state strictly
        const last = sorted[sorted.length - 1];
        if (currentProbabilities && Object.keys(currentProbabilities).length > 0) {
            const livePoint: any = {
                time: now,
                ...currentProbabilities
            };

            // Append live point if significant time passed or value changed
            if (last && (now - last.time > 5)) {
                sorted.push(livePoint);
            } else if (last) {
                // Update last point if very recent (Immutable update)
                sorted[sorted.length - 1] = { ...last, ...currentProbabilities };
            }
        }

        return sorted;
    }, [data, outcomes, currentProbabilities]);

    // PASO 2: Filtrar por timeframe
    const filteredData = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        let cutoffSeconds = 0;

        switch (timeframe) {
            case '5M': cutoffSeconds = 300; break;
            case '15M': cutoffSeconds = 900; break;
            case '30M': cutoffSeconds = 1800; break;
            case '1H': cutoffSeconds = 3600; break;
            case '6H': cutoffSeconds = 21600; break;
            case '12H': cutoffSeconds = 43200; break;
            case '1D': cutoffSeconds = 86400; break;
            case '3D': cutoffSeconds = 259200; break;
            case '1W': cutoffSeconds = 604800; break;
            case '1M': cutoffSeconds = 2592000; break;
            case 'ALL': return syncedData;
        }

        const cutoffTime = now - cutoffSeconds;
        return syncedData.filter(d => d.time >= cutoffTime);
    }, [syncedData, timeframe]);

    // Display Data (Hover vs Current)
    const displayProbs = hoverData || currentProbabilities;

    return (
        <div className="w-full h-full flex flex-col relative group">
            {/* PRO LEGEND HEADER (Kalshi Style) */}
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center gap-6 pointer-events-none">
                {outcomes.map((o) => {
                    const title = typeof o === 'string' ? o : o.title;
                    const color = getOutcomeColor(title);
                    const val = displayProbs[title] ?? 0;

                    return (
                        <div key={title} className="flex items-center gap-3 bg-zinc-950/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-zinc-800/30">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full ring-2 ring-opacity-50" style={{ backgroundColor: color, ringColor: color }} />
                                <span className="text-sm font-bold text-zinc-400 uppercase tracking-wide">{title}</span>
                            </div>
                            <span className="text-2xl font-black tabular-nums tracking-tight" style={{ color: color }}>
                                {val.toFixed(0)}<span className="text-sm align-top opacity-70">%</span>
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
            <div className="flex-1 w-full min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={filteredData}
                        margin={{ top: 80, right: 10, left: 0, bottom: 0 }}
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
                            stroke="#333"
                            strokeOpacity={0.4}
                            strokeWidth={1}
                            strokeDasharray="4 4"
                        />
                        <XAxis
                            dataKey="time"
                            type="number"
                            scale="time"
                            domain={['dataMin', 'dataMax']}
                            hide
                        />
                        <YAxis
                            orientation="right"
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
                            tickFormatter={(val) => `${val}%`}
                            width={40}
                        />
                        <Tooltip content={CustomTooltip} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '5 5' }} />

                        {outcomes.map((o) => {
                            const title = typeof o === 'string' ? o : o.title;
                            const color = getOutcomeColor(title);
                            return (
                                <Line
                                    key={title}
                                    type="monotone" // Smoother curves
                                    dataKey={title}
                                    stroke={color}
                                    strokeWidth={3} // Thicker pro lines
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: color }} // Clean active dot
                                    animationDuration={0} // Instant update
                                    connectNulls
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* TIMEFRAME CONTROLS */}
            <div className="absolute bottom-4 left-4 z-20 flex bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 backdrop-blur-sm gap-0.5">
                {['1H', '1D', '1W', 'ALL'].map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf as any)}
                        className={cn(
                            "px-3 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap",
                            timeframe === tf
                                ? "bg-zinc-800 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        )}
                    >
                        {tf}
                    </button>
                ))}
            </div>
        </div>
    );
}
