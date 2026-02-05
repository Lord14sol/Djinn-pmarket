import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Activity, Zap } from 'lucide-react';

// --- TYPES ---
export interface ChartDataPoint {
    time: number; // ms
    [key: string]: any; // Allow dynamic keys (e.g. "YES", "NO", or specific outcome names)
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
    resolutionDate?: string;
}

// --- CONSTANTS ---
const TIMEFRAMES = [
    { label: '1H', val: '1h', ms: 60 * 60 * 1000 },
    { label: '6H', val: '6h', ms: 6 * 60 * 60 * 1000 },
    { label: '1D', val: '1d', ms: 24 * 60 * 60 * 1000 },
    { label: '1W', val: '1w', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: '1M', val: '1m', ms: 30 * 24 * 60 * 60 * 1000 },
    { label: 'ALL', val: 'all', ms: 365 * 24 * 60 * 60 * 1000 },
];

// --- SUB-COMPONENTS ---
const TradeBubblesOverlay = ({ bubbles }: { bubbles: TradeBubble[] }) => {
    return (
        <div className="absolute bottom-4 left-0 right-0 h-48 pointer-events-none overflow-hidden flex flex-col-reverse items-center gap-1 z-20 pb-2">
            <AnimatePresence mode='popLayout'>
                {bubbles.map(b => (
                    <motion.div
                        key={b.id}
                        initial={{ y: 50, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.4, type: 'spring' }}
                        className={`px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 border shadow-sm ${b.side === 'YES'
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
                            : 'bg-rose-50/80 border-rose-200 text-rose-700'
                            }`}
                    >
                        <span className="text-[10px] font-bold uppercase">{b.outcomeName}</span>
                        <span className="font-mono text-xs font-bold">+{b.amountSol.toFixed(2)} SOL</span>
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
    // Default to 1D or ALL like Polymarket
    const [timeframe, setTimeframe] = useState(TIMEFRAMES[5]); // ALL default

    // Outcomes
    const outcomes = useMemo(() => props.outcomeNames || ['YES', 'NO'], [props.outcomeNames]);
    const [selectedOutcome, setSelectedOutcome] = useState<string>(outcomes[0]);

    // Sync external choice
    useEffect(() => {
        if (props.selectedOutcome && outcomes.includes(props.selectedOutcome)) {
            setSelectedOutcome(props.selectedOutcome);
        }
    }, [props.selectedOutcome, outcomes]);

    const [bubbles, setBubbles] = useState<TradeBubble[]>([]);
    const lastProcessedEventId = useRef<string | null>(null);

    // Handle Trade Events -> Bubbles
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

    // --- FILTER DATA ---
    const filteredLineData = useMemo(() => {
        if (!data.length) return [];
        // If "ALL", return everything
        if (timeframe.val === 'all') return data;

        const now = data[data.length - 1].time;
        const cutoff = now - timeframe.ms;
        return data.filter(d => d.time >= cutoff);
    }, [data, timeframe]);

    return (
        <div className="flex flex-col w-full h-full bg-transparent relative">


            {/* TIMEFRAME SELECTOR - Jim Raptis Principle: Frictionless Selection */}
            <div className="flex bg-black/5 p-1 rounded-xl border border-black/10 self-start mb-6 gap-1 relative z-30">
                {TIMEFRAMES.map((tf) => (
                    <button
                        key={tf.val}
                        onClick={() => { setTimeframe(tf); play('click'); }}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeframe.val === tf.val
                            ? 'bg-black text-white shadow-sm'
                            : 'text-black/40 hover:text-black hover:bg-black/5'
                            }`}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            {/* CHART AREA */}
            <div className="flex-1 w-full relative min-h-[400px]">
                {/* Branding Overlay - Top Right (MATCH NAVBAR) */}
                <div className="absolute top-0 right-0 z-40 flex items-center gap-3 bg-black/60 backdrop-blur-xl px-5 py-2.5 rounded-2xl border-2 border-white/20 shadow-2xl m-4 pointer-events-none">
                    <div className="w-8 h-8 relative">
                        <img src="/djinn-logo.png?v=3" alt="Djinn" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                        Djinn
                    </span>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={filteredLineData}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                        onMouseMove={(e) => {
                            if (e.activePayload && e.activePayload[0] && e.activePayload[0].payload) {
                                // Try to get value for currently selected outcome, fallback to first outcome
                                const val = e.activePayload[0].payload[selectedOutcome] ?? e.activePayload[0].payload[outcomes[0]];
                                onHover?.(val);
                            }
                        }}
                        onMouseLeave={() => onHover?.(null)}
                    >
                        <defs>
                            <linearGradient id="colorOutcome0" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} /> {/* Blue for Poly style */}
                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorOutcome1" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#DC2626" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <XAxis
                            dataKey="time"
                            domain={['dataMin', 'dataMax']}
                            type="number"
                            scale="time"
                            tick={{ fill: '#FFFFFF', fontSize: 10, fontWeight: 900, fillOpacity: 1 }}
                            tickFormatter={(val) => format(val, 'MMM d')}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={40}
                        />
                        <YAxis
                            orientation="right"
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            ticks={[0, 25, 50, 75, 100]}
                            tick={{ fill: '#FFFFFF', fontSize: 10, fontWeight: 900, fillOpacity: 1 }}
                            tickFormatter={(val) => `${val}%`}
                            width={35}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontFamily: 'sans-serif', fontSize: '12px', color: '#111', fontWeight: 600 }}
                            labelStyle={{ color: '#6B7280', fontSize: '11px', marginBottom: '2px' }}
                            labelFormatter={(label) => format(label, 'MMM d, h:mm a')}
                            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Probability']}
                            cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey={outcomes[0] || 'YES'}
                            stroke="#1D4ED8" // Deeper blue for contrast
                            strokeWidth={4}
                            fill="url(#colorOutcome0)"
                            isAnimationActive={false}
                            activeDot={{ r: 5, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }}
                        />
                        {/* Secondary Outcome Area (NO) - Only if exists */}
                        {outcomes[1] && (
                            <Area
                                type="monotone"
                                dataKey={outcomes[1]}
                                stroke="#B91C1C" // Deeper red for contrast
                                strokeWidth={4}
                                fill="url(#colorOutcome1)"
                                isAnimationActive={false}
                                activeDot={{ r: 5, fill: "#EF4444", stroke: "#fff", strokeWidth: 2 }}
                            />
                        )}
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                    </AreaChart>
                </ResponsiveContainer>
                <TradeBubblesOverlay bubbles={bubbles} />
            </div>

            {/* Watermark Removed for cleanliness */}
        </div>
    );
}

// Helper for dynamic colors
function wrapperHexAlpha(hex: string, alpha: number) {
    if (!hex) return 'rgba(255,255,255,0.1)';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
