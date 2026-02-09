'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSocialShare } from '@/hooks/useSocialShare';

interface WinningClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    amountWon: number;
    roi: number;
    marketTitle: string;
    onClaim: () => void;
}

export function WinningClaimModal({
    isOpen,
    onClose,
    amountWon,
    roi,
    marketTitle,
    onClaim
}: WinningClaimModalProps) {
    // We attach the share logic to the "Receipt" part of the modal
    const { shareRef, handleShare, isGenerating } = useSocialShare(`Won ${amountWon} SOL`);

    useEffect(() => {
        if (isOpen) {
            // Trigger confetti
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#10B981', '#3B82F6', '#F43F5E']
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#10B981', '#3B82F6', '#F43F5E']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#111] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden relative shadow-2xl"
                >
                    {/* Close Button */}
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                        <X size={24} />
                    </button>

                    {/* CONTENT FOR CAPTURE (The aesthetic part) */}
                    <div ref={shareRef} className="p-8 bg-[#111] flex flex-col items-center text-center relative overflow-hidden">

                        {/* Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]"></div>

                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)] z-10"
                        >
                            <CheckCircle2 size={40} className="text-black" strokeWidth={3} />
                        </motion.div>

                        <h2 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2 z-10">You Won!</h2>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-4 z-10">
                            {amountWon.toFixed(2)} <span className="text-emerald-500">SOL</span>
                        </h1>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full mb-6 z-10">
                            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Market</p>
                            <p className="text-white font-bold text-sm truncate">{marketTitle}</p>

                            <div className="w-full border-t border-white/10 my-3"></div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-xs uppercase">Return</span>
                                <span className="text-emerald-400 font-black text-xl">+{roi.toFixed(0)}%</span>
                            </div>
                        </div>

                        <div className="absolute bottom-4 opacity-30 text-[10px] uppercase font-black tracking-[0.5em] text-white/50">
                            Djinn.fun Winner
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="p-6 pt-0 flex gap-4">
                        <button
                            onClick={onClaim}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_4px_0_0_#059669] active:shadow-none active:translate-y-1 transition-all"
                        >
                            Claim Proceeds
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={isGenerating}
                            className="flex-1 bg-[#222] hover:bg-[#333] text-white font-bold uppercase tracking-wider py-4 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <span className="animate-pulse">Saving...</span>
                            ) : (
                                <>
                                    Share on X
                                </>
                            )}
                        </button>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
}
