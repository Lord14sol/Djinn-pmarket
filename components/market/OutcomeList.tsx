'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface Outcome {
    id: string;
    title: string;
    volume: string;
    yesPrice: number;
    noPrice: number;
    chance: number;
}

interface OutcomeListProps {
    outcomes: Outcome[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onBuyClick?: (outcomeId: string, outcomeName: string, side: 'YES' | 'NO', price: number) => void;
}

// Color palette matching MultiLineChart
const OUTCOME_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red  
    '#F97316', // Orange
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F59E0B', // Amber
];

// Generate mock chart data for an outcome
const generateOutcomeChartData = (basePrice: number) => {
    const data = [];
    for (let i = 0; i < 24; i++) {
        const variance = Math.sin(i * 0.5) * 3 + (Math.random() - 0.5) * 2;
        data.push({
            time: `${i}h`,
            value: Math.max(1, Math.min(99, basePrice + variance))
        });
    }
    return data;
};

// Generate mock order book data
const generateOrderBook = (yesPrice: number) => {
    const asks = [];
    const bids = [];

    for (let i = 0; i < 4; i++) {
        asks.push({
            price: (yesPrice + 0.1 * (i + 1)).toFixed(1),
            shares: Math.floor(Math.random() * 500 + 50).toFixed(2),
            total: `$${(Math.random() * 100 + 10).toFixed(2)}`
        });
        bids.push({
            price: (yesPrice - 0.1 * (i + 1)).toFixed(1),
            shares: Math.floor(Math.random() * 500 + 50).toFixed(2),
            total: `$${(Math.random() * 100 + 10).toFixed(2)}`
        });
    }

    return { asks, bids };
};

