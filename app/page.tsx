'use client';

import { useState, useEffect } from 'react';
import Hero from '@/components/Hero';
import MarketCard from '@/components/MarketCard';
import { useCategory } from '@/lib/CategoryContext';


export default function Home() {
  const { activeCategory, activeSubcategory } = useCategory();

  // 1. Mercados iniciales con categorías
  const initialStaticMarkets = [
    {
      id: 1,
      title: "Will Argentina be finalist on the FIFA World Cup 2026?",
      icon: "🇦🇷",
      chance: 45,
      volume: "$12.5M",
      type: 'binary',
      category: 'Sports',
      endDate: new Date('2026-07-15'),
      slug: "argentina-world-cup-2026",
      createdAt: Date.now() - 86400000 * 5 // 5 días atrás
    },
    {
      id: 2,
      title: "Will Bitcoin reach ATH on 2026?",
      icon: "₿",
      chance: 82,
      volume: "$45.2M",
      type: 'binary',
      category: 'Crypto',
      endDate: new Date('2026-12-31'),
      slug: "btc-hit-150k",
      createdAt: Date.now() - 86400000 * 3
    },
    {
      id: 3,
      title: "Will PumpFun do a airdrop on 2026?",
      icon: "💊",
      chance: 91,
      volume: "$8.1M",
      type: 'binary',
      category: 'Crypto',
      endDate: new Date('2026-06-01'),
      slug: "pumpfun-airdrop-2026",
      createdAt: Date.now() - 86400000 * 1
    },
    {
      id: 9,
      title: "WHO WILL WIN THE WORLD CUP?",
      icon: "🏆",
      type: 'multiple',
      category: 'Sports',
      options: [
        { id: 1, name: "Argentina" },
        { id: 2, name: "Chile" },
        { id: 3, name: "Brasil" },
        { id: 4, name: "Bolivia" }
      ],
      volume: "$450K",
      endDate: new Date('2026-07-15'),
      slug: "world-cup-winner-multiple",
      createdAt: Date.now() - 86400000 * 7
    },
    {
      id: 4,
      title: "Nothing ever happens?",
      icon: "🥱",
      chance: 99,
      volume: "$2.4M",
      type: 'binary',
      category: 'Culture',
      endDate: new Date(Date.now() + 1000000000),
      slug: "nothing-ever-happens",
      createdAt: Date.now() - 86400000 * 10
    },
    {
      id: 5,
      title: "Will Rockstar Games delay GTA 6 on 2026?",
      icon: "🎮",
      chance: 55,
      volume: "$15.3M",
      type: 'binary',
      category: 'Gaming',
      endDate: new Date('2026-01-10'),
      slug: "gta-6-delay",
      createdAt: Date.now() - 3600000 // 1 hora - NUEVO
    },
    {
      id: 6,
      title: "Will China invade Taiwan?",
      icon: "🇨🇳",
      chance: 12,
      volume: "$33.1M",
      type: 'binary',
      category: 'Politics',
      region: 'Asia',
      endDate: new Date('2026-12-31'),
      slug: "china-taiwan-invasion",
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: 7,
      title: "Will GPT-5 be released in 2026?",
      icon: "🤖",
      chance: 75,
      volume: "$500K",
      type: 'binary',
      category: 'AI',
      endDate: new Date('2026-12-31'),
      slug: "gpt-5-release",
      createdAt: Date.now() - 7200000
    },
    {
      id: 8,
      title: "Will Trump tweet about Djinn?",
      icon: "🇺🇸",
      chance: 5,
      volume: "$1.2M",
      type: 'binary',
      category: 'Politics',
      region: 'North America',
      endDate: new Date('2026-11-05'),
      slug: "trump-djinn-tweet",
      createdAt: Date.now() - 86400000 * 4
    },
    {
      id: 10,
      title: "Will Brazil's economy grow 5% in 2026?",
      icon: "🇧🇷",
      chance: 35,
      volume: "$2.1M",
      type: 'binary',
      category: 'Earth',
      region: 'South America',
      endDate: new Date('2026-12-31'),
      slug: "brazil-economy-growth",
      createdAt: Date.now() - 86400000 * 3
    },
    {
      id: 11,
      title: "Will the EU ban TikTok?",
      icon: "🇪🇺",
      chance: 22,
      volume: "$5.8M",
      type: 'binary',
      category: 'Earth',
      region: 'Europe',
      endDate: new Date('2026-06-01'),
      slug: "eu-tiktok-ban",
      createdAt: Date.now() - 86400000 * 1
    },
    {
      id: 12,
      title: "Will Japan host the Olympics again by 2030?",
      icon: "🇯🇵",
      chance: 15,
      volume: "$800K",
      type: 'binary',
      category: 'Earth',
      region: 'Asia',
      endDate: new Date('2026-12-31'),
      slug: "japan-olympics-2030",
      createdAt: Date.now() - 86400000 * 6
    },
    {
      id: 13,
      title: "Will Australia become carbon neutral by 2030?",
      icon: "🇦🇺",
      chance: 28,
      volume: "$1.5M",
      type: 'binary',
      category: 'Earth',
      region: 'Oceania',
      endDate: new Date('2026-12-31'),
      slug: "australia-carbon-neutral",
      createdAt: Date.now() - 86400000 * 8
    }
  ];

  const [markets, setMarkets] = useState<any[]>(initialStaticMarkets);

  // 2. Cargamos del LocalStorage al iniciar
  useEffect(() => {
    try {
      const savedMarkets = localStorage.getItem('djinn_markets');
      if (savedMarkets) {
        const customMarkets = JSON.parse(savedMarkets);
        setMarkets((prev) => {
          const staticIds = new Set(initialStaticMarkets.map(m => m.id));
          const uniqueCustom = customMarkets.filter((m: any) => !staticIds.has(m.id));
          return [...uniqueCustom, ...initialStaticMarkets];
        });
      }
    } catch (e) {
      console.error("Error loading markets", e);
    }
  }, []);

  // 3. FUNCIÓN DE CREACIÓN PROTEGIDA
  const handleCreateMarket = (newMarket: any) => {
    // Agregar createdAt si no existe
    const marketWithTimestamp = {
      ...newMarket,
      createdAt: newMarket.createdAt || Date.now(),
      category: newMarket.category || 'Trending'
    };
    setMarkets(prev => [marketWithTimestamp, ...prev]);

    try {
      const savedMarkets = JSON.parse(localStorage.getItem('djinn_markets') || '[]');
      const updatedSaved = [marketWithTimestamp, ...savedMarkets];
      localStorage.setItem('djinn_markets', JSON.stringify(updatedSaved));
    } catch (error) {
      console.error("LocalStorage is full!", error);
      alert("Mi Lord, local memory is full. Market created only for this session.");
    }
  };

  // 4. FILTRAR MARKETS SEGÚN CATEGORÍA Y SUBCATEGORÍA
  const now = Date.now();
  const oneDayAgo = now - 86400000; // 24 horas

  const filteredMarkets = markets.filter(market => {
    if (activeCategory === 'Trending') return true;
    if (activeCategory === 'New') {
      return market.createdAt && market.createdAt > oneDayAgo;
    }
    if (activeCategory === 'Earth') {
      // Si hay subcategoría seleccionada, filtrar por región
      if (activeSubcategory) {
        return market.region === activeSubcategory;
      }
      // Si no hay subcategoría, mostrar todos los de Earth
      return market.category === 'Earth' || market.region;
    }
    return market.category === activeCategory;
  });

  // Ordenar: New por fecha, otros por volumen
  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    if (activeCategory === 'New') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    // Trending: ordenar por volumen
    const volA = parseFloat(a.volume?.replace(/[$,M]/g, '') || '0');
    const volB = parseFloat(b.volume?.replace(/[$,M]/g, '') || '0');
    return volB - volA;
  });

  // Título dinámico según categoría (sin emojis)
  const getCategoryTitle = () => {
    if (activeCategory === 'Earth' && activeSubcategory) {
      return `${activeSubcategory}`;
    }
    switch (activeCategory) {
      case 'New': return 'New';
      case 'Trending': return 'Trending';
      case 'Earth': return 'Earth';
      case 'Crypto': return 'Crypto';
      case 'Sports': return 'Sports';
      case 'Politics': return 'Politics';
      case 'Tech': return 'Tech';
      case 'AI': return 'AI';
      case 'Gaming': return 'Gaming';
      case 'Science': return 'Science';
      case 'Finance': return 'Finance';
      case 'Culture': return 'Culture';
      case 'Climate': return 'Climate';
      case 'Space': return 'Space';
      case 'Movies': return 'Movies';
      case 'Music': return 'Music';
      case 'Social Media': return 'Social Media';
      case 'History': return 'History';
      case 'Mentions': return 'Mentions';
      default: return activeCategory;
    }
  };

  return (
    <div className="text-white font-sans selection:bg-[#F492B7] selection:text-black">

      {/* Hero Section con Callback para crear mercados */}
      <Hero onMarketCreated={handleCreateMarket} />

      <section className="px-6 md:px-12 pb-20 max-w-[1600px] mx-auto mt-10">
        <h2 className="text-3xl font-bold mb-8 tracking-tight text-white">
          {getCategoryTitle()}
        </h2>

        {sortedMarkets.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl">
            <p className="text-gray-500 text-xl font-bold uppercase tracking-widest">No markets in this category yet</p>
            <p className="text-gray-600 mt-2">Create one to be the first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedMarkets.map((market, index) => (
              <MarketCard
                key={`${market.id}-${index}`}
                {...market}
                isNew={market.createdAt && market.createdAt > oneDayAgo}
              />
            ))}
          </div>
        )}
      </section>


    </div>
  );
}