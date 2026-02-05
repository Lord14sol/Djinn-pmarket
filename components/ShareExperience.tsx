'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { X, Copy, Download, Share2, Shield, Crown, Zap, Check, RotateCw } from 'lucide-react';

// --- TYPES ---
export type ShareSkin = {
    id: string;
    label: string;
    bg: string;
    text: string;
    accent: string;
    type: 'color' | 'gradient' | 'image';
    contrast: 'light' | 'dark';
};

interface ShareExperienceProps {
    isOpen: boolean;
    onClose: () => void;
    layoutId: string;
    data: {
        title: string;
        username: string;
        stats: { label: string; value: string }[];
        imageUrl?: string;
        qrValue: string;
    };
}

// --- SKINS CONFIG (Salaja Style Grid) ---
const SKINS: ShareSkin[] = [
    { id: 'glass', label: 'Clean Glass', bg: 'bg-white/10 backdrop-blur-2xl', text: 'text-white', accent: 'bg-[#F492B7]', type: 'color', contrast: 'dark' },
    { id: 'dark', label: 'Onyx', bg: 'bg-[#0A0A0A]', text: 'text-white', accent: 'bg-emerald-500', type: 'color', contrast: 'dark' },
    { id: 'cyan', label: 'Cyan Pulse', bg: 'bg-[#00F0FF]', text: 'text-black', accent: 'bg-black', type: 'color', contrast: 'light' },
    { id: 'neon', label: 'Acid', bg: 'bg-[#C1FF00]', text: 'text-black', accent: 'bg-black', type: 'color', contrast: 'light' },
    { id: 'sunset', label: 'Sunset', bg: 'bg-gradient-to-br from-[#FF512F] to-[#DD2476]', text: 'text-white', accent: 'bg-white', type: 'gradient', contrast: 'dark' },
    { id: 'ocean', label: 'Ocean', bg: 'bg-gradient-to-br from-[#2193b0] to-[#6dd5ed]', text: 'text-white', accent: 'bg-white', type: 'gradient', contrast: 'dark' },
    { id: 'renaissance', label: 'Renaissance', bg: 'bg-[url("https://images.unsplash.com/photo-1577720643272-265f09367456?q=80&w=400&h=600&auto=format&fit=crop")] bg-cover bg-center', text: 'text-amber-50', accent: 'bg-amber-400', type: 'image', contrast: 'dark' },
    { id: 'marble', label: 'Statue', bg: 'bg-[url("https://images.unsplash.com/photo-1533481406255-75b2ca8efc3d?q=80&w=400&h=600&auto=format&fit=crop")] bg-cover bg-center', text: 'text-black', accent: 'bg-white/20 backdrop-blur-md', type: 'image', contrast: 'light' },
];

