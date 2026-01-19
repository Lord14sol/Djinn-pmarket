'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { formatCompact } from '@/lib/utils';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Clock, DollarSign, Wallet, Activity, Users, CheckCircle2, AlertCircle, Loader2, Edit2, ExternalLink, Share2, Scale, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { simulateBuy, estimatePayoutInternal, CURVE_CONSTANT, VIRTUAL_OFFSET, getSpotPrice, getSupplyFromPrice, calculateImpliedProbability, getIgnitionStatus, getIgnitionProgress, ANCHOR_THRESHOLD } from '@/lib/core-amm';

// Components
import PrettyChart from '@/components/market/PrettyChart';
// TradingView & Switcher REMOVED
import CommentsSection from '@/components/market/CommentsSection';
import OutcomeList, { Outcome } from '@/components/market/OutcomeList';
import PurchaseToast from '@/components/market/PurchaseToast';
import ShareModal from '@/components/market/ShareModal';
import DjinnToast, { DjinnToastType } from '@/components/ui/DjinnToast';
import { usePrice } from '@/lib/PriceContext';
import * as supabaseDb from '@/lib/supabase-db';
import { PrizePoolCounter } from '@/components/PrizePoolCounter';
import IgnitionBar from '@/components/market/IgnitionBar';

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



// Generate chart data for single outcome with Bonding Curve "Origin" logic
// Generate chart data for single outcome with Bonding Curve "Origin" logic
const generateChartData = (currentPrice: number) => {
    const data = [];
    const points = 50;
    // "Zero-Start" Logic: Start strictly at 0 (or close to it) and curve up
    const startValue = 0.5; // Starts at effectively 0 (0.5 for visibility line)

    for (let i = 0; i < points; i++) {
        const date = new Date();
        date.setHours(date.getHours() - (points - i));

        // Exponential growth simulation: value = start + (current - start) * (i/points)^shape
        const progress = i / (points - 1);
        const curveFactor = Math.pow(progress, 2.5); // Steep exponential "Explosion" curve
        const baseValue = startValue + (currentPrice - startValue) * curveFactor;

        // Add micro-variance for visual interest (less variance at 0)
        const variance = Math.sin(i * 0.5) * (0.5 * progress);

        data.push({
            date: date.getTime(), // Visx expects number/Date
            value: Math.max(0, baseValue + variance)
        });
    }
    return data;
};

// ... (Multi-outcome generator removed or simplified if unused, but let's keep consistent)

