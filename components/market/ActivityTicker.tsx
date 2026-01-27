
"use client";

import React, { useEffect, useState, useRef } from "react";
import { formatCompact } from "@/lib/utils";
import { Clock, TrendingUp, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// --- TYPES ---
export interface ActivityItem {
    id: string; // Unique ID (tx or timestamp)
    side: 'YES' | 'NO';
    amountSol: number;
    shares: number;
    username?: string; // Optional
    roi?: number; // Optional simulated ROI from this trade
    timestamp: number;
}

interface ActivityTickerProps {
    activities: ActivityItem[];
}

export default function ActivityTicker({ activities }: ActivityTickerProps) {
    // Generate dummy data if empty (for visual feel "clock" effect)
    const [displayData, setDisplayData] = useState<ActivityItem[]>(activities);

    useEffect(() => {
        if (activities.length > 0) {
            setDisplayData(activities);
        } else {
            // Fallback Mock Data for "Clock" feel demo
            setDisplayData([
                { id: '1', side: 'YES', amountSol: 0.5, shares: 500000, timestamp: Date.now() - 5000, username: 'Whale1' },
                { id: '2', side: 'NO', amountSol: 1.2, shares: 1200000, timestamp: Date.now() - 15000, username: 'TraderX' },
                { id: '3', side: 'YES', amountSol: 0.1, shares: 100000, timestamp: Date.now() - 30000, username: 'Degen99' },
                { id: '4', side: 'YES', amountSol: 5.0, shares: 4800000, timestamp: Date.now() - 60000, username: 'GigaChad' },
                { id: '5', side: 'NO', amountSol: 0.05, shares: 50000, timestamp: Date.now() - 120000, username: 'Anon' },
            ]);
        }
    }, [activities]);

    return (
        <div className="w-full relative overflow-hidden bg-black/40 border-t border-b border-white/5 py-2 select-none group">
            {/* GRADIENT FADE EDGES */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

            {/* SCROLLING TRACK */}
            <div className="flex animate-scroll hover:[animation-play-state:paused] w-max gap-8 px-4 items-center">

                {/* DOUBLE THE ITEMS FOR SEAMLESS LOOP */}
                {[...displayData, ...displayData].map((item, idx) => {
                    const isYes = item.side === 'YES';
                    const colorClass = isYes ? "text-emerald-400" : "text-red-400";
                    const bgColorClass = isYes ? "bg-emerald-500/10" : "bg-red-500/10";
                    const borderColorClass = isYes ? "border-emerald-500/20" : "border-red-500/20";

                    return (
                        <div key={`${item.id}-${idx}`} className={`flex items-center gap-3 px-3 py-1.5 rounded-full border ${borderColorClass} ${bgColorClass} min-w-[200px]`}>
                            {/* AVATAR / ICON */}
                            <div className={`p-1.5 rounded-full ${isYes ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                <User className={`w-3 h-3 ${colorClass}`} />
                            </div>

                            {/* DETAILS */}
                            <div className="flex flex-col text-xs leading-none gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className={`font-bold ${colorClass}`}>{item.side}</span>
                                    <span className="text-zinc-400 opacity-60">bought</span>
                                    <span className="text-zinc-200 font-mono">{formatCompact(item.amountSol)} SOL</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                    <span className="flex items-center gap-0.5">
                                        <TrendingUp className="w-2.5 h-2.5 opacity-70" />
                                        {formatCompact(item.shares)} Shares
                                    </span>
                                    <span className="flex items-center gap-0.5 opacity-60">
                                        <Clock className="w-2.5 h-2.5" />
                                        {formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-scroll {
                    animation: scroll 40s linear infinite;
                }
            `}</style>
        </div>
    );
}
