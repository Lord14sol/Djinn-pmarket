'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Lock, Zap, Ticket } from 'lucide-react';
import { getWhitelistStatus, registerForWhitelist } from '@/lib/whitelist';
import CustomWalletModal from '@/components/CustomWalletModal';
import { useRouter } from 'next/navigation';
import PhysicsCard from '@/components/PhysicsCard';

// FORCE UPDATE: v1.0.5
export default function GenesisPage() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const [status, setStatus] = useState({ count: 0, isFull: false, isRegistered: false, isAdmin: false });
    const [loading, setLoading] = useState(true);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

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
        const interval = setInterval(refreshStatus, 30000);
        return () => clearInterval(interval);
    }, [refreshStatus]);

    // Redirect
    useEffect(() => {
        if (connected && !loading && status.isAdmin) {
            router.push('/markets');
        }
    }, [connected, loading, status.isAdmin, router]);

    const handleConnect = async () => {
        if (!connected) { setIsWalletModalOpen(true); return; }
        if (!status.isRegistered && !status.isFull) {
            setLoading(true);
            const result = await registerForWhitelist(publicKey!.toBase58());
            if (result.success) await refreshStatus();
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 bg-white text-black font-sans selection:bg-[#F492B7] selection:text-white flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden">

            {/* --- DOT GRID BACKGROUND --- */}
            <div className="fixed inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

            {/* MAIN CONTENT - SPLIT SCREEN */}
            <div className="relative z-10 w-full min-h-screen flex flex-col md:flex-row">

                {/* LADO IZQUIERDO: CONTENIDO */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1 flex flex-col justify-center px-8 md:px-20 py-12 bg-black/40 backdrop-blur-sm"
                >
                    <div className="max-w-md w-full">
                        <div className="w-16 h-16 mb-8 relative">
                            <Image src="/djinn-logo.png?v=3" alt="Djinn" fill className="object-contain" priority unoptimized />
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-6 leading-none" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                            DJINN: <br />
                            <span className="text-[#00FF41]">INTELLIGENCE</span> <br />
                            PROTOCOL
                        </h1>

                        <p className="text-sm font-mono text-white/40 mb-12 leading-relaxed uppercase tracking-widest">
                            The first decentralized oracle network powered by agentic intelligence.
                            Zero-trust verification for any prediction market.
                        </p>

                        <div className="space-y-6">
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <div className="flex items-center gap-3 text-[#00FF41] font-mono text-xs uppercase tracking-widest">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Syncing Neural Link...
                                    </div>
                                ) : status.isRegistered ? (
                                    <div className="p-6 border border-[#00FF41]/20 bg-[#00FF41]/5 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-pulse" />
                                            <span className="font-mono text-[10px] uppercase text-[#00FF41]">Registration Confirmed</span>
                                        </div>
                                        <div className="text-3xl font-black text-white tabular-nums">#{status.count}</div>
                                        <p className="text-[9px] font-mono text-white/20 mt-2 truncate">{publicKey?.toBase58()}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {!connected ? (
                                            <button
                                                onClick={() => setIsWalletModalOpen(true)}
                                                className="group w-full bg-white text-black py-4 px-8 rounded-full font-black uppercase tracking-widest text-xs flex items-center justify-between hover:bg-[#00FF41] transition-all"
                                            >
                                                Request Access <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleConnect}
                                                className="w-full bg-[#00FF41] text-black py-4 px-8 rounded-full font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:scale-[1.02] transition-all"
                                            >
                                                Secure Identity_
                                            </button>
                                        )}
                                        <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] text-center">
                                            Currently in: Private Alpha Phase 1
                                        </p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* LADO DERECHO: EL PLAYGROUND (PHYSICS CARD) */}
                <div className="flex-1 relative bg-black flex items-center justify-center p-12 overflow-hidden border-l border-white/5">
                    {/* Shadow underneath */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.05)_0%,transparent_70%)]" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="w-full h-full"
                    >
                        <PhysicsCard />
                    </motion.div>

                    {/* Hint */}
                    <div className="absolute bottom-8 right-8 text-[10px] font-mono text-white/20 flex items-center gap-2">
                        <Zap size={10} /> GRAB_TO_STRETCH_PROTOCOL
                    </div>
                </div>
            </div>

            {/* Footer Brand */}
            <div className="relative z-10 pb-8 text-center text-gray-400">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Powered by Solana</p>
            </div>

            <CustomWalletModal
                isOpen={isWalletModalOpen}
                onClose={() => setIsWalletModalOpen(false)}
            />
        </div>
    );
}
