"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, CandlestickData } from "lightweight-charts";

interface CandleChartProps {
    data: any[];
    selectedOutcome?: string;
}

export default function CandleChart({ data, selectedOutcome }: CandleChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);

    // --- CHART EFFECT ---
    useEffect(() => {
        if (!chartContainerRef.current) return;

        if (chartInstanceRef.current) chartInstanceRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#71717a' },
            grid: { vertLines: { color: '#27272a' }, horzLines: { color: '#27272a' } },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            crosshair: { mode: CrosshairMode.Normal },
            timeScale: { borderColor: '#27272a', shiftVisibleRangeOnNewBar: true, timeVisible: true, secondsVisible: true },
            rightPriceScale: { borderColor: '#27272a' },
        });

        // 1. Candlestick Series
        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#10B981', downColor: '#EF4444', borderVisible: false, wickUpColor: '#10B981', wickDownColor: '#EF4444',
        });

        // 2. Volume Series (Histogram)
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '', // Overlay mode
        });

        // Configure Volume Scale
        chart.priceScale('').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        // Hydrate Data
        if (data.length > 0) {
            series.setData(data as any);

            // Mock Volume Data derived from candles
            const volumeData = data.map((c: any) => ({
                time: c.time,
                value: (c.high - c.low) * 1000000 + (Math.random() * 100), // Synthetic volume
                color: c.close >= c.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            }));
            volumeSeries.setData(volumeData as any);
        }

        chart.timeScale().fitContent();

        chartInstanceRef.current = chart;
        seriesRef.current = series;
        volumeSeriesRef.current = volumeSeries;

        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartInstanceRef.current = null;
        };
    }, [selectedOutcome]); // Hard Re-Mount on outcome change for safety

    // Live Update Effect
    useEffect(() => {
        if (seriesRef.current && chartInstanceRef.current) {
            seriesRef.current.setData(data as any);

            const volumeData = data.map((c: any) => ({
                time: c.time,
                value: (c.high - c.low) * 1000000 + 50,
                color: c.close >= c.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            }));
            if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volumeData as any);
        }
    }, [data]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
