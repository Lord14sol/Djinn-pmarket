'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCategory } from '@/lib/CategoryContext';
import { useModal } from '@/lib/ModalContext';
import OnboardingModal from './OnboardingModal';
import CustomWalletModal from './CustomWalletModal';
import CategoryMegaMenu from './CategoryMegaMenu';
import WalletProfileMenu from './WalletProfileMenu';
import { useRouter } from 'next/navigation';

// --- ICONOS ---
// Premium multi-layer animated fire for Trending
const TrendingFlame = () => (
    <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="relative w-5 h-5">
            {/* Glow behind */}
            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/40 to-transparent rounded-full blur-md animate-pulse" />

            {/* Main flame SVG */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 relative z-10">
                <defs>
                    {/* Hot fire gradient */}
                    <linearGradient id="fireGradient" x1="0%" y1="100%" x2="50%" y2="0%">
                        <stop offset="0%" stopColor="#FF4500">
                            <animate attributeName="stop-color" values="#FF4500;#FF6B35;#FF4500" dur="0.8s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="50%" stopColor="#FF8C00">
                            <animate attributeName="stop-color" values="#FF8C00;#FFA500;#FF8C00" dur="0.6s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="#FFD700">
                            <animate attributeName="stop-color" values="#FFD700;#FFED4A;#FFD700" dur="0.7s" repeatCount="indefinite" />
                        </stop>
                    </linearGradient>

                    {/* Inner core gradient */}
                    <linearGradient id="coreGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#FFE4B5" stopOpacity="0.6" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="fireGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Outer flame - organic dancing motion */}
                <path
                    fill="url(#fireGradient)"
                    filter="url(#fireGlow)"
                    d="M12 2C12 5 10 7 10 10C10 12.5 11 14 12 14C13 14 14 12.5 14 10C14 7 12 5 12 2Z M8 8C8 10 7 11 7 13C7 15.5 9.5 17 12 17C14.5 17 17 15.5 17 13C17 11 16 10 16 8C16 9.5 15 11 15 12.5C15 14 14 15 12 15C10 15 9 14 9 12.5C9 11 8 9.5 8 8Z"
                >
                    <animateTransform
                        attributeName="transform"
                        type="scale"
                        values="1 1;0.95 1.05;1.02 0.98;0.98 1.03;1 1"
                        dur="0.8s"
                        repeatCount="indefinite"
                    />
                </path>

                {/* Middle flame layer */}
                <path
                    fill="url(#fireGradient)"
                    opacity="0.8"
                    d="M12 4C12 6.5 10.5 8 10.5 10.5C10.5 12.5 11 13.5 12 13.5C13 13.5 13.5 12.5 13.5 10.5C13.5 8 12 6.5 12 4Z"
                >
                    <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0 0;0.3 -0.2;-0.2 0.1;0.1 -0.3;0 0"
                        dur="0.5s"
                        repeatCount="indefinite"
                    />
                </path>

                {/* Inner core - bright white/yellow */}
                <ellipse
                    cx="12"
                    cy="12"
                    rx="1.5"
                    ry="2.5"
                    fill="url(#coreGradient)"
                >
                    <animate
                        attributeName="ry"
                        values="2.5;3;2.2;2.8;2.5"
                        dur="0.4s"
                        repeatCount="indefinite"
                    />
                    <animate
                        attributeName="opacity"
                        values="0.9;1;0.85;0.95;0.9"
                        dur="0.3s"
                        repeatCount="indefinite"
                    />
                </ellipse>

                {/* Sparks/particles */}
                <circle cx="10" cy="6" r="0.5" fill="#FFD700" opacity="0.8">
                    <animate attributeName="cy" values="6;4;6" dur="0.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="0.6s" repeatCount="indefinite" />
                </circle>
                <circle cx="14" cy="7" r="0.4" fill="#FFA500" opacity="0.7">
                    <animate attributeName="cy" values="7;5;7" dur="0.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0;0.7" dur="0.5s" repeatCount="indefinite" />
                </circle>
            </svg>
        </div>
    </div>
);

const MenuIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>);
const PodiumIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>);
const ActivityIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12h5.25L9 15.75l1.5-7.5 2.25 9 1.5-4.5h4.5" /></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>);

const mainCategories = ["Trending", "New", "Earth", "Politics", "Crypto", "Sports", "Culture", "Tech", "Science", "Finance", "Climate", "Mentions", "Movies", "Social Media", "Space", "AI", "Gaming", "Music", "History"];
const earthSubcategories = ["North America", "Central America", "South America", "Europe", "Africa", "Asia", "Oceania"];

function NavbarContent() {
    const [isOpen, setIsOpen] = useState(false);
    const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
    const { activeCategory, setActiveCategory, activeSubcategory, setActiveSubcategory } = useCategory();
    const [userPfp, setUserPfp] = useState<string | null>(null);
    const [username, setUsername] = useState<string>("User");
    const [balance, setBalance] = useState<number>(0);
    const { openCreateMarket, openActivityFeed } = useModal();
    const router = useRouter();

    // HYDRATION FIX: Prevent SSR/client mismatch for wallet-dependent content
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Hooks de Solana Wallet Adapter
    const { connected, publicKey, disconnect } = useWallet();
    const { connection } = useConnection();

    // State for Onboarding & Custom Wallet Modal
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

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

                // Actualizar state
                setUsername(profileData.username);
                setUserPfp(profileData.avatar_url);

                // Actualizar cache con optimización para no guardar base64 pesados que saturan localStorage
                try {
                    const storageCopy = { ...profileData };
                    if (storageCopy.avatar_url?.startsWith('data:image')) {
                        storageCopy.avatar_url = null; // No guardar la imagen pesada en localStorage
                    }
                    localStorage.setItem(
                        `djinn_profile_${walletAddress}`,
                        JSON.stringify(storageCopy)
                    );
                } catch (quotaErr) {
                    console.warn('⚠️ LocalStorage full, skipped profile cache update');
                }

                console.log('✅ Profile synced from database');
            } else {
                // Auto-create if not found
                const newProfile = await upsertProfile({
                    wallet_address: walletAddress,
                    username: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
                    bio: 'New Djinn Trader',
                    avatar_url: '/pink-pfp.png'
                });
                if (newProfile) {
                    setUsername(newProfile.username);
                    setUserPfp(newProfile.avatar_url || '/pink-pfp.png');
                }
            }
        } catch (err) {
            console.error('Database sync error:', err);
        }
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

    // Initial Load & Polling Fallback (30s)
    useEffect(() => {
        loadProfile();
        const interval = setInterval(loadProfile, 30000);
        return () => clearInterval(interval);
    }, [connected, publicKey]);

    // AUTO-OPEN MENU ON CONNECTION
    useEffect(() => {
        if (connected) {
            // Short delay to allow UI to settle
            setTimeout(() => setIsOpen(true), 500);
        } else {
            setIsOpen(false);
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
                                            href={`/profile/${username}`}
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
                                                    <button
                                                        onClick={() => {
                                                            setIsNavMenuOpen(false);
                                                            openActivityFeed();
                                                        }}
                                                        className="w-full flex items-center gap-3 px-5 py-3 text-gray-300 hover:text-[#F492B7] hover:bg-white/5 transition-all text-sm font-bold group text-left"
                                                    >
                                                        <ActivityIcon />
                                                        <span>Activity</span>
                                                    </button>

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

                    <CustomWalletModal
                        isOpen={isWalletModalOpen}
                        onClose={() => setIsWalletModalOpen(false)}
                    />
                </div>
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
