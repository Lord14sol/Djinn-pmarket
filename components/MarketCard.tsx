'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QuickBetModal from './QuickBetModal';
import { useWallet } from '@solana/wallet-adapter-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star } from 'lucide-react';

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
    compact = false
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
            className={`bg-black flex flex-col relative hover:bg-white/[0.02] hover:-translate-y-2 transition-all duration-300 h-full group/card shadow-lg hover:shadow-xl cursor-pointer
                ${compact ? 'p-3 gap-2 min-h-[200px]' : 'p-4 gap-4 min-h-[380px]'}
            `}
        >

            {/* 1. Header Image (Top) - Aspect Ratio Box */}
            <div className={`w-full overflow-hidden bg-[#1C212E]/50 relative z-10 border border-white/5 shadow-2xl rounded-xl
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
            </div>

            {/* 2. Body Content (Bottom) */}
            <div className="flex-1 flex flex-col gap-2 relative z-10 pointer-events-none">

                {/* Title */}
                <h3 className={`font-bold text-gray-100 group-hover/card:text-[#F492B7] transition-colors leading-tight pointer-events-auto line-clamp-2 mt-1
                    ${compact ? 'text-sm' : 'text-lg mt-2'}
                `}>
                    {title}
                </h3>

                {/* Outcomes Information */}
                <div className="mt-auto pointer-events-auto w-full">
                    {resolved ? (
                        <div className={`flex items-center justify-center gap-2 bg-white/5 border border-white/5 rounded-lg
                             ${compact ? 'p-1.5' : 'p-3'}
                        `}>
                            <span className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Winner</span>
                            <span className={`font-black ${winningOutcome === 'YES' ? 'text-emerald-400' : 'text-rose-400'} ${compact ? 'text-sm' : 'text-base'}`}>{winningOutcome}</span>
                        </div>
                    ) : isMultiple && options ? (
                        <div className={`flex flex-col overflow-y-auto pr-1 customize-scrollbar
                            ${compact ? 'gap-1 max-h-[80px]' : 'gap-2 max-h-[140px]'}
                        `}>
                            {options.map((opt: any, idx: number) => {
                                // For multi-outcome, we attempt to show the PROBABILITY if chance is passed as an object
                                // or if we have a simple split for binary with names.
                                let optChance = 0;
                                if (options.length === 2) {
                                    optChance = idx === 0 ? (chance || 50) : (100 - (chance || 50));
                                } else {
                                    // For N outcomes, without full supply data here, we show a distributed view or a dash
                                    // In the future, we could pass an array of chances.
                                    optChance = 0;
                                }

                                return (
                                    <div
                                        key={typeof opt === 'string' ? opt : (opt.id || idx)}
                                        className={`flex items-center justify-between bg-[#111] border border-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all duration-200 shrink-0
                                            ${compact ? 'text-[10px] py-1 px-2' : 'text-[11px] py-2 px-3'}
                                        `}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/market/${slug}`);
                                        }}
                                    >
                                        <span className="text-gray-300 truncate font-bold max-w-[70%]">{typeof opt === 'string' ? opt : opt.title}</span>
                                        <span className="text-[#F492B7] font-black">{optChance > 0 ? `${optChance.toFixed(1)}%` : '--%'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`grid grid-cols-2 ${compact ? 'gap-1.5' : 'gap-3'}`}>
                            <button
                                onClick={(e) => handleBetClick(e, 'yes')}
                                className={`flex flex-col items-center justify-center bg-[#10B981] border border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.4)] rounded-lg group/yes transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                                    ${compact ? 'py-1' : 'py-2'}
                                `}
                            >
                                <span className={`font-black text-white uppercase tracking-wider mb-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>Yes</span>
                                <span className={`font-black text-white ${compact ? 'text-sm' : 'text-lg'}`}>{chance || 50}%</span>
                            </button>
                            <button
                                onClick={(e) => handleBetClick(e, 'no')}
                                className={`flex flex-col items-center justify-center bg-[#EF4444] border border-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.4)] rounded-lg group/no transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                                    ${compact ? 'py-1' : 'py-2'}
                                `}
                            >
                                <span className={`font-black text-white uppercase tracking-wider mb-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>No</span>
                                <span className={`font-black text-white ${compact ? 'text-sm' : 'text-lg'}`}>{100 - (chance || 50)}%</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer: Volume, Time & STAR */}
                <div className={`flex items-center justify-between font-bold text-gray-500 uppercase tracking-wider border-t border-white/5 pointer-events-auto
                    ${compact ? 'text-[9px] pt-2 mt-0.5' : 'text-[11px] pt-3 mt-1'}
                `}>
                    <div className="flex items-center gap-3">
                        <span className="text-white">{volume} Vol</span>
                        {timeLeft && <span className="text-white">{timeLeft}</span>}
                    </div>

                    {/* Star Moved to Bottom - Pink on Active */}
                    <button
                        className="text-gray-600 hover:text-white transition-colors p-1 rounded-full relative group/star"
                        onClick={handleStarClick}
                    >
                        <Star className={`w-5 h-5 transition-all duration-300 ${isStarred ? 'fill-[#F492B7] text-[#F492B7] scale-110' : 'text-gray-600 group-hover/star:text-white'}`} style={{ strokeWidth: isStarred ? 0 : 2 }} />
                        <AnimatePresence>
                            {showSavedAnim && (
                                <motion.span
                                    initial={{ opacity: 0, y: 10, x: -20 }}
                                    animate={{ opacity: 1, y: -25, x: -20 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="absolute top-0 right-0 text-[#F492B7] font-black text-[10px] uppercase tracking-wide whitespace-nowrap pointer-events-none"
                                >
                                    Saved!
                                </motion.span>
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