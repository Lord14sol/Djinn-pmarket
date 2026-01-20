"use client";
import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Types
interface ChartDataPoint {
    time: number;
    yes: number; // 0-1 (probability)
    no: number;  // 0-1 (probability)
    timestamp?: Date;
}

interface DjinnChartProps {
    data: ChartDataPoint[];
    volume?: string;
    settlementDate?: string;
    onTimeframeChange?: (tf: string) => void;
    yesLabel?: string;
    noLabel?: string;
}

// Timeframe options
const TIMEFRAMES = ['1m', '5m', '15m', '1H', '6H', '1D', '1W', '1M', 'ALL'];

// Format X-axis based on timeframe
const formatXAxis = (timestamp: number, timeframe: string): string => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    switch (timeframe) {
        case 'ALL':
            return date.toLocaleDateString('en-US', { month: 'short' });
        case '1M':
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case '1W':
        case '1D':
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case '6H':
        case '1H':
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
        default: // 15m, 5m, 1m
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    }
};

// Format tooltip date
const formatTooltipDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toLowerCase().replace(',', '');
};

// Custom Polymarket-style Tooltip
const PolymarketTooltip = ({ active, payload, label, yesLabel, noLabel }: any) => {
    if (!active || !payload || payload.length < 2) return null;

    const yesValue = payload.find((p: any) => p.dataKey === 'yes')?.value ?? 0;
    const noValue = payload.find((p: any) => p.dataKey === 'no')?.value ?? 0;

    return (
        <div className="pointer-events-none">
            {/* Date header */}
            <div className="text-gray-400 text-xs mb-2 font-mono">
                {formatTooltipDate(label)}
            </div>
            {/* YES Label */}
            <div
                className="px-2 py-1 rounded text-xs font-bold mb-1 inline-block"
                style={{ backgroundColor: '#10B981', color: 'white' }}
            >
                {yesLabel || 'YES'} {(yesValue * 100).toFixed(1)}%
            </div>
            <br />
            {/* NO Label */}
            <div
                className="px-2 py-1 rounded text-xs font-bold inline-block"
                style={{ backgroundColor: '#F492B7', color: 'white' }}
            >
                {noLabel || 'NO'} {(noValue * 100).toFixed(1)}%
            </div>
        </div>
    );
};

// End-of-line label component
const EndLabel = ({ data, dataKey, color, label }: { data: any[], dataKey: string, color: string, label: string }) => {
    if (!data || data.length === 0) return null;
    const lastPoint = data[data.length - 1];
    const value = lastPoint?.[dataKey] ?? 0;

    return (
        <div
            className="absolute right-0 px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-lg z-10"
            style={{
                backgroundColor: color,
                color: 'white',
                transform: 'translateY(-50%)',
                top: `${(1 - value) * 100}%`,
            }}
        >
            {label} {(value * 100).toFixed(1)}%
        </div>
    );
};

