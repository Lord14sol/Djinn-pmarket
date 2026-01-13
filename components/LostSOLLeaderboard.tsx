'use client';

import React, { useState } from 'react';

interface Loser {
    rank: number;
    wallet: string;
    username?: string;
    avatar?: string | null;
    totalLost: number;
    lossCount: number;
}

interface LostSOLLeaderboardProps {
    losers: Loser[];
}

export default function LostSOLLeaderboard({ losers }: LostSOLLeaderboardProps) {
    const [showAll, setShowAll] = useState(false);

    const displayedLosers = showAll ? losers : losers.slice(0, 10);

    if (losers.length === 0) {
        return (
            <div className="text-center py-12 border border-white/10 rounded-2xl bg-white/5">
                <span className="text-4xl mb-4 block">💀</span>
                <p className="text-gray-500 font-bold">No losses recorded yet</p>
                <p className="text-gray-600 text-sm">Someone has to lose first...</p>
            </div>
        );
    }

    return (
        <div className="border border-white/10 rounded-2xl bg-gradient-to-b from-red-500/5 to-transparent overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">💀</span>
                    <div>
                        <h3 className="text-white font-black uppercase tracking-wider">Lost SOL</h3>
                        <p className="text-red-400/80 text-xs font-medium">Hall of Shame</p>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                    <span className="text-red-400 text-xs font-black">{losers.length} Rekt</span>
                </div>
            </div>

            {/* Leaderboard Rows */}
            <div className="divide-y divide-white/5">
                {displayedLosers.map((loser, index) => (
                    <div
                        key={loser.wallet}
                        className={`flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors ${index === 0 ? 'bg-red-500/10' : ''}`}
                    >
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${index === 0 ? 'bg-red-500 text-white' :
                                index === 1 ? 'bg-red-500/60 text-white' :
                                    index === 2 ? 'bg-red-500/40 text-red-200' :
                                        'bg-white/10 text-gray-400'
                            }`}>
                            {loser.rank}
                        </div>

                        {/* Avatar & Name */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-gray-800 flex items-center justify-center text-lg shrink-0 border border-white/10">
                                {loser.avatar ? (
                                    <img src={loser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    '💀'
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white font-bold text-sm truncate">
                                    {loser.username || `${loser.wallet.slice(0, 4)}...${loser.wallet.slice(-4)}`}
                                </p>
                                <p className="text-gray-600 text-xs font-mono truncate">
                                    {loser.lossCount} losses
                                </p>
                            </div>
                        </div>

                        {/* Amount Lost */}
                        <div className="text-right shrink-0">
                            <p className="text-red-400 font-black text-lg">
                                -{loser.totalLost.toFixed(2)} SOL
                            </p>
                            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                                Rekt
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Show More */}
            {losers.length > 10 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full py-4 text-center text-gray-500 hover:text-red-400 text-sm font-bold uppercase tracking-wider border-t border-white/5 hover:bg-white/5 transition-all"
                >
                    {showAll ? '▲ Show Less' : `▼ Show All ${losers.length} Losers`}
                </button>
            )}
        </div>
    );
}
