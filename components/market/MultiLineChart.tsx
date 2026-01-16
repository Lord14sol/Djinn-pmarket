'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineSeries } from 'lightweight-charts';
import Image from 'next/image';

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

export default function MultiLineChart({ outcomes, hasPosition, selectedOutcome }: MultiLineChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesMapRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // 1. Initial Chart Setup
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#666',
                fontFamily: 'monospace',
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 320,
            timeScale: {
                borderVisible: false,
                timeVisible: true,
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            handleScroll: false,
            handleScale: false,
        });

        chartRef.current = chart;

        // Cleanup
        return () => {
            chart.remove();
        };
    }, []);

    // Sync Series and Data
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = chartRef.current;

        // Remove old series that are no longer present
        const currentOutcomeNames = new Set(outcomes.map(o => o.name));
        seriesMapRef.current.forEach((series, name) => {
            if (!currentOutcomeNames.has(name)) {
                chart.removeSeries(series);
                seriesMapRef.current.delete(name);
            }
        });

        // Add or Update series
        outcomes.forEach((outcome, idx) => {
            let series = seriesMapRef.current.get(outcome.name);
            const color = OUTCOME_COLORS[idx % OUTCOME_COLORS.length];

            const isSelected = selectedOutcome === outcome.name;
            const hasSelection = !!selectedOutcome;
            const opacity = hasSelection ? (isSelected ? 1 : 0.2) : 1;

            if (!series) {
                // v5 Unified API
                series = chart.addSeries(LineSeries, {
                    color: color,
                    lineWidth: 2,
                    priceFormat: {
                        type: 'custom',
                        formatter: (price: number) => `${price.toFixed(0)}%`,
                    },
                });
                seriesMapRef.current.set(outcome.name, series);
            }

            // Apply styling based on selection
            series.applyOptions({
                lineWidth: isSelected ? 4 : 2,
                color: `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
            });

            // Format data
            const formattedData = outcome.data.map((d, i) => ({
                time: (i * 86400) as any,
                value: d.value
            }));
            series.setData(formattedData);
        });

        chart.timeScale().fitContent();
    }, [outcomes, selectedOutcome]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="relative w-full mb-8">
            <div className="relative bg-[#050505] border border-white/5 rounded-3xl p-6 overflow-hidden">
                {/* Djinn Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.03] select-none scale-75">
                    <div className="flex items-center gap-0">
                        <Image src="/star.png" alt="Djinn" width={140} height={140} className="-mr-3" />
                        <span className="text-5xl font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>Djinn</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6 relative z-10">
                    <div className="flex flex-wrap gap-4">
                        {outcomes.map((outcome, idx) => {
                            const color = OUTCOME_COLORS[idx % OUTCOME_COLORS.length];
                            const isSelected = selectedOutcome === outcome.name;
                            return (
                                <div
                                    key={outcome.name}
                                    className={`flex items-center gap-2 transition-opacity duration-300 ${selectedOutcome && !isSelected ? 'opacity-30' : 'opacity-100'}`}
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                                    <span className="text-[10px] font-bold text-white/60 tracking-wider uppercase">{outcome.name}</span>
                                    <span className="text-[10px] font-black" style={{ color }}>{outcome.data[outcome.data.length - 1]?.value.toFixed(1)}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div ref={chartContainerRef} className="w-full h-80 relative z-10" />

                {hasPosition && (
                    <div className="absolute top-6 right-6 px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 z-20">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-purple-500" style={{ boxShadow: '0 0 8px #a855f7' }} />
                        <span className="text-[9px] font-bold text-white/60 uppercase">Position Active</span>
                    </div>
                )}
            </div>
        </div>
    );
}
