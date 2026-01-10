'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCategory } from '@/lib/CategoryContext';

// --- ICONOS ---
const DjinnStar = () => (
    <div className="absolute -left-5 top-1/2 -translate-y-1/2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#F492B7] animate-star-slow">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
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

    // Hooks de Solana Wallet Adapter
    const { setVisible } = useWalletModal();
    const { connected, publicKey, disconnect } = useWallet();

    // Cargar perfil (Local + Supabase)
    useEffect(() => {
        const loadProfile = async () => {
            // 1. Intentar local storage primero (rápido)
            try {
                const savedProfile = localStorage.getItem('djinn_user_profile');
                if (savedProfile) {
                    const profile = JSON.parse(savedProfile);
                    if (profile.pfp) setUserPfp(profile.pfp);
                    if (profile.username) setUsername(profile.username);
                }
            } catch (e) {
                console.error("Error loading local profile", e);
            }

            // 2. Si hay wallet, intentar Supabase (fuente de verdad)
            if (connected && publicKey) {
                try {
                    // Importar dinámicamente o usar la importación top-level si agregamos el import
                    // Para evitar conflictos con 'use client', asegúrate de que supabase-db.ts sea client-safe o úsalo aquí.
                    // Como Navbar es 'use client', podemos importar supabaseDb arriba.
                    // Pero necesitamos agregarlo a los imports.
                    // Asumiendo que agregaremos el import arriba, aquí llamamos:
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

        loadProfile();
        // Escuchar cambios de storage local
        window.addEventListener('storage', loadProfile);
        return () => window.removeEventListener('storage', loadProfile);
    }, [connected, publicKey]);

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
            <style jsx global>{`
                @keyframes breathe {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(0.9); }
                }
                .animate-star-slow { animation: breathe 3s ease-in-out infinite; }

                .djinn-bubble-btn-mini {
                    background: rgba(244, 146, 183, 0.1) !important;
                    color: #F492B7 !important;
                    font-weight: 700 !important;
                    font-size: 0.75rem !important;
                    padding: 0.5rem 1.2rem !important;
                    border-radius: 9999px !important;
                    border: 1px solid rgba(244, 146, 183, 0.2) !important;
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }
                .djinn-bubble-btn-mini:hover {
                    background: rgba(244, 146, 183, 0.18) !important;
                    border-color: rgba(244, 146, 183, 0.4) !important;
                }
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
                    <div className="hidden sm:flex items-center">
                        {!connected ? (
                            /* Desconectado: Botón Connect Wallet */
                            <button
                                onClick={() => setVisible(true)}
                                className="px-5 py-2.5 rounded-xl bg-[#F492B7] text-black text-[11px] font-black uppercase tracking-wider hover:bg-[#ff6fb7] hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(244,146,183,0.2)]"
                            >
                                Connect Wallet
                            </button>
                        ) : (
                            /* Conectado: Foto + dirección rosa → click va al perfil */
                            <Link
                                href={`/profile/${publicKey?.toString()}`}
                                className="group flex items-center gap-3 bg-[#0d0d0f] border border-[#F492B7]/20 py-1 pl-1 pr-4 rounded-full cursor-pointer hover:border-[#F492B7]/50 hover:bg-[#F492B7]/5 transition-all duration-300"
                            >
                                {/* Avatar destacado */}
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#F492B7]/40 group-hover:border-[#F492B7] transition-all shadow-[0_0_15px_rgba(244,146,183,0.15)] group-hover:shadow-[0_0_20px_rgba(244,146,183,0.3)]">
                                    {userPfp ? (
                                        <img src={userPfp} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <Image src="/star.png" alt="Profile" fill className="object-cover p-1.5" />
                                    )}
                                </div>
                                {/* Dirección en rosa */}
                                <span className="text-[11px] font-bold text-[#F492B7] tracking-wide group-hover:text-[#ff6fb7] transition-colors">
                                    {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                                </span>
                            </Link>
                        )}
                    </div>

                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
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
                        {cat === "Trending" && <DjinnStar />}
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