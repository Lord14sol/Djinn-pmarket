'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Loader2, ArrowRight, LogOut, Copy } from 'lucide-react';
import { getWhitelistStatus, registerForWhitelist } from '@/lib/whitelist';
import CustomWalletModal from '@/components/CustomWalletModal';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

const ReferralPanel = dynamic(() => import('@/components/ReferralPanel'), {
    ssr: false,
});

// Lazy load Galaxy background
const Galaxy = dynamic(() => import('@/components/Galaxy'), {
    ssr: false,
    loading: () => null
});

// FORCE UPDATE: v1.0.8
import ClaimUsernameModal from '@/components/ClaimUsernameModal';
import RegisterBotModal from '@/components/RegisterBotModal';
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
    const [showGenesisAnnouncement, setShowGenesisAnnouncement] = useState(false);
    const [isGenesis, setIsGenesis] = useState(false);
    const [isBotModalOpen, setIsBotModalOpen] = useState(false);
    const [copiedCmd, setCopiedCmd] = useState(false);

    const walletAddress = useMemo(() => publicKey?.toBase58(), [publicKey]);

    const refreshStatus = useCallback(async () => {
        if (!walletAddress) {
            setLoading(false);
            return;
        }

        try {
            const profileResult = await getProfile(walletAddress);
            setProfile(profileResult);

            // Fetch whitelist status too
            const { getWhitelistStatus, isGenesisMember } = await import('@/lib/whitelist');
            const [whitelistStatus, genesisCheck] = await Promise.all([
                getWhitelistStatus(walletAddress),
                isGenesisMember(walletAddress)
            ]);

            setStatus(whitelistStatus);
            setIsGenesis(genesisCheck);

            // If genesis member and haven't seen announcement this session
            if (genesisCheck && !sessionStorage.getItem('djinn_genesis_announced')) {
                setShowGenesisAnnouncement(true);
                sessionStorage.setItem('djinn_genesis_announced', 'true');
            }

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

        // Instant refresh on profile update event (e.g. after X sync)
        const handleProfileUpdate = () => {
            console.log("🔔 [Home] Profile update detected, refreshing...");
            refreshStatus();
        };
        window.addEventListener('djinn-profile-updated', handleProfileUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('djinn-profile-updated', handleProfileUpdate);
        };
    }, [refreshStatus]);

    useEffect(() => {
        if (connected && !loading && status.isAdmin) {
            console.log("🚀 [Home] Admin detected, redirecting to markets...");
            router.push('/markets');
        }
    }, [connected, loading, status.isAdmin, router]);

    // Instantly open claim modal when wallet connects and no profile
    useEffect(() => {
        if (connected && !loading && !profile && !isClaimModalOpen) {
            setIsClaimModalOpen(true);
        }
    }, [connected, loading, profile, isClaimModalOpen]);

    const handleConnect = useCallback(async () => {
        if (!connected) {
            setIsWalletModalOpen(true);
            return;
        }

        // Si ya está conectado pero no tiene perfil, forzamos abrir el modal de claim
        if (connected && !profile) {
            console.log("💎 User connected but no profile, opening Claim Modal...");
            setIsClaimModalOpen(true);
        }
    }, [connected, profile]);

    const handleClaimSuccess = (newUsername: string) => {
        // Close modal instantly so confetti is visible
        setIsClaimModalOpen(false);
        // Set profile immediately so card renders right away (triggers confetti)
        setProfile({ username: newUsername, wallet_address: walletAddress });
        // Refresh full data in background
        refreshStatus();
    };

    return (
        <div className="relative w-full min-h-screen bg-black text-white font-sans selection:bg-[#FF69B4] selection:text-white overflow-x-hidden flex flex-col">
            {/* Galaxy Background */}
            <div className="fixed inset-0 z-0">
                <Galaxy
                    mouseRepulsion
                    mouseInteraction
                    density={1}
                    glowIntensity={0.3}
                    saturation={0}
                    hueShift={320}
                    twinkleIntensity={0.3}
                    rotationSpeed={0.1}
                    repulsionStrength={2}
                    autoCenterRepulsion={0}
                    starSpeed={0.5}
                    speed={1}
                    transparent={false}
                />
            </div>

            {/* Top Navigation - Neo-Brutalist Disconnect */}
            <nav className="fixed top-0 right-0 z-20 flex items-center justify-end px-4 py-4">
                <AnimatePresence>
                    {isMounted && connected && (
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onClick={() => disconnect()}
                            className="flex items-center gap-2.5 
                                bg-[#FF0055] text-white 
                                px-6 py-3 
                                rounded-full
                                border-[3px] border-black 
                                shadow-[6px_6px_0px_#000000] 
                                hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[4px] hover:translate-y-[4px] 
                                active:shadow-none active:translate-x-[6px] active:translate-y-[6px] 
                                transition-all duration-150 
                                font-black uppercase text-[11px] tracking-[0.2em]"
                        >
                            <LogOut className="w-4 h-4 text-white" strokeWidth={3} />
                            Disconnect
                        </motion.button>
                    )}
                </AnimatePresence>
            </nav>

            {/* Main Content - Centered */}
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-8 py-12">

                {!(connected && profile) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-0 mb-16 select-none"
                        style={{ cursor: 'pointer' }}
                        onClick={() => isMounted && connected && profile ? router.push('/markets') : null}
                    >
                        <div className="w-40 h-40 md:w-56 md:h-56 relative -mr-3 md:-mr-4">
                            <Image
                                src="/djinn-logo.png"
                                alt="Djinn"
                                fill
                                className="object-contain"
                                priority
                                sizes="(max-width: 768px) 144px, 208px"
                            />
                        </div>
                        <div className="flex flex-col items-start leading-none">
                            <h1
                                className="text-7xl md:text-9xl text-white relative z-10"
                                style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}
                            >
                                Djinn
                            </h1>
                        </div>
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {/* Show card IF profile exists */}
                    {connected && profile ? (
                        <div className="w-full flex flex-col items-center gap-12">
                            <motion.div
                                key="card-section"
                                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                                className="w-full max-w-xl h-[680px] relative"
                            >
                                <PhysicsCardBubblegum
                                    username={profile.username}
                                    memberNumber={profile.user_number}
                                    pfp={profile.avatar_url}
                                    twitterHandle={profile.twitter}
                                />
                            </motion.div>

                            {/* TIER-BASED UI */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="w-full max-w-2xl flex flex-col items-center gap-6"
                            >
                                {profile.has_access ? (
                                    /* ACCESS GRANTED (Tier 1 or Tier 2 Unlocked) */
                                    <Link
                                        href="/markets"
                                        className="group relative py-6 px-24 font-black uppercase text-2xl italic tracking-tighter
                                            bg-white text-black
                                            rounded-full
                                            border-[4px] border-black
                                            shadow-[8px_8px_0px_#10B981]
                                            hover:shadow-[4px_4px_0px_#10B981] hover:translate-x-[4px] hover:translate-y-[4px]
                                            active:shadow-none active:translate-x-[8px] active:translate-y-[8px]
                                            transition-all duration-150 flex items-center justify-center"
                                    >
                                        <span className="flex items-center gap-4">
                                            WELCOME {profile.tier === 'REFERRAL' ? 'BACK' : ''}
                                            <ArrowRight className="w-8 h-8 stroke-[4]" />
                                        </span>
                                    </Link>
                                ) : profile.tier === 'REFERRAL' ? (
                                    /* TIER 2: REFERRAL GATED (REPLACED WITH BOT LAUNCH) */
                                    <div className="w-full space-y-8 flex flex-col items-center">
                                        <div className="bg-[#10B981] text-black border-[4px] border-black px-12 py-7 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden group transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]">
                                            <div className="relative z-10">
                                                <p className="font-black text-4xl lowercase tracking-tighter italic leading-none mb-1.5">human spots full</p>
                                                <p className="font-bold text-[13px] tracking-tight lowercase opacity-90 border-t-2 border-black/10 pt-1.5 mt-1.5 mx-auto max-w-[200px]">but ai agents get instant access</p>
                                            </div>
                                        </div>

                                        <div className="bg-white text-black p-8 rounded-[2rem] border-4 border-black shadow-[10px_10px_0px_#000] max-w-md w-full text-center hover:scale-[1.02] transition-transform duration-200">
                                            <h3 className="font-black text-2xl mb-2 lowercase italic tracking-tighter">launch your agent</h3>
                                            <p className="font-bold text-sm opacity-60 mb-6">deploy a trading bot to bypass the waitlist.</p>

                                            <button
                                                onClick={() => setIsBotModalOpen(true)}
                                                className="w-full bg-black text-white font-black uppercase tracking-widest py-4 rounded-xl border-2 border-black hover:bg-[#FF69B4] hover:text-black transition-all"
                                            >
                                                Connect Bot
                                            </button>

                                            <p className="mt-4 text-[10px] font-mono opacity-50">
                                                or run: <span className="bg-gray-200 px-1 rounded">npx @djinn/setup</span>
                                            </p>
                                        </div>
                                    </div>
                                ) : profile.tier === 'WAITLIST' ? (
                                    /* TIER 3: WAITLIST */
                                    <div className="space-y-4 text-center">
                                        <div className="bg-white text-black border-[4px] border-black px-12 py-7 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[14px_14px_0px_0px_rgba(0,0,0,1)]">
                                            <p className="font-black text-4xl lowercase tracking-tighter italic leading-none mb-1.5">devnet full</p>
                                            <p className="font-bold text-[13px] tracking-tight lowercase opacity-60 border-t-2 border-black/10 pt-1.5 mt-1.5 mx-auto max-w-[150px]">mainnet coming soon</p>
                                        </div>
                                        <p className="text-white/40 font-bold text-xs uppercase tracking-[0.3em] mt-6">Follow @djinnmarkets for updates</p>
                                    </div>
                                ) : null}
                            </motion.div>
                        </div>
                    ) : (loading && connected) ? (
                        /* Loading state after connection but before profile load */
                        <motion.div
                            key="loading-profile"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full max-w-lg flex flex-col items-center gap-4 py-8"
                        >
                            <Loader2 className="w-10 h-10 animate-spin text-[#FF69B4]" />
                            <p className="text-[#FF69B4] font-black uppercase tracking-[0.2em] text-xs">Loading Profile...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="cta-section"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full flex flex-col items-center gap-12"
                        >
                            {/* DUAL LANE CTA */}
                            <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 w-full max-w-4xl">

                                {/* LANE 1: HUMAN */}
                                <div className="flex-1 bg-transparent backdrop-blur-md border-2 border-white/40 p-8 rounded-2xl hover:bg-white/5 transition-all flex flex-col items-center text-center group shadow-[6px_6px_0px_0px_rgba(255,255,255,0.25)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.25)]">
                                    <div className="text-4xl mb-4">🧠</div>
                                    <h3 className="text-white font-black text-2xl uppercase tracking-wider mb-2">I am Human</h3>
                                    <p className="text-white/60 text-sm mb-8 min-h-[40px]">Predict with intuition. Trade on conviction.</p>

                                    <button
                                        onClick={handleConnect}
                                        disabled={isRegistering}
                                        className="w-full py-4 font-black uppercase text-sm
                                            bg-white text-black hover:bg-[#FF69B4] hover:text-black
                                            rounded-xl
                                            shadow-[4px_4px_0px_#000]
                                            hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000]
                                            active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                                            transition-all duration-150"
                                    >
                                        Connect Wallet
                                    </button>
                                </div>

                                {/* LANE 2: BUILDER */}
                                <div className="flex-1 bg-transparent backdrop-blur-md border-2 border-[#10B981] p-8 rounded-2xl hover:bg-[#10B981]/5 transition-all flex flex-col items-center text-center group relative overflow-hidden shadow-[6px_6px_0px_0px_#10B981] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#10B981]">
                                    <div className="absolute top-0 right-0 bg-[#10B981] text-black text-[10px] font-black tracking-widest px-4 py-2 rounded-bl-2xl border-b-2 border-l-2 border-[#10B981] shadow-[-2px_2px_0px_#000]">
                                        POWERED BY OPENCLAW
                                    </div>
                                    <div className="mb-6 transform group-hover:scale-110 transition-transform duration-300">
                                        <Image
                                            src="/openclaw-star-v2.png"
                                            alt="OpenClaw Star"
                                            width={100}
                                            height={100}
                                            className="drop-shadow-[0_0_15px_rgba(255,105,180,0.5)]"
                                        />
                                    </div>
                                    <h3 className="text-[#10B981] font-black text-2xl uppercase tracking-wider mb-2">Deploy Bot</h3>
                                    <p className="text-white/60 text-sm mb-8 min-h-[40px]">
                                        Install <span className="text-white font-mono">@djinn/agent-skill</span>.
                                        <br />Works for New & Existing Users.
                                    </p>

                                    <div
                                        onClick={() => {
                                            navigator.clipboard.writeText('npx @djinn/setup');
                                            setCopiedCmd(true);
                                            setTimeout(() => setCopiedCmd(false), 2000);
                                        }}
                                        className="w-full bg-black/80 p-4 rounded-xl border border-white/10 font-mono text-xs text-left text-[#10B981] relative group-hover:border-[#10B981]/50 transition-colors cursor-pointer active:scale-95"
                                    >
                                        <span className="opacity-50 select-none">$ </span>
                                        <span className="typing-effect">npx @djinn/setup</span>
                                        {copiedCmd ? (
                                            <span className="absolute right-3 top-3 text-[10px] font-bold text-[#10B981] animate-pulse">COPIED!</span>
                                        ) : (
                                            <Copy className="absolute right-3 top-3 w-4 h-4 opacity-50 cursor-pointer hover:opacity-100 hover:text-white" />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-4">ONE-COMMAND SETUP</p>

                                    <div className="mt-8 w-full group/btn">
                                        <Link href="/bots" className="block w-full">
                                            <button className="w-full py-3 bg-[#10B981]/10 text-[#10B981] font-black uppercase text-xs rounded-xl border border-[#10B981] hover:bg-[#10B981] hover:text-black transition-all flex items-center justify-center gap-2 group-hover/btn:shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                                <span>Already Installed? Register Bot</span>
                                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </Link>
                                    </div>
                                </div>

                            </div>

                            {/* LIVE STATS BAR */}
                            <div className="flex items-center gap-8 px-8 py-4 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] text-xs font-mono uppercase tracking-widest">
                                <div className="flex items-center gap-2 text-[#10B981]">
                                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_10px_#10B981]"></span>
                                    <span>Devnet Live</span>
                                </div>
                                <div className="w-px h-4 bg-white/10"></div>
                                <div>
                                    <span className="text-white font-bold text-sm">47</span> <span className="text-white/40">Active Bots</span>
                                </div>
                                <div className="w-px h-4 bg-white/10"></div>
                                <div>
                                    <span className="text-white font-bold text-sm">182</span> <span className="text-white/40">Markets</span>
                                </div>
                                <div className="w-px h-4 bg-white/10 hidden md:block"></div>
                                <div className="hidden md:block">
                                    <span className="text-white font-bold text-sm text-yellow-400">~180ms</span> <span className="text-white/40">Latency</span>
                                </div>
                            </div>
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

            <RegisterBotModal
                isOpen={isBotModalOpen}
                onClose={() => setIsBotModalOpen(false)}
                onSuccess={(botId) => {
                    console.log("🤖 Bot created!", botId);
                    setIsBotModalOpen(false);
                    refreshStatus();
                }}
            />

            {/* Genesis Announcement Modal */}
            <AnimatePresence>
                {showGenesisAnnouncement && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setShowGenesisAnnouncement(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white border-[6px] border-black p-10 rounded-[3rem] shadow-[20px_20px_0px_#FF69B4] max-w-lg w-full text-center flex flex-col items-center"
                        >
                            <div className="w-32 h-32 mb-8 relative animate-bounce">
                                <Image
                                    src="/genesis-medal-v2.png"
                                    alt="Genesis Medal"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <h2 className="text-black text-5xl font-black lowercase tracking-tighter italic leading-none mb-6">
                                genesis unlocked
                            </h2>
                            <p className="text-black/60 font-bold text-lg leading-relaxed mb-10 lowercase">
                                you are one of the first 1000 members. your genesis medal is now available in your profile.
                            </p>
                            <button
                                onClick={() => setShowGenesisAnnouncement(false)}
                                className="w-full bg-black text-white font-black uppercase tracking-widest py-5 rounded-2xl border-4 border-black hover:bg-[#FF69B4] hover:text-black transition-all shadow-[8px_8px_0px_#FF69B4] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-2 active:translate-y-2 active:shadow-none"
                            >
                                enter djinn
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Set display name for HMR transparency
DjinnLanding.displayName = 'DjinnLanding';
