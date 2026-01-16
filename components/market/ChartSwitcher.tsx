'use client';

import React from 'react';
import { Activity, Zap } from 'lucide-react';

interface ChartSwitcherProps {
    viewMode: 'pretty' | 'pro';
    onToggle: () => void;
}

export default function ChartSwitcher({ viewMode, onToggle }: ChartSwitcherProps) {
    return (
        <div className="flex bg-black/40 backdrop-blur-md border border-white/5 p-1 rounded-2xl w-fit">
            <button
                onClick={() => viewMode === 'pro' && onToggle()}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${viewMode === 'pretty' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
            >
                <Activity size={14} className={viewMode === 'pretty' ? 'text-[#F492B7]' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">Lite</span>
            </button>
            <button
                onClick={() => viewMode === 'pretty' && onToggle()}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${viewMode === 'pro' ? 'bg-[#F492B7] text-black shadow-[0_0_20px_rgba(244,146,183,0.3)]' : 'text-gray-500 hover:text-white'}`}
            >
                <Zap size={14} fill={viewMode === 'pro' ? 'black' : 'none'} />
                <span className="text-[10px] font-black uppercase tracking-widest">Djinn Mode</span>
            </button>
        </div>
    );
}
