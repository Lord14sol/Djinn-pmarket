'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { AnimatePresence, motion } from 'framer-motion';
import Hero from '@/components/Hero';
import MarketCard from '@/components/MarketCard';
import { MarketGridSkeleton } from '@/components/ui/Skeletons';
import { useCategory } from '@/lib/CategoryContext';
import { getMarkets as getSupabaseMarkets, subscribeToMarkets } from '@/lib/supabase-db';
import { formatCompact } from '@/lib/utils';
import PumpEffect from '@/components/PumpEffect';
import { ADMIN_WALLETS } from '@/lib/whitelist';
import TheGreatPyramid from '@/components/TheGreatPyramid';

// Fresh start timestamp - hide markets created before this (filtering for clean view)
const FRESH_START_TIMESTAMP = process.env.NEXT_PUBLIC_FRESH_START_TIMESTAMP
  ? parseInt(process.env.NEXT_PUBLIC_FRESH_START_TIMESTAMP)
  : 1769193287079;


export default function Home() {
  const { activeCategory, activeSubcategory } = useCategory();
  const { publicKey } = useWallet();
  const router = useRouter();

  // 1. Mercados iniciales con categorías
  // 1. Mercados iniciales LIMPIOS (Solo se verán los creados por el usuario)
  const initialStaticMarkets: any[] = [];

  const [markets, setMarkets] = useState<any[]>(initialStaticMarkets);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Cargamos mercados de Supabase + fallback a estáticos
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        // Intentar cargar de Supabase
        // 1. Fetch Supabase
        const supabaseMarkets = await getSupabaseMarkets();
        let finalMarkets: any[] = [];

        // 2. Format Supabase Markets
        if (supabaseMarkets && supabaseMarkets.length > 0) {
          finalMarkets = supabaseMarkets.map((m, index) => ({
            id: m.id || `sb-${index}`,
            title: m.title,
            icon: m.banner_url || '🔮', // Use uploaded image as icon
            chance: Math.round((m.total_yes_pool / (m.total_yes_pool + m.total_no_pool + 1)) * 100) || 50,
            volume: `$${formatCompact(m.total_yes_pool + m.total_no_pool)}`,
            type: 'binary',
            category: (m as any).category || 'Trending',
            endDate: m.end_date ? new Date(m.end_date) : new Date('2026-12-31'),
            slug: m.slug,
            createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
            resolved: m.resolved,
            winningOutcome: m.winning_outcome,
            marketPDA: m.market_pda,
            yesTokenMint: m.yes_token_mint,
            noTokenMint: m.no_token_mint,
            resolutionSource: m.resolution_source
          }));
        }

        // 3. MERGE LOCAL STORAGE (Always check for pending markets)
        const createdMarkets = localStorage.getItem('djinn_created_markets');
        let localMarkets = [];
        if (createdMarkets) {
          try {
            localMarkets = JSON.parse(createdMarkets);
          } catch (e) { console.error("Error parsing local markets", e); }
        }

        // Dedupe: If local market slug/pda exists in Supabase, ignore local
        const pdaSet = new Set(finalMarkets.map(m => m.marketPDA));
        const slugSet = new Set(finalMarkets.map(m => m.slug));

        const uniqueLocal = localMarkets.filter((m: any) =>
          !pdaSet.has(m.marketPDA) && !slugSet.has(m.slug)
        );

        finalMarkets = [...uniqueLocal, ...finalMarkets];

        // 4. Fallback/Static if empty
        if (finalMarkets.length === 0) {
          console.log('ℹ️ No markets found, using defaults');
          finalMarkets = [...initialStaticMarkets];
        } else {
          // Append static if not enough? No, just keep static as "Trending" fillers if needed or separate
          // For now, let's append static to ensure grid isn't empty, but dedupe
          const existIds = new Set(finalMarkets.map(m => m.id));
          const uniqueStatic = initialStaticMarkets.filter(m => !existIds.has(m.id));
          finalMarkets = [...finalMarkets, ...uniqueStatic];
        }

        setMarkets(finalMarkets);
        console.log(`✅ Loaded ${finalMarkets.length} markets (Supabase + Local + Static)`);
      } catch (e) {
        console.error("Error loading markets from Supabase:", e);
        // Fallback to static + localStorage
        try {
          const createdMarkets = localStorage.getItem('djinn_created_markets');
          let customMarkets = [];
          if (createdMarkets) customMarkets = JSON.parse(createdMarkets);

          const staticIds = new Set(initialStaticMarkets.map(m => m.id));
          const uniqueCustom = customMarkets.filter((m: any) => !staticIds.has(m.id));
          setMarkets([...uniqueCustom, ...initialStaticMarkets]);
        } catch (localError) {
          console.error("Error with localStorage fallback:", localError);
        }
      } finally {
        setTimeout(() => setIsLoading(false), 300);
      }
    };

    loadMarkets();

    // NEW: Real-time subscription to markets table
    const channel = subscribeToMarkets((payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        console.log("🔴 LIVE: New market created!", payload.new);
        const newMarket = {
          id: payload.new.id,
          title: payload.new.title,
          chance: Math.round((payload.new.total_yes_pool / (payload.new.total_yes_pool + payload.new.total_no_pool + 1)) * 100) || 50,
          volume: `$${formatCompact(payload.new.total_yes_pool + payload.new.total_no_pool)}`,
          type: 'binary',
          category: payload.new.category || 'Trending',
          endDate: payload.new.end_date ? new Date(payload.new.end_date) : new Date('2026-12-31'),
          slug: payload.new.slug,
          createdAt: new Date(payload.new.created_at).getTime(),
          resolved: payload.new.resolved,
          winningOutcome: payload.new.winning_outcome,
          marketPDA: payload.new.market_pda,
          yesTokenMint: payload.new.yes_token_mint,
          noTokenMint: payload.new.no_token_mint,
          resolutionSource: payload.new.resolution_source,
          banner_url: payload.new.banner_url,
          icon: payload.new.banner_url,
          isNew: true,
          justArrived: true // Flag for pump animation (10s)
        };

        setMarkets(prev => [newMarket, ...prev]);

        // Remove pump flag after 10 seconds
        setTimeout(() => {
          setMarkets(prev => prev.map(m =>
            m.slug === newMarket.slug ? { ...m, justArrived: false } : m
          ));
        }, 10000);
      }
    });

    const handleMarketCreated = (event: any) => {
      if (event.detail) {
        console.log("⚡ Optimistic UI Update: New Market", event.detail);
        setMarkets(prev => [event.detail, ...prev]);
      } else {
        loadMarkets();
      }
    };

    // ESCUCHAR EVENTOS DE CREACIÓN GLOBAL
    window.addEventListener('storage', loadMarkets);
    window.addEventListener('market-created', handleMarketCreated);

    return () => {
      channel.unsubscribe();
      window.removeEventListener('storage', loadMarkets);
      window.removeEventListener('market-created', handleMarketCreated);
    };
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
    // Hide archived markets
    if ((market as any).is_archived) return false;

    // Hide old markets before fresh start timestamp
    if (FRESH_START_TIMESTAMP > 0 && (market.createdAt || 0) < FRESH_START_TIMESTAMP) {
      return false;
    }

    const age = now - (market.createdAt || 0);
    const oneHour = 3600000;
    const twelveHours = 43200000;
    const oneDay = 86400000;

    if (activeCategory === 'Trending') return true; // Show mix

    // NEW: Real-time feed (Everything sorted by newest)
    if (activeCategory === 'New') {
      return true;
    }

    // HOT: 1h - 12h range (High velocity zone)
    if (activeCategory === 'Hot') {
      return age > oneHour && age < twelveHours;
    }

    // STABLE: 24h+ (Consolidated markets)
    if (activeCategory === 'Stable') {
      return age > oneDay;
    }

    if (activeCategory === 'Earth') {
      if (activeSubcategory) return (market.region || '').toLowerCase() === activeSubcategory.toLowerCase();
      return (market.category || '').toLowerCase() === 'earth' || !!market.region;
    }
    return (market.category || '').toLowerCase() === activeCategory.toLowerCase();
  });

  // Sorting Logic
  const parseVolume = (volStr: string) => {
    if (!volStr) return 0;
    const clean = volStr.replace(/[$,]/g, '');
    const val = parseFloat(clean);
    if (clean.endsWith('K') || clean.endsWith('k')) return val * 1000;
    if (clean.endsWith('M') || clean.endsWith('m')) return val * 1000000;
    if (clean.endsWith('B') || clean.endsWith('b')) return val * 1000000000;
    return val;
  };

  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    // NEW: Strictly by Time (Newest First)
    if (activeCategory === 'New') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }

    // HOT & TRENDING: Volume * Velocity (Pyramid Algorithm)
    // Primary Sort: Total Volume (Descending)
    const volA = parseVolume(a.volume);
    const volB = parseVolume(b.volume);

    if (volB !== volA) {
      return volB - volA; // Higher volume first
    }

    // Secondary Sort: Newest First
    return (b.createdAt || 0) - (a.createdAt || 0);
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

  // Calculate top market for The Great Pyramid
  const topMarket = useMemo(() => {
    if (markets.length === 0) return null;
    const sorted = [...markets].sort((a, b) => {
      // Trending Boost for New Markets
      const isNewA = (Date.now() - (a.createdAt || 0)) < 3600000;
      const isNewB = (Date.now() - (b.createdAt || 0)) < 3600000;
      if (isNewA && !isNewB) return -1;
      if (!isNewA && isNewB) return 1;

      const volA = parseFloat(a.volume?.replace(/[$,MK]/g, '') || '0');
      const volB = parseFloat(b.volume?.replace(/[$,MK]/g, '') || '0');
      return volB - volA;
    });
    const top = sorted[0];
    return {
      title: top.title,
      slug: top.slug,
      icon: top.icon || '🔮',
      volume: top.volume || '$0',
      betsCount: Math.floor(Math.random() * 5000) + 500, // Mock for now
      chance: top.chance || 50,
      endDate: top.endDate
    };
  }, [markets]);



  return (
    <div className="min-h-screen w-full bg-transparent text-white font-sans selection:bg-[#F492B7] selection:text-black">

      {/* Hero Section con Callback para crear mercados */}
      <Hero onMarketCreated={handleCreateMarket} />

      {/* The Great Pyramid - Top Market Showcase */}
      {activeCategory === 'Trending' && topMarket && (
        <TheGreatPyramid topMarket={topMarket} />
      )}

      <section className="px-6 md:px-12 pb-20 max-w-[1600px] mx-auto mt-10">
        {!(activeCategory === 'Trending' && topMarket) && (
          <h2 className="text-3xl font-bold mb-8 tracking-tight text-white">
            {getCategoryTitle()}
          </h2>
        )}

        {isLoading ? (
          <MarketGridSkeleton count={8} />
        ) : sortedMarkets.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-white/10 rounded-3xl bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Pink Crystal Icon */}
              <div className="w-24 h-24 bg-gradient-to-br from-[#F492B7] to-[#FF007A] rounded-2xl rotate-45 flex items-center justify-center shadow-[0_0_60px_rgba(244,146,183,0.3)]">
                <span className="text-5xl -rotate-45">🔮</span>
              </div>

              <div>
                <p className="text-white text-2xl font-black uppercase tracking-widest">
                  No Markets Yet
                </p>
                <p className="text-gray-500 mt-3 text-lg">
                  Be the first to summon a prediction market
                </p>
              </div>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-create-modal'))}
                className="bg-[#F492B7] text-black text-lg font-black py-4 px-10 rounded-xl shadow-[0_0_30px_rgba(244,146,183,0.3)] hover:scale-105 active:scale-95 transition-all uppercase mt-4"
              >
                Create First Market
              </button>
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-white/10"
            >
              {sortedMarkets.map((market, index) => {
                const isPumping = (market as any).justArrived;

                return (
                  <motion.div
                    key={`${market.slug}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: 0.2,
                      delay: index * 0.03 // Stagger animation
                    }}
                    className="h-full"
                  >
                    <PumpEffect isActive={isPumping}>
                      <MarketCard
                        {...market}
                        isNew={market.createdAt && market.createdAt > oneDayAgo}
                      />
                    </PumpEffect>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </section>





    </div>
  );
}