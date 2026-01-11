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

export default function MultiLineChart({ outcomes, hasPosition }: MultiLineChartProps) {
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

    return (
        <div className="relative w-full">
            {/* Legend with current values */}
            <CustomLegend outcomes={legendData} />

            {/* Chart container */}
            <div className="relative h-64 md:h-80 w-full bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl border border-white/5 backdrop-blur-sm overflow-hidden">
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />

                {/* Djinn watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.12]">
                    <div className="flex items-center gap-0">
                        <Image src="/star.png" alt="Djinn" width={160} height={160} className="-mr-4" />
                        <span className="text-6xl font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>Djinn</span>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mergedData} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                            interval="preserveStartEnd"
                            tickMargin={12}
                        />

                        <YAxis
                            domain={[0, 'auto']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 10, fontWeight: 600 }}
                            tickFormatter={(value) => `${value}%`}
                            width={45}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        {outcomes.map((outcome, idx) => {
                            const color = OUTCOME_COLORS[idx % OUTCOME_COLORS.length];
                            const isHovered = hoveredLine === outcome.name;
                            const isOtherHovered = hoveredLine !== null && !isHovered;

                            return (
                                <Line
                                    key={outcome.name}
                                    type="monotone"
                                    dataKey={outcome.name}
                                    name={outcome.name}
                                    stroke={color}
                                    strokeWidth={isHovered ? 3 : 2}
                                    dot={false}
                                    activeDot={{
                                        r: 6,
                                        fill: color,
                                        stroke: '#000',
                                        strokeWidth: 2,
                                    }}
                                    opacity={isOtherHovered ? 0.3 : 1}
                                    onMouseEnter={() => setHoveredLine(outcome.name)}
                                    onMouseLeave={() => setHoveredLine(null)}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>

                {/* Position indicator */}
                {hasPosition && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-[#F492B7]/40 rounded-lg flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-pulse bg-[#F492B7]" style={{ boxShadow: '0 0 8px #F492B7' }} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#F492B7]">Position Active</span>
                    </div>
                )}
            </div>

            {/* Time period selector */}
            <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                    {periods.map((period) => (
                        <button
                            key={period}
                            onClick={() => setActivePeriod(period)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activePeriod === period
                                ? 'bg-[#F492B7] text-black'
                                : 'text-gray-500 hover:text-white hover:bg-white/10'
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
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
