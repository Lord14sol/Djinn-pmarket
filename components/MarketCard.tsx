'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QuickBetModal from './QuickBetModal';
import { useWallet } from '@solana/wallet-adapter-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { MarketStatusBadge } from './MarketStatusBadge';
import { useSound } from './providers/SoundProvider';


interface MarketCardProps {
    title: string;
    slug: string;
    icon: string;
    volume: string;
    chance: number;
    description: string;
    endDate: string;
    isNew?: boolean;
    yesTokenMint?: string;
    noTokenMint?: string;
    marketPDA?: string;
    category?: string;
    resolved?: boolean;
    status?: string;
    winningOutcome?: string;
    options?: any[];
    resolutionSource?: string;
    compact?: boolean; // New prop for grid view
}

const StarIcon = ({ active, onClick }: { active: boolean, onClick: (e: any) => void }) => {
    return (
        <div onClick={onClick} className="transition-transform active:scale-90">
            <Star
                className={`w-6 h-6 transition-colors duration-300 ${active ? 'fill-[#F492B7] text-[#F492B7]' : 'text-gray-400 hover:text-white'
                    }`}
                strokeWidth={active ? 0 : 2}
            />
        </div>
    );
};

const MarketCard: React.FC<MarketCardProps> = React.memo(({
    title,
    slug,
    icon,
    volume,
    chance,
    description,
    endDate,
    isNew,
    yesTokenMint,
    noTokenMint,
    marketPDA,
    category,
    resolved,
    winningOutcome,
    options,
    resolutionSource,
    compact = false,
    status = 'PENDING'
}) => {
    const { publicKey } = useWallet();
    const { play } = useSound();
    const router = useRouter(); // Using Next.js router
    const [timeLeft, setTimeLeft] = useState('');
    const [isStarred, setIsStarred] = useState(false);
    const [showBetModal, setShowBetModal] = useState(false);
    const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [selectedOptionChance, setSelectedOptionChance] = useState<number>(0);

    // Only treat as multiple (list view) if there are MORE than 2 options.
    // Binary markets (2 options) should use the side-by-side buttons.
    const isMultiple = !!(options && options.length > 2);

    const handleBetClick = (e: React.MouseEvent, outcome: 'yes' | 'no', optionName?: string, optionChance?: number) => {
        e.preventDefault();
        e.stopPropagation();
        play('click');
        setSelectedOutcome(outcome);
        if (optionName) setSelectedOption(optionName);
        if (optionChance) setSelectedOptionChance(optionChance);
        else setSelectedOptionChance(chance || 50);
        setShowBetModal(true);
    };

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        play('shimmer');
        router.push(`/market/${slug}`);
    };

    useEffect(() => {
        // Simple countdown logic
        const calculateTimeLeft = () => {
            const end = new Date(endDate).getTime();
            const now = new Date().getTime();
            const diff = end - now;
            if (diff <= 0) return 'Ended';

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            if (days > 0) return `${days}d ${hours}h`;
            return `${hours}h left`;
        };
        setTimeLeft(calculateTimeLeft());
    }, [endDate]);

    // Saved Animation State
    const [showSavedAnim, setShowSavedAnim] = useState(false);

    const handleStarClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsStarred(!isStarred);
        play('toggle');
        if (!isStarred) {
            setShowSavedAnim(true);
            setTimeout(() => setShowSavedAnim(false), 1000);
        }
    };

    return (
        <motion.div
            onClick={handleNavigate}
            whileHover={{ y: -6, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            style={{ borderColor: 'black' }}
            className={`
                bg-white border-2 !border-black rounded-2xl relative flex flex-col 
                hover:!shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] !shadow-none ring-0 outline-none
                transition-all duration-200 cursor-pointer overflow-hidden group/card
                ${compact ? 'p-3 gap-3 min-h-[220px]' : 'p-5 gap-5 min-h-[420px]'}
            `}
        >
            {/* 1. Header Image (Top) - Rounded-2xl with Border */}
            <div className={`w-full overflow-hidden bg-gray-100 relative z-10 border-2 border-black rounded-2xl shadow-inner
                aspect-square
            `}>

                {/* ... existing image logic ... */}
                {typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image')) ? (
                    <img
                        src={icon}
                        alt=""
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-all duration-500 relative z-10"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-6xl', 'opacity-50');
                            if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerText = '🔮';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-50 relative z-10">{icon || '🔮'}</div>
                )}

                {/* Status Badge Overlay - Pill Style */}
                <div className="absolute top-2 left-2 z-20">
                    <span className="bg-[#FFA07A] text-black border-2 border-black px-3 py-1 rounded-full text-[10px] font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase">
                        {status === 'ACTIVE' ? 'Live' : status}
                    </span>
                </div>

                {/* Is New / Featured Badge */}
                {isNew && (
                    <div className="absolute right-2 top-2 z-20">
                        <span className="bg-[#F492B7] text-black border-2 border-black px-3 py-1 rounded-full text-[10px] font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            NEW
                        </span>
                    </div>
                )}
            </div>

            {/* 2. Body Content */}
            <div className="flex-1 flex flex-col gap-3 relative z-10 pointer-events-none">

                {/* Title */}
                <h3 className={`font-black text-black group-hover/card:text-gray-700 transition-colors leading-tight pointer-events-auto line-clamp-2
                    ${compact ? 'text-sm mt-1' : 'text-xl mt-2 tracking-tight'}
                `}>
                    {title}
                </h3>

                {/* Category Badge (Moved Body) */}
                {category && (
                    <div className="flex items-center pointer-events-auto">
                        <span className="bg-gray-100/90 backdrop-blur-sm text-gray-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border-2 border-black/20">
                            {category}
                        </span>
                    </div>
                )}

                {/* Outcomes - SIMPLIFIED */}
                <div className="mt-auto pointer-events-auto w-full space-y-2">
                    {resolved ? (
                        <div className={`flex items-center justify-center gap-2 bg-emerald-500 border-2 border-black rounded-xl
                             ${compact ? 'p-2' : 'p-3'}
                        `}>
                            <span className="text-[10px] uppercase font-black text-white tracking-wider">Winner</span>
                            <span className={`font-black text-white ${compact ? 'text-sm' : 'text-base'}`}>{winningOutcome}</span>
                        </div>
                    ) : isMultiple && options ? (
                        <div className={`flex flex-col gap-1.5 ${compact ? 'max-h-[80px]' : 'max-h-[120px]'} overflow-y-auto`}>
                            {options.map((opt: any, idx: number) => {
                                let optChance = 0;
                                if (options.length === 2) {
                                    optChance = idx === 0 ? (chance || 50) : (100 - (chance || 50));
                                }
                                return (
                                    <div
                                        key={typeof opt === 'string' ? opt : (opt.id || idx)}
                                        className={`flex items-center justify-between bg-white/90 backdrop-blur-sm border-2 border-black rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer ${compact ? 'text-[10px]' : 'text-xs'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/market/${slug}`);
                                        }}
                                    >
                                        <span className="font-bold text-gray-800 truncate">{typeof opt === 'string' ? opt : opt.title}</span>
                                        <span className="font-black text-black ml-2">{optChance > 0 ? `${optChance.toFixed(0)}%` : '--%'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-2.5'}`}>
                            <button
                                onClick={(e) => handleBetClick(e, 'yes')}
                                className={`bg-emerald-500 text-white border-2 border-black rounded-xl font-black flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95
                                    ${compact ? 'py-2 text-xs' : 'py-3 text-sm'}
                                `}
                            >
                                <span className="uppercase mb-0.5">Yes</span>
                                <span className={compact ? 'text-base' : 'text-xl'}>{chance || 50}%</span>
                            </button>
                            <button
                                onClick={(e) => handleBetClick(e, 'no')}
                                className={`bg-red-500 text-white border-2 border-black rounded-xl font-black flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95
                                    ${compact ? 'py-2 text-xs' : 'py-3 text-sm'}
                                `}
                            >
                                <span className="uppercase mb-0.5">No</span>
                                <span className={compact ? 'text-base' : 'text-xl'}>{100 - (chance || 50)}%</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer: SOL Price & X Logo */}
                <div className={`flex items-center justify-between border-t-2 border-black pt-3 mt-3 pointer-events-auto
                    ${compact ? 'text-[10px]' : 'text-xs'}
                `}>
                    {/* SOL Price / Volume */}
                    <div className="flex items-center gap-1.5 bg-black text-white px-2 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">
                        <img src="/solana-logo.png" alt="SOL" className="w-3 h-3 invert" />
                        <span className="font-black tracking-wide">{volume || '0 SOL'}</span>
                    </div>

                    {/* X (Twitter) Share */}
                    <button
                        className="bg-black text-white p-1.5 rounded-lg border-2 border-black hover:bg-[#FF69B4] hover:border-black transition-all hover:shadow-[2px_2px_0px_#000]"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(`https://twitter.com/intent/tweet?text=Check out this market on Djinn!&url=${window.location.origin}/market/${slug}`, '_blank');
                        }}
                    >
                        {/* X Logo SVG */}
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3.5 h-3.5 fill-current">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <QuickBetModal
                isOpen={showBetModal}
                onClose={() => setShowBetModal(false)}
                market={{
                    title: selectedOption ? `${title} — ${selectedOption}` : title,
                    icon,
                    chance: selectedOptionChance,
                    volume,
                    marketPDA,
                    yesTokenMint,
                    noTokenMint,
                    slug
                }}
                outcome={selectedOutcome}
            />
        </motion.div>
    );
});

export default MarketCard;