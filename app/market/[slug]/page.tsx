'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Clock, DollarSign, Wallet, Activity, Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Components
import MarketChart from '@/components/market/MarketChart';
import MultiLineChart from '@/components/market/MultiLineChart';
import OrderBook from '@/components/market/OrderBook';
import CommentsSection from '@/components/market/CommentsSection';
import OutcomeList, { Outcome } from '@/components/market/OutcomeList';
import PurchaseToast from '@/components/market/PurchaseToast';
import ShareModal from '@/components/market/ShareModal';
import ActivePositionsWidget from '@/components/market/ActivePositionsWidget';
import * as supabaseDb from '@/lib/supabase-db';

// Utils
const TREASURY_WALLET = new PublicKey("C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X");

// --- MOCK MULTI-OUTCOMES ---
const MULTI_OUTCOMES: Record<string, Outcome[]> = {
    'us-strike-mexico': [
        { id: 'us-strike-mexico-jan-31', title: 'January 31', volume: '$352K', yesPrice: 7, noPrice: 93, chance: 7 },
        { id: 'us-strike-mexico-mar-31', title: 'March 31', volume: '$137K', yesPrice: 22, noPrice: 78, chance: 22 },
        { id: 'us-strike-mexico-dec-31', title: 'December 31', volume: '$130K', yesPrice: 38, noPrice: 62, chance: 38 },
    ],
    'world-cup-winner-multiple': [
        { id: 'world-cup-argentina', title: 'Argentina', volume: '$150K', yesPrice: 35, noPrice: 65, chance: 35 },
        { id: 'world-cup-chile', title: 'Chile', volume: '$80K', yesPrice: 15, noPrice: 85, chance: 15 },
        { id: 'world-cup-brasil', title: 'Brasil', volume: '$120K', yesPrice: 30, noPrice: 70, chance: 30 },
        { id: 'world-cup-bolivia', title: 'Bolivia', volume: '$50K', yesPrice: 5, noPrice: 95, chance: 5 },
    ]
};

const marketDisplayData: Record<string, any> = {
    'argentina-world-cup-2026': { title: "Will Argentina be finalist on the FIFA World Cup 2026?", icon: "🇦🇷", description: "Se resuelve YES si Argentina juega la final." },
    'btc-hit-150k': { title: 'Will Bitcoin reach ATH on 2026?', icon: '₿', description: 'Resolves YES if BTC breaks its previous record.' },
    'us-strike-mexico': { title: 'US strike on Mexico by...?', icon: '🇺🇸', description: 'Predicting geopolitical events.' },
    'world-cup-winner-multiple': { title: 'Who will win the World Cup 2026?', icon: '🏆', description: 'Predict which country will lift the trophy in the FIFA World Cup 2026.' }
};



// Generate chart data for single outcome
const generateChartData = (basePrice: number) => {
    const data = [];
    for (let i = 0; i < 50; i++) {
        const date = new Date();
        date.setHours(date.getHours() - (50 - i));
        data.push({
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: basePrice
        });
    }
    return data;
};

// Generate chart data for multi-outcome (all options with different colors)
const generateMultiOutcomeChartData = (options: { name: string; chance: number }[]) => {
    return options.map(opt => ({
        name: opt.name,
        data: Array.from({ length: 50 }, (_, i) => {
            const date = new Date();
            date.setHours(date.getHours() - (50 - i));
            // Add slight variance for visual interest
            const variance = Math.sin(i * 0.2) * 2;
            return {
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                value: Math.max(1, Math.min(99, opt.chance + variance))
            };
        })
    }));
};

