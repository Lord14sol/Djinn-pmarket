import React from 'react';
import Hero from '@/components/Hero';
import MarketCard from '@/components/MarketCard';

const pools = [
  {
    id: 1,
    type: 'binary' as const,
    category: "Crypto",
    title: "Will Bitcoin reach $150,000 in 2025?",
    volume: 8200000,
    outcomes: [
      { label: 'No', percentage: 38, price: 38 },
      { label: 'Yes', percentage: 62, price: 62 }
    ],
    isTrending: true,
    timeLeft: "10h 38m 07s",
    isClosingSoon: true
  },
  // ... more markets
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <Hero />
      <div className="pt-2 px-6 pb-10 sm:px-10 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-white">
          Trending Markets
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <MarketCard key={pool.id} {...pool} />
          ))}
        </div>
      </div>
    </div>
  );
}