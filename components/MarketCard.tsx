'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import QuickBetModal from './QuickBetModal';

// --- ICONOS ORIGINALES (RESTAURADOS) ---
const TrendingUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
);

const StarIcon = ({ active, onClick }: { active: boolean; onClick: (e: React.MouseEvent) => void }) => {
    const [showAnimation, setShowAnimation] = useState(false);
    const [animKey, setAnimKey] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation(); onClick(e);
        if (!active) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setAnimKey(prev => prev + 1); setShowAnimation(true);
            timerRef.current = setTimeout(() => { setShowAnimation(false); }, 1800);
        } else { setShowAnimation(false); }
    };

    useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

    return (
        <div className="relative z-20">
            <style jsx>{`
                @keyframes floatNatural { 0% { opacity: 0; transform: translateY(5px) translateX(-50%); } 20% { opacity: 1; transform: translateY(0px) translateX(-50%); } 100% { opacity: 0; transform: translateY(-30px) translateX(-50%); } }
                .animate-saved { animation: floatNatural 1.8s ease-out forwards; }
            `}</style>
            {showAnimation && <div key={animKey} className="absolute bottom-full left-1/2 mb-1 text-[#F492B7] text-xs font-extrabold animate-saved pointer-events-none whitespace-nowrap filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Saved!</div>}
            <svg onClick={handleClick} xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-90 ${active ? 'text-[#F492B7]' : 'text-gray-500 hover:text-[#F492B7]'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
        </div>
    );
};

const MarketCard = ({ title, icon, chance, volume, endDate, slug, type, options, isNew = false, marketPDA, yesTokenMint, noTokenMint }: any) => {
    const [isStarred, setIsStarred] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");
    const [showTimer, setShowTimer] = useState(false);
    const [showBetModal, setShowBetModal] = useState(false);
    const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');

    const isMultiple = type === 'multiple';

    const handleBetClick = (e: React.MouseEvent, outcome: 'yes' | 'no') => {
        e.preventDefault();
        e.stopPropagation();
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
            <Link
                href={`/market/${slug}`}
                className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col cursor-pointer transition-all duration-500 ease-out hover:-translate-y-3 hover:bg-white/10 hover:border-[#F492B7]/50 hover:shadow-[0_0_40px_rgba(244,146,183,0.25)] group relative overflow-hidden h-[600px] block"
            >
                <div className="w-full h-44 relative overflow-hidden bg-white/5">
                    {typeof icon === 'string' && icon.startsWith('data:image') ? (
                        <img src={icon} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">{icon || '🔮'}</div>
                    )}
                    <div className="absolute top-4 right-4 z-10">
                        {isNew ? (
                            /* Badge NEW con glow verde vibrante */
                            <div className="relative">
                                <div className="absolute -inset-1 bg-emerald-500 rounded-full blur-md opacity-60 animate-pulse"></div>
                                <span className="relative flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                    NEW
                                </span>
                            </div>
                        ) : (
                            /* Badge TRENDING con chispas rosadas */
                            <div className="relative">
                                {/* Chispas animadas alrededor */}
                                <span className="absolute -top-2 -right-2 text-[10px] text-[#F492B7] animate-ping drop-shadow-[0_0_4px_#F492B7]">✦</span>
                                <span className="absolute -bottom-2 -left-2 text-[10px] text-[#F492B7] animate-ping drop-shadow-[0_0_4px_#F492B7]" style={{ animationDelay: '0.5s' }}>✦</span>
                                <span className="absolute -top-1 left-0 text-[8px] text-[#F492B7] animate-pulse drop-shadow-[0_0_3px_#F492B7]">✦</span>
                                <span className="absolute -bottom-1 right-0 text-[8px] text-[#F492B7] animate-pulse drop-shadow-[0_0_3px_#F492B7]" style={{ animationDelay: '0.3s' }}>✦</span>
                                <span className="absolute top-1/2 -translate-y-1/2 -left-3 text-[8px] text-[#F492B7] animate-bounce drop-shadow-[0_0_4px_#F492B7]" style={{ animationDelay: '0.2s' }}>✦</span>
                                <span className="absolute top-1/2 -translate-y-1/2 -right-3 text-[8px] text-[#F492B7] animate-bounce drop-shadow-[0_0_4px_#F492B7]" style={{ animationDelay: '0.7s' }}>✦</span>
                                {/* Glow pulsante detrás */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-[#F492B7] to-[#ff6fb7] rounded-full blur-md opacity-60 animate-pulse"></div>
                                {/* Badge principal */}
                                <span className="relative flex items-center gap-1 bg-gradient-to-r from-[#F492B7] to-[#ff6fb7] text-black text-[10px] font-black px-3 py-1.5 rounded-full shadow-[0_0_25px_rgba(244,146,183,0.6)] uppercase tracking-wider">
                                    <TrendingUpIcon /> Trending
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 flex flex-col flex-grow overflow-hidden">
                    <div className="flex justify-between items-start gap-4 mb-4">
                        {/* TÍTULO */}
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
                    </div>

                    <div className="flex-grow overflow-hidden flex flex-col mt-4">
                        {isMultiple && options ? (
                            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar max-h-[300px]">
                                {options.map((opt: any) => {
                                    const optChance = Math.floor(100 / options.length);
                                    return (
                                        <div key={opt.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                            {/* TEXTO EN OPCIONES */}
                                            <span className="text-sm font-bold text-gray-200 truncate pr-2 flex-1">{opt.name}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 flex-shrink-0">
                                                    <div className="absolute inset-0 rounded-full border-[2px] border-white/5"></div>
                                                    <div className="absolute inset-0 rounded-full border-[2px] border-transparent border-t-[#F492B7] border-r-[#F492B7]" style={{ transform: `rotate(${45 + (optChance * 3.6)}deg)` }}></div>
                                                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">{optChance}%</div>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <button className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all uppercase">Yes</button>
                                                    <button className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black hover:bg-red-500 hover:text-white transition-all uppercase">No</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 mt-auto mb-4">
                                <button
                                    onClick={(e) => handleBetClick(e, 'no')}
                                    className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black text-3xl rounded-[1.8rem] py-10 flex flex-col items-center justify-center transition-all duration-300 shadow-lg uppercase tracking-widest"
                                >
                                    <span className="text-[11px] font-black uppercase mb-1 opacity-70 tracking-widest">No</span>
                                    {100 - (chance || 50)}¢
                                </button>
                                <button
                                    onClick={(e) => handleBetClick(e, 'yes')}
                                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white font-black text-3xl rounded-[1.8rem] py-10 flex flex-col items-center justify-center transition-all duration-300 shadow-lg uppercase tracking-widest"
                                >
                                    <span className="text-[11px] font-black uppercase mb-1 opacity-70 tracking-widest">Yes</span>
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

                <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(244, 146, 183, 0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(244, 146, 183, 0.5); }
            `}</style>
            </Link>

            {/* Quick Bet Modal */}
            <QuickBetModal
                isOpen={showBetModal}
                onClose={() => setShowBetModal(false)}
                market={{
                    title,
                    icon,
                    chance,
                    volume,
                    marketPDA,
                    yesTokenMint,
                    noTokenMint
                }}
                outcome={selectedOutcome}
            />
        </>;
};

export default MarketCard;