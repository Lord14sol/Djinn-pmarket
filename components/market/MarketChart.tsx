'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries } from 'lightweight-charts';
import TradeBubbles from './TradeBubbles';

interface MarketChartProps {
    data: { time: string; value: number }[];
    color: string;
    hasPosition?: boolean;
    lastTrade?: { amount: number; side: 'YES' | 'NO' } | null;
}

export default function MarketChart({ data, color, hasPosition, lastTrade }: MarketChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#A0A0A0',
                fontFamily: 'Inter, sans-serif',
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
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            handleScroll: false,
            handleScale: false,
        });

        const areaSeries = chart.addSeries(AreaSeries, {
            lineColor: color,
            topColor: `${color}33`,
            bottomColor: `${color}00`,
            lineWidth: 2,
            priceFormat: {
                type: 'custom',
                formatter: (price: number) => `${Math.round(price)}%`,
            },
        });

        const formattedData = data.map((d, i) => ({
            time: (i * 86400) as any,
            value: d.value
        }));

        areaSeries.setData(formattedData);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = areaSeries;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [color]);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            const formattedData = data.map((d, i) => ({
                time: (i * 86400) as any,
                value: d.value
            }));
            seriesRef.current.setData(formattedData);
        }
    }, [data]);

    return (
        <div className="relative w-full overflow-hidden">
            {/* Real-time Bubbles Overlay */}
            <TradeBubbles trigger={lastTrade || null} />

            <div ref={chartContainerRef} className="w-full h-80" />

            {/* Polymarket-style Watermark or info */}
            <div className="absolute top-4 right-4 opacity-20 pointer-events-none">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Djinn Lite</span>
            </div>
        </div>
    );
}
