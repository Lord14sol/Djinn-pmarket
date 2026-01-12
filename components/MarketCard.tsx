'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import QuickBetModal from './QuickBetModal';
import ClaimButton from './ClaimButton';

// --- HELPER COMPONENTS ---

const StarIcon = ({ active, onClick }: { active: boolean; onClick: (e: React.MouseEvent) => void }) => {
    const [showAnimation, setShowAnimation] = useState(false);
    const [animKey, setAnimKey] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
        if (!active) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setAnimKey(prev => prev + 1);
            setShowAnimation(true);
            timerRef.current = setTimeout(() => { setShowAnimation(false); }, 1800);
        } else {
            setShowAnimation(false);
        }
    };

    useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

    return (
        <div className="relative z-20">
            {showAnimation && <div key={animKey} className="absolute bottom-full left-1/2 mb-1 text-[#F492B7] text-xs font-extrabold animate-saved pointer-events-none whitespace-nowrap filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Saved!</div>}
            <svg onClick={handleClick} xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-90 ${active ? 'text-[#F492B7]' : 'text-gray-500 hover:text-[#F492B7]'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
        </div>
    );
};

const MarketCard = ({
    title, icon, chance, volume, endDate, slug, type, options, isNew = false,
    marketPDA, yesTokenMint, noTokenMint, resolved, winningOutcome, resolutionSource
}: any) => {
    const [isStarred, setIsStarred] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");
    const [showTimer, setShowTimer] = useState(false);
    const [showBetModal, setShowBetModal] = useState(false);
    const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [selectedOptionChance, setSelectedOptionChance] = useState(50);

    const isMultiple = type === 'multiple';

    // Handler for binary markets (YES/NO only)
    const handleBetClick = (e: React.MouseEvent, outcome: 'yes' | 'no') => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedOption(null);
        setSelectedOptionChance(chance || 50);
        setSelectedOutcome(outcome);
        setShowBetModal(true);
    };

    // Handler for multiple option markets (Argentina, Chile, Brasil, etc.)
    const handleMultiBetClick = (e: React.MouseEvent, outcome: 'yes' | 'no', optionName: string, optionChance: number) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedOption(optionName);
        setSelectedOptionChance(optionChance);
        setSelectedOutcome(outcome);
        setShowBetModal(true);
    };

    useEffect(() => {
        if (!endDate) return;
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(endDate).getTime();
            const difference = end - now;
            const threeDaysInMs = 259200000;

            if (difference <= 0) {
                setTimeLeft("Ended");
                setShowTimer(true);
                clearInterval(interval);
            } else if (difference < threeDaysInMs) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
                setShowTimer(true);
            } else {
                setShowTimer(false);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [endDate]);

    return (
        <>
            <div
                className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col transition-all duration-500 ease-out hover:-translate-y-3 hover:bg-white/10 hover:border-[#F492B7]/50 hover:shadow-[0_0_40px_rgba(244,146,183,0.25)] group relative overflow-hidden h-auto min-h-[500px] md:h-[600px] block"
            >
                <Link href={`/market/${slug}`} className="w-full h-48 md:h-64 relative overflow-hidden bg-white/5 block">
                    {typeof icon === 'string' && icon.startsWith('data:image') ? (
                        <img src={icon} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">{icon || '🔮'}</div>
                    )}
                    <div className="absolute top-4 right-4 z-10">
                        {resolved ? (
                            <div className="bg-purple-600 text-white px-3 py-1 rounded-lg font-black text-xs border border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.5)] animate-pulse">
                                RESOLVED: {winningOutcome}
                            </div>
                        ) : isNew ? (
                            /* Badge NEW - Green sprout style */
                            <div className="relative group">
                                {/* Outer glow ring */}
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                                {/* Inner badge */}
                                <div className="relative flex items-center gap-2 bg-black px-3 py-1.5 rounded-lg border border-emerald-500/50">
                                    {/* Sprout icon */}
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 01-1.44-8.765 4.5 4.5 0 018.302-3.046 3.5 3.5 0 014.504 4.272A4 4 0 0115 17H5.5zm3.75-2.75a.75.75 0 001.5 0V9.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0l-3.25 3.5a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                        New
                                    </span>
                                </div>
                            </div>
                        ) : (
                            /* Badge TRENDING - FLOATING FIRE (no container) */
                            <div className="relative w-6 h-7">
                                {/* Radiating glow behind */}
                                <div className="absolute inset-0 bg-gradient-to-t from-orange-500/50 via-amber-400/30 to-transparent rounded-full blur-md fire-glow" />

                                {/* Fire element */}
                                <div className="relative w-full h-full fire-flicker">
                                    {/* Outer flame - red/orange */}
                                    <div className="fire-dance absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-6 rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%] bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400" />

                                    {/* Middle flame - orange */}
                                    <div className="fire-dance-alt absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-5 rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%] bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-300" />

                                    {/* Inner flame - yellow/white hot */}
                                    <div className="fire-dance absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-3.5 rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%] bg-gradient-to-t from-yellow-400 via-yellow-200 to-white" style={{ animationDelay: '0.1s' }} />

                                    {/* Core - white hot */}
                                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_4px_rgba(255,255,255,0.9)]" />

                                    {/* Sparks */}
                                    <div className="fire-spark absolute bottom-5 left-0.5 w-1 h-1 rounded-full bg-yellow-200" />
                                    <div className="fire-spark-2 absolute bottom-6 right-0 w-0.5 h-0.5 rounded-full bg-orange-200" />
                                    <div className="fire-spark-3 absolute bottom-4 left-2.5 w-0.5 h-0.5 rounded-full bg-white" />
                                </div>
                            </div>
                        )}
                    </div>
                </Link>

                <div className="p-8 flex flex-col flex-grow overflow-hidden">
                    <Link href={`/market/${slug}`} className="flex justify-between items-start gap-4 mb-2 group-hover:opacity-80 transition-opacity">
                        <h3 className="text-xl font-bold text-white leading-[1.2] tracking-tight group-hover:text-[#F492B7] transition-colors flex-1 line-clamp-2">
                            {title}
                        </h3>
                        {!isMultiple && (
                            <div className="relative w-16 h-16 flex-shrink-0">
                                <div className="absolute inset-0 rounded-full border-[4px] border-white/5 transition-colors"></div>
                                <div className="absolute inset-0 rounded-full border-[4px] border-transparent border-t-[#F492B7] border-r-[#F492B7]" style={{ transform: `rotate(${45 + (chance * 3.6)}deg)` }}></div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-sm font-black text-white">{chance}%</span>
                                </div>
                            </div>
                        )}
                    </Link>

                    {/* Resolution Source Seal */}
                    {resolutionSource && (
                        <a href={resolutionSource} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 mb-4 group/source w-fit">
                            <svg className="w-3 h-3 text-gray-500 group-hover/source:text-[#F492B7] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-[10px] font-bold text-gray-600 group-hover/source:text-[#F492B7] transition-colors uppercase tracking-widest truncate max-w-[200px]">
                                Verified Source
                            </span>
                        </a>
                    )}

                    <div className="flex-grow overflow-hidden flex flex-col mt-4">
                        {resolved ? (
                            <div className="mt-auto mb-4 flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div className="text-center mb-4">
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Winning Outcome</p>
                                    <p className={`text-4xl font-black ${winningOutcome === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {winningOutcome}
                                    </p>
                                </div>
                                <ClaimButton
                                    marketPda={marketPDA}
                                    yesTokenMint={yesTokenMint}
                                    noTokenMint={noTokenMint}
                                    winningOutcome={winningOutcome}
                                />
                            </div>
                        ) : isMultiple && options ? (
                            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar max-h-[300px]">
                                {options.map((opt: any) => {
                                    const optChance = Math.floor(100 / options.length);
                                    // Use Link to navigate to market page on click
                                    return (
                                        <Link
                                            href={`/market/${slug}`}
                                            key={opt.id}
                                            className="block group/option"
                                        >
                                            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 transition-all duration-300 hover:bg-white/10 hover:border-[#F492B7]/50 hover:shadow-[0_0_20px_rgba(244,146,183,0.15)]">
                                                {/* Option Name */}
                                                <span className="text-sm font-bold text-gray-200 truncate pr-2 flex-1 group-hover/option:text-white transition-colors">{opt.name}</span>

                                                {/* Chance Circle ONLY */}
                                                <div className="relative w-10 h-10 flex-shrink-0 group-hover/option:scale-110 transition-transform">
                                                    <div className="absolute inset-0 rounded-full border-[2px] border-white/5"></div>
                                                    <div className="absolute inset-0 rounded-full border-[2px] border-transparent border-t-[#F492B7] border-r-[#F492B7]" style={{ transform: `rotate(${45 + (optChance * 3.6)}deg)` }}></div>
                                                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">{optChance}%</div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 mt-auto mb-4">
                                <button
                                    onClick={(e) => handleBetClick(e, 'no')}
                                    className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black text-2xl rounded-[1.5rem] py-4 flex flex-col items-center justify-center transition-all duration-300 shadow-lg uppercase tracking-widest min-h-[100px]"
                                >
                                    <span className="text-[10px] font-black uppercase mb-1 opacity-70 tracking-widest">No</span>
                                    {100 - (chance || 50)}¢
                                </button>
                                <button
                                    onClick={(e) => handleBetClick(e, 'yes')}
                                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white font-black text-2xl rounded-[1.5rem] py-4 flex flex-col items-center justify-center transition-all duration-300 shadow-lg uppercase tracking-widest min-h-[100px]"
                                >
                                    <span className="text-[10px] font-black uppercase mb-1 opacity-70 tracking-widest">Yes</span>
                                    {chance || 50}¢
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-5 border-t border-white/10 group-hover:border-[#F492B7]/30 transition-colors mt-4">
                        <div className="flex flex-col">
                            <span className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Global Volume</span>
                            <span className="text-white text-sm font-bold tracking-tight">{volume}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {showTimer && (
                                <span className="text-[#F492B7] font-mono font-bold text-[10px] uppercase tracking-tighter animate-pulse">
                                    {timeLeft}
                                </span>
                            )}
                            <StarIcon active={isStarred} onClick={(e) => { setIsStarred(!isStarred); }} />
                        </div>
                    </div>
                </div>


            </div>

            {/* Quick Bet Modal */}
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
                    noTokenMint
                }}
                outcome={selectedOutcome}
            />
        </>
    );
};

export default MarketCard;