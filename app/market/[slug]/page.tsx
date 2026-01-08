'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

const marketData: Record<string, any> = {
    'argentina-world-cup-2026': {
        title: "Will Argentina be finalist on the FIFA World Cup 2026?",
        icon: "🇦🇷", yesPrice: 45, noPrice: 55, volume: "$12.5M",
        description: "Se resuelve YES si Argentina juega la final.",
    },
    'btc-hit-150k': {
        title: 'Will Bitcoin reach ATH on 2026?',
        icon: '₿', yesPrice: 82, noPrice: 18, volume: '$45.2M',
        description: 'Resolves YES if BTC breaks its previous record.',
    },
    'pumpfun-airdrop-2026': {
        title: "Will PumpFun do a airdrop on 2026?",
        icon: "💊", yesPrice: 91, noPrice: 9, volume: "$8.1M",
        description: "Resolves YES if a token is distributed.",
    },
    'nothing-ever-happens': {
        title: "Nothing ever happens?",
        icon: "🥱", yesPrice: 99, noPrice: 1, volume: "$2.4M",
        description: "The ultimate bet on stability.",
    },
    'gta-6-delay': {
        title: "Will Rockstar Games delay GTA 6 on 2026?",
        icon: "🎮", yesPrice: 55, noPrice: 45, volume: "$15.3M",
        description: "Resolves YES if Rockstar officially announces a delay.",
    },
    'china-taiwan-invasion': {
        title: "Will China invade Taiwan?",
        icon: "🇨🇳", yesPrice: 12, noPrice: 88, volume: "$33.1M",
        description: "Geopolitical resolution based on international news.",
    },
    'buenos-aires-temperature': {
        title: "Highest temperature in Buenos Aires today?",
        icon: "☀️", yesPrice: 75, noPrice: 25, volume: "$500K",
        description: "Resolves based on SMN official records.",
    },
    'trump-djinn-tweet': {
        title: "Will Trump tweet about Djinn?",
        icon: "🇺🇸", yesPrice: 5, noPrice: 95, volume: "$1.2M",
        description: "Resolves YES if 'Djinn' is mentioned by Trump on X.",
    }
};

export default function MarketPage() {
    const params = useParams();
    const slug = params.slug as string;

    // LA CLAVE: Buscar el market por el slug real
    const market = marketData[slug];

    const [betAmount, setBetAmount] = useState('');
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO' | null>(null);

    // Si el slug no existe en la lista, mostramos un error en lugar de Bitcoin
    if (!market) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
                <h1 className="text-4xl font-bold mb-4">Market Not Found</h1>
                <p className="text-gray-500">Slug: {slug}</p>
                <a href="/" className="mt-8 text-[#F492B7] underline">Return Home</a>
            </div>
        );
    }

    const potentialPayout = selectedSide && betAmount
        ? (parseFloat(betAmount) * (100 / (selectedSide === 'YES' ? market.yesPrice : market.noPrice))).toFixed(2)
        : "0.00";

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#F492B7] selection:text-black">
            <Navbar />
            <div className="max-w-6xl mx-auto pt-32 px-6">

                {/* Header Dinámico */}
                <div className="flex items-center gap-6 mb-12 border-b border-white/10 pb-12">
                    <div className="text-8xl animate-bounce-slow">{market.icon}</div>
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter mb-4">{market.title}</h1>
                        <div className="flex gap-4 text-gray-400 font-mono text-sm">
                            <span className="bg-white/5 px-3 py-1 rounded-full">{market.volume} VOL</span>
                            <span className="bg-white/5 px-3 py-1 rounded-full">ACTIVE</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* INFO */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                            <h2 className="text-xl font-bold mb-4 text-[#F492B7]">About this market</h2>
                            <p className="text-gray-400 leading-relaxed text-lg">{market.description}</p>
                        </div>
                        <div className="h-64 bg-gradient-to-b from-white/5 to-transparent rounded-3xl border border-white/5 flex items-center justify-center text-gray-600 italic">
                            Price Chart Loading...
                        </div>
                    </div>

                    {/* SIDEBAR TRADING */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl sticky top-32">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-6 text-center">Place Trade</h3>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button
                                    onClick={() => setSelectedSide('YES')}
                                    className={`p-4 rounded-2xl border-2 transition-all ${selectedSide === 'YES' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-transparent text-gray-500'}`}
                                >
                                    <div className="text-xs font-bold mb-1">YES</div>
                                    <div className="text-2xl font-black">{market.yesPrice}¢</div>
                                </button>
                                <button
                                    onClick={() => setSelectedSide('NO')}
                                    className={`p-4 rounded-2xl border-2 transition-all ${selectedSide === 'NO' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-transparent text-gray-500'}`}
                                >
                                    <div className="text-xs font-bold mb-1">NO</div>
                                    <div className="text-2xl font-black">{market.noPrice}¢</div>
                                </button>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase">
                                    <span>Amount</span>
                                    <span className="text-[#F492B7]">Balance: 0.00 SOL</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-xl font-bold focus:border-[#F492B7] outline-none transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
                                </div>
                            </div>

                            <button className="w-full py-4 bg-[#F492B7] text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(244,146,183,0.3)]">
                                CONFIRM TRADE
                            </button>

                            {selectedSide && (
                                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-gray-500 text-sm font-bold">Potential Payout:</span>
                                    <span className="text-emerald-400 font-black text-xl">${potentialPayout}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}