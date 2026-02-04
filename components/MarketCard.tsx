'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QuickBetModal from './QuickBetModal';
import { useWallet } from '@solana/wallet-adapter-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { MarketStatusBadge } from './MarketStatusBadge';

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
        setSelectedOutcome(outcome);
        if (optionName) setSelectedOption(optionName);
        if (optionChance) setSelectedOptionChance(optionChance);
        else setSelectedOptionChance(chance || 50);
        setShowBetModal(true);
    };

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
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
        if (!isStarred) {
            setShowSavedAnim(true);
            setTimeout(() => setShowSavedAnim(false), 1000);
        }
    };

    return (
        <div
            onClick={handleNavigate}
            style={{ borderColor: 'black' }}
            className={`
                bg-white border-2 !border-black rounded-3xl relative flex flex-col 
                hover:-translate-y-1 hover:!shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] !shadow-none ring-0 outline-none
                transition-all duration-200 cursor-pointer overflow-visible group/card
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
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-all duration-500"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-6xl', 'opacity-50');
                            if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerText = '🔮';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-50">{icon || '🔮'}</div>
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

                {/* Category Tag */}
                {category && (
                    <span className="pointer-events-auto w-fit bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-black/10">
                        {category}
                    </span>
                )}

                {/* Outcomes Information */}
                <div className="mt-auto pointer-events-auto w-full">
                    {resolved ? (
                        <div className={`flex items-center justify-center gap-2 bg-gray-100 border-2 border-black rounded-xl
                             ${compact ? 'p-2' : 'p-3'}
                        `}>
                            <span className="text-[10px] uppercase font-black text-gray-600 tracking-[0.2em]">Winner</span>
                            <span className={`font-black text-black ${compact ? 'text-sm' : 'text-base'}`}>{winningOutcome}</span>
                        </div>
                    ) : isMultiple && options ? (
                        <div className={`flex flex-col overflow-y-auto pr-1 customize-scrollbar
                            ${compact ? 'gap-1.5 max-h-[80px]' : 'gap-2 max-h-[140px]'}
                        `}>
                            {options.map((opt: any, idx: number) => {
                                let optChance = 0; // Logic placeholder
                                if (options.length === 2) {
                                    optChance = idx === 0 ? (chance || 50) : (100 - (chance || 50));
                                }

                                return (
                                    <div
                                        key={typeof opt === 'string' ? opt : (opt.id || idx)}
                                        className={`flex items-center justify-between bg-white border-2 border-black rounded-full cursor-pointer transition-all duration-200 shrink-0 group/opt hover:bg-gray-50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                                            ${compact ? 'text-[10px] py-1.5 px-3' : 'text-xs py-2 px-4'}
                                        `}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/market/${slug}`);
                                        }}
                                    >
                                        <span className="text-gray-800 group-hover/opt:text-black truncate font-bold max-w-[70%]">{typeof opt === 'string' ? opt : opt.title}</span>
                                        <span className="text-black font-black">{optChance > 0 ? `${optChance.toFixed(1)}%` : '--%'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
                            <button
                                onClick={(e) => handleBetClick(e, 'yes')}
                                className={`flex flex-col items-center justify-center bg-emerald-400 text-black border-2 border-black hover:brightness-110 rounded-2xl group/yes transition-all duration-200 active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                                    ${compact ? 'py-1.5' : 'py-3'}
                                `}
                            >
                                <span className={`font-black uppercase tracking-wider mb-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>Yes</span>
                                <span className={`font-black ${compact ? 'text-sm' : 'text-xl'}`}>{chance || 50}%</span>
                            </button>
                            <button
                                onClick={(e) => handleBetClick(e, 'no')}
                                className={`flex flex-col items-center justify-center bg-rose-400 text-black border-2 border-black hover:brightness-110 rounded-2xl group/no transition-all duration-200 active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                                    ${compact ? 'py-1.5' : 'py-3'}
                                `}
                            >
                                <span className={`font-black uppercase tracking-wider mb-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>No</span>
                                <span className={`font-black ${compact ? 'text-sm' : 'text-xl'}`}>{100 - (chance || 50)}%</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer: Volume, Time & STAR */}
                <div className={`flex items-center justify-between font-bold uppercase tracking-wider border-t-2 border-black pointer-events-auto
                    ${compact ? 'text-[9px] pt-2 mt-auto' : 'text-[11px] pt-4 mt-auto'}
                `}>
                    <div className="flex items-center gap-3">
                        <span className="bg-white text-black px-2 py-1 rounded-md border-2 border-black">{volume} Vol</span>
                        {timeLeft && <span className="text-black bg-white px-2 py-1 rounded-md border-2 border-black">{timeLeft}</span>}
                    </div>

                    {/* Star - Circle Button */}
                    <button
                        className="bg-gray-100 border border-black/10 hover:border-black hover:text-black transition-colors w-8 h-8 flex items-center justify-center rounded-full relative group/star"
                        onClick={handleStarClick}
                    >
                        <Star className={`w-4 h-4 transition-all duration-300 ${isStarred ? 'fill-[#F492B7] text-[#F492B7] scale-110' : 'text-gray-400 group-hover/star:text-black'}`} style={{ strokeWidth: isStarred ? 0 : 2 }} />
                        <AnimatePresence>
                            {showSavedAnim && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute -top-1 -right-1 block w-2.5 h-2.5 bg-[#F492B7] rounded-full border border-black"
                                />
                            )}
                        </AnimatePresence>
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
        </div>
    );
});

export default MarketCard;