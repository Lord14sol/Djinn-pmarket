'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QuickBetModal from './QuickBetModal';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
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
    compact?: boolean;
}

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
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState('');
    const [showBetModal, setShowBetModal] = useState(false);
    const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [selectedOptionChance, setSelectedOptionChance] = useState<number>(0);

    const isMultiple = !!(options && options.length > 2);
    const safeChance = Math.max(1, Math.min(99, chance || 50));
    const leaning = safeChance >= 50 ? 'yes' : 'no';

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
        const calculateTimeLeft = () => {
            const end = new Date(endDate).getTime();
            const now = new Date().getTime();
            const diff = end - now;
            if (diff <= 0) return 'ended';

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            if (days > 0) return `${days}d ${hours}h`;
            return `${hours}h left`;
        };
        setTimeLeft(calculateTimeLeft());
    }, [endDate]);

    return (
        <motion.div
            onClick={handleNavigate}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.99 }}
            className={`
                bg-white border-2 border-black rounded-2xl relative flex flex-col
                shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
                transition-all duration-200 cursor-pointer overflow-hidden group/card
                ${compact ? 'p-3 gap-2 min-h-[220px]' : 'p-4 gap-3 min-h-[380px]'}
            `}
        >
            {/* Image */}
            <div className="w-full overflow-hidden bg-gray-50 relative border-2 border-black rounded-xl aspect-[4/3]">
                {typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image')) ? (
                    <img
                        src={icon}
                        alt=""
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-5xl');
                            if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerText = '🔮';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-50">{icon || '🔮'}</div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className="bg-black text-white px-2 py-0.5 rounded-md text-[9px] font-bold lowercase">
                        {timeLeft}
                    </span>
                </div>
                {isNew && (
                    <div className="absolute right-2 top-2">
                        <span className="bg-[#F492B7] text-black border border-black px-2 py-0.5 rounded-md text-[9px] font-bold">
                            new
                        </span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col gap-2 relative">
                {/* Title */}
                <h3 className={`font-bold text-black leading-tight line-clamp-2
                    ${compact ? 'text-sm' : 'text-base'}
                `}>
                    {title}
                </h3>

                {/* Category */}
                {category && (
                    <span className="text-[10px] font-medium text-gray-400 lowercase tracking-wide">
                        {category.toLowerCase()}
                    </span>
                )}

                {/* Outcomes Section */}
                <div className="mt-auto w-full space-y-3 pointer-events-auto">
                    {resolved ? (
                        <div className="flex items-center justify-center gap-2 bg-emerald-500 border-2 border-black rounded-xl p-3">
                            <span className="text-[10px] uppercase font-black text-white tracking-wider">winner</span>
                            <span className="font-black text-white text-sm">{winningOutcome}</span>
                        </div>
                    ) : isMultiple && options ? (

                        <div className="flex flex-col gap-2 mt-1">
                            {options.slice(0, 4).map((opt: any, idx: number) => {
                                const colors = [
                                    { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', light: 'bg-blue-50' },
                                    { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', light: 'bg-purple-50' },
                                    { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500', light: 'bg-pink-50' },
                                    { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', light: 'bg-orange-50' },
                                    { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', light: 'bg-cyan-50' },
                                ];
                                const theme = colors[idx % colors.length];
                                const optChance = opt.chance || 0;
                                const customColor = opt.color; // Support custom color from DB
                                const barColor = customColor || theme.bg.replace('bg-', ''); // simple hack or just use inline style
                                const textColor = customColor ? `text-[${customColor}]` : theme.text;
                                const lightColor = customColor ? `bg-[${customColor}]/10` : theme.light;

                                return (
                                    <div
                                        key={typeof opt === 'string' ? opt : (opt.id || idx)}
                                        className="relative w-full h-9 rounded-lg overflow-hidden bg-gray-50 border border-black/10 hover:border-black/30 transition-all cursor-pointer group/option"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Handle betting on this specific option logic here if needed, 
                                            // or just navigate to market page
                                            router.push(`/market/${slug}`);
                                        }}
                                    >
                                        {/* Progress Bar Background */}
                                        <div
                                            className={`absolute top-0 left-0 h-full opacity-30 transition-all duration-500`}
                                            style={{
                                                width: `${optChance}%`,
                                                backgroundColor: customColor || undefined
                                            }}
                                        />
                                        {!customColor && (
                                            <div className={`absolute top-0 left-0 h-full ${theme.light} opacity-50 w-full`} style={{ width: `${optChance}%` }} />
                                        )}

                                        {/* Content */}
                                        <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                                            <span className="font-bold text-xs text-gray-800 truncate pr-2">
                                                {typeof opt === 'string' ? opt : opt.title}
                                            </span>
                                            <span
                                                className="font-black text-xs"
                                                style={{ color: customColor || undefined }}
                                            >
                                                <span className={!customColor ? theme.text : ''}>
                                                    {optChance > 0 ? `${optChance.toFixed(0)}%` : '--%'}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {options.length > 4 && (
                                <div className="text-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        + {options.length - 4} more options
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Probability Label */}
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${leaning === 'yes' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {leaning === 'yes' ? 'yes' : 'no'} {safeChance >= 50 ? safeChance : 100 - safeChance}%
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">{volume}</span>
                            </div>

                            {/* Probability Bar */}
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-black/10 relative">
                                <div
                                    className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500 ease-out rounded-l-full"
                                    style={{ width: `${safeChance}%` }}
                                />
                                <div
                                    className="absolute inset-y-0 right-0 bg-red-400 transition-all duration-500 ease-out rounded-r-full"
                                    style={{ width: `${100 - safeChance}%` }}
                                />
                            </div>

                            {/* Yes/No or Up/Down Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                {category?.toLowerCase() === 'crypto' ? (
                                    <>
                                        <button
                                            onClick={(e) => handleBetClick(e, 'yes')}
                                            className="bg-emerald-500 text-white border-2 border-black rounded-xl font-bold py-2.5 text-xs transition-all hover:brightness-110 active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none flex items-center justify-center gap-1.5"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                                                <path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
                                            </svg>
                                            <span>up</span>
                                        </button>
                                        <button
                                            onClick={(e) => handleBetClick(e, 'no')}
                                            className="bg-red-500 text-white border-2 border-black rounded-xl font-bold py-2.5 text-xs transition-all hover:brightness-110 active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none flex items-center justify-center gap-1.5"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                                                <path d="M6 10L2 5H10L6 10Z" fill="currentColor" />
                                            </svg>
                                            <span>down</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={(e) => handleBetClick(e, 'yes')}
                                            className="bg-emerald-500 text-white border-2 border-black rounded-xl font-bold py-2.5 text-xs transition-all hover:brightness-110 active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none flex items-center justify-center gap-1.5"
                                        >
                                            <span>yes</span>
                                        </button>
                                        <button
                                            onClick={(e) => handleBetClick(e, 'no')}
                                            className="bg-red-500 text-white border-2 border-black rounded-xl font-bold py-2.5 text-xs transition-all hover:brightness-110 active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none flex items-center justify-center gap-1.5"
                                        >
                                            <span>no</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
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
