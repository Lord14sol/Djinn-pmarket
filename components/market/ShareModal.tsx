'use client';

import React, { useRef } from 'react';
import { X, Twitter, Copy, Check, Download } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    betDetails: {
        outcomeName: string;
        side: 'YES' | 'NO';
        solAmount: number;
        usdAmount: number;
        marketTitle: string;
        marketIcon?: string;
        probability: number;
        username: string;
    };
}

export default function ShareModal({ isOpen, onClose, betDetails }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const shareUrl = `https://djinn.markets/market/${betDetails.marketTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

    const tweetText = `🔮 Just bet ${betDetails.solAmount.toFixed(2)} SOL ($${betDetails.usdAmount.toFixed(0)}) on "${betDetails.outcomeName}" to win the market "${betDetails.marketTitle}" on @DjinnMarkets!\n\n${betDetails.side === 'YES' ? '✅' : '❌'} ${betDetails.side} @ ${betDetails.probability}%\n\n#Djinn #PredictionMarkets #Solana`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTweet = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Share Card Preview */}
                <div
                    ref={cardRef}
                    className="relative bg-gradient-to-br from-[#0E0E0E] via-[#111] to-[#0A0A0A] p-6 border-b border-white/5"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#F492B7]/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Djinn Branding Header */}
                    <div className="flex items-center justify-center gap-2 mb-6 relative">
                        <Image src="/star.png" alt="Djinn" width={32} height={32} className="drop-shadow-lg" />
                        <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>Djinn</span>
                    </div>

                    {/* Bet Card */}
                    <div className="bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 p-5 relative overflow-hidden">
                        {/* Side Indicator */}
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${betDetails.side === 'YES' ? 'bg-[#10B981]' : 'bg-red-500'}`} />

                        {/* User */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F492B7] to-[#E056A0] flex items-center justify-center text-black font-bold text-xs">
                                {betDetails.username.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-white font-bold text-sm">{betDetails.username}</span>
                            <span className="text-gray-600 text-xs">just bet</span>
                        </div>

                        {/* Market Title */}
                        <h3 className="text-white font-black text-lg mb-4 leading-tight">{betDetails.marketTitle}</h3>

                        {/* Outcome */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase ${betDetails.side === 'YES' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/20 text-red-500'}`}>
                                {betDetails.side}
                            </span>
                            <span className="text-white font-bold">{betDetails.outcomeName}</span>
                            <span className="text-gray-500 text-sm ml-auto">@ {betDetails.probability}%</span>
                        </div>

                        {/* Amount Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-xl p-3">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">SOL</p>
                                <p className="text-[#F492B7] font-black text-xl">{betDetails.solAmount.toFixed(2)}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">USD</p>
                                <p className="text-[#10B981] font-black text-xl">${betDetails.usdAmount.toFixed(0)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Watermark */}
                    <div className="flex items-center justify-center gap-1 mt-4">
                        <Image src="/star.png" alt="Djinn" width={14} height={14} className="opacity-50" />
                        <span className="text-[11px] text-gray-600 font-medium">djinn.markets</span>
                    </div>
                </div>

                {/* Share Actions */}
                <div className="p-5 space-y-3">
                    <button
                        onClick={handleTweet}
                        className="w-full py-4 rounded-2xl bg-[#1DA1F2] text-white font-black text-sm uppercase flex items-center justify-center gap-3 hover:bg-[#1a8cd8] transition-colors"
                    >
                        <Twitter size={18} />
                        Share on X
                    </button>

                    <button
                        onClick={handleCopy}
                        className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/10 transition-colors"
                    >
                        {copied ? <Check size={18} className="text-[#10B981]" /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>

                    <button
                        className="w-full py-3 text-gray-500 font-medium text-xs flex items-center justify-center gap-2 hover:text-white transition-colors"
                    >
                        <Download size={14} />
                        Download Image (Coming Soon)
                    </button>
                </div>
            </div>
        </div>
    );
}
