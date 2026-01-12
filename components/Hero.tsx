'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { compressImage } from '@/lib/utils';
import HowItWorksModal from './HowItWorksModal';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { supabase } from '@/lib/supabase';
import { useModal } from '@/lib/ModalContext';
import Link from 'next/link';

// --- ICONOS ---
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

// Mock markets for search
const MOCK_MARKETS = [
    { id: 'argentina-world-cup-2026', title: 'Will Argentina be finalist on the FIFA World Cup 2026?', icon: '🇦🇷', category: 'Sports' },
    { id: 'btc-hit-150k', title: 'Will Bitcoin reach ATH on 2026?', icon: '₿', category: 'Crypto' },
    { id: 'us-strike-mexico', title: 'US strike on Mexico by...?', icon: '🇺🇸', category: 'Politics' },
    { id: 'world-cup-winner-multiple', title: 'Who will win the World Cup 2026?', icon: '🏆', category: 'Sports' },
];

interface SearchResult {
    type: 'market' | 'profile';
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
    url: string;
}

const Hero = ({ onMarketCreated }: { onMarketCreated: (m: any) => void }) => {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { setVisible } = useWalletModal();
    const router = useRouter();
    const { openCreateMarket } = useModal();

    const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

    return (
        <>
            <section className="relative w-full min-h-[40vh] flex flex-col items-center justify-center px-4 pt-24 pb-6">
                <div className="w-full max-w-3xl flex flex-col items-center gap-5">
                    {/* BARRA DE BÚSQUEDA FUNCIONAL */}
                    <div className="relative group w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-12 pr-4 py-4 bg-[#1C1D25] border border-gray-800 rounded-2xl text-lg text-white outline-none focus:ring-2 focus:ring-[#F492B7]"
                            placeholder="Search for markets or profiles..."
                            readOnly
                            onClick={() => alert("Search functionality coming in Phase 3!")}
                        />
                    </div>

                    {/* BOTÓN PRINCIPAL */}
                    <div className="flex justify-center mt-1">
                        <button
                            onClick={openCreateMarket}
                            className="bg-[#F492B7] text-black text-xl font-black py-4 px-12 rounded-xl shadow-[0_0_30px_rgba(244,146,183,0.3)] hover:scale-105 active:scale-95 transition-all uppercase"
                        >
                            Create a Market
                        </button>
                    </div>

                    {/* BOTÓN HOW IT WORKS */}
                    <button onClick={() => setIsHowItWorksOpen(true)} className="px-6 py-2 rounded-full bg-[#F492B7]/10 border border-[#F492B7]/20 text-[#F492B7] text-sm font-bold hover:bg-[#F492B7]/20 transition-all">
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

export default Hero;