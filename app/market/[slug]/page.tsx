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
import OrderBook from '@/components/market/OrderBook';
import CommentsSection from '@/components/market/CommentsSection';
import OutcomeList, { Outcome } from '@/components/market/OutcomeList';
import * as supabaseDb from '@/lib/supabase-db';

// Utils
const TREASURY_WALLET = new PublicKey("C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X");

// --- MOCK MULTI-OUTCOMES ---
const MULTI_OUTCOMES: Record<string, Outcome[]> = {
    'us-strike-mexico': [
        { id: 'us-strike-mexico-jan-31', title: 'January 31', volume: '$352K', yesPrice: 7, noPrice: 93, chance: 7 },
        { id: 'us-strike-mexico-mar-31', title: 'March 31', volume: '$137K', yesPrice: 22, noPrice: 78, chance: 22 },
        { id: 'us-strike-mexico-dec-31', title: 'December 31', volume: '$130K', yesPrice: 38, noPrice: 62, chance: 38 },
    ]
};

const marketDisplayData: Record<string, any> = {
    'argentina-world-cup-2026': { title: "Will Argentina be finalist on the FIFA World Cup 2026?", icon: "🇦🇷", description: "Se resuelve YES si Argentina juega la final." },
    'btc-hit-150k': { title: 'Will Bitcoin reach ATH on 2026?', icon: '₿', description: 'Resolves YES if BTC breaks its previous record.' },
    'us-strike-mexico': { title: 'US strike on Mexico by...?', icon: '🇺🇸', description: 'Predicting geopolitical events.' }
};



// Generate a flat line history for stability, or very slight organic variance
// User requested "quiet", only moving on buys/sells.
const generateChartData = (basePrice: number) => {
    const data = [];
    // Generate a flat line history for stability, or very slight organic variance
    // User requested "quiet", only moving on buys/sells.
    for (let i = 0; i < 50; i++) {
        const date = new Date();
        date.setHours(date.getHours() - (50 - i));
        // Mock history: just show the current price as a baseline
        // In a real app, we would fetch historical candles.
        // For now, flat line is better than random noise.
        data.push({
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: basePrice
        });
    }
    return data;
};

