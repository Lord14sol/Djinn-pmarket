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
        if (step < 2) setStep(step + 1);
        else {
            setStep(0);
            onClose();
        }
    };

    // VISUAL 1: MINI BITCOIN CARD
    const VisualStep1 = () => (
        <div className="w-full h-full flex items-center justify-center scale-90">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-3 w-64 shadow-2xl relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-[#F492B7] text-[6px] text-black px-1 rounded font-black uppercase">Trending</div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-[#F7931A] rounded-full flex items-center justify-center text-white text-[10px] font-bold">₿</div>
                    <span className="text-white font-black italic text-sm">bitcoin</span>
                </div>
                <div className="text-[8px] font-bold text-gray-300 mb-2 uppercase">Price on 2026?</div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center bg-white/5 p-1 rounded border border-white/5">
                        <span className="text-[8px] text-white font-bold">150k</span>
                        <div className="flex gap-1">
                            <span className="bg-[#10B981]/20 text-[#10B981] text-[6px] px-1 rounded border border-[#10B981]/30">YES</span>
                            <span className="bg-red-500/10 text-red-500 text-[6px] px-1 rounded border border-red-500/20">NO</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-1 rounded border border-white/5">
                        <span className="text-[8px] text-white font-bold">180k</span>
                        <div className="flex gap-1">
                            <span className="bg-[#10B981]/20 text-[#10B981] text-[6px] px-1 rounded border border-[#10B981]/30">YES</span>
                            <span className="bg-red-500/10 text-red-500 text-[6px] px-1 rounded border border-red-500/20">NO</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // VISUAL 2: WALLET CONNECTION (SIN LÍNEA)
    const VisualStep2 = () => (
        <div className="w-full h-full flex items-center justify-center relative isolation-auto">

            {/* Wallet Circle */}
            <div className="relative z-20 w-20 h-20 bg-[#0A0A0A] rounded-full flex items-center justify-center border border-[#9945FF]/50 animate-pulse shadow-[0_0_20px_rgba(153,69,255,0.3)]">
                <Wallet className="w-8 h-8 text-[#9945FF]" />
            </div>

            {/* --- LÍNEA ELIMINADA AQUÍ --- */}

            {/* SOL Coin */}
            <div className="absolute right-10 top-8 animate-subtle-bounce z-30">
                <img
                    src="https://assets.coingecko.com/coins/images/4128/large/solana.png?1640133422"
                    alt="SOL 3D Coin"
                    className="w-9 h-9 drop-shadow-[0_0_15px_rgba(153,69,255,0.6)]"
                />
            </div>
        </div>
    );

    // VISUAL 3: PROFIT
    const VisualStep3 = () => (
        <div className="w-full h-full flex items-center justify-center flex-col gap-2">
            <div className="text-[#10B981] text-3xl font-black drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                +$420.00
            </div>
            <div className="flex gap-2">
                <div className="bg-[#F492B7] text-black text-[10px] font-black px-3 py-1 rounded-lg">SELL YES</div>
                <div className="bg-white/10 text-gray-400 text-[10px] font-black px-3 py-1 rounded-lg">HOLD</div>
            </div>
            <div className="w-32 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#10B981] w-2/3 animate-[shimmer_2s_infinite]"></div>
            </div>
        </div>
    );

    const content = [
        {
            title: "1) Buy YES or NO",
            desc: "Depending on your prediction. Buying shares is like betting on the outcome, odds shift in real time as other traders bet.",
            visual: <VisualStep1 />
        },
        {
            title: "2) Connect Wallet",
            desc: "Connect your wallet, fund SOL then you are ready to bet.",
            visual: <VisualStep2 />
        },
        {
            title: "3) Sell & Profit",
            desc: "Sell YES or NO shares any time or wait until market ends to redeem winning shares. Create an account and place your bet.",
            visual: <VisualStep3 />
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
                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[#F492B7] to-purple-500 transition-all duration-500 ease-out" style={{ width: `${((step + 1) / 3) * 100}%` }} />

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
                            {step === 2 ? "Start Trading" : "Next Step"}
                        </button>

                        {/* Dots Indicator */}
                        <div className="flex gap-2 mt-8">
                            {[0, 1, 2].map((i) => (
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