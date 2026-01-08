'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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

const MarketCard = ({ title, icon, chance, volume, endDate, slug, type, options }: any) => {
    const [isStarred, setIsStarred] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");
    const [showTimer, setShowTimer] = useState(false);

    const isMultiple = type === 'multiple';

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
                    <span className="flex items-center bg-[#F492B7] text-black text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl uppercase tracking-widest">
                        <TrendingUpIcon /> Trending
                    </span>
                </div>
            </div>

            <div className="p-8 flex flex-col flex-grow overflow-hidden">
                <div className="flex justify-between items-start gap-4 mb-4">
                    {/* TÍTULO RECTO (NOT-ITALIC) */}
                    <h3 className="text-2xl font-black text-white leading-[1.1] tracking-tight group-hover:text-[#F492B7] transition-colors flex-1 line-clamp-2 uppercase not-italic">
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
                                        {/* TEXTO RECTO EN OPCIONES */}
                                        <span className="text-sm font-bold text-gray-200 truncate pr-2 flex-1 uppercase not-italic">{opt.name}</span>
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
                            <button className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black text-3xl rounded-[1.8rem] py-10 flex flex-col items-center justify-center transition-all duration-300 shadow-lg uppercase tracking-widest">
                                <span className="text-[11px] font-black uppercase mb-1 opacity-70 tracking-widest">No</span>
                                {100 - (chance || 50)}¢
                            </button>
                            <button className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white font-black text-3xl rounded-[1.8rem] py-10 flex flex-col items-center justify-center transition-all duration-300 shadow-lg uppercase tracking-widest">
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
    );
};

export default MarketCard;