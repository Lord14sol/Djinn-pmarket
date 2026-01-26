"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

// Custom Y-Axis Tick con Pills
const CustomYAxisTick = ({ x, y, payload, outcomes, currentProbabilities, getOutcomeColor }: any) => {
    if (!currentProbabilities || Object.keys(currentProbabilities).length === 0) return null;

    let closestOutcome = null;
    let minDiff = Infinity;

    for (const [title, value] of Object.entries(currentProbabilities)) {
        const diff = Math.abs((value as number) - payload.value);
        if (diff < minDiff && diff < 3) {
            minDiff = diff;
            closestOutcome = { title, value: value as number };
        }
    }

    if (!closestOutcome) return null;

    const color = getOutcomeColor(closestOutcome.title);

    return (
        <g transform={`translate(${x},${y})`}>
            <rect
                x={8}
                y={-10}
                width={52}
                height={20}
                rx={8}
                fill={color}
                className="drop-shadow-lg"
            />
            <text
                x={34}
                y={4}
                textAnchor="middle"
                fill="white"
                fontSize={11}
                fontWeight={700}
                fontFamily="system-ui, -apple-system, sans-serif"
            >
                {closestOutcome.value.toFixed(0)}%
            </text>
        </g>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 rounded-xl shadow-2xl overflow-hidden"
        >
            <div className="px-3 py-2 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    {new Date(Number(label) * 1000).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
            </div>
            <div className="px-3 py-2 space-y-1.5">
                {payload
                    .sort((a: any, b: any) => b.value - a.value)
                    .map((p: any) => (
                        <div
                            key={p.name}
                            className="flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                                    style={{ backgroundColor: p.stroke }}
                                />
                                <span className="text-xs font-semibold text-zinc-200">
                                    {p.name}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span
                                    className="text-sm font-bold tabular-nums"
                                    style={{ color: p.stroke }}
                                >
                                    {Number(p.value).toFixed(1)}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-medium">%</span>
                            </div>
                        </div>
                    ))}
            </div>
        </motion.div>
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

    // PASO 1: Construir dataset con punto actual sincronizado
    const syncedData = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);

        // Si no hay datos históricos o probabilidad actual
        if (!data || data.length === 0 || !currentProbabilities || Object.keys(currentProbabilities).length === 0) {
            // Si no hay datos de probabilidad tampoco, NO RETORNAR VACÍO si es posible evitarlo
            if (!currentProbabilities || Object.keys(currentProbabilities).length === 0) {
                // Fallback final: 50/50
                const fallbackProbs: any = {};
                outcomes.forEach(o => {
                    const title = typeof o === 'string' ? o : o.title;
                    fallbackProbs[title] = 100 / outcomes.length;
                });
                // Use fallbacks
                const initialPoint: any = { time: now - 300, ...fallbackProbs };
                const currentPoint: any = { time: now, ...fallbackProbs };
                return [initialPoint, currentPoint];
            }

            // Crear historia artificial para probar la línea (flat line)
            const initialPoint: any = { time: now - 300 };
            const currentPoint: any = { time: now };

            outcomes.forEach(o => {
                const title = typeof o === 'string' ? o : o.title;
                const prob = currentProbabilities[title] || 0;
                initialPoint[title] = prob;
                currentPoint[title] = prob;
            });

            return [initialPoint, currentPoint];
        }

        let workingData = [...data];
        const lastPoint = workingData[workingData.length - 1];

        // Punto actual con probabilidades EXACTAS del pool
        const livePoint: any = {
            time: now,
            dateStr: new Date(now * 1000).toLocaleString()
        };


        outcomes.forEach(o => {
            const title = typeof o === 'string' ? o : o.title;
            // Usar SIEMPRE las probabilidades actuales del pool
            livePoint[title] = currentProbabilities[title] || 0;
        });

        // Lógica de "Trail":
        let shouldAppend = false;
        if (lastPoint) {
            if ((now - lastPoint.time) > 5) shouldAppend = true;

            // Detectar PUMP/DUMP
            for (const o of outcomes) {
                const title = typeof o === 'string' ? o : o.title;
                if (Math.abs((livePoint[title] || 0) - (lastPoint[title] || 0)) > 0.5) {
                    shouldAppend = true;
                    break;
                }
            }
            // Fix time collision
            if (shouldAppend && livePoint.time <= lastPoint.time) {
                livePoint.time = lastPoint.time + 1;
            }
        } else {
            shouldAppend = true;
        }

        if (shouldAppend) {
            workingData.push(livePoint);
        } else {
            workingData[workingData.length - 1] = livePoint;
        }

        return workingData;
    }, [data, outcomes, currentProbabilities]);

    // PASO 2: Filtrar por timeframe
    const filteredData = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        let cutoffSeconds = 0;

        switch (timeframe) {
            case '5M': cutoffSeconds = 5 * 60; break;
            case '15M': cutoffSeconds = 15 * 60; break;
            case '30M': cutoffSeconds = 30 * 60; break;
            case '1H': cutoffSeconds = 60 * 60; break;
            case '6H': cutoffSeconds = 6 * 60 * 60; break;
            case '12H': cutoffSeconds = 12 * 60 * 60; break;
            case '1D': cutoffSeconds = 24 * 60 * 60; break;
            case '3D': cutoffSeconds = 3 * 24 * 60 * 60; break;
            case '1W': cutoffSeconds = 7 * 24 * 60 * 60; break;
            case '1M': cutoffSeconds = 30 * 24 * 60 * 60; break;
            case 'ALL': return syncedData;
        }

        const cutoffTime = now - cutoffSeconds;
        const filtered = syncedData.filter(d => d.time >= cutoffTime);

        if (filtered.length === 0 && syncedData.length > 0) {
            return [syncedData[syncedData.length - 1]];
        }

        if (filtered.length === 1) {
            const point = filtered[0];
            return [
                { ...point, time: point.time - 60 },
                point
            ];
        }

        // Deduplicate by time to prevent Recharts key errors
        const uniqueFiltered = filtered.reduce((acc: any[], current: any) => {
            const x = acc.find(item => item.time === current.time);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, []);

        return uniqueFiltered;
    }, [syncedData, timeframe]);

    // Ticks para pills - FILTRADO ESTRICTO (No fantasmas)
    const yTicks = useMemo(() => {
        const allowed = new Set(outcomes.map(o => typeof o === 'string' ? o : o.title));
        const values: number[] = [];

        if (currentProbabilities) {
            for (const [title, val] of Object.entries(currentProbabilities)) {
                if (allowed.has(title) && val > 0) {
                    values.push(val);
                }
            }
        }
        return [...new Set(values)];
    }, [currentProbabilities, outcomes]);

    return (
        <div className="w-full h-full p-4 flex flex-col relative">
            {/* BUBBLES */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
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

            {/* WATERMARK */}
            <div className="absolute inset-0 pointer-events-none flex items-start justify-end pr-8 pt-1 opacity-[0.12] z-0">
                <div className="relative w-32 h-32 grayscale">
                    <img src="/djinn-logo.png?v=3" alt="" className="w-full h-full object-contain" />
                </div>
            </div>

            {/* CHART */}
            <div className="flex-1 w-full min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={filteredData}
                        margin={{ top: 10, right: 90, left: 50, bottom: 5 }}
                    >
                        {/* Grid lines finas */}
                        <CartesianGrid
                            vertical={false}
                            horizontal={true}
                            stroke="#ffffff"
                            strokeOpacity={0.08}
                            strokeWidth={0.5}
                            strokeDasharray="0"
                        />

                        <XAxis
                            dataKey="time"
                            domain={[
                                () => {
                                    const now = Math.floor(Date.now() / 1000);
                                    let seconds = 300;
                                    switch (timeframe) {
                                        case '5M': seconds = 300; break;
                                        case '15M': seconds = 900; break;
                                        case '30M': seconds = 1800; break;
                                        case '1H': seconds = 3600; break;
                                        case '6H': seconds = 21600; break;
                                        case '12H': seconds = 43200; break;
                                        case '1D': seconds = 86400; break;
                                        case '3D': seconds = 259200; break;
                                        case '1W': seconds = 604800; break;
                                        case '1M': seconds = 2592000; break;
                                        case 'ALL': return 'dataMin';
                                    }
                                    const min = now - seconds;
                                    return isNaN(min) ? 'dataMin' : min;
                                },
                                'auto'
                            ]}
                            type="number"
                            scale="time"
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                            tick={{
                                fill: '#ffffff',
                                fontSize: 10,
                                fontWeight: 600,
                                fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}
                            tickFormatter={(val) => {
                                const date = new Date(val * 1000);
                                if (['5M', '15M', '30M', '1H', '6H', '12H', '1D'].includes(timeframe)) {
                                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                }
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }}
                            minTickGap={40}
                            dy={10}
                        />

                        {/* Eje Y Izquierdo: Escala % VISIBLE */}
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            domain={['auto', 'auto']}
                            axisLine={false}
                            tickLine={false}
                            tickCount={6}
                            width={40}
                            tick={{
                                fill: '#ffffff',
                                fontSize: 12,
                                fontWeight: 700,
                                fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}
                            tickFormatter={(val) => `${val.toFixed(0)}%`}
                        />

                        {/* Eje Y Pills: Outcome labels */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={['auto', 'auto']}
                            axisLine={false}
                            tickLine={false}
                            ticks={yTicks}
                            width={70}
                            tick={(props) => (
                                <CustomYAxisTick
                                    {...props}
                                    outcomes={outcomes}
                                    currentProbabilities={currentProbabilities}
                                    getOutcomeColor={getOutcomeColor}
                                />
                            )}
                            allowDuplicatedCategory={false}
                        />

                        <Tooltip
                            content={CustomTooltip}
                            cursor={{
                                stroke: '#ffffff',
                                strokeWidth: 1,
                                strokeOpacity: 0.2,
                                strokeDasharray: '4 4'
                            }}
                            wrapperStyle={{ outline: 'none' }}
                        />

                        {outcomes.map((o) => {
                            const title = typeof o === 'string' ? o : o.title;
                            const color = getOutcomeColor(title);
                            return (
                                <Line
                                    key={title}
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey={title}
                                    stroke={color}
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{
                                        r: 5,
                                        strokeWidth: 2,
                                        stroke: color,
                                        fill: color,
                                        style: {
                                            filter: `drop-shadow(0 0 6px ${color})`,
                                        }
                                    }}
                                    isAnimationActive={false}
                                    connectNulls
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* TIMEFRAME CONTROLS */}
            <div className="flex justify-end pt-3 border-t border-zinc-800/50 mt-2">
                <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50 backdrop-blur-sm gap-0.5">
                    {['5M', '15M', '30M', '1H', '6H', '12H', '1D', '3D', '1W', '1M', 'ALL'].map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf as any)}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap",
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
        </div>
    );
}