export default function ShareExperience({ isOpen, onClose, layoutId, data }: ShareExperienceProps) {
    const [activeSkin, setActiveSkin] = useState<ShareSkin>(SKINS[0]);
    const [isFlipped, setIsFlipped] = useState(false);

    // --- Disney Physics (Spring Config) ---
    const springConfig = { type: "spring", damping: 12, stiffness: 200, mass: 1 };

    const toggleFlip = () => setIsFlipped(!isFlipped);

    const handleCopy = () => {
        navigator.clipboard.writeText(data.qrValue);
        // We could trigger a toast here if we have a toast context
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    {/* MAIN CONTAINER (Morphing) */}
                    <motion.div
                        layoutId={layoutId} // Morph from trigger
                        transition={springConfig}
                        className="relative z-10 w-full max-w-4xl flex flex-col md:flex-row items-center gap-12"
                    >
                        {/* THE CARD (Grazier Style) */}
                        <div className="perspective-2000 shrink-0">
                            <motion.div
                                initial={{ scale: 0.8, rotateX: 20 }}
                                animate={{
                                    scale: 1,
                                    rotateX: 0,
                                    rotateY: isFlipped ? 180 : 0
                                }}
                                transition={springConfig}
                                className="relative w-[320px] h-[480px] preserve-3d cursor-pointer shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-[2.5rem]"
                                onClick={toggleFlip}
                            >
                                {/* FRONT SIDE */}
                                <div className={`absolute inset-0 backface-hidden rounded-[2.5rem] overflow-hidden border border-white/10 ${activeSkin.bg}`}>
                                    {/* Noise & Texture */}
                                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
                                    {activeSkin.contrast === 'dark' && <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />}

                                    <div className={`relative h-full p-8 flex flex-col ${activeSkin.text}`}>
                                        {/* Header */}
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Protocol</span>
                                                <span className="text-sm font-black italic tracking-tighter">Djinn.market</span>
                                            </div>
                                            <div className="w-12 h-12 rounded-full border border-current/20 flex items-center justify-center p-2 backdrop-blur-md">
                                                <img src="/djinn-logo.png?v=3" className={`w-full h-full object-contain ${activeSkin.contrast === 'dark' ? 'brightness-200' : 'brightness-0'}`} alt="Logo" />
                                            </div>
                                        </div>

                                        {/* Hero Title (Grazier Font Style) */}
                                        <div className="mt-12">
                                            <div className={`inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-current/20 mb-4`}>
                                                Member Since 2026
                                            </div>
                                            <h2 className="font-serif text-5xl font-bold leading-none tracking-tighter lowercase">
                                                {data.username}
                                            </h2>
                                            <div className="flex gap-2 mt-4">
                                                <span className="px-2 py-0.5 rounded-md bg-current/10 text-[8px] font-black uppercase tracking-widest">Alpha User</span>
                                                <span className="px-2 py-0.5 rounded-md bg-current/10 text-[8px] font-black uppercase tracking-widest">#54801</span>
                                            </div>
                                        </div>

                                        {/* Bottom Stats View */}
                                        <div className="mt-auto pt-8 border-t border-current/10">
                                            <div className="grid grid-cols-2 gap-8">
                                                {data.stats.map((s, i) => (
                                                    <div key={i}>
                                                        <p className="text-[10px] uppercase tracking-widest font-black opacity-40 mb-1">{s.label}</p>
                                                        <p className="text-xl font-black tabular-nums">{s.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-8 flex items-center justify-between opacity-30">
                                                <span className="text-[8px] font-black uppercase">Identity Verified</span>
                                                <Shield size={12} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* BACK SIDE (QR) */}
                                <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-[2.5rem] overflow-hidden border border-white/10 ${activeSkin.bg} flex flex-col items-center justify-center`}>
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
                                    <div className="relative p-12 flex flex-col items-center text-center">
                                        <div className="bg-white p-6 rounded-[2rem] shadow-2xl mb-8">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.qrValue)}`}
                                                alt="QR"
                                                className="w-40 h-40"
                                            />
                                        </div>
                                        <h3 className="text-white text-lg font-black uppercase tracking-widest mb-2">Scan & Join</h3>
                                        <p className="text-white/40 text-[10px] font-mono mb-8">{data.qrValue.replace('https://', '')}</p>

                                        <div className="flex gap-4">
                                            <Zap className="text-emerald-400" size={20} />
                                            <Crown className="text-amber-400" size={20} />
                                            <Share2 className="text-blue-400" size={20} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* CONTROLS (Salaja Style) */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...springConfig, delay: 0.1 }}
                            className="flex flex-col gap-10 max-w-sm"
                        >
                            <div className="space-y-4">
                                <h3 className="text-white text-sm font-black uppercase tracking-[0.2em] opacity-40">Customize Skin</h3>
                                <div className="grid grid-cols-4 gap-4">
                                    {SKINS.map((skin) => (
                                        <motion.button
                                            key={skin.id}
                                            whileHover={{ scale: 1.15 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setActiveSkin(skin)}
                                            className={`group relative w-12 h-12 rounded-full border-2 transition-all ${activeSkin.id === skin.id ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                                        >
                                            <div className={`absolute inset-1 rounded-full overflow-hidden ${skin.bg}`}>
                                                {activeSkin.id === skin.id && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <Check size={14} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="text-white/60 text-xs leading-relaxed font-medium">
                                    Your journey on Djinn is legendary. Customize your card skin and share your dominance across the loop.
                                </p>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#F492B7] transition-all group active:scale-95"
                                    >
                                        <Copy size={16} /> Copy Direct Link
                                    </button>
                                    <button className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
                                        <Download size={16} /> Export Artwork
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-white/20 font-mono text-[10px] uppercase tracking-widest">
                                <RotateCw size={12} className="animate-spin-slow" /> Tip: Click the card to see the flip-side
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* CLOSE BUTTON */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={onClose}
                        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
                    >
                        <X size={20} />
                    </motion.button>
                </div>
            )}
        </AnimatePresence>
    );
}
