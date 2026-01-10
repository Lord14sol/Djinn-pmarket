'use client';

import React from 'react';

export interface Outcome {
    id: string; // Slug or ID
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
}

export default function OutcomeList({ outcomes, selectedId, onSelect }: OutcomeListProps) {
    return (
        <div className="space-y-4">
            {outcomes.map((outcome) => (
                <div
                    key={outcome.id}
                    onClick={() => onSelect(outcome.id)}
                    className={`border rounded-2xl p-4 transition-all cursor-pointer group ${selectedId === outcome.id ? 'bg-white/5 border-[#F492B7] shadow-lg shadow-[#F492B7]/10' : 'bg-[#0E0E0E] border-white/5 hover:border-white/20'}`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h4 className="text-lg font-bold text-white group-hover:text-[#F492B7] transition-colors">{outcome.title}</h4>
                            <p className="text-xs text-gray-500 font-medium">{outcome.volume} Vol.</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-white">{outcome.chance}%</span>
                            <span className="block text-[10px] text-gray-500 uppercase tracking-widest">Chance</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                        <button className="bg-[#10B981]/10 border border-[#10B981]/20 hover:bg-[#10B981]/20 text-[#10B981] py-2 rounded-xl text-sm font-black transition-colors uppercase flex justify-between px-4">
                            <span>Buy Yes</span>
                            <span>{outcome.yesPrice}¢</span>
                        </button>
                        <button className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 py-2 rounded-xl text-sm font-black transition-colors uppercase flex justify-between px-4">
                            <span>Buy No</span>
                            <span>{outcome.noPrice}¢</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
