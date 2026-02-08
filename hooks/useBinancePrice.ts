import { useState, useEffect, useRef } from 'react';

type PriceData = {
    price: number;
    time: number;
};

const SYMBOLS = {
    BTC: 'btcusdt',
    ETH: 'ethusdt',
    SOL: 'solusdt'
};

const INTERVAL_MAPPING = {
    '15m': { apiInterval: '1m', limit: 15 },
    '1h': { apiInterval: '1m', limit: 60 },
    '4h': { apiInterval: '5m', limit: 48 }, // 48 * 5m = 240m = 4h
    '24h': { apiInterval: '15m', limit: 96 }, // 96 * 15m = 24h
    '1w': { apiInterval: '1h', limit: 168 }, // 168 * 1h = 168h = 7d
    'all': { apiInterval: '1d', limit: 365 } // 1 year daily?
};

export function useBinancePrice(symbol: 'BTC' | 'ETH' | 'SOL', interval: '15m' | '1h' | '4h' | '24h' | '1w' | 'all' = '15m') {
    const [price, setPrice] = useState<number>(0);
    const [history, setHistory] = useState<PriceData[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const wsRef = useRef<WebSocket | null>(null);

    // Fetch History using REST API
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const wsSymbol = SYMBOLS[symbol]; // e.g., btcusdt
                const mapping = INTERVAL_MAPPING[interval] || INTERVAL_MAPPING['15m'];
                // Binance API: [time, open, high, low, close, volume, ...]
                const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${wsSymbol.toUpperCase()}&interval=${mapping.apiInterval}&limit=${mapping.limit}`);
                const data = await res.json();

                if (Array.isArray(data)) {
                    const formattedHistory = data.map((k: any) => ({
                        time: k[0], // Open time
                        price: parseFloat(k[4]) // Close price
                    }));
                    setHistory(formattedHistory);

                    // Set initial price to the latest close
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
    }, [symbol, interval]);

    // Live Updates using WebSocket
    useEffect(() => {
        const wsSymbol = SYMBOLS[symbol];
        // Stream: <symbol>@kline_<interval> or @trade?
        // Use @trade for real-time price updates (fluidity)
        // But for chart, we might want to throttle
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@trade`);
        wsRef.current = ws;

        let lastUpdateTime = 0;

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const currentPrice = parseFloat(data.p);
            const time = data.T;

            setPrice(currentPrice);

            // Throttle history updates to avoid flooding chart state (e.g., max 1 update per second)
            const now = Date.now();
            if (now - lastUpdateTime > 1000) {
                setHistory(prev => {
                    const newPoint = { price: currentPrice, time };
                    const newHistory = [...prev, newPoint];
                    // Keep buffer size reasonable (e.g. initial size + 100)
                    // But we want to keep the "window" correct? 
                    // For now, just append. Recharts handles large arrays ok up to a point.
                    // Maybe limit to 500
                    if (newHistory.length > 500) return newHistory.slice(-500);
                    return newHistory;
                });
                lastUpdateTime = now;
            }
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [symbol]);

    return { price, history, isLoadingHistory };
}
