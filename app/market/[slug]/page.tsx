'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Clock, DollarSign, Wallet, Activity, Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { simulateBuy, estimatePayoutInternal, INITIAL_VIRTUAL_SOL } from '@/lib/core-amm';

// Components
import MarketChart from '@/components/market/MarketChart';
import MultiLineChart from '@/components/market/MultiLineChart';
import CommentsSection from '@/components/market/CommentsSection';
import OutcomeList, { Outcome } from '@/components/market/OutcomeList';
import PurchaseToast from '@/components/market/PurchaseToast';
import ShareModal from '@/components/market/ShareModal';
import ActivePositionsWidget from '@/components/market/ActivePositionsWidget';
import DjinnToast, { DjinnToastType } from '@/components/ui/DjinnToast';
import * as supabaseDb from '@/lib/supabase-db';

// Utils
const TREASURY_WALLET = new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

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
    const { publicKey } = useWallet();
    const { placeBet, sellShares, program } = useDjinnProtocol();

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
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [userProfile, setUserProfile] = useState({ username: "Guest", avatarUrl: null as string | null });
    const [betAmount, setBetAmount] = useState('');
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');
    const [bottomTab, setBottomTab] = useState<'ORDERBOOK' | 'COMMENTS' | 'HOLDERS' | 'ACTIVITY'>('COMMENTS');
    const [chartData, setChartData] = useState<any[]>([]); // For Single Outcome
    const [activityList, setActivityList] = useState<any[]>([]);
    const [holders, setHolders] = useState<any[]>([]);

    // Multi-outcome Name tracking
    const [selectedOutcomeName, setSelectedOutcomeName] = useState<string | null>(null);

    // My Position
    // My Position (Refactored for Simultaneous Holdings)
    const [myYesShares, setMyYesShares] = useState<number>(0);
    const [myNoShares, setMyNoShares] = useState<number>(0);

    // Derived State
    const myHeldSide = myYesShares > myNoShares ? 'YES' : (myNoShares > 0 ? 'NO' : null);
    const myHeldAmountStr = (myYesShares + myNoShares).toFixed(2);

    // Legacy support for display if needed, but we rely on shares mainly now
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
        type: 'BUY' | 'SELL';
        imageUrl?: string;
    } | null>(null);

    // New Djinn Toast State
    const [djinnToast, setDjinnToast] = useState<{
        isVisible: boolean;
        type: DjinnToastType;
        title?: string;
        message: string;
        actionLink?: string;
        actionLabel?: string;
    }>({
        isVisible: false,
        type: 'INFO',
        message: ''
    });

    const [marketAccount, setMarketAccount] = useState<any>(null);

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

    // Manual Refresh for User (in case of indexer lag)
    const refreshBalances = async () => {
        setIsLoading(true);
        if (!marketAccount || !publicKey || !marketAccount.yes_token_mint || !marketAccount.no_token_mint) {
            setIsLoading(false);
            return;
        }
        try {
            const { getAssociatedTokenAddress } = await import('@solana/spl-token');
            const yesMint = new PublicKey(marketAccount.yes_token_mint);
            const noMint = new PublicKey(marketAccount.no_token_mint);

            const yesAta = await getAssociatedTokenAddress(yesMint, publicKey);
            const noAta = await getAssociatedTokenAddress(noMint, publicKey);

            const [yesBal, noBal] = await Promise.all([
                connection.getTokenAccountBalance(yesAta).then(r => r.value.uiAmount || 0).catch(() => 0),
                connection.getTokenAccountBalance(noAta).then(r => r.value.uiAmount || 0).catch(() => 0)
            ]);

            console.log("Manual Refresh Balance:", { yesBal, noBal });
            setMyYesShares(yesBal);
            setMyNoShares(noBal);

            // Re-fetch bets to update history if needed
            const userBets = await supabaseDb.getUserBets(publicKey.toBase58());
            const myBetsForSlug = userBets.filter(b => b.market_slug === effectiveSlug && !b.claimed);
            // We trust on-chain more, but DB sync happens eventually
        } catch (e) {
            console.error("Manual Refresh Failed:", e);
        } finally {
            setIsLoading(false);
        }
    };

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
            const marketInfo = await supabaseDb.getMarket(effectiveSlug);
            console.log("MARKET INFO DEBUG:", marketInfo); // Debug Real Market detection
            if (marketInfo) setMarketAccount(marketInfo);

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

            // Load Activity - Optimised DB Filter
            // We want activity for: Parent Market (slug), Current Outcome (effectiveSlug), and All Outcomes (outcomeIds)
            const outcomeIds = marketOutcomes.map(o => o.id);
            const targetSlugs = Array.from(new Set([slug, effectiveSlug, ...outcomeIds])); // Deduplicate

            const relevantActivity = await supabaseDb.getActivity(0, 50, targetSlugs);
            setActivityList(relevantActivity);

            // Load Holders
            const topHolders = await supabaseDb.getTopHolders(effectiveSlug);
            setHolders(topHolders);

            // Load User's Position from DB (to persist Sell button after refresh)
            // 1. Try DB first (Optimized: Check all bets for this user in this market)
            if (publicKey) {
                const userBets = await supabaseDb.getUserBets(publicKey.toBase58());
                const myBetsForSlug = userBets.filter(b => b.market_slug === effectiveSlug && !b.claimed);

                // Aggregate from DB
                const dbYes = myBetsForSlug.filter(b => b.side === 'YES').reduce((acc, b) => acc + (b.shares || 0), 0);
                const dbNo = myBetsForSlug.filter(b => b.side === 'NO').reduce((acc, b) => acc + (b.shares || 0), 0);

                setMyYesShares(dbYes);
                setMyNoShares(dbNo);
            }

            // 2. On-Chain Fallback (Always run this if market is live to be accurate)
            if (marketInfo && marketInfo.yes_token_mint && marketInfo.no_token_mint && publicKey) {
                try {
                    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
                    const yesMint = new PublicKey(marketInfo.yes_token_mint);
                    const noMint = new PublicKey(marketInfo.no_token_mint);

                    const yesAta = await getAssociatedTokenAddress(yesMint, publicKey);
                    const noAta = await getAssociatedTokenAddress(noMint, publicKey);

                    const [yesBal, noBal] = await Promise.all([
                        connection.getTokenAccountBalance(yesAta).then(r => r.value.uiAmount || 0).catch(() => 0),
                        connection.getTokenAccountBalance(noAta).then(r => r.value.uiAmount || 0).catch(() => 0)
                    ]);

                    if (yesBal > 0) setMyYesShares(yesBal);
                    if (noBal > 0) setMyNoShares(noBal);

                } catch (e) { console.warn("On-chain check failed:", e); }
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

    // CALCULATIONS (Real-Time CPMM Simulation)
    const amountNum = parseFloat(betAmount) || 0;
    const isOverBalance = amountNum > solBalance;
    const currentPriceForSide = selectedSide === 'YES' ? livePrice : (100 - livePrice);

    // Derived value for DB/UI
    const usdValueInTrading = amountNum * solPrice;

    // Run Simulation for PREVIEW (Exact same logic as 'handlePlaceBet')
    let estimatedShares = 0;
    let effectivePrice = 0;
    let potentialSolPayout = 0;
    let potentialRoi = 0;

    if (amountNum > 0) {
        // 1. Setup Virtual Reserves based on current probability
        const safePrice = Math.max(0.01, Math.min(0.99, currentPriceForSide / 100));
        const virtualShareReserves = INITIAL_VIRTUAL_SOL / safePrice;

        // 2. Simulate
        const sim = simulateBuy(amountNum, {
            virtualSolReserves: INITIAL_VIRTUAL_SOL,
            virtualShareReserves: virtualShareReserves,
            realSolReserves: 0,
            totalSharesMinted: 0
        });

        estimatedShares = sim.sharesReceived;

        // 3. Derived Stats
        // Effective Price per Share = Cost / Shares
        effectivePrice = estimatedShares > 0 ? (amountNum / estimatedShares) : safePrice;

        // Potential Payout = Shares * 1 SOL (If 1 Share pays 1 SOL)
        // NOTE: In this simplified AMM, 1 Share = Claim to 1 SOL of the winning pool? 
        // Standard Binary Options: 1 Order = 1 Share = 1 SOL payout on win. 
        potentialSolPayout = estimatedShares;

        potentialRoi = ((potentialSolPayout - amountNum) / amountNum) * 100;
    }

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
        // DEBUG: Trace execution
        console.log("🖱️ Buy Button Clicked. Amount:", amountNum, "Balance:", solBalance);

        if (!publicKey) return setDjinnToast({ isVisible: true, type: 'ERROR', message: "Please connect wallet" });
        if (amountNum <= 0) return setDjinnToast({ isVisible: true, type: 'ERROR', message: "Enter an amount" });
        if (isOverBalance) {
            setDjinnToast({
                isVisible: true,
                type: 'ERROR',
                title: 'Insufficient Funds',
                message: `You need ${amountNum} SOL but only have ${solBalance.toFixed(4)} SOL.`,
            });
            return;
        }

        setIsPending(true);

        try {
            let txSignature = '';
            // Check if REAL or SIMULATED
            const isRealMarket = marketAccount?.market_pda && !marketAccount.market_pda.startsWith('local_') && marketAccount.yes_token_mint;

            if (isRealMarket) {
                // --- ON-CHAIN BUY ---
                console.log("🔗 Executing On-Chain Buy...");
                const tx = await placeBet(
                    new PublicKey(marketAccount.market_pda),
                    selectedSide.toLowerCase() as 'yes' | 'no',
                    amountNum,
                    new PublicKey(marketAccount.yes_token_mint),
                    new PublicKey(marketAccount.no_token_mint),
                    0 // minSharesOut
                );
                console.log("✅ Buy TX:", tx);
                txSignature = tx;
            } else {
                // --- SIMULATED BUY ---
                console.log("🔮 Executing Simulated Buy (Demo Market)...");
                const reason = !marketAccount?.market_pda ? "Missing Market PDA" :
                    marketAccount.market_pda.startsWith('local_') ? "Old/Local Market (Create NEW one)" :
                        !marketAccount.yes_token_mint ? "Missing Token Mints" : "Unknown";

                setDjinnToast({
                    isVisible: true,
                    type: 'INFO',
                    title: 'Demo/Local Market',
                    message: `This market is offline/local (${reason}). To use real SOL, please Create a NEW Market.`
                });

                // Simulate delay
                await new Promise(r => setTimeout(r, 1000));
            }

            // --- COMMON UPDATES (DB, UI) ---
            // 1. Calculate stats (Simulated for DB sync)
            const currentProb = selectedSide === 'YES' ? livePrice : (100 - livePrice);
            const safePrice = Math.max(0.01, Math.min(0.99, currentProb / 100));
            const virtualShareReserves = INITIAL_VIRTUAL_SOL / safePrice;

            const sim = simulateBuy(amountNum, {
                virtualSolReserves: INITIAL_VIRTUAL_SOL,
                virtualShareReserves: virtualShareReserves,
                realSolReserves: 0,
                totalSharesMinted: 0
            });

            // 2. Update Price Locally (Pari-Mutuel Inverse) and in DB
            // If Buy YES -> Price UP. If Buy NO -> Price DOWN?
            // Actually `updateExectutionPrices` logic handles direction if passed signed impact?
            // "If Buy YES -> Price Up". `priceImpact` is positive.
            // If Buy NO -> "Price of NO goes up", so "Price of YES goes down".
            // So if NO, impact should be negative?
            // `simulateBuy` returns positive impact.
            const impactSigned = selectedSide === 'YES' ? sim.priceImpact : -sim.priceImpact;

            const newPrice = updateExectutionPrices(effectiveSlug, impactSigned);
            await supabaseDb.updateMarketPrice(effectiveSlug, newPrice, usdValueInTrading);

            // 3. Log Activity
            const profile = await supabaseDb.getProfile(publicKey.toBase58());
            const activity = {
                wallet_address: publicKey.toBase58(),
                username: profile?.username || userProfile.username,
                avatar_url: profile?.avatar_url || userProfile.avatarUrl,
                action: selectedSide,
                order_type: 'BUY',
                amount: usdValueInTrading,
                sol_amount: amountNum,
                shares: sim.sharesReceived,
                market_title: staticMarketInfo.title,
                market_slug: effectiveSlug,
                created_at: new Date().toISOString()
            };
            // @ts-ignore
            await supabaseDb.createActivity(activity);
            setActivityList(prev => [activity, ...prev]);

            // 4. Create/Update Bet
            await supabaseDb.createBet({
                market_slug: effectiveSlug,
                wallet_address: publicKey.toBase58(),
                side: selectedSide,
                amount: usdValueInTrading,
                sol_amount: amountNum,
                shares: sim.sharesReceived,
                entry_price: safePrice * 100
            });

            // 5. Update UI State
            setSolBalance(prev => prev - amountNum);

            // SYNC FIX: Wait for DB propagation then update holders immediately
            await new Promise(r => setTimeout(r, 500));
            const updatedHolders = await supabaseDb.getTopHolders(effectiveSlug);
            setHolders(updatedHolders);

            // Update specific share count
            if (selectedSide === 'YES') {
                setMyYesShares(prev => prev + sim.sharesReceived);
            } else {
                setMyNoShares(prev => prev + sim.sharesReceived);
            }

            setLastBetDetails({
                outcomeName: selectedOutcomeName || staticMarketInfo.title,
                side: selectedSide,
                solAmount: amountNum,
                usdAmount: usdValueInTrading,
                marketTitle: staticMarketInfo.title,
                probability: livePrice,
                username: userProfile.username,
                type: 'BUY',
                imageUrl: marketAccount?.icon || (typeof staticMarketInfo.icon === 'string' && staticMarketInfo.icon.startsWith('http') ? staticMarketInfo.icon : undefined)
            });

            setDjinnToast({
                isVisible: true,
                type: 'SUCCESS',
                title: 'SUCCESS',
                message: `Successfully bought ${sim.sharesReceived.toFixed(2)} ${selectedSide} shares.`,
                actionLink: txSignature ? `https://solscan.io/tx/${txSignature}?cluster=devnet` : undefined,
                actionLabel: 'View on Solscan'
            });

            setIsSuccess(true);
            setBetAmount('');

            // Reload user position
            // Trigger storage event for cross-component updates
            window.dispatchEvent(new Event('bet-updated'));

        } catch (error: any) {
            console.error("Error placing bet:", error);
            setDjinnToast({ isVisible: true, type: 'ERROR', title: 'Bet Failed', message: error.message || 'Unknown error' });
        } finally {
            setIsPending(false);
            setTimeout(() => setIsSuccess(false), 3000);
        }
    };


    // --- NEW STATE FOR TRADING ---
    const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY');

    // ... (Keep existing calculations)
    // Dynamic Input Label & Calculation
    const inputLabel = tradeMode === 'BUY' ? 'USD' : 'Shares';
    const inputSubtext = tradeMode === 'BUY' ? '≈SOL' : 'Qty';

    // Handler to toggle logic
    const handleTrade = async () => {
        console.log(`🖱️ ${tradeMode} Button Clicked.`);
        if (!publicKey) return setDjinnToast({ isVisible: true, type: 'ERROR', message: "Please connect wallet" });
        if (parseFloat(betAmount) <= 0) return setDjinnToast({ isVisible: true, type: 'ERROR', message: "Enter an amount" });

        if (tradeMode === 'BUY') {
            await handlePlaceBet();
        } else {
            // --- SELL LOGIC ---
            const availableShares = selectedSide === 'YES' ? myYesShares : myNoShares;
            if (availableShares <= 0) {
                return setDjinnToast({ isVisible: true, type: 'ERROR', message: `You don't hold any ${selectedSide} PREDICTIONS to sell!` });
            }
            if (parseFloat(betAmount) > availableShares) {
                return setDjinnToast({ isVisible: true, type: 'ERROR', message: `Insufficient shares! You only have ${availableShares.toFixed(2)}.` });
            }

            setIsPending(true);
            try {
                let txSignature = '';
                const isRealMarket = marketAccount?.market_pda && !marketAccount.market_pda.startsWith('local_');
                const sharesToSell = parseFloat(betAmount);

                // Estimate Value & Fee
                const currentPrice = selectedSide === 'YES' ? livePrice : (100 - livePrice); // Probability %
                // Assuming 1 Share ~= 1 Risk Unit. Value ~= Shares * Probability.
                // In this simplified AMM, we just estimate SOL return.
                const estimatedSolReturn = sharesToSell * (currentPrice / 100);
                const feeParam = 0.025; // 2.5%
                const feeAmount = estimatedSolReturn * feeParam;
                const netSolReturn = estimatedSolReturn - feeAmount;

                if (isRealMarket) {
                    console.log("🔗 Executing On-Chain Sell...");
                    const tx = await sellShares(
                        new PublicKey(marketAccount.market_pda),
                        selectedSide.toLowerCase() as 'yes' | 'no',
                        sharesToSell,
                        new PublicKey(marketAccount.yes_token_mint),
                        new PublicKey(marketAccount.no_token_mint),
                        0 // minSolOut (Slippage)
                    );
                    console.log("✅ Sell TX:", tx);
                    txSignature = tx;
                } else {
                    console.log("🔮 Simulated Sell");
                    await new Promise(r => setTimeout(r, 1000));
                }

                // --- COMMON UPDATES ---
                // 1. Calculate Sell Impact (Negative)
                // Impact Logic: Buying X amount moves price Y. Selling X should move price -Y.
                const usdValue = sharesToSell * (currentPrice / 100) * solPrice;
                const virtualShareReserves = INITIAL_VIRTUAL_SOL / (currentPrice / 100);
                const sim = simulateBuy(estimatedSolReturn, {
                    virtualSolReserves: INITIAL_VIRTUAL_SOL,
                    virtualShareReserves: virtualShareReserves,
                    realSolReserves: 0,
                    totalSharesMinted: 0
                });

                // For Sell, we INVERT the impact.
                // If I Sell YES -> Price YES Goes DOWN. Impact is Negative.
                // If I Sell NO -> Price NO Goes DOWN -> Price YES Goes UP. Impact is Positive.
                const impactMagnitude = sim.priceImpact;
                const impactSigned = selectedSide === 'YES' ? -impactMagnitude : impactMagnitude;

                // 2. Update Price
                const newPrice = updateExectutionPrices(effectiveSlug, impactSigned);
                await supabaseDb.updateMarketPrice(effectiveSlug, newPrice, -usdValue);

                // 2b. Reduce Bet Position in DB (Wait for this!)
                await supabaseDb.reduceBetPosition(
                    publicKey.toBase58(),
                    effectiveSlug,
                    selectedSide,
                    sharesToSell
                );

                // SYNC FIX: Immediately refresh holders after DB update
                const updatedHolders = await supabaseDb.getTopHolders(effectiveSlug);
                setHolders(updatedHolders);

                // 3. Log Activity
                const profile = await supabaseDb.getProfile(publicKey.toBase58());
                const sellActivity = {
                    wallet_address: publicKey.toBase58(),
                    username: profile?.username || userProfile.username,
                    avatar_url: profile?.avatar_url || userProfile.avatarUrl,
                    action: selectedSide,
                    order_type: 'SELL',
                    amount: usdValue,
                    sol_amount: estimatedSolReturn,
                    shares: sharesToSell,
                    market_title: staticMarketInfo.title,
                    market_slug: effectiveSlug,
                    created_at: new Date().toISOString()
                };
                // @ts-ignore
                await supabaseDb.createActivity(sellActivity);
                setActivityList(prev => [sellActivity, ...prev]);

                // 4. Update UI Local State
                setSolBalance(prev => prev + netSolReturn);

                // Update specific share count
                if (selectedSide === 'YES') {
                    setMyYesShares(prev => Math.max(0, prev - sharesToSell));
                } else {
                    setMyNoShares(prev => Math.max(0, prev - sharesToSell));
                }

                setLastBetDetails({
                    outcomeName: selectedOutcomeName || staticMarketInfo.title,
                    side: selectedSide,
                    solAmount: netSolReturn,
                    usdAmount: usdValue,
                    marketTitle: staticMarketInfo.title,
                    probability: livePrice,
                    username: userProfile.username,
                    type: 'SELL',
                    imageUrl: marketAccount?.icon || (typeof staticMarketInfo.icon === 'string' && staticMarketInfo.icon.startsWith('http') ? staticMarketInfo.icon : undefined)
                });

                // setShowPurchaseToast(true);
                setDjinnToast({
                    isVisible: true,
                    type: 'SUCCESS',
                    title: 'SUCCESS',
                    message: `Sold ${sharesToSell.toFixed(2)} ${selectedSide} shares for ${netSolReturn.toFixed(4)} SOL.`,
                    actionLink: txSignature ? `https://solscan.io/tx/${txSignature}?cluster=devnet` : undefined,
                    actionLabel: 'View on Solscan'
                });

                setIsSuccess(true);
                setBetAmount('');

                // Trigger Refreshes
                window.dispatchEvent(new Event('bet-updated'));
                setTimeout(() => {
                    supabaseDb.getTopHolders(effectiveSlug).then(setHolders);
                }, 1000);

            } catch (error: any) {
                console.error("Sell Error:", error);
                alert(`Sell Failed: ${error.message}`);
            } finally {
                setIsPending(false);
                setTimeout(() => setIsSuccess(false), 3000);
            }
        }
    };

    // Replaces handlePlaceBet used in render
    // ...

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32">
            {/* ... Navbar & Header ... */}
            <Navbar />
            <div className="max-w-7xl mx-auto pt-32 px-4 md:px-6 relative z-10">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-[#0E0E0E] rounded-2xl border border-white/10 flex items-center justify-center text-5xl shadow-2xl overflow-hidden">
                        {(marketAccount?.icon || (typeof staticMarketInfo.icon === 'string' && (staticMarketInfo.icon.startsWith('http') || staticMarketInfo.icon.startsWith('data:')))) ?
                            <img src={marketAccount?.icon || staticMarketInfo.icon} className="w-full h-full object-cover" />
                            : staticMarketInfo.icon}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 leading-tight">{marketAccount?.title || staticMarketInfo.title}</h1>
                        <p className="text-gray-500 text-sm font-medium">{marketAccount?.description || staticMarketInfo.description}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* LEFT COLUMN (Keep as is) */}
                    <div className="md:col-span-8 space-y-6">
                        {/* CHART CARD */}
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden min-h-[400px]">
                            {isMultiOutcome ? (
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

                                    <MultiLineChart
                                        outcomes={chartSeries.map(s => ({
                                            ...s,
                                            chance: marketOutcomes.find(o => o.title === s.name)?.chance || 0
                                        }))}
                                        hasPosition={!!myHeldPosition}
                                        selectedOutcome={selectedOutcomeName}
                                    />

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
                                <>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-5xl font-black tracking-tighter transition-colors" style={{ color: chartColor }}>{livePrice.toFixed(1)}%</span>
                                            <span className="text-xl font-bold text-gray-500">chance</span>
                                        </div>
                                        {(myYesShares > 0 || myNoShares > 0) && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#10B981]/20 to-[#10B981]/10 border border-[#10B981]/30">
                                                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                                                <span className="text-[10px] font-black uppercase text-[#10B981] tracking-wide">Your Position Active</span>
                                            </div>
                                        )}
                                        {/* Refresh Balance Button */}
                                        <button
                                            onClick={refreshBalances}
                                            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                            title="Refresh Wallet Balance"
                                        >
                                            <Loader2 size={12} className={isLoading ? 'animate-spin' : ''} />
                                        </button>
                                    </div>

                                    <MarketChart data={chartData} color={chartColor} hasPosition={myYesShares > 0 || myNoShares > 0} />
                                </>
                            )}
                        </div>

                        {/* TABS & CONTENT (Keep as is) */}
                        <div>
                            <div className="flex items-center gap-6 mb-6 border-b border-white/5 pb-2">
                                <TabButton label="Comments" icon={<Activity size={14} />} active={bottomTab === 'COMMENTS'} onClick={() => setBottomTab('COMMENTS')} />
                                <TabButton label="Holders" icon={<Users size={14} />} active={bottomTab === 'HOLDERS'} onClick={() => setBottomTab('HOLDERS')} />
                                <TabButton label="Activity" icon={<Activity size={14} />} active={bottomTab === 'ACTIVITY'} onClick={() => setBottomTab('ACTIVITY')} />
                            </div>
                        </div>

                        {bottomTab === 'COMMENTS' && (
                            <CommentsSection
                                marketSlug={effectiveSlug}
                                publicKey={publicKey ? publicKey.toBase58() : null}
                                userProfile={userProfile}
                                myHeldPosition={myHeldSide}
                                myHeldAmount={myHeldAmountStr}
                            />
                        )}

                        {bottomTab === 'ACTIVITY' && (
                            <div className="bg-[#0E0E0E] rounded-[2rem] border border-white/5 overflow-hidden">
                                <div className="grid grid-cols-5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
                                    <span className="col-span-1">Trader</span>
                                    <span className="text-center col-span-1">Side</span>
                                    <span className="text-center col-span-1">Shares</span>
                                    <span className="text-right col-span-1">Value</span>
                                    <span className="text-right col-span-1">Time</span>
                                </div>
                                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {activityList.length === 0 ? (
                                        <div className="p-8 text-center text-gray-600 italic">No orders yet</div>
                                    ) : (
                                        activityList.map((act, i) => (
                                            <div key={i} className="grid grid-cols-5 items-center px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                <div className="flex items-center gap-3 col-span-1">
                                                    <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                                                        {act.avatar_url ? <img src={act.avatar_url} className="w-full h-full object-cover" /> : <span className="text-sm">🧞</span>}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.location.href = `/profile/${act.username || act.wallet_address}`;
                                                        }}>
                                                            <span className="text-xs font-bold text-white group-hover:text-[#F492B7] transition-colors font-mono truncate">
                                                                {act.username || `${act.wallet_address.slice(0, 4)}...`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-center col-span-1">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded whitespace-nowrap ${(act.order_type === 'BUY' || !act.order_type) ? (act.action === 'YES' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/20 text-red-500') : 'bg-white/10 text-gray-400'}`}>
                                                        {act.order_type || 'BUY'} {act.action}
                                                    </span>
                                                </div>
                                                <div className="text-center col-span-1">
                                                    <span className="text-xs font-mono text-gray-300">{act.shares?.toFixed(2) || '0.00'}</span>
                                                </div>
                                                <div className="text-right col-span-1">
                                                    <div className="text-sm font-black text-white">${act.amount?.toFixed(2)}</div>
                                                    <div className="text-[10px] font-mono text-gray-600">{act.sol_amount?.toFixed(3)} SOL</div>
                                                </div>
                                                <div className="text-right text-[10px] font-mono text-gray-500 col-span-1">
                                                    {timeAgo(act.created_at)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {bottomTab === 'HOLDERS' && (
                            <div className="grid lg:grid-cols-2 gap-12">
                                {/* YES HOLDERS */}
                                <div>
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-white mb-2">Yes holders</h3>
                                        <div className="h-0.5 w-full bg-white/10" />
                                    </div>
                                    <div className="space-y-0">
                                        {holders.filter(h => h.yesShares > 0.1).sort((a, b) => b.yesShares - a.yesShares).length === 0 ? (
                                            <div className="py-6 text-gray-500 text-sm italic">No holders</div>
                                        ) : (
                                            holders.filter(h => h.yesShares > 0.1).sort((a, b) => b.yesShares - a.yesShares).map((h, i) => (
                                                <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 group hover:bg-white/5 hover:px-2 rounded transition-all -mx-2 px-2 cursor-pointer" onClick={() => window.location.href = `/profile/${h.name === h.wallet_address.slice(0, 6) + '...' ? h.wallet_address : h.name}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] overflow-hidden">
                                                                {h.avatar ? <img src={h.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600" />}
                                                            </div>
                                                            {/* Rank Badge */}
                                                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border border-[#0B0E14] 
                                                                    ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-black' :
                                                                    i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                                                                        i === 2 ? 'bg-gradient-to-br from-orange-300 to-amber-700 text-white' :
                                                                            'bg-gray-800 text-gray-400'}`}>
                                                                {i + 1}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white group-hover:text-[#F492B7] transition-colors truncat max-w-[120px]">
                                                                {h.name}
                                                            </div>
                                                            <div className="text-xs font-medium text-[#10B981] font-mono">
                                                                {h.yesShares.toLocaleString(undefined, { maximumFractionDigits: 0 })} shares
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* NO HOLDERS */}
                                <div>
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-white mb-2">No holders</h3>
                                        <div className="h-0.5 w-full bg-white/10" />
                                    </div>
                                    <div className="space-y-0">
                                        {holders.filter(h => h.noShares > 0.1).sort((a, b) => b.noShares - a.noShares).length === 0 ? (
                                            <div className="py-6 text-gray-500 text-sm italic">No holders</div>
                                        ) : (
                                            holders.filter(h => h.noShares > 0.1).sort((a, b) => b.noShares - a.noShares).map((h, i) => (
                                                <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 group hover:bg-white/5 hover:px-2 rounded transition-all -mx-2 px-2 cursor-pointer" onClick={() => window.location.href = `/profile/${h.name === h.wallet_address.slice(0, 6) + '...' ? h.wallet_address : h.name}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] overflow-hidden">
                                                                {h.avatar ? <img src={h.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-pink-500 to-rose-600" />}
                                                            </div>
                                                            {/* Rank Badge */}
                                                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border border-[#0B0E14] 
                                                                    ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-black' :
                                                                    i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                                                                        i === 2 ? 'bg-gradient-to-br from-orange-300 to-amber-700 text-white' :
                                                                            'bg-gray-800 text-gray-400'}`}>
                                                                {i + 1}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white group-hover:text-[#F492B7] transition-colors truncate max-w-[120px]">
                                                                {h.name}
                                                            </div>
                                                            <div className="text-xs font-medium text-red-500 font-mono">
                                                                {h.noShares.toLocaleString(undefined, { maximumFractionDigits: 0 })} shares
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* RIGHT COLUMN: TRADING (Sticky) */}
                    <div className="md:col-span-4 space-y-6 sticky top-24 h-fit z-20">
                        <div className="bg-[#0E0E0E] border border-white/10 rounded-[2.5rem] p-4 shadow-2xl">
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

                            {/* NEW: BUY / SELL TOGGLE */}
                            <div className="mb-6 p-1 bg-white/5 rounded-xl flex">
                                <button
                                    onClick={() => setTradeMode('BUY')}
                                    className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tradeMode === 'BUY' ? 'bg-[#10B981] text-black shadow-lg shadow-[#10B981]/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => setTradeMode('SELL')}
                                    className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tradeMode === 'SELL' ? 'bg-[#EF4444] text-white shadow-lg shadow-[#EF4444]/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Sell
                                </button>
                            </div>

                            {/* YES/NO Buttons */}
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
                                        <span className={`block text-xs font-black uppercase mb-1 ${selectedSide === 'YES' ? 'text-emerald-500' : 'text-gray-500'}`}>YES</span>
                                        <span className="block text-2xl font-black text-white">{livePrice.toFixed(0)}¢</span>
                                    </button>
                                    <button onClick={() => setSelectedSide('NO')} className={`p-4 rounded-2xl border transition-all ${selectedSide === 'NO' ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5'}`}>
                                        <span className={`block text-xs font-black uppercase mb-1 ${selectedSide === 'NO' ? 'text-red-500' : 'text-gray-500'}`}>NO</span>
                                        <span className="block text-2xl font-black text-white">{(100 - livePrice).toFixed(0)}¢</span>
                                    </button>
                                </div>
                            )}

                            {/* INPUT FIELD */}
                            <div className="mb-4 relative group">
                                <div className={`absolute inset-0 bg-gradient-to-r ${tradeMode === 'BUY' ? 'from-[#10B981]/20 to-emerald-600/20' : 'from-red-500/20 to-orange-500/20'} blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500`}></div>
                                <div className="relative flex items-center bg-[#0B0E14] border border-white/10 rounded-2xl p-4 transition-all focus-within:border-white/30">
                                    <span className="text-gray-500 text-2xl font-black mr-2 select-none">{tradeMode === 'BUY' ? '$' : '#'}</span>
                                    <input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        placeholder={tradeMode === 'BUY' ? "0.00" : "0"}
                                        className="w-full bg-transparent text-white text-4xl font-black outline-none placeholder:text-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <div className="flex flex-col items-end pointer-events-none">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{inputLabel}</span>
                                        <span className="text-[9px] text-gray-600 font-mono">{inputSubtext}</span>
                                    </div>
                                </div>
                                {/* POTENTIAL PAYOUT DISPLAY */}
                                {tradeMode === 'BUY' && amountNum > 0 && (
                                    <div className="mt-3 flex justify-between items-end px-2 animate-in fade-in slide-in-from-top-1 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Est. Shares</span>
                                            <span className="text-lg font-black text-[#10B981] leading-none">{estimatedShares.toFixed(2)}</span>
                                        </div>
                                        <div className="text-right flex flex-col gap-1">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Potential Payout</span>
                                            <div className="flex flex-col items-end">
                                                <span className="block text-2xl font-black text-[#10B981] leading-none mb-1">{potentialSolPayout.toFixed(4)} <span className="text-sm">SOL</span></span>
                                                <span className="text-sm font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-lg">+{potentialRoi.toFixed(0)}% ROI</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {tradeMode === 'SELL' && solBalance < 0.003 && (
                                    <div className="mx-2 mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                        <AlertCircle className="w-4 h-4 text-orange-500" />
                                        <span className="text-[10px] text-orange-400 font-bold">
                                            Warning: Low SOL ({solBalance.toFixed(4)}). You need ~0.003 SOL for gas.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Percentage Selector for Sell Mode */}
                            {tradeMode === 'SELL' && (
                                (selectedSide === 'YES' && myYesShares > 0) || (selectedSide === 'NO' && myNoShares > 0)
                            ) && (
                                    <div className="mb-4">
                                        <div className="flex justify-end gap-2 mb-4">
                                            {[25, 50, 75, 100].map((pct) => (
                                                <button
                                                    key={pct}
                                                    onClick={() => {
                                                        let available = 0;
                                                        if (tradeMode === 'BUY') available = solBalance;
                                                        else available = selectedSide === 'YES' ? myYesShares : myNoShares;

                                                        let val;
                                                        // For SELL: available is Shares.
                                                        // For BUY: available is SOL.

                                                        if (tradeMode === 'BUY') {
                                                            // Reserve for gas if 100%
                                                            if (pct === 100) {
                                                                val = Math.max(0, available - 0.025); // Reserve 0.025 SOL
                                                            } else {
                                                                val = available * (pct / 100);
                                                            }
                                                            // Round to 4 decimals
                                                            val = Math.floor(val * 10000) / 10000;
                                                            setBetAmount(val.toString());
                                                        } else {
                                                            // SELL logic
                                                            if (pct === 100) {
                                                                // Ensure smooth string without scientific notation for huge numbers
                                                                // Logic: use available directly, but handle precision
                                                                setBetAmount(available.toString());
                                                            } else {
                                                                const shareAmount = available * (pct / 100);
                                                                val = parseFloat(shareAmount.toFixed(4));
                                                                setBetAmount(val.toString());
                                                            }
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors bg-white/5 border border-white/5"
                                                >
                                                    {pct}%
                                                </button>
                                            ))}
                                        </div>
                                        <div className="text-right -mt-2 mb-4">
                                            <span className="text-[9px] text-gray-600 font-mono">Available: {selectedSide === 'YES' ? myYesShares.toFixed(2) : myNoShares.toFixed(2)} shares</span>
                                        </div>
                                    </div>
                                )}

                            {/* Trade Inputs */}
                            <div className="space-y-4 mb-6">
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Amount ({inputSubtext})</span>
                                        <span className="flex items-center gap-1">
                                            <Wallet size={10} />
                                            {tradeMode === 'BUY' ? `${solBalance.toFixed(3)} SOL` : `${selectedSide === 'YES' ? myYesShares.toFixed(2) : myNoShares.toFixed(2)} Shares`}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-djinn-neon-blue">
                                            {tradeMode === 'BUY' ? <DollarSign size={16} /> : <Activity size={16} />}
                                        </div>
                                        <input
                                            type="number"
                                            value={betAmount}
                                            onChange={(e) => setBetAmount(e.target.value)}
                                            className="w-full bg-[#0F1115] border border-gray-800 rounded-lg py-3 pl-10 pr-16 text-white placeholder-gray-600 focus:outline-none focus:border-djinn-neon-blue transition-colors font-mono"
                                            placeholder="0.00"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">
                                            {inputLabel}
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction Summary */}
                                <div className="bg-[#0F1115]/50 rounded-lg p-3 space-y-2 text-xs">
                                    {/* BUY MODE SUMMARY */}
                                    {tradeMode === 'BUY' && (
                                        <>
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span>Est. Shares</span>
                                                <span className="text-white font-mono">{estimatedShares.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span>Avg. Price</span>
                                                <span className="text-white font-mono">{effectivePrice.toFixed(4)} SOL</span>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span>Potential Payout</span>
                                                <span className="text-[#10b981] font-black italic tracking-wide">{potentialSolPayout.toFixed(2)} SOL</span>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span>ROI</span>
                                                <span className="text-[#10b981] font-black italic tracking-wide">+{potentialRoi.toFixed(0)}%</span>
                                            </div>
                                        </>
                                    )}

                                    {/* SELL MODE SUMMARY */}
                                    {tradeMode === 'SELL' && (
                                        <>
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span>Value</span>
                                                <span className="text-white font-mono">{(parseFloat(betAmount || '0') * (currentPriceForSide / 100)).toFixed(4)} SOL</span>
                                            </div>
                                            {/* Hidden Fees as requested */}
                                            {/* 
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span>Market Fee</span>
                                                <span className="text-red-400 font-mono">-{((parseFloat(betAmount || '0') * (currentPriceForSide / 100)) * 0.025).toFixed(4)} SOL</span>
                                            </div>
                                            */}
                                            <div className="pt-2 mt-2 border-t border-gray-800/50 flex justify-between items-center">
                                                <span className="text-gray-300 font-bold">SOL Receive</span>
                                                <span className="text-[#10b981] font-black italic text-sm tracking-wide">
                                                    {((parseFloat(betAmount || '0') * (currentPriceForSide / 100)) * 0.975).toFixed(4)} SOL
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* ACTION BUTTON */}
                            <button
                                onClick={handleTrade}
                                disabled={isPending || isSuccess}
                                className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group ${isSuccess ? 'bg-[#10B981] text-black' :
                                    tradeMode === 'BUY' ? 'bg-[#10B981] text-black hover:bg-emerald-400' : 'bg-[#EF4444] text-white hover:bg-red-600'
                                    }`}
                            >
                                {isPending ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" /> Processing...
                                    </div>
                                ) : isSuccess ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <CheckCircle2 /> <span style={{ fontFamily: 'var(--font-adriane), serif' }} className="text-xl pt-1">SUCCESS!</span>
                                    </div>
                                ) : (
                                    <span>
                                        {tradeMode === 'BUY' ? `Buy ${selectedSide}` : `Sell ${selectedSide}`}
                                    </span>
                                )}
                            </button>
                            <p className="text-[9px] text-gray-600 text-center mt-2">
                                {tradeMode === 'SELL' ? "Market fee (2.5%) applies. Funds returned to Solana wallet." : "Secure transaction via Djinn Protocol"}
                            </p>
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
                        if (position.market_slug !== effectiveSlug) {
                            window.location.href = `/market/${position.market_slug}`;
                        }
                    }}
                    onCollect={async (position) => {
                        try {
                            await supabaseDb.claimPayout(position.id);
                            setDjinnToast({
                                isVisible: true,
                                type: 'SUCCESS',
                                title: 'Payout Claimed!',
                                message: `Successfully claimed $${position.payout?.toFixed(2)}.`,
                            });
                            setTimeout(() => window.location.reload(), 2000);
                        } catch (e) {
                            console.error('Error claiming:', e);
                            setDjinnToast({
                                isVisible: true,
                                type: 'ERROR',
                                title: 'Claim Failed',
                                message: 'Could not claim payout. Please try again.'
                            });
                        }
                    }}
                />

                {/* Djinn Toast */}
                <DjinnToast
                    isVisible={djinnToast.isVisible}
                    onClose={() => setDjinnToast(prev => ({ ...prev, isVisible: false }))}
                    type={djinnToast.type}
                    title={djinnToast.title}
                    message={djinnToast.message}
                    actionLink={djinnToast.actionLink}
                    actionLabel={djinnToast.actionLabel}
                />
            </div>

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