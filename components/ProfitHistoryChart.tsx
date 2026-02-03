'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { AreaClosed, LinePath, Bar, Line } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import { bisector } from 'd3-array';

interface DataPoint {
    time: number;
    value: number;
    label?: string;
}

interface ProfitHistoryChartProps {
    data: DataPoint[];
    color: string;
    onHover: (data: { value: number; label: string } | null) => void;
}

const bisectTime = bisector<DataPoint, number>((d) => d.time).left;

const ChartContent = ({
    data,
    width,
    height,
    color,
    onHover
}: {
    data: DataPoint[];
    width: number;
    height: number;
    color: string;
    onHover: (data: { value: number; label: string } | null) => void;
}) => {
    // Local state for vertical cursor
    const [activeX, setActiveX] = useState<number | null>(null);

    // Scales
    const xScale = useMemo(
        () =>
            scaleLinear({
                range: [0, width],
                domain: [Math.min(...data.map(d => d.time)), Math.max(...data.map(d => d.time))],
            }),
        [width, data]
    );

    const yScale = useMemo(() => {
        const values = data.map((d) => d.value);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        // Add padding
        const padding = (maxVal - minVal) * 0.1 || 10;
        return scaleLinear({
            range: [height, 0],
            domain: [minVal - padding, maxVal + padding],
        });
    }, [height, data]);

    // Handle Mouse Move
    const handleTooltip = useCallback(
        (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
            const { x } = localPoint(event) || { x: 0 };
            const x0 = xScale.invert(x);
            const index = bisectTime(data, x0, 1);
            const d0 = data[index - 1];
            const d1 = data[index];
            let d = d0;
            if (d1 && d0) {
                d = x0 - d0.time > d1.time - x0 ? d1 : d0;
            }

            // Update active X
            if (d) {
                const updatedX = xScale(d.time);
                setActiveX(updatedX);
                onHover({ value: d.value, label: d.label || '' });
            }
        },
        [xScale, data, onHover]
    );

    const handleMouseLeave = () => {
        setActiveX(null);
        onHover(null);
    };

    if (data.length === 0) return null;

    return (
        <svg width={width} height={height}>
            <defs>
                <filter id="glow-line" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="90%" stopColor={color} stopOpacity={0.05} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>

            {/* Area Fill */}
            <AreaClosed
                data={data}
                x={(d) => xScale(d.time) ?? 0}
                y={(d) => yScale(d.value) ?? 0}
                yScale={yScale}
                strokeWidth={0}
                fill={`url(#gradient-${color.replace('#', '')})`}
                curve={curveMonotoneX}
            />

            {/* Line Stroke with Glow */}
            <LinePath
                data={data}
                x={(d) => xScale(d.time) ?? 0}
                y={(d) => yScale(d.value) ?? 0}
                stroke={color}
                strokeWidth={3}
                curve={curveMonotoneX}
                filter="url(#glow-line)"
            />

            {/* Vertical Cursor Line */}
            {activeX !== null && (
                <Line
                    from={{ x: activeX, y: 0 }}
                    to={{ x: activeX, y: height }}
                    stroke={color}
                    strokeWidth={2}
                    pointerEvents="none"
                    strokeDasharray="4,4"
                    opacity={0.8}
                />
            )}

            {/* Invisible Overlay for Interaction */}
            <Bar
                x={0}
                y={0}
                width={width}
                height={height}
                fill="transparent"
                rx={14}
                onTouchStart={handleTooltip}
                onTouchMove={handleTooltip}
                onMouseMove={handleTooltip}
                onMouseLeave={handleMouseLeave}
            />
        </svg>
    );
};

export default function ProfitHistoryChart(props: ProfitHistoryChartProps) {
    return (
        <div className="h-64 w-full relative overflow-visible">
            <div className="relative z-10 w-full h-full">
                <ParentSize>
                    {({ width, height }) => (
                        <ChartContent {...props} width={width} height={height} />
                    )}
                </ParentSize>
            </div>
        </div>
    );
}
