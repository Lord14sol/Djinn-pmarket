'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import MarketCard from '@/components/MarketCard';

export default function Home() {
  // Integramos sus mercados en un estado para que sea dinámico
  const [markets, setMarkets] = useState([
    {
      id: 1,
      title: "Will Argentina be finalist on the FIFA World Cup 2026?",
      icon: "🇦🇷",
      chance: 45,
      volume: "$12.5M",
      endDate: new Date('2026-07-15'),
      slug: "argentina-world-cup-2026"
    },
    {
      id: 2,
      title: "Will Bitcoin reach ATH on 2026?",
      icon: "₿",
      chance: 82,
      volume: "$45.2M",
      endDate: new Date('2026-12-31'),
      slug: "btc-hit-150k"
    },
    {
      id: 3,
      title: "Will PumpFun do a airdrop on 2026?",
      icon: "💊",
      chance: 91,
      volume: "$8.1M",
      endDate: new Date('2026-06-01'),
      slug: "pumpfun-airdrop-2026"
    },
    {
      id: 4,
      title: "Nothing ever happens?",
      icon: "🥱",
      chance: 99,
      volume: "$2.4M",
      endDate: new Date(Date.now() + 1000000000),
      slug: "nothing-ever-happens"
    },
    {
      id: 5,
      title: "Will Rockstar Games delay GTA 6 on 2026?",
      icon: "🎮",
      chance: 55,
      volume: "$15.3M",
      endDate: new Date('2026-01-10'),
      slug: "gta-6-delay"
    },
    {
      id: 6,
      title: "Will China invade Taiwan?",
      icon: "🇨🇳",
      chance: 12,
      volume: "$33.1M",
      endDate: new Date('2026-12-31'),
      slug: "china-taiwan-invasion"
    },
    {
      id: 7,
      title: "Highest temperature in Buenos Aires today?",
      icon: "☀️",
      chance: 75,
      volume: "$500K",
      endDate: new Date(Date.now() + (12 * 60 * 60 * 1000)),
      slug: "buenos-aires-temperature"
    },
    {
      id: 8,
      title: "Will Trump tweet about Djinn?",
      icon: "🇺🇸",
      chance: 5,
      volume: "$1.2M",
      endDate: new Date('2026-11-05'),
      slug: "trump-djinn-tweet"
    }
  ]);

  // Esta función es el "portal" que recibe el mercado desde el Hero
  const handleCreateMarket = (newMarket: any) => {
    // Lo ponemos al principio del array ([nuevo, ...viejos])
    setMarkets((prev) => [newMarket, ...prev]);
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-[#F492B7] selection:text-black">
      <Navbar />

      {/* Pasamos la función al Hero para que sepa dónde enviar el nuevo pool */}
      <Hero onMarketCreated={handleCreateMarket} />

      <section className="px-6 md:px-12 pb-20 max-w-[1600px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-black mb-8 flex items-center gap-3 italic"
          style={{ fontFamily: 'var(--font-adriane), serif' }}>
          Trending Markets
          <span className="text-sm font-normal text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
            {markets.length} Live
          </span>
        </h2>

        {/* La cuadrícula se actualiza sola al añadir un mercado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {markets.map((market) => (
            <MarketCard
              key={market.id}
              title={market.title}
              icon={typeof market.icon === 'string' && market.icon.startsWith('data:') ? (
                <img src={market.icon} className="w-10 h-10 object-cover rounded-lg" alt="" />
              ) : market.icon}
              chance={market.chance}
              volume={market.volume}
              endDate={market.endDate}
              slug={market.slug}
            />
          ))}
        </div>
      </section>
    </main>
  );
}