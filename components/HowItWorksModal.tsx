'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, X } from 'lucide-react';

// --- 1. ESTILOS CSS PERSONALIZADOS ---
const customStyles = `
  @keyframes subtle-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .animate-subtle-bounce {
    animation: subtle-bounce 3s infinite ease-in-out;
  }

  @keyframes float-around {
    0% { transform: translate(0, 0) rotate(0deg); }
    20% { transform: translate(100px, -50px) rotate(45deg); }
    40% { transform: translate(-50px, 100px) rotate(90deg); }
    60% { transform: translate(-100px, -20px) rotate(135deg); }
    80% { transform: translate(50px, 50px) rotate(180deg); }
    100% { transform: translate(0, 0) rotate(225deg); }
  }
  .animate-float-around {
    animation: float-around 20s infinite linear;
  }
`;

// --- 2. COMPONENTE ESTRELLA ESCURRIDIZA ---
function EscapingStar() {
    const [pos, setPos] = useState({ top: '20%', left: '20%' });

    const jumpToRandomPosition = () => {
        const randomTop = Math.floor(Math.random() * 80) + 10 + '%';
        const randomLeft = Math.floor(Math.random() * 80) + 10 + '%';
        setPos({ top: randomTop, left: randomLeft });
    };

    useEffect(() => {
        jumpToRandomPosition();
    }, []);

    return (
        <div
            onClick={jumpToRandomPosition}
            className="absolute z-0 cursor-pointer transition-all duration-500 ease-out animate-float-around p-4 outline-none"
            style={{
                top: pos.top,
                left: pos.left,
                WebkitTapHighlightColor: 'transparent'
            }}
        >
            <img
                src="/star.png"
                alt="floating star"
                className="w-36 h-28 opacity-80 drop-shadow-[0_0_25px_rgba(244,146,183,0.9)] transition-all"
            />
        </div>
    );
}


