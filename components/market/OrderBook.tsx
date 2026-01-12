'use client';

import React, { useMemo } from 'react';

interface OrderBookProps {
    currentPrice: number;
    outcome: 'YES' | 'NO';
    lastOrder?: { price: number; shares: number; total: number; type: 'YES' | 'NO' } | null;
    activityData?: {
        username: string;
        avatar_url?: string;
        action: 'YES' | 'NO';
        sol_amount: number;
        shares: number;
        amount: number;
        created_at: string;
    }[];
}

export default function OrderBook({ currentPrice, outcome, lastOrder, activityData = [] }: OrderBookProps) {
    // Filter by current outcome and limit to recent orders
    const filteredActivity = useMemo(() => {
        return activityData
            .filter(a => a.action === outcome || (outcome === 'YES' && a.action === 'YES') || (outcome === 'NO' && a.action === 'NO'))
            .slice(0, 10);
    }, [activityData, outcome]);

    // Separate buys (shares > 0) and sells (shares === 0)
    const buys = filteredActivity.filter(a => a.shares > 0);
    const sells = filteredActivity.filter(a => a.shares === 0);

    const maxAmount = Math.max(...filteredActivity.map(a => a.amount), 1);

    if (filteredActivity.length === 0) {
        return (
            <div className="bg-[#0E0E0E] rounded-2xl border border-white/5 p-6 h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 text-sm">No orders yet</p>
                    <p className="text-gray-700 text-xs mt-1">Be the first to trade!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0E0E0E] rounded-2xl border border-white/5 overflow-hidden flex flex-col h-full text-xs">
            {/* HEADERS */}
            <div className="grid grid-cols-4 px-4 py-3 border-b border-white/5 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                <div className="text-left">User</div>
                <div className="text-right">SOL</div>
                <div className="text-right">USD</div>
                <div className="text-right">Type</div>
            </div>

            {/* ORDERS LIST */}
            <div className="flex-1 overflow-y-auto max-h-72">
                {filteredActivity.map((order, i) => {
                    const isSell = order.shares === 0;
                    const barWidth = (order.amount / maxAmount) * 100;

                    return (
                        <div
                            key={i}
                            className="relative grid grid-cols-4 px-4 py-2 hover:bg-white/5 transition-colors items-center"
                        >
                            {/* Visual Bar */}
                            <div
                                className={`absolute top-0 left-0 h-full transition-all duration-300 ${isSell ? 'bg-red-500/10' : 'bg-[#10B981]/10'}`}
                                style={{ width: `${barWidth}%` }}
                            />

                            {/* User */}
                            <div className="relative z-10 flex items-center gap-2">
                                {order.avatar_url ? (
                                    <img src={order.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#F492B7] to-[#E056A0] flex items-center justify-center text-[8px] font-bold text-black">
                                        {order.username?.slice(0, 1)?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <span className="text-white font-medium truncate text-[11px]">{order.username?.slice(0, 8) || 'Anon'}</span>
                            </div>

                            {/* SOL */}
                            <div className="relative z-10 text-right">
                                <span className="text-[#F492B7] font-bold">{order.sol_amount?.toFixed(2) || '0'}</span>
                            </div>

                            {/* USD */}
                            <div className="relative z-10 text-right text-gray-400 font-medium">
                                ${Math.round(order.amount)}
                            </div>

                            {/* Type */}
                            <div className="relative z-10 text-right">
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isSell ? 'bg-red-500/20 text-red-500' : 'bg-[#10B981]/20 text-[#10B981]'}`}>
                                    {isSell ? 'SELL' : 'BUY'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* SUMMARY */}
            <div className="py-2 px-4 text-center text-[10px] border-t border-white/5 bg-white/[0.02] flex justify-between">
                <span className="text-gray-600">
                    <span className="text-[#10B981] font-bold">{buys.length}</span> buys
                </span>
                <span className="text-gray-500 font-bold">
                    {outcome} @ {currentPrice}¢
                </span>
                <span className="text-gray-600">
                    <span className="text-red-500 font-bold">{sells.length}</span> sells
                </span>
            </div>
        </div>
    );
}

