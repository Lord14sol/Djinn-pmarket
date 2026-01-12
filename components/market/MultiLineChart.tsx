'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Color palette for different outcomes
const OUTCOME_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red  
    '#F97316', // Orange
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F59E0B', // Amber
];

interface MultiLineChartProps {
    outcomes: { name: string; data: { time: string; value: number }[] }[];
    hasPosition?: boolean;
    selectedOutcome?: string | null;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/95 border border-white/20 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                <p className="text-gray-400 text-xs font-mono mb-3 uppercase tracking-wider">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div
                            key={index}
                            className="flex items-center justify-between gap-6 px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: `${entry.color}15` }}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }}
                                />
                                <span className="text-white font-bold text-sm">{entry.name}</span>
                            </div>
                            <span
                                className="font-black text-base"
                                style={{ color: entry.color }}
                            >
                                {entry.value.toFixed(1)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

// Legend component
const CustomLegend = ({ outcomes }: { outcomes: { name: string; color: string; currentValue: number }[] }) => {
    return (
        <div className="flex flex-wrap gap-4 mb-4 px-2">
            {outcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-center gap-2">
                    <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: outcome.color }}
                    />
                    <span className="text-gray-400 text-xs font-medium">{outcome.name}</span>
                    <span
                        className="text-xs font-black"
                        style={{ color: outcome.color }}
                    >
                        {outcome.currentValue.toFixed(1)}%
                    </span>
                </div>
            ))}
        </div>
    );
};

// Time period selector
const periods = ['1H', '6H', '1D', '1W', '1M', 'ALL'];

export default function MultiLineChart({ outcomes, hasPosition, selectedOutcome }: MultiLineChartProps) {
    const [activePeriod, setActivePeriod] = useState('ALL');
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);

    // Merge all data points by time
    const mergedData = outcomes.length > 0 ? outcomes[0].data.map((point, idx) => {
        const merged: any = { time: point.time };
        outcomes.forEach((outcome, i) => {
            merged[outcome.name] = outcome.data[idx]?.value || 0;
        });
        return merged;
    }) : [];

    // Get current values for legend
    const legendData = outcomes.map((outcome, idx) => ({
        name: outcome.name,
        color: OUTCOME_COLORS[idx % OUTCOME_COLORS.length],
        currentValue: outcome.data[outcome.data.length - 1]?.value || 0
    }));

    // Custom dot for the last data point
    const renderCustomizedDot = (props: any) => {
        const { cx, cy, index, stroke } = props;
        if (index === mergedData.length - 1) {
            return (
                <svg x={cx - 6} y={cy - 6} width={12} height={12} fill="white" viewBox="0 0 1024 1024">
                    <circle cx="512" cy="512" r="512" fill={stroke} />
                    <circle cx="512" cy="512" r="200" fill="white" />
                </svg>
            );
        }
        return <></>;
    };

    return (
        <div className="relative w-full">
            {/* Header: Legend + Real Volume if available (or static moved out) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
                <CustomLegend outcomes={legendData} />

                {/* Volume Display - Moved Outside & Made Dynamic later if needed */}
                <div className="text-right px-2">
                    <p className="text-gray-600 text-[9px] font-mono uppercase tracking-widest mb-0.5">24h Volume</p>
                    <p className="text-white text-lg font-bold tracking-tight">$0.00</p>
                </div>
            </div>

            {/* Chart container */}
            <div className="relative h-64 md:h-80 w-full bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden">
                {/* Grid pattern - More subtle */}
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px)',
                    backgroundSize: '100% 40px'
                }} />

                {/* Djinn watermark - Centered */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.05] select-none scale-75">
                    <div className="flex items-center gap-0">
                        <Image src="/star.png" alt="Djinn" width={140} height={140} className="-mr-3" />
                        <span className="text-5xl font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>Djinn</span>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mergedData} margin={{ top: 20, right: 10, bottom: 5, left: -20 }}>
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#444', fontSize: 9, fontWeight: 500, fontFamily: 'monospace' }}
                            interval="preserveStartEnd"
                            tickMargin={8}
                        />

                        <YAxis
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#444', fontSize: 9, fontWeight: 500 }}
                            tickFormatter={(value) => `${value}`}
                            width={35}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        {outcomes.map((outcome, idx) => {
                            const color = OUTCOME_COLORS[idx % OUTCOME_COLORS.length];
                            const isHovered = hoveredLine === outcome.name;
                            const isSelected = selectedOutcome === outcome.name;
                            // Dim others if one is hovered OR selected
                            const isOtherDimmed = (hoveredLine !== null && !isHovered) || (selectedOutcome !== null && !isSelected && hoveredLine === null);

                            return (
                                <Line
                                    key={outcome.name}
                                    type="monotone"
                                    dataKey={outcome.name}
                                    name={outcome.name}
                                    stroke={color}
                                    strokeWidth={isHovered || isSelected ? 3 : 1.5}
                                    dot={false}
                                    activeDot={{
                                        r: 5,
                                        fill: color,
                                        stroke: '#000',
                                        strokeWidth: 2,
                                    }}
                                    opacity={isOtherDimmed ? 0.15 : 1}
                                    onMouseEnter={() => setHoveredLine(outcome.name)}
                                    onMouseLeave={() => setHoveredLine(null)}
                                    isAnimationActive={true}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>

                {/* Position indicator */}
                {hasPosition && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm border border-[#F492B7]/30 rounded flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#F492B7]" style={{ boxShadow: '0 0 5px #F492B7' }} />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#F492B7]">Active</span>
                    </div>
                )}
            </div>

            {/* Time period selector - Minimalist */}
            <div className="flex items-center justify-between mt-3 px-1">
                <div className="flex gap-2">
                    {periods.map((period) => (
                        <button
                            key={period}
                            onClick={() => setActivePeriod(period)}
                            className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${activePeriod === period
                                ? 'text-[#F492B7]'
                                : 'text-gray-600 hover:text-gray-400'
                                }`}
                        >
                            {period}
                        </button>
                    ))}
                </div>

                {/* Chart controls */}
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </button>
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
