'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCategory } from '@/lib/CategoryContext';
import { useModal } from '@/lib/ModalContext';
import OnboardingModal from './OnboardingModal';
import CustomWalletModal from './CustomWalletModal';
import CategoryMegaMenu from './CategoryMegaMenu';
import WalletProfileMenu from './WalletProfileMenu';
import GlobalSearch from './GlobalSearch';
import ClaimUsernameModal from './ClaimUsernameModal';


// ... (existing imports)

// ... inside NavbarContent ...
const MenuIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>);
const PodiumIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0V9.499a2.25 2.25 0 00-2.25-2.25H11.25a2.25 2.25 0 00-2.25 2.25v5.751m5.007 0H13.5m-2.25 0H9.986" /></svg>);
const ActivityIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>);
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
    const handleClaimSuccess = (newUsername: string) => {
        setIsClaimModalOpen(false);
        setUsername(newUsername);
        setUserPfp('/pink-pfp.png'); // Default pfp
        console.log('🎉 Profile Created:', newUsername);
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
    // AUTO-OPEN MENU ON CONNECTION (ONCE PER SESSION)
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
            <nav className="fixed top-0 left-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
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
                            {/* Botón Create Market estilo principal */}
                            <button
                                onClick={openCreateMarket}
                                className="bg-[#F492B7] text-black text-sm font-black py-3 px-6 rounded-xl shadow-[0_0_10px_rgba(244,146,183,0.1)] hover:scale-105 active:scale-95 transition-all uppercase tracking-wide"
                            >
                                Create a Market
                            </button>

                            {/* HYDRATION FIX: Only render wallet state after mount */}
                            {!mounted ? (
                                /* Placeholder during SSR */
                                <div className="px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-gray-400 text-[11px] font-black uppercase tracking-wider">
                                    Loading...
                                </div>
                            ) : !connected ? (
                                /* Desconectado */
                                <button
                                    onClick={() => setIsWalletModalOpen(true)}
                                    className="px-5 py-2.5 rounded-xl bg-[#F492B7] text-black text-[11px] font-black uppercase tracking-wider hover:bg-[#ff6fb7] hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(244,146,183,0.2)]"
                                >
                                    Connect Wallet
                                </button>
                            ) : (
                                <>
                                    {/* Conectado: Rediseño estilo usuario - Clean Transparent */}
                                    <div className="flex items-center gap-3">
                                        {/* Avatar Trigger Area */}
                                        <div
                                            className="relative w-8 h-8 rounded-full overflow-hidden bg-white/5 cursor-pointer hover:opacity-80 transition-opacity"
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

                                    {/* HAMBURGER MENU NEXT TO PFP */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
                                            className="p-2 text-gray-400 hover:text-[#F492B7] transition-all hover:scale-110 active:scale-95 bg-white/5 rounded-lg border border-white/5"
                                        >
                                            <MenuIcon />
                                        </button>

                                        {/* DROPDOWN MENU */}
                                        {isNavMenuOpen && (
                                            <>
                                                <div className="fixed inset-0 z-[100]" onClick={() => setIsNavMenuOpen(false)} />
                                                <div className="absolute top-12 right-0 w-48 bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[101] py-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                    <Link
                                                        href="/leaderboard"
                                                        onClick={() => setIsNavMenuOpen(false)}
                                                        className="w-full flex items-center gap-3 px-5 py-3 text-gray-300 hover:text-[#F492B7] hover:bg-white/5 transition-all text-sm font-bold group"
                                                    >
                                                        <PodiumIcon />
                                                        <span>Leaderboard</span>
                                                    </Link>
                                                    <Link
                                                        href="/activity"
                                                        onClick={() => setIsNavMenuOpen(false)}
                                                        className="w-full flex items-center gap-3 px-5 py-3 text-gray-300 hover:text-[#F492B7] hover:bg-white/5 transition-all text-sm font-bold group text-left"
                                                    >
                                                        <ActivityIcon />
                                                        <span>Activity Feed</span>
                                                    </Link>

                                                    <div className="border-t border-white/5 my-1" />

                                                    <Link
                                                        href={`/profile/me`}
                                                        onClick={() => setIsNavMenuOpen(false)}
                                                        className="w-full flex items-center gap-3 px-5 py-3 text-[#F492B7] hover:bg-white/5 transition-all text-sm font-black uppercase tracking-wider"
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
