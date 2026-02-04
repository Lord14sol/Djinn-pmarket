'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Lock, Zap, Ticket } from 'lucide-react';
import { getWhitelistStatus, registerForWhitelist } from '@/lib/whitelist';
import CustomWalletModal from '@/components/CustomWalletModal';
import { useRouter } from 'next/navigation';

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

            {/* MAIN CONTENT CARD */}
            <motion.main
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-xl mx-4 my-auto pt-24 pb-12"
            >
                <div className="bg-white border-2 border-black rounded-3xl p-8 md:p-12 shadow-[8px_8px_0_0_#F492B7] relative">

                    {/* Floating Badge */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#F492B7] text-black border-2 border-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-xs shadow-[2px_2px_0_0_black]">
                        Genesis Pass
                    </div>

                    {/* Branding Section */}
                    <div className="text-center mb-10">
                        <div className="w-24 h-24 mx-auto mb-6 relative hover:scale-110 transition-transform duration-300">
                            <Image src="/djinn-logo.png?v=3" alt="Logo" fill className="object-contain" priority unoptimized />
                        </div>

                        {/* THE BRAND FONT MATCHING NAVBAR */}
                        <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-black mb-2" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                            Djinn
                        </h1>
                        {/* ABSOLUTELY NO SUBTITLE HERE */}
                    </div>

                    {/* Interactive Area */}
                    <div className="w-full">
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
                                    <Loader2 className="w-10 h-10 text-[#F492B7] animate-spin mx-auto mb-4" />
                                    <div className="text-xs font-black uppercase tracking-widest text-gray-400">Loading System...</div>
                                </motion.div>
                            ) : status.isAdmin ? (
                                <motion.div key="admin" className="text-center">
                                    <div className="bg-black text-white p-4 rounded-xl border-2 border-black mb-6">
                                        <Lock className="w-6 h-6 mx-auto mb-2 text-[#F492B7]" />
                                        <div className="font-bold uppercase tracking-wider text-sm">God Mode Active</div>
                                    </div>
                                    <button
                                        onClick={() => router.push('/markets')}
                                        className="w-full bg-[#F492B7] text-black border-2 border-black py-4 rounded-2xl font-black uppercase tracking-widest hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0_0_black] transition-all"
                                    >
                                        Enter Markets
                                    </button>
                                </motion.div>
                            ) : status.isRegistered ? (
                                <motion.div key="reg" className="text-center">
                                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 mb-6 bg-gray-50">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <div className="w-3 h-3 bg-[#F492B7] rounded-full animate-pulse"></div>
                                            <span className="font-bold uppercase text-sm text-gray-400">Waitlist Confirmed</span>
                                        </div>
                                        <div className="text-4xl font-black text-black mb-1">#{status.count}</div>
                                        <div className="text-[10px] font-mono text-gray-400 truncate w-full px-4">{publicKey?.toBase58()}</div>
                                    </div>

                                    <div className="bg-black text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                                        <Ticket className="w-4 h-4 text-[#F492B7]" />
                                        You are on the list
                                    </div>
                                </motion.div>
                            ) : !status.isFull ? (
                                <motion.div key="join" className="w-full space-y-6">
                                    {/* Stats Row REMOVED COMPLETELY */}

                                    {!connected ? (
                                        <button
                                            onClick={() => setIsWalletModalOpen(true)}
                                            className="w-full bg-white text-black border-2 border-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0_0_black] transition-all flex items-center justify-center gap-3"
                                        >
                                            Connect Wallet <ArrowRight className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleConnect}
                                            className="w-full bg-[#F492B7] text-black border-2 border-black py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-105 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0_0_black] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Zap className="w-5 h-5" /> Secure Spot
                                        </button>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div className="bg-red-50 text-red-500 border-2 border-red-100 p-6 rounded-2xl text-center font-bold uppercase tracking-widest">
                                    Sold Out
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </motion.main>

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
