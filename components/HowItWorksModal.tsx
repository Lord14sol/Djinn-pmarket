'use client';

import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';

// --- CUSTOM CSS ANIMATIONS ---
const customStyles = `
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(244,146,183,0.3); }
    50% { box-shadow: 0 0 40px rgba(244,146,183,0.6); }
  }
  .animate-pulse-glow {
    animation: pulse-glow 2s infinite ease-in-out;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  .animate-float {
    animation: float 3s infinite ease-in-out;
  }
`;

// --- VISUAL COMPONENTS (Using Djinn's actual design language) ---

// 1. CONNECT WALLET
const VisualConnect = () => (
    <div className="w-full h-full flex items-center justify-center relative">
        <div className="bg-[#0B0E14] border border-white/10 rounded-2xl p-5 w-72 relative">
            {/* Phantom-style wallet button */}
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#512DA8] to-[#9945FF] rounded-xl flex items-center justify-center shadow-lg">
                    <img src="/djinn-logo.png" alt="" className="w-8 h-8 object-contain animate-float" />
                </div>
                <div>
                    <p className="text-white font-black text-sm">Connect Wallet</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Phantom, Solflare...</p>
                </div>
            </div>

            {/* Balance display - Djinn style */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src="https://assets.coingecko.com/coins/images/4128/large/solana.png" alt="SOL" className="w-5 h-5" />
                    <span className="text-white font-bold text-sm">42.69 SOL</span>
                </div>
                <div className="bg-[#10B981] text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">
                    Connected
                </div>
            </div>
        </div>
    </div>
);

// 2. CREATE MARKET (From CreateMarketModal design)
const VisualCreate = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="bg-[#0B0E14] border border-white/10 rounded-2xl p-4 w-64 relative overflow-hidden">
            {/* Header */}
            <h3 className="text-white font-black text-sm text-center mb-4">Create New Market</h3>

            {/* Binary/Multiple toggle - exact from CreateMarketModal */}
            <div className="flex gap-1 mb-3 bg-white/5 p-1 rounded-xl">
                <div className="flex-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase bg-[#F492B7] text-black text-center">Binary</div>
                <div className="flex-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-gray-500 text-center">Multiple</div>
            </div>

            {/* Image upload zone - exact from CreateMarketModal */}
            <div className="w-full h-16 rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center mb-3 hover:border-[#F492B7] transition-all">
                <div className="text-center">
                    <span className="text-2xl">🖼️</span>
                    <span className="text-[8px] font-bold text-gray-500 uppercase block">Upload</span>
                </div>
            </div>

            {/* Question input - exact from CreateMarketModal */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 mb-3 flex items-center gap-2">
                <span className="text-[10px] text-white font-bold truncate">Will BTC hit $150k?</span>
                <span className="text-gray-500 animate-pulse">|</span>
            </div>

            {/* Create button - exact from CreateMarketModal */}
            <div className="bg-[#F492B7] text-black text-[10px] font-black py-2.5 rounded-xl text-center uppercase tracking-wider">
                Create Market
            </div>
        </div>
    </div>
);

// 3. SNIPE EARLY
const VisualSnipe = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="bg-[#0B0E14] border border-[#10B981]/30 rounded-2xl p-4 w-80 relative">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#10B981] to-[#34D399] rounded-lg flex items-center justify-center text-white text-sm">⚡</div>
                <div>
                    <p className="text-white font-black text-sm">Early Entry Bonus</p>
                    <p className="text-[9px] text-[#10B981] font-bold uppercase">Bonding Curve Mechanics</p>
                </div>
            </div>

            {/* Comparison - shows early vs late */}
            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg px-3 py-2">
                    <span className="text-[10px] text-gray-400 font-bold">🎯 Early (0.1 SOL)</span>
                    <span className="text-[#10B981] font-black">10M Shares</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <span className="text-[10px] text-gray-500 font-bold">🐢 Late (0.1 SOL)</span>
                    <span className="text-gray-400 font-black">2M Shares</span>
                </div>
            </div>

            {/* Price curve */}
            <div className="h-10 bg-black/40 rounded-lg overflow-hidden relative">
                <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="snipeGrad2" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d="M0,35 Q50,30 100,20 T200,5 V40 H0 Z" fill="url(#snipeGrad2)" />
                    <path d="M0,35 Q50,30 100,20 T200,5" fill="none" stroke="#10B981" strokeWidth="2" />
                    <circle cx="20" cy="33" r="4" fill="#10B981" className="animate-pulse" />
                </svg>
                <span className="absolute top-1 left-6 text-[8px] text-[#10B981] font-bold">YOU</span>
            </div>
        </div>
    </div>
);

