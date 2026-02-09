'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Ticket, Wallet, Calculator, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import Link from 'next/link';
import { formatCompact } from '@/lib/utils';
import { AnimatedNumber } from '@/components/AnimatedNumber';

// ═══════════════════════════════════════════════════════════════════════════════
// BONDING CURVE & PAYOUT MATH (Simplified for Demo)
// ═══════════════════════════════════════════════════════════════════════════════

// Constants
const P_START = 0.000001;
const P_50 = 0.000025;
const P_90 = 0.00025;
const P_MAX = 0.95;
const PHASE1_END = 100_000_000;
const PHASE2_END = 200_000_000;
const PHASE3_START = 200_000_000;

// Price Calculation (Linear for simplicity in demo or full piece-wise?)
// Let's use piece-wise to match reality
function getSpotPrice(supply: number): number {
    const effectiveSupply = supply + 1_000_000; // Virtual Anchor

    if (effectiveSupply <= PHASE1_END) {
        // Linear
        const slope = (P_50 - P_START) / PHASE1_END;
        return P_START + slope * effectiveSupply;
    } else if (effectiveSupply <= PHASE2_END) {
        // Quadratic Bridge
        const progress = effectiveSupply - PHASE1_END;
        const range = PHASE2_END - PHASE1_END;
        const ratio = progress / range;
        const ratio_sq = ratio * ratio;
        return P_50 + (P_90 - P_50) * ratio_sq;
    } else {
        // Sigmoid / Max
        const x_rel = effectiveSupply - PHASE3_START;
        const kz = 1.25 * x_rel;
        const norm_sig = Math.min(1_000_000_000, Math.max(0, kz));
        return P_90 + (P_MAX - P_90) * norm_sig / 1_000_000_000;
    }
}

