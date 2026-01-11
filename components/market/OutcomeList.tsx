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

            <div className="space-y-1.5">
                {outcomes.map((outcome, idx) => {
                    const color = OUTCOME_COLORS[idx % OUTCOME_COLORS.length];
                    const isSelected = selectedId === outcome.id;

                    return (
                        <div
                            key={outcome.id}
                            className={`group relative grid grid-cols-12 gap-4 items-center p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                                ? 'bg-white/5 border-[#F492B7]/50 shadow-[0_0_15px_rgba(244,146,183,0.1)]'
                                : 'bg-[#0E0E0E] border-white/5 hover:bg-white/10 hover:border-white/20'
                                }`}
                            onClick={() => onSelect(outcome.id)}
                        >
                            {/* Left: Identity (Image + Name) */}
                            <div className="col-span-6 flex items-center gap-4">
                                {/* Color / Image Indicator */}
                                <div className="relative">
                                    <div
                                        className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-black/50"
                                        style={{ boxShadow: `0 0 10px ${color}40` }}
                                    >
                                        {outcome.image ? (
                                            <Image src={outcome.image} alt={outcome.title} width={32} height={32} />
                                        ) : (
                                            // Fallback to initial or icon
                                            <span className="text-xs font-bold" style={{ color }}>
                                                {outcome.title.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    {/* Tiny dot indicator */}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0E0E0E]" style={{ backgroundColor: color }} />
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold text-white truncate group-hover:text-[#F492B7] transition-colors leading-tight">
                                        {outcome.title}
                                    </span>
                                    {/* Mobile volume visible, desktop hidden usually, but nice to have */}
                                    <span className="text-[10px] text-gray-600 font-mono hidden sm:block">
                                        ${outcome.volume} Vol
                                    </span>
                                </div>
                            </div>

                            {/* Center: Chance */}
                            <div className="col-span-2 flex flex-col items-center justify-center">
                                <span className="text-lg font-black tracking-tight" style={{ color }}>
                                    {outcome.chance}%
                                </span>
                            </div>

                            {/* Right: Buy Buttons */}
                            <div className="col-span-4 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => onBuyClick?.(outcome.id, outcome.title, 'YES', outcome.yesPrice)}
                                    className="flex-1 max-w-[80px] py-1.5 rounded-lg text-xs font-bold bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981] hover:text-black transition-all flex flex-col items-center gap-0.5"
                                >
                                    <span className="uppercase text-[9px] opacity-80">Yes</span>
                                    <span>{outcome.yesPrice}¢</span>
                                </button>
                                <button
                                    onClick={() => onBuyClick?.(outcome.id, outcome.title, 'NO', outcome.noPrice)}
                                    className="flex-1 max-w-[80px] py-1.5 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-black transition-all flex flex-col items-center gap-0.5"
                                >
                                    <span className="uppercase text-[9px] opacity-80">No</span>
                                    <span>{outcome.noPrice}¢</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
