'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Filter } from 'lucide-react';
import { useBinancePrice } from '@/hooks/useBinancePrice';
import dynamic from 'next/dynamic';

const Galaxy = dynamic(() => import('@/components/Galaxy'), { ssr: false });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const ASSETS = {
    BTC: { name: 'Bitcoin', symbol: 'BTC', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', color: '#F7931A' }, // Orange
    ETH: { name: 'Ethereum', symbol: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', color: '#2962FF' }, // Blue
    SOL: { name: 'Solana', symbol: 'SOL', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png', color: '#9945FF' }, // Purple
};

type AssetKey = keyof typeof ASSETS;
type IntervalKey = '15M' | '1H' | '4H' | '24H' | '1W';

interface ChronosMarket {
    id: string;
    asset: AssetKey;
    interval: IntervalKey;
    priceToBeat: number;
    startTime: number;
    endTime: number;
    roundNumber: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BINANCE HELPER
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchCandleOpen(symbol: string, interval: IntervalKey, startTime: number): Promise<number> {
    try {
        // Map Interval to Binance Format
        const map: Record<string, string> = { '15M': '15m', '1H': '1h', '4H': '4h', '24H': '1d', '1W': '1w' };
        const bInterval = map[interval];
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${bInterval}&startTime=${startTime}&limit=1`);
        const data = await res.json();
        // data[0] is [openTime, open, high, low, close, ...]
        if (data && data.length > 0) {
            return parseFloat(data[0][1]);
        }
    } catch (e) {
        console.error('Failed to fetch binance candle', e);
    }
    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Donut Chart Component
function DonutChart({ percent, color }: { percent: number, color: string }) {
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 64 64">
                {/* Background Circle */}
                <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    stroke="#F3F4F6"
                    strokeWidth="8"
                    fill="none"
                />
                {/* Progress Circle */}
                <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    stroke={color}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-sm font-black text-black leading-none">{Math.round(percent)}%</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Prob</span>
            </div>
        </div>
    );
}

function MarketCard({ market, currentPrice }: { market: ChronosMarket, currentPrice: number }) {
    const asset = ASSETS[market.asset];

    // Fallback to priceToBeat if currentPrice not yet loaded (0)
    const effectiveCurrentPrice = currentPrice || market.priceToBeat || 0;
    const effectivePriceToBeat = market.priceToBeat || currentPrice || 0;
    const priceDiff = effectiveCurrentPrice - effectivePriceToBeat;
    const isAbove = priceDiff >= 0;

    // Calculate Probability based on diff (0 diff = 50%)
    const percentDiff = effectivePriceToBeat > 0 ? (priceDiff / effectivePriceToBeat) * 100 : 0;
    const rawProb = 50 + (percentDiff * 40); // More sensitive multiplier
    const probability = Math.min(99, Math.max(1, rawProb));
    const finalProb = isAbove ? probability : (100 - probability);

    const endTimeLabel = new Date(market.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    return (
        <Link href={`/crypto/market/${market.id}`}>
            <motion.div
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group relative h-full flex flex-col justify-between"
            >
                {/* Header & Content */}
                <div className="p-6">
                    {/* Icon & Label */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-black bg-white p-1">
                                <img src={asset.icon} alt={asset.name} className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-black uppercase tracking-tight leading-none mb-1">{asset.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="px-2 py-0.5 rounded border border-black text-[10px] font-black uppercase tracking-widest"
                                        style={{ backgroundColor: market.interval === '15M' ? asset.color : 'white', color: market.interval === '15M' ? 'white' : 'black' }}
                                    >
                                        {market.interval}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Donut Probability */}
                        <DonutChart percent={isAbove ? probability : (100 - probability)} color={asset.color} />
                    </div>

                    {/* Title Description */}
                    <div className="mb-4">
                        <p className="text-sm font-black text-black leading-tight mb-1">
                            {asset.name} Up or Down?
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Ends at {endTimeLabel}
                        </p>
                    </div>

                    {/* Probability Bars / Sentiment (Where people are betting) */}
                    {/* Visual bar showing split */}
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex mb-1 border border-black/10">
                        <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${probability}%`, backgroundColor: isAbove ? '#10B981' : '#E5E7EB' }}
                        />
                        <div
                            className="h-full transition-all duration-500"
                            style={{ width: `${100 - probability}%`, backgroundColor: !isAbove ? '#F43F5E' : '#E5E7EB' }}
                        />
                    </div>
                    <div className="flex justify-between text-[9px] font-black uppercase text-gray-400 tracking-wider">
                        <span>Yes</span>
                        <span>No</span>
                    </div>

                </div>

                {/* Footer Buttons */}
                <div className="px-6 pb-6 pt-0 grid grid-cols-2 gap-3">
                    <div className="py-3 rounded-xl bg-emerald-500 text-white font-bold text-center text-xs lowercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2L10 7H2L6 2Z" fill="currentColor" /></svg>
                        up
                    </div>
                    <div className="py-3 rounded-xl bg-red-500 text-white font-bold text-center text-xs lowercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10L2 5H10L6 10Z" fill="currentColor" /></svg>
                        down
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function CryptoMajorsPage() {
    // Filter States
    const [selectedInterval, setSelectedInterval] = useState<IntervalKey | 'ALL'>('ALL');
    const [selectedAsset, setSelectedAsset] = useState<AssetKey | 'ALL'>('ALL');
    const [markets, setMarkets] = useState<ChronosMarket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Prices (Hoisted)
    const { price: btcPrice } = useBinancePrice('BTC', '15m');
    const { price: ethPrice } = useBinancePrice('ETH', '15m');
    const { price: solPrice } = useBinancePrice('SOL', '15m');
    const prices = { BTC: btcPrice, ETH: ethPrice, SOL: solPrice };

    // Generate markets on MOUNT to avoid hydration mismatch (flashing)
    // Generate markets on MOUNT to avoid hydration mismatch (flashing)
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            const now = Date.now();
            const generatedPromises: Promise<ChronosMarket>[] = [];
            const assets: AssetKey[] = ['BTC', 'ETH', 'SOL'];

            // Helper to create market
            const createMarketPromise = async (asset: AssetKey, interval: IntervalKey, duration: number, roundMs: number) => {
                const start = Math.floor(now / roundMs) * roundMs;
                const end = start + duration;
                const roundNum = Math.floor(now / roundMs);

                // Fetch Real Open Price
                const realOpen = await fetchCandleOpen(ASSETS[asset].symbol, interval, start);
                const ptb = realOpen; // Use real Binance candle open only

                return {
                    id: `${asset.toLowerCase()}-${interval.toLowerCase()}-${roundNum}`,
                    asset,
                    interval,
                    priceToBeat: ptb,
                    startTime: start,
                    endTime: end,
                    roundNumber: roundNum,
                };
            };

            assets.forEach(asset => {
                generatedPromises.push(createMarketPromise(asset, '15M', 15 * 60 * 1000, 15 * 60 * 1000)); // 15m
                generatedPromises.push(createMarketPromise(asset, '1H', 60 * 60 * 1000, 60 * 60 * 1000));   // 1h
                generatedPromises.push(createMarketPromise(asset, '4H', 4 * 60 * 60 * 1000, 4 * 60 * 60 * 1000)); // 4h
                generatedPromises.push(createMarketPromise(asset, '24H', 24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000)); // Daily
                generatedPromises.push(createMarketPromise(asset, '1W', 7 * 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000)); // Weekly
            });

            const results = await Promise.all(generatedPromises);
            if (mounted) {
                setMarkets(results);
                setIsLoading(false);
            }
        };

        init();
        return () => { mounted = false; };
    }, []);

    // Filter Logic
    const filteredMarkets = useMemo(() => {
        return markets.filter(m => {
            const matchInterval = selectedInterval === 'ALL' || m.interval === selectedInterval;
            const matchAsset = selectedAsset === 'ALL' || m.asset === selectedAsset;
            return matchInterval && matchAsset;
        });
    }, [markets, selectedInterval, selectedAsset]);

    const intervals: (IntervalKey | 'ALL')[] = ['ALL', '15M', '1H', '4H', '24H', '1W'];
    const assetsList: (AssetKey | 'ALL')[] = ['ALL', 'BTC', 'ETH', 'SOL'];

    return (
        <div className="min-h-screen relative overflow-hidden bg-black selection:bg-[#F492B7] selection:text-black">
            {/* Galaxy Background - Fixed */}
            <div className="fixed inset-0 z-0 opacity-50">
                <Galaxy starSpeed={0.3} />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">

                {/* Header Section */}
                <div className="w-full max-w-[1600px] px-6 pt-16 pb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col xl:flex-row xl:items-end justify-between gap-8"
                    >
                        {/* Title */}
                        <div>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-4 lowercase tracking-wide">
                                <Link href="/markets" className="hover:text-white transition">markets</Link>
                                <ChevronRight className="w-3 h-3" />
                                <span className="text-[#F492B7]">crypto</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 tracking-tight lowercase">
                                crypto
                            </h1>
                            <p className="text-gray-500 text-base md:text-lg font-normal max-w-xl leading-relaxed">
                                predict prices. win rebates. live 24/7.
                            </p>
                        </div>

                        {/* Controls Container */}
                        <div className="flex flex-col gap-4 items-end w-full xl:w-auto">

                            {/* Asset Filter */}
                            <div className="flex bg-white border-4 border-black p-1.5 rounded-2xl shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)]">
                                {assetsList.map((asset) => {
                                    const isActive = selectedAsset === asset;
                                    return (
                                        <button
                                            key={asset}
                                            onClick={() => setSelectedAsset(asset)}
                                            className={`relative px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isActive
                                                ? 'bg-black text-white shadow-lg transform -translate-y-0.5'
                                                : 'text-black/60 hover:bg-gray-100 hover:text-black'
                                                }`}
                                        >
                                            {asset}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Interval Filter */}
                            <div className="flex overflow-x-auto no-scrollbar max-w-full bg-black/40 border-2 border-white/20 p-1.5 rounded-2xl backdrop-blur-md">
                                {intervals.map((interval) => {
                                    const isActive = selectedInterval === interval;
                                    return (
                                        <button
                                            key={interval}
                                            onClick={() => setSelectedInterval(interval)}
                                            className={`relative px-5 py-2 rounded-xl text-xs font-black transition-colors whitespace-nowrap ${isActive
                                                ? 'bg-[#F492B7] text-black shadow-lg'
                                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                                }`}
                                        >
                                            {interval === 'ALL' ? 'ANY TIME' : interval}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Markets Grid */}
                <div className="w-full max-w-[1600px] px-6 pb-20">
                    {/* Placeholder for loading */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-64 bg-white/5 rounded-[2rem] border-4 border-white/10 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            <AnimatePresence mode="popLayout">
                                {filteredMarkets.map((market) => (
                                    <MarketCard
                                        key={market.id}
                                        market={market}
                                        currentPrice={prices[market.asset]}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {!isLoading && filteredMarkets.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="inline-block p-6 rounded-full bg-white/5 border-2 border-white/10 mb-4">
                                <Filter className="w-8 h-8 text-gray-500" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">No Markets Found</h3>
                            <p className="text-gray-500 mt-2">Try adjusting your filters</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider disabled-text">{label}</span>
            <span className="text-sm font-bold text-gray-900">{value}</span>
        </div>
    );
}