export default function MarketPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    // Outcomes logic
    const outcomes = MULTI_OUTCOMES[slug] || [];
    const isMultiOutcome = outcomes.length > 0;
    const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(isMultiOutcome ? outcomes[0].id : null);

    // The slug used for DB access (persistence key)
    const effectiveSlug = selectedOutcomeId || slug;

    // Derived Market Info
    const staticMarketInfo = marketDisplayData[slug] || { title: slug, icon: "🔮", description: "Market info..." };

    // State
    const [solPrice, setSolPrice] = useState<number>(0);
    const [solBalance, setSolBalance] = useState<number>(0);
    const [livePrice, setLivePrice] = useState<number>(50);
    const [isPending, setIsPending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [userProfile, setUserProfile] = useState({ username: "Guest", avatarUrl: null as string | null });
    const [betAmount, setBetAmount] = useState('');
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');
    const [bottomTab, setBottomTab] = useState<'ACTIVITY' | 'COMMENTS' | 'HOLDERS'>('COMMENTS');
    const [chartData, setChartData] = useState<any[]>([]);
    const [activityList, setActivityList] = useState<any[]>([]);
    const [holders, setHolders] = useState<any[]>([]);

    // My Position
    const [myHeldPosition, setMyHeldPosition] = useState<'YES' | 'NO' | null>(null);
    const [myHeldAmount, setMyHeldAmount] = useState<string | null>(null);
    const [lastOrder, setLastOrder] = useState<any>(null);

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
                const initialOutcome = outcomes.find(o => o.id === effectiveSlug);
                const initialPrice = initialOutcome ? initialOutcome.yesPrice : 50;
                setLivePrice(initialPrice);
                setChartData(generateChartData(initialPrice));
            }

            // Load Activity
            const activity = await supabaseDb.getActivity();
            const relevantActivity = activity.filter(a => a.market_slug === effectiveSlug); // Simple client-side filter for demo
            setActivityList(relevantActivity);

            // Load Holders
            const topHolders = await supabaseDb.getTopHolders(effectiveSlug);
            setHolders(topHolders);
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
    }, [effectiveSlug, outcomes]);

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

            // Virtual AMM Logic
            const virtualLiquidity = 1000000; // $1M liquidity
            const usdBet = amountNum * solPrice;
            const priceImpact = (usdBet / virtualLiquidity) * 50;
            const newPrice = selectedSide === 'YES'
                ? Math.min(99, livePrice + priceImpact)
                : Math.max(1, livePrice - priceImpact);

            setLivePrice(newPrice);
            setMyHeldPosition(selectedSide);
            setMyHeldAmount(`$${usdBet.toFixed(2)}`);

            // Update Supabase
            await supabaseDb.updateMarketPrice(effectiveSlug, newPrice, usdBet);
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

            // Update Comments Context
            await supabaseDb.updateCommentPosition(publicKey.toBase58(), effectiveSlug, selectedSide, `$${usdBet.toFixed(2)}`);

            setLastOrder({ price: newPrice, shares: estimatedShares, total: usdBet, type: selectedSide });
            setBetAmount('');
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

                {/* MULTI-OUTCOME LIST (Like Polymarket) */}
                {isMultiOutcome && (
                    <div className="mb-10">
                        <OutcomeList
                            outcomes={outcomes}
                            selectedId={selectedOutcomeId}
                            onSelect={setSelectedOutcomeId}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* CHART CARD */}
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-5xl font-black tracking-tighter transition-colors" style={{ color: chartColor }}>{livePrice.toFixed(1)}%</span>
                                    <span className="text-xl font-bold text-gray-500">chance</span>
                                </div>
                                {!myHeldPosition && (
                                    <div className="text-[10px] font-black uppercase text-gray-600 bg-white/5 px-2 py-1 rounded">
                                        {isMultiOutcome ? outcomes.find(o => o.id === selectedOutcomeId)?.title : 'Binary'}
                                    </div>
                                )}
                            </div>
                            <MarketChart data={chartData} color={chartColor} hasPosition={!!myHeldPosition} />
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
                                            <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 px-4 hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${act.action === 'NO' ? 'bg-red-500' : 'bg-[#10B981]'}`} />
                                                    <div className="flex flex-col">
                                                        <Link href={`/profile/${act.username}`} className="text-xs font-bold text-white font-mono hover:text-[#F492B7] transition-colors">{act.username}</Link>
                                                        <span className={`text-[10px] font-black uppercase ${act.action === 'NO' ? 'text-red-500' : 'text-[#10B981]'}`}>{act.action === 'NO' ? 'Sold NO' : 'Bought YES'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                                                        <span className="text-[#F492B7]">{act.sol_amount ? `${act.sol_amount} SOL` : ''}</span>
                                                        <span className="text-xs text-gray-500">(${act.amount})</span>
                                                    </div>
                                                    {act.shares && (
                                                        <span className="text-[10px] font-bold text-[#10B981]">
                                                            +${(act.shares - act.amount).toFixed(2)} reward
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] text-gray-600 font-bold uppercase mt-0.5">Just now</span>
                                                </div>
                                            </div>
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
                                                    <span className="text-gray-500 font-mono">{h.shares.toLocaleString()} shares</span>
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
                            <div className="flex justify-between mb-6 items-center">
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

                            {/* ... Buttons ... */}

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button onClick={() => setSelectedSide('YES')} className={`p-4 rounded-2xl border transition-all ${selectedSide === 'YES' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-white/5 border-white/5'}`}>
                                    <span className={`block text-xs font-black uppercase mb-1 ${selectedSide === 'YES' ? 'text-emerald-500' : 'text-gray-500'}`}>YES</span>
                                    <span className="block text-2xl font-black text-white">{livePrice.toFixed(0)}¢</span>
                                </button>
                                <button onClick={() => setSelectedSide('NO')} className={`p-4 rounded-2xl border transition-all ${selectedSide === 'NO' ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5'}`}>
                                    <span className={`block text-xs font-black uppercase mb-1 ${selectedSide === 'NO' ? 'text-red-500' : 'text-gray-500'}`}>NO</span>
                                    <span className="block text-2xl font-black text-white">{(100 - livePrice).toFixed(0)}¢</span>
                                </button>
                            </div>

                            <div className="mb-2 relative group">
                                <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0.00" className={`w-full bg-black border-2 rounded-2xl p-5 text-2xl font-black text-white focus:border-[#F492B7] outline-none ${isOverBalance ? 'border-red-500' : 'border-white/10'}`} />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs uppercase tracking-widest pointer-events-none">SOL</span>
                            </div>
                            <div className="mb-6 text-right px-2">
                                <span className="text-xs font-bold text-gray-500">
                                    ≈ ${usdValueInTrading.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </span>
                            </div>

                            {amountNum > 0 && !isOverBalance && (
                                <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2 animate-in fade-in zoom-in">
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Est. Shares</span>
                                        <span className="text-sm font-bold text-white">{estimatedShares.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-white/5 pt-2">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Potential Return</span>
                                        <span className="text-sm font-bold text-[#10B981]">+${potentialProfit.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            <button onClick={handlePlaceBet} disabled={isPending || isOverBalance} className={`w-full font-black py-4 rounded-xl text-sm transition-all uppercase flex items-center justify-center gap-2 ${isSuccess ? 'bg-[#10B981]' : isOverBalance ? 'bg-gray-800' : 'bg-[#3B82F6] hover:bg-[#2563EB]'}`}>
                                {isPending ? <Loader2 className="animate-spin" size={18} /> : isSuccess ? <CheckCircle2 size={18} /> : 'Place Order'}
                            </button>
                        </div>

                        {/* ORDER BOOK */}
                        <div className="h-96">
                            <h3 className="text-xs font-black uppercase text-gray-500 mb-4 pl-2">Order Book</h3>
                            <OrderBook currentPrice={livePrice} outcome={selectedSide} lastOrder={lastOrder} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TabButton({ label, icon, active, onClick }: any) { return <button onClick={onClick} className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors pb-2 ${active ? 'text-white border-b-2 border-[#F492B7]' : 'text-gray-600 hover:text-gray-400'}`}>{icon} {label}</button>; }