export default function HowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const handleNext = () => {
        if (step < 4) setStep(step + 1);
        else {
            setStep(0);
            onClose();
        }
    };

    // VISUAL 1: CONNECT WALLET (First Step - Premium Design)
    const VisualConnectWallet = () => (
        <div className="w-full h-full flex items-center justify-center relative">
            {/* Glowing Background */}
            <div className="absolute inset-0 bg-gradient-radial from-[#9945FF]/10 to-transparent rounded-full blur-2xl" />

            {/* Main Wallet Container */}
            <div className="relative flex items-center gap-6">
                {/* Phantom/Solana Wallet Icon */}
                <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#512DA8] to-[#9945FF] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(153,69,255,0.4)] animate-pulse">
                        <Wallet className="w-8 h-8 text-white" />
                    </div>
                    {/* Connection Dots */}
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex gap-1">
                        <div className="w-1.5 h-1.5 bg-[#9945FF] rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                        <div className="w-1.5 h-1.5 bg-[#9945FF] rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1.5 h-1.5 bg-[#9945FF] rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
                    </div>
                </div>

                {/* SOL Balance Display */}
                <div className="bg-[#0A0A0A] border border-[#9945FF]/30 rounded-xl p-3 shadow-lg">
                    <div className="flex items-center gap-2">
                        <img
                            src="https://assets.coingecko.com/coins/images/4128/large/solana.png?1640133422"
                            alt="SOL"
                            className="w-6 h-6 animate-subtle-bounce"
                        />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Balance</span>
                            <span className="text-white font-black text-sm">42.69 SOL</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Checkmark */}
            <div className="absolute bottom-2 right-8 bg-[#10B981] w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                <span className="text-white text-xs">✓</span>
            </div>
        </div>
    );

    // VISUAL 2: BUY YES/NO (Enhanced Market Card)
    const VisualBuyShares = () => (
        <div className="w-full h-full flex items-center justify-center scale-95">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 w-72 shadow-2xl relative overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#F492B7]/20 rounded-full blur-2xl" />

                {/* Header */}
                <div className="flex items-center gap-2 mb-3 relative z-10">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#F7931A] to-[#FFB347] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">₿</div>
                    <div className="flex-1">
                        <div className="text-white font-black text-sm">Bitcoin ATH 2026?</div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Ends Dec 31</div>
                    </div>
                    <div className="bg-[#F492B7] text-[7px] text-black px-2 py-0.5 rounded-full font-black uppercase animate-pulse">LIVE</div>
                </div>

                {/* Buy Buttons */}
                <div className="flex gap-2 relative z-10">
                    <button className="flex-1 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wide shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] opacity-80">BUY</span>
                            <span>YES 64%</span>
                        </div>
                    </button>
                    <button className="flex-1 bg-gradient-to-r from-[#EF4444] to-[#F87171] text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wide shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:scale-105 transition-transform">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] opacity-80">BUY</span>
                            <span>NO 36%</span>
                        </div>
                    </button>
                </div>

                {/* Volume */}
                <div className="mt-3 text-center">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Volume: </span>
                    <span className="text-[10px] text-[#F492B7] font-black">$1.2M</span>
                </div>
            </div>
        </div>
    );

    // VISUAL 3: SELL & PROFIT (Enhanced with Chart)
    const VisualProfit = () => (
        <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                {/* Profit Display */}
                <div className="relative">
                    <div className="text-[#10B981] text-4xl font-black drop-shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-pulse">
                        +$1,420
                    </div>
                    <div className="absolute -top-2 -right-6 text-2xl animate-bounce">🚀</div>
                </div>

                {/* Mini Chart */}
                <div className="flex items-end gap-1 h-10">
                    {[20, 35, 25, 45, 55, 70, 85].map((h, i) => (
                        <div
                            key={i}
                            className="w-3 bg-gradient-to-t from-[#10B981] to-[#34D399] rounded-t transition-all duration-300 hover:scale-110"
                            style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                        />
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <div className="bg-gradient-to-r from-[#F492B7] to-[#ff6fb7] text-black text-[10px] font-black px-4 py-1.5 rounded-lg uppercase tracking-wide shadow-lg">
                        💰 Sell & Profit
                    </div>
                    <div className="bg-white/10 text-gray-400 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase border border-white/10">
                        Hold
                    </div>
                </div>
            </div>
        </div>
    );

    // VISUAL 4: CREATE MARKET (Premium Form Design)
    const VisualCreateMarket = () => (
        <div className="w-full h-full flex items-center justify-center">
            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A2E] border border-[#F492B7]/20 rounded-2xl p-4 w-64 shadow-[0_0_30px_rgba(244,146,183,0.1)] relative overflow-hidden">
                {/* Glow */}
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-[#F492B7]/20 rounded-full blur-2xl" />

                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-[#F492B7] rounded-lg flex items-center justify-center text-xs">✨</div>
                    <span className="text-white font-black text-sm uppercase tracking-wider">New Market</span>
                </div>

                {/* Image Upload */}
                <div className="w-full h-12 bg-white/5 rounded-xl border-2 border-dashed border-[#F492B7]/30 flex items-center justify-center mb-2 group hover:border-[#F492B7]/60 transition-colors cursor-pointer">
                    <span className="text-[10px] text-gray-400 group-hover:text-[#F492B7] transition-colors">📸 Drop Image</span>
                </div>

                {/* Question */}
                <div className="bg-black/50 border border-white/10 rounded-xl p-2 mb-2 flex items-center gap-2">
                    <span className="text-[10px] text-white font-bold truncate">Will ETH flip BTC?</span>
                    <span className="text-gray-500 animate-pulse">|</span>
                </div>

                {/* Outcomes */}
                <div className="flex gap-2 mb-3">
                    <div className="flex-1 bg-[#10B981]/10 border border-[#10B981]/40 rounded-lg py-1.5 text-center">
                        <span className="text-[9px] text-[#10B981] font-black">✓ YES</span>
                    </div>
                    <div className="flex-1 bg-red-500/10 border border-red-500/40 rounded-lg py-1.5 text-center">
                        <span className="text-[9px] text-red-400 font-black">✗ NO</span>
                    </div>
                </div>

                {/* Deploy */}
                <div className="bg-gradient-to-r from-[#F492B7] to-[#ff6fb7] text-black text-[10px] font-black py-2 rounded-xl text-center uppercase tracking-wider shadow-lg animate-pulse relative z-10">
                    🚀 Deploy to Solana
                </div>
            </div>
        </div>
    );

    // VISUAL 5: FEE EARNINGS (Authentic Creator Rewards Card from Profile)
    const VisualFeeEarnings = () => (
        <div className="w-full h-full flex items-center justify-center">
            <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-2xl p-4 w-72 relative overflow-hidden">
                {/* Pink glow - matches profile */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#F492B7]/5 via-transparent to-transparent pointer-events-none" />

                <div className="relative z-10">
                    {/* Header */}
                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-4">Creator Rewards</h3>

                    {/* Stats Grid - exact match to profile */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1">Total</p>
                            <p className="text-2xl font-[900] text-[#10B981] tracking-tighter italic leading-none">
                                $18,000
                            </p>
                            <p className="text-gray-500 text-[9px] mt-1">100 SOL</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1">Unclaimed</p>
                            <p className="text-2xl font-[900] text-[#F492B7] tracking-tighter italic leading-none">
                                $18,000
                            </p>
                            <p className="text-gray-500 text-[9px] mt-1">100 SOL</p>
                        </div>
                    </div>

                    {/* Mini Chart Area - matches profile with Djinn watermark */}
                    <div className="h-12 mb-3 relative overflow-hidden rounded-lg bg-black/40">
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <div className="flex items-center gap-0">
                                <img src="/star.png" alt="" className="w-10 h-10 -mr-1" />
                                <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>Djinn</span>
                            </div>
                        </div>
                        {/* Gradient Chart Line - matches profile charts */}
                        <svg className="w-full h-full" viewBox="0 0 280 48" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#F492B7" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#F492B7" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,40 Q40,35 70,30 T140,20 T210,15 T280,5 V48 H0 Z" fill="url(#chartGrad)" />
                            <path d="M0,40 Q40,35 70,30 T140,20 T210,15 T280,5" fill="none" stroke="#F492B7" strokeWidth="2" />
                        </svg>
                    </div>

                    {/* CLAIM BUTTON - exact match from CreatorRewardsCard */}
                    <button className="w-full px-5 py-3 bg-[#10B981] text-white font-black text-sm rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-wide">
                        💰 Claim 100 SOL
                    </button>
                </div>
            </div>
        </div>
    );

    const content = [
        {
            title: "1) Connect Wallet",
            desc: "Link your Solana wallet (Phantom, Solflare, etc.) and fund it with SOL. Takes 10 seconds and you're ready to trade.",
            visual: <VisualConnectWallet />
        },
        {
            title: "2) Buy YES or NO",
            desc: "Pick any market. Think it'll happen? Buy YES. Think it won't? Buy NO. Prices move in real-time as traders bet.",
            visual: <VisualBuyShares />
        },
        {
            title: "3) Sell & Profit",
            desc: "Sell anytime to lock in gains, or hold until the market resolves. Winners get paid, losers get nothing. Simple.",
            visual: <VisualProfit />
        },
        {
            title: "4) Create a Market",
            desc: "Got a spicy question? Create your own market in seconds. Set the outcomes, add a banner, and deploy it live on Solana.",
            visual: <VisualCreateMarket />
        },
        {
            title: "5) Earn From Fees",
            desc: "As a market creator, you earn 50% of ALL trading fees on your market. More volume = more passive income. Forever.",
            visual: <VisualFeeEarnings />
        }
    ];

    return (
        <>
            {/* Inyección de estilos CSS */}
            <style dangerouslySetInnerHTML={{ __html: customStyles }} />

            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl overflow-hidden">

                {/* Estrella Grande y Escurridiza */}
                <EscapingStar />

                {/* MODAL MAIN CONTAINER */}
                <div className="relative w-full max-w-[420px] bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 z-20">

                    {/* Close Button */}
                    <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-30">
                        <X size={20} />
                    </button>

                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[#F492B7] to-purple-500 transition-all duration-500 ease-out" style={{ width: `${((step + 1) / 5) * 100}%` }} />

                    <div className="p-8 md:p-10 flex flex-col items-center text-center">

                        {/* Visual Container */}
                        <div className="mb-8 w-full h-40 bg-white/[0.02] rounded-3xl border border-white/5 flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                            {content[step].visual}
                        </div>

                        <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-4 leading-none">
                            {content[step].title}
                        </h3>

                        <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10 min-h-[80px]">
                            {content[step].desc}
                        </p>

                        <button
                            onClick={handleNext}
                            className="w-full py-4 bg-[#F492B7] text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,146,183,0.2)] text-xs"
                        >
                            {step === 4 ? "Start Trading" : "Next Step"}
                        </button>

                        {/* Dots Indicator */}
                        <div className="flex gap-2 mt-8">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'bg-[#F492B7] w-8' : 'bg-white/10 w-2'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}