'use client';

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MarketChartProps {
    data: { time: string; value: number }[];
    color: string;
    hasPosition?: boolean;
    flashOnUpdate?: boolean;
}

export default function MarketChart({ data, color, hasPosition, flashOnUpdate }: MarketChartProps) {
    const [isFlashing, setIsFlashing] = useState(false);
    const [prevDataLength, setPrevDataLength] = useState(data.length);

    // Trigger flash animation when new data is added
    useEffect(() => {
        if (data.length > prevDataLength && flashOnUpdate) {
            setIsFlashing(true);
            const timer = setTimeout(() => setIsFlashing(false), 600);
            return () => clearTimeout(timer);
        }
        setPrevDataLength(data.length);
    }, [data.length, prevDataLength, flashOnUpdate]);

    // Create multiple gradient stops for richer effect
    const gradientId = `gradient-${color.replace('#', '')}`;

    return (
        <div className="relative h-64 md:h-80 w-full mb-8">
            {/* Animated glow background */}
            <div
                className="absolute inset-0 rounded-2xl opacity-20 blur-3xl transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at 50% 0%, ${color}40, transparent 70%)`,
                    animation: 'pulse 3s ease-in-out infinite'
                }}
            />

            {/* Flash effect on purchase */}
            {isFlashing && (
                <div
                    className="absolute inset-0 rounded-2xl animate-ping"
                    style={{
                        background: `radial-gradient(circle at center, ${color}60, transparent 60%)`,
                        animationDuration: '0.6s',
                        animationIterationCount: '1'
                    }}
                />
            )}

            {/* Chart container with glassmorphism effect */}
            <div className="relative h-full bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl border border-white/5 backdrop-blur-sm overflow-hidden">
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }} />

                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <defs>
                            {/* Enhanced gradient with multiple stops */}
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                                <stop offset="50%" stopColor={color} stopOpacity={0.2} />
                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>

                            {/* Glow filter for the line */}
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                            interval="preserveStartEnd"
                            tickMargin={12}
                        />

                        <YAxis
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }}
                            tickFormatter={(value) => `${value}%`}
                            width={40}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                                border: `1px solid ${color}40`,
                                borderRadius: '16px',
                                boxShadow: `0 0 20px ${color}30`,
                                backdropFilter: 'blur(10px)',
                                padding: '12px 16px'
                            }}
                            itemStyle={{
                                color: color,
                                fontWeight: 900,
                                fontSize: '14px',
                                textShadow: `0 0 10px ${color}80`
                            }}
                            labelStyle={{
                                color: '#999',
                                fontSize: '10px',
                                marginBottom: '6px',
                                fontFamily: 'monospace',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                            formatter={(value: any) => [`${value.toFixed(1)}%`, 'Chance']}
                            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.3 }}
                        />

                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#${gradientId})`}
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-in-out"
                            filter="url(#glow)"
                            dot={false}
                            activeDot={{
                                r: 6,
                                fill: color,
                                stroke: '#000',
                                strokeWidth: 2,
                                filter: 'drop-shadow(0 0 6px currentColor)'
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Position indicator overlay */}
                {hasPosition && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-md border rounded-lg flex items-center gap-2" style={{ borderColor: `${color}40` }}>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color }}>Position Active</span>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.15; }
                    50% { opacity: 0.25; }
                }
            `}</style>
        </div>
    );
}
