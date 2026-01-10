'use client';

import React, { useMemo } from 'react';

interface OrderBookProps {
    currentPrice: number; // 0-100
    outcome: 'YES' | 'NO';
    lastOrder?: { price: number; shares: number; total: number; type: 'YES' | 'NO' } | null;
}

interface OrderRow {
    price: number;
    shares: number;
    total: number;
    type: 'ask' | 'bid';
}

export default function OrderBook({ currentPrice, outcome, lastOrder }: OrderBookProps) {
    // Generar libro de órdenes
    // Estado local para evitar hydration mismatch con Math.random()
    const [orders, setOrders] = React.useState<{ asks: OrderRow[]; bids: OrderRow[] }>({ asks: [], bids: [] });

    React.useEffect(() => {
        if (!lastOrder) return;
        const newRow: OrderRow = {
            price: Math.round(lastOrder.price),
            shares: Math.floor(lastOrder.shares),
            total: lastOrder.total,
            type: lastOrder.type === 'YES' ? 'bid' : 'ask'
        };

        setOrders(prev => {
            const newAsks = newRow.type === 'ask' ? [newRow, ...prev.asks].slice(0, 10) : prev.asks;
            const newBids = newRow.type === 'bid' ? [newRow, ...prev.bids].slice(0, 10) : prev.bids;
            return { asks: newAsks, bids: newBids };
        });
    }, [lastOrder]);

    React.useEffect(() => {
        // Init empty
    }, []);

    const { asks, bids } = orders;

    const maxShares = Math.max(...asks.map(a => a.shares), ...bids.map(b => b.shares));

    return (
        <div className="bg-[#0E0E0E] rounded-2xl border border-white/5 overflow-hidden flex flex-col h-full font-mono text-xs">
            {/* HEADERS */}
            <div className="grid grid-cols-3 px-4 py-3 border-b border-white/5 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                <div className="text-left">Price</div>
                <div className="text-right">Shares</div>
                <div className="text-right">Total</div>
            </div>

            {/* ASKS (RED) */}
            <div className="flex flex-col-reverse">
                {asks.map((order, i) => (
                    <div key={`ask-${i}`} className="relative grid grid-cols-3 px-4 py-1.5 hover:bg-white/5 transition-colors group">
                        {/* Visual Bar */}
                        <div
                            className="absolute top-0 right-0 h-full bg-red-500/10 transition-all duration-500"
                            style={{ width: `${(order.shares / maxShares) * 100}%` }}
                        />

                        <div className="relative z-10 text-red-500 font-bold">{order.price}¢</div>
                        <div className="relative z-10 text-right text-gray-300">{order.shares.toLocaleString()}</div>
                        <div className="relative z-10 text-right text-gray-500">${order.total.toFixed(2)}</div>
                    </div>
                ))}
            </div>

            {/* SPREAD INDICATOR */}
            <div className="py-2 text-center text-[10px] text-gray-600 font-black border-y border-white/5 bg-white/[0.02]">
                SPREAD: 2¢
            </div>

            {/* BIDS (GREEN) */}
            <div className="flex flex-col">
                {bids.map((order, i) => (
                    <div key={`bid-${i}`} className="relative grid grid-cols-3 px-4 py-1.5 hover:bg-white/5 transition-colors group">
                        {/* Visual Bar */}
                        <div
                            className="absolute top-0 right-0 h-full bg-[#10B981]/10 transition-all duration-500"
                            style={{ width: `${(order.shares / maxShares) * 100}%` }}
                        />

                        <div className="relative z-10 text-[#10B981] font-bold">{order.price}¢</div>
                        <div className="relative z-10 text-right text-gray-300">{order.shares.toLocaleString()}</div>
                        <div className="relative z-10 text-right text-gray-500">${order.total.toFixed(2)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
