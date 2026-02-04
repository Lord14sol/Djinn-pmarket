'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

interface PurchaseToastProps {
    isVisible: boolean;
    onClose: () => void;
    onShare: () => void;
    betDetails: {
        outcomeName: string;
        side: 'YES' | 'NO';
        solAmount: number;
        usdAmount: number;
        marketTitle: string;
        type: 'BUY' | 'SELL';
        imageUrl?: string; // Added imageUrl
    } | null;
}

export default function PurchaseToast({ isVisible, onClose, onShare, betDetails }: PurchaseToastProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            // Trigger animation after mount
            setTimeout(() => setShow(true), 50);
            // Auto-hide after 8 seconds
            const timer = setTimeout(() => {
                setShow(false);
                setTimeout(onClose, 300);
            }, 8000);
            return () => clearTimeout(timer);
        } else {
            setShow(false);
        }
    }, [isVisible, onClose]);

    if (!isVisible || !betDetails) return null;

    const isSell = betDetails.type === 'SELL';
    const accentColor = isSell ? '#EF4444' : '#10B981';
    const bgColor = isSell ? 'bg-red-500/20' : 'bg-[#10B981]/20';
    const textColor = isSell ? 'text-red-500' : 'text-[#10B981]';

    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${show ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'}`}>
            <div className={`bg-white border-4 border-black rounded-3xl p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] w-96 relative overflow-hidden ${show ? 'animate-bounce-once' : ''}`}>
                {/* Epic Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${isSell ? 'from-rose-100 to-rose-50' : 'from-emerald-100 to-emerald-50'} -z-10`} />

                {/* Close Button - NEO-BRUTALIST */}
                <button
                    onClick={() => { setShow(false); setTimeout(onClose, 300); }}
                    className="absolute top-3 right-3 bg-black text-white p-2 rounded-lg border-2 border-black hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                    <X size={14} />
                </button>

                {/* EPIC Header */}
                <div className="flex items-center gap-4 mb-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isSell ? 'bg-rose-400' : 'bg-emerald-400'} overflow-hidden border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
                        {betDetails.imageUrl ? (
                            <img src={betDetails.imageUrl} alt="Market" className="w-full h-full object-cover" />
                        ) : (
                            <CheckCircle2 size={32} className="text-black" strokeWidth={3} />
                        )}
                    </div>
                    <div>
                        <p className="text-black font-black text-xl tracking-tight">{isSell ? '💰 Sold!' : '🚀 Bet Placed!'}</p>
                        <p className="text-black/60 text-sm font-bold uppercase tracking-wider">{isSell ? 'SOL Received' : 'Position confirmed'}</p>
                    </div>
                </div>

                {/* Bet Details - CARD */}
                <div className="bg-white rounded-2xl p-5 mb-5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-lg border-3 border-black ${betDetails.side === 'YES' ? 'bg-emerald-400 text-black' : 'bg-rose-400 text-black'}`}>
                            {betDetails.side} {betDetails.outcomeName}
                        </span>
                    </div>
                    <p className="text-black font-black text-base truncate mb-4">{betDetails.marketTitle}</p>
                    <div className="flex items-center justify-between pt-3 border-t-2 border-black">
                        <span className="text-black/60 text-xs font-black uppercase">{isSell ? '💵 Received' : '💳 Amount'}</span>
                        <div className="text-right">
                            <span className={`${isSell ? 'text-emerald-600' : 'text-black'} font-black text-xl`}>
                                {isSell ? '+' : ''}{betDetails.solAmount.toFixed(4)} SOL
                            </span>
                            {!isSell && <span className="text-black/40 ml-1 text-sm font-bold">(${betDetails.usdAmount.toFixed(2)})</span>}
                        </div>
                    </div>
                </div>

                {/* Share Button - EPIC */}
                <button
                    onClick={onShare}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#F492B7] to-[#FFB6C1] text-black font-black text-base uppercase flex items-center justify-center gap-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-none"
                >
                    <Image src="/star.png" alt="Djinn" width={20} height={20} />
                    {isSell ? 'Share Profit' : 'Share Your Bet'}
                    <ExternalLink size={16} />
                </button>

                {/* Branding */}
                <div className="flex items-center justify-center gap-2 mt-4">
                    <Image src="/star.png" alt="Djinn" width={16} height={16} />
                    <span className="text-xs text-black/50 font-black uppercase tracking-wider">Djinn Markets</span>
                </div>
            </div>
        </div>
    );
}