// Cost Integral (Trapezoidal)
function getCost(supplyOld: number, supplyNew: number): number {
    if (supplyNew <= supplyOld) return 0;
    const pOld = getSpotPrice(supplyOld);
    const pNew = getSpotPrice(supplyNew);
    const delta = supplyNew - supplyOld;
    return (pOld + pNew) / 2 * delta;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function WinTicket({
    payout,
    roi,
    shares,
    myCost
}: {
    payout: number,
    roi: number,
    shares: number,
    myCost: number
}) {
    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#FFF4E0] text-black w-full max-w-sm mx-auto p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative rotate-1 font-mono text-xs overflow-hidden"
            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
        >
            {/* Serrated Top */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-black" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }}></div>

            <div className="p-6 pt-8 pb-8 border-x-2 border-dashed border-black/10 flex flex-col items-center text-center gap-1">
                <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center mb-2">
                    <Ticket className="w-6 h-6" />
                </div>
                <h3 className="font-black text-xl uppercase tracking-widest mb-1">WINNER RECEIPT</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-4">{new Date().toLocaleString()}</p>

                <div className="w-full border-t-2 border-black/10 border-dashed my-2" />

                <div className="w-full flex justify-between uppercase font-bold text-gray-500">
                    <span>Shares Held</span>
                    <span className="text-black">{formatCompact(shares)}</span>
                </div>
                <div className="w-full flex justify-between uppercase font-bold text-gray-500">
                    <span>Cost Basis</span>
                    <span className="text-black">{myCost.toFixed(2)} SOL</span>
                </div>
                <div className="w-full flex justify-between uppercase font-bold text-gray-500">
                    <span>Final Payout</span>
                    <span className="text-black">{payout.toFixed(2)} SOL</span>
                </div>

                <div className="w-full border-t-2 border-black my-4" />

                <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Net Profit / ROI</span>
                    <span className={`text-4xl font-black tracking-tighter ${roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                        {roi >= 0 ? 'Pure Alpha' : 'Rekt'}
                    </span>
                </div>

                <div className="mt-6 text-[8px] uppercase text-center text-gray-400 max-w-[200px] leading-tight">
                    This receipt certifies outcome resolution via chronological proof.
                    <br />ID: {Math.random().toString(36).substring(7).toUpperCase()}
                </div>
            </div>

            {/* Serrated Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-black" style={{ clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)' }}></div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function SolvencyDemoPage() {
    // State for Simulation
    // 1. Existing Supply (How many "Early Birds" bought UP?)
    const [existingUpSupply, setExistingUpSupply] = useState(50_000_000); // 50M Shares

    // 2. Losing Side Liquidity (How much SOL is in the DOWN pot?)
    // This is crucial. If nobody bets NO, the payout comes only from YES buyers (Ponzi-like).
    // If NO pot is huge, payout is huge.
    const [downPotSol, setDownPotSol] = useState(100); // 100 SOL in DOWN pot

    // 3. My Trade
    const [myBuyAmount, setMyBuyAmount] = useState(10); // 10 SOL buy

    // Derived Calculations
    const currentPrice = getSpotPrice(existingUpSupply);
    const sharesReceived = myBuyAmount / (currentPrice || 1); // Approx linear calc for instant feedback
    // Better: integrated cost
    // But for 10 SOL vs 50M supply, price doesn't move much. Simple division ok for visual demo?
    // Let's do better:
    // It's hard to inverse `getCost` efficiently in JS without loop.
    // Let's estimating shares = amount / price

    // Total Pot (UP side)
    // We need to approximate how much SOL is in UP pot based on supply curve
    // Cost to mint `existingUpSupply` varies widely.
    // Let's assume average price 0.5 * currentPrice? 
    // Or just calculate integral from 0 to `existingUpSupply`.
    const upPotSol = getCost(0, existingUpSupply);

    const totalPot = upPotSol + downPotSol + myBuyAmount;

    // Resolution: UP WINS
    // Total Winning Shares = existingUpSupply + sharesReceived
    const totalWinningShares = existingUpSupply + sharesReceived;

    // Payout Per Share = Total Pot / Total Winning Shares
    const payoutPerShare = totalPot / totalWinningShares;

    // My Payout = payoutPerShare * sharesReceived
    const myPayout = payoutPerShare * sharesReceived;

    // ROI
    const netProfit = myPayout - myBuyAmount;
    const roi = (netProfit / myBuyAmount) * 100;

    return (
        <div className="min-h-screen bg-gray-100 text-black font-sans p-6 md:p-12">
            <Link href="/" className="inline-flex items-center gap-2 font-black uppercase text-xs mb-8 hover:underline">
                <ArrowLeft size={14} /> Back to App
            </Link>

            <header className="mb-12 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                    Solvency Simulator
                </h1>
                <p className="text-lg md:text-xl font-medium text-gray-500 leading-relaxed max-w-2xl">
                    Demonstrating the <span className="text-black font-black">Bonding Curve + Parimutuel Payout</span> dynamic.
                    See why <strong>early buyers win big</strong> and why late buyers need a large losing pot to profit.
                </p>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* CONTROLS */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-white border-4 border-black rounded-[2rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black text-xl">1</div>
                            <h3 className="font-black text-xl uppercase tracking-wide">Market State</h3>
                        </div>

                        {/* Slider 1: UP Supply */}
                        <div className="mb-8">
                            <div className="flex justify-between mb-2">
                                <label className="font-bold text-xs uppercase tracking-widest text-gray-500">Existing 'UP' Shares</label>
                                <span className="font-black text-black">{formatCompact(existingUpSupply)}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="300000000" step="1000000"
                                value={existingUpSupply}
                                onChange={(e) => setExistingUpSupply(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                            />
                            <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                Current Price: <span className="text-black font-bold">{currentPrice.toFixed(6)} SOL</span>
                            </p>
                        </div>

                        {/* Slider 2: DOWN Pot */}
                        <div className="mb-8">
                            <div className="flex justify-between mb-2">
                                <label className="font-bold text-xs uppercase tracking-widest text-[#F43F5E]">Total 'DOWN' Liquidity</label>
                                <span className="font-black text-[#F43F5E]">{downPotSol.toFixed(0)} SOL</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="10000" step="10"
                                value={downPotSol}
                                onChange={(e) => setDownPotSol(Number(e.target.value))}
                                className="w-full h-2 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                            <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                This is the "Loss" money you can win explicitly from the other side.
                            </p>
                        </div>

                    </div>

                    <div className="bg-[#FFF4E0] border-4 border-black rounded-[2rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black text-xl">2</div>
                            <h3 className="font-black text-xl uppercase tracking-wide">Your Trade</h3>
                        </div>

                        {/* Slider 3: My Buy */}
                        <div className="mb-4">
                            <div className="flex justify-between mb-2">
                                <label className="font-bold text-xs uppercase tracking-widest text-emerald-600">Buy Amount</label>
                                <span className="font-black text-emerald-600">{myBuyAmount} SOL</span>
                            </div>
                            <input
                                type="range"
                                min="1" max="100" step="1"
                                value={myBuyAmount}
                                onChange={(e) => setMyBuyAmount(Number(e.target.value))}
                                className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>

                        {/* Scenarios */}
                        <div className="mt-8 pt-6 border-t-2 border-dashed border-black/10">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Load Scenario</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        setExistingUpSupply(50_000_000); // Early
                                        setDownPotSol(50_000); // Balanced similar (approx)
                                    }}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors"
                                >
                                    ⚖️ Balanced
                                </button>
                                <button
                                    onClick={() => {
                                        setExistingUpSupply(200_000_000); // Pumped
                                        setDownPotSol(100); // No counter-party
                                    }}
                                    className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg text-xs font-bold transition-colors border border-rose-200"
                                >
                                    🚀 Mega Pump (Rekt)
                                </button>
                                <button
                                    onClick={() => {
                                        setExistingUpSupply(0); // First mover
                                        setDownPotSol(0); // No counter-party
                                        setMyBuyAmount(10);
                                    }}
                                    className="col-span-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition-colors border border-amber-200"
                                >
                                    ⚠️ Zero Liquidity (Refund)
                                </button>
                            </div>
                        </div>

                        <div className="bg-white/50 rounded-xl p-4 border-2 border-dashed border-black/10 text-sm font-mono">
                            <div className="flex justify-between">
                                <span>Est. Shares:</span>
                                <span className="font-bold">{formatCompact(sharesReceived)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Entry Price:</span>
                                <span className="font-bold">{currentPrice.toFixed(6)} SOL</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* VISUALIZATION */}
                <div className="lg:col-span-7 flex flex-col gap-8">

                    {/* SCENARIO EXPLANATION */}
                    <div className="bg-black text-white rounded-[2rem] p-8 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)]">
                        <div className="flex items-start gap-4">
                            <Info className="shrink-0 w-8 h-8 text-[#F492B7]" />
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-widest mb-2">Scenario Analysis</h3>
                                <p className="text-gray-300 mb-4 leading-relaxed">
                                    If <span className="text-emerald-400 font-bold">UP WINS</span>, the total pot ({Math.round(totalPot)} SOL) is split among all UP shareholders ({formatCompact(totalWinningShares)} shares).
                                </p>
                                <div className="grid grid-cols-2 gap-4 text-sm font-black uppercase tracking-widest">
                                    <div>
                                        <span className="block text-gray-500 text-[10px]">Total Pot</span>
                                        <span className="text-2xl text-white">{formatCompact(totalPot)} SOL</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-[10px]">Payout / Share</span>
                                        <span className="text-2xl text-[#F492B7]">{payoutPerShare.toFixed(6)} SOL</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RESULTS */}
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-center py-8">
                        {/* WIN TICKET */}
                        <div className="w-full md:w-auto shrink-0">
                            <WinTicket
                                payout={myPayout}
                                roi={roi}
                                shares={sharesReceived}
                                myCost={myBuyAmount}
                            />
                        </div>

                        {/* WARNING LABEL */}
                        <div className="max-w-xs text-center md:text-left">
                            {roi < 0 ? (
                                <div className="bg-rose-100 border-l-4 border-rose-500 p-4 rounded-r-xl">
                                    <div className="flex items-center gap-2 text-rose-600 font-black uppercase tracking-widest mb-1">
                                        <AlertTriangle size={16} /> Negative EV
                                    </div>
                                    <p className="text-xs text-rose-800 font-medium leading-relaxed">
                                        You are buying at a high price ({currentPrice.toFixed(5)}), but the losing pot is too small.
                                        Even if you win, you get back less than you put in.
                                        <br /><br />
                                        <strong>Solution:</strong> Wait for more DOWN bets or buy earlier.
                                    </p>
                                </div>
                            ) : roi === 0 ? (
                                <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-r-xl">
                                    <div className="flex items-center gap-2 text-amber-700 font-black uppercase tracking-widest mb-1">
                                        <RefreshCw size={16} /> Reflexive Refund
                                    </div>
                                    <p className="text-xs text-amber-900 font-medium leading-relaxed">
                                        You are the only person in the pool (or only side).
                                        <br />
                                        There is <strong>0 SOL</strong> in the losing pot to win.
                                        <br /><br />
                                        <strong>Result:</strong> You get your exact money back (minus fees). You are betting against yourself.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-emerald-100 border-l-4 border-emerald-500 p-4 rounded-r-xl">
                                    <div className="flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest mb-1">
                                        <TrendingUp size={16} /> Profitable
                                    </div>
                                    <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                                        Good entry! The losing pot is large enough to cover your premium and provide profit.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
