
import { useState, useEffect, useRef, useCallback } from 'react';

export interface ChartDataPoint {
    time: number; // ms timestamp (always milliseconds)
    [outcome: string]: number;
}

export interface TradeEvent {
    id: string;
    side: string;
    amount: number;       // SOL amount
    amountUsd?: number;   // USD amount (for bubble display)
    outcome: string;
    timestamp: number;
}

interface UseRealtimeChartOptions {
    marketId: string;
    outcomeNames: string[];
    initialData?: ChartDataPoint[];
    outcomeSupplies?: Record<string, number>; // current supplies for each outcome
    maxDataPoints?: number;
}

/**
 * Normalizes a chart data point's time to milliseconds.
 * Detects if time is in seconds (< 1e12) and converts to ms.
 */
function normalizeTimeMs(time: number): number {
    if (time < 1e12) {
        return time * 1000; // was in seconds, convert to ms
    }
    return time;
}

export function useRealtimeChart({
    marketId,
    outcomeNames,
    initialData = [],
    outcomeSupplies,
    maxDataPoints = 1000
}: UseRealtimeChartOptions) {
    // Normalize initial data times to ms
    const normalizedInitial = initialData.map(d => ({
        ...d,
        time: normalizeTimeMs(d.time)
    }));

    const [chartData, setChartData] = useState<ChartDataPoint[]>(normalizedInitial);
    const [latestTrade, setLatestTrade] = useState<TradeEvent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const wsRef = useRef<WebSocket | null>(null);
    const prevSuppliesRef = useRef<Record<string, number> | undefined>(undefined);

    // Sync initial data when it changes (e.g. restored from localStorage)
    useEffect(() => {
        if (initialData.length > 0 && chartData.length === 0) {
            setChartData(initialData.map(d => ({
                ...d,
                time: normalizeTimeMs(d.time)
            })));
        }
    }, [initialData]);

    // Add a new data point
    const addDataPoint = useCallback((newPoint: ChartDataPoint) => {
        // Ensure time is in ms
        const normalized = { ...newPoint, time: normalizeTimeMs(newPoint.time) };
        setChartData(prev => {
            const updated = [...prev, normalized];
            if (updated.length > maxDataPoints) {
                return updated.slice(updated.length - maxDataPoints);
            }
            return updated;
        });
    }, [maxDataPoints]);

    // Update the last data point if recent, else add new
    const updateLastDataPoint = useCallback((updates: Partial<ChartDataPoint>) => {
        setChartData(prev => {
            if (prev.length === 0) return prev;

            const lastPoint = prev[prev.length - 1];
            const now = Date.now();

            if (now - lastPoint.time < 30000) {
                const updatedLast = { ...lastPoint, ...updates, time: now };
                return [...prev.slice(0, -1), updatedLast];
            } else {
                return [...prev, { time: now, ...updates } as ChartDataPoint];
            }
        });
    }, []);

    // React to supply changes (real trades) - NO random simulation
    useEffect(() => {
        if (!outcomeSupplies) return;

        const prevSupplies = prevSuppliesRef.current;
        prevSuppliesRef.current = outcomeSupplies;

        // Skip the first render (initial load) if we already have data
        if (!prevSupplies && chartData.length > 0) return;

        // Check if supplies actually changed
        if (prevSupplies) {
            const changed = outcomeNames.some(name =>
                (outcomeSupplies[name] || 0) !== (prevSupplies[name] || 0)
            );
            if (!changed) return;
        }

        // Build probability point from actual supplies using PROBABILITY_BUFFER
        const VIRTUAL_FLOOR = 15_000_000; // Must match core-amm.ts
        const adjustedSupplies: Record<string, number> = {};
        let totalAdjusted = 0;

        outcomeNames.forEach(name => {
            const supply = outcomeSupplies[name] || 0;
            const adjusted = supply + VIRTUAL_FLOOR;
            adjustedSupplies[name] = adjusted;
            totalAdjusted += adjusted;
        });

        const newPoint: ChartDataPoint = { time: Date.now() };
        outcomeNames.forEach(name => {
            newPoint[name] = totalAdjusted > 0
                ? (adjustedSupplies[name] / totalAdjusted) * 100
                : 100 / outcomeNames.length;
        });

        // If no data yet, seed with an initial anchor point 1 minute ago at same values
        if (chartData.length === 0) {
            const anchorPoint: ChartDataPoint = { time: Date.now() - 60000 };
            outcomeNames.forEach(name => {
                anchorPoint[name] = 100 / outcomeNames.length; // Start at equal probability
            });
            setChartData([anchorPoint, newPoint]);
        } else {
            addDataPoint(newPoint);
        }

        setIsLoading(false);
    }, [outcomeSupplies, outcomeNames]);

    // Initial loading state - seed chart with 50/50 anchor if no data
    useEffect(() => {
        if (chartData.length === 0 && outcomeNames.length > 0) {
            const now = Date.now();
            const equalProb = 100 / outcomeNames.length;

            const anchorPoint: ChartDataPoint = { time: now - 60000 };
            const currentPoint: ChartDataPoint = { time: now };
            outcomeNames.forEach(name => {
                anchorPoint[name] = equalProb;
                currentPoint[name] = equalProb;
            });

            setChartData([anchorPoint, currentPoint]);
            setIsLoading(false);
        }
    }, [outcomeNames]);

    // Emit trade event (called externally via setLatestTrade)
    const emitTradeEvent = useCallback((trade: TradeEvent) => {
        setLatestTrade(trade);
        setTimeout(() => {
            setLatestTrade(null);
        }, 3000);
    }, []);

    // WebSocket connection for production
    const connectWebSocket = useCallback((wsUrl: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            ws.send(JSON.stringify({
                type: 'subscribe',
                marketId: marketId
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'probability_update') {
                    updateLastDataPoint(data.probabilities);
                } else if (data.type === 'trade') {
                    emitTradeEvent({
                        id: data.id,
                        side: data.side,
                        amount: data.amount,
                        amountUsd: data.amountUsd,
                        outcome: data.outcome,
                        timestamp: data.timestamp
                    });
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setTimeout(() => {
                connectWebSocket(wsUrl);
            }, 5000);
        };

        wsRef.current = ws;
    }, [marketId, updateLastDataPoint, emitTradeEvent]);

    return {
        chartData,
        latestTrade,
        isLoading,
        addDataPoint,
        updateLastDataPoint,
        emitTradeEvent,
        connectWebSocket
    };
}

// Hook for chart statistics
export function useChartStats(data: ChartDataPoint[], outcomeNames: string[]) {
    const [stats, setStats] = useState<{
        current: Record<string, number>;
        change24h: Record<string, number>;
        high24h: Record<string, number>;
        low24h: Record<string, number>;
    }>({
        current: {},
        change24h: {},
        high24h: {},
        low24h: {}
    });

    useEffect(() => {
        if (data.length === 0) return;

        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const last24h = data.filter(d => d.time >= oneDayAgo);

        const newStats: typeof stats = {
            current: {},
            change24h: {},
            high24h: {},
            low24h: {}
        };

        outcomeNames.forEach(outcome => {
            const current = data[data.length - 1][outcome] || 0;
            newStats.current[outcome] = current;

            if (last24h.length > 0) {
                const start24h = last24h[0][outcome] || 0;
                newStats.change24h[outcome] = current - start24h;

                const values24h = last24h.map(d => d[outcome] || 0);
                newStats.high24h[outcome] = Math.max(...values24h);
                newStats.low24h[outcome] = Math.min(...values24h);
            }
        });

        setStats(newStats);
    }, [data, outcomeNames]);

    return stats;
}
