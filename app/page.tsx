'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Loader2, ArrowRight, LogOut } from 'lucide-react';
import { getWhitelistStatus, registerForWhitelist } from '@/lib/whitelist';
import CustomWalletModal from '@/components/CustomWalletModal';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Lazy load PhysicsCardBubblegum
const PhysicsCardBubblegum = dynamic(() => import('@/components/PhysicsCardBubblegum'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF69B4]" />
        </div>
    )
});

// FORCE UPDATE: v1.0.8
import ClaimUsernameModal from '@/components/ClaimUsernameModal';
import { getProfile } from '@/lib/supabase-db';

export default function DjinnLanding() {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const router = useRouter();
    const { publicKey, connected, disconnect } = useWallet();
    const [status, setStatus] = useState({
        count: 0,
        isFull: false,
        isRegistered: false,
        isAdmin: false
    });
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const walletAddress = useMemo(() => publicKey?.toBase58(), [publicKey]);

    const refreshStatus = useCallback(async () => {
        if (!walletAddress) {
            setLoading(false);
            return;
        }

        try {
            const [whitelistResult, profileResult] = await Promise.all([
                getWhitelistStatus(walletAddress),
                getProfile(walletAddress)
            ]);

            setStatus(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(whitelistResult)) {
                    return whitelistResult;
                }
                return prev;
            });
            setProfile(profileResult);

            // If connected and has no profile, show claim modal
            if (connected && !profileResult && !isClaimModalOpen) {
                setIsClaimModalOpen(true);
            }
        } catch (err) {
            console.error('[Djinn] Failed to fetch status:', err);
        } finally {
            setLoading(false);
        }
    }, [walletAddress, connected, isClaimModalOpen]);

    useEffect(() => {
        refreshStatus();
        const interval = setInterval(refreshStatus, 30000);
        return () => clearInterval(interval);
    }, [refreshStatus]);

    useEffect(() => {
        if (connected && !loading && status.isAdmin) {
            router.push('/markets');
        }
    }, [connected, loading, status.isAdmin, router]);

    const handleConnect = useCallback(async () => {
        if (!connected) {
            setIsWalletModalOpen(true);
            return;
        }
    }, [connected]);

    const handleClaimSuccess = async (newUsername: string) => {
        setIsClaimModalOpen(false);
        await refreshStatus();
    };

    return (
        <div className="relative w-full min-h-screen bg-transparent text-white font-sans selection:bg-[#FF69B4] selection:text-white overflow-x-hidden flex flex-col">

            {/* Top Navigation - Neo-Brutalist Disconnect */}
            <nav className="relative z-20 w-full flex items-center justify-end px-8 py-8 max-w-7xl mx-auto">
                <AnimatePresence>
                    {isMounted && connected && (
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onClick={() => disconnect()}
                            className="flex items-center gap-2 bg-[#FF69B4] text-white px-4 py-2 rounded-lg border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black uppercase text-xs tracking-widest"
                        >
                            <LogOut className="w-4 h-4" />
                            Disconnect
                        </motion.button>
                    )}
                </AnimatePresence>
            </nav>

            {/* Main Content - Centered */}
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-8 py-12">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 md:gap-4 mb-16 select-none"
                    style={{ cursor: 'pointer' }}
                    onClick={() => isMounted && connected && profile ? router.push('/markets') : null}
                >
                    <div className="w-40 h-40 md:w-56 md:h-56 relative">
                        <Image
                            src="/djinn-logo.png"
                            alt="Djinn"
                            fill
                            className="object-contain"
                            priority
                            sizes="(max-width: 768px) 144px, 208px"
                            unoptimized
                        />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <h1
                            className="text-7xl md:text-9xl text-white"
                            style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}
                        >
                            Djinn
                        </h1>
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {/* Only show card IF profile exists */}
                    {connected && profile ? (
                        <motion.div
                            key="card-section"
                            initial={{ opacity: 0, scale: 0.8, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 50 }}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            className="w-full max-w-md h-[520px] relative mb-12"
                        >
                            <PhysicsCardBubblegum username={profile.username} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="cta-section"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-md"
                        >
                            <motion.button
                                onClick={handleConnect}
                                disabled={isRegistering}
                                className="group w-full relative py-6 px-10 rounded-xl font-black uppercase tracking-[0.4em] text-lg transition-all bg-[#FF69B4] text-white border-2 border-black shadow-[10px_10px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] active:scale-95"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.96 }}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {loading || isRegistering ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Join Djinn
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer - Minimal X only */}
            <footer className="relative z-20 w-full py-12 px-8 flex flex-col items-center max-w-7xl mx-auto">
                <motion.a
                    href="https://x.com/djinnmarkets"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="text-white/40 hover:text-white transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                </motion.a>
            </footer>

            <CustomWalletModal
                isOpen={isWalletModalOpen}
                onClose={() => setIsWalletModalOpen(false)}
            />

            <ClaimUsernameModal
                isOpen={isClaimModalOpen}
                walletAddress={walletAddress || ''}
                onSuccess={handleClaimSuccess}
                onClose={() => setIsClaimModalOpen(false)}
            />
        </div>
    );
}

// Set display name for HMR transparency
DjinnLanding.displayName = 'DjinnLanding';
