'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { getWhitelistStatus } from '@/lib/whitelist';
import CustomWalletModal from '@/components/CustomWalletModal';

export default function GenesisPage() {
    const { publicKey, connected } = useWallet();
    const [status, setStatus] = useState({
        count: 0,
        isFull: false,
        isRegistered: false,
        isAdmin: false,
    });
    const [loading, setLoading] = useState(true);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Initial Status Check
    const refreshStatus = useCallback(async () => {
        try {
            const result = await getWhitelistStatus(publicKey?.toBase58());
            setStatus(result);
        } catch (err) {
            console.error('[Genesis] Failed to fetch status:', err);
        } finally {
            setLoading(false);
        }
    }, [publicKey]);

    useEffect(() => {
        refreshStatus();
        // Poll status every 30 seconds to keep count fresh
        const interval = setInterval(refreshStatus, 30000);
        return () => clearInterval(interval);
    }, [refreshStatus]);

    // Force autoplay on mobile
    useEffect(() => {
        const forcePlay = () => {
            if (videoRef.current) {
                videoRef.current.muted = true;
                const playPromise = videoRef.current.play();

                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        setIsVideoPlaying(true);
                    }).catch(err => {
                        console.warn('[Genesis] Autoplay blocked or failed:', err);
                    });
                }
            }
        };

        // Initial attempt
        forcePlay();

        // Interaction listeners to bypass strict iOS/Android blocks
        const events = ['touchstart', 'pointerdown', 'mousedown', 'keydown'];
        const handleInteraction = () => {
            forcePlay();
            // Remove listeners once we've successfully attempted playback
            events.forEach(event => window.removeEventListener(event, handleInteraction));
        };

        events.forEach(event => window.addEventListener(event, handleInteraction, { passive: true }));

        return () => {
            events.forEach(event => window.removeEventListener(event, handleInteraction));
        };
    }, []);

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black text-white selection:bg-white/10 font-mono">
            {/* --- GRAIN/NOISE OVERLAY (Premium Skill) --- */}
            <div className="pointer-events-none absolute inset-0 z-50 opacity-[0.03] mix-blend-overlay bg-[url('https://grain-y-gradients.vercel.app/noise.svg')]"></div>

            {/* --- BACKGROUND VIDEO / AMBIENCE (Artistic Positioning) --- */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                <div className="absolute top-1/2 -right-1/4 md:right-32 -translate-y-1/2 w-full md:w-[60%] h-full md:h-[120%] opacity-[0.45] animate-pulse-slow">
                    <video
                        ref={videoRef}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        disablePictureInPicture
                        poster="/genesis/poster.png"
                        className={`h-full w-full object-contain mix-blend-screen pointer-events-none transition-opacity duration-1000 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <source src="/genesis/g-genesis.mp4" type="video/mp4" />
                    </video>
                    {/* Fallback Poster (Always visible behind video) */}
                    {!isVideoPlaying && (
                        <div
                            className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-50 transition-opacity duration-1000"
                            style={{ backgroundImage: 'url(/genesis/poster.png)' }}
                        />
                    )}
                    {/* Radial Fade Mask - Makes edges disappear into black */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,black_70%)] md:bg-[radial-gradient(circle_at_center,transparent_30%,black_80%)]" />
                </div>

                {/* Secondary Deep Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
            </div>

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-20 text-center">

                {/* --- HEADER (Navbar Identical) --- */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="mb-24 md:mb-48 flex flex-col items-center"
                >
                    <div className="flex items-center justify-center group gap-0 mb-4 px-2">
                        <div className="relative w-32 h-32 md:w-40 md:h-40 transition-transform duration-500 hover:scale-105 animate-star-slow filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            <Image src="/star.png" alt="Djinn Logo" fill className="object-contain" priority />
                        </div>
                        <span className="text-6xl md:text-8xl text-white -ml-8 md:-ml-10 mt-6 md:mt-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                            Djinn
                        </span>
                    </div>
                </motion.div>

                {/* --- WHITELIST CARD --- */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="relative w-full max-w-md overflow-hidden md:ml-8"
                >
                    <div className="flex flex-col gap-8">
                        {/* Interaction Logic */}
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-center py-6"
                                >
                                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                                </motion.div>
                            ) : !connected ? (
                                <motion.div
                                    key="connect"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center gap-6"
                                >
                                    <button
                                        onClick={() => setIsWalletModalOpen(true)}
                                        className="w-72 border border-white/20 bg-black py-5 text-[10px] font-bold tracking-[0.3em] uppercase text-white transition-all hover:border-[#F492B7] hover:bg-[#F492B7] hover:text-black active:scale-95 relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 shimmer-effect pointer-events-none" />
                                        Connect Wallet to Claim Spot
                                    </button>
                                </motion.div>
                            ) : status.isAdmin ? (
                                <motion.div key="access" className="flex flex-col items-center gap-8">
                                    <div className="border border-white/20 bg-white/5 px-8 py-4">
                                        <div className="text-[10px] font-bold tracking-[0.3em] text-white uppercase">
                                            WELCOME BACK, ARCHITECT
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => window.location.href = '/markets'}
                                        className="w-72 border border-white/20 bg-black py-5 text-[10px] font-bold tracking-[0.3em] uppercase text-white transition-all hover:border-[#F492B7] hover:bg-[#F492B7] hover:text-black active:scale-95 relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 shimmer-effect pointer-events-none" />
                                        Enter Djinn
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div key="full" className="flex flex-col items-center gap-4">
                                    <div className="border border-white/5 bg-white/[0.02] px-8 py-6">
                                        <div className="text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase text-center leading-relaxed">
                                            SPOTS FULL. <br /> THANK YOU FOR YOUR INTEREST.
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* --- FOOTER INFO REMOVED FOR MINIMALISM --- */}

            </main>

            <CustomWalletModal
                isOpen={isWalletModalOpen}
                onClose={() => setIsWalletModalOpen(false)}
            />

            <style jsx global>{`
                @keyframes breathe {
                    0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 10px rgba(255,255,255,0)); }
                    50% { opacity: 0.8; transform: scale(0.98); filter: drop-shadow(0 0 25px rgba(255,255,255,0.3)); }
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.25; }
                    50% { opacity: 0.6; }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-star-slow { animation: breathe 4s ease-in-out infinite; }
                .animate-pulse-slow { animation: pulse-slow 12s ease-in-out infinite; }
                .shimmer-effect {
                    background: linear-gradient(90deg, transparent, rgba(244,146,183,0.1), transparent);
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite;
                }
                /* Hide any native media controls that might appear on mobile if autoplay fails */
                video::-webkit-media-controls {
                    display:none !important;
                }
                video::-webkit-media-controls-start-playback-button {
                    display:none !important;
                }
            `}</style>
        </div>
    );
}
