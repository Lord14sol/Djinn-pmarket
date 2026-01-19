'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import QuickBetModal from './QuickBetModal';
import { useWallet } from '@solana/wallet-adapter-react';
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

const MarketCard: React.FC<MarketCardProps> = ({
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
    resolutionSource
}) => {
    const { publicKey } = useWallet();
    const [timeLeft, setTimeLeft] = useState('');
    const [isStarred, setIsStarred] = useState(false);
    const [showBetModal, setShowBetModal] = useState(false);
    const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [selectedOptionChance, setSelectedOptionChance] = useState<number>(0);

    const isMultiple = !!(options && options.length > 0);

    const handleBetClick = (e: React.MouseEvent, outcome: 'yes' | 'no', optionName?: string, optionChance?: number) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedOutcome(outcome);
        if (optionName) setSelectedOption(optionName);
        if (optionChance) setSelectedOptionChance(optionChance);
        else setSelectedOptionChance(chance || 50);
        setShowBetModal(true);
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

    return (
        <div className="bg-[#0A0A0A] rounded-[2rem] border border-white/5 shadow-lg flex flex-row overflow-hidden h-[160px] group hover:border-[#F492B7]/30 transition-all duration-300 relative">

            {/* 1. LEFT: Square Image (Fixed Aspect) */}
            <Link href={`/market/${slug}`} className="h-full aspect-square p-2 flex-shrink-0">
                <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/5 bg-[#111] shadow-inner">
                    {typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image')) ? (
                        <img src={icon} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">{icon || '🔮'}</div>
                    )}
                </div>
            </Link>

            {/* 2. RIGHT: Content */}
            <div className="flex-1 py-4 pr-5 pl-1 flex flex-col min-w-0 relative">

                {/* Header: Title */}
                <div className="flex justify-between items-start gap-2 mb-1">
                    <Link href={`/market/${slug}`} className="text-base font-bold text-white leading-snug hover:text-[#F492B7] transition-colors line-clamp-2">
                        {title}
                    </Link>
                </div>

                {/* Middle: Actions + Saved Button */}
                <div className="flex-1 flex flex-col justify-center my-1 gap-3">
                    {resolved ? (
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg self-start">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Winner</span>
                            <span className={`text-sm font-black ${winningOutcome === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>{winningOutcome}</span>
                        </div>
                    ) : isMultiple && options ? (
                        <div className="flex flex-wrap gap-2">
                            {options.slice(0, 2).map((opt: any) => (
                                <span key={opt.id} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-400 truncate max-w-[80px]">{opt.name}</span>
                            ))}
                            <span className="text-[9px] text-gray-500 self-center">+ more</span>
                        </div>
                    ) : (
                        <div className="flex gap-3 w-full max-w-[240px]">
                            {/* YES Button */}
                            <button
                                onClick={(e) => handleBetClick(e, 'yes')}
                                className="flex-1 bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-xl py-2 flex flex-col items-center justify-center transition-all group/btn"
                            >
                                <span className="text-[10px] font-black uppercase text-emerald-500 group-hover:text-white leading-none mb-1">Yes</span>
                                <span className="text-sm font-black text-emerald-400 group-hover:text-white leading-none">{chance || 50}%</span>
                            </button>

                            {/* NO Button */}
                            <button
                                onClick={(e) => handleBetClick(e, 'no')}
                                className="flex-1 bg-red-500/5 border border-red-500/10 hover:bg-red-500 hover:text-white rounded-xl py-2 flex flex-col items-center justify-center transition-all group/btn"
                            >
                                <span className="text-[10px] font-black uppercase text-red-500 group-hover:text-white leading-none mb-1">No</span>
                                <span className="text-sm font-black text-red-400 group-hover:text-white leading-none">{100 - (chance || 50)}%</span>
                            </button>
                        </div>
                    )}

                    {/* Saved Star Button (Below Actions) */}
                    <div
                        className={`flex items-center gap-1.5 cursor-pointer group/star w-fit px-2 py-1 rounded-lg transition-colors ${isStarred ? 'bg-[#F492B7]/10' : 'hover:bg-white/5'}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsStarred(!isStarred); }}
                    >
                        <Star
                            className={`w-4 h-4 transition-colors duration-300 ${isStarred ? 'fill-[#F492B7] text-[#F492B7]' : 'text-gray-500 group-hover/star:text-gray-300'}`}
                            strokeWidth={isStarred ? 0 : 2}
                        />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isStarred ? 'text-[#F492B7]' : 'text-gray-500 group-hover/star:text-gray-300'}`}>
                            {isStarred ? 'Saved!' : 'Save'}
                        </span>
                    </div>
                </div>

                {/* Footer: Volume + Source Link */}
                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Vol:</span>
                        <span className="text-xs font-bold text-gray-300">{volume}</span>
                    </div>
                    {resolutionSource && resolutionSource !== 'DERIVED' && resolutionSource.startsWith('http') && (
                        <a
                            href={resolutionSource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-[#F492B7] hover:text-white transition-colors flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            📎 Source
                        </a>
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
        </div>
    );
};

export default MarketCard;