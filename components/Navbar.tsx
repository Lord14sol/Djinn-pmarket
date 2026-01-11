'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCategory } from '@/lib/CategoryContext';

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

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { activeCategory, setActiveCategory, activeSubcategory, setActiveSubcategory } = useCategory();
    const [userPfp, setUserPfp] = useState<string | null>(null);
    const [username, setUsername] = useState<string>("User");
    const [balance, setBalance] = useState<number>(0);

    // Hooks de Solana Wallet Adapter
    const { setVisible } = useWalletModal();
    const { connected, publicKey, disconnect } = useWallet();
    const { connection } = useConnection();

    // Cargar perfil (Local + Supabase + Balance)
    useEffect(() => {
        const loadData = async () => {
            if (connected && publicKey) {
                // 1. Balance
                try {
                    const bal = await connection.getBalance(publicKey);
                    setBalance(bal / LAMPORTS_PER_SOL);
                } catch (e) {
                    console.error("Error loading balance", e);
                }

                // 2. Profile
                try {
                    const dbProfile = await import('@/lib/supabase-db').then(mod => mod.getProfile(publicKey.toBase58()));
                    if (dbProfile) {
                        if (dbProfile.avatar_url) setUserPfp(dbProfile.avatar_url);
                        if (dbProfile.username) setUsername(dbProfile.username);
                    }
                } catch (err) {
                    console.error("Error loading remote profile", err);
                }
            }
        };

        loadData();
    }, [connected, publicKey, connection]);

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
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
                <Link href="/" className="flex items-center group gap-0">
                    <div className="relative w-20 h-20 md:w-24 md:h-24 transition-transform duration-500 group-hover:scale-105">
                        <Image src="/star.png" alt="Djinn Logo" fill className="object-contain" priority />
                    </div>
                    <span className="text-4xl md:text-5xl text-white -ml-4 mt-2" style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                        Djinn
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-4">
                        {/* Botón Create Market estilo principal */}
                        <Link
                            href="/?create=true"
                            className="bg-[#F492B7] text-black text-sm font-black py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(244,146,183,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-wide"
                        >
                            Create a Market
                        </Link>

                        {!connected ? (
                            /* Desconectado */
                            <button
                                onClick={() => setVisible(true)}
                                className="px-5 py-2.5 rounded-xl bg-[#F492B7] text-black text-[11px] font-black uppercase tracking-wider hover:bg-[#ff6fb7] hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(244,146,183,0.2)]"
                            >
                                Connect Wallet
                            </button>
                        ) : (
                            /* Conectado: Rediseño estilo usuario */
                            <div className="flex items-center bg-[#1A1A1A] rounded-lg p-1 pr-4 gap-3 border border-white/5 hover:border-white/20 transition-all cursor-pointer group" onClick={() => setIsOpen(!isOpen)}>
                                {/* Avatar - No white border */}
                                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                                    {userPfp ? (
                                        <img src={userPfp} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                                            <span className="text-xs">🐸</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                                        {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                                    </span>
                                    <span className="text-xs font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                                        {balance.toFixed(2)} SOL
                                    </span>
                                </div>

                                <span className="text-gray-500 text-xs">▼</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 text-gray-400 hover:text-white transition-colors sm:hidden"
                    >
                        {isOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>

                {isOpen && (
                    <div className="absolute top-24 right-6 w-64 bg-[#0B0E14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-5 z-[60]">
                        <div className="p-2">
                            {connected && (
                                <Link
                                    href={`/profile/${publicKey?.toString()}`}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors group"
                                >
                                    <div className="text-blue-400/80 group-hover:text-blue-400 transition-colors">
                                        <UserIcon />
                                    </div>
                                    <span className="text-sm font-bold text-gray-200 uppercase tracking-widest">My Profile</span>
                                </Link>
                            )}

                            {/* Mobile Create Market */}
                            <Link
                                href="/?create=true"
                                onClick={() => setIsOpen(false)}
                                className="flex sm:hidden items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors group"
                            >
                                <div className="text-green-400/80 group-hover:text-green-400 transition-colors">
                                    <span className="text-lg">✨</span>
                                </div>
                                <span className="text-sm font-bold text-gray-200 uppercase tracking-widest">Create Market</span>
                            </Link>

                            <Link
                                href="/leaderboard"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors group"
                            >
                                <div className="text-yellow-500/80 group-hover:text-yellow-500 transition-colors">
                                    <PodiumIcon />
                                </div>
                                <span className="text-sm font-bold text-gray-200 uppercase tracking-widest">Leaderboard</span>
                            </Link>
                            <Link
                                href="/live"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors group"
                            >
                                <div className="text-[#F492B7]/80 group-hover:text-[#F492B7] transition-colors">
                                    <ActivityIcon />
                                </div>
                                <span className="text-sm font-bold text-gray-200 uppercase tracking-widest">Activity</span>
                            </Link>
                        </div>
                        {connected && (
                            <div className="p-2 border-t border-white/5 bg-black/40">
                                <button
                                    onClick={() => { disconnect(); setIsOpen(false); }}
                                    className="w-full text-center py-3 text-[10px] text-gray-500 hover:text-red-400 uppercase tracking-[0.2em] font-black transition-colors"
                                >
                                    Disconnect Wallet
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="border-t border-white/5 flex overflow-x-auto scrollbar-hide py-5 px-6 md:px-12 gap-10 bg-black/40 items-center">
                {mainCategories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => {
                            setActiveCategory(cat);
                            if (cat !== "Earth") setActiveSubcategory("");
                        }}
                        className={`relative text-[14px] font-black uppercase tracking-[0.25em] transition-all whitespace-nowrap 
                        ${activeCategory === cat ? "text-[#F492B7]" : "text-gray-400 hover:text-gray-200"}`}
                    >

                        {cat}
                    </button>
                ))}
            </div>

            {activeCategory === "Earth" && (
                <div className="border-t border-[#F492B7]/10 flex overflow-x-auto scrollbar-hide py-4 px-10 md:px-20 gap-10 bg-[#F492B7]/5 animate-in slide-in-from-top-2 duration-300">
                    {earthSubcategories.map((sub) => (
                        <button
                            key={sub}
                            onClick={() => setActiveSubcategory(sub)}
                            className={`text-[12px] font-bold uppercase tracking-widest transition-all whitespace-nowrap
                            ${activeSubcategory === sub ? "text-[#F492B7]" : "text-white/60 hover:text-white"}`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
            )}
        </nav>
    );
}