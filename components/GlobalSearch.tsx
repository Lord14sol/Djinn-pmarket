'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchGlobal } from '@/lib/supabase-db';
import { Loader2, Search } from 'lucide-react';
import Image from 'next/image';

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ profiles: any[], markets: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsLoading(true);
                const data = await searchGlobal(query);
                setResults(data);
                setIsLoading(false);
                setIsOpen(true);
            } else {
                setResults(null);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (path: string) => {
        setIsOpen(false);
        setQuery('');
        router.push(path);
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-md mx-4 hidden md:block">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#F492B7] transition-colors">
                    <Search className="w-4 h-4" />
                </div>
                <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#F492B7]/50 focus:bg-white/10 transition-all placeholder:text-gray-600 font-medium"
                    placeholder="Search markets, profiles, or wallets..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results) setIsOpen(true); }}
                />
                {isLoading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Loader2 className="w-4 h-4 text-[#F492B7] animate-spin" />
                    </div>
                )}
            </div>

            {/* RESULTS DROPDOWN */}
            {isOpen && results && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* EMPTY STATE */}
                    {results.profiles.length === 0 && results.markets.length === 0 && (
                        <div className="p-6 text-center text-gray-500 text-xs uppercase font-bold tracking-widest">
                            No results found
                        </div>
                    )}

                    {/* PROFILES SECTION */}
                    {results.profiles.length > 0 && (
                        <div className="py-2">
                            <h3 className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-[#F492B7]">Profiles</h3>
                            {results.profiles.map((p, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(`/profile/${p.username}`)}
                                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
                                        <img src={p.avatar_url || '/pink-pfp.png'} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{p.username}</p>
                                        <p className="text-[10px] text-gray-500 font-mono truncate">{p.wallet_address}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {results.profiles.length > 0 && results.markets.length > 0 && (
                        <div className="h-[1px] bg-white/5 mx-4" />
                    )}

                    {/* MARKETS SECTION */}
                    {results.markets.length > 0 && (
                        <div className="py-2">
                            <h3 className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-emerald-400">Markets</h3>
                            {results.markets.map((m, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(`/market/${m.slug}`)}
                                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 shrink-0 flex items-center justify-center text-lg">
                                        {m.banner_url ? (
                                            <img src={m.banner_url} className="w-full h-full object-cover" />
                                        ) : '🔮'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{m.title}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
