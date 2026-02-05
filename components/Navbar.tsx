'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCategory } from '@/lib/CategoryContext';
import { useModal } from '@/lib/ModalContext';
import { useAchievement } from '@/lib/AchievementContext'; // ADDED IMPORT
import OnboardingModal from './OnboardingModal';
import CustomWalletModal from './CustomWalletModal';
import CategoryMegaMenu from './CategoryMegaMenu';
import WalletProfileMenu from './WalletProfileMenu';
import GlobalSearch from './GlobalSearch';
import ClaimUsernameModal from './ClaimUsernameModal';
import { useSound } from '@/components/providers/SoundProvider';
import MorphingIcon from '@/components/ui/MorphingIcon';
import { motion, AnimatePresence } from 'framer-motion';


// ... (existing imports)

// ... inside NavbarContent ...
// Premium Morphing Icons replaced static ones
// Removed unused icons

const mainCategories = ["Trending", "New", "Earth", "Politics", "Crypto", "Sports", "Culture", "Tech", "Science", "Finance", "Climate", "Mentions", "Movies", "AI", "Gaming", "Music"];
const earthSubcategories = ["North America", "Central America", "South America", "Europe", "Africa", "Asia", "Oceania"];

function NavbarContent() {
    const [isOpen, setIsOpen] = useState(false);
    const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
    // const { activeCategory, setActiveCategory, activeSubcategory, setActiveSubcategory } = useCategory(); // UNUSED
    const [userPfp, setUserPfp] = useState<string | null>(null);
    const [username, setUsername] = useState<string>("User");
    const [balance, setBalance] = useState<number>(0);
    const { openCreateMarket, openActivityFeed } = useModal();
    const { unlockAchievement } = useAchievement(); // HOOK USED HERE
    const { play } = useSound();
    const router = useRouter();
    const pathname = usePathname();

    // Hide navbar search on home/markets page (has its own big search bar)
    const isHomePage = pathname === '/' || pathname === '/markets';

    // HYDRATION FIX: Prevent SSR/client mismatch for wallet-dependent content
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Hooks de Solana Wallet Adapter
    const { connected, publicKey, disconnect } = useWallet();
    const { connection } = useConnection();


    // ... (existing imports)

    // ... inside NavbarContent ...
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

    // NEW: Claim Username Modal State
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [tempConnectedWallet, setTempConnectedWallet] = useState<string | null>(null);

    // Cargar perfil (Local + Supabase + Balance)
    // 🔥 FUNCIÓN PARA CARGAR PERFIL (Cache-First Strategy)
    const loadProfile = async () => {
        if (!connected || !publicKey) {
            setUsername('');
            setUserPfp('');
            return;
        }

        const walletAddress = publicKey.toBase58();

        // 1️⃣ PRIMERO: Intentar cargar desde localStorage (INSTANTÁNEO)
        try {
            const cachedProfile = localStorage.getItem(`djinn_profile_${walletAddress}`);
            if (cachedProfile) {
                const profile = JSON.parse(cachedProfile);
                setUsername(profile.username || 'Anon');
                setUserPfp(profile.avatar_url && profile.avatar_url.trim() ? profile.avatar_url : '/pink-pfp.png');
                console.log('✅ Profile loaded from cache');
            }
        } catch (e) {
            console.error('Cache read error:', e);
        }

        // 2️⃣ SEGUNDO: Sincronizar con la base de datos (BACKGROUND)
        try {
            const { getProfile, upsertProfile } = await import('@/lib/supabase-db');
            const dbProfile = await getProfile(walletAddress);

            if (dbProfile) {
                const profileData = {
                    username: dbProfile.username || `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
                    avatar_url: dbProfile.avatar_url && dbProfile.avatar_url.trim() ? dbProfile.avatar_url : '/pink-pfp.png',
                    bio: dbProfile.bio || ''
                };

                // ALWAYS update state from DB (DB is source of truth)
                setUsername(profileData.username);
                setUserPfp(profileData.avatar_url);

                try {
                    localStorage.setItem(`djinn_profile_${walletAddress}`, JSON.stringify(profileData));
                } catch (quotaErr) {
                    console.warn('⚠️ LocalStorage full, skipped profile cache update');
                }
            } else {
                // DO NOT AUTO-CREATE. OPEN CLAIM MODAL.
                console.log('✨ New User Detected! Opening Claim Flow...');
                setTempConnectedWallet(walletAddress);
                setIsClaimModalOpen(true);
            }
        } catch (err) {
            console.error('Database sync error:', err);
        }
    };

    // Handler for successful claim
    const handleClaimSuccess = async (newUsername: string) => {
        setIsClaimModalOpen(false);
        setUsername(newUsername);
        setUserPfp('/pink-pfp.png'); // Default pfp
        console.log('🎉 Profile Created:', newUsername);

        // TRIGGER GENESIS ACHIEVEMENT INSTANTLY
        if (connected && publicKey) {
            try {
                // Check eligibility one last time
                const { getWhitelistStatus } = await import('@/lib/whitelist');
                const status = await getWhitelistStatus(publicKey.toBase58());
                const { getUserAchievements, grantAchievement } = await import('@/lib/supabase-db');

                // If eligible and doesn't have it yet
                if (status.isRegistered || status.isAdmin) {
                    const achievements = await getUserAchievements(publicKey.toBase58());
                    if (!achievements.some(a => a.code === 'GENESIS_MEMBER')) {

                        // Show visual pop-up immediately
                        unlockAchievement({
                            name: "Genesis Member",
                            description: "One of the first 1000 Djinn users",
                            image_url: "/genesis-medal-v2.png"
                        });

                        // Persist in DB
                        grantAchievement(publicKey.toBase58(), 'GENESIS_MEMBER');

                        // Mark local flag to prevent LayoutWrapper from firing again
                        localStorage.setItem(`djinn_genesis_notified_v16_${publicKey.toBase58()}`, 'true');
                    }
                }
            } catch (e) {
                console.error("Error triggering instant achievement:", e);
            }
        }
    };

    // Handler for closing claim (disconnect to prevent limbd)
    const handleClaimClose = () => {
        setIsClaimModalOpen(false);
        disconnect();
    };

    useEffect(() => {
        let subscriptionId: number;

        if (connected && publicKey) {
            loadProfile();

            // Fetch initial balance
            connection.getBalance(publicKey).then((bal) => {
                setBalance(bal / LAMPORTS_PER_SOL);
            }).catch(e => console.error("Initial balance fetch error:", e));

            // Real-time balance updates
            try {
                subscriptionId = connection.onAccountChange(
                    publicKey,
                    (updatedAccountInfo) => {
                        setBalance(updatedAccountInfo.lamports / LAMPORTS_PER_SOL);
                    },
                    'confirmed'
                );
            } catch (e) {
                console.error("Failed to subscribe to account changes:", e);
            }

            // GLOBAL SYNC: Listen for profile updates from other components
            const handleProfileUpdate = () => {
                console.log("🔄 Navbar received profile update event");
                loadProfile();
            };
            window.addEventListener('djinn-profile-updated', handleProfileUpdate);

            return () => {
                if (subscriptionId) connection.removeAccountChangeListener(subscriptionId);
                window.removeEventListener('djinn-profile-updated', handleProfileUpdate);
            };
        }
    }, [connected, publicKey, connection]);

    // Initial Load & Polling Fallback (60s - Less aggressive)
    useEffect(() => {
        let isAborted = false;

        const safeLoad = async () => {
            if (isAborted) return;
            try {
                await loadProfile();
            } catch (e: any) {
                if (e.message?.includes('quota') || e.message?.includes('429')) {
                    console.warn('⚠️ Polling stopped due to quota limit');
                    isAborted = true; // Stop polling
                }
            }
        };

        safeLoad();
        const interval = setInterval(safeLoad, 60000); // Increased to 60s
        return () => clearInterval(interval);
    }, [connected, publicKey]);

    // AUTO-OPEN MENU ON CONNECTION
    useEffect(() => {
        if (connected) {
            // Check if we already auto-opened the menu in this session
            const hasAutoOpened = sessionStorage.getItem('djinn_menu_auto_opened');

            if (!hasAutoOpened) {
                // Short delay to allow UI to settle
                setTimeout(() => {
                    setIsOpen(true);
                    sessionStorage.setItem('djinn_menu_auto_opened', 'true');
                }, 500);
            }
        } else {
            setIsOpen(false);
            // Reset flag on disconnect so it opens again next time
            sessionStorage.removeItem('djinn_menu_auto_opened');
        }
    }, [connected]);

    return (
        <>
            <nav className="fixed top-0 left-0 w-full z-50 bg-black">
                <style jsx global>{`
                @keyframes breathe {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(0.9); }
                }
                @keyframes flameModern {
                    0%, 100% { transform: scaleY(1) scaleX(1); opacity: 1; }
                    25% { transform: scaleY(1.08) scaleX(0.95); opacity: 0.95; }
                    50% { transform: scaleY(0.92) scaleX(1.05); opacity: 1; }
                    75% { transform: scaleY(1.05) scaleX(0.97); opacity: 0.9; }
                }
                .animate-star-slow { animation: breathe 3s ease-in-out infinite; }
                .animate-flame-modern { animation: flameModern 1.2s ease-in-out infinite; transform-origin: bottom center; }
            `}</style>

                <div className="w-full px-6 md:px-12 h-24 flex items-center justify-between relative">
                    <Link href="/markets" className="flex items-center group gap-0">
                        <div className="relative w-16 h-16 md:w-24 md:h-24 transition-transform duration-500 group-hover:scale-110 -mr-3">
                            <Image src="/djinn-logo.png?v=3" alt="Djinn Logo" fill className="object-contain" priority unoptimized />
                        </div>
                        <span className="text-3xl md:text-5xl text-white mt-1 relative z-10" style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                            Djinn
                        </span>
                    </Link>

                    {/* GLOBAL SEARCH - Hidden on home page (has its own big search bar) */}
                    {!isHomePage && (
                        <div className="hidden md:flex flex-1 justify-center z-50 px-4">
                            {mounted && <GlobalSearch />}
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-4">
                            {/* Botón Create Market estilo "Teclado" Pink */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    openCreateMarket();
                                    play('click');
                                }}
                                className="bg-[#F492B7] text-black text-sm font-black py-3 px-6 rounded-xl hover:brightness-110 active:scale-95 transition-all uppercase tracking-wide shadow-lg"
                            >
                                Create a Market
                            </motion.button>

                            {/* HYDRATION FIX: Only render wallet state after mount */}
                            {!mounted ? (
                                /* Placeholder during SSR */
                                <div className="px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-gray-400 text-[11px] font-black uppercase tracking-wider border-2 border-white/10">
                                    Loading...
                                </div>
                            ) : !connected ? (
                                /* Desconectado */
                                <button
                                    onClick={() => { setIsWalletModalOpen(true); play('click'); }}
                                    className="px-5 py-2.5 rounded-xl bg-white text-black border-2 border-black text-[11px] font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#F492B7] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#F492B7] active:translate-y-1 active:shadow-none transition-all duration-300"
                                >
                                    Connect Wallet
                                </button>
                            ) : (
                                <>
                                    {/* Conectado: Rediseño estilo usuario - Clean Transparent */}
                                    <div className="flex items-center gap-3">
                                        {/* Avatar Trigger Area */}
                                        <div
                                            className="relative w-10 h-10 rounded-full overflow-hidden bg-black cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => setIsOpen(!isOpen)}
                                        >
                                            {userPfp ? (
                                                <img
                                                    src={userPfp}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        setUserPfp(null);
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src="/pink-pfp.png"
                                                    alt="Default Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>

                                        {/* Identity Link */}
                                        <Link
                                            href="/profile/me"
                                            className="flex flex-col items-start leading-none group hover:opacity-80 transition-all"
                                        >
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 group-hover:text-[#F492B7]">
                                                {username && username !== 'User' && !username.startsWith(publicKey?.toString().slice(0, 4) || 'xxxx')
                                                    ? username
                                                    : `${publicKey?.toString().slice(0, 4)}...${publicKey?.toString().slice(-4)}`
                                                }
                                            </span>
                                            <span className="text-xs font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                                                {balance.toFixed(2)} SOL
                                            </span>
                                        </Link>

                                        <span
                                            className="text-gray-500 text-xs cursor-pointer hover:text-white transition-colors ml-1"
                                            onClick={() => setIsOpen(!isOpen)}
                                        >
                                            ▼
                                        </span>
                                    </div>

                                    {/* HAMBURGER MENU - PINK KEYCAP */}
                                    <div className="relative">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                setIsNavMenuOpen(!isNavMenuOpen);
                                                play('toggle');
                                            }}
                                            className="p-2 text-black bg-[#F492B7] rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg"
                                        >
                                            <MorphingIcon type={isNavMenuOpen ? "close" : "menu"} size={24} />
                                        </motion.button>

                                        {/* DROPDOWN MENU */}
                                        {isNavMenuOpen && (
                                            <>
                                                <div className="fixed inset-0 z-[100]" onClick={() => setIsNavMenuOpen(false)} />
                                                <div className="absolute top-12 right-0 w-48 bg-black border-2 border-white rounded-xl z-[101] py-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                    <Link
                                                        href="/leaderboard"
                                                        onClick={() => setIsNavMenuOpen(false)}
                                                        className="w-full flex items-center gap-3 px-5 py-3 text-white hover:text-black hover:bg-[#F492B7] transition-all text-sm font-bold group"
                                                    >
                                                        <MorphingIcon type="leaderboard" size={18} />
                                                        <span>Leaderboard</span>
                                                    </Link>
                                                    <Link
                                                        href="/activity"
                                                        onClick={() => setIsNavMenuOpen(false)}
                                                        className="w-full flex items-center gap-3 px-5 py-3 text-white hover:text-black hover:bg-[#F492B7] transition-all text-sm font-bold group text-left"
                                                    >
                                                        <MorphingIcon type="activity" size={18} />
                                                        <span>Activity Feed</span>
                                                    </Link>

                                                    <div className="border-t-2 border-white my-1" />

                                                    <Link
                                                        href={`/profile/me`}
                                                        onClick={() => setIsNavMenuOpen(false)}
                                                        className="w-full flex items-center gap-3 px-5 py-3 text-[#F492B7] hover:bg-white hover:text-black transition-all text-sm font-black uppercase tracking-wider"
                                                    >
                                                        <span className="text-lg">👤</span>
                                                        <span>Profile</span>
                                                    </Link>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>

                {/* --- CATEGORY SELECTOR (Integrated) --- */}
                <CategoryMegaMenu />
            </nav>

            {/* Wallet Profile Menu OUTSIDE nav to allow world-space absolute/fixed positioning */}
            <WalletProfileMenu
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                username={username || 'Anon'}
                pfp={userPfp || '/pink-pfp.png'}
                walletAddress={publicKey ? publicKey.toBase58() : ''}
                disconnect={() => { disconnect(); setIsOpen(false); }}
                onEditProfile={() => {
                    setIsOpen(false);
                    if (username) router.push(`/profile/${username}`);
                }}
                openCreateMarket={openCreateMarket}
                openActivityFeed={openActivityFeed}
                connected={connected}
                publicKey={publicKey}
            />

            {/* Custom Wallet Modal */}
            <CustomWalletModal
                isOpen={isWalletModalOpen}
                onClose={() => setIsWalletModalOpen(false)}
            />

            {/* Claim Username Modal (Neo-Brutalism) */}
            <ClaimUsernameModal
                isOpen={isClaimModalOpen}
                walletAddress={tempConnectedWallet || publicKey?.toBase58() || ''}
                onSuccess={handleClaimSuccess}
                onClose={handleClaimClose}
            />
        </>
    );
}

// 2. Export the wrapped component
export default function Navbar() {
    return (
        <React.Suspense fallback={<div className="h-20 bg-black/50 backdrop-blur-md border-b border-white/5" />}>
            <NavbarContent />
        </React.Suspense>
    );
}
