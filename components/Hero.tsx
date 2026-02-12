'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { compressImage } from '@/lib/utils';
import HowItWorksModal from './HowItWorksModal';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { supabase } from '@/lib/supabase';
import { useModal } from '@/lib/ModalContext';
import Link from 'next/link';
import { searchMarkets, searchProfiles } from '@/lib/supabase-db';
import { AnimatePresence, motion } from 'framer-motion';
import { useSound } from '@/components/providers/SoundProvider';

// --- ICONOS ---
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

// Search Component that uses searchParams
const HeroContent = ({ onMarketCreated }: { onMarketCreated: (m: any) => void }) => {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { setVisible } = useWalletModal();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { openCreateMarket } = useModal();
    const { play } = useSound();

    const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

    // Search State
    const [query, setQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [markets, setMarkets] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimeout = useRef<NodeJS.Timeout>();

    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setMarkets([]);
            setProfiles([]);
            return;
        }

        setIsLoading(true);
        try {
            const [marketResults, profileResults] = await Promise.all([
                searchMarkets(searchQuery),
                searchProfiles(searchQuery)
            ]);
            setMarkets(marketResults || []);
            setProfiles(profileResults || []);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (query.length >= 2) {
            searchTimeout.current = setTimeout(() => performSearch(query), 300);
        } else {
            setMarkets([]);
            setProfiles([]);
        }

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [query, performSearch]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
                inputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleMarketClick = (slug: string) => {
        setIsSearchOpen(false);
        setQuery('');
        router.push(`/market/${slug}`);
    };

    const handleProfileClick = (username: string) => {
        setIsSearchOpen(false);
        setQuery('');
        router.push(`/profile/${username}`);
    };

    const hasResults = markets.length > 0 || profiles.length > 0;
    const showDropdown = isSearchOpen && (query.length >= 2 || hasResults);

    return (
        <>
            <section className="relative w-full min-h-[40vh] flex flex-col items-center justify-center px-4 pt-24 pb-6">
                <div className="w-full max-w-3xl flex flex-col items-center gap-5">
                    {/* BARRA DE BÚSQUEDA FUNCIONAL */}
                    <div ref={searchRef} className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                            <SearchIcon />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setIsSearchOpen(true)}
                            className="block w-full pl-12 pr-16 py-4 bg-[#111] border-2 border-white/20 rounded-2xl text-lg text-white outline-none hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#F492B7] focus:border-white focus:-translate-y-1 focus:shadow-[4px_4px_0px_0px_#F492B7] transition-all placeholder:text-gray-600"
                            placeholder="Search for markets or profiles..."
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
                            {query && (
                                <button
                                    onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                                    className="p-1 text-gray-500 hover:text-white transition-colors"
                                >
                                    <CloseIcon />
                                </button>
                            )}
                            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                            {showDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50 max-h-[60vh] overflow-y-auto"
                                >
                                    {isLoading ? (
                                        <div className="p-6 text-center">
                                            <div className="inline-block w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            <p className="text-black text-sm mt-2 font-bold uppercase tracking-widest">Searching...</p>
                                        </div>
                                    ) : !hasResults && query.length >= 2 ? (
                                        <div className="p-6 text-center">
                                            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No results for "{query}"</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Markets */}
                                            {markets.length > 0 && (
                                                <div>
                                                    <div className="px-4 py-2 border-b-2 border-black bg-gray-100">
                                                        <span className="text-[10px] font-black text-black uppercase tracking-wider">Markets</span>
                                                    </div>
                                                    {markets.map((market) => (
                                                        <button
                                                            key={market.slug}
                                                            onClick={() => handleMarketClick(market.slug)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F492B7] transition-colors text-left group border-b-2 border-black last:border-0"
                                                        >
                                                            <div className="w-9 h-9 rounded-xl bg-white border-2 border-black flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                {market.banner_url ? (
                                                                    <img src={market.banner_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                                ) : (
                                                                    <span className="text-base">🔮</span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-black text-sm font-black truncate">{market.title}</p>
                                                                {market.category && <span className="text-[10px] text-gray-600 font-bold uppercase">{market.category}</span>}
                                                            </div>
                                                            <span className="text-black group-hover:translate-x-1 transition-transform font-black">→</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* DIVIDER */}
                                            {markets.length > 0 && profiles.length > 0 && <div className="h-2 bg-black w-full" />}

                                            {/* Profiles */}
                                            {profiles.length > 0 && (
                                                <div>
                                                    <div className="px-4 py-2 border-b-2 border-black bg-gray-100">
                                                        <span className="text-[10px] font-black text-black uppercase tracking-wider">Profiles</span>
                                                    </div>
                                                    {profiles.map((profile) => (
                                                        <button
                                                            key={profile.wallet_address}
                                                            onClick={() => handleProfileClick(profile.username || profile.wallet_address)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F492B7] transition-colors text-left group border-b-2 border-black last:border-0"
                                                        >
                                                            <div className="w-9 h-9 rounded-full bg-white border-2 border-black overflow-hidden flex-shrink-0">
                                                                <img src={profile.avatar_url || '/pink-pfp.png'} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/pink-pfp.png'; }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-black text-sm font-black truncate">
                                                                    {profile.username || `${profile.wallet_address.slice(0, 6)}...${profile.wallet_address.slice(-4)}`}
                                                                </p>
                                                                {profile.bio && <p className="text-gray-600 font-medium text-xs truncate">{profile.bio}</p>}
                                                            </div>
                                                            <span className="text-black group-hover:translate-x-1 transition-transform font-black">→</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* BOTÓN PRINCIPAL */}
                    <div className="flex justify-center mt-1">
                        <style jsx>{`
                            @keyframes gradient-xy {
                                0% { background-position: 0% 50%; }
                                50% { background-position: 100% 50%; }
                                100% { background-position: 0% 50%; }
                            }
                            .chroma-hover {
                                background-color: #F492B7;
                            }
                            .chroma-hover:hover {
                                background: linear-gradient(-45deg, #F492B7, #A855F7, #3B82F6, #10B981, #FCD34D, #F492B7);
                                background-size: 400% 400%;
                                animation: gradient-xy 3s ease infinite;
                            }
                        `}</style>
                        <button
                            onClick={() => { openCreateMarket(); play('click'); }}
                            className="chroma-hover text-black text-xl font-black py-4 px-12 rounded-xl shadow-[0_0_20px_rgba(244,146,183,0.3)] hover:scale-105 active:scale-95 transition-all uppercase relative overflow-hidden group tracking-wide"
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
                            Create a Market
                        </button>
                    </div>

                    {/* BOTÓN HOW IT WORKS */}
                    <button onClick={() => setIsHowItWorksOpen(true)} className="px-6 py-2 rounded-full border border-[#F492B7]/20 text-[#F492B7] text-sm font-bold hover:bg-[#F492B7]/10 transition-all">
                        How it works?
                    </button>
                </div>
            </section>

            <HowItWorksModal
                isOpen={isHowItWorksOpen}
                onClose={() => setIsHowItWorksOpen(false)}
            />
        </>
    );
};

const Hero = ({ onMarketCreated }: { onMarketCreated: (m: any) => void }) => {
    return (
        <React.Suspense fallback={<div className="min-h-[40vh]"></div>}>
            <HeroContent onMarketCreated={onMarketCreated} />
        </React.Suspense>
    );
};

export default Hero;