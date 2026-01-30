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
                    initial={{ x: 400, opacity: 0, scale: 0.95 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: 400, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                    onClick={closeAchievement}
                    className="fixed top-48 right-6 z-[200] flex items-center gap-4 bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[320px] max-w-[400px] overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
                >
                    {/* Ambient Glow */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F492B7] to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#F492B7]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Medal Icon Wrapper */}
                    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                        <div className="absolute inset-0 bg-[#F492B7]/20 rounded-full blur-xl animate-pulse" />
                        <img
                            src={currentAchievement.image_url}
                            alt={currentAchievement.name}
                            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(244,146,183,0.3)]"
                        />
                    </div>

                    {/* Text Container */}
                    <div className="flex flex-col justify-center gap-0.5 relative z-10">
                        <span className="text-[#F492B7] font-bold text-[10px] tracking-[0.2em] uppercase">
                            UNLOCKED
                        </span>
                        <span className="text-white font-bold text-xl leading-none tracking-tight font-sans">
                            {currentAchievement.name}
                        </span>
                        <span className="text-gray-400 text-xs font-medium leading-tight mt-1 line-clamp-2">
                            {currentAchievement.description || "First time connecting to Djinn"}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
