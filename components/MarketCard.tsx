'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// --- ICONOS ---
const TrendingUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
);

// --- COMPONENTE ESTRELLA ---
const StarIcon = ({ active, onClick }: { active: boolean; onClick: (e: React.MouseEvent) => void }) => {
    const [showAnimation, setShowAnimation] = useState(false);
    const [animKey, setAnimKey] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Evita que el Link se active
        e.stopPropagation(); // Evita que el evento suba al contenedor
        onClick(e);

        if (!active) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setAnimKey(prev => prev + 1);
            setShowAnimation(true);
            timerRef.current = setTimeout(() => {
                setShowAnimation(false);
            }, 1800);
        } else {
            setShowAnimation(false);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <div className="relative z-20">
            <style jsx>{`
                @keyframes floatNatural {
                    0% { opacity: 0; transform: translateY(5px) translateX(-50%); }
                    20% { opacity: 1; transform: translateY(0px) translateX(-50%); }
                    100% { opacity: 0; transform: translateY(-30px) translateX(-50%); }
                }
                .animate-saved {
                    animation: floatNatural 1.8s ease-out forwards;
                }
            `}</style>

            {showAnimation && (
                <div key={animKey} className="absolute bottom-full left-1/2 mb-1 text-[#F492B7] text-xs font-extrabold animate-saved pointer-events-none whitespace-nowrap filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    Saved!
                </div>
            )}

            <svg
                onClick={handleClick}
                xmlns="http://www.w3.org/2000/svg"
                fill={active ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-6 h-6 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-90 ${active ? 'text-[#F492B7]' : 'text-gray-500 hover:text-[#F492B7]'}`}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
        </div>
    );
};

// --- PROPS ---
interface MarketCardProps {
    title: string;
    icon: string;
    chance: number;
    volume: string;
    endDate?: Date;
    slug: string; // ← NUEVO: Para el routing
}

// --- COMPONENTE PRINCIPAL ---
const MarketCard = ({ title, icon, chance, volume, endDate, slug }: MarketCardProps) => {
    const [isStarred, setIsStarred] = useState(false);
    const yesPrice = chance;
    const noPrice = 100 - chance;
    const [timeLeft, setTimeLeft] = useState("");
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        if (!endDate) return;
        const interval = setInterval(() => {
            const now = new Date();
            const difference = endDate.getTime() - now.getTime();
            const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

            if (difference <= 0) {
                setTimeLeft("Ended");
                setIsUrgent(false);
                clearInterval(interval);
            } else {
                setIsUrgent(difference < threeDaysInMs);
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                setTimeLeft(`${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [endDate]);

    return (
        // TODO EL CARD ES UN LINK AHORA
        <Link
            href={`/market/${slug}`}
            className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-[0_4px_24px_rgba(244,146,183,0.15)] flex flex-col gap-5 cursor-pointer transition-all duration-500 ease-out hover:-translate-y-3 hover:bg-white/10 hover:shadow-[0_20px_60px_rgba(244,146,183,0.3)] group relative overflow-visible h-full block"
        >
            {/* Header */}
            <div className="flex justify-end items-center h-6">
                <span className="flex items-center bg-[#F492B7] text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(244,146,183,0.3)]">
                    <TrendingUpIcon />
                    Trending
                </span>
            </div>

            {/* Cuerpo */}
            <div className="flex justify-between items-start gap-3 flex-1">
                <div className="flex flex-col gap-3 max-w-[70%]">
                    <div className="text-4xl filter drop-shadow-lg">{icon}</div>
                    <h3 className="text-xl font-bold text-white leading-tight group-hover:text-[#F492B7] transition-colors">
                        {title}
                    </h3>
                </div>

                {/* Gráfico */}
                <div className="relative w-20 h-20 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full border-[5px] border-white/5 group-hover:border-white/10 transition-colors"></div>
                    <div
                        className="absolute inset-0 rounded-full border-[5px] border-transparent border-t-[#F492B7] border-r-[#F492B7]"
                        style={{ transform: `rotate(${45 + (chance * 3.6)}deg)` }}
                    ></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-white">{chance}%</span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">chance</span>
                    </div>
                </div>
            </div>

            {/* Botones */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                    onClick={(e) => {
                        e.preventDefault(); // Evita navegación del Link
                        e.stopPropagation();
                        alert(`Betting NO on: ${title}`);
                    }}
                    className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-[#ff4d4d] hover:text-white hover:border-transparent hover:shadow-[0_0_25px_rgba(255,77,77,0.4)] font-black text-3xl rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-200 active:scale-95 group/btn-no"
                >
                    <span className="text-sm font-bold mb-1 opacity-80 text-red-400 group-hover/btn-no:text-white/90">No</span>
                    {noPrice}¢
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault(); // Evita navegación del Link
                        e.stopPropagation();
                        alert(`Betting YES on: ${title}`);
                    }}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-[#00C800] hover:text-white hover:border-transparent hover:shadow-[0_0_25px_rgba(0,200,0,0.4)] font-black text-3xl rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-200 active:scale-95 group/btn-yes"
                >
                    <span className="text-sm font-bold mb-1 opacity-80 text-emerald-400 group-hover/btn-yes:text-white/90">Yes</span>
                    {yesPrice}¢
                </button>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-white/5 h-10 mt-auto group-hover:border-white/10 transition-colors">
                <span className="text-gray-400 text-sm font-medium">{volume} Vol</span>
                <div className="flex items-center gap-3">
                    {isUrgent && <span className="text-[#ff4d4d] font-mono font-bold text-xs tracking-tight">{timeLeft}</span>}
                    <StarIcon active={isStarred} onClick={(e) => { setIsStarred(!isStarred); }} />
                </div>
            </div>
        </Link>
    );
};

export default MarketCard;