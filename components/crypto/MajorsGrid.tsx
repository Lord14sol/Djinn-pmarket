'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, ArrowUpRight } from 'lucide-react';

// Asset configuration with Pyth feed IDs and symbols
const ASSETS = {
    BTC: {
        name: 'Bitcoin',
        symbol: 'BTC',
        icon: '₿',
        color: '#F7931A',
        gradient: 'from-orange-400 to-orange-600',
    },
    ETH: {
        name: 'Ethereum',
        symbol: 'ETH',
        icon: 'Ξ',
        color: '#627EEA',
        gradient: 'from-blue-400 to-purple-600',
    },
    SOL: {
        name: 'Solana',
        symbol: 'SOL',
        icon: '◎',
        color: '#9945FF',
        gradient: 'from-purple-400 to-pink-600',
    },
};

type AssetKey = keyof typeof ASSETS;

// Market card interface
interface ChronosMarket {
    id: string;
    asset: AssetKey;
    targetPrice: number;
    currentPrice: number;
    endTime: number; // Unix timestamp
    yesProbability: number;
    totalVolume: number;
    roundNumber: number;
}

// Mock data for development
const MOCK_MARKETS: ChronosMarket[] = [
    {
        id: 'btc-1h-1',
        asset: 'BTC',
        targetPrice: 98500,
        currentPrice: 98750,
        endTime: Date.now() + 45 * 60 * 1000, // 45 minutes from now
        yesProbability: 64,
        totalVolume: 12.5,
        roundNumber: 1,
    },
    {
        id: 'eth-1h-1',
        asset: 'ETH',
        targetPrice: 3420,
        currentPrice: 3385,
        endTime: Date.now() + 45 * 60 * 1000,
        yesProbability: 38,
        totalVolume: 8.2,
        roundNumber: 1,
    },
    {
        id: 'sol-1h-1',
        asset: 'SOL',
        targetPrice: 195,
        currentPrice: 198.50,
        endTime: Date.now() + 45 * 60 * 1000,
        yesProbability: 71,
        totalVolume: 5.8,
        roundNumber: 1,
    },
];

// Countdown timer component
function Countdown({ endTime }: { endTime: number }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const now = Date.now();
            const diff = endTime - now;

            if (diff <= 0) {
                setTimeLeft('Resolving...');
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [endTime]);

    const isUrgent = endTime - Date.now() < 5 * 60 * 1000; // Less than 5 minutes

    return (
        <span className={`font-mono font-bold ${isUrgent ? 'text-red-500' : 'text-gray-500'}`}>
            {timeLeft}
        </span>
    );
}

// Individual market card
function MarketCard({ market }: { market: ChronosMarket }) {
    const asset = ASSETS[market.asset];
    const isAbove = market.currentPrice >= market.targetPrice;
    const priceChange = ((market.currentPrice - market.targetPrice) / market.targetPrice) * 100;

    return (
        <Link href={`/crypto/market/${market.id}`}>
            <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group"
            >
                {/* Header */}
                <div className={`bg-gradient-to-r ${asset.gradient} px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{asset.icon}</span>
                        <div>
                            <span className="text-white font-black text-lg">{asset.symbol}</span>
                            <span className="text-white/70 text-xs ml-2">Round #{market.roundNumber}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/20 rounded-lg px-2 py-1">
                        <Clock className="w-3 h-3 text-white" />
                        <Countdown endTime={market.endTime} />
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Question */}
                    <p className="text-gray-900 font-bold text-sm mb-3">
                        Will {asset.name} be above <span className="text-black font-black">${market.targetPrice.toLocaleString()}</span>?
                    </p>

                    {/* Current Price */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Current:</span>
                            <span className="font-black text-lg">${market.currentPrice.toLocaleString()}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${isAbove ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {isAbove ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="text-xs font-bold">{priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%</span>
                        </div>
                    </div>

                    {/* Probability Bar */}
                    <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-green-600 font-bold">YES {market.yesProbability}%</span>
                            <span className="text-red-500 font-bold">NO {100 - market.yesProbability}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600"
                                initial={{ width: 0 }}
                                animate={{ width: `${market.yesProbability}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                            <span className="font-bold">{market.totalVolume.toFixed(1)} SOL</span> volume
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-[#F492B7] group-hover:gap-2 transition-all">
                            <span>Trade</span>
                            <ArrowUpRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

// Main grid component
export default function MajorsGrid() {
    const [markets, setMarkets] = useState<ChronosMarket[]>(MOCK_MARKETS);
    const [loading, setLoading] = useState(false);

    // TODO: Replace with actual data fetching from chain
    // useEffect(() => {
    //     fetchChronosMarkets().then(setMarkets);
    // }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
            ))}
        </div>
    );
}
