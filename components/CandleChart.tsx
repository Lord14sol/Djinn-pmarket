"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { formatCompact } from '@/lib/utils';

interface CandleChartProps {
    data: any[];
    selectedOutcome?: string;
    solPrice?: number;
    activeTool?: string;
}

type Timeframe = '1s' | '1m' | '5m' | '15m' | '1h';
type ScaleMode = 'MCAP';

// --- RESAMPLING LOGIC ---
function resampleCandles(raw: any[], timeframe: Timeframe, solPrice: number, mode: ScaleMode): any[] {
    if (!raw || raw.length === 0) return [];

    // ✅ SIMPLIFICAR: Los datos ya vienen en precio SOL, solo convertir a USD Mcap
    const P_START = 0.000001;
    const P_50 = 0.000005;
    const PHASE1_END = 100_000_000;
    const SLOPE = (P_50 - P_START) / PHASE1_END;

    const transformed = raw.map(c => {
        // c.open, c.high, c.low, c.close ya son precios SOL
        // Calcular supply aproximado desde precio para obtener Mcap
        const getSupplyFromPriceLocal = (priceSol: number): number => {
            if (priceSol <= P_START) return 0;
            if (priceSol <= P_50) {
                return (priceSol - P_START) / SLOPE;
            }
            // Para simplificar, usar aproximación lineal
            return (priceSol - P_START) / SLOPE;
        };

        // Calcular supply y mcap para cada precio individualmente
        const supplyOpen = getSupplyFromPriceLocal(c.open);
        const supplyHigh = getSupplyFromPriceLocal(c.high);
        const supplyLow = getSupplyFromPriceLocal(c.low);
        const supplyClose = getSupplyFromPriceLocal(c.close);

        // Mcap en SOL (no USD) para evitar números enormes
        // Lightweight-charts tiene límite de ~90 trillones
        return {
            time: c.time,
            open: supplyOpen * c.open,      // Mcap en SOL
            high: supplyHigh * c.high,       // Mcap en SOL
            low: supplyLow * c.low,          // Mcap en SOL
            close: supplyClose * c.close     // Mcap en SOL
        };
    });

    if (timeframe === '1s') return transformed;

    // 2. Grouping
    const periodSeconds: Record<string, number> = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1h': 3600
    };
    const pSec = periodSeconds[timeframe];

    const bars: any[] = [];
    let currentBar: any = null;

    transformed.forEach((c) => {
        const barTime = Math.floor(c.time / pSec) * pSec;

        if (!currentBar) {
            currentBar = { time: barTime, open: c.open, high: c.high, low: c.low, close: c.close };
        } else if (currentBar.time === barTime) {
            currentBar.high = Math.max(currentBar.high, c.high);
            currentBar.low = Math.min(currentBar.low, c.low);
            currentBar.close = c.close;
        } else {
            bars.push(currentBar);
            currentBar = { time: barTime, open: c.open, high: c.high, low: c.low, close: c.close };
        }
    });
    if (currentBar) bars.push(currentBar);

    return bars;
}