// --- PAGE COMPONENT ---
export default function Page() {
    // Hooks
    const params = useParams();
    const slug = params?.slug as string || '';
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const { buyShares, sellShares, isReady: isContractReady } = useDjinnProtocol();

    // --- STATE ---
    // Market Data
    const [marketAccount, setMarketAccount] = useState<any>(null);
    const [marketOutcomes, setMarketOutcomes] = useState<Outcome[]>([]);
    const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('');
    const [selectedOutcomeName, setSelectedOutcomeName] = useState<string>('');
    const [livePrice, setLivePrice] = useState<number>(50);
    const [chartSeries, setChartSeries] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { solPrice } = usePrice();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // --- DJINN V3 METRICS ---
    const { yesMcap, noMcap, impliedProb, ignitionProgress, ignitionStatus } = useMemo(() => {
        const p = livePrice ?? 50;
        const priceSolOfYes = p / 100;
        const priceSolOfNo = (100 - p) / 100;

        // Reverse calculate supply
        const sYes = getSupplyFromPrice(priceSolOfYes);
        const sNo = getSupplyFromPrice(priceSolOfNo);

        // Calculate Mcap (Price * Supply)
        const spotYes = getSpotPrice(sYes);
        const spotNo = getSpotPrice(sNo);

        const mYes = sYes * spotYes;
        const mNo = sNo * spotNo;

        // Implied Probability from Money Weight
        const prob = calculateImpliedProbability(mYes, mNo);

        // IGNITION STATUS (Based on YES pool, as primary indicator)
        const ignProg = getIgnitionProgress(sYes);
        const ignStat = getIgnitionStatus(sYes);

        return {
            yesMcap: mYes,
            noMcap: mNo,
            impliedProb: prob,
            ignitionProgress: ignProg,
            ignitionStatus: ignStat
        };
    }, [livePrice]);

    // User Data
    const [solBalance, setSolBalance] = useState<number>(0);
    const [myYesShares, setMyYesShares] = useState<number>(0);
    const [myNoShares, setMyNoShares] = useState<number>(0);
    const [holders, setHolders] = useState<any[]>([]);
    const [activityList, setActivityList] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState({ username: '', avatarUrl: '' });

    // UI State
    const [betAmount, setBetAmount] = useState('');
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');
    const [isPending, setIsPending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [tradeSuccessInfo, setTradeSuccessInfo] = useState<{ shares: number; side: string; txSignature: string } | null>(null);
    const [djinnToast, setDjinnToast] = useState<{ isVisible: boolean; type: DjinnToastType; title?: string; message: string; actionLink?: string; actionLabel?: string }>({ isVisible: false, type: 'INFO', message: '' });
    const [lastTradeEvent, setLastTradeEvent] = useState<{ amount: number; side: 'YES' | 'NO' } | null>(null);
    const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY');

    const [isMaxSell, setIsMaxSell] = useState(false);
    const [showPurchaseToast, setShowPurchaseToast] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [lastBetDetails, setLastBetDetails] = useState<any>(null);
    const [bottomTab, setBottomTab] = useState<'ACTIVITY' | 'COMMENTS' | 'HOLDERS'>('ACTIVITY');
    const [slippageTolerance, setSlippageTolerance] = useState<number>(5); // Default 5%

    // Derived
    const isMultiOutcome = (MULTI_OUTCOMES[slug] || []).length > 0;
    const staticMarketInfo = marketDisplayData[slug] || { title: 'Unknown Market', icon: '❓', description: 'Market not found' };
    const effectiveSlug = slug;

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
            // Standardize colors: YES = Blue (#3b82f6), NO = Red (#ef4444)
            const initialSeries = initialOutcomes.map((o) => {
                const isYes = o.title.toUpperCase() === 'YES';
                const color = isYes ? '#22C55E' : '#F59E0B'; // Green/Orange

                return {
                    name: o.title,
                    color: color,
                    data: Array.from({ length: 50 }, (_, i) => {
                        const date = new Date();
                        date.setHours(date.getHours() - (50 - i));

                        // "Cold Start" Logic: 50% baseline as requested
                        const baseVal = o.chance || 50;

                        // Small variance to show it's "live" but stable
                        const variance = Math.sin(i * 0.5) * 1;

                        return {
                            date: date.getTime(),
                            value: Math.max(1, Math.min(99, baseVal + variance))
                        };
                    })
                };
            });
            // Ensure we have both YES and NO if only one exists (simulate the inverse)
            if (initialSeries.length === 1 && initialOutcomes[0].title === 'YES') {
                initialSeries.push({
                    name: 'NO',
                    color: '#ef4444',
                    data: initialSeries[0].data.map(d => ({ ...d, value: 100 - d.value }))
                });
            }

            setChartSeries(initialSeries);
        } else {
            // Single Market Init
            setChartData(generateChartData(50));
        }
    }, [slug]);

    // --- PARI-MUTUEL LOGIC ---
    const updateExectutionPrices = (targetId: string, priceDelta: number) => {
        if (!isMultiOutcome) {
            // Single market logic
            setLivePrice(prev => {
                const newP = Math.max(1, Math.min(99, prev + priceDelta));
                setChartData(cPrev => [...cPrev.slice(1), { date: Date.now(), value: newP }]);
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
                newData.push({ date: Date.now(), value: o.chance });
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


    // Manual Refresh for User (in case of indexer lag)
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
        // SOL price is now managed by PriceProvider global context
        const savedProfile = localStorage.getItem('djinn_user_profile');
        if (savedProfile) setUserProfile(JSON.parse(savedProfile));
        if (publicKey) {
            supabaseDb.getProfile(publicKey.toBase58()).then(p => {
                if (p) {
                    setUserProfile({
                        username: p.username || '',
                        avatarUrl: p.avatar_url || ''
                    });
                }
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

            // 2. On-Chain Fallback - Fetch from UserPosition PDA (V2 structure with outcome_index)
            if (marketInfo?.market_pda && publicKey) {
                try {
                    const marketPda = new PublicKey(marketInfo.market_pda);
                    const PROGRAM_ID = new PublicKey('DY1X52RW55bpNU5ZA8E3m6w1w7VG1ioHKpUt7jUkYSV9');

                    console.log("🔍 PAGE.TSX - PDA Derivation Debug:");
                    console.log("- marketPda:", marketPda.toBase58());
                    console.log("- publicKey:", publicKey.toBase58());
                    console.log("- PROGRAM_ID:", PROGRAM_ID.toBase58());

                    // YES Position PDA (outcome_index = 0)
                    const [yesPda] = PublicKey.findProgramAddressSync(
                        [Buffer.from("user_pos"), marketPda.toBuffer(), publicKey.toBuffer(), Buffer.from([0])],
                        PROGRAM_ID
                    );
                    // NO Position PDA (outcome_index = 1)
                    const [noPda] = PublicKey.findProgramAddressSync(
                        [Buffer.from("user_pos"), marketPda.toBuffer(), publicKey.toBuffer(), Buffer.from([1])],
                        PROGRAM_ID
                    );

                    console.log("- yesPda:", yesPda.toBase58());
                    console.log("- noPda:", noPda.toBase58());

                    // Fetch both accounts
                    const [yesAcct, noAcct] = await Promise.all([
                        connection.getAccountInfo(yesPda),
                        connection.getAccountInfo(noPda)
                    ]);

                    console.log("📦 yesAcct exists?:", yesAcct !== null, "length:", yesAcct?.data?.length);
                    console.log("📦 noAcct exists?:", noAcct !== null, "length:", noAcct?.data?.length);

                    // Parse shares from UserPosition account data
                    // Layout according to lib.rs UserPosition struct:
                    // - 8 bytes: Anchor discriminator
                    // - 32 bytes: market (Pubkey)
                    // - 1 byte: outcome_index (u8)
                    // - 16 bytes: shares (u128)
                    // - 1 byte: claimed (bool)
                    // - 8 bytes: claim_timestamp (i64)
                    // Total: 66 bytes, shares starts at offset 41
                    const parseShares = (data: Buffer): number => {
                        console.log("📦 UserPosition buffer length:", data.length);
                        console.log("📦 First 66 bytes (hex):", data.subarray(0, 66).toString('hex'));

                        if (data.length < 57) {
                            console.warn("⚠️ UserPosition buffer too small:", data.length);
                            return 0;
                        }

                        // Debug: show the specific bytes we're reading for shares
                        console.log("📦 Bytes 41-57 (shares u128 bytes):", data.subarray(41, 57).toString('hex'));

                        // Read u128 as two u64s (little endian)
                        const lo = data.readBigUInt64LE(41);
                        const hi = data.readBigUInt64LE(49);
                        const shares128 = lo + (hi * BigInt(2 ** 64));

                        console.log("🔍 lo (u64):", lo.toString());
                        console.log("🔍 hi (u64):", hi.toString());
                        console.log("🔍 Raw shares u128:", shares128.toString());

                        // On-chain stores raw bonding curve shares
                        // Normalize by dividing by 1e9 for human-readable display
                        const normalized = Number(shares128) / 1e9;
                        console.log("🔍 Normalized shares:", normalized);

                        return normalized;
                    };

                    if (yesAcct?.data) {
                        const yesBal = parseShares(yesAcct.data);
                        console.log("📊 YES Shares On-Chain:", yesBal);
                        if (yesBal > 0) setMyYesShares(yesBal);
                    }
                    if (noAcct?.data) {
                        const noBal = parseShares(noAcct.data);
                        console.log("📊 NO Shares On-Chain:", noBal);
                        if (noBal > 0) setMyNoShares(noBal);
                    }

                } catch (e) { console.warn("On-chain UserPosition check failed:", e); }
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
                    newData.push({ date: date.getTime(), value: newPrice });
                    if (newData.length > 50) newData.shift();
                    return newData;
                });
            }
        });

        const activitySub = supabaseDb.subscribeToActivity(effectiveSlug, (payload) => {
            setActivityList(prev => [payload.new, ...prev]);
            // Refresh holders on new activity
            supabaseDb.getTopHolders(effectiveSlug).then(setHolders);
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

    // User Position Helper
    const myHeldSide = myYesShares > 0.001 ? 'YES' : (myNoShares > 0.001 ? 'NO' : null);
    const myHeldAmount = myHeldSide === 'YES' ? myYesShares : myNoShares;
    const myHeldAmountStr = (myHeldAmount || 0).toFixed(2);

    // Trading Preview Calculations (V3 Hybrid Curve Logic)

    // Convert 0-100 probability to an approximate SOL price for initial supply estimation
    // This is just an estimation to sync UI state with curve state
    const impliedProbability = currentPriceForSide / 100;

    // Invert Phase 3 Curve: Supply -> Price.
    // We import getSupplyFromPrice from core-amm to get the exact supply for this price.
    // Price range is roughly 0.000001 (0%) to 0.95 (100%).

    // Map 0-100 prob to 0.000001 - 0.95 SOL price range
    const approxSolPrice = 0.000001 + (impliedProbability * (0.95 - 0.000001));
    const estimatedSupply = getSupplyFromPrice(approxSolPrice);

    const previewSim = simulateBuy(amountNum, {
        virtualSolReserves: 0,
        virtualShareReserves: 0,
        realSolReserves: 0,
        totalSharesMinted: estimatedSupply
    });

    const estimatedShares = previewSim.sharesReceived;
    const effectivePrice = previewSim.averageEntryPrice;

    const potentialSolPayout = estimatePayoutInternal(estimatedShares);
    const potentialRoi = amountNum > 0 ? ((potentialSolPayout - amountNum) / amountNum) * 100 : 0;

    const usdValueInTrading = amountNum * solPrice;



    const chartColor = selectedSide === 'YES' ? '#10b981' : '#EF4444';

    // SOL price refreshing is now handled by PriceProvider

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
                if (!marketAccount.creator_wallet) throw new Error("Market Creator unknown");

                // Ensure minSharesOut is safe for BN (u64 max is ~18e18)
                // Shares are internal (1e9 decimals). 
                // If estimatedShares is > 1 Trillion, something is wrong with simulation.
                const safeEstimatedShares = Math.min(estimatedShares, 1_000_000_000_000); // Cap at 1T shares to prevent overflow

                // Slippage protection: received * (1 - tolerance)
                const minS = safeEstimatedShares * (1 - (slippageTolerance / 100));

                // CRITICAL SAFETY CHECK: Ensure positive
                const safeMinShares = Math.max(0, minS);

                txSignature = await buyShares(
                    new PublicKey(marketAccount.market_pda),
                    selectedSide.toLowerCase() as 'yes' | 'no',
                    amountNum,
                    new PublicKey(marketAccount.yes_token_mint!),
                    new PublicKey(marketAccount.no_token_mint!),
                    new PublicKey(marketAccount.creator_wallet),
                    safeMinShares
                );
                console.log("✅ Buy TX:", txSignature);
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
            // const virtualShareReserves = INITIAL_VIRTUAL_SOL / safePrice; // Deprecated

            const sim = simulateBuy(amountNum, {
                virtualSolReserves: 0,
                virtualShareReserves: 0,
                realSolReserves: 0,
                totalSharesMinted: getSupplyFromPrice(safePrice) // Use getSupplyFromPrice
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
            if (selectedSide === "YES") {
                setMyYesShares(prev => prev + sim.sharesReceived);
            } else {
                setMyNoShares(prev => prev + sim.sharesReceived);
            }

            // Trigger Bubble with calculated USD amount
            // usdValueInTrading is already calculated at component level and is safe to use here
            setLastTradeEvent({
                amount: usdValueInTrading,
                side: selectedSide
            });

            setTimeout(() => setLastTradeEvent(null), 3000);
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

            // Store success info for inline bubble display
            setTradeSuccessInfo({
                shares: sim.sharesReceived,
                side: selectedSide,
                txSignature: txSignature || ''
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
            setTimeout(() => {
                setIsSuccess(false);
                setTradeSuccessInfo(null);
            }, 5000); // Extended to 5s for user to see and click link
        }
    };



    // Reset when side or mode changes
    useEffect(() => {
        setBetAmount('');
        setIsMaxSell(false);
    }, [selectedSide, tradeMode]);

    // ... (Keep existing calculations)
    // Dynamic Input Label & Calculation
    const inputLabel = 'SOL';
    const inputSubtext = tradeMode === 'BUY' ? 'Amount to Spend' : 'Value to Extract';

    // Handler to toggle logic
    const handleTrade = async () => {
        console.log(`🖱️ ${tradeMode} Button Clicked.`);
        if (!publicKey) return setDjinnToast({ isVisible: true, type: 'ERROR', message: "Please connect wallet" });
        const amountVal = parseFloat(betAmount);
        if (isNaN(amountVal) || amountVal <= 0) return setDjinnToast({ isVisible: true, type: 'ERROR', message: "Enter a valid amount" });

        if (tradeMode === 'BUY') {
            await handlePlaceBet();
        } else {
            // --- SELL LOGIC (SOL Input -> Shares) ---
            const currentPrice = selectedSide === 'YES' ? livePrice : (100 - livePrice);
            const priceRatio = currentPrice / 100;
            const sharesToSell = amountVal / priceRatio; // Convert SOL input to Shares

            const availableShares = selectedSide === 'YES' ? myYesShares : myNoShares;

            // Allow small buffer for floating point issues or just cap it
            if (sharesToSell > availableShares * 1.001) { // 0.1% tolerance
                if (sharesToSell > availableShares + 0.01) {
                    return setDjinnToast({ isVisible: true, type: 'ERROR', message: `Insufficient shares! You need ${sharesToSell.toFixed(2)} shares to get ${amountVal} SOL` });
                }
            }

            // Cap at exact balance if close (MAX handling)
            const finalSharesToSell = (sharesToSell >= availableShares || isMaxSell) ? availableShares : sharesToSell;

            if (finalSharesToSell <= 0) {
                return setDjinnToast({ isVisible: true, type: 'ERROR', message: `You don't hold any ${selectedSide} PREDICTIONS to sell!` });
            }

            setIsPending(true);
            try {
                let txSignature = '';
                const isRealMarket = marketAccount?.market_pda && !marketAccount.market_pda.startsWith('local_');

                // Estimate Value & Fee (EXIT_FEE_BPS = 100 = 1% on-chain)
                const estimatedSolReturn = finalSharesToSell * priceRatio; // Should match input roughly
                const feeParam = 0.01; // 1% (matches EXIT_FEE_BPS in contract)
                const feeAmount = estimatedSolReturn * feeParam;
                const netSolReturn = estimatedSolReturn - feeAmount;

                if (isRealMarket) {
                    try {
                        console.log("🔗 Executing On-Chain Sell...");
                        console.log("🔗 SELL CALL - marketAccount.market_pda:", marketAccount.market_pda);
                        console.log("🔗 SELL CALL - Compare with PAGE.TSX marketInfo.market_pda above");
                        if (!marketAccount.creator_wallet) throw new Error("Market Creator unknown");

                        // Calculate slippage protection for sell (user-configured tolerance)
                        const slippageMultiplier = 1 - (slippageTolerance / 100);
                        const minSolOut = Math.floor((netSolReturn * slippageMultiplier) * LAMPORTS_PER_SOL);

                        const tx = await sellShares(
                            new PublicKey(marketAccount.market_pda),
                            selectedSide.toLowerCase() as 'yes' | 'no',
                            finalSharesToSell,
                            new PublicKey(marketAccount.yes_token_mint),
                            new PublicKey(marketAccount.no_token_mint),
                            new PublicKey(marketAccount.creator_wallet), // Market Creator
                            minSolOut, // ✅ Slippage protection: reject if <95% of expected SOL
                            isMaxSell // ✅ PASS MAX FLAG
                        );
                        console.log("✅ Sell TX:", tx);
                        txSignature = tx;
                    } catch (sellError: any) {
                        console.error("❌ SELL ERROR DETAILS:", {
                            message: sellError.message,
                            code: sellError.code,
                            logs: sellError.logs,
                            error: sellError,
                            stack: sellError.stack
                        });

                        // Show detailed error to user
                        setDjinnToast({
                            isVisible: true,
                            type: 'ERROR',
                            title: 'Sell Failed',
                            message: `Error: ${sellError.message}. Check console for details.`
                        });

                        setIsPending(false);
                        return; // Stop execution on error
                    }
                } else {
                    console.log("🔮 Simulated Sell");
                    await new Promise(r => setTimeout(r, 1000));
                }

                // --- COMMON UPDATES ---
                // 1. Calculate Sell Impact (Negative)
                // Impact Logic: Buying X amount moves price Y. Selling X should move price -Y.
                const usdValue = finalSharesToSell * (currentPrice / 100) * solPrice;
                // S = Price * K
                const currentS = (currentPrice / 100) * CURVE_CONSTANT;
                // const virtualShareReserves = INITIAL_VIRTUAL_SOL / (currentPrice / 100); // legacy

                const sim = simulateBuy(estimatedSolReturn, {
                    virtualSolReserves: 0,
                    virtualShareReserves: 0,
                    realSolReserves: 0,
                    totalSharesMinted: getSupplyFromPrice(currentPrice) // Use currentPrice
                });

                // For Sell, we INVERT the impact.
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
                    finalSharesToSell
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
                    shares: finalSharesToSell,
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
                    setMyYesShares(prev => Math.max(0, prev - finalSharesToSell));
                } else {
                    setMyNoShares(prev => Math.max(0, prev - finalSharesToSell));
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

                setDjinnToast({
                    isVisible: true,
                    type: 'SUCCESS',
                    title: 'SUCCESS',
                    message: `Sold ${finalSharesToSell.toFixed(2)} ${selectedSide} shares for ${netSolReturn.toFixed(4)} SOL.`,
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


    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32">
            {/* ... Navbar & Header ... */}
            <Navbar />
            <div className="max-w-7xl mx-auto pt-32 px-4 md:px-6 relative z-10">

                {/* HEADER (Restored to Top) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* LEFT COLUMN: Header + Chart + Info */}
                    <div className="col-span-1 md:col-span-8 flex flex-col gap-6">

                        {/* HEADER (Moved Inside Left Column) */}
                        {/* HEADER (Moved Inside Left Column) - Refined Layout */}
                        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-2">
                            {/* LEFT: Image + Title */}
                            <div className="flex items-end gap-5 flex-1">
                                <div className="w-44 h-44 bg-[#1A1A1A] rounded-3xl border border-white/10 flex items-center justify-center text-6xl shadow-2xl overflow-hidden shrink-0">
                                    {(marketAccount?.banner_url || (typeof staticMarketInfo.icon === 'string' && (staticMarketInfo.icon.startsWith('http') || staticMarketInfo.icon.startsWith('data:')))) ?
                                        <img src={marketAccount?.banner_url || staticMarketInfo.icon} className="w-full h-full object-cover" />
                                        : staticMarketInfo.icon}
                                </div>
                                <div className="pb-2">
                                    <h1 className="text-4xl font-black tracking-tight leading-none text-white mb-2">{marketAccount?.title || staticMarketInfo.title}</h1>
                                    <p className="text-gray-500 text-sm font-medium line-clamp-2 max-w-md leading-relaxed mb-3">{marketAccount?.description || staticMarketInfo.description}</p>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(window.location.href);
                                                setDjinnToast({ isVisible: true, type: 'SUCCESS', title: 'Link Copied', message: 'Market link copied to clipboard' });
                                            }}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white group"
                                        >
                                            <Share2 size={12} className="group-hover:text-[#F492B7] transition-colors" />
                                            <span>Share</span>
                                        </button>

                                        {(myYesShares > 0 || myNoShares > 0) && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#10B981]/20 to-[#10B981]/10 border border-[#10B981]/30">
                                                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                                                <span className="text-[10px] font-black uppercase text-[#10B981] tracking-wide">Position Active</span>
                                            </div>
                                        )}

                                        {/* SOURCE Link (Moved here) */}
                                        {marketAccount?.resolution_source && (
                                            <a href={marketAccount.resolution_source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white group">
                                                <span>Source</span> <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Metrics (Implied, Mcap) - Fills Space */}
                            <div className="flex flex-col items-end justify-between h-44 py-1 flex-1">
                                {/* Top: Implied Prob */}
                                <div className="flex items-baseline gap-2 mb-auto">
                                    <span className="text-6xl font-black tracking-tighter transition-colors" style={{ color: chartColor }}>{impliedProb.toFixed(1)}%</span>
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest translate-y-[-6px]">Implied</span>
                                </div>

                                {/* Bottom: Mcap (Fills Width, Centered) */}
                                <div className="flex items-center justify-center gap-6 bg-[#0E0E0E] px-6 py-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md w-full">
                                    <div className="flex flex-col items-center flex-1">
                                        <span className="text-[11px] font-bold uppercase text-[#10B981] tracking-wide mb-1">YES Mcap</span>
                                        <span className="text-3xl font-extrabold text-white tracking-tight">
                                            ${mounted ? formatCompact(yesMcap * (solPrice || 200)) : '...'}
                                        </span>
                                    </div>
                                    <div className="w-px h-12 bg-white/10" />
                                    <div className="flex flex-col items-center flex-1">
                                        <span className="text-[11px] font-bold uppercase text-[#EF4444] tracking-wide mb-1">NO Mcap</span>
                                        <span className="text-3xl font-extrabold text-white tracking-tight">
                                            ${mounted ? formatCompact(noMcap * (solPrice || 200)) : '...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CHART CARD */}
                        <div className="bg-[#0E0E0E] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group min-h-[400px]">

                            {/* PROBABILITY BAR (Top of Chart) */}
                            <div className="mb-8 px-1">
                                <div className="h-4 w-full bg-[#1A1A1A] rounded-full overflow-hidden flex relative shadow-inner border border-white/5">
                                    <div className="h-full bg-[#10B981] transition-all duration-500 ease-out relative group" style={{ width: `${livePrice}%` }}>
                                        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-black/10 z-10"></div>
                                    </div>
                                    <div className="h-full bg-[#EF4444] transition-all duration-500 ease-out" style={{ width: `${100 - livePrice}%` }}></div>
                                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/20 z-10"></div>
                                </div>
                                <div className="flex justify-between mt-2 px-1">
                                    <span className="text-xs font-black text-[#10B981]">YES {livePrice.toFixed(0)}%</span>
                                    <span className="text-xs font-black text-[#EF4444]">NO {(100 - livePrice).toFixed(0)}%</span>
                                </div>
                            </div>
                            {/* Unified Visx Chart - Polymarket Style with YES and NO lines */}
                            <PrettyChart
                                series={isMultiOutcome ? chartSeries : [
                                    {
                                        name: 'Yes',
                                        color: '#10B981', // Green
                                        data: chartData
                                    },
                                    {
                                        name: 'No',
                                        color: '#EF4444', // Red
                                        data: chartData.map(d => ({ ...d, value: 100 - d.value }))
                                    }
                                ]}
                                trigger={lastTradeEvent}
                            />

                            {/* Multi-outcome Selector (if applicable) */}
                            {isMultiOutcome && (
                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <h3 className="text-sm font-black uppercase text-gray-500 mb-4 tracking-wider">Select an outcome to trade</h3>
                                    <OutcomeList
                                        outcomes={marketOutcomes}
                                        selectedId={selectedOutcomeId}
                                        onSelect={setSelectedOutcomeId}
                                        onBuyClick={handleOutcomeBuyClick}
                                    />
                                </div>
                            )}
                        </div>



                        {/* TABS & CONTENT (Limitless Style) */}
                        {/* RESOLUTION CRITERIA (Permanent Block) */}
                        <div className="bg-[#0E0E0E] rounded-[2rem] border border-white/5 p-8">
                            <h3 className="text-lg font-bold text-white mb-4">Resolution Criteria</h3>
                            <p className="text-gray-400 leading-relaxed mb-6 font-light">
                                This market will resolve to "YES" if the specific outcome defined in the title occurs by the resolution date.
                                The resolution is decentralized and verified by the Pyth Network or designated oracle.
                            </p>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Source Oracle</span>
                                {marketAccount?.resolution_source ? (
                                    <a href={marketAccount.resolution_source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#10B981] hover:underline font-mono text-sm">
                                        <span>{marketAccount.resolution_source}</span> <ExternalLink size={12} />
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-2 text-white">
                                        <img src="/pyth-logo.png" className="w-4 h-4 rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />
                                        <span className="font-bold">Pyth Network</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TABS (Activity, Opinions, Holders) */}
                        <div>
                            <div className="flex items-center gap-6 mb-6 border-b border-white/5 pb-0">
                                <TabButton label="Activity" icon={<Activity size={14} />} active={bottomTab === 'ACTIVITY'} onClick={() => setBottomTab('ACTIVITY')} />
                                <TabButton label="Opinions" icon={<MessageCircle size={14} />} active={bottomTab === 'COMMENTS'} onClick={() => setBottomTab('COMMENTS')} />
                                <TabButton label="Top Holders" icon={<Users size={14} />} active={bottomTab === 'HOLDERS'} onClick={() => setBottomTab('HOLDERS')} />
                            </div>
                        </div>

                        {/* RESOLUTION TAB Content */}

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
                        <div className="bg-gradient-to-b from-[#0E0E0E] to-[#050505] border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-xl">
                            <div className="flex justify-end mb-6 items-center">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-[#F492B7] bg-[#F492B7]/10 px-4 py-1.5 rounded-full border border-[#F492B7]/20">
                                        <Wallet size={12} /> <span>{solBalance.toFixed(2)} SOL</span>
                                    </div>
                                </div>
                            </div>

                            {/* SQUID GAME UI: Total Pool Counter */}
                            <div className="mb-6">
                                <PrizePoolCounter totalSol={marketAccount?.global_vault ? (Number(marketAccount.global_vault) / LAMPORTS_PER_SOL) : 0.05} />
                            </div>

                            {/* NEW: BUY / SELL TOGGLE */}
                            <div className="mb-8 p-2 bg-gradient-to-r from-white/[0.05] to-white/[0.03] rounded-[2rem] flex shadow-inner">
                                <button
                                    onClick={() => setTradeMode('BUY')}
                                    className={`flex-1 py-4 rounded-[1.75rem] text-sm font-bold uppercase tracking-[0.25em] transition-all duration-300 ${tradeMode === 'BUY' ? 'bg-[#10B981] text-white shadow-xl shadow-[#10B981]/40 scale-[1.02]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => setTradeMode('SELL')}
                                    className={`flex-1 py-4 rounded-[1.75rem] text-sm font-bold uppercase tracking-[0.25em] transition-all duration-300 ${tradeMode === 'SELL' ? 'bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white shadow-xl shadow-[#EF4444]/40 scale-[1.02]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    Sell
                                </button>
                            </div>



                            {/* YES/NO Buttons */}
                            {/* VERTICAL LAYOUT RESTORED */}

                            {/* 1. INPUT Section */}
                            <div className="bg-[#1A1A1A] rounded-[2rem] border border-white/10 p-6 relative group hover:border-white/20 transition-all mb-4">
                                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">
                                    {tradeMode === 'BUY' ? 'You Pay' : 'You Receive (Est)'}
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={betAmount || ''}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        className="bg-transparent text-5xl font-extralight text-white w-full outline-none placeholder-white/30 tracking-tighter [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0"
                                    />
                                    {/* SOL ICON */}
                                    <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-2 rounded-xl border border-white/10 shrink-0">
                                        <img
                                            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                                            className="w-5 h-5"
                                            alt="SOL"
                                        />
                                        <span className="text-sm font-bold text-white">SOL</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. PROBABILITY BAR & OUTCOMES */}
                            <div className="mb-6 space-y-3">
                                <div className="flex items-center justify-between px-2">
                                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Prediction</span>
                                    {/* Slippage (Pencil Edit) */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5">{slippageTolerance}% SLIP</span>
                                        <button onClick={() => {
                                            const newSlippage = prompt("Enter new slippage %:", slippageTolerance.toString());
                                            if (newSlippage && !isNaN(parseFloat(newSlippage))) setSlippageTolerance(parseFloat(newSlippage));
                                        }} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                            <Edit2 size={12} />
                                        </button>
                                    </div>
                                </div>



                                {/* LARGE YES/NO BUTTONS (Limitless Style) */}
                                <div className="flex gap-3 h-20">
                                    {isMultiOutcome ? (
                                        <div className="flex-1 bg-[#1A1A1A] rounded-2xl border border-white/10 p-4 flex flex-col justify-center items-center hover:border-[#F492B7]/50 transition-colors cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Target Outcome</span>
                                            <span className="font-bold text-white text-lg truncate max-w-full">{selectedOutcomeName || 'Select First'}</span>
                                            <span className="text-sm font-mono text-[#10B981] mt-1">{(livePrice ?? 0).toFixed(0)}%</span>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setSelectedSide('YES')}
                                                className={`flex-1 rounded-xl flex flex-col items-center justify-center transition-all duration-200 border-2 ${selectedSide === 'YES'
                                                    ? 'bg-[#10B981] border-[#10B981] text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02]'
                                                    : 'bg-[#1A1A1A] border-white/5 text-gray-500 hover:border-[#10B981]/50 hover:bg-[#10B981]/10'}`}
                                            >
                                                <span className="text-xs font-black uppercase tracking-widest mb-0.5">YES</span>
                                                <span className={`text-2xl font-bold ${selectedSide === 'YES' ? 'text-white' : 'text-[#10B981]'}`}>
                                                    {(livePrice ?? 50).toFixed(0)}%
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedSide('NO')}
                                                className={`flex-1 rounded-xl flex flex-col items-center justify-center transition-all duration-200 border-2 ${selectedSide === 'NO'
                                                    ? 'bg-[#EF4444] border-[#EF4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-[1.02]'
                                                    : 'bg-[#1A1A1A] border-white/5 text-gray-500 hover:border-[#EF4444]/50 hover:bg-[#EF4444]/10'}`}
                                            >
                                                <span className="text-xs font-black uppercase tracking-widest mb-0.5">NO</span>
                                                <span className={`text-2xl font-bold ${selectedSide === 'NO' ? 'text-white' : 'text-[#EF4444]'}`}>
                                                    {(100 - (livePrice ?? 50)).toFixed(0)}%
                                                </span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 3. TRANSACTION SUMMARY */}
                            <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-[2rem] border border-white/10 p-6 space-y-5">
                                {/* BUY MODE SUMMARY */}
                                {tradeMode === 'BUY' && (
                                    <>
                                        <div className="flex justify-between items-center text-gray-500 font-semibold uppercase text-[10px] tracking-[0.2em]">
                                            <span>Rate</span>
                                            <span className="font-mono text-xs lowercase text-gray-300">
                                                1 SOL ≈ {amountNum > 0 ? formatCompact(estimatedShares / amountNum) : formatCompact(1 / ((livePrice ?? 50) / 100))} shares
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-gray-500 font-semibold uppercase text-[10px] tracking-[0.2em]">
                                            <span>Impact</span>
                                            <span className={`font-mono text-xs ${previewSim.priceImpact > 5 ? 'text-amber-400' : 'text-gray-300'}`}>
                                                {previewSim.priceImpact.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-white/10 pt-5">
                                            <div>
                                                <span className="block text-gray-500 font-semibold uppercase text-[10px] tracking-[0.2em] mb-2">Shares to Receive</span>
                                                <span className="text-4xl font-extralight text-white leading-none tracking-tight">
                                                    {formatCompact(estimatedShares)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-gray-500 font-semibold uppercase text-[10px] tracking-[0.2em] mb-2">Cost</span>
                                                <span className="text-base font-bold text-[#10B981] font-mono">
                                                    ${(parseFloat(betAmount || '0') * solPrice).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* SELL MODE SUMMARY */}
                                {tradeMode === 'SELL' && (
                                    <>
                                        <div className="flex justify-between items-center text-gray-500 font-semibold uppercase text-[10px] tracking-[0.2em]">
                                            <span>Exit Price</span>
                                            <span className="font-mono text-xs text-gray-300">
                                                {currentPriceForSide.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-white/10 pt-5 mt-4">
                                            <div>
                                                <span className="block text-gray-500 font-semibold uppercase text-[10px] tracking-[0.2em] mb-2">Shares Sold</span>
                                                <span className="text-4xl font-extralight text-white leading-none tracking-tight">
                                                    {formatCompact(parseFloat(betAmount || '0') / (currentPriceForSide / 100))}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-gray-500 font-semibold uppercase text-[10px] tracking-[0.2em] mb-2">You Get</span>
                                                <span className="text-xl font-bold text-[#10B981] font-mono">
                                                    ◎{formatCompact(parseFloat(betAmount || '0') * 0.99)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>






                            {/* ACTION BUTTON */}
                            <button
                                onClick={handleTrade}
                                disabled={isPending || isSuccess}
                                className={`w-full py-6 rounded-[2rem] font-bold text-lg uppercase tracking-[0.25em] shadow-2xl transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group mt-6 ${isSuccess ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-black' :
                                    tradeMode === 'BUY' ? 'bg-[#10B981] text-white hover:shadow-[#10B981]/50 hover:shadow-2xl hover:scale-[1.02]' : 'bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white hover:shadow-[#EF4444]/50 hover:shadow-2xl hover:scale-[1.02]'
                                    }`}
                            >
                                {isPending ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" /> Processing...
                                    </div>
                                ) : isSuccess ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <CheckCircle2 /> <span className="text-lg">Success</span>
                                    </div>
                                ) : (
                                    <span>
                                        {tradeMode === 'BUY' ? `Buy ${selectedSide}` : `Sell ${selectedSide}`}
                                    </span>
                                )}
                            </button>

                            {/* SUCCESS BUBBLE - Shows after successful trade */}
                            {tradeSuccessInfo && (
                                <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500/40 rounded-[1.5rem] p-4 text-center shadow-xl shadow-emerald-500/10">
                                        <p className="text-emerald-400 font-bold text-sm">
                                            ✓ Successfully purchased {tradeSuccessInfo.shares.toFixed(2)} {tradeSuccessInfo.side} shares
                                        </p>
                                        {tradeSuccessInfo.txSignature && (
                                            <a
                                                href={`https://solscan.io/tx/${tradeSuccessInfo.txSignature}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-emerald-500/70 hover:text-emerald-400 underline underline-offset-2 mt-2 inline-block transition-all hover:scale-105"
                                            >
                                                View on Solscan →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
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
            {
                lastBetDetails && (
                    <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        betDetails={lastBetDetails}
                    />
                )
            }


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
        </div >
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