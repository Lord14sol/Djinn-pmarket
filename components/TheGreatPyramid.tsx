'use client';

import React from 'react';
import Link from 'next/link';

interface PyramidMarket {
    title: string;
    slug: string;
    icon: string;
    volume: string;
    betsCount: number;
    chance: number;
    endDate?: Date;
}

interface TheGreatPyramidProps {
    topMarket: PyramidMarket | null;
}

export default function TheGreatPyramid({ topMarket }: TheGreatPyramidProps) {
    if (!topMarket) return null;

    return (
        <section className="px-6 md:px-12 max-w-[1600px] mx-auto mb-20 mt-10">
            {/* Trending Header */}
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-black text-white tracking-tight">Trending</h2>
                <div className="h-px flex-1 bg-white/10"></div>
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] border border-white/5 shadow-2xl group">
                {/* Background Modern Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-50"></div>

                {/* Subtle animated spotlight */}
                <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity duration-1000"></div>

                {/* HOT Label - Corner */}
                <div className="absolute top-0 right-0 z-20">
                    <div className="bg-[#F492B7] text-black text-xs font-black px-6 py-2 rounded-bl-2xl uppercase tracking-widest shadow-lg">
                        HOT 🔥
                    </div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-stretch">

                    {/* LEFT SIDE: Visual / Icon - FULL BLEED HBO STYLE */}
                    <div className="w-full md:w-[400px] bg-black border-r border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">

                        {typeof topMarket.icon === 'string' && topMarket.icon.startsWith('data:image') ? (
                            <>
                                {/* 1. Blurred Backdrop */}
                                <img src={topMarket.icon} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-2xl scale-125 pointer-events-none" />
                                {/* 2. Main Image (No Crop) */}
                                <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
                                    <img src={topMarket.icon} alt="" className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-700" />
                                </div>
                            </>
                        ) : (
                            /* Fallback for Emoji/Text Icons: Keep them centered but larger */
                            <div className="relative z-10 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1F1F1F] to-black">
                                <span className="text-9xl drop-shadow-2xl filter block scale-150">{topMarket.icon || '🔮'}</span>
                            </div>
                        )}

                        {/* Overlay Gradient for Text Readability if needed */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                    </div>

                    {/* RIGHT SIDE: Content */}
                    <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative">

                        <Link href={`/market/${topMarket.slug}`} className="block group/link">
                            <h2 className="text-4xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter mb-8 group-hover/link:text-[#F492B7] transition-colors">
                                {topMarket.title}
                            </h2>
                        </Link>

                        {/* Stats Row */}
                        <div className="flex flex-wrap items-center gap-6 mb-8">
                            <div className="flex flex-col">
                                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Volume</span>
                                <span className="text-white text-2xl font-black">{topMarket.volume}</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="flex flex-col">
                                <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Odds</span>
                                <span className="text-emerald-400 text-2xl font-black">{topMarket.chance}%</span>
                            </div>

                            {/* Bonding Curve */}
                            <div className="flex-1 min-w-[150px] max-w-[300px] ml-auto">
                                {(() => {
                                    const cleanVol = topMarket.volume.replace(/[$,]/g, '');
                                    let percent = 0;
                                    if (cleanVol.includes('M')) percent = Math.min(98, 40 + parseFloat(cleanVol) * 5);
                                    else if (cleanVol.includes('K')) percent = Math.min(40, 5 + parseFloat(cleanVol) / 10);
                                    else if (parseFloat(cleanVol) > 0) percent = 5;
                                    else percent = Math.floor(Math.random() * 40 + 20);

                                    return (
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500 items-baseline">
                                                <span>Bonding Curve</span>
                                                <span className="text-[#F492B7] font-mono text-xs drop-shadow-[0_0_5px_rgba(244,146,183,0.5)]">{Math.round(percent)}%</span>
                                            </div>
                                            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#F492B7] via-purple-500 to-purple-600 rounded-full relative shadow-[0_0_15px_rgba(244,146,183,0.6)]"
                                                    style={{ width: `${percent}%` }}
                                                >
                                                    {/* Animated Stripes Background */}
                                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:12px_12px] animate-[slide_1s_linear_infinite] opacity-30"></div>

                                                    {/* Shimmer */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>

                                                    {/* End glowing sparkle */}
                                                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)] animate-pulse"></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Big Yes/No Buttons */}
                        <div className="grid grid-cols-2 gap-4 mt-auto">
                            <Link href={`/market/${topMarket.slug}`} className="w-full">
                                <button
                                    className="w-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black text-4xl rounded-[2rem] py-8 flex flex-col items-center justify-center transition-all duration-300 shadow-lg uppercase tracking-widest h-[140px] group/no"
                                >
                                    <span className="text-xs font-black uppercase mb-2 opacity-60 tracking-[0.2em] group-hover/no:opacity-100 text-red-300 group-hover/no:text-white transition-opacity">No</span>
                                    <span>{100 - topMarket.chance}¢</span>
                                </button>
                            </Link>

                            <Link href={`/market/${topMarket.slug}`} className="w-full">
                                <button
                                    className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white font-black text-4xl rounded-[2rem] py-8 flex flex-col items-center justify-center transition-all duration-300 shadow-lg uppercase tracking-widest h-[140px] group/yes"
                                >
                                    <span className="text-xs font-black uppercase mb-2 opacity-60 tracking-[0.2em] group-hover/yes:opacity-100 text-emerald-300 group-hover/yes:text-white transition-opacity">Yes</span>
                                    <span>{topMarket.chance}¢</span>
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
