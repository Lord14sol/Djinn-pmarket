'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, TrendingUp, TrendingDown, Wallet, Radio, Share2, Bookmark, CheckCircle2, XCircle, Activity, Scale, Trophy, Users, MessageCircle, Star, ExternalLink, Filter } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceDot,
} from 'recharts';
import dynamic from 'next/dynamic';
import { useBinancePrice } from '@/hooks/useBinancePrice';
import LiveTicker from '@/components/LiveTicker';
import CommentsSection from '@/components/market/CommentsSection';
import { formatCompact } from '@/lib/utils';
import { getOutcomeColor } from '@/lib/market-colors';
import { AnimatedNumber } from '@/components/AnimatedNumber';

// Dynamic import Galaxy
const Galaxy = dynamic(() => import('@/components/Galaxy'), { ssr: false });

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const ASSETS = {
    btc: { name: 'Bitcoin', symbol: 'BTC', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', color: '#F7931A', basePrice: 97850 },
    eth: { name: 'Ethereum', symbol: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', color: '#627EEA', basePrice: 3420 },
    sol: { name: 'Solana', symbol: 'SOL', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png', color: '#000000', basePrice: 195.50 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTDOWN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function BigCountdown({ endTime }: { endTime: number }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const update = () => {
            const diff = Math.max(0, endTime - Date.now());
            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
            });
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [endTime]);

    return (
        <div className="flex items-baseline gap-1 text-rose-500">
            {timeLeft.days > 0 && <span className="text-4xl font-black font-mono tracking-tighter">{timeLeft.days}<span className="text-xs font-bold font-mono text-rose-300 mr-2 ml-1 align-top">D</span></span>}
            {(timeLeft.days > 0 || timeLeft.hours > 0) && <span className="text-4xl font-black font-mono tracking-tighter">{String(timeLeft.hours).padStart(2, '0')}<span className="text-xs font-bold font-mono text-rose-300 mr-2 ml-1 align-top">H</span></span>}
            <span className="text-4xl font-black font-mono tracking-tighter">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="text-xs font-bold font-mono text-rose-300 mr-2 ml-1 align-top">M</span>
            <span className="text-4xl font-black font-mono tracking-tighter">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="text-xs font-bold font-mono text-rose-300 ml-1 align-top">S</span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE PANEL (Neo-Brutalist)
// ═══════════════════════════════════════════════════════════════════════════════

function TradePanel({ isAbove, onTrade, currentPool }: { isAbove: boolean, onTrade: (amount: string, side: 'YES' | 'NO') => void, currentPool: number }) {
    const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY');
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>(isAbove ? 'YES' : 'NO');
    const [amount, setAmount] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleTrade = () => {
        if (!amount) return;
        setIsSuccess(true);
        onTrade(amount, selectedSide);
        setTimeout(() => {
            setIsSuccess(false);
            setAmount('');
        }, 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2rem] border-4 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
        >
            {/* Header Gradient */}
            <div className="w-full flex flex-col items-center px-6 py-8 rounded-3xl bg-gradient-to-br from-[#FF92C6] via-[#FFB6C1] to-[#F492CC] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden mb-8 group/pool">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/80 mb-2 relative z-10">Total Locked</span>
                <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-5xl font-black text-black tracking-tighter drop-shadow-sm">
                        <AnimatedNumber value={currentPool} decimals={2} className="inline" />
                    </span>
                    <span className="text-2xl font-black text-white drop-shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">SOL</span>
                </div>
            </div>

            {/* Buy/Sell Toggles */}
            <div className="mb-6 p-1.5 bg-gray-100 border-4 border-black rounded-2xl flex gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <button onClick={() => setTradeMode('BUY')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border-2 ${tradeMode === 'BUY' ? 'bg-emerald-400 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'text-black/40 border-transparent bg-transparent hover:text-black'}`}>BUY</button>
                <button onClick={() => setTradeMode('SELL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border-2 ${tradeMode === 'SELL' ? 'bg-rose-400 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'text-black/40 border-transparent bg-transparent hover:text-black'}`}>SELL</button>
            </div>

            {/* Side Selector */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => setSelectedSide('YES')}
                    className={`flex-1 py-4 rounded-xl text-sm font-black uppercase transition-all border-4 relative overflow-hidden group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none ${selectedSide === 'YES'
                        ? 'bg-emerald-400 text-black border-black -translate-y-1'
                        : 'bg-white text-black border-black hover:bg-emerald-50'
                        }`}
                >
                    UP (YES)
                </button>
                <button
                    onClick={() => setSelectedSide('NO')}
                    className={`flex-1 py-4 rounded-xl text-sm font-black uppercase transition-all border-4 relative overflow-hidden group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none ${selectedSide === 'NO'
                        ? 'bg-rose-400 text-black border-black -translate-y-1'
                        : 'bg-white text-black border-black hover:bg-rose-50'
                        }`}
                >
                    DOWN (NO)
                </button>
            </div>

            {/* Input */}
            <div className="bg-white rounded-2xl border-4 border-black p-5 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <label className="text-[9px] font-black uppercase text-black/40 tracking-widest mb-3 block">Amount</label>
                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-transparent text-4xl font-black text-black w-full outline-none placeholder-gray-200 tracking-tighter tabular-nums"
                        placeholder="0.00"
                    />
                    <span className="text-xs font-black bg-black text-white px-2 py-1 rounded">SOL</span>
                </div>
            </div>

            {/* Execute Action */}
            <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTrade}
                className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-[0.2em] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all border-4 border-black ${isSuccess ? 'bg-emerald-500 text-white' : 'bg-black text-white hover:bg-[#F492B7] hover:text-black'}`}
            >
                {isSuccess ? 'CONFIRMED!' : (!amount ? 'ENTER AMOUNT' : 'EXECUTE TRADE')}
            </motion.button>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAST ROUNDS SELECTOR & DETAILS
// ═══════════════════════════════════════════════════════════════════════════════

interface RoundData {
    id: number;
    time: string;
    isWin: boolean;
    result: string;
    strikePrice: number;
    endPrice: number;
    status: 'LIVE' | 'ENDED';
}

function RoundSelector({
    rounds,
    selectedRoundId,
    onSelect
}: {
    rounds: RoundData[],
    selectedRoundId: number,
    onSelect: (id: number) => void
}) {
    const selectedRound = rounds.find(r => r.id === selectedRoundId);

    return (
        <div className="mt-8">
            <h3 className="text-black font-black uppercase tracking-widest mb-4 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Round History
            </h3>

            {/* Horizontal Scroll List */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-4">
                {rounds.map((round) => {
                    const isActive = selectedRoundId === round.id;
                    const isLive = round.status === 'LIVE';

                    return (
                        <button
                            key={round.id}
                            onClick={() => onSelect(round.id)}
                            className={`flex flex-col items-center justify-center min-w-[90px] px-3 py-3 rounded-xl border-2 transition-all ${isActive
                                ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'
                                : 'bg-white border-black text-gray-400 hover:bg-gray-50'
                                }`}
                        >
                            <span className="text-[10px] font-mono opacity-60 mb-1">{round.time}</span>
                            {isLive ? (
                                <div className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full bg-rose-500 animate-pulse`} />
                                    <span className="text-xs font-black text-rose-500 fill-current">LIVE</span>
                                </div>
                            ) : (
                                <div className={`flex items-center gap-1 ${round.isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {round.isWin ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    <span className="text-xs font-black">{round.result}</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selected Round Detail View */}
            <AnimatePresence mode="wait">
                {selectedRound && (
                    <motion.div
                        key={selectedRound.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white border-2 border-black rounded-2xl p-6 relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                    >

                        <div className="relative z-10">
                            <h4 className="text-black text-[10px] font-black uppercase tracking-widest mb-4 border-b-2 border-black/5 pb-2">
                                Round #{selectedRound.id} Analysis
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                <div>
                                    <span className="block text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">Target Price</span>
                                    <span className="font-mono font-bold text-lg">${selectedRound.strikePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                                {selectedRound.status === 'ENDED' ? (
                                    <>
                                        <div>
                                            <span className="block text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">Settle Price</span>
                                            <span className={`font-mono font-bold text-lg ${selectedRound.isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                ${selectedRound.endPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">Result</span>
                                            <span className={`font-black text-lg ${selectedRound.isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {selectedRound.result}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-span-2">
                                        <span className="block text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">Status</span>
                                        <span className="font-black text-rose-500 animate-pulse text-lg">ACCEPTING TRADES...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP (UTC)
// ═══════════════════════════════════════════════════════════════════════════════

const CustomTooltip = ({ active, payload, label, assetIcon }: any) => {
    if (active && payload && payload.length) {
        const date = new Date(label); // timestamp
        // Format UTC
        const utcDate = date.toUTCString().slice(0, 22); // e.g. "Mon, 09 Feb 2026 01:00"

        return (
            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 mb-2">
                    <img src={assetIcon} className="w-5 h-5" alt="" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{utcDate} UTC</span>
                </div>
                <div className="text-xl font-black text-black tabular-nums tracking-tighter">
                    ${Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </div>
        );
    }
    return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function ChronosMarketPage() {
    const params = useParams();
    const marketId = params.marketId as string; // e.g., btc-15m-105

    // Parse market ID (Client Side)
    const [assetKey, intervalRaw, roundStr] = marketId?.split('-') || ['btc', '15m', '1'];
    const asset = ASSETS[assetKey as keyof typeof ASSETS] || ASSETS.btc;
    const currentRoundNumber = parseInt(roundStr) || 1;
    const interval = intervalRaw.toLowerCase();

    // Real-Time Price
    const hookInterval = (['15m', '1h', '4h', '24h', '1w'].includes(interval) ? interval : '15m') as any;
    const { price: currentPrice, history: priceHistory } = useBinancePrice(
        asset.symbol as 'BTC' | 'ETH' | 'SOL',
        hookInterval
    );

    // Timing
    const [endTime, setEndTime] = useState(0);
    const [priceToBeat, setPriceToBeat] = useState(0);

    const getDuration = useCallback((int: string) => {
        switch (int) {
            case '15m': return 15 * 60 * 1000;
            case '1h': return 60 * 60 * 1000;
            case '4h': return 4 * 60 * 60 * 1000;
            case '24h': return 24 * 60 * 60 * 1000;
            case '1w': return 7 * 24 * 60 * 60 * 1000;
            default: return 15 * 60 * 1000;
        }
    }, []);

    useEffect(() => {
        const now = Date.now();
        const duration = getDuration(interval);
        const start = Math.floor(now / duration) * duration;
        const end = start + duration;
        setEndTime(end);

        if (!priceToBeat && currentPrice > 0) {
            // FIX: Use deterministic fallback if needed or just use passed/fetched value
            // Here we just keep 0.1% variance simulation but client side only
            setPriceToBeat(currentPrice * 0.9998); // Slightly easier target for demo
        }
    }, [interval, currentPrice, getDuration, priceToBeat]);

    const effectivePriceToBeat = priceToBeat || asset.basePrice;
    const effectiveCurrentPrice = currentPrice || asset.basePrice;
    const priceDiff = effectiveCurrentPrice - effectivePriceToBeat;
    const isAbove = priceDiff >= 0;
    const chartColor = isAbove ? '#10B981' : '#F43F5E';
    const priceChange = effectiveCurrentPrice - effectivePriceToBeat;

    // FIX: Deterministic Rounds (Hydration Safe)
    const rounds = useMemo(() => {
        const list: RoundData[] = [];
        for (let i = 0; i < 6; i++) {
            const rId = currentRoundNumber - 5 + i;
            if (rId < 1) continue;
            const isLive = rId === currentRoundNumber;
            // Deterministic "Random" based on rId
            const isWin = ((rId * 9301 + 49297) % 233280) % 2 === 0;

            const duration = getDuration(interval);
            const rTime = new Date(Date.now() - (currentRoundNumber - rId) * duration);
            const timeLabel = rTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            // Deterministic prices
            const deterministicStrike = asset.basePrice * (1 + (((rId * 17) % 100) / 10000));
            const deterministicEnd = asset.basePrice * (1 + (((rId * 19) % 100) / 10000));

            list.push({
                id: rId,
                time: timeLabel,
                isWin: isLive ? isAbove : isWin,
                result: isLive ? (isAbove ? 'UP' : 'DOWN') : (isWin ? 'UP' : 'DOWN'),
                status: isLive ? 'LIVE' : 'ENDED',
                strikePrice: deterministicStrike,
                endPrice: deterministicEnd,
            });
        }
        return list;
    }, [currentRoundNumber, interval, asset.basePrice, getDuration, isAbove]);

    const formattedChartData = useMemo(() => {
        return priceHistory.map(p => ({ time: p.time, price: p.price }));
    }, [priceHistory]);

    // Social Tabs State
    const [bottomTab, setBottomTab] = useState<'ACTIVITY' | 'COMMENTS' | 'HOLDERS'>('ACTIVITY');

    // Total Pool State (Starts at 0 or low)
    const [totalPool, setTotalPool] = useState(0);
    const [myTrades, setMyTrades] = useState<any[]>([]);

    useEffect(() => {
        setMyTrades([]);
        setTotalPool(0);
        setActivityList([
            { username: 'Whale_XO', action: 'YES', amount: 5000, shares: 7500, time: '2m ago', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
            { username: 'Djinn_User', action: 'NO', amount: 120, shares: 180, time: '5m ago', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
            { username: 'CryptoKing', action: 'YES', amount: 2500, shares: 3200, time: '12m ago', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
        ]);
    }, [marketId]);

    // Mock Data State (Now mutable via Trade)
    const [activityList, setActivityList] = useState([
        { username: 'Whale_XO', action: 'YES', amount: 5000, shares: 7500, time: '2m ago', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
        { username: 'Djinn_User', action: 'NO', amount: 120, shares: 180, time: '5m ago', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
        { username: 'CryptoKing', action: 'YES', amount: 2500, shares: 3200, time: '12m ago', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
    ]);

    const [holders, setHolders] = useState<any>({
        'UP': [
            { name: 'Whale_XO', positions: { 'UP': 50000 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
            { name: 'Satoshi_N', positions: { 'UP': 12000 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Satoshi' },
        ],
        'DOWN': [
            { name: 'Bear_Market', positions: { 'DOWN': 30000 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bear' },
        ]
    });

    // Handle Real Fake Trade
    const handleAddTrade = (amount: string, side: 'YES' | 'NO') => {
        const amt = parseFloat(amount);
        const shares = Math.floor(amt / 0.5); // Mock price

        // Update Pool
        setTotalPool(prev => prev + amt);

        // Add Bubble
        setMyTrades(prev => [...prev, {
            price: currentPrice,
            time: Date.now(),
            side
        }]);

        // Add Activity
        const newActivity = {
            username: 'You',
            action: side,
            amount: amt,
            shares: shares,
            time: 'Just now',
            avatar: '/pink-pfp.png'
        };
        setActivityList(prev => [newActivity, ...prev]);

        // Update Holders
        setHolders((prev: any) => {
            const sideHolders = prev[side] || [];
            // Check if 'You' exists
            const existingIdx = sideHolders.findIndex((h: any) => h.name === 'You');
            let newSideHolders;
            if (existingIdx !== -1) {
                newSideHolders = [...sideHolders];
                newSideHolders[existingIdx].positions[side] += shares;
            } else {
                newSideHolders = [...sideHolders, { name: 'You', positions: { [side]: shares }, avatar: '/pink-pfp.png' }];
            }
            return { ...prev, [side]: newSideHolders };
        });
    };

    // Selected Round View
    const [selectedRoundView, setSelectedRoundView] = useState<number>(currentRoundNumber);

    return (
        <div className="min-h-screen relative overflow-hidden bg-black text-black font-sans selection:bg-[#F492B7] selection:text-black">
            {/* Galaxy Background - Fixed */}
            <div className="fixed inset-0 z-0 opacity-40">
                <Galaxy starSpeed={0.2} />
            </div>

            {/* Top Bar */}
            <div className="relative z-20 sticky top-0 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
                    <Link
                        href="/crypto/majors"
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition font-black text-sm uppercase tracking-widest group"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Markets
                    </Link>
                </div>
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Market Header Card (Neo-Brutalist) */}
                        <div className="bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-full border-4 border-black p-2 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <img src={asset.icon} alt={asset.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-black text-black tracking-tighter mb-2 uppercase">
                                            {asset.name} #{currentRoundNumber}
                                        </h1>
                                        <div className="flex items-center gap-3">
                                            <span className="bg-black text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border-2 border-black">{interval}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Time Remaining</p>
                                    <BigCountdown endTime={endTime} />
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-3xl border-2 border-black">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-1">Target Price</p>
                                    <div className="text-4xl font-black text-black tracking-tighter tabular-nums">
                                        <AnimatedNumber value={effectivePriceToBeat} prefix="$" decimals={2} />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-widest text-[#F7931A] font-black mb-1 flex items-center justify-end gap-2">
                                        Current Price
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${priceChange >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {priceChange >= 0 ? '▲' : '▼'} ${Math.abs(priceChange).toFixed(2)}
                                        </span>
                                    </p>
                                    <div className="text-5xl font-black tracking-tighter tabular-nums text-[#F7931A]">
                                        <AnimatedNumber value={effectiveCurrentPrice} prefix="$" decimals={2} className="text-[#F7931A]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chart Container */}
                        <div className="bg-white border-4 border-black rounded-[2.5rem] p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] h-[600px] flex flex-col relative overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-black uppercase tracking-widest text-xs flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Live Chart
                                </h3>
                                <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Connected</span>
                                </div>
                            </div>

                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={formattedChartData}>
                                        <defs>
                                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                                                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="time" hide />
                                        <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `$${v.toLocaleString()}`} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CustomTooltip assetIcon={asset.icon} />} />
                                        <ReferenceLine
                                            y={effectivePriceToBeat}
                                            stroke="#000"
                                            strokeDasharray="5 5"
                                            strokeWidth={3} // Thicker
                                            label={{ value: 'TARGET', position: 'insideLeft', fill: 'black', fontWeight: 900, fontSize: 12, dy: -10 }}
                                        />
                                        <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={3} fill="url(#priceGradient)" isAnimationActive={false} />
                                        {myTrades.map((trade, i) => (
                                            <ReferenceDot
                                                key={i}
                                                x={trade.time}
                                                y={trade.price}
                                                r={8}
                                                fill={trade.side === 'YES' ? '#10B981' : '#F43F5E'}
                                                stroke="white"
                                                strokeWidth={2}
                                                isFront={true}
                                                label={{ value: 'B', fill: 'white', fontSize: 10, fontWeight: 900, position: 'center' }}
                                            />
                                        ))}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <RoundSelector rounds={rounds} selectedRoundId={selectedRoundView} onSelect={setSelectedRoundView} />
                        </div>

                        {/* Social Tabs (Comments / Activity) */}
                        <div className="bg-white rounded-[2.5rem] border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-8 mb-6 border-b-2 border-black/10 pb-4">
                                <TabButton label="Activity" icon={<Activity size={16} />} active={bottomTab === 'ACTIVITY'} onClick={() => setBottomTab('ACTIVITY')} />
                                <TabButton label="Comments" icon={<MessageCircle size={16} />} active={bottomTab === 'COMMENTS'} onClick={() => setBottomTab('COMMENTS')} />
                                <TabButton label="Top Holders" icon={<Users size={16} />} active={bottomTab === 'HOLDERS'} onClick={() => setBottomTab('HOLDERS')} />
                            </div>

                            <div className="min-h-[300px]">
                                {bottomTab === 'ACTIVITY' && (
                                    <div className="space-y-0">
                                        {activityList.map((act, i) => (
                                            <div key={i} className="flex items-center justify-between py-4 border-b border-black/5 hover:bg-gray-50 px-2 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <img src={act.avatar} className="w-8 h-8 rounded-full border border-black bg-white" alt="avatar" />
                                                    <div>
                                                        <span className="block text-xs font-black text-black">{act.username}</span>
                                                        <span className="text-[10px] text-gray-500 font-bold">{act.time}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`block text-xs font-black uppercase ${act.action === 'YES' ? 'text-emerald-500' : 'text-rose-500'}`}>{act.action} (${act.amount})</span>
                                                    <span className="text-[10px] text-black/40 font-bold">{act.shares} Shares</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {bottomTab === 'COMMENTS' && (
                                    <CommentsSection
                                        marketSlug={marketId}
                                        publicKey={null} // Default guest
                                        userProfile={{ username: 'Guest', avatarUrl: '/pink-pfp.png' }} // FIX: Provide profile
                                        marketOutcomes={[{ title: 'UP', color: '#10B981' }, { title: 'DOWN', color: '#EF4444' }]}
                                        myHeldPosition={null}
                                        myHeldAmount={null}
                                    />
                                )}
                                {bottomTab === 'HOLDERS' && (
                                    <HoldersList holders={holders} marketOutcomes={[{ title: 'UP' }, { title: 'DOWN' }]} />
                                )}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN - Trade Panel */}
                    <div className="lg:col-span-4 space-y-8">
                        <TradePanel isAbove={isAbove} onTrade={handleAddTrade} currentPool={totalPool} />

                        {/* Context Card */}
                        <div className="bg-black text-white rounded-[2rem] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
                            <h3 className="text-lg font-black uppercase tracking-widest mb-4 text-[#F492B7]">Rules</h3>
                            <ul className="space-y-4 text-sm text-gray-300 font-medium">
                                <li className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <span>Starts: {new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </li>
                                <li className="flex gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <span>Ends: {new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </li>
                                <li className="flex gap-3">
                                    <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <span>Payouts are automatic.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Sub-Components
function TabButton({ label, icon, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${active ? 'text-black' : 'text-gray-400 hover:text-black'}`}
        >
            {icon} {label}
            {active && <motion.div layoutId="tab-underline" className="absolute -bottom-5 left-0 right-0 h-1 bg-[#F492B7] rounded-full" />}
        </button>
    );
}

function HoldersList({ holders, marketOutcomes }: any) {
    return (
        <div className="space-y-6">
            {marketOutcomes.map((outcome: any, idx: number) => {
                const title = outcome.title;
                const list = holders[title] || [];
                return (
                    <div key={title}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${idx === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{title} Whales</h4>
                        {list.length > 0 ? list.map((h: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-gray-300 w-4">#{i + 1}</span>
                                    <img src={h.avatar} className="w-8 h-8 rounded-full border border-black bg-white" />
                                    <span className="text-xs font-black text-black">{h.name}</span>
                                </div>
                                <span className="text-xs font-bold text-black">{formatCompact(h.positions[title])} Shares</span>
                            </div>
                        )) : <div className="text-xs text-gray-400 italic">No holders yet</div>}
                    </div>
                );
            })}
        </div>
    );
}

