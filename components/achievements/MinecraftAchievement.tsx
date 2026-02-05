'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAchievement } from '@/lib/AchievementContext';

export default function MinecraftAchievement() {
    const { currentAchievement, isVisible, closeAchievement } = useAchievement();

    return (
        <AnimatePresence>
            {isVisible && currentAchievement && (
                <motion.div
                    initial={{ x: 400, opacity: 0, rotate: 5 }}
                    animate={{ x: 0, opacity: 1, rotate: 0 }}
                    exit={{ x: 400, opacity: 0, rotate: 5 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    onClick={closeAchievement}
                    className="fixed top-32 right-6 z-[200] flex items-center gap-5 bg-white border-2 border-black p-5 rounded-xl shadow-[8px_8px_0px_0px_#F492B7] min-w-[340px] max-w-[400px] cursor-pointer hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#F492B7] transition-all active:shadow-none active:translate-y-2"
                >
                    {/* Medal Icon Wrapper - Stamp Style */}
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center bg-black border-2 border-black rounded-lg transform -rotate-3">
                        <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:4px_4px] opacity-20"></div>
                        <img
                            src={currentAchievement.image_url}
                            alt={currentAchievement.name}
                            className="w-12 h-12 object-contain relative z-10 drop-shadow-[0_0_10px_rgba(244,146,183,0.5)]"
                        />
                    </div>

                    {/* Text Container */}
                    <div className="flex flex-col justify-center gap-1">
                        <span className="bg-[#F492B7] text-black text-[10px] font-black uppercase tracking-widest w-max px-2 py-0.5 rounded-sm border border-black mb-1">
                            Achievement Unlocked
                        </span>
                        <span className="text-black font-black text-xl leading-none uppercase tracking-tight">
                            {currentAchievement.name}
                        </span>
                        <span className="text-gray-500 text-xs font-bold leading-tight mt-0.5">
                            {currentAchievement.description || "Welcome to the future."}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
