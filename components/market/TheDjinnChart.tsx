import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid
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
}

// --- CONSTANTS ---
const TIMEFRAMES = [
    { label: '1s', val: '1s', ms: 1000, isMicro: true },
    { label: '5s', val: '5s', ms: 5 * 1000, isMicro: true },
    { label: '15s', val: '15s', ms: 15 * 1000, isMicro: true },
    { label: '1M', val: '1m', ms: 60 * 1000, isMicro: false },
    { label: '5M', val: '5m', ms: 5 * 60 * 1000, isMicro: false },
    { label: '15M', val: '15m', ms: 15 * 60 * 1000, isMicro: false },
    { label: '30M', val: '30m', ms: 30 * 60 * 1000, isMicro: false },
    { label: '1H', val: '1h', ms: 60 * 60 * 1000, isMicro: false },
    { label: '6H', val: '6h', ms: 6 * 60 * 60 * 1000, isMicro: false },
    { label: '1D', val: '1d', ms: 24 * 60 * 60 * 1000, isMicro: false },
    { label: '3D', val: '3d', ms: 3 * 24 * 60 * 60 * 1000, isMicro: false },
    { label: '1W', val: '1w', ms: 7 * 24 * 60 * 60 * 1000, isMicro: false },
    { label: 'ALL', val: 'all', ms: 365 * 24 * 60 * 60 * 1000, isMicro: false },
];

// --- SUB-COMPONENTS ---

const TradeBubblesOverlay = ({ bubbles }: { bubbles: TradeBubble[] }) => {
    return (
        <div className="absolute bottom-10 left-0 right-0 h-48 pointer-events-none overflow-hidden flex flex-col-reverse items-center gap-1 z-20 pb-4">
            <AnimatePresence mode='popLayout'>
                {bubbles.map(b => (
                    <motion.div
                        key={b.id}
                        initial={{ y: 50, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.4, type: 'spring' }}
                        className={`px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md flex items-center gap-2 ${b.side === 'YES'
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                            }`}
                    >
                        <span className="text-[10px] font-black uppercase text-white">{b.outcomeName}</span>
                        <span className="font-mono text-xs font-bold shadow-black drop-shadow-md">+{b.amountSol.toFixed(2)} SOL</span>
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
    // Default to 1M
    const [timeframe, setTimeframe] = useState(TIMEFRAMES.find(t => t.val === '1m') || TIMEFRAMES[4]);
    const [showMicros, setShowMicros] = useState(false);

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
        const now = data[data.length - 1].time;
        const cutoff = now - timeframe.ms;
        return data.filter(d => d.time >= cutoff);
    }, [data, timeframe]);

    return (
        <div className="flex flex-col w-full h-full bg-transparent rounded-3xl relative overflow-hidden">
            {/* TOP BAR */}
            <div className="flex flex-col gap-2 p-4 px-6 border-b-2 border-black/5 z-20 bg-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Activity size={14} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Probability</span>
                        </div>
                    </div>

                    {/* LIVE INDICATOR */}
                    <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Live</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full bg-transparent relative min-h-[400px]">
                <div className="w-full h-full relative border-2 border-black rounded-xl overflow-hidden bg-[#F8F9FA]">
                    {/* SUBTLE GRID PATTERN */}
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={filteredLineData}
                            margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
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
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.6} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="colorOutcome1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.6} />
                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                domain={['dataMin', 'dataMax']}
                                type="number"
                                scale="time"
                                tickFormatter={(t) => {
                                    if (timeframe.ms < 60 * 1000) return format(t, 'h:mm:ss');
                                    if (timeframe.ms <= 24 * 60 * 60 * 1000) return format(t, 'h:mm a');
                                    return format(t, 'MMM d');
                                }}
                                axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                                tickLine={{ stroke: '#000000', strokeWidth: 2 }}
                                tick={{ fill: '#000000', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}
                                minTickGap={50}
                            />
                            <YAxis
                                orientation="right"
                                domain={[0, 100]}
                                axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                                tickLine={{ stroke: '#000000', strokeWidth: 2 }}
                                ticks={[0, 25, 50, 75, 100]}
                                tick={{ fill: '#000000', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}
                                tickFormatter={(val) => `${val}%`}
                                width={40}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0B0E14', borderColor: '#333', borderRadius: '8px' }}
                                itemStyle={{ fontFamily: 'monospace', fontSize: '11px', color: '#fff' }}
                                labelStyle={{ color: '#9CA3AF', fontSize: '10px', marginBottom: '4px' }}
                                labelFormatter={(label) => format(label, 'MMM d, h:mm:ss a')}
                                formatter={(value: number) => [`${value}%`, 'Probability']}
                            />
                            {/* Primary Outcome Area (YES) */}
                            <Area
                                type="stepAfter"
                                dataKey={outcomes[0] || 'YES'}
                                stroke="#10B981"
                                strokeWidth={3}
                                fill="url(#colorOutcome0)"
                                isAnimationActive={false}
                                activeDot={{ r: 6, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
                            />
                            {/* Secondary Outcome Area (NO) - Only if exists */}
                            {outcomes[1] && (
                                <Area
                                    type="stepAfter"
                                    dataKey={outcomes[1]}
                                    stroke="#EF4444"
                                    strokeWidth={3}
                                    fill="url(#colorOutcome1)"
                                    isAnimationActive={false}
                                    activeDot={{ r: 6, fill: "#EF4444", stroke: "#fff", strokeWidth: 2 }}
                                />
                            )}
                            <CartesianGrid vertical={false} stroke="#000000" strokeOpacity={0.1} strokeDasharray="4 4" />
                        </AreaChart>
                    </ResponsiveContainer>
                    <TradeBubblesOverlay bubbles={bubbles} />
                </div>
            </div>

            {/* TIMEFRAMES */}
            <div className="flex items-center gap-2 border-t-2 border-black bg-gray-100 p-3 z-30">
                <button
                    onClick={() => setShowMicros(!showMicros)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-3 flex items-center gap-2
                    ${showMicros
                            ? 'bg-[#F492B7] text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5'
                            : 'bg-white text-black border-black hover:bg-gray-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'}`}
                >
                    <Zap size={14} className={showMicros ? "fill-current" : ""} />
                    <span>{showMicros ? 'Micros' : 'Macro'}</span>
                </button>

                <div className="flex overflow-x-auto no-scrollbar gap-2 flex-1 items-center py-1">
                    {TIMEFRAMES.filter(tf => {
                        return showMicros ? tf.isMicro : !tf.isMicro;
                    }).map(tf => (
                        <button
                            key={tf.val}
                            onClick={() => setTimeframe(tf)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border-3 whitespace-nowrap
                             ${timeframe.val === tf.val
                                    ? 'bg-[#10B981] text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5'
                                    : 'bg-white text-black border-black hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none'}`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* BG WATERMARK */}
            <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] z-0">
                <h1 className="text-[15rem] font-black text-black pointer-events-none uppercase italic tracking-tighter">Djinn</h1>
            </div>
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
