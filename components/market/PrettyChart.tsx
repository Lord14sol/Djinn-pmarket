'use client';

import React, { useMemo, useCallback } from 'react';
import { AreaClosed, LinePath, Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { LinearGradient } from '@visx/gradient';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import TradeBubbles from './TradeBubbles';
import { bisectDate } from '@/lib/utils'; // Assuming a bisect util or similar logic

// --- COLORS & STYLES ---
const PINK_DJINN = '#F492B7';
const ACCENT_CYAN = '#00F0FF';
const DARK_BG = '#0E0E0E';

interface DataPoint {
    date: number; // timestamp
    value: number; // percentage
}

interface OutcomeSeries {
    name: string;
    color: string;
    data: DataPoint[];
}

interface PrettyChartProps {
    series: OutcomeSeries[];
    height?: number;
}

const tooltipStyles = {
    ...defaultStyles,
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 'black',
    boxShadow: '0 0 20px rgba(244,146,183,0.3)',
};

const Chart = ({ series, width, height }: { series: OutcomeSeries[]; width: number; height: number }) => {
    const {
        showTooltip,
        hideTooltip,
        tooltipData,
        tooltipLeft,
        tooltipTop,
    } = useTooltip<any>();

    // 1. SCALES
    const allData = useMemo(() => series.flatMap(s => s.data), [series]);
    const minDate = useMemo(() => Math.min(...allData.map(d => d.date)), [allData]);
    const maxDate = useMemo(() => Math.max(...allData.map(d => d.date)), [allData]);

    const xScale = useMemo(() => scaleTime({
        domain: [minDate, maxDate],
        range: [0, width],
    }), [minDate, maxDate, width]);

    const yScale = useMemo(() => scaleLinear({
        domain: [0, 100],
        range: [height, 0],
    }), [height]);

    // 2. INTERACTION
    const handleTooltip = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        const { x } = localPoint(event) || { x: 0 };
        const x0 = xScale.invert(x);

        // Find closest point in each series
        const hoverData = series.map(s => {
            // Simple index-based find for performance, can use bisect for more accuracy
            const index = Math.floor((x / width) * (s.data.length - 1));
            const d = s.data[Math.max(0, Math.min(index, s.data.length - 1))];
            if (!d) return null; // Safe guard
            return { name: s.name, color: s.color, value: d.value };
        }).filter(Boolean); // Filter out nulls

        showTooltip({
            tooltipData: hoverData,
            tooltipLeft: x,
            tooltipTop: 0,
        });
    }, [xScale, series, width, showTooltip]);

    return (
        <div className="relative">
            <svg width={width} height={height}>
                <defs>
                    {series.map((s, i) => (
                        <LinearGradient
                            key={`grad-${i}`}
                            id={`grad-${s.name.replace(/\s+/g, '-')}`}
                            from={s.color}
                            fromOpacity={0.4}
                            to={s.color}
                            toOpacity={0}
                        />
                    ))}
                </defs>

                {/* Vertical Grid Line for Tooltip */}
                {tooltipData && (
                    <line
                        x1={tooltipLeft}
                        x2={tooltipLeft}
                        y1={0}
                        y2={height}
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        pointerEvents="none"
                    />
                )}

                {/* Series Paths */}
                {series.map((s, i) => (
                    <g key={`series-${i}`}>
                        <AreaClosed
                            data={s.data}
                            x={d => xScale(d.date) || 0}
                            y={d => yScale(d.value) || 0}
                            yScale={yScale}
                            fill={`url(#grad-${s.name.replace(/\s+/g, '-')})`}
                            curve={curveMonotoneX}
                        />
                        <LinePath
                            data={s.data}
                            x={d => xScale(d.date) || 0}
                            y={d => yScale(d.value) || 0}
                            stroke={s.color}
                            strokeWidth={2}
                            curve={curveMonotoneX}
                        />
                    </g>
                ))}

                {/* Interaction Layer */}
                <Bar
                    width={width}
                    height={height}
                    fill="transparent"
                    onMouseMove={handleTooltip}
                    onTouchMove={handleTooltip}
                    onMouseLeave={hideTooltip}
                />
            </svg>

            {/* Custom Premium Tooltip */}
            {tooltipData && (
                <TooltipWithBounds
                    key={Math.random()}
                    top={tooltipTop + 20}
                    left={tooltipLeft}
                    style={tooltipStyles}
                >
                    <div className="flex flex-col gap-2">
                        {tooltipData.map((d: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="opacity-60">{d.name}</span>
                                </div>
                                <span className="font-bold">{d.value.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </TooltipWithBounds>
            )}
        </div>
    );
};

export default function PrettyChartWrapper({ series, trigger }: { series: OutcomeSeries[]; trigger?: { amount: number; side: 'YES' | 'NO' } | null }) {
    if (!series || series.length === 0) return <div className="h-[400px] flex items-center justify-center text-white/20">Awaiting Data Orbit...</div>;

    return (
        <div className="w-full h-[400px] bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <TradeBubbles trigger={trigger || null} />
            <ParentSize>
                {({ width, height }) => <Chart series={series} width={width} height={height} />}
            </ParentSize>

            {/* Watermark */}
            <div className="absolute top-4 right-6 pointer-events-none">
                <span className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em]">Djinn Visual Terminal</span>
            </div>
        </div>
    );
}
