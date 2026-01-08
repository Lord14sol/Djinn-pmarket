'use client';

import React, { useState, useEffect } from 'react';
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

    const [market, setMarket] = useState<any>(null);
    const [betAmount, setBetAmount] = useState('');
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO' | null>(null);

    useEffect(() => {
        // 1. Primero buscamos en la data fija
        let foundMarket = marketData[slug];

        // 2. Si no está, buscamos en los creados por el Lord (LocalStorage)
        if (!foundMarket) {
            const savedMarkets = localStorage.getItem('djinn_markets');
            if (savedMarkets) {
                const customMarkets = JSON.parse(savedMarkets);
                foundMarket = customMarkets.find((m: any) => m.slug === slug);

                // Si lo encontramos en los creados, mapeamos los precios que no vienen por defecto
                if (foundMarket) {
                    foundMarket = {
                        ...foundMarket,
                        yesPrice: foundMarket.chance || 50,
                        noPrice: 100 - (foundMarket.chance || 50),
                        description: "New market manifested by a Djinn Master. Predictions are live."
                    };
                }
            }
        }

        // 3. Fallback final: Si nada funciona, creamos uno temporal basado en el slug para no dar error
        if (!foundMarket) {
            foundMarket = {
                title: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                icon: "🔮",
                yesPrice: 50,
                noPrice: 50,
                volume: "$0",
                description: "Predicting the future of this unique event."
            };
        }

        setMarket(foundMarket);
    }, [slug]);

    if (!market) return <div className="min-h-screen bg-black" />;

    const potentialPayout = selectedSide && betAmount
        ? (parseFloat(betAmount) * (100 / (selectedSide === 'YES' ? market.yesPrice : market.noPrice))).toFixed(2)
        : "0.00";

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#F492B7] selection:text-black font-sans">
            <Navbar />
            <div className="max-w-6xl mx-auto pt-32 px-6">

                {/* Header Dinámico - Títulos Normales como pidió */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-12 border-b border-white/5 pb-12">
                    {typeof market.icon === 'string' && market.icon.startsWith('data:') ? (
                        <img src={market.icon} className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-[2.5rem] shadow-[0_0_40px_rgba(255,255,255,0.05)]" alt="" />
                    ) : (
                        <div className="text-8xl md:text-9xl">{market.icon}</div>
                    )}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-[0.9]">{market.title}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                            <span className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">{market.volume} VOL</span>
                            <span className="bg-[#F492B7]/10 text-[#F492B7] px-4 py-2 rounded-xl border border-[#F492B7]/20">Active Market</span>
                            <span className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">Ends 2026</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pb-20">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-[#0B0E14] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
                            <h2 className="text-xs font-black mb-6 text-[#F492B7] uppercase tracking-[0.3em]">Market Specifications</h2>
                            <p className="text-gray-400 leading-relaxed text-xl font-medium">{market.description}</p>
                        </div>
                        <div className="h-80 bg-[#0B0E14] rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-gray-700 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-t from-[#F492B7]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-3xl mb-2">📊</span>
                            <span className="text-xs font-black uppercase tracking-widest italic opacity-40">Price Chart Analysis Loading</span>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-[#0B0E14] border border-white/10 p-8 rounded-[2.5rem] sticky top-32 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-8 text-center">Execution Terminal</h3>

                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <button
                                    onClick={() => setSelectedSide('YES')}
                                    className={`p-6 rounded-2xl border-2 transition-all duration-300 ${selectedSide === 'YES' ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20'}`}
                                >
                                    <div className="text-[10px] font-black mb-2 uppercase tracking-widest">Buy YES</div>
                                    <div className="text-3xl font-black">{market.yesPrice}¢</div>
                                </button>
                                <button
                                    onClick={() => setSelectedSide('NO')}
                                    className={`p-6 rounded-2xl border-2 transition-all duration-300 ${selectedSide === 'NO' ? 'bg-red-500 border-red-500 text-black shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20'}`}
                                >
                                    <div className="text-[10px] font-black mb-2 uppercase tracking-widest">Buy NO</div>
                                    <div className="text-3xl font-black">{market.noPrice}¢</div>
                                </button>
                            </div>

                            <div className="mb-8">
                                <div className="flex justify-between text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest px-1">
                                    <span>Investment</span>
                                    <span className="text-[#F492B7]">Balance: 0.00 SOL</span>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-black border border-white/10 rounded-2xl p-6 text-2xl font-black focus:border-[#F492B7] outline-none transition-all placeholder:text-gray-800"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 font-black text-xl">$</span>
                                </div>
                            </div>

                            <button className="w-full py-6 bg-[#F492B7] text-black font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_40px_rgba(244,146,183,0.2)] text-xl tracking-tighter uppercase">
                                Confirm Trade
                            </button>

                            {selectedSide && (
                                <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
                                    <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-1">Potential Payout</span>
                                    <span className="text-emerald-400 font-black text-4xl tracking-tighter">${potentialPayout}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}