"use client";
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Animated dot component for last data point
const AnimatedDot = ({ cx, cy, fill }: any) => {
    if (!cx || !cy) return null;
    return (
        <g>
            {/* Pulsing ring */}
            <circle
                cx={cx}
                cy={cy}
                r={8}
                fill="none"
                stroke={fill}
                strokeWidth={2}
                opacity={0.4}
                className="animate-ping"
            />
            {/* Main dot */}
            <circle
                cx={cx}
                cy={cy}
                r={5}
                fill={fill}
                stroke="#0A0A0A"
                strokeWidth={2}
            />
        </g>
    );
};

interface ChartDataPoint {
    time: number;
    yes: number; // 0-1 (probability)
    no: number;  // 0-1 (probability)
}

interface DjinnChartProps {
    data: ChartDataPoint[];
    volume?: string;
    settlementDate?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length >= 2) {
        return (
            <div className="bg-[#0A0A0A] border border-white/10 px-3 py-2 rounded-lg shadow-xl backdrop-blur-md">
                <p className="text-[#10B981] font-mono text-sm">YES: {(payload[0]?.value * 100).toFixed(1)}%</p>
                <p className="text-[#F492B7] font-mono text-sm">NO: {(payload[1]?.value * 100).toFixed(1)}%</p>
            </div>
        );
    }
    return null;
};

export default function DjinnChart({ data, volume = "$0", settlementDate = "TBD" }: DjinnChartProps) {
    const [timeframe, setTimeframe] = useState('ALL');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Ensure we always have valid data starting at T=0
    const safeData = data.length > 0
        ? data
        : [{ time: 0, yes: 0.5, no: 0.5 }];

    const currentYes = safeData[safeData.length - 1]?.yes ?? 0.5;

    if (!mounted) {
        return <div className="h-[450px] w-full bg-[#020202] animate-pulse rounded-xl" />;
    }

    return (
        <div className="flex flex-col w-full h-full bg-[#020202] rounded-2xl border border-white/5 p-6">
            {/* HEADER: Live Probability Big Number */}
            <div className="mb-6">
                <span className="text-5xl font-mono font-bold text-white tracking-tight">
                    {(currentYes * 100).toFixed(0)}%
                </span>
                <span className="text-gray-500 ml-3 text-sm uppercase tracking-widest">Chance of Yes</span>
            </div>

            {/* THE STAGE: Dual Line Chart */}
            <div className="h-[320px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={safeData} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
                        {/* Animated End Dots */}
                        <defs>
                            <style>{`
                                @keyframes pulse {
                                    0%, 100% { opacity: 1; r: 5px; }
                                    50% { opacity: 0.5; r: 8px; }
                                }
                                .pulse-dot { animation: pulse 2s ease-in-out infinite; }
                            `}</style>
                        </defs>
                        <defs>
                            <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="noGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F492B7" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#F492B7" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        {/* Y-AXIS ON THE RIGHT (Kalshi Style) */}
                        <YAxis
                            orientation="right"
                            tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                            domain={[0, 1]}
                            ticks={[0, 0.25, 0.5, 0.75, 1]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#444', fontSize: 11, fontFamily: 'monospace' }}
                        />

                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '3 3' }} />

                        {/* YES Line (Primary) */}
                        <Area
                            type="monotone"
                            dataKey="yes"
                            stroke="#10B981"
                            strokeWidth={3}
                            fill="url(#yesGradient)"
                            animationDuration={1000}
                            dot={false}
                            activeDot={(props: any) => {
                                const isLast = props.index === safeData.length - 1;
                                return isLast ? <AnimatedDot {...props} fill="#10B981" /> : null;
                            }}
                        />

                        {/* NO Line (Djinn Pink Bubble Gum) */}
                        <Area
                            type="monotone"
                            dataKey="no"
                            stroke="#F492B7"
                            strokeWidth={3}
                            strokeOpacity={1}
                            fill="url(#noGradient)"
                            animationDuration={1000}
                            dot={false}
                            activeDot={(props: any) => {
                                const isLast = props.index === safeData.length - 1;
                                return isLast ? <AnimatedDot {...props} fill="#F492B7" /> : null;
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* THE FOOTER: BAZAAR METADATA */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                <div className="flex gap-6 text-xs font-mono text-gray-500">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F492B7]/70"></span>
                        <span>VOL: <span className="text-[#F492B7] font-medium">{volume}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F492B7]/70"></span>
                        <span>ENDS: <span className="text-[#F492B7] font-medium">{settlementDate}</span></span>
                    </div>
                </div>

                {/* Timeframe Toggles */}
                <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                    {['1H', '1D', '1W', 'ALL'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${timeframe === t
                                ? 'bg-white/10 text-white'
                                : 'text-gray-600 hover:text-white'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
