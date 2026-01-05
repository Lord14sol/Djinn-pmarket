'use client';
import React, { useState, useEffect } from 'react';

interface Outcome {
    label: string;
    percentage: number;
    price: number;
}

interface MarketCardProps {
    type: 'binary' | 'multi' | 'date';
    category?: string;
    title: string;
    volume: number;
    outcomes: Outcome[];
    image?: string;
    isTrending?: boolean;
    createdBy?: string;
    timeLeft?: string;
    isClosingSoon?: boolean;
    resolutionType?: 'Daily' | 'Annually' | 'Custom';
}

// Aladdin Genie Lamp SVG Icon
const GenieLampIcon = () => (
    <svg
        viewBox="0 0 512 512"
        fill="currentColor"
        className="w-5 h-5"
    >
        <path d="M142.9 142.9c-17.5 17.5-30.1 38-37.8 59.8c-5.9 16.7-24.2 25.4-40.8 19.5s-25.4-24.2-19.5-40.8C55.6 150.7 73.2 122 97.6 97.6c87.2-87.2 228.3-87.5 315.8-1L455 55c6.9-6.9 16.3-10.9 26.1-11.1L503 43.8c11.5-.2 22.5 4.6 30.6 13.2s14.4 20.3 13.2 31.8l-.1 21.9c-.2 9.8-4.3 19.2-11.2 26.1l-41.7 41.7C410.5 316 223.5 316 142.9 142.9zM64 501.9c-.1 5.3 .6 10.6 2.2 15.7c-7.2-2.9-14-7.1-20-12.8s-10.5-13-13.4-20.6c1.8 .2 3.7 .3 5.5 .3c8.7 .1 17.5-.8 26.4-2.6c0 6.6-.3 13.2-1 19.8zM32 448c0 17.7 14.3 32 32 32c0 24.6 5.5 47.8 15.4 68.6c2.2 4.6 4.6 9.1 7.1 13.4c-1.6-.9-3.2-1.9-4.7-2.9c-5-3.6-9.7-7.6-14-11.9c-12.9-12.9-23.6-28.2-31.4-45.1c-7.8-17-11.9-35.5-11.9-54.6c0-3.2 .1-6.4 .3-9.6c0-.4 .1-.8 .1-1.2c.1-2.2 .3-4.4 .6-6.6zM306 186.9l44.2 44.2c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6l-44.2-44.2c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6zm-44.2 67.3c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0l-44.2 44.2c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0l44.2-44.2z" />
    </svg>
);