export default function OutcomeList({ outcomes, selectedId, onSelect, onBuyClick }: OutcomeListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'orderbook' | 'graph'>('orderbook');

    return (
        <div className="space-y-3">
            {outcomes.map((outcome, idx) => {
                const color = OUTCOME_COLORS[idx % OUTCOME_COLORS.length];
                const isSelected = selectedId === outcome.id;
                const isExpanded = expandedId === outcome.id;
                const chartData = generateOutcomeChartData(outcome.yesPrice);
                const orderBook = generateOrderBook(outcome.yesPrice);

                return (
                    <div key={outcome.id} className="relative">
                        {/* Main outcome row */}
                        <div
                            className={`relative border rounded-2xl p-4 transition-all cursor-pointer group overflow-hidden ${isSelected
                                ? 'bg-white/5 border-[#F492B7] shadow-lg shadow-[#F492B7]/10'
                                : 'bg-[#0E0E0E] border-white/5 hover:border-white/20'
                                } ${isExpanded ? 'rounded-b-none' : ''}`}
                            onClick={() => {
                                onSelect(outcome.id);
                                setExpandedId(isExpanded ? null : outcome.id);
                                onBuyClick?.(outcome.id, outcome.title, 'YES', outcome.yesPrice);
                            }}
                        >
                            {/* Progress bar background */}
                            <div
                                className="absolute left-0 top-0 h-full opacity-10 transition-all"
                                style={{
                                    width: `${outcome.chance}%`,
                                    backgroundColor: color
                                }}
                            />

                            <div className="relative flex items-center justify-between gap-4">
                                {/* Left: Color indicator + Name */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-base font-bold text-white truncate group-hover:text-[#F492B7] transition-colors">
                                            {outcome.title}
                                        </h4>
                                        <p className="text-[10px] text-gray-500 font-medium">{outcome.volume} Vol.</p>
                                    </div>
                                </div>

                                {/* Center: Chance with change indicator */}
                                <div className="text-center px-4 flex items-center gap-2">
                                    <span className="text-xl font-black" style={{ color }}>{outcome.chance}%</span>
                                    <span className="text-[10px] font-bold text-emerald-500">▲ 2%</span>
                                </div>

                                {/* Right: Buy buttons */}
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => onBuyClick?.(outcome.id, outcome.title, 'YES', outcome.yesPrice)}
                                        className="px-4 py-2 rounded-xl text-xs font-black transition-all uppercase bg-[#10B981]/10 border border-[#10B981]/30 hover:bg-[#10B981] hover:text-white text-[#10B981]"
                                    >
                                        Yes {outcome.yesPrice}¢
                                    </button>
                                    <button
                                        onClick={() => onBuyClick?.(outcome.id, outcome.title, 'NO', outcome.noPrice)}
                                        className="px-4 py-2 rounded-xl text-xs font-black transition-all uppercase bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-500"
                                    >
                                        No {outcome.noPrice}¢
                                    </button>
                                </div>

                                {/* Expand indicator */}
                                <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Expanded content - Order Book & Graph */}
                        {isExpanded && (
                            <div
                                className="bg-[#0A0A0A] border border-t-0 border-white/10 rounded-b-2xl overflow-hidden"
                                style={{
                                    animation: 'slideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                                }}
                            >
                                {/* Tabs */}
                                <div className="flex border-b border-white/10">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('orderbook'); }}
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'orderbook'
                                            ? 'text-white bg-white/5 border-b-2 border-[#F492B7]'
                                            : 'text-gray-500 hover:text-white'
                                            }`}
                                    >
                                        Order Book
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('graph'); }}
                                        className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'graph'
                                            ? 'text-white bg-white/5 border-b-2 border-[#F492B7]'
                                            : 'text-gray-500 hover:text-white'
                                            }`}
                                    >
                                        Graph
                                    </button>
                                </div>

                                {/* Order Book Tab */}
                                {activeTab === 'orderbook' && (
                                    <div className="p-4">
                                        {/* Header */}
                                        <div className="grid grid-cols-4 text-[10px] font-black uppercase text-gray-500 mb-3 px-2">
                                            <span>Side</span>
                                            <span className="text-right">Price</span>
                                            <span className="text-right">Shares</span>
                                            <span className="text-right">Total</span>
                                        </div>

                                        {/* Asks (Sell orders) */}
                                        <div className="mb-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-red-500/20 text-red-400">Asks</span>
                                            </div>
                                            {orderBook.asks.map((ask, i) => (
                                                <div key={i} className="grid grid-cols-4 items-center py-2 px-2 hover:bg-white/5 rounded relative overflow-hidden">
                                                    {/* Volume bar behind */}
                                                    <div
                                                        className="absolute left-0 top-0 h-full bg-red-500/10"
                                                        style={{ width: `${80 - i * 15}%` }}
                                                    />
                                                    <span className="relative z-10 text-xs text-red-400 font-bold">Sell</span>
                                                    <span className="relative z-10 text-xs text-red-400 font-bold text-right">{ask.price}¢</span>
                                                    <span className="relative z-10 text-xs text-gray-400 text-right">{ask.shares}</span>
                                                    <span className="relative z-10 text-xs text-gray-500 text-right">{ask.total}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Spread indicator */}
                                        <div className="flex justify-between items-center py-2 px-3 border-y border-white/10 bg-white/5 rounded-lg my-3">
                                            <span className="text-xs font-bold text-white">Last: {outcome.yesPrice}¢</span>
                                            <span className="text-xs font-bold text-gray-400">Spread: 0.5¢</span>
                                        </div>

                                        {/* Bids (Buy orders) */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Bids</span>
                                            </div>
                                            {orderBook.bids.map((bid, i) => (
                                                <div key={i} className="grid grid-cols-4 items-center py-2 px-2 hover:bg-white/5 rounded relative overflow-hidden">
                                                    {/* Volume bar behind */}
                                                    <div
                                                        className="absolute left-0 top-0 h-full bg-emerald-500/10"
                                                        style={{ width: `${70 - i * 12}%` }}
                                                    />
                                                    <span className="relative z-10 text-xs text-emerald-400 font-bold">Buy</span>
                                                    <span className="relative z-10 text-xs text-emerald-400 font-bold text-right">{bid.price}¢</span>
                                                    <span className="relative z-10 text-xs text-gray-400 text-right">{bid.shares}</span>
                                                    <span className="relative z-10 text-xs text-gray-500 text-right">{bid.total}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Graph Tab */}
                                {activeTab === 'graph' && (
                                    <div className="p-4 relative">
                                        {/* Djinn watermark */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-[0.12]">
                                            <div className="flex items-center gap-0">
                                                <Image src="/star.png" alt="Djinn" width={120} height={120} className="-mr-3" />
                                                <span className="text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                                                    Djinn
                                                </span>
                                            </div>
                                        </div>

                                        <div className="h-48">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id={`gradient-${outcome.id}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                                                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="time"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#666', fontSize: 10 }}
                                                    />
                                                    <YAxis
                                                        domain={[0, 100]}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#666', fontSize: 10 }}
                                                        tickFormatter={(v) => `${v}%`}
                                                        width={35}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(0,0,0,0.9)',
                                                            border: `1px solid ${color}40`,
                                                            borderRadius: '12px',
                                                        }}
                                                        labelStyle={{ color: '#999', fontSize: 10 }}
                                                        formatter={(value: any) => [`${value.toFixed(1)}%`, 'Chance']}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke={color}
                                                        strokeWidth={2}
                                                        fill={`url(#gradient-${outcome.id})`}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Animation styles */}
            <style jsx global>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        max-height: 0;
                        transform: translateY(-15px);
                    }
                    to {
                        opacity: 1;
                        max-height: 600px;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
