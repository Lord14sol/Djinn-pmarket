'use client';

import React from 'react';
import MarketCard from '@/components/MarketCard';
import { motion } from 'framer-motion';

interface TheGreatPyramidProps {
    topMarkets: any[];
}

export default function TheGreatPyramid({ topMarkets }: TheGreatPyramidProps) {
    if (!topMarkets || topMarkets.length === 0) return null;

    // Podium indices: Center (Winner) is index 0. Left is index 1. Right is index 2.
    const winner = topMarkets[0];
    const second = topMarkets.length > 1 ? topMarkets[1] : null;
    const third = topMarkets.length > 2 ? topMarkets[2] : null;

    return (
        <section className="px-4 md:px-12 max-w-[1400px] mx-auto mb-24 mt-10 relative">
            <div className="flex items-center gap-3 mb-10 justify-center">
                <div className="h-px w-24 bg-gradient-to-r from-transparent to-white/20"></div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">Trending Podium</h2>
                <div className="h-px w-24 bg-gradient-to-l from-transparent to-white/20"></div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 lg:gap-12 relative">

                {/* 2nd Place (Left) */}
                {second && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: 20 }}
                        animate={{
                            opacity: 1,
                            y: [0, -10, 0],
                            x: 0
                        }}
                        transition={{
                            duration: 0.6,
                            y: {
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.5
                            }
                        }}
                        className="order-2 md:order-1 w-full md:w-[320px] lg:w-[350px] relative mt-12 md:mt-32 z-10 perspective-1000 group"
                    >
                        {/* Large Rank Number - 2 */}
                        <div className="absolute -left-10 top-0 -translate-y-1/2 z-0">
                            <span className="text-[10rem] font-black text-white/5 leading-none select-none drop-shadow-md group-hover:text-white/10 transition-colors" style={{ fontFamily: 'var(--font-adriane), serif' }}>2</span>
                        </div>
                        <div className="relative z-10 transform md:scale-95 hover:scale-[0.98] transition-transform duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                            <MarketCard {...second} />
                        </div>
                    </motion.div>
                )}

                {/* 1st Place (Center - Elevated) */}
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{
                        opacity: 1,
                        y: [0, -15, 0],
                        scale: 1
                    }}
                    transition={{
                        duration: 0.8,
                        type: "spring",
                        y: {
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }
                    }}
                    className="order-1 md:order-2 w-full md:w-[360px] lg:w-[400px] relative z-20 perspective-1000"
                >
                    {/* Crown - Static, no bounce */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30">
                        <div className="text-6xl drop-shadow-[0_0_25px_rgba(255,215,0,0.6)] filter brightness-110">👑</div>
                    </div>

                    {/* Winner Card with Clean Pink Border */}
                    <div className="transform md:scale-105 rounded-2xl p-[2px] bg-gradient-to-b from-[#F492B7] to-[#F492B7]/20 shadow-[0_0_60px_rgba(244,146,183,0.25)]">
                        <div className="rounded-[14px] overflow-hidden bg-[#0A0A0A] h-full">
                            <MarketCard {...winner} />
                        </div>
                    </div>
                </motion.div>

                {/* 3rd Place (Right) */}
                {third && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: -20 }}
                        animate={{
                            opacity: 1,
                            y: [0, -10, 0],
                            x: 0
                        }}
                        transition={{
                            duration: 0.6,
                            delay: 0.2,
                            y: {
                                duration: 4.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 1
                            }
                        }}
                        className="order-3 md:order-3 w-full md:w-[320px] lg:w-[350px] relative mt-12 md:mt-32 z-10 perspective-1000 group"
                    >
                        {/* Large Rank Number - 3 */}
                        <div className="absolute -right-10 top-0 -translate-y-1/2 z-0">
                            <span className="text-[10rem] font-black text-white/5 leading-none select-none drop-shadow-md group-hover:text-white/10 transition-colors" style={{ fontFamily: 'var(--font-adriane), serif' }}>3</span>
                        </div>
                        <div className="relative z-10 transform md:scale-95 hover:scale-[0.98] transition-transform duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                            <MarketCard {...third} />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Podium Base Gradient */}
            <div className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 w-[80%] h-[100px] bg-[#F492B7] blur-[150px] opacity-10 pointer-events-none"></div>
        </section>
    );
}
