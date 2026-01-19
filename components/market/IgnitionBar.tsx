'use client';

import React from 'react';

type IgnitionStatus = 'ACCUMULATION' | 'BREAKING' | 'VIRAL';

interface IgnitionBarProps {
    progress: number; // 0-100
    status: IgnitionStatus;
}

export default function IgnitionBar({ progress, status }: IgnitionBarProps) {
    const clampedProgress = Math.min(100, Math.max(0, progress));

    // Color and Animation based on Status
    const getBarStyles = () => {
        switch (status) {
            case 'VIRAL':
                return {
                    bg: 'bg-gradient-to-r from-green-500 via-emerald-400 to-green-500',
                    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.8)]',
                    animation: 'animate-pulse',
                    text: '🚀 VIRAL MODE ACTIVE',
                    textColor: 'text-green-400'
                };
            case 'BREAKING':
                return {
                    bg: 'bg-gradient-to-r from-red-500 via-orange-500 to-red-500',
                    glow: 'shadow-[0_0_25px_rgba(239,68,68,0.7)]',
                    animation: 'animate-[pulse_0.5s_ease-in-out_infinite]',
                    text: '⚠️ ANCHOR BREAKING!',
                    textColor: 'text-red-400'
                };
            default:
                return {
                    bg: 'bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500',
                    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.4)]',
                    animation: '',
                    text: '🛡️ Accumulation Zone',
                    textColor: 'text-blue-400'
                };
        }
    };

    const styles = getBarStyles();

    return (
        <div className="w-full">
            {/* Status Label */}
            <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-black uppercase tracking-widest ${styles.textColor}`}>
                    {styles.text}
                </span>
                <span className="text-xs font-mono text-gray-400">
                    {clampedProgress.toFixed(1)}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${styles.bg} ${styles.glow} ${styles.animation}`}
                    style={{ width: `${clampedProgress}%` }}
                />

                {/* Threshold Marker at 80% */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/50"
                    style={{ left: '80%' }}
                />

                {/* Threshold Marker at 100% (Ignition Point) */}
                <div
                    className="absolute top-0 bottom-0 w-1 bg-green-500"
                    style={{ left: 'calc(100% - 2px)' }}
                />
            </div>

            {/* Sub-labels */}
            <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-600">0%</span>
                <span className="text-[10px] text-yellow-500/70">80%</span>
                <span className="text-[10px] text-green-500">IGNITE</span>
            </div>
        </div>
    );
}
