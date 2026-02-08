
import React, { useState, useEffect, useMemo } from 'react';
import {
    XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

// --- TYPES ---
export interface ChartDataPoint {
    time: number; // ms
    [key: string]: number;
}

interface TradeBubble {
    id: string;
    side: string;
    amountUsd: number;
    outcomeName: string;
}

interface TheDjinnChartProps {
    data: ChartDataPoint[];
    volume?: string;
    onHover?: (val: number | null) => void;
    tradeEvent?: { id: string; side: string; amount: number; amountUsd?: number; outcome: string } | null;
    outcomeNames?: string[];
    selectedOutcome?: string;
    onOutcomeChange?: (name: string) => void;
    outcomeSupplies?: Record<string, number>;
    resolutionDate?: string;
    outcomeColors?: string[];
    solPrice?: number;
    debug?: boolean;
}

// Timeframes
const TIMEFRAMES = [
    { label: '1H', value: 60 * 60 * 1000, key: '1H' },
    { label: '6H', value: 6 * 60 * 60 * 1000, key: '6H' },
    { label: '24H', value: 24 * 60 * 60 * 1000, key: '24H' },
    { label: '7D', value: 7 * 24 * 60 * 60 * 1000, key: '7D' },
    { label: '1M', value: 30 * 24 * 60 * 60 * 1000, key: '1M' },
    { label: 'ALL', value: Infinity, key: 'ALL' }
];

/**
 * Normalize time to milliseconds. Detects seconds (< 1e12) and converts.
 */
function normalizeTimeMs(time: number): number {
    if (time < 1e12) return time * 1000;
    return time;
}

// Custom Tooltip - Kalshi style with date and percentage per outcome
const CustomTooltip = ({ active, payload, outcomeColors, outcomeNames }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataPoint }>;
    outcomeColors: string[];
    outcomeNames: string[];
}) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const timeMs = normalizeTimeMs(data.time);
    const date = new Date(timeMs);
    const isValidDate = !isNaN(date.getTime());

    const timeStr = isValidDate
        ? format(date, 'MMM d, yyyy h:mm a')
        : '';

    return (
        <div className="bg-white border-2 border-gray-900 rounded-xl px-4 py-3 shadow-2xl min-w-[200px]">
            <div className="text-xs text-gray-500 font-semibold mb-3">{timeStr}</div>
            <div className="space-y-2">
                {outcomeNames.map((outcome: string, idx: number) => {
                    const value = data[outcome];
                    if (value === undefined || value === null) return null;

                    return (
                        <div key={outcome} className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: outcomeColors[idx] }}
                                />
                                <span className="text-sm font-bold text-gray-900">{outcome}</span>
                            </div>
                            <span
                                className="text-2xl font-black"
                                style={{ color: outcomeColors[idx] }}
                            >
                                {Number(value).toFixed(1)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Trade bubble indicator - shows USD amount on purchase
const TradeIndicator = ({ trade, color }: { trade: TradeBubble; color: string }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border backdrop-blur-sm"
            style={{
                color,
                borderColor: `${color}40`,
                backgroundColor: `${color}10`
            }}
        >
            <span className="text-base font-black">+</span>
            <span className="text-sm font-black">${trade.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </motion.div>
    );
};

// Helper for safe date formatting
const safeFormatDate = (dateValue: string | number | Date): string => {
    if (!dateValue) return '';
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return String(dateValue);
        return format(date, 'MMM d, yyyy');
    } catch {
        return String(dateValue);
    }
};

export default function TheDjinnChart({
    data = [],
    tradeEvent,
    onHover,
    onOutcomeChange,
    outcomeColors = ['#2563EB', '#DC2626'],
    outcomeNames = ['YES', 'NO'],
    outcomeSupplies,
    solPrice = 100,
    debug = false,
    ...props
}: TheDjinnChartProps) {
    const [timeframe, setTimeframe] = useState(TIMEFRAMES[5]); // ALL default
    const [bubbles, setBubbles] = useState<TradeBubble[]>([]);
    const [hoveredValue, setHoveredValue] = useState<number | null>(null);

    // Handle trade event bubbles - only show on actual purchases with USD conversion
    useEffect(() => {
        if (!tradeEvent) return;

        // Convert SOL amount to USD for display
        const usdAmount = tradeEvent.amountUsd || (tradeEvent.amount * solPrice);

        const newBubble: TradeBubble = {
            id: tradeEvent.id,
            side: tradeEvent.side,
            amountUsd: usdAmount,
            outcomeName: tradeEvent.outcome
        };

        setBubbles(prev => [...prev, newBubble]);

        const timer = setTimeout(() => {
            setBubbles(prev => prev.filter(b => b.id !== newBubble.id));
        }, 4000);

        return () => clearTimeout(timer);
    }, [tradeEvent, solPrice]);

    // Filter and normalize data for selected timeframe
    const filteredLineData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const now = Date.now();
        const cutoff = now - timeframe.value;

        const filtered = data
            .map(d => {
                if (!d.time || typeof d.time !== 'number') return null;

                const timeMs = normalizeTimeMs(d.time);
                const point: Record<string, number> = { time: timeMs };

                outcomeNames.forEach(outcome => {
                    if (d.hasOwnProperty(outcome)) {
                        const value = Number(d[outcome]);
                        point[outcome] = isNaN(value) ? 0 : value;
                    } else {
                        point[outcome] = 0;
                    }
                });

                return point;
            })
            .filter((d): d is Record<string, number> => {
                if (!d) return false;
                return timeframe.value === Infinity || d.time >= cutoff;
            })
            .sort((a, b) => a.time - b.time);

        return filtered;
    }, [data, timeframe, outcomeNames]);

    // X-axis formatting based on timeframe
    const formatXAxis = (timestamp: number) => {
        try {
            const timeMs = normalizeTimeMs(timestamp);
            const date = new Date(timeMs);
            if (isNaN(date.getTime())) return '';

            if (timeframe.key === '1H') {
                return format(date, 'HH:mm');
            } else if (timeframe.key === '6H' || timeframe.key === '24H') {
                return format(date, 'HH:mm');
            } else if (timeframe.key === '7D') {
                return format(date, 'EEE d');
            } else if (timeframe.key === '1M') {
                return format(date, 'MMM d');
            } else {
                // ALL
                return format(date, 'MMM d');
            }
        } catch {
            return '';
        }
    };

    const formatYAxis = (value: number) => `${value}%`;

    // Empty state
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col w-full h-full bg-white relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📊</div>
                        <div className="text-xl font-bold text-gray-900 mb-2">No Data Available</div>
                        <div className="text-sm text-gray-500">Waiting for probability history data...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full bg-white relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">

            {/* Timeframe Selector */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-gray-100">
                <div className="flex gap-1">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.key}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${timeframe.key === tf.key
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                {/* Current outcome stats */}
                <div className="flex gap-4">
                    {outcomeNames.map((outcome, idx) => (
                        <div key={outcome} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: outcomeColors[idx] }}
                            />
                            <span className="text-xs font-bold text-gray-900">{outcome}</span>
                            {filteredLineData.length > 0 && (
                                <span
                                    className="text-sm font-black"
                                    style={{ color: outcomeColors[idx] }}
                                >
                                    {Math.round(filteredLineData[filteredLineData.length - 1][outcome] || 0)}%
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Trade Purchase Bubbles - Left side, only on real purchases */}
            <div className="absolute left-3 top-20 z-10 space-y-2 max-h-[300px] overflow-hidden">
                <AnimatePresence>
                    {bubbles.map((bubble) => {
                        const outcomeIdx = outcomeNames.findIndex(n => n === bubble.outcomeName);
                        const color = outcomeColors[outcomeIdx >= 0 ? outcomeIdx : 0];
                        return (
                            <TradeIndicator key={bubble.id} trade={bubble} color={color} />
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Chart Area */}
            <div className="flex-1 w-full relative min-h-[400px] px-2 py-4">
                {filteredLineData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-4xl mb-2">⏳</div>
                            <div className="text-sm font-bold text-gray-900">No data in selected timeframe</div>
                            <div className="text-xs text-gray-500 mt-1">Try selecting &quot;ALL&quot;</div>
                        </div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={filteredLineData}
                            margin={{ top: 20, right: 40, left: 10, bottom: 20 }}
                            onMouseMove={(e: any) => {
                                if (e && e.activePayload && e.activePayload.length > 0) {
                                    const value = e.activePayload[0].value;
                                    setHoveredValue(value);
                                    onHover?.(value);
                                }
                            }}
                            onMouseLeave={() => {
                                setHoveredValue(null);
                                onHover?.(null);
                            }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="rgba(0,0,0,0.06)"
                                strokeDasharray="3 3"
                            />

                            <XAxis
                                dataKey="time"
                                tickFormatter={formatXAxis}
                                tick={{ fill: '#000000', fontSize: 11, fontWeight: 600 }}
                                stroke="#000000"
                                tickLine={false}
                                axisLine={{ stroke: '#000000', strokeWidth: 1 }}
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                scale="time"
                            />

                            <YAxis
                                orientation="right"
                                domain={[0, 100]}
                                ticks={[0, 20, 40, 60, 80, 100]}
                                tickFormatter={formatYAxis}
                                tick={{ fill: '#000000', fontSize: 11, fontWeight: 600 }}
                                stroke="#000000"
                                tickLine={false}
                                axisLine={{ stroke: '#000000', strokeWidth: 1 }}
                            />

                            <Tooltip
                                content={<CustomTooltip outcomeColors={outcomeColors} outcomeNames={outcomeNames} />}
                                cursor={{ stroke: '#000', strokeWidth: 1, strokeDasharray: '5 5' }}
                            />

                            {outcomeNames.map((outcome, index) => {
                                const color = outcomeColors[index] || '#2563EB';
                                return (
                                    <Line
                                        key={outcome}
                                        type="monotone"
                                        dataKey={outcome}
                                        stroke={color}
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{
                                            r: 6,
                                            fill: color,
                                            stroke: '#fff',
                                            strokeWidth: 2
                                        }}
                                        isAnimationActive={false}
                                        connectNulls={true}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                <span>Live updates &bull; Real-time probability</span>
                {props.resolutionDate && (
                    <span>Resolves: {safeFormatDate(props.resolutionDate)}</span>
                )}
            </div>
        </div>
    );
}