export default function CandleChart({ data, selectedOutcome, solPrice = 180, activeTool = 'cursor' }: CandleChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);

    // State
    const [timeframe, setTimeframe] = useState<Timeframe>('1s');
    const [legend, setLegend] = useState<any>(null);
    const [showTimeMenu, setShowTimeMenu] = useState(false);

    // --- CHART EFFECT ---
    useEffect(() => {
        if (!chartContainerRef.current) return;

        if (chartInstanceRef.current) chartInstanceRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#71717a' },
            grid: { vertLines: { color: 'rgba(40, 40, 40, 0.3)' }, horzLines: { color: 'rgba(40, 40, 40, 0.3)' } },
            width: chartContainerRef.current.clientWidth,
            height: 480,
            crosshair: { mode: activeTool === 'crosshair' ? CrosshairMode.Magnet : CrosshairMode.Normal },
            timeScale: {
                borderColor: '#27272a',
                shiftVisibleRangeOnNewBar: true,
                timeVisible: true,
                secondsVisible: timeframe === '1s'
            },
            rightPriceScale: {
                borderColor: '#27272a',
                scaleMargins: { top: 0.2, bottom: 0.15 },
                autoScale: true,
            },
            localization: {
                priceFormatter: (p: number) => formatCompact(p) + ' SOL'
            }
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#10B981', downColor: '#EF4444',
            borderVisible: false, wickUpColor: '#10B981', wickDownColor: '#EF4444',
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a', priceFormat: { type: 'volume' }, priceScaleId: '',
        });
        chart.priceScale('').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

        chartInstanceRef.current = chart;
        seriesRef.current = series;
        volumeSeriesRef.current = volumeSeries;

        // Mouse Handler
        chart.subscribeCrosshairMove((param) => {
            if (param.time && param.seriesData) {
                const d = param.seriesData.get(series) as any;
                if (d) setLegend({ ...d, color: d.close >= d.open ? '#10B981' : '#EF4444' });
            }
        });

        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 0 });
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartInstanceRef.current = null;
        };
    }, [timeframe, activeTool]);

    // Update Data Effect
    useEffect(() => {
        if (!seriesRef.current || data.length === 0) return;

        // 1. Sort & Dedupe
        const sorted = [...data].sort((a: any, b: any) => a.time - b.time);
        const unique = sorted.reduce((acc: any[], c: any) => {
            const last = acc[acc.length - 1];
            if (last && last.time === c.time) acc[acc.length - 1] = c;
            else acc.push(c);
            return acc;
        }, []);

        // 2. Resample
        const bars = resampleCandles(unique, timeframe, solPrice, 'MCAP');

        // 3. ANCHOR INJECTION
        // If the first bar isn't "0" (or close to min P_START), inject a Genesis Bar
        // This visualizes the "Launch" anchor
        if (bars.length > 0) {
            const firstBar = bars[0];
            const genesisTime = firstBar.time - 3600; // Visualization anchor (1h before)
            const minMcap = (solPrice * 0.000001); // Approx P_START * SolPrice

            // If first bar is significantly higher than Floor, show the jump from floor
            if (firstBar.close > minMcap * 10) {
                const genesisBar = {
                    time: firstBar.time - 60, // 1m before start
                    open: minMcap,
                    high: minMcap,
                    low: minMcap,
                    close: minMcap
                };
                // Prepend genesis
                bars.unshift(genesisBar);
            }
        }

        // 4. Set Data
        seriesRef.current.setData(bars);

        const vols = bars.map((b: any) => ({
            time: b.time,
            value: Math.abs(b.close - b.open) * 0.1, // Volume = Delta Mcap
            color: b.close >= b.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
        }));
        volumeSeriesRef.current.setData(vols);

        // Update Legend
        const last = bars[bars.length - 1];
        if (last) setLegend({ ...last, color: last.close >= last.open ? '#10B981' : '#EF4444' });

    }, [data, timeframe, solPrice]);


    return (
        <div className="w-full h-full relative group">
            {/* TOOLBAR */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                <div className="relative">
                    <button
                        onClick={() => setShowTimeMenu(!showTimeMenu)}
                        className="px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700 rounded text-[10px] font-bold text-zinc-300 border border-zinc-700/50 backdrop-blur"
                    >
                        {timeframe.toUpperCase()}
                    </button>
                    {showTimeMenu && (
                        <div className="absolute top-full left-0 mt-1 flex flex-col bg-[#1a1d1e] border border-zinc-700 rounded-md shadow-xl overflow-hidden min-w-[80px]">
                            {['1s', '1m', '5m', '15m', '1h'].map(tf => (
                                <button
                                    key={tf}
                                    onClick={() => { setTimeframe(tf as any); setShowTimeMenu(false); }}
                                    className={`px-3 py-2 text-left text-[10px] font-bold hover:bg-zinc-800 ${timeframe === tf ? 'text-[#10B981]' : 'text-zinc-400'}`}
                                >
                                    {tf.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* LEGEND */}
            <div className="absolute top-3 right-4 z-20 flex items-center gap-3 font-mono text-[10px] pointer-events-none">
                {legend && (
                    <>
                        <span className="text-zinc-500">O <span className={legend.color === '#10B981' ? 'text-emerald-400' : 'text-rose-400'}>{formatCompact(legend.open)}</span></span>
                        <span className="text-zinc-500">H <span className={legend.color === '#10B981' ? 'text-emerald-400' : 'text-rose-400'}>{formatCompact(legend.high)}</span></span>
                        <span className="text-zinc-500">L <span className={legend.color === '#10B981' ? 'text-emerald-400' : 'text-rose-400'}>{formatCompact(legend.low)}</span></span>
                        <span className="text-zinc-500">C <span className={legend.color === '#10B981' ? 'text-emerald-400' : 'text-rose-400'}>{formatCompact(legend.close)}</span></span>
                    </>
                )}
            </div>

            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}
