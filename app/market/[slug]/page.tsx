'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { formatCompact } from '@/lib/utils';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Clock, DollarSign, Wallet, Activity, Users, CheckCircle2, AlertCircle, Loader2, Edit2, ExternalLink, Share2, Scale, MessageCircle, Star } from 'lucide-react';
import Link from 'next/link';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { simulateBuy, estimatePayoutInternal, CURVE_CONSTANT, VIRTUAL_OFFSET, getSpotPrice, getSupplyFromPrice, calculateImpliedProbability, getIgnitionStatus, getIgnitionProgress } from '@/lib/core-amm';

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
import DjinnChart from '@/components/DjinnChart';
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
    const { program, buyShares, sellShares, isReady: isContractReady } = useDjinnProtocol();

    // --- STATE ---
    // Market Data
    const [marketAccount, setMarketAccount] = useState<any>(null);
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
    const {
        yesMcap,
        noMcap,
        yesPercent,
        noPercent,
        ignitionProgress,
        ignitionStatus,
        spotYes,
        spotNo
    } = useMemo(() => {
        let sYes = 0; let sNo = 0;

        // Use outcome_supplies from marketAccount if available (populated by on-chain fetch)
        if (marketAccount?.outcome_supplies && marketAccount.outcome_supplies.length >= 2) {
            sYes = Number(marketAccount.outcome_supplies[0]) / 1e9;
            sNo = Number(marketAccount.outcome_supplies[1]) / 1e9;
        } else if (marketAccount?.yes_supply !== undefined) {
            sYes = Number(marketAccount.yes_supply) / 1e9;
            sNo = Number(marketAccount.no_supply) / 1e9;
        } else {
            // Fallback: Infer supply from price ONLY for demo local markets
            const p = livePrice ?? 50;
            const impliedProb = p / 100;
            // Map probability to the actual curve SOL price range
            const approxPrice = 0.0000001 + (impliedProb * (0.95 - 0.0000001));
            sYes = getSupplyFromPrice(approxPrice);
            sNo = getSupplyFromPrice(0.0000001 + ((1 - impliedProb) * (0.95 - 0.0000001)));
        }

        // MCAP = Total Locked Value * Probability (Simpler and matches Total Pool)
        // User Logic: "Whatever is in the pool but for YES or NO independently"
        // This ensures Yes + No = Total Pool (roughly).
        const totalS = sYes + sNo;
        const poolSol = marketAccount?.vault_balance || 0;

        const mYes = totalS > 0 ? (poolSol * (sYes / totalS)) : 0;
        const mNo = totalS > 0 ? (poolSol * (sNo / totalS)) : 0;

        const currentSpotYes = getSpotPrice(sYes);
        const currentSpotNo = getSpotPrice(sNo);

        // Weight % based on spot price ratio (50/50 if prices equal)
        const totalP = currentSpotYes + currentSpotNo;
        const yP = (totalP > 0) ? (currentSpotYes / totalP) * 100 : 50;

        return {
            yesMcap: mYes,
            noMcap: mNo,
            yesPercent: yP,
            noPercent: 100 - yP,
            ignitionProgress: getIgnitionProgress(sYes + sNo),
            ignitionStatus: getIgnitionStatus(sYes + sNo),
            spotYes: currentSpotYes,
            spotNo: currentSpotNo
        };
    }, [marketAccount, livePrice]);

    // Reactive Market Outcomes
    const marketOutcomes = useMemo(() => {
        const base = (MULTI_OUTCOMES[slug] || [
            { id: 'yes', title: 'YES', volume: '0', yesPrice: 50, noPrice: 50, chance: 50 },
            { id: 'no', title: 'NO', volume: '0', yesPrice: 50, noPrice: 50, chance: 50 },
        ]).map(o => ({ ...o }));

        if (base.length >= 2) {
            // YES
            base[0].chance = yesPercent;
            base[0].yesPrice = spotYes * 100; // in "cents" for display
            base[0].volume = formatCompact(yesMcap);

            // NO
            base[1].chance = noPercent;
            base[1].yesPrice = spotNo * 100;
            base[1].volume = formatCompact(noMcap);
        }
        return base;
    }, [slug, yesPercent, noPercent, yesMcap, noMcap, spotYes, spotNo]);


    // User Data
    const [solBalance, setSolBalance] = useState<number>(0);
    const [vaultBalanceSol, setVaultBalanceSol] = useState<number>(0); // On-chain vault balance for Prize Pool
    const [myShares, setMyShares] = useState<Record<number, number>>({});
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

    // Star/Save feature
    const [isStarred, setIsStarred] = useState(false);

    // Purchase bubble notifications (shows when someone buys)
    const [purchaseBubbles, setPurchaseBubbles] = useState<{ id: number; side: 'YES' | 'NO'; amount: number }[]>([]);

    // Helper to safely normalize shares if they come in raw (e.g. > 1e12)
    const normalizeShares = (val: number) => {
        // Just return the value, we'll ensure it's normalized at the source
        return val;
    };

    const updateMyShares = (index: number, amount: number) => {
        const safeAmount = normalizeShares(amount);
        setMyShares(prev => ({ ...prev, [index]: safeAmount }));
    };

    // Derived
    const isMultiOutcome = (MULTI_OUTCOMES[slug] || []).length > 0;
    const staticMarketInfo = marketDisplayData[slug] || { title: 'Unknown Market', icon: '❓', description: 'Market not found' };
    const effectiveSlug = slug;

    // Load starred state from localStorage on mount
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('djinn_saved_markets') || '[]');
        setIsStarred(saved.includes(effectiveSlug));
    }, [effectiveSlug]);

    // --- INITIALIZATION ---
    useEffect(() => {
        const initialOutcomes = MULTI_OUTCOMES[slug] || [];

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
    // Manual Refresh triggers a reload of all on-chain data
    const refreshBalances = async () => {
        setIsLoading(true);
        try {
            await loadMarketData();
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
    const loadMarketData = useCallback(async () => {
        if (!connection) return;
        // Priority: Supabase -> Static Outcome Defaults -> 50
        const dbData = await supabaseDb.getMarketData(effectiveSlug);
        const marketInfo = await supabaseDb.getMarket(effectiveSlug);
        console.log("MARKET INFO DEBUG:", marketInfo); // Debug Real Market detection
        if (marketInfo) {
            // Fetch Creator Profile to display avatar
            if (marketInfo.creator_wallet) {
                try {
                    const creatorProfile = await supabaseDb.getProfile(marketInfo.creator_wallet);
                    if (creatorProfile) {
                        // @ts-ignore
                        marketInfo.creator_username = creatorProfile.username;
                        // @ts-ignore
                        marketInfo.creator_avatar = creatorProfile.avatar_url;
                    }
                } catch (err) { console.warn("Failed to load creator profile", err); }
            }
            setMarketAccount(marketInfo);
        }

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
        const outcomeIds = marketOutcomes.map(o => o.id);
        const targetSlugs = Array.from(new Set([slug, effectiveSlug, ...outcomeIds])); // Deduplicate
        const relevantActivity = await supabaseDb.getActivity(0, 50, targetSlugs);
        setActivityList(relevantActivity);

        // Load Holders
        const topHolders = await supabaseDb.getTopHolders(effectiveSlug);
        setHolders(topHolders);

        // On-Chain Fallback
        if (marketInfo?.market_pda && publicKey && program) {
            try {
                const marketPda = new PublicKey(marketInfo.market_pda);
                // PROGRAM_ID is already imported from @/lib/program-config at the top of file (if not, we should import it)
                // However, checking imports... it IS imported as PROGRAM_ID.
                // But wait, line 20 of current file (based on view) has: import { PROGRAM_ID } from '@/lib/program-config';

                // So we can just use it.

                const decodePosition = (accInfo: any) => {
                    if (!accInfo?.data) return 0;
                    try {
                        const decoded = program.coder.accounts.decode('UserPosition', accInfo.data);
                        return Number(decoded.shares) / 1e9;
                    } catch (e) {
                        return 0;
                    }
                };

                const numOutcomes = (marketInfo as any).num_outcomes || 2;
                const pdas = [];
                for (let n = 0; n < numOutcomes; n++) {
                    const [pda] = PublicKey.findProgramAddressSync(
                        [Buffer.from("user_pos"), marketPda.toBuffer(), publicKey.toBuffer(), Buffer.from([n])],
                        PROGRAM_ID
                    );
                    pdas.push(pda);
                }

                const [marketAccInfo, ...pdaInfos] = await connection.getMultipleAccountsInfo([marketPda, ...pdas]);
                const newShares: Record<number, number> = {};
                pdaInfos.forEach((info, idx) => {
                    newShares[idx] = decodePosition(info);
                });
                setMyShares(newShares);

                if (marketAccInfo) {
                    // Use coder.decode for safety with variable length data
                    const decodedMarket = program.coder.accounts.decode('Market', marketAccInfo.data);
                    const sYes = Number(decodedMarket.outcomeSupplies[0]) / 1e9;
                    const sNo = Number(decodedMarket.outcomeSupplies[1]) / 1e9;
                    const totalS = sYes + sNo;
                    if (totalS > 0) {
                        const newPrice = (sYes / totalS) * 100;
                        setLivePrice(newPrice);
                        setChartData(prev => {
                            const newData = [...prev, { date: Date.now(), value: newPrice }];
                            if (newData.length > 50) newData.shift();
                            return newData;
                        });
                    }

                    const vSol = Number(decodedMarket.vaultBalance) / LAMPORTS_PER_SOL;
                    setVaultBalanceSol(vSol);
                    setMarketAccount((prev: any) => ({
                        ...prev,
                        ...decodedMarket,
                        outcome_supplies: decodedMarket.outcomeSupplies,
                        creator: decodedMarket.creator.toBase58(),
                        vault_balance: vSol
                    }));
                }
            } catch (e) {
                console.warn("On-chain UserPosition check failed:", e);
            }
        }
    }, [connection, effectiveSlug, publicKey, program, marketOutcomes, slug]);

    useEffect(() => {
        loadMarketData();





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
    }, [effectiveSlug, publicKey]);

    // CALCULATIONS (Real-Time CPMM Simulation)
    const amountNum = parseFloat(betAmount) || 0;
    const isOverBalance = amountNum > solBalance;
    const currentPriceForSide = selectedSide === 'YES' ? livePrice : (100 - livePrice);

    // User Position Helper 
    const myHeldSide = (myShares[0] > 0.001) ? 'YES' : ((myShares[1] > 0.001) ? 'NO' : null);
    const myHeldAmount = selectedSide === 'YES' ? (myShares[0] || 0) : (myShares[1] || 0);
    const myHeldAmountStr = (myHeldAmount || 0).toFixed(2);

    // Trading Preview Calculations (V3 Hybrid Curve Logic)

    // Convert 0-100 probability to an approximate SOL price for initial supply estimation
    // This is just an estimation to sync UI state with curve state
    const impliedProbability = currentPriceForSide / 100;

    // Invert Phase 3 Curve: Supply -> Price.
    // We import getSupplyFromPrice from core-amm to get the exact supply for this price.
    // Price range is roughly 0.000001 (0%) to 0.95 (100%).

    // Map 0-100 prob to 0.000001 - 0.95 SOL price range
    // Map 0-100 prob to 0.000001 - 0.95 SOL price range
    const approxSolPrice = 0.000001 + (impliedProbability * (0.95 - 0.000001));

    // FIX for New Markets:
    // If price is 50% (default) and we don't have explicit high-supply data, assume interactions start at 0.
    // This prevents estimating a high entry price (~0.47 SOL) for empty markets.
    let estimatedSupply = 0;

    if (marketAccount && (marketAccount.yes_supply || marketAccount.no_supply)) {
        // Use Real On-Chain Supply if available (Assuming 6 decimals)
        // Checks both snake_case (Supabase) and camelCase (potential Anchor fetch)
        const rawYes = marketAccount.yes_supply ?? marketAccount.yesSupply;
        const rawNo = marketAccount.no_supply ?? marketAccount.noSupply;

        const rawSupply = selectedSide === 'YES' ? rawYes : rawNo;

        // Safety check: Number(null) is 0, Number(undefined) is NaN.
        const supplyNum = rawSupply ? Number(rawSupply) : 0;
        estimatedSupply = isNaN(supplyNum) ? 0 : supplyNum / 1_000_000_000;

    } else if (Math.abs(currentPriceForSide - 50) < 0.5) {
        // If price is ~50% and no market data, assume New Market (0 Supply)
        estimatedSupply = 0;
    } else {
        // Fallback: Infer supply from price
        estimatedSupply = getSupplyFromPrice(approxSolPrice);
    }

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
            // CHECK if REAL or SIMULATED
            // V4 Contract uses Internal Ledger (UserPosition), so 'yes_token_mint' check is legacy.
            // We rely on 'market_pda' presence and valid structure.
            const isRealMarket = marketAccount?.market_pda && !marketAccount.market_pda.startsWith('local_');

            if (isRealMarket) {
                // --- ON-CHAIN BUY ---
                console.log("🔗 Executing On-Chain Buy...");
                console.log("  - Market PDA:", marketAccount.market_pda);
                console.log("  - Side:", selectedSide);
                console.log("  - Amount SOL:", amountNum);

                if (!marketAccount.creator_wallet) throw new Error("Market Creator unknown");

                console.log("🔍 DEBUG - Account Info:");
                console.log("  - Creator Wallet:", marketAccount.creator_wallet);
                console.log("  - Market PDA:", marketAccount.market_pda);
                console.log("  - User Wallet:", publicKey.toBase58());

                // Read market account from contract to verify
                try {
                    const marketPda = new PublicKey(marketAccount.market_pda);
                    const marketAcct = await connection.getAccountInfo(marketPda);
                    if (marketAcct) {
                        // Parse creator (first 32 bytes after 8-byte discriminator)
                        const creatorBytes = marketAcct.data.slice(8, 40);
                        const creatorFromContract = new PublicKey(creatorBytes);
                        console.log("  - Creator from contract:", creatorFromContract.toBase58());
                        console.log("  - Creators match?", creatorFromContract.toBase58() === marketAccount.creator_wallet);

                        // Parse num_outcomes (at offset 8 + 32 + (4+64) + 8 = 116)
                        const numOutcomes = marketAcct.data.readUInt8(116);
                        const outcomeIndex = selectedSide === 'YES' ? 0 : 1;
                        console.log("  - Num outcomes:", numOutcomes);
                        console.log("  - Outcome index:", outcomeIndex);
                        console.log("  - Index valid?", outcomeIndex < numOutcomes);
                    }
                } catch (e) {
                    console.error("Failed to read market from contract:", e);
                }

                // Ensure minSharesOut is safe for BN (u64 max is ~18e18)
                // Shares are internal (1e9 decimals). 
                // Cap strictly to avoid BN overflow in JS layer before passing to hook
                const safeEstimatedShares = Math.min(estimatedShares, 10_000_000_000); // 10B shares max per tx safe limit

                // Slippage protection: received * (1 - tolerance)
                const minS = safeEstimatedShares * (1 - (slippageTolerance / 100));

                // CRITICAL SAFETY CHECK: Ensure positive
                const safeMinShares = Math.max(0, minS);
                console.log("  - Min Shares Out:", safeMinShares);

                // Use dummy mints if not present (V4 doesn't use them in contract, but hook signature might expect them)
                const dummyMint = new PublicKey("So11111111111111111111111111111111111111112");

                const outcomeIndex = isMultiOutcome
                    ? marketOutcomes.findIndex(o => o.id === selectedOutcomeId)
                    : (selectedSide === 'YES' ? 0 : 1);

                if (outcomeIndex === -1) throw new Error("Invalid outcome selection");

                try {
                    txSignature = await buyShares(
                        new PublicKey(marketAccount.market_pda),
                        outcomeIndex,
                        amountNum,
                        new PublicKey(marketAccount.yes_token_mint || dummyMint.toBase58()),
                        new PublicKey(marketAccount.no_token_mint || dummyMint.toBase58()),
                        new PublicKey(marketAccount.creator || marketAccount.creator_wallet), // Use 'creator' from on-chain fetch
                        safeMinShares
                    );
                    console.log("✅ Buy TX:", txSignature);
                } catch (buyErr: any) {
                    console.error("❌ Buy Shares Failed:", buyErr);
                    throw new Error(`Transaction Failed: ${buyErr.message || buyErr}`);
                }
            } else {
                // --- SIMULATED BUY ---
                console.log("🔮 Executing Simulated Buy (Demo Market)...");
                const reason = !marketAccount?.market_pda ? "Missing Market PDA" : "Local Market";

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
                totalSharesMinted: estimatedSupply // Use correct supply from scope
            });

            // 2. Update Price Locally (Pari-Mutuel Inverse) and in DB
            // Calculate NEW Probability from NEW Spot Price
            // sim.endPrice is the predicted price after buy.
            // sim.endPrice is the predicted price after buy.
            let outcome0Supply = 0;
            let outcome1Supply = 0;
            if (marketAccount?.outcome_supplies && marketAccount.outcome_supplies.length >= 2) {
                outcome0Supply = Number(marketAccount.outcome_supplies[0]) / 1e9;
                outcome1Supply = Number(marketAccount.outcome_supplies[1]) / 1e9;
            } else if (marketAccount?.yes_supply !== undefined) {
                outcome0Supply = Number(marketAccount.yes_supply) / 1e9;
                outcome1Supply = Number(marketAccount.no_supply) / 1e9;
            }

            const otherSideSupply = selectedSide === 'YES' ? outcome1Supply : outcome0Supply;
            const rawOtherSidePrice = getSpotPrice(otherSideSupply);

            // STABILIZER: For fresh markets, clamp divisor price to avoid 100% explosion.
            // If other side has 0 liquidity (price ~0), a small buy feels like 100%.
            // We force a minimum "virtual liquidity price" of 0.0001 for the ratio calc.
            const otherSidePrice = Math.max(rawOtherSidePrice, 0.0001);

            // Calculate new probability for the outcome we bought
            const newLikelihood = (sim.endPrice / (sim.endPrice + otherSidePrice)) * 100;

            // Calculate Delta for the Main Chart (YES Probability)
            let probDelta = 0;

            if (selectedSide === 'YES') {
                // Bought YES. YES Prob goes UP.
                // newLikelihood (YES) > livePrice.
                probDelta = newLikelihood - livePrice;
            } else {
                // Bought NO. NO Prob goes UP. YES Prob goes DOWN.
                // newLikelihood is NO Prob.
                // Main Chart is YES Prob.
                // New YES = 100 - newLikelihood.
                // Old YES = livePrice.
                probDelta = (100 - newLikelihood) - livePrice;
            }

            // Safety Cap: Don't let huge jumps happen if calculation is weird
            if (Math.abs(probDelta) > 20) probDelta = probDelta > 0 ? 20 : -20;

            const newPrice = updateExectutionPrices(effectiveSlug, probDelta);
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

            await loadMarketData();

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
                message: `Successfully bought ${formatCompact(sim.sharesReceived)} ${selectedSide} shares.`,
                actionLink: txSignature ? `https://solscan.io/tx/${txSignature}?cluster=devnet` : undefined,
                actionLabel: 'View on Solscan'
            });

            // Store success info for inline bubble display
            setTradeSuccessInfo({
                shares: sim.sharesReceived,
                side: selectedSide,
                txSignature: txSignature || ''
            });

            // Show purchase bubble notification
            const bubbleId = Date.now();
            setPurchaseBubbles(prev => [...prev, { id: bubbleId, side: selectedSide, amount: sim.sharesReceived }]);
            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                setPurchaseBubbles(prev => prev.filter(b => b.id !== bubbleId));
            }, 3000);

            setIsSuccess(true);
            setBetAmount('');

            // Reload user position from contract
            if (marketAccount?.market_pda && publicKey) {
                try {
                    const marketPda = new PublicKey(marketAccount.market_pda);
                    const PROGRAM_ID = new PublicKey('HkjMQFag41pUutseBpXSXUuEwSKuc2CByRJjyiwAvGjL');

                    // Read BOTH UserPositions (YES and NO) after any trade
                    for (const outcomeIndex of [0, 1]) {
                        const [userPositionPda] = PublicKey.findProgramAddressSync(
                            [Buffer.from("user_pos"), marketPda.toBuffer(), publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                            PROGRAM_ID
                        );

                        const posAcct = await connection.getAccountInfo(userPositionPda);
                        if (posAcct?.data && posAcct.data.length >= 57) {
                            // Parse shares from UserPosition: offset 41-49 (u128) - matching hook
                            const lo = posAcct.data.readBigUInt64LE(41);
                            const hi = posAcct.data.readBigUInt64LE(49);
                            const shares128 = (BigInt(hi) << 64n) | BigInt(lo);
                            const normalized = Number(shares128) / 1e9;

                            updateMyShares(outcomeIndex, normalized);
                            console.log(`✅ Refreshed shares for index ${outcomeIndex} from contract:`, normalized);
                        } else {
                            // No position exists for this index - set to 0
                            updateMyShares(outcomeIndex, 0);
                        }
                    }

                    // Read market account to get real supplies and calculate actual price
                    // Refactored to use Anchor Fetch for safety against variable-length data
                    try {
                        // @ts-ignore
                        const decodedMarket = await program.account.market.fetch(marketPda);

                        const yesSupply = Number(decodedMarket.outcomeSupplies[0]) / 1e9;
                        const noSupply = Number(decodedMarket.outcomeSupplies[1]) / 1e9;

                        console.log(`✅ Real supplies from contract - YES: ${yesSupply}, NO: ${noSupply}`);

                        // Calculate actual price from supplies
                        const totalSupply = yesSupply + noSupply;
                        if (totalSupply > 0) {
                            const actualPrice = (yesSupply / totalSupply) * 100;
                            setLivePrice(actualPrice);
                            // Also update chart with new data point
                            setChartData(prev => {
                                const newData = [...prev, { date: Date.now(), value: actualPrice }];
                                if (newData.length > 50) newData.shift();
                                return newData;
                            });
                            console.log(`✅ Refreshed price from contract:`, actualPrice);
                        }

                        // Refresh vault balance for Prize Pool
                        const vBalance = Number(decodedMarket.vaultBalance) / LAMPORTS_PER_SOL;
                        setVaultBalanceSol(vBalance);
                        console.log(`💰 Refreshed vault after buy:`, vBalance, "SOL");

                    } catch (err) {
                        console.error("Failed to fetch market via Anchor:", err);
                    }
                } catch (e) {
                    console.warn("Failed to refresh from contract:", e);
                }
            }

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
            // const currentPrice = selectedSide === 'YES' ? livePrice : (100 - livePrice);
            // const priceRatio = currentPrice / 100;
            // FIX: Use actual AMM spot price for value estimation, NOT probability.
            // Probability (livePrice) is high (e.g. 50%), but Curve Price is low (e.g. 0.000005).
            const spotPrice = getSpotPrice(estimatedSupply);
            const safePrice = spotPrice > 0 ? spotPrice : 0.0000001;

            console.log("💰 SELL LOGIC DEBUG:");
            console.log("- estimatedSupply (Normalized):", estimatedSupply);
            console.log("- Spot Price:", spotPrice);
            console.log("- Safe Price:", safePrice);

            const sharesToSell = amountVal / safePrice; // Convert SOL input to Shares using REAL price
            console.log("- Shares to Sell:", sharesToSell);

            const availableShares = isMultiOutcome
                ? (myShares[marketOutcomes.findIndex(o => o.id === selectedOutcomeId)] || 0)
                : (selectedSide === 'YES' ? (myShares[0] || 0) : (myShares[1] || 0));

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
                const estimatedSolReturn = finalSharesToSell * safePrice; // Use safePrice (Spot Price)
                const feeParam = 0.01; // 1%
                const feeAmount = estimatedSolReturn * feeParam;
                const netSolReturn = estimatedSolReturn - feeAmount;

                console.log("🧮 CALCULATION DEBUG:");
                console.log("- Final Shares:", finalSharesToSell);
                console.log("- Estimated SOL Return:", estimatedSolReturn);
                console.log("- Net SOL Return:", netSolReturn);

                if (isRealMarket) {
                    try {
                        console.log("🔗 Executing On-Chain Sell...");
                        console.log("🔗 SELL CALL - marketAccount.market_pda:", marketAccount.market_pda);
                        console.log("🔗 SELL CALL - Compare with PAGE.TSX marketInfo.market_pda above");

                        // Debugging Creator
                        // Assuming TREASURY_WALLET is defined elsewhere, e.g., in constants.ts
                        // For now, using a placeholder if not defined in this scope.
                        const TREASURY_WALLET = new PublicKey('Djinn4Xg2s9SPjE8g2d2222222222222222222222'); // Placeholder, replace with actual if needed
                        const creatorKey = marketAccount.creator ? new PublicKey(marketAccount.creator) : TREASURY_WALLET;
                        console.log("🔗 SELL CALL - Creator Key passed:", creatorKey.toBase58());
                        console.log("🔗 SELL CALL - Is Treasury?", creatorKey.equals(TREASURY_WALLET));

                        // Calculate slippage protection for sell (user-configured tolerance)
                        const slippageMultiplier = 1 - (slippageTolerance / 100);
                        const minSolOut = Math.floor((netSolReturn * slippageMultiplier) * LAMPORTS_PER_SOL);

                        const outcomeIndex = isMultiOutcome
                            ? marketOutcomes.findIndex(o => o.id === selectedOutcomeId)
                            : (selectedSide === 'YES' ? 0 : 1);

                        if (outcomeIndex === -1) throw new Error("Invalid outcome for sell");

                        // Safe PublicKey Construction for Mints
                        const safeYesMint = typeof marketAccount.yes_token_mint === 'string' && marketAccount.yes_token_mint.length > 30
                            ? new PublicKey(marketAccount.yes_token_mint)
                            : new PublicKey("So11111111111111111111111111111111111111112");

                        const safeNoMint = typeof marketAccount.no_token_mint === 'string' && marketAccount.no_token_mint.length > 30
                            ? new PublicKey(marketAccount.no_token_mint)
                            : new PublicKey("So11111111111111111111111111111111111111112");

                        console.log("🔑 Key Debug:", {
                            yes: safeYesMint.toBase58(),
                            no: safeNoMint.toBase58(),
                            creator: creatorKey.toBase58()
                        });

                        // Safe Market PDA
                        if (!marketAccount.market_pda || marketAccount.market_pda.length < 30) {
                            throw new Error("Invalid Market PDA: " + marketAccount.market_pda);
                        }
                        const safeMarketPda = new PublicKey(marketAccount.market_pda);

                        const tx = await sellShares(
                            safeMarketPda,
                            outcomeIndex,
                            finalSharesToSell,
                            safeYesMint,
                            safeNoMint,
                            creatorKey,
                            minSolOut,
                            isMaxSell
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
                // Impact Logic: Selling X amount moves price DOWN.
                const currentPrice = selectedSide === 'YES' ? livePrice : (100 - livePrice); // Re-define for scope

                // Use ACTUAL value received for USD calculation
                const usdValue = estimatedSolReturn * solPrice;

                const sim = simulateBuy(estimatedSolReturn, {
                    virtualSolReserves: 0,
                    virtualShareReserves: 0,
                    realSolReserves: 0,
                    totalSharesMinted: estimatedSupply // Use correct supply
                });

                // For Sell, we INVERT the impact.
                // For Sell, we need to calculate the NEW probability from the NEW spot price.
                // sim.endPrice is the predicted price after sell.
                const otherSideSupply = selectedSide === 'YES' ? noSupply : yesSupply; // Grab from scope or refetch
                const rawOtherSidePrice = getSpotPrice(otherSideSupply);

                // STABILIZER: Same floor for Sell logic to keep it symmetric
                const otherSidePrice = Math.max(rawOtherSidePrice, 0.0001);

                const newLikelihood = (sim.endPrice / (sim.endPrice + otherSidePrice)) * 100;
                const currentLikelihood = selectedSide === 'YES' ? livePrice : (100 - livePrice);

                // The delta to apply to the main chart price (which is ALWAYS YES Probability)
                let probDelta = 0;

                if (selectedSide === 'YES') {
                    // We sold YES. Prob should go DOWN.
                    // newLikelihood should be < currentLikelihood.
                    probDelta = newLikelihood - currentLikelihood; // Negative
                } else {
                    // We sold NO. NO Prob goes DOWN. YES Prob goes UP.
                    // newLikelihood is NO Prob. 
                    // Main Chart is YES Prob.
                    // New YES Prob = 100 - newLikelihood.
                    // Old YES Prob = livePrice.
                    probDelta = (100 - newLikelihood) - livePrice; // Positive
                }

                // Safety Cap: Don't let huge jumps happen if calculation is weird
                if (Math.abs(probDelta) > 20) probDelta = probDelta > 0 ? 20 : -20;

                // 2. Update Price
                const newPrice = updateExectutionPrices(effectiveSlug, probDelta);
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
                const outcomeIndex = isMultiOutcome
                    ? marketOutcomes.findIndex(o => o.id === selectedOutcomeId)
                    : (selectedSide === 'YES' ? 0 : 1);
                if (outcomeIndex !== -1) {
                    updateMyShares(outcomeIndex, Math.max(0, (myShares[outcomeIndex] || 0) - finalSharesToSell));
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

                // Refresh shares and price from contract
                if (marketAccount?.market_pda && publicKey) {
                    try {
                        const marketPda = new PublicKey(marketAccount.market_pda);
                        const PROGRAM_ID = new PublicKey('HkjMQFag41pUutseBpXSXUuEwSKuc2CByRJjyiwAvGjL');

                        await loadMarketData();
                    } catch (e) {
                        console.warn("Failed to refresh after sell:", e);
                    }
                }

                // Trigger Refreshes
                window.dispatchEvent(new Event('bet-updated'));
                setTimeout(() => {
                    supabaseDb.getTopHolders(effectiveSlug).then(setHolders);
                }, 1000);

            } catch (error: any) {
                console.error("Trade Error:", error);
                setDjinnToast({
                    isVisible: true,
                    type: 'ERROR',
                    title: 'Transaction Failed',
                    message: error.message || 'Unknown error occurred'
                });
            } finally {
                setIsPending(false);
                setTimeout(() => setIsSuccess(false), 3000);
            }
        }
    };


    return (
        <div className="min-h-screen bg-[#020202] text-white font-sans pb-32">
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
                                        <img
                                            src={marketAccount?.banner_url || staticMarketInfo.icon}
                                            className="w-full h-full object-cover"
                                            alt="Market banner"
                                            onError={(e) => {
                                                console.error('Banner image failed to load:', marketAccount?.banner_url);
                                                e.currentTarget.style.display = 'none';
                                                if (e.currentTarget.parentElement) {
                                                    e.currentTarget.parentElement.innerHTML = staticMarketInfo.icon || '🎯';
                                                }
                                            }}
                                        />
                                        : staticMarketInfo.icon}
                                </div>
                                <div className="pb-2 flex-1">
                                    <h1 className="text-4xl font-black tracking-tight leading-none text-white mb-2">{marketAccount?.title || staticMarketInfo.title}</h1>
                                    <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed mb-3">{marketAccount?.description || staticMarketInfo.description}</p>

                                    <div className="flex items-center gap-4 flex-wrap">
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

                                        {/* STAR/SAVE Button */}
                                        <button
                                            onClick={() => {
                                                const newStarred = !isStarred;
                                                setIsStarred(newStarred);
                                                // Save to localStorage
                                                const saved = JSON.parse(localStorage.getItem('djinn_saved_markets') || '[]');
                                                if (newStarred) {
                                                    if (!saved.includes(effectiveSlug)) {
                                                        saved.push(effectiveSlug);
                                                    }
                                                } else {
                                                    const idx = saved.indexOf(effectiveSlug);
                                                    if (idx > -1) saved.splice(idx, 1);
                                                }
                                                localStorage.setItem('djinn_saved_markets', JSON.stringify(saved));
                                                setDjinnToast({
                                                    isVisible: true,
                                                    type: 'SUCCESS',
                                                    title: newStarred ? 'Saved!' : 'Removed',
                                                    message: newStarred ? 'Market saved to your watchlist' : 'Market removed from watchlist'
                                                });
                                            }}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-bold uppercase tracking-widest group ${isStarred
                                                ? 'bg-[#F492B7]/20 border-[#F492B7]/40 text-[#F492B7]'
                                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            <Star
                                                size={12}
                                                className={`transition-all ${isStarred ? 'fill-[#F492B7] text-[#F492B7]' : 'group-hover:text-[#F492B7]'}`}
                                            />
                                            <span>{isStarred ? 'Saved!' : 'Save'}</span>
                                        </button>

                                        {/* SOURCE Link (Moved here) */}
                                        {marketAccount?.resolution_source && (
                                            <a href={marketAccount.resolution_source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white group">
                                                <span>Source</span> <ExternalLink size={12} />
                                            </a>
                                        )}

                                        {/* CREATOR PROFILE */}
                                        {marketAccount?.creator_wallet && (
                                            <Link
                                                href={`/profile/${marketAccount.creator_wallet}`}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-medium text-gray-400 hover:text-white group"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#F492B7] to-[#10B981] flex items-center justify-center overflow-hidden">
                                                    {marketAccount.creator_avatar ? (
                                                        <img src={marketAccount.creator_avatar} alt="Creator" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[8px] font-bold text-white">
                                                            {marketAccount.creator_username?.charAt(0)?.toUpperCase() || marketAccount.creator_wallet.slice(0, 2)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="truncate max-w-[100px]">
                                                    {marketAccount.creator_username || `${marketAccount.creator_wallet.slice(0, 4)}...${marketAccount.creator_wallet.slice(-4)}`}
                                                </span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Metrics (YES/NO Percentages based on Mcap) */}
                            <div className="flex flex-col items-center justify-end h-44 py-1 flex-1">
                                {/* Mcap with Percentages */}
                                <div className="flex items-center justify-center gap-6 bg-[#0E0E0E] px-6 py-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md w-full">
                                    <div className="flex flex-col items-center flex-1">
                                        <span className="text-3xl font-black text-[#10B981] mb-1">
                                            {mounted ? yesPercent.toFixed(0) : '50'}%
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wide mb-1">
                                            {(marketAccount?.options && marketAccount.options[0]) || 'YES'} Mcap
                                        </span>
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl font-extrabold text-white tracking-tight">
                                                {formatCompact(yesMcap)} SOL
                                            </span>
                                            <span className="text-[11px] font-bold text-gray-400">
                                                ${mounted ? formatCompact(yesMcap * (solPrice || 200)) : '0'} USD
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center px-4 border-l border-r border-white/10">
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Pool</span>
                                        <span className="text-xl font-black text-[#F492B7] drop-shadow-[0_0_8px_rgba(244,146,183,0.3)]">
                                            {formatCompact(vaultBalanceSol)} SOL
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase">Liquidity</span>
                                    </div>

                                    <div className="flex flex-col items-center flex-1">
                                        <span className="text-3xl font-black text-[#EF4444] mb-1">
                                            {mounted ? noPercent.toFixed(0) : '50'}%
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wide mb-1">
                                            {(marketAccount?.options && marketAccount.options[1]) || 'NO'} Mcap
                                        </span>
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl font-extrabold text-white tracking-tight">
                                                {formatCompact(noMcap)} SOL
                                            </span>
                                            <span className="text-[11px] font-bold text-gray-400">
                                                ${mounted ? formatCompact(noMcap * (solPrice || 200)) : '0'} USD
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CHART CARD */}
                        <div className="bg-[#020202] rounded-2xl border border-white/5 overflow-hidden">


                            {/* Dual-line Chart (Bazaar of Answers Style) */}
                            <DjinnChart
                                data={chartData.map(d => ({
                                    time: d.date,
                                    yes: d.value / 100,  // Convert 0-100 to 0-1
                                    no: (100 - d.value) / 100
                                }))}
                                volume={`$${formatCompact((marketAccount?.total_yes_pool || 0) + (marketAccount?.total_no_pool || 0))}`}
                                settlementDate={marketAccount?.end_date ? new Date(marketAccount.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
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
                                            holders.filter(h => h.yesShares > 0.001).sort((a, b) => b.yesShares - a.yesShares).map((h: any, i: number) => {
                                                const isMe = publicKey && h.wallet_address === publicKey.toBase58();
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`flex items-center justify-between py-3 border-b border-white/5 group hover:bg-white/5 hover:px-2 rounded transition-all -mx-2 px-2 cursor-pointer ${isMe ? 'bg-white/5 border-l-2 border-l-[#10B981]' : ''}`}
                                                        onClick={() => window.location.href = `/profile/${h.wallet_address}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] overflow-hidden border border-white/10">
                                                                    {h.avatar ? <img src={h.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-[#10B981] to-[#059669] opacity-80" />}
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
                                                                    {h.name} {isMe && <span className="text-[9px] bg-[#10B981]/20 text-[#10B981] px-1 rounded ml-1">YOU</span>}
                                                                </div>
                                                                <div className="text-xs font-medium text-[#10B981] font-mono flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                                                                    {formatCompact(h.yesShares)} <span className="text-[10px] text-gray-500">YES</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
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
                                            holders.filter(h => h.noShares > 0.001).sort((a, b) => b.noShares - a.noShares).map((h: any, i: number) => {
                                                const isMe = publicKey && h.wallet_address === publicKey.toBase58();
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`flex items-center justify-between py-3 border-b border-white/5 group hover:bg-white/5 hover:px-2 rounded transition-all -mx-2 px-2 cursor-pointer ${isMe ? 'bg-white/5 border-l-2 border-l-[#EF4444]' : ''}`}
                                                        onClick={() => window.location.href = `/profile/${h.wallet_address}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] overflow-hidden border border-white/10">
                                                                    {h.avatar ? <img src={h.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-[#EF4444] to-[#B91C1C] opacity-80" />}
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
                                                                    {h.name} {isMe && <span className="text-[9px] bg-[#EF4444]/20 text-[#EF4444] px-1 rounded ml-1">YOU</span>}
                                                                </div>
                                                                <div className="text-xs font-medium text-[#EF4444] font-mono flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                                                                    {formatCompact(h.noShares)} <span className="text-[10px] text-gray-500">NO</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>



                    {/* RIGHT COLUMN: TRADING (Sticky Sidebar) */}
                    <div className="md:col-span-4 sticky top-24 h-fit z-20">
                        <div className="bg-[#020202] border border-white/5 rounded-2xl p-5 shadow-xl">
                            <div className="flex justify-end mb-6 items-center">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-[#F492B7] bg-[#F492B7]/10 px-4 py-1.5 rounded-full border border-[#F492B7]/20">
                                        <Wallet size={12} /> <span>{solBalance.toFixed(2)} SOL</span>
                                    </div>
                                </div>
                            </div>

                            {/* SQUID GAME UI: Total Pool Counter */}
                            <div className="mb-6">
                                <PrizePoolCounter totalSol={vaultBalanceSol || (marketAccount?.global_vault ? (Number(marketAccount.global_vault) / LAMPORTS_PER_SOL) : 0)} />
                            </div>

                            {/* BUY / SELL TOGGLE */}
                            <div className="mb-5 p-1 bg-white/5 rounded-xl flex">
                                <button
                                    onClick={() => setTradeMode('BUY')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tradeMode === 'BUY' ? 'bg-[#10B981] text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => setTradeMode('SELL')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tradeMode === 'SELL' ? 'bg-[#EF4444] text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Sell
                                </button>
                            </div>



                            {/* INPUT Section */}
                            <div className="bg-[#0A0A0A] rounded-xl border border-white/5 p-4 mb-4">
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
                                {/* Percentage Buttons (SELL MODE ONLY) */}
                                {tradeMode === 'SELL' && (
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                        {[25, 50, 75, 100].map((pct) => (
                                            <button
                                                key={pct}
                                                onClick={() => {
                                                    const sharesOwned = isMultiOutcome
                                                        ? (myShares[marketOutcomes.findIndex(o => o.id === selectedOutcomeId)] || 0)
                                                        : (selectedSide === 'YES' ? (myShares[0] || 0) : (myShares[1] || 0));
                                                    if (sharesOwned <= 0) return;

                                                    if (pct === 100) {
                                                        setIsMaxSell(true);
                                                    } else {
                                                        setIsMaxSell(false);
                                                    }

                                                    const cPrice = selectedSide === 'YES' ? (livePrice ?? 50) : (100 - (livePrice ?? 50));
                                                    const sharesToSell = sharesOwned * (pct / 100);
                                                    let estimatedValue = sharesToSell * (cPrice / 100);
                                                    const maxPayout = Math.max(0, vaultBalanceSol * 0.95);
                                                    estimatedValue = Math.min(estimatedValue, maxPayout);
                                                    setBetAmount(estimatedValue.toFixed(4));
                                                }}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors border ${(pct === 100 && isMaxSell)
                                                    ? 'bg-white/20 text-white border-white/20'
                                                    : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>
                                )}
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
                                                <span className="block text-gray-500 font-semibold uppercase text-[10px] tracking-[0.2em] mb-2">Shares to Sell</span>
                                                <span className="text-4xl font-extralight text-white leading-none tracking-tight">
                                                    {(() => {
                                                        const sharesOwned = isMultiOutcome
                                                            ? (myShares[marketOutcomes.findIndex(o => o.id === selectedOutcomeId)] || 0)
                                                            : (selectedSide === 'YES' ? (myShares[0] || 0) : (myShares[1] || 0));
                                                        const price = currentPriceForSide / 100;

                                                        console.log("🐞 SELL DISPLAY DEBUG:");
                                                        console.log("- betAmount:", betAmount);
                                                        console.log("- price (0-1):", price);
                                                        console.log("- sharesOwned:", sharesOwned);

                                                        if (isMaxSell) return formatCompact(sharesOwned);
                                                        if (!betAmount || price <= 0) return '0';

                                                        const shares = parseFloat(betAmount) / price;
                                                        const capped = Math.min(shares, sharesOwned);
                                                        return formatCompact(capped);
                                                    })()}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-gray-500 font-semibold uppercase text-[10px] tracking-[0.2em] mb-2">You Get</span>
                                                <span className="text-xl font-bold text-[#10B981] font-mono">
                                                    ◎{(() => {
                                                        // SELL LOGIC DISPLAY
                                                        // Use same safe logic as handleTrade
                                                        const spotPrice = getSpotPrice(estimatedSupply);
                                                        const safePrice = spotPrice > 0 ? spotPrice : 0.0000001;
                                                        // If Max Sell, use sharesOwned directly
                                                        // If input amount is SOL, we reverse it? 
                                                        // Wait, the input is SOL value user wants to extract?
                                                        // OR is the input always SOL? 
                                                        // "You Receive (Est)" -> 0.9405 SOL.
                                                        // So betAmount IS SOL.
                                                        // So "You Get" should be betAmount - fee?

                                                        return (parseFloat(betAmount || '0') * 0.99).toFixed(4);
                                                    })()} SOL
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
                                                href={`https://solscan.io/tx/${tradeSuccessInfo.txSignature}`}
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

                            {/* Terms of Use Link */}
                            <div className="mt-4 text-center">
                                <p className="text-[10px] text-gray-500">
                                    By trading, you agree to the{' '}
                                    <Link href="/legal" className="text-[#F492B7] hover:underline hover:text-white transition-colors">
                                        Terms of Use
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PURCHASE BUBBLES - Fixed position notifications */}
            <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
                {purchaseBubbles.map((bubble) => (
                    <div
                        key={bubble.id}
                        className="animate-in slide-in-from-right-5 fade-in duration-300 pointer-events-auto"
                    >
                        <div className={`px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 ${bubble.side === 'YES'
                            ? 'bg-[#10B981] text-white shadow-[#10B981]/30'
                            : 'bg-[#F492B7] text-white shadow-[#F492B7]/30'
                            }`}
                        >
                            <span className="text-lg">+</span>
                            <span>{bubble.side}</span>
                            <span className="font-mono">{formatCompact(bubble.amount)}</span>
                        </div>
                    </div>
                ))}
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