// 4. TRADE - Using MarketCard button design
const VisualTrade = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="bg-black border border-white/5 rounded-2xl p-4 w-72 relative">
            {/* Market header - from MarketCard */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#1C212E]/50 border border-white/5 overflow-hidden flex items-center justify-center">
                    <span className="text-2xl">₿</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm leading-tight">Bitcoin ATH 2026?</h3>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Ends Dec 31</span>
                </div>
            </div>

            {/* YES/NO Buttons - EXACT from MarketCard */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <button className="flex flex-col items-center justify-center bg-[#0E2825] border border-emerald-500/20 hover:bg-emerald-500 rounded-lg py-2.5 transition-all group">
                    <span className="text-[10px] font-bold text-emerald-400 group-hover:text-white uppercase tracking-wider mb-0.5">Yes</span>
                    <span className="text-lg font-black text-emerald-400 group-hover:text-white">64%</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-[#2B1616] border border-rose-500/20 hover:bg-rose-500 rounded-lg py-2.5 transition-all group">
                    <span className="text-[10px] font-bold text-rose-400 group-hover:text-white uppercase tracking-wider mb-0.5">No</span>
                    <span className="text-lg font-black text-rose-400 group-hover:text-white">36%</span>
                </button>
            </div>

            {/* Sell row */}
            <div className="bg-white/5 border border-white/5 rounded-lg py-2 px-3 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">Your shares: <span className="text-white font-bold">5.2M YES</span></span>
                <button className="text-[10px] text-[#F492B7] font-bold uppercase">Sell →</button>
            </div>

            {/* Footer - from MarketCard */}
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider border-t border-white/5 pt-3 mt-3">
                <span className="text-gray-400">$1.2M Vol</span>
                <Star className="w-4 h-4 text-gray-600 hover:text-[#F492B7] transition-colors" />
            </div>
        </div>
    </div>
);

// 5. HOLD & PROFIT
const VisualHold = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            {/* Big profit number */}
            <div className="relative">
                <div className="text-[#10B981] text-5xl font-black drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                    +420%
                </div>
                <span className="absolute -top-1 -right-6 text-2xl animate-bounce">📈</span>
            </div>

            {/* Position card */}
            <div className="bg-[#0B0E14] border border-white/10 rounded-xl p-4 w-64">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Your Position</span>
                    <span className="text-[10px] text-[#10B981] font-bold px-2 py-0.5 bg-[#10B981]/10 rounded-full">GROWING</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Entry</span>
                        <span className="text-gray-400 text-xs font-bold">0.5 SOL</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Current Value</span>
                        <span className="text-[#10B981] text-sm font-black">2.6 SOL</span>
                    </div>
                </div>
            </div>

            {/* Diamond hands badge */}
            <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-full px-4 py-2">
                <span className="text-[10px] text-[#10B981] font-bold">💎 Others buy → Your value increases</span>
            </div>
        </div>
    </div>
);

// 6. CERBERUS RESOLUTION
const VisualResolution = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="bg-gradient-to-br from-[#0B0E14] to-[#1A0A1A] border border-purple-500/30 rounded-2xl p-4 w-80 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-[#F492B7]/5 pointer-events-none" />

            {/* Cerberus header */}
            <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-[#F492B7] rounded-xl flex items-center justify-center shadow-lg animate-pulse-glow">
                    <span className="text-2xl">🐕</span>
                </div>
                <div>
                    <p className="text-white font-black text-sm">CERBERUS ORACLE</p>
                    <p className="text-[9px] text-purple-400 font-bold uppercase">3-Dog AI Verification</p>
                </div>
            </div>

            {/* MCAP Progress */}
            <div className="bg-black/50 border border-white/10 rounded-xl p-3 mb-3 relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Resolution Trigger</span>
                    <span className="text-[10px] text-[#F492B7] font-bold animate-pulse">$34K MCAP</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-[#F492B7] rounded-full transition-all" style={{ width: '78%' }} />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[8px] text-gray-600">0</span>
                    <span className="text-[8px] text-[#F492B7] font-bold">78% → 240 SOL</span>
                    <span className="text-[8px] text-gray-600">$34k</span>
                </div>
            </div>

            {/* 3 Dogs */}
            <div className="flex gap-2 relative z-10">
                <div className="flex-1 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg py-2 text-center">
                    <span className="text-sm">🐕</span>
                    <p className="text-[8px] text-[#10B981] font-black">GATHER</p>
                </div>
                <div className="flex-1 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg py-2 text-center">
                    <span className="text-sm">🐕</span>
                    <p className="text-[8px] text-[#10B981] font-black">VERIFY</p>
                </div>
                <div className="flex-1 bg-purple-500/10 border border-purple-500/30 rounded-lg py-2 text-center animate-pulse">
                    <span className="text-sm">🐕</span>
                    <p className="text-[8px] text-purple-400 font-black">JUDGE</p>
                </div>
            </div>
        </div>
    </div>
);

// 7. EARN FROM FEES (Creator Rewards Card style from profile)
const VisualEarnFees = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-2xl p-4 w-80 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#F492B7]/5 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#F492B7] to-[#FF007A] rounded-xl flex items-center justify-center">
                            <span className="text-sm">💰</span>
                        </div>
                        <span className="text-white font-black text-sm uppercase">Creator Rewards</span>
                    </div>
                    <span className="text-[9px] text-[#10B981] font-bold px-2 py-1 bg-[#10B981]/10 rounded-full">FOREVER</span>
                </div>

                {/* Fee breakdown */}
                <div className="bg-black/50 border border-white/10 rounded-xl p-3 mb-3">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Fee Structure</div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-gray-400">Trading Fee</span>
                        <span className="text-white font-bold">1%</span>
                    </div>
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden flex">
                        <div className="w-1/2 h-full bg-gradient-to-r from-[#F492B7] to-[#FF007A] flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">50% YOU</span>
                        </div>
                        <div className="w-1/2 h-full bg-gradient-to-r from-purple-500 to-purple-700 flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">50% DJINN</span>
                        </div>
                    </div>
                </div>

                {/* Earnings grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-black/40 rounded-xl p-2 text-center">
                        <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Market Volume</p>
                        <p className="text-xl font-[900] text-white tracking-tighter">$1.2M</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-2 text-center">
                        <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Your Earnings</p>
                        <p className="text-xl font-[900] text-[#10B981] tracking-tighter">$6,000</p>
                    </div>
                </div>

                {/* Claim button - matches profile style */}
                <button className="w-full px-4 py-3 bg-[#10B981] text-white font-black text-sm rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-wide flex items-center justify-center gap-2">
                    🏆 Claim Rewards
                </button>
            </div>
        </div>
    </div>
);

// --- MAIN MODAL ---
export default function HowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (!isOpen) setStep(0);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (step < content.length - 1) setStep(step + 1);
        else {
            setStep(0);
            onClose();
        }
    };

    const handlePrev = () => {
        if (step > 0) setStep(step - 1);
    };

    const content = [
        {
            title: "Connect Wallet",
            subtitle: "GET STARTED IN 10 SECONDS",
            desc: "Link your Solana wallet (Phantom, Solflare, etc.) and fund it with SOL. Your gateway to prediction markets.",
            visual: <VisualConnect />,
            color: "#9945FF"
        },
        {
            title: "Create Market",
            subtitle: "BECOME A MARKET MAKER",
            desc: "Got a spicy prediction? Create your own market in seconds. Upload an image, write your question, deploy on Solana. Be the house.",
            visual: <VisualCreate />,
            color: "#F492B7"
        },
        {
            title: "Snipe Early",
            subtitle: "BONDING CURVE ADVANTAGE",
            desc: "First buyers get MORE shares per SOL. The price increases with each purchase. Early entry = maximum multiplier potential.",
            visual: <VisualSnipe />,
            color: "#10B981"
        },
        {
            title: "Trade",
            subtitle: "BUY & SELL ANYTIME",
            desc: "Buy YES or NO shares based on your prediction. Prices are dynamic—sell anytime to lock profits or cut losses. Instant execution, no order books.",
            visual: <VisualTrade />,
            color: "#F492B7"
        },
        {
            title: "Hold & Profit",
            subtitle: "DIAMOND HANDS WIN",
            desc: "Your position value grows as others buy after you. When the market resolves, winners split the ENTIRE pot. Bigger conviction = bigger rewards.",
            visual: <VisualHold />,
            color: "#10B981"
        },
        {
            title: "Cerberus Resolution",
            subtitle: "AI ORACLE AT $34K MCAP",
            desc: "When market cap reaches $34,000, the Cerberus 3-Dog AI verifies the outcome. Three independent checks ensure truth. Automatic, trustless, final.",
            visual: <VisualResolution />,
            color: "#9945FF"
        },
        {
            title: "Earn Forever",
            subtitle: "50% OF ALL TRADING FEES",
            desc: "As a market creator, you earn 50% of every trade on your market. More volume = more passive income. Your markets work for you forever.",
            visual: <VisualEarnFees />,
            color: "#10B981"
        }
    ];

    const currentContent = content[step];

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: customStyles }} />

            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F492B7]/5 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                {/* MODAL */}
                <div className="relative w-full max-w-[480px] bg-[#0B0E14] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl z-20">
                    {/* Progress bar */}
                    <div className="relative h-1 bg-white/5">
                        <div
                            className="absolute h-full transition-all duration-500 ease-out"
                            style={{
                                width: `${((step + 1) / content.length) * 100}%`,
                                background: `linear-gradient(90deg, ${currentContent.color}, ${currentContent.color}80)`
                            }}
                        />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-3">
                        <div className="flex items-center gap-3">
                            <img src="/star.png" alt="Djinn" className="w-8 h-8" />
                            <div>
                                <span className="text-white font-black text-sm uppercase tracking-wider">How Djinn Works</span>
                                <div className="text-[10px] text-gray-500">Step {step + 1} of {content.length}</div>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 pb-6">
                        {/* Visual */}
                        <div className="mb-6 w-full h-52 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                            {currentContent.visual}
                        </div>

                        {/* Text */}
                        <div className="text-center mb-6">
                            <div
                                className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
                                style={{ backgroundColor: `${currentContent.color}15`, color: currentContent.color }}
                            >
                                {currentContent.subtitle}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-3">
                                {currentContent.title}
                            </h3>
                            <p className="text-gray-400 text-sm font-medium leading-relaxed">
                                {currentContent.desc}
                            </p>
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-3">
                            {step > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className="px-6 py-3 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-white/10 transition-all text-xs"
                                >
                                    ← Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="flex-1 py-3 font-black uppercase tracking-[0.15em] rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg text-xs"
                                style={{
                                    backgroundColor: currentContent.color,
                                    color: currentContent.color === '#10B981' ? 'white' : 'black'
                                }}
                            >
                                {step === content.length - 1 ? "🚀 Start Trading" : "Next →"}
                            </button>
                        </div>

                        {/* Dots */}
                        <div className="flex justify-center gap-2 mt-5">
                            {content.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setStep(i)}
                                    className={`h-1.5 rounded-full transition-all duration-300 hover:opacity-80 ${i === step ? 'w-8' : 'w-2 bg-white/10'}`}
                                    style={i === step ? { backgroundColor: currentContent.color } : {}}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
