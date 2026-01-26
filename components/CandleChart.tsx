"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, CandlestickData } from "lightweight-charts";

interface CandleChartProps {
    data: any[];
    selectedOutcome?: string;
}

// Max valid price for lightweight-charts (prevents overflow errors)
const MAX_VALID_PRICE = 90071992547409;

// Validate and sanitize candle data
function sanitizeCandles(candles: any[]): any[] {
    return candles.filter(c => {
        // Filter out candles with invalid/extreme values
        const values = [c.open, c.high, c.low, c.close];
        return values.every(v =>
            typeof v === 'number' &&
            !isNaN(v) &&
            isFinite(v) &&
            Math.abs(v) < MAX_VALID_PRICE
        );
    }).map(c => ({
        ...c,
        // Clamp values to safe range
        open: Math.max(0, Math.min(c.open, MAX_VALID_PRICE)),
        high: Math.max(0, Math.min(c.high, MAX_VALID_PRICE)),
        low: Math.max(0, Math.min(c.low, MAX_VALID_PRICE)),
        close: Math.max(0, Math.min(c.close, MAX_VALID_PRICE)),
    }));
}

export default function CandleChart({ data, selectedOutcome }: CandleChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);

    // Sanitize incoming data to prevent chart crashes
    const safeData = sanitizeCandles(data);

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

        // Hydrate Data (using sanitized data)
        if (safeData.length > 0) {
            series.setData(safeData as any);

            // Mock Volume Data derived from candles
            const volumeData = safeData.map((c: any) => ({
                time: c.time,
                value: Math.min((c.high - c.low) * 1000000, 1000000) + (Math.random() * 100), // Synthetic volume, capped
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

    // Live Update Effect (using sanitized data)
    useEffect(() => {
        if (seriesRef.current && chartInstanceRef.current && safeData.length > 0) {
            seriesRef.current.setData(safeData as any);

            const volumeData = safeData.map((c: any) => ({
                time: c.time,
                value: Math.min((c.high - c.low) * 1000000, 1000000) + 50, // Capped volume
                color: c.close >= c.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            }));
            if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volumeData as any);
        }
    }, [safeData]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