export default function MarketPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    // Derived Market Info
    const staticMarketInfo = marketDisplayData[slug] || { title: slug, icon: "🔮", description: "Market info..." };

    // --- STATE ---
    // 1. Outcomes State (Prices & Chances)
    const [marketOutcomes, setMarketOutcomes] = useState<Outcome[]>([]);
    // 2. Chart Series State (Stable History)
    const [chartSeries, setChartSeries] = useState<{ name: string; data: { time: string; value: number }[] }[]>([]);

    const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
    const isMultiOutcome = marketOutcomes.length > 0;

    // The slug used for DB access (persistence key)
    const effectiveSlug = selectedOutcomeId || slug;

    // Standard State
    const [solPrice, setSolPrice] = useState<number>(0);
    const [solBalance, setSolBalance] = useState<number>(0);
    const [livePrice, setLivePrice] = useState<number>(50);
    const [isPending, setIsPending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [userProfile, setUserProfile] = useState({ username: "Guest", avatarUrl: null as string | null });
    const [betAmount, setBetAmount] = useState('');
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');
    const [bottomTab, setBottomTab] = useState<'ACTIVITY' | 'COMMENTS' | 'HOLDERS'>('COMMENTS');
    const [chartData, setChartData] = useState<any[]>([]); // For Single Outcome
    const [activityList, setActivityList] = useState<any[]>([]);
    const [holders, setHolders] = useState<any[]>([]);

    // Multi-outcome Name tracking
    const [selectedOutcomeName, setSelectedOutcomeName] = useState<string | null>(null);

    // My Position
    const [myHeldPosition, setMyHeldPosition] = useState<'YES' | 'NO' | null>(null);
    const [myHeldAmount, setMyHeldAmount] = useState<string | null>(null);
    const [lastOrder, setLastOrder] = useState<any>(null);

    // Toast & Share Modal State
    const [showPurchaseToast, setShowPurchaseToast] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [lastBetDetails, setLastBetDetails] = useState<{
        outcomeName: string;
        side: 'YES' | 'NO';
        solAmount: number;
        usdAmount: number;
        marketTitle: string;
        probability: number;
        username: string;
    } | null>(null);

    // --- INITIALIZATION ---
    useEffect(() => {
        // Load Outcomes from Constant or DB (Mocking DB load from constant for now)
        const initialOutcomes = MULTI_OUTCOMES[slug] || [];
        setMarketOutcomes(initialOutcomes);

        if (initialOutcomes.length > 0) {
            setSelectedOutcomeId(initialOutcomes[0].id);
            setSelectedOutcomeName(initialOutcomes[0].title);
            setLivePrice(initialOutcomes[0].yesPrice);

            // Generate Initial Stable Chart History for all outcomes
            const initialSeries = initialOutcomes.map(o => ({
                name: o.title,
                data: Array.from({ length: 50 }, (_, i) => {
                    const date = new Date();
                    date.setHours(date.getHours() - (50 - i));
                    const variance = Math.sin(i * 0.2) * 2;
                    return {
                        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        value: Math.max(1, Math.min(99, o.chance + variance))
                    };
                })
            }));
            setChartSeries(initialSeries);
        } else {
            // Single market init handled in "Load Market Data" effect
        }
    }, [slug]);

    // --- PARI-MUTUEL LOGIC ---
    const updateExectutionPrices = (targetId: string, priceDelta: number) => {
        if (!isMultiOutcome) {
            // Single market logic
            setLivePrice(prev => {
                const newP = Math.max(1, Math.min(99, prev + priceDelta));
                setChartData(cPrev => [...cPrev.slice(1), { time: new Date().toLocaleTimeString(), value: newP }]);
                return newP;
            });
            return Math.max(1, Math.min(99, livePrice + priceDelta));
        }

        // Multi-Market Logic
        // 1. Calculate New Target Price
        const targetIndex = marketOutcomes.findIndex(o => o.id === targetId);
        if (targetIndex === -1) return livePrice;

        const oldTargetPrice = marketOutcomes[targetIndex].chance; // Using chance as price
        const newTargetPrice = Math.max(1, Math.min(99, oldTargetPrice + priceDelta));
        const actualDelta = newTargetPrice - oldTargetPrice;

        if (actualDelta === 0) return oldTargetPrice;

        // 2. Redistribute the delta (inverted) among others to keep sum constant
        // We need to decrease others if target increases, and vice versa.
        // sum(others_new) = sum(others_old) - actualDelta
        const othersIndices = marketOutcomes.map((_, i) => i).filter(i => i !== targetIndex);
        const sumOthers = othersIndices.reduce((acc, i) => acc + marketOutcomes[i].chance, 0);

        const newOutcomes = [...marketOutcomes];
        const newSeries = [...chartSeries];
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Update Target
        newOutcomes[targetIndex] = { ...newOutcomes[targetIndex], chance: Math.round(newTargetPrice), yesPrice: Math.round(newTargetPrice) };

        // Update Others
        othersIndices.forEach(i => {
            const weight = marketOutcomes[i].chance / sumOthers;
            const deduction = actualDelta * weight; // If delta is positive (price up), deduction creates decrease.
            const newPriceOther = Math.max(1, Math.min(99, marketOutcomes[i].chance - deduction));

            newOutcomes[i] = {
                ...newOutcomes[i],
                chance: Math.round(newPriceOther),
                yesPrice: Math.round(newPriceOther)
            };
        });

        // Update State
        setMarketOutcomes(newOutcomes);
        setLivePrice(newTargetPrice);

        // Update Chart Series (Append new point for EVERY outcome)
        newOutcomes.forEach((o, i) => {
            // Find corresponding series by name (assuming unique names)
            const sIndex = newSeries.findIndex(s => s.name === o.title);
            if (sIndex !== -1) {
                const newData = [...newSeries[sIndex].data];
                newData.push({ time: nowTime, value: o.chance });
                if (newData.length > 50) newData.shift();
                newSeries[sIndex] = { ...newSeries[sIndex], data: newData };
            }
        });
        setChartSeries(newSeries);

        return newTargetPrice;
    };

    // Handler for when user clicks YES/NO on an outcome
    const handleOutcomeBuyClick = (outcomeId: string, outcomeName: string, side: 'YES' | 'NO', price: number) => {
        const outcome = marketOutcomes.find(o => o.id === outcomeId);
        if (outcome) {
            setSelectedOutcomeId(outcomeId);
            setSelectedOutcomeName(outcomeName);
            setSelectedSide(side);
            setLivePrice(outcome.chance); // Use chance which is dynamically updated
        }
    };

    // ... (Keep Initial Load Effect for basic data)
    // ... (Keep Update Balance Effect)
    // ... (Keep Load Market Data Effect - NOTE: This might conflict if it sets livePrice back. 
    //      We need to make sure the loop updates respect the state.)

    // ... (Keep Calculations)
    // ... (Keep Auto-refresh SOL)

    // REFERENCED IN CODE REPLACEMENT:
    // We are replacing the top part of the component up to handlePlaceBet 
    // AND swapping logic inside handlePlaceBet and Sell Button.

    // Let's do a targeted replacements.

    // ...

    // Initial Load
    useEffect(() => {
        const fetchSolPrice = async () => {
            try {
                const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
                const data = await res.json();
                setSolPrice(parseFloat(data.price));
            } catch (e) { console.error("Error price"); }
        };
        fetchSolPrice();

        // Load Profile
        const savedProfile = localStorage.getItem('djinn_user_profile');
        if (savedProfile) setUserProfile(JSON.parse(savedProfile));
        if (publicKey) {
            supabaseDb.getProfile(publicKey.toBase58()).then(p => {
                if (p) setUserProfile({ username: p.username, avatarUrl: p.avatar_url });
            });
        }
    }, [publicKey]);

    // Update Balance
    useEffect(() => {
        if (!connection || !publicKey) return;
        const up = async () => {
            try {
                const bal = await connection.getBalance(publicKey, 'confirmed');
                setSolBalance(bal / LAMPORTS_PER_SOL);
            } catch (e) { console.error(e); }
        };
        up();
    }, [connection, publicKey]);

    // LOAD MARKET DATA (When effectiveSlug changes)
    useEffect(() => {
        const loadMarketData = async () => {
            // Priority: Supabase -> Static Outcome Defaults -> 50
            const dbData = await supabaseDb.getMarketData(effectiveSlug);

            if (dbData) {
                setLivePrice(dbData.live_price);
                setChartData(generateChartData(dbData.live_price));
            } else {
                // Try initial default from outcomes list if available
                const initialOutcome = marketOutcomes.find(o => o.id === effectiveSlug);
                const initialPrice = initialOutcome ? initialOutcome.yesPrice : 50;
                setLivePrice(initialPrice);
                setChartData(generateChartData(initialPrice));
            }

            // Load Activity - Show ALL activities for this market (parent + all outcomes)
            const activity = await supabaseDb.getActivity();
            // For multi-outcome markets, show activities matching parent slug OR any outcome ID
            const outcomeIds = marketOutcomes.map(o => o.id);
            const relevantActivity = activity.filter(a =>
                a.market_slug === slug || // Parent market
                a.market_slug === effectiveSlug || // Current outcome
                outcomeIds.includes(a.market_slug) // Any outcome of this market
            );
            setActivityList(relevantActivity);

            // Load Holders
            const topHolders = await supabaseDb.getTopHolders(effectiveSlug);
            setHolders(topHolders);

            // Load User's Position from DB (to persist Sell button after refresh)
            if (publicKey) {
                const userBets = await supabaseDb.getUserBets(publicKey.toBase58());
                const myBet = userBets.find(b => b.market_slug === effectiveSlug && !b.claimed);
                if (myBet) {
                    setMyHeldPosition(myBet.side);
                    setMyHeldAmount(`$${myBet.amount.toFixed(2)}`);
                }
            }
        };

        loadMarketData();

        const marketSub = supabaseDb.subscribeToMarketData(effectiveSlug, (payload) => {
            if (payload.new?.live_price) {
                const newPrice = payload.new.live_price;
                setLivePrice(newPrice);
                setChartData(prev => {
                    const newData = [...prev];
                    const date = new Date();
                    newData.push({ time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: newPrice });
                    if (newData.length > 50) newData.shift();
                    return newData;
                });
            }
        });

        const activitySub = supabaseDb.subscribeToActivity((payload) => {
            if (payload.new?.market_slug === effectiveSlug) {
                setActivityList(prev => [payload.new, ...prev]);
                // Refresh holders on new activity
                supabaseDb.getTopHolders(effectiveSlug).then(setHolders);
            }
        });

        return () => {
            marketSub.unsubscribe();
            activitySub.unsubscribe();
        };
    }, [effectiveSlug, marketOutcomes, publicKey]);

    // CALCULATIONS
    const amountNum = parseFloat(betAmount) || 0;
    const isOverBalance = amountNum > solBalance;
    const currentPriceForSide = selectedSide === 'YES' ? livePrice : (100 - livePrice);

    // Fix: Calculate shares based on USD value, not SOL amount directly
    const usdValueInTrading = amountNum * solPrice;
    const estimatedShares = usdValueInTrading > 0 ? (usdValueInTrading / (currentPriceForSide / 100)) : 0;

    const potentialProfit = estimatedShares - usdValueInTrading;
    const chartColor = selectedSide === 'YES' ? '#10b981' : '#EF4444';

    // Auto-refresh SOL Price every 30s
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
                const data = await res.json();
                setSolPrice(parseFloat(data.price));
            } catch (e) { console.error("Error refreshing SOL price"); }
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // PLACE BET
    const handlePlaceBet = async () => {
        if (!publicKey || isOverBalance || amountNum <= 0) return;
        setIsPending(true);
        try {
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: Math.floor(amountNum * LAMPORTS_PER_SOL),
                })
            );

            const signature = await sendTransaction(transaction, connection);
            const latestBlockhash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');

            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);

            // Virtual AMM Logic - Pari Mutuel Simulation for Multi-Outcome
            const virtualLiquidity = 1000000; // $1M liquidity
            const usdBet = amountNum * solPrice;
            const priceImpact = (usdBet / virtualLiquidity) * 50;

            // 0. ENSURE PROFILE EXISTS (Prevent FK Errors)
            // If the user hasn't "Logged In" via the modal but connected wallet, they might miss a profile.
            // We autocreate one here to allow betting.
            const profileCheck = await supabaseDb.getProfile(publicKey.toBase58());
            if (!profileCheck) {
                await supabaseDb.upsertProfile({
                    wallet_address: publicKey.toBase58(),
                    username: `User ${publicKey.toBase58().slice(0, 4)}`,
                    bio: 'Crypto trader',
                    avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${publicKey.toBase58()}`
                });
                // Update local state so UI reflects it immediately
                setUserProfile({
                    username: `User ${publicKey.toBase58().slice(0, 4)}`,
                    avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${publicKey.toBase58()}`
                });
            }

            // Ensure Market Exists in DB (Fix for FK Violation on Multi-Outcome)
            if (isMultiOutcome) {
                // Check if this sub-market exists first to avoid unnecessary upserts/errors
                const existingMarket = await supabaseDb.getMarket(effectiveSlug);

                if (!existingMarket) {
                    await supabaseDb.createMarket({
                        slug: effectiveSlug,
                        title: selectedOutcomeName || effectiveSlug,
                        description: `Outcome market for ${staticMarketInfo.title}`,
                        creator_wallet: publicKey.toBase58(), // Use current user as 'registrar' to ensure valid FK
                        total_yes_pool: 0,
                        total_no_pool: 0,
                        resolved: false,
                        resolution_source: 'DERIVED'
                    });
                }
            }

            // --- EXECUTE PRICE UPDATE (PARI-MUTUEL) ---
            // This updates State + Charts for ALL outcomes
            const newPrice = updateExectutionPrices(effectiveSlug, priceImpact);

            setMyHeldPosition(selectedSide);
            setMyHeldAmount(`$${usdBet.toFixed(2)}`);

            // Update Supabase
            // TODO: In a real app we'd update ALL outcomes in DB. 
            // For now, we update the traded one.
            await supabaseDb.updateMarketPrice(effectiveSlug, newPrice, usdBet);

            // ... (rest of log activity)
            const { error: activityError } = await supabaseDb.createActivity({
                wallet_address: publicKey.toBase58(),
                username: userProfile.username,
                avatar_url: userProfile.avatarUrl,
                action: selectedSide,
                amount: parseFloat(usdBet.toFixed(2)),
                sol_amount: parseFloat(amountNum.toFixed(4)),
                shares: parseFloat(estimatedShares.toFixed(2)),
                market_title: staticMarketInfo.title,
                market_slug: effectiveSlug
            });

            if (activityError) {
                console.error("Activity Error:", activityError);
                alert(`Error al registrar actividad: ${activityError.message || JSON.stringify(activityError)}`);
            }

            // Save bet for payout calculation
            const betData = {
                market_slug: effectiveSlug,
                wallet_address: publicKey.toBase58(),
                side: selectedSide,
                amount: parseFloat(usdBet.toFixed(2)),
                sol_amount: parseFloat(amountNum.toFixed(4)),
                shares: parseFloat(estimatedShares.toFixed(2)),
                entry_price: livePrice
            };
            console.log("📝 Saving bet to DB:", betData);

            const { data: betResult, error: betError } = await supabaseDb.createBet(betData);

            if (betError) {
                console.error("❌ Bet Error:", betError);
                alert(`Error al guardar bet: ${betError.message || JSON.stringify(betError)}`);
            } else {
                console.log("✅ Bet saved:", betResult);
            }

            // Update Comments Context
            await supabaseDb.updateCommentPosition(publicKey.toBase58(), effectiveSlug, selectedSide, `$${usdBet.toFixed(2)}`);

            setLastOrder({ price: newPrice, shares: estimatedShares, total: usdBet, type: selectedSide });
            setBetAmount('');

            // Trigger Toast Notification
            setLastBetDetails({
                outcomeName: selectedOutcomeName || 'YES',
                side: selectedSide,
                solAmount: amountNum,
                usdAmount: usdBet,
                marketTitle: staticMarketInfo.title,
                probability: Math.round(newPrice),
                username: userProfile.username
            });
            setShowPurchaseToast(true);

            // Sync with ActivePositionsWidget
            window.dispatchEvent(new Event('bet-updated'));

            // --- TRIGGER ORACLE MONITORING ---
            fetch('/api/oracle/monitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: effectiveSlug })
            }).catch(err => console.error("Oracle trigger error", err));
        } catch (e) {
            console.error(e);
            alert("Transaction failed.");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32">
            <Navbar />
            <div className="max-w-7xl mx-auto pt-32 px-4 md:px-6 relative z-10">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-[#0E0E0E] rounded-2xl border border-white/10 flex items-center justify-center text-5xl shadow-2xl overflow-hidden">
                        {typeof staticMarketInfo.icon === 'string' && staticMarketInfo.icon.startsWith('data:') ? <img src={staticMarketInfo.icon} className="w-full h-full object-cover" /> : staticMarketInfo.icon}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 leading-tight">{staticMarketInfo.title}</h1>
                        <p className="text-gray-500 text-sm font-medium">{staticMarketInfo.description}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* CHART CARD */}
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden min-h-[400px]">
                            {isMultiOutcome ? (
                                /* Multi-outcome: Chart first, then outcomes list */
                                <>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-black tracking-tight text-white">All Outcomes</span>
                                            <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded">{marketOutcomes.length} options</span>
                                        </div>
                                        {myHeldPosition && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#10B981]/20 to-[#10B981]/10 border border-[#10B981]/30">
                                                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                                                <span className="text-[10px] font-black uppercase text-[#10B981] tracking-wide">Your Position Active</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Multi-line chart with all outcomes */}
                                    <MultiLineChart
                                        outcomes={chartSeries.map(s => ({
                                            ...s,
                                            // Pass current probability for legend styling
                                            chance: marketOutcomes.find(o => o.title === s.name)?.chance || 0
                                        }))}
                                        hasPosition={!!myHeldPosition}
                                        selectedOutcome={selectedOutcomeName}
                                    />

                                    {/* Outcomes list BELOW the chart */}
                                    <div className="mt-6 pt-6 border-t border-white/10">
                                        <h3 className="text-sm font-black uppercase text-gray-500 mb-4 tracking-wider">Select an outcome to trade</h3>
                                        <OutcomeList
                                            outcomes={marketOutcomes}
                                            selectedId={selectedOutcomeId}
                                            onSelect={setSelectedOutcomeId}
                                            onBuyClick={handleOutcomeBuyClick}
                                        />
                                    </div>
                                </>
                            ) : (
                                /* Single outcome chart */
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-5xl font-black tracking-tighter transition-colors" style={{ color: chartColor }}>{livePrice.toFixed(1)}%</span>
                                            <span className="text-xl font-bold text-gray-500">chance</span>
                                        </div>
                                        {myHeldPosition && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#10B981]/20 to-[#10B981]/10 border border-[#10B981]/30">
                                                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                                                <span className="text-[10px] font-black uppercase text-[#10B981] tracking-wide">Your Position Active</span>
                                            </div>
                                        )}
                                    </div>
                                    <MarketChart data={chartData} color={chartColor} hasPosition={!!myHeldPosition} />
                                </>
                            )}
                        </div>

                        {/* TABS & CONTENT */}
                        <div>
                            <div className="flex items-center gap-6 mb-6 border-b border-white/5 pb-2">
                                <TabButton label="Thoughts" icon={<Activity size={14} />} active={bottomTab === 'COMMENTS'} onClick={() => setBottomTab('COMMENTS')} />
                                <TabButton label="Activity" icon={<Activity size={14} />} active={bottomTab === 'ACTIVITY'} onClick={() => setBottomTab('ACTIVITY')} />
                                <TabButton label="Holders" icon={<Users size={14} />} active={bottomTab === 'HOLDERS'} onClick={() => setBottomTab('HOLDERS')} />
                            </div>

                            {bottomTab === 'COMMENTS' && (
                                <CommentsSection
                                    marketSlug={effectiveSlug}
                                    publicKey={publicKey ? publicKey.toBase58() : null}
                                    userProfile={userProfile}
                                    myHeldPosition={myHeldPosition}
                                    myHeldAmount={myHeldAmount}
                                />
                            )}

                            {bottomTab === 'ACTIVITY' && (
                                <div className="bg-[#0E0E0E] rounded-[2rem] border border-white/5 overflow-hidden">
                                    {activityList.length === 0 ? (
                                        <div className="p-8 text-center text-gray-600 italic">No activity yet</div>
                                    ) : (
                                        activityList.map((act, i) => (
                                            <Link
                                                key={i}
                                                href={`/market/${act.market_slug}`}
                                                className="flex items-center gap-4 py-3 border-b border-white/5 px-5 hover:bg-white/5 transition-colors cursor-pointer"
                                            >
                                                {/* Avatar */}
                                                <div className="relative">
                                                    {act.avatar_url ? (
                                                        <img src={act.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/10" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F492B7] to-[#E056A0] flex items-center justify-center text-black font-bold text-xs">
                                                            {act.username?.slice(0, 2)?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    {/* Side indicator dot */}
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0E0E0E] ${act.action === 'YES' ? 'bg-[#10B981]' : 'bg-red-500'}`} />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-bold text-sm truncate">{act.username}</span>
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${act.action === 'YES' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/20 text-red-500'}`}>
                                                            {act.shares === 0 ? 'SOLD' : act.action}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 text-[10px] truncate">{act.market_title}</p>
                                                </div>

                                                {/* Amount */}
                                                <div className="text-right flex flex-col items-end gap-0.5 flex-shrink-0">
                                                    <span className="text-[#F492B7] font-black text-sm">{act.sol_amount?.toFixed(2) || '0'} SOL</span>
                                                    <span className="text-gray-600 text-[10px] font-mono">{timeAgo(act.created_at)}</span>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            )}

                            {bottomTab === 'HOLDERS' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-[#0E0E0E] rounded-[2rem] border border-white/5 p-6">
                                        <h3 className="text-[#10B981] font-black uppercase text-xs mb-4">Top Holders</h3>
                                        {holders.length === 0 ? (
                                            <div className="text-gray-500 text-sm italic">No holders yet</div>
                                        ) : (
                                            holders.map((h, i) => (
                                                <div key={i} className={`flex justify-between items-center text-sm py-3 border-b border-white/5 last:border-0 ${h.wallet_address === publicKey?.toBase58() ? 'bg-white/5 -mx-2 px-2 rounded' : ''}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-gray-600 font-bold text-xs">#{h.rank}</span>
                                                        <span className="text-white font-bold">{h.name}</span>
                                                        {h.wallet_address === publicKey?.toBase58() && <span className="text-[10px] bg-[#F492B7] text-black px-1.5 rounded font-bold">YOU</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${h.side === 'YES' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/20 text-red-500'}`}>
                                                            {h.side || 'YES'}
                                                        </span>
                                                        <span className="text-gray-500 font-mono">{Math.round(h.shares)}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: TRADING & ORDER BOOK */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* TRADING PANEL */}
                        <div className="bg-[#0E0E0E] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl">
                            {/* Header with selected outcome indicator */}
                            <div className="flex justify-between mb-4 items-center">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-white opacity-40">Trade</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold bg-white/5 px-2 py-1 rounded">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        SOL: ${solPrice.toFixed(2)}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#F492B7] bg-[#F492B7]/10 px-3 py-1 rounded-full">
                                        <Wallet size={10} /> <span>{solBalance.toFixed(2)} SOL</span>
                                    </div>
                                </div>
                            </div>

                            {/* YES/NO Buttons - show outcome name in multi-outcome mode */}
                            {isMultiOutcome ? (
                                <div className="mb-6">
                                    <div className="bg-[#0E0E0E] rounded-2xl border border-white/10 p-4 flex items-center justify-between group hover:border-[#F492B7]/50 transition-colors">
                                        <div>
                                            <span className="block text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">Selected Outcome</span>
                                            <span className="text-xl font-bold text-white flex items-center gap-2">
                                                {selectedOutcomeName || 'Select an option'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-3xl font-black text-[#10B981]">{livePrice.toFixed(0)}%</span>
                                            <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider">Implied Prob</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button onClick={() => setSelectedSide('YES')} className={`p-4 rounded-2xl border transition-all ${selectedSide === 'YES' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-white/5 border-white/5'}`}>
                                        <span className={`block text-xs font-black uppercase mb-1 ${selectedSide === 'YES' ? 'text-emerald-500' : 'text-gray-500'}`}>
                                            YES
                                        </span>
                                        <span className="block text-2xl font-black text-white">{livePrice.toFixed(0)}¢</span>
                                    </button>
                                    <button onClick={() => setSelectedSide('NO')} className={`p-4 rounded-2xl border transition-all ${selectedSide === 'NO' ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5'}`}>
                                        <span className={`block text-xs font-black uppercase mb-1 ${selectedSide === 'NO' ? 'text-red-500' : 'text-gray-500'}`}>
                                            NO
                                        </span>
                                        <span className="block text-2xl font-black text-white">{(100 - livePrice).toFixed(0)}¢</span>
                                    </button>
                                </div>
                            )}

                            <div className="mb-2 relative group">
                                <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0.00" className={`w-full bg-black border-2 rounded-2xl p-5 text-2xl font-black text-white focus:border-[#F492B7] outline-none ${isOverBalance ? 'border-red-500' : 'border-white/10'}`} />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs uppercase tracking-widest pointer-events-none">SOL</span>
                            </div>
                            <div className="mb-6 text-right px-2">
                                <span className="text-xs font-bold text-gray-500">
                                    ≈ ${usdValueInTrading.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </span>
                            </div>

                            {/* Potential returns shown when amount entered */}
                            {amountNum > 0 && !isOverBalance && (
                                <div className="mb-6 p-3 bg-gradient-to-br from-[#10B981]/10 to-transparent rounded-xl border border-[#10B981]/20">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400">If {selectedSide} wins</span>
                                        <div className="text-right">
                                            <span className="text-lg font-black text-[#10B981]">+${potentialProfit.toFixed(2)}</span>
                                            <span className="block text-[9px] text-gray-500">{estimatedShares.toFixed(0)} shares</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button onClick={handlePlaceBet} disabled={isPending || isOverBalance} className={`w-full font-black py-4 rounded-xl text-sm transition-all uppercase flex items-center justify-center gap-2 ${isSuccess ? 'bg-[#10B981]' : isOverBalance ? 'bg-gray-800' : 'bg-[#3B82F6] hover:bg-[#2563EB]'}`}>
                                {isPending ? <Loader2 className="animate-spin" size={18} /> : isSuccess ? <CheckCircle2 size={18} /> : 'Buy Shares'}
                            </button>

                            {/* REDEEM / SELL BUTTON */}
                            {myHeldPosition && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <button
                                        onClick={async () => {
                                            if (confirm("Are you sure you want to sell your entire position?")) {
                                                setIsPending(true);
                                                try {
                                                    // 1. Calculate Sell Impact (Reverse of Buy)
                                                    const virtualLiquidity = 1000000;
                                                    const amountToSellUSD = parseFloat(myHeldAmount?.replace('$', '') || '0');
                                                    const priceImpact = (amountToSellUSD / virtualLiquidity) * 50;

                                                    // 2. Execute Price Update (Pari-Mutuel Inverse)
                                                    // This handles Chart + State + Other Outcomes
                                                    const newPrice = updateExectutionPrices(effectiveSlug, -priceImpact);

                                                    // 3. Update DB
                                                    await supabaseDb.updateMarketPrice(effectiveSlug, newPrice, amountToSellUSD);

                                                    // 4. Log Activity (Sell)
                                                    const sellActivity = {
                                                        wallet_address: publicKey?.toBase58() || 'anon',
                                                        username: userProfile.username,
                                                        avatar_url: userProfile.avatarUrl,
                                                        action: 'NO' as const,
                                                        amount: amountToSellUSD,
                                                        sol_amount: amountToSellUSD / solPrice,
                                                        shares: 0,
                                                        market_title: staticMarketInfo.title,
                                                        market_slug: effectiveSlug,
                                                        created_at: new Date().toISOString()
                                                    };
                                                    await supabaseDb.createActivity(sellActivity);

                                                    // Immediate local update for instant feedback
                                                    setActivityList(prev => [sellActivity, ...prev]);

                                                    // 5. Mark bet as sold/refunded in DB (so it disappears from Active Bets)
                                                    await supabaseDb.cancelBet(publicKey?.toBase58() || '', effectiveSlug);

                                                    // 6. Refund (Simulated)
                                                    setSolBalance(prev => prev + (amountToSellUSD / solPrice));
                                                    setMyHeldPosition(null);
                                                    setMyHeldAmount(null);

                                                    // Sync with ActivePositionsWidget
                                                    window.dispatchEvent(new Event('bet-updated'));

                                                    alert("Position Sold! Funds returned to wallet.");
                                                } catch (e) {
                                                    console.error("Error selling:", e);
                                                    alert("Error processing sell.");
                                                } finally {
                                                    setIsPending(false);
                                                }
                                            }
                                        }}
                                        className="w-full py-3 rounded-xl border border-red-500/20 text-red-500 font-bold text-xs uppercase hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Sell Shares
                                    </button>
                                    <p className="text-[9px] text-gray-600 text-center mt-2">
                                        Usually involves a small fee or spread.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ORDER BOOK */}
                        <div className="h-96">
                            <h3 className="text-xs font-black uppercase text-gray-500 mb-4 pl-2">Order Book</h3>
                            <OrderBook currentPrice={livePrice} outcome={selectedSide} lastOrder={lastOrder} activityData={activityList} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Purchase Toast Notification */}
            <PurchaseToast
                isVisible={showPurchaseToast}
                onClose={() => setShowPurchaseToast(false)}
                onShare={() => {
                    setShowPurchaseToast(false);
                    setShowShareModal(true);
                }}
                betDetails={lastBetDetails}
            />

            {/* Share Modal */}
            {lastBetDetails && (
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    betDetails={lastBetDetails}
                />
            )}

            {/* Active Positions Widget (Bottom Right) */}
            <ActivePositionsWidget
                walletAddress={publicKey?.toBase58() || null}
                currentSlug={effectiveSlug}
                onSell={(position) => {
                    // Navigate to the market if not current
                    if (position.market_slug !== effectiveSlug) {
                        window.location.href = `/market/${position.market_slug}`;
                    }
                    // Otherwise, the sell button in trading panel handles it
                }}
                onCollect={async (position) => {
                    // Claim the payout
                    try {
                        await supabaseDb.claimPayout(position.id);
                        alert(`Claimed $${position.payout?.toFixed(2)}! Funds will be sent to your wallet.`);
                        window.location.reload();
                    } catch (e) {
                        console.error('Error claiming:', e);
                        alert('Error claiming payout.');
                    }
                }}
            />
        </div>
    );
}


function TabButton({ label, icon, active, onClick }: any) { return <button onClick={onClick} className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors pb-2 ${active ? 'text-white border-b-2 border-[#F492B7]' : 'text-gray-600 hover:text-gray-400'}`}>{icon} {label}</button>; }

function timeAgo(dateString?: string) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}