export default function MarketCard({
    type,
    category,
    title,
    volume,
    outcomes,
    image,
    isTrending = false,
    createdBy = "Djinn",
    timeLeft,
    isClosingSoon = false,
    resolutionType
}: MarketCardProps) {
    const [isSaved, setIsSaved] = useState(false);
    const [showPotentialWin, setShowPotentialWin] = useState(false);
    const [showSavedToast, setShowSavedToast] = useState(false);

    const mainPercentage = type === 'binary'
        ? (outcomes && outcomes.length > 0 ? Math.max(...outcomes.map(o => o.percentage)) : 0)
        : (outcomes && outcomes.length > 0 ? outcomes[0].percentage : 0);

    // Handle save with toast notification
    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsSaved(!isSaved);
        setShowSavedToast(true);
    };

    // Auto-hide toast after animation
    useEffect(() => {
        if (showSavedToast) {
            const timer = setTimeout(() => {
                setShowSavedToast(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [showSavedToast]);

    return (
        <div className="relative border border-gray-800 bg-gray-900 rounded-xl overflow-visible hover:border-yellow-500 transition-all cursor-pointer group">

            {/* "Saved!" Toast */}
            {showSavedToast && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 text-sm font-bold animate-slide-up-fade pointer-events-none z-50">
                    Saved!
                </div>
            )}

            {/* Top Section */}
            <div className="relative p-6 pb-4">

                {/* Trending Badge */}
                {isTrending && (
                    <div className="absolute top-4 right-4 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 z-10">
                        <span>📈</span> Trending
                    </div>
                )}

                {/* Category + Timer Row */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-blue-400 text-xs font-bold uppercase tracking-wider bg-blue-400/10 px-2 py-1 rounded">
                        {category || "General"}
                    </span>

                    {timeLeft && (
                        <span className={`text-xs font-mono font-bold ${isClosingSoon ? 'text-red-500' : 'text-gray-400'}`}>
                            {timeLeft}
                        </span>
                    )}

                    {resolutionType && !timeLeft && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            🔄 {resolutionType}
                        </span>
                    )}
                </div>

                {/* Title + Image/Percentage Circle */}
                <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors flex-1">
                        {title}
                    </h2>

                    {image ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                            <img src={image} alt={title} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="relative w-16 h-16 flex-shrink-0">
                            <svg className="w-16 h-16 transform -rotate-90">
                                <circle cx="32" cy="32" r="28" stroke="#374151" strokeWidth="6" fill="none" />
                                <circle
                                    cx="32" cy="32" r="28"
                                    stroke="#F59E0B"
                                    strokeWidth="6"
                                    fill="none"
                                    strokeDasharray={`${(mainPercentage / 100) * 175.93} 175.93`}
                                    className="transition-all duration-500"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-bold text-white">{mainPercentage}%</span>
                                <span className="text-[10px] text-gray-400">chance</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Outcomes Section */}
            <div className="px-6 pb-6">
                {type === 'binary' && outcomes.length === 2 && (
                    <div className="grid grid-cols-2 gap-3">
                        {outcomes.map((outcome, idx) => (
                            <button
                                key={idx}
                                className={`${outcome.label.toLowerCase() === 'no'
                                    ? 'bg-pink-500 hover:bg-pink-600'
                                    : 'bg-green-500 hover:bg-green-600'
                                    } text-white rounded-lg py-4 transition-all flex flex-col items-center justify-center`}
                            >
                                <span className="text-sm font-medium mb-1">{outcome.label}</span>
                                <span className="text-2xl font-bold">{outcome.price}¢</span>
                            </button>
                        ))}
                    </div>
                )}

                {type === 'multi' && (
                    <div className="space-y-2">
                        {outcomes.map((outcome, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-3 transition-all cursor-pointer">
                                <span className="text-sm font-medium text-white">{outcome.label}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-white">{outcome.percentage}%</span>
                                    <div className="flex gap-2">
                                        <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded">Yes</button>
                                        <button className="bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1 rounded">No</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {type === 'date' && (
                    <div className="space-y-2">
                        {outcomes.map((outcome, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-3 transition-all cursor-pointer">
                                <span className="text-sm font-medium text-white">{outcome.label}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-white">{outcome.percentage}%</span>
                                    <div className="flex gap-2">
                                        <button className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded">Yes</button>
                                        <button className="bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1 rounded">No</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer: Volume + Actions */}
            <div className="px-6 pb-4 border-t border-gray-800 pt-4">

                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-200 font-mono text-base font-semibold">
                        ${(volume / 1000000).toFixed(1)}M Vol
                    </span>

                    {/* Actions: Genie Lamp + Bookmark */}
                    <div className="flex items-center gap-4">

                        {/* GENIE LAMP */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPotentialWin(!showPotentialWin);
                            }}
                            className="text-yellow-400 hover:text-yellow-300 hover:scale-110 transition-all active:scale-95"
                            title="Market Info"
                        >
                            <GenieLampIcon />
                        </button>

                        {/* Bookmark Star */}
                        <button
                            onClick={handleSaveClick}
                            className={`text-xl hover:scale-110 transition-all active:scale-95 ${isSaved ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                                }`}
                            title="Save Market"
                        >
                            {isSaved ? '⭐' : '☆'}
                        </button>
                    </div>
                </div>

                {/* Creator Badge */}
                <div className="text-xs text-gray-500">
                    by <span className="text-gray-300 font-medium">{createdBy}</span>
                </div>
            </div>

            {/* Market Info Popup (Lamp Click) */}
            {showPotentialWin && (
                <>
                    <div
                        className="fixed inset-0 z-30"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowPotentialWin(false);
                        }}
                    />

                    <div className="absolute bottom-full right-4 mb-2 bg-gray-800 border border-yellow-500/50 rounded-xl p-5 shadow-2xl z-40 w-72">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-yellow-400 font-bold flex items-center gap-2 text-base">
                                <GenieLampIcon /> Djinn's Wisdom
                            </h4>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPotentialWin(false);
                                }}
                                className="text-gray-400 hover:text-white text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Liquidity:</span>
                                <span className="text-white font-bold">${(volume / 1000000).toFixed(1)}M</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">24h Volume:</span>
                                <span className="text-white font-mono font-semibold">$2.1M</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Spread:</span>
                                <span className="text-white font-mono font-semibold">0.5%</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-700 pt-2">
                                <span className="text-gray-400">Current Probability:</span>
                                <span className="text-yellow-400 font-bold text-base">{mainPercentage}%</span>
                            </div>
                        </div>

                        <p className="mt-4 text-xs text-gray-400 italic text-center">
                            💡 Click YES or NO to place your prediction
                        </p>
                    </div>
                </>
            )}

        </div>
    );
}