'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface PyramidMarket {
    title: string;
    slug: string;
    icon: string;
    volume: string;
    betsCount: number;
    chance: number;
    endDate?: Date;
    options?: any[];
}

interface TheGreatPyramidProps {
    topMarket: PyramidMarket | null;
}

export default function TheGreatPyramid({ topMarket }: TheGreatPyramidProps) {
    if (!topMarket) return null;

    const isMultiple = !!(topMarket.options && topMarket.options.length > 2);
    const options = topMarket.options || ['YES', 'NO'];

    return (
        <section className="px-6 md:px-12 max-w-[1600px] mx-auto mb-16 mt-6">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] border border-white/5 shadow-2xl min-h-[500px]">

                <div className="flex flex-col md:flex-row h-full">

                    {/* LEFT SIDE: Big Image (40%) */}
                    <div className="w-full md:w-[40%] h-[300px] md:h-auto relative overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-900">
                        {topMarket.icon && (topMarket.icon.startsWith('http') || topMarket.icon.startsWith('/') || topMarket.icon.startsWith('data:') || topMarket.icon.includes('ipfs')) ? (
                            <>
                                {/* Blurred background effect */}
                                <img
                                    src={topMarket.icon}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-125"
                                />
                                {/* Main Sharp Image */}
                                <img
                                    src={topMarket.icon}
                                    alt={topMarket.title}
                                    className="absolute inset-0 w-full h-full object-cover z-10 hover:scale-105 transition-transform duration-700"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                            const fallback = parent.querySelector('.image-fallback');
                                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                        }
                                    }}
                                />
                                <div className="image-fallback hidden absolute inset-0 w-full h-full items-center justify-center text-9xl bg-gradient-to-br from-white/5 to-transparent z-0">
                                    🔮
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-9xl bg-gradient-to-br from-white/5 to-transparent">
                                {topMarket.icon || '🔮'}
                            </div>
                        )}
                        {/* Gradient overlay for better text blending if needed */}
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent z-20 pointer-events-none" />
                    </div>

                    {/* RIGHT SIDE: Data & Buttons (60%) */}
                    <div className="flex-1 p-8 md:p-16 flex flex-col justify-center gap-10 relative z-10">

                        {/* Title Section */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-[#F492B7]/10 text-[#F492B7] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[#F492B7]/20">
                                    Top Volume
                                </span>
                                <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                    Active Market
                                </span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.1] tracking-tight hover:text-[#F492B7] transition-colors cursor-pointer" onClick={() => window.location.href = `/market/${topMarket.slug}`}>
                                {topMarket.title}
                            </h2>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-10">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">Total Volume</span>
                                <span className="text-2xl font-black text-white">{topMarket.volume}</span>
                            </div>
                            <div className="h-10 w-px bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">Trades</span>
                                <span className="text-2xl font-black text-white">{topMarket.betsCount.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Buttons Section */}
                        <div className="flex flex-col gap-4">
                            {isMultiple ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {options.slice(0, 3).map((opt: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/10 transition-all group cursor-pointer"
                                            onClick={() => window.location.href = `/market/${topMarket.slug}`}
                                        >
                                            <span className="text-lg font-bold text-gray-300 group-hover:text-white">
                                                {typeof opt === 'string' ? opt : opt.title}
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <button className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-xl hover:bg-emerald-500 hover:text-white transition-all uppercase">Yes</button>
                                                <button className="px-6 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black rounded-xl hover:bg-rose-500 hover:text-white transition-all uppercase">No</button>
                                            </div>
                                        </div>
                                    ))}
                                    {options.length > 3 && (
                                        <Link href={`/market/${topMarket.slug}`} className="text-center text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors tracking-widest">
                                            + {options.length - 3} More Options
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <Link href={`/market/${topMarket.slug}`} className="w-full group/btn">
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 py-8 rounded-3xl flex flex-col items-center gap-1 group-hover/btn:bg-emerald-500 transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                                            <span className="text-[10px] font-black uppercase text-emerald-400 group-hover/btn:text-white opacity-60 tracking-[0.2em]">Yes</span>
                                            <span className="text-4xl font-black text-emerald-400 group-hover/btn:text-white">{topMarket.chance}¢</span>
                                        </div>
                                    </Link>
                                    <Link href={`/market/${topMarket.slug}`} className="w-full group/btn">
                                        <div className="bg-rose-500/10 border border-rose-500/20 py-8 rounded-3xl flex flex-col items-center gap-1 group-hover/btn:bg-rose-500 transition-all duration-300 shadow-[0_0_30px_rgba(244,63,94,0.05)]">
                                            <span className="text-[10px] font-black uppercase text-rose-400 group-hover/btn:text-white opacity-60 tracking-[0.2em]">No</span>
                                            <span className="text-4xl font-black text-rose-400 group-hover/btn:text-white">{100 - topMarket.chance}¢</span>
                                        </div>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