// Custom dot for last point
const LastPointDot = ({ cx, cy, fill, isLast }: any) => {
    if (!isLast || !cx || !cy) return null;
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

export default function DjinnChart({
    data,
    volume = "$0",
    settlementDate = "TBD",
    onTimeframeChange,
    yesLabel = "YES",
    noLabel = "NO"
}: DjinnChartProps) {
    const [timeframe, setTimeframe] = useState('1H');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Handle timeframe change
    const handleTimeframeChange = (tf: string) => {
        setTimeframe(tf);
        onTimeframeChange?.(tf);
    };

    // Filter data based on timeframe
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) {
            // Generate initial data point if empty
            const now = Date.now();
            return [{ time: now, yes: 0.5, no: 0.5 }];
        }

        const now = Date.now();
        let cutoffTime = 0;

        switch (timeframe) {
            case '1m': cutoffTime = now - 60 * 1000; break;
            case '5m': cutoffTime = now - 5 * 60 * 1000; break;
            case '15m': cutoffTime = now - 15 * 60 * 1000; break;
            case '1H': cutoffTime = now - 60 * 60 * 1000; break;
            case '6H': cutoffTime = now - 6 * 60 * 60 * 1000; break;
            case '1D': cutoffTime = now - 24 * 60 * 60 * 1000; break;
            case '1W': cutoffTime = now - 7 * 24 * 60 * 60 * 1000; break;
            case '1M': cutoffTime = now - 30 * 24 * 60 * 60 * 1000; break;
            case 'ALL': cutoffTime = 0; break;
            default: cutoffTime = now - 60 * 60 * 1000;
        }

        const filtered = data.filter(d => d.time >= cutoffTime);

        // If no data in range, show last available data points
        if (filtered.length === 0 && data.length > 0) {
            return data.slice(-10);
        }

        return filtered.length > 0 ? filtered : data;
    }, [data, timeframe]);

    const currentYes = filteredData[filteredData.length - 1]?.yes ?? 0.5;
    const currentNo = filteredData[filteredData.length - 1]?.no ?? 0.5;

    if (!mounted) {
        return <div className="h-[450px] w-full bg-[#020202] animate-pulse rounded-xl" />;
    }

    return (
        <div className="flex flex-col w-full h-full bg-[#020202] rounded-2xl border border-white/5 p-6">
            {/* HEADER: Legend badges like Polymarket */}
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                    <span className="text-[#10B981] text-sm font-bold">{yesLabel}</span>
                    <span className="text-white font-bold">{(currentYes * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F492B7]"></span>
                    <span className="text-[#F492B7] text-sm font-bold">{noLabel}</span>
                    <span className="text-white font-bold">{(currentNo * 100).toFixed(0)}%</span>
                </div>
            </div>

            {/* THE CHART */}
            <div className="h-[320px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredData} margin={{ top: 20, right: 80, left: 0, bottom: 20 }}>
                        {/* Grid reference lines */}
                        <ReferenceLine y={0.25} stroke="#222" strokeDasharray="3 3" />
                        <ReferenceLine y={0.5} stroke="#333" strokeDasharray="3 3" />
                        <ReferenceLine y={0.75} stroke="#222" strokeDasharray="3 3" />

                        {/* X-AXIS with dynamic formatting */}
                        <XAxis
                            dataKey="time"
                            tickFormatter={(val) => formatXAxis(val, timeframe)}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }}
                            dy={10}
                            interval="preserveStartEnd"
                            minTickGap={50}
                        />

                        {/* Y-AXIS ON THE RIGHT */}
                        <YAxis
                            orientation="right"
                            tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                            domain={[0, 1]}
                            ticks={[0, 0.25, 0.5, 0.75, 1]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }}
                            width={50}
                        />

                        {/* Polymarket-style Tooltip */}
                        <Tooltip
                            content={<PolymarketTooltip yesLabel={yesLabel} noLabel={noLabel} />}
                            cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '3 3' }}
                            position={{ y: 0 }}
                            wrapperStyle={{ zIndex: 100 }}
                        />

                        {/* YES Line */}
                        <Line
                            type="monotone"
                            dataKey="yes"
                            stroke="#10B981"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 6, fill: '#10B981', stroke: '#0A0A0A', strokeWidth: 2 }}
                            isAnimationActive={false}
                        />

                        {/* NO Line (Pink) */}
                        <Line
                            type="monotone"
                            dataKey="no"
                            stroke="#F492B7"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 6, fill: '#F492B7', stroke: '#0A0A0A', strokeWidth: 2 }}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>

                {/* End-of-line floating labels */}
                <div className="absolute right-12 top-0 bottom-0 pointer-events-none" style={{ height: '320px' }}>
                    {/* YES Label */}
                    <div
                        className="absolute px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-lg"
                        style={{
                            backgroundColor: '#10B981',
                            color: 'white',
                            right: 0,
                            top: `${Math.max(5, Math.min(85, (1 - currentYes) * 80 + 10))}%`,
                            transform: 'translateY(-50%)',
                        }}
                    >
                        {yesLabel} {(currentYes * 100).toFixed(1)}%
                    </div>
                    {/* NO Label */}
                    <div
                        className="absolute px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-lg"
                        style={{
                            backgroundColor: '#F492B7',
                            color: 'white',
                            right: 0,
                            top: `${Math.max(15, Math.min(95, (1 - currentNo) * 80 + 10))}%`,
                            transform: 'translateY(-50%)',
                        }}
                    >
                        {noLabel} {(currentNo * 100).toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* THE FOOTER: VOL + DATE + TIMEFRAMES */}
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
                <div className="flex gap-0.5 bg-white/5 rounded-lg p-1">
                    {TIMEFRAMES.map(t => (
                        <button
                            key={t}
                            onClick={() => handleTimeframeChange(t)}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${timeframe === t
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
