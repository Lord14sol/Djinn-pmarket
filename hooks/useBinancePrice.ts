import { useState, useEffect, useRef, useCallback } from 'react';

type PriceData = {
    price: number;
    time: number;
};

const SYMBOLS = {
    BTC: 'BTCUSDT',
    ETH: 'ETHUSDT',
    SOL: 'SOLUSDT'
};

const INTERVAL_MAPPING: Record<string, { apiInterval: string; limit: number }> = {
    '15m': { apiInterval: '1m', limit: 15 },
    '1h': { apiInterval: '1m', limit: 60 },
    '4h': { apiInterval: '5m', limit: 48 },
    '24h': { apiInterval: '15m', limit: 96 },
    '1w': { apiInterval: '1h', limit: 168 },
    'all': { apiInterval: '1d', limit: 365 }
};

// REST-only price polling (no WebSocket = no flashing)
const POLL_INTERVAL = 3000; // 3 seconds

export function useBinancePrice(symbol: 'BTC' | 'ETH' | 'SOL', interval: '15m' | '1h' | '4h' | '24h' | '1w' | 'all' = '15m') {
    const [price, setPrice] = useState<number>(0);
    const [history, setHistory] = useState<PriceData[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const apiSymbol = SYMBOLS[symbol];

    // Fetch chart history (klines)
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                if (!apiSymbol) return;
                const mapping = INTERVAL_MAPPING[interval] || INTERVAL_MAPPING['15m'];
                const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${apiSymbol}&interval=${mapping.apiInterval}&limit=${mapping.limit}`);
                const data = await res.json();

                if (Array.isArray(data)) {
                    const formattedHistory = data.map((k: any) => ({
                        time: k[0],
                        price: parseFloat(k[4])
                    }));
                    setHistory(formattedHistory);

                    if (formattedHistory.length > 0) {
                        setPrice(formattedHistory[formattedHistory.length - 1].price);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch binance history:', error);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [apiSymbol, interval]);

    // Poll current price every 3s via REST (zero flashing)
    const fetchCurrentPrice = useCallback(async () => {
        try {
            const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${apiSymbol}`);
            const data = await res.json();
            if (data && data.price) {
                const newPrice = parseFloat(data.price);
                const now = Date.now();

                setPrice(newPrice);

                // Append to history for chart (keep last 500 points)
                setHistory(prev => {
                    const last = prev[prev.length - 1];
                    // Only append if price actually changed
                    if (last && Math.abs(last.price - newPrice) < 0.001) return prev;
                    const updated = [...prev, { price: newPrice, time: now }];
                    if (updated.length > 500) return updated.slice(-500);
                    return updated;
                });
            }
        } catch {
            // Silent fail on poll — next tick will retry
        }
    }, [apiSymbol]);

    useEffect(() => {
        // Start polling
        fetchCurrentPrice();
        timerRef.current = setInterval(fetchCurrentPrice, POLL_INTERVAL);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [fetchCurrentPrice]);

    return { price, history, isLoadingHistory };
}
