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

    return (
        <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
            <div className="bg-[#0E0E0E] border border-white/10 rounded-2xl p-5 shadow-2xl w-80 relative overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#10B981]/20 rounded-full blur-3xl pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={() => { setShow(false); setTimeout(onClose, 300); }}
                    className="absolute top-3 right-3 text-gray-600 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                        <CheckCircle2 size={20} className="text-[#10B981]" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">Bet Placed!</p>
                        <p className="text-gray-500 text-xs">Position confirmed</p>
                    </div>
                </div>

                {/* Bet Details */}
                <div className="bg-black/50 rounded-xl p-3 mb-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${betDetails.side === 'YES' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/20 text-red-500'}`}>
                            {betDetails.side} {betDetails.outcomeName}
                        </span>
                    </div>
                    <p className="text-white font-bold text-sm truncate mb-2">{betDetails.marketTitle}</p>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Amount</span>
                        <div className="text-right">
                            <span className="text-[#F492B7] font-bold">{betDetails.solAmount.toFixed(4)} SOL</span>
                            <span className="text-gray-600 ml-1">(${betDetails.usdAmount.toFixed(2)})</span>
                        </div>
                    </div>
                </div>

                {/* Share Button */}
                <button
                    onClick={onShare}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F492B7] to-[#E056A0] text-black font-black text-sm uppercase flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <Image src="/star.png" alt="Djinn" width={16} height={16} />
                    Share Your Bet
                    <ExternalLink size={14} />
                </button>

                {/* Branding */}
                <div className="flex items-center justify-center gap-1 mt-3 opacity-40">
                    <Image src="/star.png" alt="Djinn" width={12} height={12} />
                    <span className="text-[10px] text-gray-500 font-medium">Djinn Markets</span>
                </div>
            </div>
        </div>
    );
}
