'use client';

import React from 'react';
import Image from 'next/image';

export interface Outcome {
    id: string;
    title: string;
    volume: string;
    yesPrice: number;
    noPrice: number;
    chance: number;
    image?: string; // Optional image for the outcome
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

export default function OutcomeList({ outcomes, selectedId, onSelect, onBuyClick }: OutcomeListProps) {
    return (
        <div className="w-full">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 text-[10px] font-black uppercase text-gray-500 mb-3 px-4 tracking-wider">
                <div className="col-span-6">Outcome</div>
                <div className="col-span-2 text-center">Chance</div>
                <div className="col-span-4 text-right">Price</div>
            </div>

            <div className="space-y-2">
                {outcomes.map((outcome, idx) => {
                    const color = OUTCOME_COLORS[idx % OUTCOME_COLORS.length];
                    const isSelected = selectedId === outcome.id;

                    return (
                        <div
                            key={outcome.id}
                            className={`group relative flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${isSelected
                                ? 'bg-white/10 border-[#F492B7] shadow-[0_0_20px_rgba(244,146,183,0.2)]'
                                : 'bg-[#0E0E0E] border-white/5 hover:bg-white/5 hover:border-[#F492B7]/50 hover:shadow-[0_0_15px_rgba(244,146,183,0.1)]'
                                }`}
                            onClick={() => {
                                onSelect(outcome.id);
                                if (onBuyClick) {
                                    // For multi-outcome, we treat everything as a 'Buy' on that specific outcome
                                    onBuyClick(outcome.id, outcome.title, 'YES', outcome.yesPrice);
                                }
                            }}
                        >
                            {/* Left: Identity (Image + Name) */}
                            <div className="flex items-center gap-4 flex-1">
                                {/* Color / Image Indicator */}
                                <div className="relative group-hover:scale-110 transition-transform duration-300">
                                    <div
                                        className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-black/50"
                                        style={{ boxShadow: `0 0 10px ${color}40` }}
                                    >
                                        {outcome.image ? (
                                            <Image src={outcome.image} alt={outcome.title} width={32} height={32} />
                                        ) : (
                                            <span className="text-sm font-bold" style={{ color }}>
                                                {outcome.title.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <span className={`text-base font-bold truncate transition-colors leading-tight ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                        {outcome.title}
                                    </span>
                                    {/* Mobile volume visible */}
                                    <span className="text-[11px] text-gray-500 font-mono">
                                        ${outcome.volume} Vol
                                    </span>
                                </div>
                            </div>

                            {/* Right: Chance */}
                            <div className="flex items-center gap-4">
                                <span className={`block text-xl font-black tracking-tight ${isSelected ? 'text-[#F492B7]' : ''}`} style={{ color: isSelected ? '#F492B7' : color }}>
                                    {outcome.chance}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
