
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
            <div className="text-center py-12 border-3 border-black rounded-3xl bg-[#F3F4F6] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-5xl mb-4 block grayscale opacity-50">💀</span>
                <p className="text-black font-black text-xl lowercase">no losses yet</p>
                <p className="text-gray-500 font-bold text-sm lowercase">market is waiting...</p>
            </div>
        );
    }

    return (
        <div className="border-3 border-black rounded-[2rem] bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="px-6 py-6 bg-[#FFB6C1] border-b-3 border-black flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-black text-white p-2 rounded-lg border-2 border-white shadow-sm">
                        <span className="text-xl">💀</span>
                    </div>
                    <div>
                        <h3 className="text-black font-black text-2xl uppercase tracking-tighter leading-none">Rekt<br />Board</h3>
                    </div>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-black text-xs font-black lowercase">{losers.length} victims</span>
                </div>
            </div>

            {/* Leaderboard Rows */}
            <div className="divide-y-2 divide-black">
                {displayedLosers.map((loser, index) => (
                    <div
                        key={loser.wallet}
                        className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[#F3F4F6] ${index < 3 ? 'bg-[#FFF5F7]' : 'bg-white'}`}
                    >
                        {/* Rank */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${index === 0 ? 'bg-[#FFD700] text-black' :
                            index === 1 ? 'bg-[#C0C0C0] text-black' :
                                index === 2 ? 'bg-[#CD7F32] text-black' :
                                    'bg-white text-black'
                            }`}>
                            #{loser.rank}
                        </div>

                        {/* Avatar & Name */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-gray-200">
                                {loser.avatar ? (
                                    <img src={loser.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl bg-gray-100">💀</div>
                                )}
                            </div>
                            <div className="min-w-0 flex flex-col">
                                <p className="text-black font-bold text-sm truncate lowercase">
                                    @{loser.username || `${loser.wallet.slice(0, 4)}...`}
                                </p>
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-black w-fit">
                                    {loser.lossCount} losses
                                </span>
                            </div>
                        </div>

                        {/* Amount Lost */}
                        <div className="text-right shrink-0">
                            <p className="text-[#FF4500] font-black text-lg leading-none">
                                -{loser.totalLost.toFixed(2)} SOL
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Show More */}
            {losers.length > 10 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full py-4 text-center bg-[#F3F4F6] text-black hover:bg-[#FFB6C1] text-sm font-black uppercase tracking-wide border-t-3 border-black transition-colors"
                >
                    {showAll ? '▲ hide' : '▼ show all'}
                </button>
            )}
        </div>
    );
}
