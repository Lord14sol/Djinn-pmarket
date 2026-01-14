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
                    {typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image')) ? (
                        <div className="w-full h-full bg-black/40 flex items-center justify-center p-4">
                            <img src={icon} alt="" className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">{icon || '🔮'}</div>
                    )}
                    <div className="absolute top-0 right-0 z-20">
                        {resolved ? (
                            <div className="bg-purple-600 text-white px-6 py-2 rounded-bl-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2">
                                <span>Resolved</span>
                            </div>
                        ) : isNew ? (
                            /* Corner Label NEW - Green */
                            <div className="bg-emerald-500 text-black px-6 py-2 rounded-bl-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2">
                                <span>New 🌱</span>
                            </div>
                        ) : (
                            /* Corner Label TRENDING - Orange/Red */
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-bl-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2">
                                <span>Hot 🔥</span>
                            </div>
                        )}
                    </div>
                </Link>

                <div className="p-8 pb-10 flex flex-col flex-grow">
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

                    <div className="flex-grow flex flex-col mt-4">
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
                            <div className="grid grid-cols-2 gap-3 mt-auto mb-6 pb-2">
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

                    {/* Bonding Curve - Sleek Footer Style */}
                    {!resolved && (
                        <div className="mt-4 pt-3 border-t border-white/5">
                            {/* Logic: Parse volume to determine curve progress */}
                            {(() => {
                                const cleanVol = String(volume || '0').replace(/[$,]/g, '');
                                let percent = 0;
                                if (cleanVol.includes('M')) percent = Math.min(98, 40 + parseFloat(cleanVol) * 5);
                                else if (cleanVol.includes('K')) percent = Math.min(40, 5 + parseFloat(cleanVol) / 10);
                                else if (parseFloat(cleanVol) > 0) percent = 5;

                                // Mock random variance for visual interest if no real bonding curve data properly passed yet
                                if (percent === 0 && volume !== '$0' && volume !== '0') {
                                    // Use deterministic pseudo-random based on string length to avoid hydration mismatch
                                    percent = 10 + (slug?.length || 0) % 40;
                                }

                                const isActive = percent > 0;

                                return (
                                    <div className="flex items-center gap-3 group/curve">
                                        <div className="flex-1 relative">
                                            {/* Background Track w/ Inner Shadow */}
                                            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner group-hover/curve:border-white/20 transition-colors">
                                                {isActive ? (
                                                    <div
                                                        className="h-full bg-gradient-to-r from-[#F492B7] via-purple-500 to-purple-600 rounded-full relative shadow-[0_0_15px_rgba(244,146,183,0.5)] group-hover/curve:shadow-[0_0_20px_rgba(244,146,183,0.7)] transition-all duration-1000 ease-out"
                                                        style={{ width: `${percent}%` }}
                                                    >
                                                        {/* Animated Stripes Background */}
                                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:12px_12px] animate-[slide_1s_linear_infinite] opacity-30"></div>

                                                        {/* Shimmer overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>

                                                        {/* End glowing sparkle */}
                                                        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)] animate-pulse">
                                                            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-50"></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center opacity-30">
                                                        <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.1)_6px,rgba(255,255,255,0.1)_12px)]"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Percentage Label */}
                                        <div className="flex flex-col items-end min-w-[40px]">
                                            <span className={`text-[11px] font-mono font-black tabular-nums ${isActive ? 'text-[#F492B7] drop-shadow-[0_0_8px_rgba(244,146,183,0.5)]' : 'text-gray-600'}`}>
                                                {isActive ? `${Math.round(percent)}%` : '0%'}
                                            </span>
                                            <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider scale-75 origin-right">
                                                {isActive ? 'Bonding' : 'Empty'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
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
                    yesTokenMint,
                    noTokenMint,
                    slug
                }}
                outcome={selectedOutcome}
            />
        </>
    );
};

export default MarketCard;