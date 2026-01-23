'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShieldCheck, Lock, Users, ArrowRight, Loader2 } from 'lucide-react';
import { getWhitelistStatus, registerForWhitelist, GENESIS_LIMIT } from '@/lib/whitelist';

export default function GenesisPage() {
    const { publicKey, connected } = useWallet();
    const [status, setStatus] = useState({
        count: 0,
        isFull: false,
        isRegistered: false,
        isAdmin: false,
    });
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
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

    const handleJoin = async () => {
        if (!publicKey) return;
        setRegistering(true);
        setMessage(null);
        try {
            const result = await registerForWhitelist(publicKey.toBase58());
            setMessage(result.message);
            await refreshStatus();
        } catch (err) {
            setMessage("Connection error. Please try again.");
        } finally {
            setRegistering(false);
        }
    };

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
        <div className="relative min-h-screen w-full overflow-hidden bg-black text-white selection:bg-purple-500/30">
            {/* --- BACKGROUND VIDEO / AMBIENCE --- */}
            <div className="absolute inset-0 z-0">
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    disablePictureInPicture
                    poster="/genesis/poster.png"
                    className={`h-full w-full object-cover mix-blend-screen pointer-events-none transition-opacity duration-1000 ${isVideoPlaying ? 'opacity-40' : 'opacity-0'}`}
                >
                    <source src="/genesis/g-genesis.mp4" type="video/mp4" />
                    {/* Fallback pattern if video missing */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.15)_0%,transparent_70%)]" />
                </video>
                {/* Fallback Poster */}
                {!isVideoPlaying && (
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-20 transition-opacity duration-1000"
                        style={{ backgroundImage: 'url(/genesis/poster.png)' }}
                    />
                )}
                {/* Aggressive Edge Masking */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_85%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-50" />
            </div>

            {/* --- MAIN CONTENT --- */}
            <main className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-20 text-center">

                {/* --- HEADER --- */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-8"
                >
                    <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-purple-300 uppercase">
                        <Sparkles className="h-3 w-3" />
                        Exclusive Gateway
                    </span>
                    <h1 className="bg-gradient-to-b from-white to-gray-500 bg-clip-text text-5xl font-bold tracking-tighter text-transparent sm:text-7xl md:text-8xl">
                        GENESIS <br /> DJINN
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 font-light leading-relaxed">
                        The first 100 architects of the prophecy. <br />
                        Access is limited. Conviction is required.
                    </p>
                </motion.div>

                {/* --- WHITELIST CARD --- */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl mt-24"
                >
                    {/* Progress Bar (Visual Only) */}
                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_0_15px_rgba(147,51,234,0.5)] transition-all duration-1000"
                        style={{ width: `${(status.count / GENESIS_LIMIT) * 100}%` }}
                    />

                    <div className="flex flex-col gap-6">
                        {/* Status Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-white/5 bg-black/40 p-4">
                                <Users className="mb-2 h-5 w-5 text-purple-400" />
                                <div className="text-2xl font-bold">{status.count} <span className="text-xs text-gray-500 font-normal">/ {GENESIS_LIMIT}</span></div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-500">Registered</div>
                            </div>
                            <div className="rounded-2xl border border-white/5 bg-black/40 p-4">
                                <Lock className="mb-2 h-5 w-5 text-gray-500" />
                                <div className="text-2xl font-bold">{GENESIS_LIMIT - status.count}</div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-500">Slots Left</div>
                            </div>
                        </div>

                        {/* Interaction Logic */}
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-center py-6"
                                >
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                </motion.div>
                            ) : !connected ? (
                                <motion.div
                                    key="connect"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <p className="text-sm text-gray-400">Connect your Solana wallet to verify eligibility</p>
                                    <WalletMultiButton className="!bg-white !text-black !rounded-full !font-bold !px-8 hover:!scale-105 transition-transform" />
                                </motion.div>
                            ) : status.isAdmin ? (
                                <motion.div key="admin" className="space-y-4">
                                    <div className="flex items-center justify-center gap-2 text-green-400 py-4">
                                        <ShieldCheck className="h-6 w-6" />
                                        <span className="font-semibold">ARCHITECT ACCESS GRANTED</span>
                                    </div>
                                    <button
                                        onClick={() => window.location.href = '/'}
                                        className="group flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-4 font-bold transition-all hover:bg-white hover:text-black"
                                    >
                                        Enter Project Djinn
                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </button>
                                </motion.div>
                            ) : status.isRegistered ? (
                                <motion.div key="registered" className="py-6">
                                    <div className="mb-2 text-2xl font-bold text-purple-400">MANIFESTED</div>
                                    <p className="text-sm text-gray-400">Tu medalla te espera en el lanzamiento.</p>
                                </motion.div>
                            ) : status.isFull ? (
                                <motion.div key="full" className="py-6">
                                    <div className="mb-2 text-2xl font-bold text-red-500">SOLD OUT</div>
                                    <p className="text-sm text-gray-400">SPOTS FULL. THANK YOU STAY TUNED FOR UPDATES.</p>
                                </motion.div>
                            ) : (
                                <motion.div key="join" className="space-y-4">
                                    <button
                                        disabled={registering}
                                        onClick={handleJoin}
                                        className="relative group flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-indigo-600 px-8 py-4 font-bold text-white transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-50"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                        {registering ? <Loader2 className="h-5 w-5 animate-spin" /> : "CLAIM GENESIS ENTRY"}
                                    </button>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Your wallet address will be recorded for future badges</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {message && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-sm font-medium text-purple-300"
                            >
                                {message}
                            </motion.p>
                        )}
                    </div>
                </motion.div>

                {/* --- FOOTER INFO --- */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3"
                >
                    {[
                        { title: "Exclusive", desc: "Limited to first 100 unique wallets" },
                        { title: "Verifiable", desc: "Genesis Badge minted on launch" },
                        { title: "Early Bird", desc: "Priority access to all futures" }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white">{item.title}</h3>
                            <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                    ))}
                </motion.div>

            </main>

            <style jsx global>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
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
