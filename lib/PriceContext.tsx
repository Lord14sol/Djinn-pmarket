'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PriceContextType {
    solPrice: number;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: React.ReactNode }) {
    const [solPrice, setSolPrice] = useState<number>(0); // Start at 0 to indicate loading

    const fetchPrice = async () => {
        try {
            // 1. Try Jupiter API (Fastest)
            const res = await fetch('https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112');
            const data = await res.json();
            const price = data?.data?.['So11111111111111111111111111111111111111112']?.price;
            if (price) {
                setSolPrice(parseFloat(price));
                return;
            }
            throw new Error("Jupiter failed");
        } catch (error) {
            // 2. Fallback to CoinGecko
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
                const data = await res.json();
                if (data.solana.usd) {
                    setSolPrice(data.solana.usd);
                }
            } catch (e) {
                console.warn('All price APIs failed');
            }
        }
    };

    useEffect(() => {
        fetchPrice();
        const interval = setInterval(fetchPrice, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <PriceContext.Provider value={{ solPrice }}>
            {children}
        </PriceContext.Provider>
    );
}

export function usePrice() {
    const context = useContext(PriceContext);
    if (context === undefined) {
        throw new Error('usePrice must be used within a PriceProvider');
    }
    return context;
}
