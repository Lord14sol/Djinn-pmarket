"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
    CHILE: "#EF4444",
    PERU: "#10B981",
    Brazil: "#FCD116",
    Argentina: "#75AADB",
    France: "#002395",
    Yes: "#10B981",
    No: "#F492B7",
    YES: "#10B981",
    NO: "#F492B7",
};

const getColor = (title: string) => {
    const t = String(title).toUpperCase();
    return COLORS[t] || COLORS[title] || (t === 'YES' ? COLORS.YES : COLORS.NO) || "#fff";
};

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
    timeframe: '1H' | '1D' | 'ALL';
    setTimeframe: (tf: '1H' | '1D' | 'ALL') => void;
}

export default function ProbabilityChart({ data, outcomes, bubbles, timeframe, setTimeframe }: ProbabilityChartProps) {
    return (
        <div className="w-full h-full p-4 flex flex-col relative">
            {/* BUBBLES LAYER */}
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
                            <div className="px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700 text-xs font-bold shadow-xl backdrop-blur-md whitespace-nowrap" style={{ color: b.color }}>
                                {b.text}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* WATERMARK LAYER (Behind Chart) */}
            <div className="absolute inset-0 pointer-events-none flex items-start justify-end pr-8 pt-1 opacity-[0.20] z-0">
                <div className="relative w-32 h-32 grayscale">
                    <img src="/djinn-logo.png?v=3" alt="Djinn Seal" className="w-full h-full object-contain" />
                </div>
            </div>

            {/* CHART */}
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            {outcomes.map((o) => {
                                const title = typeof o === 'string' ? o : o.title;
                                const c = getColor(title);
                                const gradId = `colorProb-${title.replace(/\s+/g, '-')}`;
                                return (
                                    <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={c} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                                    </linearGradient>
                                );
                            })}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" strokeOpacity={0.4} />
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#52525b', fontSize: 10 }}
                            tickFormatter={(val) => new Date(val * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            minTickGap={50}
                        />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-zinc-950/90 backdrop-blur border border-zinc-800 p-3 rounded-lg shadow-xl text-xs z-50">
                                            <div className="text-zinc-500 mb-2">{new Date(Number(label) * 1000).toLocaleString()}</div>
                                            {payload.map((p: any) => (
                                                <div key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
                                                    <span className="text-zinc-300 font-bold">{p.name}</span>
                                                    <span className="text-zinc-400 font-mono ml-auto">{(Number(p.value)).toFixed(1)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        {outcomes.map((o) => {
                            const title = typeof o === 'string' ? o : o.title;
                            const gradId = `colorProb-${title.replace(/\s+/g, '-')}`;
                            return (
                                <Area
                                    key={title}
                                    type="stepAfter"
                                    dataKey={title}
                                    stroke={getColor(title)}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill={`url(#${gradId})`}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: getColor(title) }}
                                />
                            );
                        })}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* BOTTOM CONTROLS (Timeframe) */}
            <div className="flex justify-end pt-2 border-t border-zinc-800/50 mt-2">
                <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50 backdrop-blur-sm overflow-x-auto">
                    {['1H', '6H', '12H', '1D', '3D', '1W', '1M', 'ALL'].map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf as any)}
                            className={cn(
                                "px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap",
                                timeframe === tf ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
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
