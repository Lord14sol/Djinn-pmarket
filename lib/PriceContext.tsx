'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PriceContextType {
    solPrice: number;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: React.ReactNode }) {
    const [solPrice, setSolPrice] = useState<number>(250); // Default placeholder

    const fetchPrice = async () => {
        try {
            const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
            const data = await res.json();
            if (data.price) {
                setSolPrice(parseFloat(data.price));
            }
        } catch (error) {
            console.error('Error fetching SOL price:', error);
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
