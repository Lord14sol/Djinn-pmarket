'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import MarketCard from '@/components/MarketCard';

export default function Home() {
  // 1. Mercados iniciales (Estructura Binary por defecto)
  const initialStaticMarkets = [
    {
      id: 1,
      title: "Will Argentina be finalist on the FIFA World Cup 2026?",
      icon: "🇦🇷",
      chance: 45,
      volume: "$12.5M",
      type: 'binary',
      endDate: new Date('2026-07-15'),
      slug: "argentina-world-cup-2026"
    },
    {
      id: 2,
      title: "Will Bitcoin reach ATH on 2026?",
      icon: "₿",
      chance: 82,
      volume: "$45.2M",
      type: 'binary',
      endDate: new Date('2026-12-31'),
      slug: "btc-hit-150k"
    },
    {
      id: 3,
      title: "Will PumpFun do a airdrop on 2026?",
      icon: "💊",
      chance: 91,
      volume: "$8.1M",
      type: 'binary',
      endDate: new Date('2026-06-01'),
      slug: "pumpfun-airdrop-2026"
    },
    {
      id: 9,
      title: "WHO WILL WIN THE WORLD CUP?",
      icon: "🏆",
      type: 'multiple', // REFERENCIA PARA EL LORD
      options: [
        { id: 1, name: "Argentina" },
        { id: 2, name: "Chile" },
        { id: 3, name: "Brasil" },
        { id: 4, name: "Bolivia" }
      ],
      volume: "$450K",
      endDate: new Date('2026-07-15'),
      slug: "world-cup-winner-multiple"
    },
    {
      id: 4,
      title: "Nothing ever happens?",
      icon: "🥱",
      chance: 99,
      volume: "$2.4M",
      type: 'binary',
      endDate: new Date(Date.now() + 1000000000),
      slug: "nothing-ever-happens"
    },
    {
      id: 5,
      title: "Will Rockstar Games delay GTA 6 on 2026?",
      icon: "🎮",
      chance: 55,
      volume: "$15.3M",
      type: 'binary',
      endDate: new Date('2026-01-10'),
      slug: "gta-6-delay"
    },
    {
      id: 6,
      title: "Will China invade Taiwan?",
      icon: "🇨🇳",
      chance: 12,
      volume: "$33.1M",
      type: 'binary',
      endDate: new Date('2026-12-31'),
      slug: "china-taiwan-invasion"
    },
    {
      id: 7,
      title: "Highest temperature in Buenos Aires today?",
      icon: "☀️",
      chance: 75,
      volume: "$500K",
      type: 'binary',
      endDate: new Date(Date.now() + (12 * 60 * 60 * 1000)),
      slug: "buenos-aires-temperature"
    },
    {
      id: 8,
      title: "Will Trump tweet about Djinn?",
      icon: "🇺🇸",
      chance: 5,
      volume: "$1.2M",
      type: 'binary',
      endDate: new Date('2026-11-05'),
      slug: "trump-djinn-tweet"
    }
  ];

  const [markets, setMarkets] = useState<any[]>(initialStaticMarkets);

  // 2. Cargamos del LocalStorage al iniciar
  useEffect(() => {
    try {
      const savedMarkets = localStorage.getItem('djinn_markets');
      if (savedMarkets) {
        const customMarkets = JSON.parse(savedMarkets);
        // Combinamos manteniendo los creados por el Lord al principio
        setMarkets([...customMarkets, ...initialStaticMarkets]);
      }
    } catch (e) {
      console.error("Error loading markets", e);
    }
  }, []);

  // 3. FUNCIÓN DE CREACIÓN PROTEGIDA
  const handleCreateMarket = (newMarket: any) => {
    setMarkets([newMarket, ...markets]);

    try {
      const savedMarkets = JSON.parse(localStorage.getItem('djinn_markets') || '[]');
      const updatedSaved = [newMarket, ...savedMarkets];
      localStorage.setItem('djinn_markets', JSON.stringify(updatedSaved));
    } catch (error) {
      console.error("LocalStorage is full!", error);
      alert("Mi Lord, local memory is full. Market created only for this session.");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-[#F492B7] selection:text-black">
      <Navbar />

      <Hero onMarketCreated={handleCreateMarket} />

      <section className="px-6 md:px-12 pb-20 max-w-[1600px] mx-auto">
        <h2 className="text-4xl font-black mb-10 flex items-center gap-4 tracking-tight uppercase italic">
          Trending Markets
          <span className="text-xs font-bold text-gray-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 uppercase tracking-widest not-italic">
            {markets.length} Live
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {markets.map((market) => (
            <MarketCard
              key={market.id}
              {...market} // <-- CLAVE: Pasamos type y options automáticamente
            />
          ))}
        </div>
      </section>
    </main>
  );
}