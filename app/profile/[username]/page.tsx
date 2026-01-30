'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

// --- SOLANA IMPORTS PARA SALDO REAL ---
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import { Loader2 } from 'lucide-react';
import { AreaClosed, LinePath } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { ParentSize } from '@visx/responsive';


import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import * as supabaseDb from '@/lib/supabase-db';
import { supabase } from '@/lib/supabase';
import { PROGRAM_ID } from '@/lib/program-config';
import ProfitHistoryChart from '@/components/ProfitHistoryChart';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import ImageCropper from '@/components/ImageCropper';

// Helper format function
function formatCompact(num: number) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();

    // SOLANA HOOKS
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [betTab, setBetTab] = useState<'active' | 'closed'>('active');
    const [isLoading, setIsLoading] = useState(true);
    const [unclaimedPayouts, setUnclaimedPayouts] = useState<supabaseDb.Bet[]>([]);

    // CROPPER STATE
    const [croppingFile, setCroppingFile] = useState<string | null>(null);
    const [cropTarget, setCropTarget] = useState<'pfp' | null>(null);

    const initialProfile = {
        username: "...",
        pfp: "/pink-pfp.png",
        bio: "Djinn Trader",
        gems: 0,
        profit: 0,
        portfolio: 0,
        winRate: 0,
        biggestWin: 0,
        medals: [] as string[],
        activeBets: [] as any[],
        closedBets: [] as any[],
        achievements: [] as any[],
        createdMarkets: [] as any[],
        showGems: true
    };

    const [profile, setProfile] = useState(initialProfile);

    const [tempName, setTempName] = useState(profile.username);
    const [tempBio, setTempBio] = useState(profile.bio);
    const [tempShowGems, setTempShowGems] = useState(true); // New temp state
    const [tempPfp, setTempPfp] = useState('');

    // Availability Check State
    const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
    const [isCheckingName, setIsCheckingName] = useState(false);
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pfpInputRef = useRef<HTMLInputElement>(null);

    // Sync temp state when modal opens or profile changes
    useEffect(() => {
        if (isEditModalOpen) {
            setTempName(profile.username);
            setTempBio(profile.bio);
            setTempShowGems(profile.showGems !== undefined ? profile.showGems : true);
            setTempPfp(profile.pfp);
            setNameAvailable(true); // Default to true for current name
        }
    }, [isEditModalOpen, profile]);

    // Real-time Availability Check
    useEffect(() => {
        if (!isEditModalOpen) return;

        // Reset if name hasn't changed from original or is too short
        if (tempName === profile.username) {
            setNameAvailable(true);
            return;
        }
        if (tempName.length < 3) {
            setNameAvailable(null);
            return;
        }

        setIsCheckingName(true);
        if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

        checkTimeoutRef.current = setTimeout(async () => {
            if (!publicKey) return;
            const available = await supabaseDb.isUsernameAvailable(tempName, publicKey.toBase58());
            setNameAvailable(available);
            setIsCheckingName(false);
        }, 500);

        return () => {
            if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
        };
    }, [tempName, isEditModalOpen, profile.username, publicKey]);


    // --- 1. OBTENER SALDO REAL DE SOLANA (ONLY USER CLAIMS) ---
    useEffect(() => {
        if (!connection || !publicKey) return;

        // Only update portfolio here if we know for sure we are viewing OURSELVES and structure isn't ready
        // Actually, let loadProfile handle portfolio.
        // We strictly use this for "Private" data like unclaimed payouts which only I can see.

        // Load unclaimed payouts
        supabaseDb.getUnclaimedPayouts(publicKey.toBase58()).then(payouts => {
            setUnclaimedPayouts(payouts);
        });
    }, [connection, publicKey]);

    // El slug del perfil
    const profileSlug = params.username as string;
    const isDefaultProfile = profileSlug === 'default';
    const [isMyProfile, setIsMyProfile] = useState(false);
    const [targetWalletAddress, setTargetWalletAddress] = useState<string | null>(null);
    const [viewCount, setViewCount] = useState<number>(0); // Real-time views

    const [activeTab, setActiveTab] = useState<'positions' | 'activity' | 'markets'>('positions');
    const [marketsWithFees, setMarketsWithFees] = useState<any[]>([]); // For CreatorRewardsCard optimization if needed

    // FOLLOW STATE
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowingUser, setIsFollowingUser] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    // ... rest of existing state

    // 2. CARGA DE PERFIL ROBUSTA (Separation of Concern: Viewer vs Subject)
    useEffect(() => {
        if (isDefaultProfile) {
            setProfile({
                username: "New User",
                bio: "This user hasn't customized their profile yet.",
                pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
                gems: 0, profit: 0, portfolio: 0, winRate: 0, biggestWin: 0, medals: [],
                achievements: [],
                activeBets: [], closedBets: [], createdMarkets: [], showGems: true
            });
            setIsMyProfile(false);
            setIsLoading(false);
            return;
        }

        const loadProfile = async () => {
            setIsLoading(true);
            let targetAddress: string | null = null;
            let isMeCheck = false;

            try {
                // A. RESOLVE IDENTITY
                const myWallet = publicKey?.toBase58();
                const GOD_WALLET = 'C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X';

                // 1. Check if slug matches my wallet or special "me"
                if (myWallet && (profileSlug.toLowerCase() === 'me' || profileSlug === myWallet)) {
                    targetAddress = myWallet;
                    isMeCheck = true;
                }
                // 2. Check if slug is a valid Solana Address
                else {
                    try {
                        const pubKey = new PublicKey(profileSlug);
                        if (PublicKey.isOnCurve(pubKey.toBuffer())) {
                            targetAddress = profileSlug;
                        }
                    } catch (e) {
                        // Not a public key, treat as username
                    }
                }

                // 3. Fallback to Username Lookup
                if (!targetAddress) {
                    const profileByUsername = await supabaseDb.getProfileByUsername(profileSlug);
                    if (profileByUsername) {
                        targetAddress = profileByUsername.wallet_address;
                    }
                }

                // B. GHOST PROFILE / NO ADDRESS RESOLVED
                if (!targetAddress) {
                    const isLordSlug = profileSlug.toLowerCase() === 'lord';
                    let ghost = {
                        ...initialProfile,
                        username: isLordSlug ? "Lord" : (profileSlug.length > 10 ? `${profileSlug.slice(0, 4)}...${profileSlug.slice(-4)}` : profileSlug),
                        bio: isLordSlug ? "The Master of Djinns" : "New Djinn Trader",
                        pfp: "/pink-pfp.png",
                        showGems: true
                    };

                    if (isLordSlug) {
                        ghost.medals = ['GENESIS', 'ORACLE', 'DIAMOND_HANDS', 'PINK_CRYSTAL', 'EMERALD_SAGE', 'MOON_DANCER', 'MARKET_SNIPER', 'APEX_PREDATOR', 'GOLD_TROPHY', 'LEGENDARY_TRADER'];
                        ghost.gems = 99999;
                        ghost.profit = 1250000;
                        ghost.achievements = [
                            { code: 'FIRST_MARKET', name: 'Genesis Creator', image_url: '/genesis-medal-v2.png', xp: 100 },
                            { code: 'ORACLE', name: 'Grand Oracle', image_url: '/orange-crystal-v2.png', xp: 250 },
                            { code: 'DIAMOND_HANDS', name: 'Diamond Hands', image_url: '/diamond-crystal.png', xp: 1000 },
                            { code: 'PINK_CRYSTAL', name: 'Mystic Rose', image_url: '/pink-crystal.png', xp: 2000 },
                            { code: 'EMERALD_SAGE', name: 'Emerald Sage', image_url: '/green-crystal.png', xp: 2500 },
                            { code: 'MOON_DANCER', name: 'Moon Dancer', image_url: '/moon-crystal.png', xp: 3000 },
                            { code: 'MARKET_SNIPER', name: 'Market Sniper', image_url: '/emerald-sniper.png', xp: 5000 },
                            { code: 'APEX_PREDATOR', name: 'Apex Predator', image_url: '/apex-skull.png', xp: 10000 },
                            { code: 'THE_CHAMPION', name: 'The Champion', image_url: '/gold-trophy.png', xp: 50000 },
                            { code: 'LEGENDARY_TRADER', name: 'Legendary Trader', image_url: '/gems-trophy.png', xp: 100000 }
                        ];
                    }

                    setProfile(ghost);
                    setIsLoading(false);
                    return;
                }

                // C. FINAL TARGET RESOLVED
                setTargetWalletAddress(targetAddress);
                isMeCheck = (!!myWallet && myWallet === targetAddress);
                setIsMyProfile(isMeCheck);

                // D. LOAD ACTUAL DATA (Memory Source of Truth)
                let finalProfile = {
                    ...initialProfile,
                    username: `${targetAddress.slice(0, 4)}...${targetAddress.slice(-4)}`,
                    pfp: "/pink-pfp.png",
                    bio: "New Djinn Trader"
                };

                // 1. Database - Source of Truth for everyone
                const dbProfile = await supabaseDb.getProfile(targetAddress);
                if (dbProfile) {
                    finalProfile.username = dbProfile.username || finalProfile.username;
                    finalProfile.bio = dbProfile.bio || finalProfile.bio;
                    // IF DB has a URL, we use it. If not, we keep the default.
                    if (dbProfile.avatar_url) finalProfile.pfp = dbProfile.avatar_url;
                }

                // 2. Local Storage Override (ONLY for ME)
                if (isMeCheck) {
                    const local = localStorage.getItem(`djinn_profile_${targetAddress}`);
                    if (local) {
                        try {
                            const p = JSON.parse(local);
                            if (p.username) finalProfile.username = p.username;
                            // ONLY override if the local value is a real string, not null/empty
                            if (p.pfp && typeof p.pfp === 'string') finalProfile.pfp = p.pfp;
                            if (p.avatar_url && typeof p.avatar_url === 'string') finalProfile.pfp = p.avatar_url;
                        } catch (e) { }
                    }
                }

                // 3. Special "Architect" Injection (Absolute Memory)
                // Lock legendary medals to the specific GOD_WALLET only
                // User can still customize Name/Bio/PFP
                const isLordWallet = targetAddress === GOD_WALLET || targetAddress === 'C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X';

                if (isLordWallet) {

                    finalProfile.medals = ['GENESIS', 'ORACLE', 'DIAMOND_HANDS', 'PINK_CRYSTAL', 'EMERALD_SAGE', 'MOON_DANCER', 'MARKET_SNIPER', 'APEX_PREDATOR', 'GOLD_TROPHY', 'LEGENDARY_TRADER'];
                    finalProfile.gems = 99999;
                    finalProfile.profit = 1250000;
                    setViewCount(99999);
                    finalProfile.achievements = [
                        { code: 'FIRST_MARKET', name: 'Genesis Creator', image_url: '/genesis-medal-v2.png', xp: 100 },
                        { code: 'ORACLE', name: 'Grand Oracle', image_url: '/orange-crystal-v2.png', xp: 250 },
                        { code: 'DIAMOND_HANDS', name: 'Diamond Hands', image_url: '/diamond-crystal.png', xp: 1000 },
                        { code: 'PINK_CRYSTAL', name: 'Mystic Rose', image_url: '/pink-crystal.png', xp: 2000 },
                        { code: 'EMERALD_SAGE', name: 'Emerald Sage', image_url: '/green-crystal.png', xp: 2500 },
                        { code: 'MOON_DANCER', name: 'Moon Dancer', image_url: '/moon-crystal.png', xp: 3000 },
                        { code: 'MARKET_SNIPER', name: 'Market Sniper', image_url: '/emerald-sniper.png', xp: 5000 },
                        { code: 'APEX_PREDATOR', name: 'Apex Predator', image_url: '/apex-skull.png', xp: 10000 },
                        { code: 'THE_CHAMPION', name: 'The Champion', image_url: '/gold-trophy.png', xp: 50000 },
                        { code: 'LEGENDARY_TRADER', name: 'Legendary Trader', image_url: '/gems-trophy.png', xp: 100000 }
                    ];
                } else {
                    // Regular users medals
                    const ach = await supabaseDb.getUserAchievements(targetAddress);
                    finalProfile.achievements = ach;
                    finalProfile.medals = ach.map(a => a.code);
                }

                // 4. On-chain Balance
                try {
                    const bal = await connection.getBalance(new PublicKey(targetAddress));
                    finalProfile.portfolio = bal / LAMPORTS_PER_SOL;
                } catch (e) { }

                // 5. Load Active Bets for everyone
                loadActiveBets(targetAddress);

                setProfile(finalProfile);

            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [isDefaultProfile, publicKey, profileSlug, connection]);

    // 2.2. LOAD FOLLOW DATA
    useEffect(() => {
        if (!targetWalletAddress) return;

        const loadFollowData = async () => {
            const counts = await supabaseDb.getFollowCounts(targetWalletAddress);
            setFollowersCount(counts.followers);
            setFollowingCount(counts.following);

            if (publicKey && publicKey.toBase58() !== targetWalletAddress) {
                const following = await supabaseDb.isFollowing(publicKey.toBase58(), targetWalletAddress);
                setIsFollowingUser(following);
            }
        };

        loadFollowData();
    }, [targetWalletAddress, publicKey]);

    // 4. LOAD CREATED MARKETS (Explicit Fetch)
    useEffect(() => {
        const fetchCreatedMarkets = async () => {
            // Determine whose profile we are viewing
            let targetWallet = null;
            if (isMyProfile && publicKey) targetWallet = publicKey.toBase58();
            else if (targetWalletAddress) targetWallet = targetWalletAddress;

            if (!targetWallet) return;

            try {
                // 1. Fetch from Supabase
                const { data: sbMarkets } = await supabase
                    .from('markets')
                    .select('*')
                    .eq('creator_wallet', targetWallet);

                let finalCreated = sbMarkets || [];

                // 2. Merge with Local Storage if it's MY profile
                if (isMyProfile) {
                    const localStr = localStorage.getItem('djinn_created_markets');
                    if (localStr) {
                        try {
                            const localMarkets = JSON.parse(localStr);
                            // Dedupe
                            const existingIds = new Set(finalCreated.map((m: any) => m.slug));
                            const uniqueLocal = localMarkets.filter((m: any) => !existingIds.has(m.slug));
                            finalCreated = [...uniqueLocal, ...finalCreated];
                        } catch (e) { console.error(e) }
                    }
                }

                // Format for UI
                const uiMarkets = finalCreated.map((m: any) => ({
                    id: m.id,
                    slug: m.slug,
                    title: m.title,
                    icon: m.banner_url || m.icon || '🔮',
                    volume: m.volume || '$0', // TODO: Calculate real volume
                    type: 'binary',
                    createdAt: m.created_at || m.createdAt
                }));

                setProfile(prev => ({ ...prev, createdMarkets: uiMarkets }));

            } catch (error) {
                console.error("Error loading created markets", error);
            }
        };

        fetchCreatedMarkets();
    }, [isMyProfile, publicKey, targetWalletAddress]);



    // 5. REAL-TIME VIEWS LOGIC
    useEffect(() => {
        if (!targetWalletAddress) return;

        // A. Increment View (Once per mount per unique session potentially, but basic here)
        supabaseDb.incrementProfileViews(targetWalletAddress).then(newVal => {
            setViewCount(newVal);
        });

        // B. Subscribe to Realtime Updates
        const channel = supabase
            .channel(`profile_views:${targetWalletAddress}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `wallet_address=eq.${targetWalletAddress}`
            }, (payload) => {
                if (payload.new && typeof payload.new.views === 'number') {
                    setViewCount(payload.new.views);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [targetWalletAddress]);

    // 3. LOAD ACTIVE BETS FROM SUPABASE
    const loadActiveBets = async (walletAddress: string) => {
        try {
            const bets = await supabaseDb.getUserBets(walletAddress);
            const activeBets = bets.filter(bet => !bet.claimed);

            const formattedBets = await Promise.all(activeBets.map(async (bet: any) => {
                // Fetch Market Metadata (Icon, Title) AND Live Data (Price, Volume)
                // We'll run parallel fetches for speed
                const [marketMeta, marketData] = await Promise.all([
                    supabaseDb.getMarket(bet.market_slug),
                    supabaseDb.getMarketData(bet.market_slug)
                ]);

                const currentPrice = marketData?.live_price || bet.entry_price || 50;
                const volume = marketData?.volume || 0;

                // Calculate based on YES/NO position
                const purchasePrice = bet.side === 'YES' ? currentPrice : (100 - currentPrice);
                const invested = bet.amount || 0;
                const shares = bet.shares || 0;

                const currentValue = shares * (purchasePrice / 100);
                const profit = currentValue - invested;
                const change = invested > 0 ? ((profit / invested) * 100).toFixed(1) : '0.0';

                return {
                    id: bet.id || bet.market_slug,
                    title: marketMeta?.title || bet.market_slug,
                    market_icon: (marketMeta as any)?.icon || marketMeta?.banner_url || '🔮',
                    volume: volume, // Add Volume
                    invested,
                    current: currentValue,
                    shares: shares,
                    side: bet.side,
                    change: `${profit >= 0 ? '+' : ''}${change}%`,
                    profit,
                    sol_amount: bet.sol_amount,
                    market_slug: bet.market_slug,
                    payout: bet.payout
                };
            }));

            setProfile(prev => ({ ...prev, activeBets: formattedBets }));
        } catch (error) {
            console.error('Error loading active bets:', error);
        }
    };

    const updateAndSave = async (newData: any) => {
        // Immediate UI Update
        setProfile(newData);

        if (!publicKey) return;
        const walletAddress = publicKey.toBase58();

        // 1. SAVE TO LOCAL STORAGE (Dynamic Key - Single Source of Truth for this wallet)
        const dynamicKey = `djinn_profile_${walletAddress}`;

        // Prepare strict object for storage (avoid saving derived stats like portfolio/medals if we want those to source from elsewhere, but for now we save what we edit)
        const toSave = {
            username: newData.username,
            bio: newData.bio,
            pfp: newData.pfp,
            avatar_url: newData.pfp, // Alias for Supabase compat
            // Preserve existing medals/gem cache if needed
        };

        try {
            // OPTIMIZATION: Don't store huge base64 PFPs in localStorage if they are already in the UI state
            // Only store small metadata to preserve quota
            const storageCopy = { ...toSave };
            if (storageCopy.pfp?.startsWith('data:image')) storageCopy.pfp = null;
            if (storageCopy.avatar_url?.startsWith('data:image')) storageCopy.avatar_url = null;

            localStorage.setItem(dynamicKey, JSON.stringify(storageCopy));
            console.log("✅ Saved to LocalStorage (optimized):", dynamicKey);
        } catch (e) {
            console.error("Local Save Error:", e);
            // If quota error, try clearing everything starting with djinn_profile_
            if (e instanceof Error && e.name === 'QuotaExceededError') {
                Object.keys(localStorage).forEach(k => { if (k.startsWith('djinn_profile_')) localStorage.removeItem(k); });
            }
        }

        // 2. SAVE TO SUPABASE (Background)
        try {
            const result = await supabaseDb.upsertProfile({
                wallet_address: walletAddress,
                username: newData.username,
                bio: newData.bio,
                avatar_url: newData.pfp
            });

            if (!result) {
                console.warn("⚠️ Supabase save returned null (RLS or Network Error?)");
            } else {
                console.log("✅ Saved to Supabase:", result);
            }
        } catch (err) {
            console.error("Supabase Save Error:", err);
            // Don't revert UI, local storage is enough for session
        }

        // 3. BROADCAST UPDATE
        window.dispatchEvent(new Event('djinn-profile-updated'));
    };

    const saveIdentity = () => {
        if (tempName !== profile.username && nameAvailable === false) {
            return; // Block save if name is taken
        }

        const updated = {
            ...profile,
            username: tempName || profile.username,
            bio: tempBio || profile.bio,
            pfp: tempPfp || profile.pfp
        };
        updateAndSave(updated);
        setIsEditModalOpen(false);
    };

    const handleCashOut = (betId: string) => {
        const bet = profile.activeBets.find((b: any) => b.id === betId);
        if (!bet) return;
        const profitChange = bet.current - bet.invested;
        const newActive = profile.activeBets.filter((b: any) => b.id !== betId);
        const newClosed = [...profile.closedBets, { ...bet, closedAt: bet.current }];
        const updated = {
            ...profile,
            activeBets: newActive,
            closedBets: newClosed,
            profit: profile.profit + profitChange,
            gems: profile.gems + 50
        };
        updateAndSave(updated);
        setBetTab('closed');
    };

    const addMedal = async (medal: string = "🔮") => {
        if (profile.medals.length < 9) {
            updateAndSave({ ...profile, medals: [...profile.medals, medal] });

            // Persist Achievement to DB if it's a known code
            if (publicKey && ['GOLD_TROPHY', 'LEGENDARY_TRADER', 'GENESIS', 'APEX_PREDATOR'].includes(medal)) {
                await supabaseDb.grantAchievement(publicKey.toBase58(), medal);
            }
        }
    };

    const removeMedal = (index: number) => {
        const newMedals = profile.medals.filter((_, i) => i !== index);
        updateAndSave({ ...profile, medals: newMedals });
    };

    const handleToggleFollow = async () => {
        if (!publicKey || !targetWalletAddress || isFollowLoading) return;

        setIsFollowLoading(true);
        const myWallet = publicKey.toBase58();

        try {
            if (isFollowingUser) {
                const ok = await supabaseDb.unfollowUser(myWallet, targetWalletAddress);
                if (ok) {
                    setIsFollowingUser(false);
                    setFollowersCount(prev => Math.max(0, prev - 1));
                }
            } else {
                const ok = await supabaseDb.followUser(myWallet, targetWalletAddress);
                if (ok) {
                    setIsFollowingUser(true);
                    setFollowersCount(prev => prev + 1);
                }
            }
        } catch (err) {
            console.error("Follow error:", err);
        } finally {
            setIsFollowLoading(false);
        }
    };

    // --- WALLET SYNC ---
    useEffect(() => {
        if (publicKey && connection) {
            const fetchBalance = async () => {
                try {
                    const balance = await connection.getBalance(publicKey);
                    const solBalance = balance / LAMPORTS_PER_SOL;
                    setProfile(prev => ({ ...prev, portfolio: solBalance }));
                } catch (error) {
                    console.error("Error fetching balance:", error);
                }
            };
            fetchBalance();
            // Poll every 10s
            const interval = setInterval(fetchBalance, 10000);
            return () => clearInterval(interval);
        }
    }, [publicKey, connection]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pfp') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Instead of saving correctly, open cropper
                setCroppingFile(reader.result as string);
                setCropTarget(type);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedImage: string) => {
        setTempPfp(croppedImage);
        setCroppingFile(null);
        setCropTarget(null);
    };

    const handleCropCancel = () => {
        setCroppingFile(null);
        setCropTarget(null);
        // Reset inputs
        if (pfpInputRef.current) pfpInputRef.current.value = '';
    };

    return (
        <main className="min-h-screen text-white font-sans pb-40 selection:bg-[#F492B7] pt-52">
            {/* IMAGE CROPPER MODAL */}
            {croppingFile && (
                <ImageCropper
                    imageSrc={croppingFile}
                    aspectRatio={1}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}
            {/* NO BANNER - Space Theme Background from global or main */}

            <div className="max-w-[1600px] mx-auto px-14 pt-2">
                {/* PROFILE HEADER - Redesigned without banner */}
                <div className="flex items-start gap-12 relative z-10 mb-12">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-60 h-60 rounded-full border-[6px] border-white/5 overflow-hidden bg-[#0A0A0A] shadow-2xl group relative">
                            <img
                                src={(profile.pfp && profile.pfp.trim()) ? profile.pfp : '/pink-pfp.png'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                alt=""
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/pink-pfp.png';
                                }}
                            />
                        </div>

                        {/* FOLLOW BUTTON ONLY BELOW PFP */}
                        {!isMyProfile && (
                            <button
                                onClick={handleToggleFollow}
                                disabled={isFollowLoading || !publicKey}
                                className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${isFollowingUser
                                    ? 'bg-transparent border-white/20 text-white hover:bg-white/5'
                                    : 'bg-[#F492B7] border-[#F492B7] text-black hover:brightness-110 shadow-lg shadow-[#F492B7]/20'
                                    } disabled:opacity-50`}
                            >
                                {isFollowLoading ? '...' : (isFollowingUser ? 'Following' : 'Follow')}
                            </button>
                        )}
                    </div>

                    <div className="flex-1 pt-6">
                        <div className="flex items-center justify-between align-middle mb-4">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-4 align-middle">
                                    <h1 className="text-7xl font-black tracking-tighter leading-none drop-shadow-2xl">{profile.username}</h1>
                                    {profile.medals && profile.medals.map((m: string, i: number) => {
                                        if (m === 'GOLD_TROPHY') return <img key={i} src="/gold-trophy.png" className="w-20 h-20 object-contain drop-shadow-[0_0_25px_rgba(255,215,0,0.6)] hover:scale-110 transition-transform cursor-help z-10" title="Achieved Top 1 Leaderboard" alt="Trophy" />;
                                        if (m === 'LEGENDARY_TRADER') return <img key={i} src="/gems-trophy.png" className="w-24 h-24 object-contain drop-shadow-[0_0_25px_rgba(16,185,129,0.8)] hover:scale-110 transition-transform cursor-help z-20 -ml-4" title="Biggest Win All Time" alt="Legendary" />;
                                        if (m === 'GENESIS') return <img key={i} src="/genesis-medal-v2.png" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(244,146,183,0.5)] hover:scale-110 transition-transform cursor-help" title="Genesis Creator" alt="Genesis" />;
                                        if (m === 'MARKET_MAKER') return <img key={i} src="/blue-crystal.png" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:scale-110 transition-transform cursor-help" title="Market Maker" alt="Market Maker" />;
                                        if (m === 'ORACLE') return <img key={i} src="/orange-crystal-v2.png" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:scale-110 transition-transform cursor-help" title="Grand Oracle" alt="Oracle" />;
                                        if (m === 'DIAMOND_HANDS') return <img key={i} src="/diamond-crystal.png" className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(56,189,248,0.6)] hover:scale-110 transition-transform cursor-help" title="Diamond Hands" alt="Diamond" />;
                                        if (m === 'PINK_CRYSTAL') return <img key={i} src="/pink-crystal.png" className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(244,114,182,0.6)] hover:scale-110 transition-transform cursor-help" title="Mystic Rose" alt="Rose" />;
                                        if (m === 'EMERALD_SAGE') return <img key={i} src="/green-crystal.png" className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(34,197,94,0.6)] hover:scale-110 transition-transform cursor-help" title="Emerald Sage" alt="Emerald" />;
                                        if (m === 'MOON_DANCER') return <img key={i} src="/moon-crystal.png" className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(167,139,250,0.8)] hover:scale-110 transition-transform cursor-help" title="Moon Dancer" alt="Moon" />;
                                        if (m === 'MARKET_SNIPER') return <img key={i} src="/emerald-sniper.png" className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.8)] hover:scale-110 transition-transform cursor-help" title="Market Sniper" alt="Sniper" />;
                                        if (m === 'APEX_PREDATOR') return <img key={i} src="/apex-skull.png" className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-110 transition-transform cursor-help" title="Apex Predator" alt="Apex" />;

                                        return <span key={i} className="text-5xl animate-pulse cursor-help hover:scale-110 transition-transform" title="Medal">{m}</span>;
                                    })}

                                </div>
                                {/* METADATA ROW */}
                                <div className="flex items-center gap-4 mt-2 text-gray-400 text-sm font-bold uppercase tracking-widest">
                                    <span>Joined 18 March</span>
                                    <span>•</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white">{viewCount.toLocaleString()} Views</span>
                                    </div>
                                    {targetWalletAddress && (
                                        <>
                                            <span>•</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(targetWalletAddress);
                                                    const btn = document.getElementById('wallet-copy-btn-header');
                                                    if (btn) {
                                                        btn.textContent = 'COPIED';
                                                        setTimeout(() => { btn.textContent = 'COPY ADDRESS'; }, 2000);
                                                    }
                                                }}
                                                className="group flex items-center gap-2 hover:text-[#F492B7] transition-colors"
                                            >
                                                <span className="text-white/40">{targetWalletAddress.slice(0, 4)}...{targetWalletAddress.slice(-4)}</span>
                                                <span id="wallet-copy-btn-header" className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/10 group-hover:bg-[#F492B7] group-hover:text-black transition-all">COPY ADDRESS</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                                {/* FOLLOW COUNTS ROW */}
                                <div className="flex items-center gap-6 mt-4 text-sm font-bold tracking-widest uppercase">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white text-xl">{formatCompact(followersCount)}</span>
                                        <span className="text-gray-500 text-[11px]">Followers</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white text-xl">{formatCompact(followingCount)}</span>
                                        <span className="text-gray-500 text-[11px]">Following</span>
                                    </div>
                                </div>
                            </div>
                            {/* EDIT PROFILE BUTTON */}
                            {isMyProfile && (
                                <button
                                    onClick={() => {
                                        setTempName(profile.username);
                                        setTempBio(profile.bio);
                                        setTempPfp(profile.pfp);
                                        setIsEditModalOpen(true);
                                    }}
                                    className="border border-white/20 bg-white/5 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#F492B7] hover:text-black transition-all flex items-center gap-2 ml-auto h-fit"
                                >
                                    <span>✎</span> Edit Profile
                                </button>
                            )}
                        </div>
                        {/* Bio estilo Twitter - sin barra lateral */}
                        <p className="text-gray-400 text-lg mt-4 max-w-2xl leading-relaxed">{profile.bio}</p>

                        {/* Gems flexeadas debajo del bio */}
                        {profile.showGems !== false && (
                            <div className="flex items-center gap-3 mt-6">
                                <span className="text-4xl font-[900] text-white" style={{ textShadow: '0 0 30px rgba(244,146,183,0.4)' }}>
                                    {profile.gems.toLocaleString('en-US')}
                                </span>
                                <span className="text-[#F492B7] text-sm font-black uppercase tracking-widest">💎 Gems</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        label="Positions Value"
                        value={`${(profile.activeBets.reduce((acc: number, bet: any) => acc + (bet.current || 0), 0)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}
                    />
                    <StatCard
                        label="Win rate"
                        value={`${profile.winRate || '0.0'}%`}
                        color="text-[#F492B7]"
                    />
                    <StatCard
                        label="Biggest win"
                        value={`+$${profile.biggestWin?.toLocaleString() || '0'}`}
                        color="text-[#10B981]"
                    />
                    <StatCard label="Markets created" value={profile.createdMarkets?.length || 0} color="text-blue-400" />
                </div>

                {/* CHARTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <ProfitLossCard profit={profile.profit} activeBets={profile.activeBets.filter((b: any) => !b.market_slug?.includes('mkjm2hmf'))} />
                    {(isMyProfile || profile.username.toLowerCase() === 'lord') && (
                        <CreatorRewardsCard createdMarkets={profile.createdMarkets.filter((m: any) => !m.slug?.includes('mkjm2hmf'))} isMyProfile={isMyProfile} />
                    )}
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex items-center gap-8 border-b border-white/10 mb-8">
                    {(['positions', 'activity', 'markets'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-sm font-bold tracking-widest transition-all relative ${activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#F492B7] shadow-[0_0_10px_#F492B7]"></span>
                            )}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENT */}
                <div className="min-h-[400px]">
                    {activeTab === 'positions' && (
                        <PositionsTable
                            activeBets={profile.activeBets.filter((b: any) => !b.market_slug?.includes('mkjm2hmf'))}
                            closedBets={profile.closedBets.filter((b: any) => !b.market_slug?.includes('mkjm2hmf'))}
                            isMyProfile={isMyProfile}
                        />
                    )}
                    {activeTab === 'activity' && (
                        <ActivityTable walletAddress={targetWalletAddress || publicKey?.toBase58() || ''} />
                    )}
                    {activeTab === 'markets' && (
                        <MyMarketsList markets={profile.createdMarkets.filter((m: any) => !m.slug?.includes('mkjm2hmf'))} />
                    )}
                </div>

                {/* UNCLAIMED WINNINGS - BETS PAYOUT */}
                {unclaimedPayouts.length > 0 && isMyProfile && (
                    <UnclaimedWinningsCard
                        payouts={unclaimedPayouts}
                        onClaim={async (betId, amount) => {
                            if (!confirm(`Claim ${amount.toFixed(4)} SOL?`)) return;
                            try {
                                const { error } = await supabaseDb.claimPayout(betId);
                                if (error) throw error;
                                alert('✅ Payout claimed successfully!');
                                // Remove from local state
                                setUnclaimedPayouts(prev => prev.filter(p => p.id !== betId));
                                // Update balance (simulated)
                                setProfile(prev => ({ ...prev, portfolio: prev.portfolio + amount }));
                            } catch (e: any) {
                                console.error(e);
                                alert('Error claiming payout: ' + e.message);
                            }
                        }}
                    />
                )}

            </div>

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <EditModal
                    profile={profile}
                    tempName={tempName}
                    tempBio={tempBio}
                    setTempName={setTempName}
                    setTempBio={setTempBio}
                    tempPfp={tempPfp}
                    showGems={tempShowGems}
                    setShowGems={setTempShowGems}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={saveIdentity}
                    addMedal={addMedal}
                    removeMedal={removeMedal}
                    pfpInputRef={pfpInputRef}
                    handleFileChange={handleFileChange}
                />
            )}
        </main>
    );
}

// --- SUB-COMPONENTES (SIN CAMBIOS VISUALES) ---

function ProfitChart({ activeBets }: any) {
    const maxProfit = Math.max(...activeBets.map((b: any) => b.profit), 100);
    const minProfit = Math.min(...activeBets.map((b: any) => b.profit), -100);
    const range = maxProfit - minProfit;

    return (
        <div className="relative h-64 w-full bg-black/40 rounded-2xl p-8 border border-white/10 backdrop-blur-sm">
            <div className="absolute inset-8 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-full h-px bg-white/[0.03]" />
                ))}
            </div>
            <div className="relative h-full flex items-end justify-around gap-6">
                {activeBets.map((bet: any, idx: number) => {
                    const height = Math.abs((bet.profit / range) * 100);
                    const isPositive = bet.profit >= 0;

                    return (
                        <div key={idx} className="flex flex-col items-center flex-1 group">
                            <div className="relative w-full flex flex-col items-center justify-end h-full">
                                {isPositive ? (
                                    <div className="w-full bg-gradient-to-t from-[#10B981] to-[#10B981]/40 rounded-t-xl transition-all duration-300 group-hover:brightness-125 relative" style={{ height: `${height}%`, minHeight: '12px', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}><div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent rounded-t-xl"></div></div>
                                ) : (
                                    <div className="w-full bg-gradient-to-b from-red-500 to-red-500/40 rounded-b-xl transition-all duration-300 group-hover:brightness-125 relative" style={{ height: `${height}%`, minHeight: '12px', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}><div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-b-xl"></div></div>
                                )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-3 bg-black/95 border border-[#F492B7]/30 rounded-xl p-3 text-xs font-black whitespace-nowrap transition-all z-10 backdrop-blur-xl">
                                <span className={bet.profit >= 0 ? 'text-[#10B981]' : 'text-red-500'}>{bet.profit >= 0 ? '+' : ''}${bet.profit}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="absolute left-8 right-8 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#F492B7]/40 to-transparent" style={{ boxShadow: '0 0 10px rgba(244, 146, 183, 0.2)' }}></div>
        </div>
    );
}

function StatCard({ label, value, color = "text-white" }: any) {
    return (
        <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 p-8 rounded-[2rem] shadow-xl hover:border-[#F492B7]/30 transition-all hover:-translate-y-1">
            <p className="text-gray-500 text-xs font-black tracking-[0.2em] mb-4">{label}</p>
            <p className={`text-4xl font-[900] tracking-tighter italic leading-none ${color}`}>{value}</p>
        </div>
    );
}

function MarketCard({ market, router }: any) {
    return (
        <div onClick={() => router.push(`/market/${market.slug}`)} className="group bg-[#0D0D0D] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-[#F492B7]/40 transition-all cursor-pointer shadow-2xl hover:-translate-y-2 duration-300">
            <div className="h-48 w-full relative overflow-hidden bg-gradient-to-br from-[#F492B7]/20 to-black">
                {typeof market.icon === 'string' && market.icon.startsWith('data:image') ? (
                    <img src={market.icon} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" alt="" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">{market.icon || '🔮'}</div>
                )}
                <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live</span>
                </div>
            </div>
            <div className="p-8 space-y-4">
                <h4 className="text-2xl font-black uppercase leading-tight tracking-tighter h-16 overflow-hidden group-hover:text-[#F492B7] transition-colors">{market.title}</h4>
                <div className="flex justify-between items-center border-t border-white/5 pt-6">
                    <div><span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">Type</span><span className="text-white text-sm font-black uppercase">{market.type || 'Binary'}</span></div>
                    <div className="text-right"><span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">Volume</span><span className="text-white text-sm font-black">{market.volume || '$0'}</span></div>
                </div>
            </div>
        </div>
    );
}

function BetCard({ bet, onCashOut, router }: any) {
    const [showShareModal, setShowShareModal] = useState(false);
    const isPositive = bet.profit >= 0;

    const handleShare = (e: any) => {
        e.stopPropagation();
        setShowShareModal(true);
    };

    const handleCopyShare = () => {
        const shareText = `🔮 I'm ${isPositive ? 'up' : 'down'} ${bet.change} on "${bet.title}" | Djinn Markets`;
        navigator.clipboard.writeText(shareText);
        alert('📋 Copied to clipboard!');
    };

    return (
        <>
            {/* TICKET CARD STYLE */}
            <div
                onClick={() => router.push(`/market/${bet.market_slug}`)}
                className="group relative bg-[#0D0D0D] border border-white/5 rounded-3xl overflow-hidden hover:border-[#F492B7]/30 transition-all cursor-pointer shadow-xl hover:-translate-y-1"
            >
                {/* 1. TICKET HEADER (Market Image & Gradient) */}
                <div className="h-32 w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] to-transparent z-10" />
                    {typeof bet.market_icon === 'string' && (bet.market_icon.startsWith('http') || bet.market_icon.startsWith('data:')) ? (
                        <img src={bet.market_icon} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="" />
                    ) : (
                        <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center text-4xl opacity-20">{bet.market_icon}</div>
                    )}

                    {/* Floating Badge: SIDE */}
                    <div className={`absolute top-4 right-4 z-20 px-3 py-1 rounded-lg font-black text-xs uppercase tracking-widest border backdrop-blur-md shadow-lg ${bet.side === 'YES' ? 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]' : 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]'}`}>
                        {bet.side} Position
                    </div>

                    {/* MARKET TITLE (Overlaid) */}
                    <div className="absolute bottom-4 left-6 right-6 z-20">
                        <h4 className="text-xl font-black text-white leading-tight drop-shadow-lg line-clamp-1">{bet.title}</h4>
                    </div>
                </div>

                {/* 2. TICKET BODY (Stats) */}
                <div className="p-6 relative">
                    {/* Perforation Line Effect */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent border-t border-dashed border-white/10" />
                    <div className="absolute -top-3 -left-3 w-6 h-6 bg-black rounded-full" />
                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-black rounded-full" />

                    <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
                        {/* SHARES */}
                        <div>
                            <p className="text-[#6B7280] text-[10px] uppercase font-bold tracking-widest mb-1">Shares</p>
                            <p className="text-white text-lg font-mono font-medium">{formatCompact(bet.shares)}</p>
                        </div>
                        {/* INVESTED SOL */}
                        <div className="text-right">
                            <p className="text-[#6B7280] text-[10px] uppercase font-bold tracking-widest mb-1">Invested</p>
                            <p className="text-white text-lg font-mono font-medium">{bet.sol_amount?.toFixed(3)} SOL</p>
                        </div>

                        {/* MARKET VOLUME */}
                        <div>
                            <p className="text-[#6B7280] text-[10px] uppercase font-bold tracking-widest mb-1">Vol</p>
                            <div className="flex items-center gap-1 text-zinc-400 font-mono text-sm">
                                <span>{formatCompact(bet.volume)}</span>
                            </div>
                        </div>

                        {/* PROFIT/LOSS */}
                        <div className="text-right">
                            <p className="text-[#6B7280] text-[10px] uppercase font-bold tracking-widest mb-1">P/L</p>
                            <p className={`text-lg font-black ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                {isPositive ? '+' : ''}{bet.change}
                            </p>
                        </div>
                    </div>

                    {/* ACTION FOOTER */}
                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onCashOut(bet.id); }}
                            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Sell
                        </button>
                        <button
                            onClick={handleShare}
                            className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-[#F492B7] w-12 flex items-center justify-center rounded-xl transition-all"
                        >
                            📤
                        </button>
                    </div>

                </div>
            </div>

            {/* SHARE MODAL (Preserved) */}
            {showShareModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl" onClick={(e) => { e.stopPropagation(); setShowShareModal(false); }}>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        {/* Share Card Preview */}
                        <div className="w-[400px] bg-gradient-to-br from-[#0D0D0D] to-black border border-white/20 rounded-3xl p-8 relative overflow-hidden">
                            {/* Background glow */}
                            <div className={`absolute top-0 right-0 w-40 h-40 ${isPositive ? 'bg-[#10B981]/20' : 'bg-red-500/20'} rounded-full blur-3xl pointer-events-none`}></div>

                            {/* Djinn Branding */}
                            <div className="flex items-center gap-2 mb-6">
                                <img src="/star.png" alt="Djinn" className="w-10 h-10" />
                                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>Djinn</span>
                            </div>

                            {/* Position */}
                            <div className="relative z-10">
                                <span className={`text-xs font-black px-3 py-1.5 rounded-lg ${bet.side === 'YES' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-red-500/20 text-red-500'}`}>
                                    {bet.side}
                                </span>
                                <h3 className="text-xl font-bold text-white mt-4 mb-6 leading-tight">{bet.title}</h3>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="text-center">
                                        <p className="text-gray-500 text-[10px] uppercase mb-1">Invested</p>
                                        <p className="text-white text-lg font-black">${bet.invested}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-500 text-[10px] uppercase mb-1">Value</p>
                                        <p className="text-white text-lg font-black">${bet.current.toFixed(2)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-500 text-[10px] uppercase mb-1">Return</p>
                                        <p className={`text-lg font-black ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>{bet.change}</p>
                                    </div>
                                </div>

                                {/* Big Profit */}
                                <div className={`text-center py-6 rounded-2xl ${isPositive ? 'bg-[#10B981]/10' : 'bg-red-500/10'}`}>
                                    <p className={`text-5xl font-[900] ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>
                                        {isPositive ? '+' : ''}{bet.change}
                                    </p>
                                    <p className="text-gray-500 text-xs mt-2 uppercase">Profit/Loss</p>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/10">
                                    <span className="text-gray-500 text-xs">Trade on</span>
                                    <span className="text-[#F492B7] font-bold text-sm">djinn.markets</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleCopyShare}
                                className="flex-1 bg-[#F492B7] text-black py-3 rounded-xl font-black text-sm uppercase hover:brightness-110 transition-all"
                            >
                                📋 Copy Text
                            </button>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="flex-1 bg-white/10 text-white py-3 rounded-xl font-black text-sm uppercase hover:bg-white/20 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// --- EDIT MODAL ---
function EditModal({ profile, tempName, tempBio, setTempName, setTempBio, tempPfp, showGems, setShowGems, onClose, onSave, addMedal, removeMedal, pfpInputRef, handleFileChange }: any) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl">
            <div className="relative bg-[#080808] border border-white/10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden">

                {/* HEAD - FIXED */}
                <div className="px-10 pt-10 pb-6 shrink-0 z-10 bg-[#080808] border-b border-white/5">
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-[#F492B7]">Edit Identity</h2>
                </div>

                {/* BODY - SCROLLABLE */}
                <div className="p-10 overflow-y-auto flex-1 custom-scrollbar space-y-10">

                    {/* MEDALS SECTION */}
                    {profile.medals.length < 9 && (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Featured Medals</p>
                            <div className="flex flex-wrap gap-4">
                                {profile.medals.map((medal: string, i: number) => (
                                    <button key={i} onClick={() => removeMedal(medal)} className="relative group w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500 transition-all">
                                        <div className="text-2xl">
                                            {medal === 'GENESIS' ? <img src="/genesis-medal-v2.png" className="w-10 h-10 object-contain" /> :
                                                medal === 'GOLD_TROPHY' ? <img src="/gold-trophy.png" className="w-12 h-12 object-contain" /> :
                                                    medal === 'LEGENDARY_TRADER' ? <img src="/gems-trophy.png" className="w-14 h-14 object-contain" /> :
                                                        medal}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-bold">×</span>
                                        </div>
                                    </button>
                                ))}

                                {/* ADD NEW MEDAL BUTTONS */}
                                <div className="flex flex-wrap gap-2">
                                    {/* GOLD TROPHY SELECTION */}
                                    {profile.achievements.some((a: any) => a.code === 'THE_CHAMPION') && !profile.medals.includes('GOLD_TROPHY') && (
                                        <button onClick={() => addMedal('GOLD_TROPHY')} className="w-16 h-16 rounded-full border-2 border-dashed border-[#FFD700]/40 p-2 hover:bg-[#FFD700]/10 transition-all flex items-center justify-center animate-pulse" title="Equip The Champion Trophy">
                                            <img src="/gold-trophy.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}

                                    {/* LEGENDARY TRADER (GEMS TROPHY) SELECTION */}
                                    {profile.achievements.some((a: any) => a.code === 'LEGENDARY_TRADER') && !profile.medals.includes('LEGENDARY_TRADER') && (
                                        <button onClick={() => addMedal('LEGENDARY_TRADER')} className="w-16 h-16 rounded-full border-2 border-dashed border-[#10B981]/40 p-1 hover:bg-[#10B981]/10 transition-all flex items-center justify-center animate-pulse" title="Equip Legendary Gems Trophy">
                                            <img src="/gems-trophy.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}

                                    <button onClick={() => addMedal("🔮")} className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 text-2xl text-white/20 hover:bg-white/5 hover:border-[#F492B7] hover:text-[#F492B7] transition-all flex items-center justify-center" title="Add Crystal">🔮</button>
                                    {/* GENESIS MEDAL OPTION */}
                                    {profile.achievements.some((a: any) => a.code === 'FIRST_MARKET') && !profile.medals.includes('GENESIS') && (
                                        <button onClick={() => addMedal('GENESIS')} className="w-16 h-16 rounded-full border-2 border-dashed border-[#F492B7]/40 p-3 hover:bg-[#F492B7]/10 transition-all flex items-center justify-center animate-pulse" title="Unlock Genesis Medal">
                                            <img src="/genesis-medal-v2.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}
                                    {/* MARKET MAKER BLUE CRYSTAL */}
                                    {profile.achievements.some((a: any) => a.code === 'MARKET_MAKER') && !profile.medals.includes('MARKET_MAKER') && (
                                        <button onClick={() => addMedal('MARKET_MAKER')} className="w-16 h-16 rounded-full border-2 border-dashed border-blue-500/40 p-3 hover:bg-blue-500/10 transition-all flex items-center justify-center animate-pulse" title="Unlock Market Maker Medal">
                                            <img src="/blue-crystal-v2.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}

                                    {/* ORACLE ORANGE CRYSTAL */}
                                    {profile.achievements.some((a: any) => a.code === 'ORACLE') && !profile.medals.includes('ORACLE') && (
                                        <button onClick={() => addMedal('ORACLE')} className="w-16 h-16 rounded-full border-2 border-dashed border-orange-500/40 p-3 hover:bg-orange-500/10 transition-all flex items-center justify-center animate-pulse" title="Unlock Oracle Medal">
                                            <img src="/orange-crystal-v2.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}

                                    {/* DIAMOND HANDS */}
                                    {profile.achievements.some((a: any) => a.code === 'DIAMOND_HANDS') && !profile.medals.includes('DIAMOND_HANDS') && (
                                        <button onClick={() => addMedal('DIAMOND_HANDS')} className="w-16 h-16 rounded-full border-2 border-dashed border-cyan-500/40 p-3 hover:bg-cyan-500/10 transition-all flex items-center justify-center animate-pulse" title="Unlock Diamond Hands Medal">
                                            <img src="/diamond-crystal.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}

                                    {/* PINK CRYSTAL */}
                                    {profile.achievements.some((a: any) => a.code === 'PINK_CRYSTAL') && !profile.medals.includes('PINK_CRYSTAL') && (
                                        <button onClick={() => addMedal('PINK_CRYSTAL')} className="w-16 h-16 rounded-full border-2 border-dashed border-pink-500/40 p-3 hover:bg-pink-500/10 transition-all flex items-center justify-center animate-pulse" title="Unlock Mystic Rose Medal">
                                            <img src="/pink-crystal.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}

                                    {/* EMERALD SAGE */}
                                    {profile.achievements.some((a: any) => a.code === 'EMERALD_SAGE') && !profile.medals.includes('EMERALD_SAGE') && (
                                        <button onClick={() => addMedal('EMERALD_SAGE')} className="w-16 h-16 rounded-full border-2 border-dashed border-green-500/40 p-3 hover:bg-green-500/10 transition-all flex items-center justify-center animate-pulse" title="Unlock Emerald Sage Medal">
                                            <img src="/green-crystal.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}

                                    {/* MOON DANCER */}
                                    {profile.achievements.some((a: any) => a.code === 'MOON_DANCER') && !profile.medals.includes('MOON_DANCER') && (
                                        <button onClick={() => addMedal('MOON_DANCER')} className="w-16 h-16 rounded-full border-2 border-dashed border-purple-500/40 p-3 hover:bg-purple-500/10 transition-all flex items-center justify-center animate-pulse" title="Unlock Moon Dancer Medal">
                                            <img src="/moon-crystal.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}

                                    {/* MARKET SNIPER */}
                                    {profile.achievements.some((a: any) => a.code === 'MARKET_SNIPER') && !profile.medals.includes('MARKET_SNIPER') && (
                                        <button onClick={() => addMedal('MARKET_SNIPER')} className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-600/40 p-3 hover:bg-emerald-600/10 transition-all flex items-center justify-center animate-pulse" title="Unlock Market Sniper Medal">
                                            <img src="/emerald-sniper.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}

                                    {/* APEX PREDATOR */}
                                    {profile.achievements.some((a: any) => a.code === 'APEX_PREDATOR') && !profile.medals.includes('APEX_PREDATOR') && (
                                        <button onClick={() => addMedal('APEX_PREDATOR')} className="w-16 h-16 rounded-full border-2 border-dashed border-white/40 p-3 hover:bg-white/10 transition-all flex items-center justify-center animate-pulse" title="Unlock Apex Predator Medal">
                                            <img src="/apex-skull.png" className="w-full h-full object-contain" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MAIN FORM */}
                    <div className="space-y-8">
                        {/* PFP & DETAILS ROW - NO BANNER */}
                        <div className="flex gap-8">
                            <div className="shrink-0 space-y-3 pb-8">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Avatar</p>
                                <button onClick={() => pfpInputRef.current?.click()} className="w-32 h-32 bg-white/5 border border-dashed border-white/20 rounded-full flex items-center justify-center relative group hover:border-[#F492B7]/40 transition-all overflow-hidden mx-auto">
                                    <img src={tempPfp || profile.pfp} className="w-full h-full object-cover object-center opacity-80 group-hover:opacity-100 transition-all" alt="" />
                                    <span className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-[9px] font-black uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">Change</span>
                                </button>
                            </div>

                            <div className="flex-1 space-y-6">
                                <div>
                                    <div className="flex items-center justify-between mb-2 ml-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Username</p>
                                        <div className="flex items-center gap-1.5 transition-all duration-300">
                                            {isCheckingName ? (
                                                <Loader2 className="w-3 h-3 text-[#F492B7] animate-spin" />
                                            ) : tempName.length >= 3 && tempName !== profile.username ? (
                                                nameAvailable ? (
                                                    <div className="flex items-center gap-1 text-[#F492B7]">
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Available</span>
                                                        <span className="text-sm">✓</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-red-500">
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Taken</span>
                                                        <span className="text-sm">✕</span>
                                                    </div>
                                                )
                                            ) : null}
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        className={`w-full bg-white/5 border ${nameAvailable === false && tempName !== profile.username ? 'border-red-500/50' : 'border-white/10'} rounded-2xl p-4 text-white font-bold outline-none focus:border-[#F492B7] transition-all`}
                                        placeholder="Username"
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15))}
                                    />
                                    {nameAvailable === false && tempName !== profile.username && (
                                        <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest mt-2 ml-1">This username is already claimed by another Djinn.</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Bio</p>
                                    <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none h-24 resize-none focus:border-[#F492B7] transition-all" placeholder="Tell us about yourself..." value={tempBio} onChange={(e) => setTempBio(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* UTILITIES */}
                        <div className="flex items-center justify-between bg-white/5 p-5 rounded-2xl border border-white/10">
                            <div>
                                <p className="font-bold text-white text-sm">Show Gems</p>
                                <p className="text-[11px] text-gray-500">Display your gem balance publicly</p>
                            </div>
                            <button
                                onClick={() => setShowGems(!showGems)}
                                className={`w-12 h-7 rounded-full p-1 transition-colors ${showGems ? 'bg-[#F492B7]' : 'bg-white/10'}`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${showGems ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* FOOTER - FIXED */}
                <div className="p-8 shrink-0 border-t border-white/5 bg-[#080808] z-10">
                    <div className="flex gap-4">
                        <button onClick={onClose} className="flex-1 bg-white/5 text-gray-400 hover:text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-white/10 transition-all">Cancel</button>
                        <button onClick={onSave} className="flex-1 bg-[#F492B7] text-black py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:shadow-[#F492B7]/20 hover:brightness-110 transition-all">Save Changes</button>
                    </div>
                </div>

                {/* HIDDEN INPUTS */}
                <input type="file" ref={pfpInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'pfp')} />
            </div>
        </div>
    );
}

// --- PROFIT/LOSS CARD - POLYMARKET STYLE ---
function ProfitLossCard({ profit, activeBets }: { profit: number; activeBets: any[] }) {
    const [period, setPeriod] = useState<'1D' | '1W' | '1M' | 'ALL'>('1M');
    const [hoverValue, setHoverValue] = useState<number | null>(null);
    const [hoverLabel, setHoverLabel] = useState<string | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        // SIMULATED DATA (0 - 10,000 range)
        const generateMockData = () => {
            const dataPoints = period === '1D' ? 24 : period === '1W' ? 7 : period === '1M' ? 30 : 90;
            const data = [];
            let value = 5000; // Start middle
            for (let i = 0; i < dataPoints; i++) {
                value = value + (Math.random() - 0.5) * 1000; // Random walk
                if (value < 0) value = 0;
                if (value > 10000) value = 10000;
                data.push({
                    time: i,
                    value: value,
                    label: period === '1D' ? `${i}:00` : `Day ${i + 1}`
                });
            }
            return data;
        };

        setChartData(generateMockData());
    }, [period]);

    const effectiveValue = hoverValue ?? ((chartData.length > 0) ? chartData[chartData.length - 1].value : profit);
    const isPositive = effectiveValue >= 0;

    const periodLabels = { '1D': 'Past Day', '1W': 'Past Week', '1M': 'Past Month', 'ALL': 'All Time' };

    return (
        <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-[2.5rem] p-10 mb-12 shadow-2xl relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${isPositive ? 'from-[#10B981]/5' : 'from-red-500/5'} via-transparent to-transparent pointer-events-none transition-colors duration-500`}></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-white text-2xl font-black tracking-tighter transition-colors duration-300">
                            {isPositive ? '▲' : '▼'} Profit loss
                        </span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                        {(['1D', '1W', '1M', 'ALL'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 text-sm font-black rounded-lg transition-all ${period === p
                                    ? 'bg-[#F492B7] text-black border border-[#F492B7] shadow-[0_0_15px_rgba(244,146,183,0.4)] transform scale-105'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-2">
                    <h2 className={`text-5xl font-[900] ${isPositive ? 'text-[#10B981]' : 'text-red-500'} tracking-tighter italic leading-none transition-colors duration-300 flex items-center gap-2`}>
                        $<AnimatedNumber value={Math.abs(effectiveValue)} />
                    </h2>
                    <p className="text-white text-sm font-medium uppercase tracking-widest mt-2">{hoverLabel || periodLabels[period]}</p>
                </div>

                <ProfitHistoryChart
                    data={chartData}
                    color={isPositive ? '#10B981' : '#EF4444'}
                    onHover={(d) => {
                        if (d) {
                            setHoverValue(d.value);
                            setHoverLabel(d.label);
                        } else {
                            setHoverValue(null);
                            setHoverLabel(null);
                        }
                    }}
                />
            </div>
        </div>
    );
}



// --- CREATOR REWARDS CARD - DJINN STYLE ---
function CreatorRewardsCard({ createdMarkets, isMyProfile }: { createdMarkets: any[], isMyProfile: boolean }) {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [claimableSol, setClaimableSol] = useState(0);
    const [marketsWithFees, setMarketsWithFees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [period, setPeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'all'>('1W');
    const { claimCreatorFees } = useDjinnProtocol();

    // Fetch Real On-Chain Fees
    useEffect(() => {
        if (!createdMarkets.length || !connection) return;

        const fetchFees = async () => {
            try {
                const PID = new PublicKey(PROGRAM_ID);

                const keys = await Promise.all(createdMarkets.map(async (m) => {
                    const [pda] = PublicKey.findProgramAddressSync(
                        [Buffer.from("market"), Buffer.from(m.slug).subarray(0, 32)],
                        PID
                    );
                    return pda;
                }));

                // 2. Fetch Accounts
                const accountInfos = await connection.getMultipleAccountsInfo(keys);

                let total = 0;
                const withFees: any[] = [];

                accountInfos.forEach((info, idx) => {
                    if (!info) return;
                    // Parse Data
                    const data = info.data;
                    let offset = 8 + 32; // Skip Disc + Creator

                    // Read Title
                    const titleLen = data.readUInt32LE(offset);
                    offset += 4 + titleLen;

                    // Read Slug
                    const slugLen = data.readUInt32LE(offset);
                    offset += 4 + slugLen;

                    // Resolution Time (8)
                    offset += 8;
                    // Status (1)
                    offset += 1;
                    // Outcome (1)
                    offset += 1;
                    // Bump (1)
                    offset += 1;
                    // Virtual Sol (8)
                    offset += 8;
                    // Virtual Shares (8)
                    offset += 8;

                    // Creator Fees Claimable (8)
                    const fees = Number(data.readBigUInt64LE(offset)) / LAMPORTS_PER_SOL;

                    if (fees > 0) {
                        total += fees;
                        withFees.push({ ...createdMarkets[idx], pda: keys[idx], fees });
                    }
                });

                setClaimableSol(total);
                setMarketsWithFees(withFees);

            } catch (e) {
                console.error("Error fetching creator fees:", e);
            }
        };

        fetchFees();
    }, [createdMarkets, connection]);

    const handleClaimAll = async () => {
        if (!publicKey || !marketsWithFees.length || !claimCreatorFees) return;
        setIsLoading(true);
        try {
            // Claim from all markets with fees
            let claimedCount = 0;
            for (const market of marketsWithFees) {
                try {
                    await claimCreatorFees(market.pda);
                    claimedCount++;
                } catch (err) {
                    console.error(`Failed to claim from ${market.slug}`, err);
                }
            }

            if (claimedCount > 0) {
                alert(`✅ Successfully claimed rewards from ${claimedCount} markets!`);
                // Reset local state
                setClaimableSol(0);
                setMarketsWithFees([]);
            }

        } catch (e) {
            console.error(e);
            alert("Error claiming fees");
        } finally {
            setIsLoading(false);
        }
    };

    // Visualization Data (Mock for history, real for current total)
    const totalRewards = claimableSol > 0 ? claimableSol * 180 : 0; // Fake APY calc
    const solRewards = claimableSol;

    // Generate rewards chart data
    const generateRewardsData = () => {
        const dataPoints = period === '1D' ? 24 : period === '1W' ? 7 : period === '1M' ? 30 : 90;
        const data = [];
        let cumulative = 0;
        // Simulate a lively chart for rewards too if claimable is 0, or use claimable
        const baseValue = claimableSol > 0 ? claimableSol : 100;

        for (let i = 0; i < dataPoints; i++) {
            cumulative += (Math.random() * baseValue) / dataPoints;
            data.push({
                time: i,
                value: cumulative,
                label: `Day ${i}`
            });
        }
        return data;
    };
    const chartData = generateRewardsData();

    return (
        <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-[2.5rem] p-10 mb-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#F492B7]/5 via-transparent to-transparent pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black tracking-tighter text-white">Creator rewards</h3>
                    <div className="flex items-center gap-2">
                        {isMyProfile && (
                            <button
                                onClick={handleClaimAll}
                                disabled={claimableSol <= 0 || isLoading}
                                className={`px-5 py-2.5 font-black text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2 ${claimableSol > 0 ? 'bg-[#10B981] text-white hover:bg-[#0ea472]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                            >
                                {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : '💰'}
                                Claim {claimableSol.toFixed(3)} SOL
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div>
                        <p className="text-white text-xs font-black uppercase tracking-widest mb-2">Unclaimed earnings</p>
                        <p className="text-5xl font-[900] text-[#10B981] tracking-tighter italic leading-none">
                            {claimableSol.toFixed(4)} <span className="text-2xl not-italic text-white/50">SOL</span>
                        </p>
                    </div>
                </div>

                <ProfitHistoryChart data={chartData} color="#F492B7" onHover={() => { }} />
            </div>
        </div>
    );
}


// Helper to find IDL discriminator would go here if we had the library.


// --- UNCLAIMED WINNINGS CARD ---
function UnclaimedWinningsCard({ payouts, onClaim }: { payouts: any[], onClaim: (id: string, amount: number) => void }) {
    const totalUnclaimed = payouts.reduce((sum, p) => sum + (p.payout || 0), 0);

    return (
        <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-emerald-500/30 rounded-[2.5rem] p-10 mb-12 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
                            <span>🏆 Winnings available</span>
                            <span className="bg-emerald-500 text-black text-xs px-2 py-1 rounded-md">Action Required</span>
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">You won bets on resolved markets!</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">Total Claimable</p>
                        <p className="text-4xl font-[900] text-emerald-400 tracking-tighter leading-none">
                            {totalUnclaimed.toFixed(4)} SOL
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {payouts.map((payout) => (
                        <div key={payout.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-emerald-500/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl">
                                    💰
                                </div>
                                <div>
                                    <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{payout.market_slug}</h4>
                                    <div className="flex gap-2 text-xs text-gray-400">
                                        <span className="font-mono">Bet: {payout.side}</span>
                                        <span>•</span>
                                        <span className="font-mono">Invested: {parseFloat(payout.sol_amount).toFixed(4)} SOL</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="font-black text-emerald-400 text-xl">+{parseFloat(payout.payout).toFixed(4)} SOL</p>
                                <button
                                    onClick={() => onClaim(payout.id, parseFloat(payout.payout))}
                                    className="px-4 py-2 bg-emerald-500 text-black font-bold uppercase text-xs rounded-lg hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                    Claim
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- POSITIONS TABLE ---
function PositionsTable({ activeBets, closedBets, isMyProfile }: { activeBets: any[], closedBets: any[], isMyProfile: boolean }) {
    const [filter, setFilter] = useState<'active' | 'closed'>('active');
    const router = useRouter();
    const bets = filter === 'active' ? activeBets : closedBets;

    return (
        <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => setFilter('active')}
                    className={`px-6 py-2 rounded-xl text-sm font-black tracking-widest transition-all ${filter === 'active' ? 'bg-white text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                >
                    Active
                </button>
                <button
                    onClick={() => setFilter('closed')}
                    className={`px-6 py-2 rounded-xl text-sm font-black tracking-widest transition-all ${filter === 'closed' ? 'bg-white text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                >
                    Closed
                </button>
            </div>

            {bets.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-gray-500 font-bold uppercase tracking-widest">No {filter} positions found</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-500 text-xs font-black uppercase tracking-widest border-b border-white/10">
                                <th className="pb-4 pl-4">Market</th>
                                <th className="pb-4 text-center">Outcome</th>
                                <th className="pb-4 text-right">Shares</th>
                                <th className="pb-4 text-right">Avg Price</th>
                                <th className="pb-4 text-right">Current</th>
                                <th className="pb-4 text-right">Value</th>
                                <th className="pb-4 text-right pr-4">{filter === 'closed' ? 'Status' : 'P/L'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {bets.map((bet: any, i: number) => {
                                const currentValue = bet.current || (bet.shares * (bet.currentPrice || bet.entry_price || 0));
                                const pnl = currentValue - (bet.shares * bet.entry_price);
                                const pnlPercent = (bet.shares * bet.entry_price) > 0 ? (pnl / (bet.shares * bet.entry_price)) * 100 : 0;
                                const isPositive = pnl >= 0;
                                const marketName = (bet.market_title || bet.market_slug || '').replace(/-/g, ' ');

                                // Closed Position Logic - Strick check if resolved
                                const isResolved = bet.status === 'RESOLVED' || bet.status === 'CLOSED';

                                if (filter === 'closed' && !isResolved) return null;

                                // Color logic based on outcome/side if available
                                const sideColor = bet.side === 'YES' ? 'text-[#10B981] bg-[#10B981]/20' : bet.side === 'NO' ? 'text-red-500 bg-red-500/20' : 'text-blue-400 bg-blue-400/20';

                                return (
                                    <tr
                                        key={i}
                                        onClick={() => router.push(`/market/${bet.market_slug}`)}
                                        className="group hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <td className="py-4 pl-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0 relative">
                                                    {bet.market_icon ? (
                                                        <img src={bet.market_icon} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">🔮</div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white max-w-[200px] truncate capitalize">{marketName}</span>
                                                    {filter === 'closed' && (
                                                        <span className="text-[10px] text-gray-500">Ended {new Date().toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${sideColor}`}>
                                                {bet.outcome_name || bet.side}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right font-mono text-gray-300">{formatCompact(bet.shares)}</td>
                                        <td className="py-4 text-right font-mono text-gray-500">{(bet.entry_price * 100).toFixed(0)}¢</td>
                                        <td className="py-4 text-right font-mono text-gray-300">
                                            {filter === 'closed' ? <span className="text-gray-600">-</span> : <span>{(bet.currentPrice ? bet.currentPrice * 100 : bet.entry_price * 100).toFixed(0)}¢</span>}
                                        </td>
                                        <td className="py-4 text-right font-black text-white">${formatCompact(currentValue)}</td>
                                        <td className={`py-4 text-right pr-4 font-bold ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>
                                            {filter === 'closed' ? (
                                                <div className={`px-2 py-1 rounded inline-block text-xs uppercase ${isPositive ? 'bg-[#10B981]/20' : 'bg-red-500/20'}`}>
                                                    {isPositive ? 'WIN' : 'LOSS'} {pnlPercent.toFixed(0)}%
                                                </div>
                                            ) : (
                                                <span>{isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// --- ACTIVITY TABLE ---
function ActivityTable({ walletAddress }: { walletAddress: string }) {
    const [activity, setActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!walletAddress) return;
        supabaseDb.getUserActivity(walletAddress).then(data => {
            setActivity(data);
            setLoading(false);
        });
    }, [walletAddress]);

    if (loading) return <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-500" /></div>;

    return (
        <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-500 text-xs font-black uppercase tracking-widest border-b border-white/10">
                            <th className="pb-4 pl-4">Type</th>
                            <th className="pb-4">Market</th>
                            <th className="pb-4 text-center">Outcome</th>
                            <th className="pb-4 text-right">Amount</th>
                            <th className="pb-4 text-right pr-4">Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {activity.map((item, i) => {
                            if (item.market_slug?.includes('mkjm2hmf')) return null;

                            const marketName = (item.market_title || item.market_slug || '').replace(/-/g, ' ');
                            const isBuy = item.order_type === 'BUY' || (!item.order_type && item.amount > 0);
                            const typeColor = !isBuy ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20';
                            const outcomeName = item.outcome_name || (item.outcome_index === 0 ? 'Yes' : 'No');

                            return (
                                <tr
                                    key={i}
                                    onClick={() => router.push(`/market/${item.market_slug}`)}
                                    className="group hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <td className="py-4 pl-4">
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${typeColor}`}>
                                            {isBuy ? 'BUY' : 'SELL'}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0 relative">
                                                {item.market_icon ? (
                                                    <img src={item.market_icon} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">🔮</div>
                                                )}
                                            </div>
                                            <span className="font-bold text-white max-w-[200px] truncate capitalize">{marketName}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className={`text-xs font-black uppercase ${!isBuy ? 'text-red-500' : 'text-[#10B981]'}`}>
                                            {outcomeName}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-mono text-gray-300">{formatCompact(item.shares || 0)} Shares</span>
                                        </div>
                                    </td>
                                    <td className="py-4 text-right pr-4">
                                        <div className="flex flex-col items-end">
                                            <span className="font-black text-white">${formatCompact(item.amount || 0)}</span>
                                            <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {activity.length === 0 && (
                <div className="text-center py-10 text-gray-500 text-sm font-medium uppercase tracking-widest">No recent activity</div>
            )}
        </div>
    );
}

// --- MY MARKETS LIST ---
function MyMarketsList({ markets }: { markets: any[] }) {
    if (!markets || markets.length === 0) return (
        <div className="bg-black/50 border border-white/10 rounded-[2.5rem] p-20 text-center">
            <p className="text-gray-500 font-black uppercase tracking-widest">No markets created yet</p>
        </div>
    );

    // Helper to format date if string
    const formatDate = (d: any) => {
        try { return new Date(d).toLocaleDateString(); } catch (e) { return '-'; }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((m: any, i: number) => (
                <div key={i} className="bg-[#0D0D0D] border border-white/10 p-6 rounded-3xl hover:border-white/20 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                        <img src={m.icon} className="w-12 h-12 rounded-xl object-contain bg-white/5" />
                        <span className="bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">
                            {m.volume ? 'Verified' : 'Unverified'}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-[#F492B7] transition-colors line-clamp-2">{m.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                        <span>{m.type || 'Binary'}</span>
                        <span>{formatDate(m.createdAt || m.created_at)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}