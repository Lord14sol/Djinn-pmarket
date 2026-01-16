'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';

interface TradingViewProChartProps {
    data: { time: string; open: number; high: number; low: number; close: number }[];
    color: string;
}

export default function TradingViewProChart({ data, color }: TradingViewProChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#DDD',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderVisible: false,
            },
            crosshair: {
                mode: 0,
                vertLine: {
                    labelBackgroundColor: '#9B51E0',
                },
                horzLine: {
                    labelBackgroundColor: '#9B51E0',
                },
            },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#F492B7',
            downColor: '#4A5568',
            borderVisible: false,
            wickUpColor: '#F492B7',
            wickDownColor: '#4A5568',
        });

        candlestickSeries.setData(data);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

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
    }, []);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            seriesRef.current.setData(data);
        }
    }, [data]);

    return (
        <div className="relative w-full bg-[#050505] border border-[#F492B7]/20 rounded-3xl p-6 overflow-hidden shadow-[0_0_50px_rgba(244,146,183,0.1)]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#F492B7] uppercase tracking-widest bg-[#F492B7]/10 px-3 py-1 rounded-full">Djinn Pro Terminal</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Real-Time Data</span>
                </div>
            </div>
            <div ref={chartContainerRef} className="w-full h-[400px]" />
        </div>
    );
}
