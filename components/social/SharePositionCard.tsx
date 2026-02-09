'use client';

import React from 'react';
import { Share2 } from 'lucide-react';
import { formatCompact } from '@/lib/utils';
import { useSocialShare } from '@/hooks/useSocialShare';

interface SharePositionCardProps {
    marketTitle: string;
    outcome: string; // e.g., "HEADS" or "BTC UP"
    side: 'YES' | 'NO';
    investedAmount: number;
    currentOdds: number;
    payout: number;
    username: string;
    assetIcon?: string; // Optional icon URL
}

export function SharePositionCard({
    marketTitle,
    outcome,
    side,
    investedAmount,
    currentOdds,
    payout,
    username,
    assetIcon
}: SharePositionCardProps) {
    const { shareRef, handleShare, isGenerating } = useSocialShare(`Bought ${outcome}`);

    return (
        <div className="flex flex-col items-center gap-4">

            {/* INVISIBLE CAPTURE REF (But we render it visibly for now or hidden off-screen?) 
                Actually, to capture, it often needs to be in DOM. 
                Common trick: Render it behind a fixed overlay or z-index -9999, 
                OR just render it as the "Preview" user sees.
                Let's make it the "Preview" user sees when they click share.
            */}

            {/* THE CARD ITSELF */}
            <div ref={shareRef} className="w-[600px] h-[315px] bg-[#0F172A] relative overflow-hidden flex rounded-3xl shrink-0 scale-100 origin-top-left shadow-2xl">

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                </div>

                {/* Gradient Orb */}
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-40"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500 rounded-full blur-[80px] opacity-30"></div>

                {/* Left Side: Market Info */}
                <div className="w-1/3 border-r border-white/10 p-8 flex flex-col justify-between bg-black/20 backdrop-blur-sm relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            {assetIcon ? (
                                <img src={assetIcon} alt="asset" className="w-10 h-10 rounded-full" />
                            ) : (
                                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xl">🔮</div>
                            )}
                        </div>
                        <h3 className="font-extrabold text-white text-xl leading-tight uppercase tracking-wide line-clamp-3">
                            {marketTitle}
                        </h3>
                    </div>

                    <div className="mt-auto">
                        <div className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">Trader</div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500`}></div>
                            <span className="font-bold text-white text-sm">@{username}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Position Details */}
                <div className="flex-1 p-8 flex flex-col justify-between relative z-10">

                    {/* Header: Action */}
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="block text-xs uppercase tracking-[0.2em] text-gray-400 font-bold mb-1">Position</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-white italic tracking-tighter">BOUGHT</span>
                                <span className={`text-4xl font-black italic tracking-tighter uppercase ${side === 'YES' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {outcome}
                                </span>
                            </div>
                        </div>
                        <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Djinn.fun</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 my-6">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Invested</span>
                            <span className="text-xl font-bold text-white">{investedAmount.toFixed(2)} SOL</span>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Odds</span>
                            <span className="text-xl font-bold text-white">{currentOdds.toFixed(1)}%</span>
                        </div>
                        <div className="col-span-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-3 border border-blue-500/30 flex justify-between items-center">
                            <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold">Potential Payout</span>
                            <span className="text-2xl font-black text-white tracking-tight">{payout.toFixed(2)} SOL</span>
                        </div>
                    </div>

                    {/* Footer watermark */}
                    <div className="text-center opacity-40">
                        <span className="text-[10px] uppercase font-black tracking-[0.3em]">Predict • Win • Flex</span>
                    </div>

                </div>
            </div>

            {/* BUTTON TO TRIGGER SHARE */}
            <button
                onClick={handleShare}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-bold uppercase text-xs tracking-wider transition-all hover:-translate-y-0.5"
            >
                {isGenerating ? 'Generating...' : (
                    <>
                        <Share2 size={16} /> Share Position
                    </>
                )}
            </button>
        </div>
    );
}
