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
    const [cropTarget, setCropTarget] = useState<'banner' | 'pfp' | null>(null);

    const initialProfile: {
        username: string;
        bio: string;
        pfp: string;
        banner: string;
        gems: number;
        profit: number;
        portfolio: number;
        winRate: number;
        biggestWin: number;
        medals: string[];
        activeBets: any[];
        closedBets: any[];
        achievements: any[];
        createdMarkets: any[];
        showGems: boolean;
    } = {
        username: "lord",
        bio: "The future is priced in. Controlling the Solana prediction bazaar with arcane precision.",
        pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=lord",
        banner: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070",
        gems: 0,
        profit: 0,
        portfolio: 0,
        winRate: 0,
        biggestWin: 0,
        medals: [],
        activeBets: [],
        closedBets: [],
        achievements: [
            {
                code: 'FIRST_MARKET',
                name: 'Genesis Creator',
                image_url: '/genesis.png',
                xp: 50
            }
        ],
        createdMarkets: [],
        showGems: true
    };

    const [profile, setProfile] = useState(initialProfile);

    const [tempName, setTempName] = useState(profile.username);
    const [tempBio, setTempBio] = useState(profile.bio);
    const [tempShowGems, setTempShowGems] = useState(true); // New temp state
    const [tempPfp, setTempPfp] = useState('');
    const [tempBanner, setTempBanner] = useState('');
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const pfpInputRef = useRef<HTMLInputElement>(null);

    // Sync temp state when modal opens or profile changes
    useEffect(() => {
        if (isEditModalOpen) {
            setTempName(profile.username);
            setTempBio(profile.bio);
            setTempShowGems(profile.showGems !== undefined ? profile.showGems : true);
            setTempPfp(profile.pfp);
            setTempBanner(profile.banner);
        }
    }, [isEditModalOpen, profile]);


    // --- 1. OBTENER SALDO REAL DE SOLANA ---
    useEffect(() => {
        if (!connection || !publicKey) return;
        connection.getBalance(publicKey).then((balance) => {
            const solAmount = balance / LAMPORTS_PER_SOL;
            setProfile(prev => ({ ...prev, portfolio: solAmount }));
        });

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

    // ... rest of existing state

    // 2. CARGA DE PERFIL (SUPABASE + LOCALSTORAGE) - SUPPORT FOR OTHER USERS
    useEffect(() => {
        if (isDefaultProfile) {
            setProfile({
                username: "New User",
                bio: "This user hasn't customized their profile yet.",
                pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
                banner: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070",
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

            let profileData: typeof initialProfile = { ...initialProfile, achievements: [] as any[] };
            let walletAddr: string | null = null;
            let isMe = false;

            try {
                // FORCE DEMO & TEST WALLET
                const TEST_WALLET = 'C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X';
                const currentWallet = publicKey?.toBase58();

                if (profileSlug.toLowerCase() === 'lord' || currentWallet === TEST_WALLET) {
                    isMe = true;
                    // Inject Achievements (Demo & Test Wallet)
                    const hasGenesis = profileData.achievements.some((a: any) => a.code === 'FIRST_MARKET');
                    if (!hasGenesis) {
                        profileData.achievements.push({
                            code: 'FIRST_MARKET',
                            name: 'Genesis Creator',
                            image_url: '/genesis-medal-v2.png',
                            xp: 100
                        });
                        if (!profileData.medals.includes('GENESIS')) profileData.medals.push('GENESIS');
                    }


                    // Inject Oracle Achievement
                    const hasOracle = profileData.achievements.some((a: any) => a.code === 'ORACLE');
                    if (!hasOracle) {
                        profileData.achievements.push({
                            code: 'ORACLE',
                            name: 'Grand Oracle',
                            image_url: '/orange-crystal-v2.png',
                            xp: 250
                        });
                        if (!profileData.medals.includes('ORACLE')) profileData.medals.push('ORACLE');
                    }

                    // Inject Diamond Hands Achievement
                    const hasDiamond = profileData.achievements.some((a: any) => a.code === 'DIAMOND_HANDS');
                    if (!hasDiamond) {
                        profileData.achievements.push({
                            code: 'DIAMOND_HANDS',
                            name: 'Diamond Hands',
                            image_url: '/diamond-crystal.png',
                            xp: 1000
                        });
                        if (!profileData.medals.includes('DIAMOND_HANDS')) profileData.medals.push('DIAMOND_HANDS');
                    }

                    // Inject Pink Crystal Achievement
                    const hasPink = profileData.achievements.some((a: any) => a.code === 'PINK_CRYSTAL');
                    if (!hasPink) {
                        profileData.achievements.push({
                            code: 'PINK_CRYSTAL',
                            name: 'Mystic Rose',
                            image_url: '/pink-crystal.png',
                            xp: 2000
                        });
                        if (!profileData.medals.includes('PINK_CRYSTAL')) profileData.medals.push('PINK_CRYSTAL');
                    }

                    // Inject Green Crystal Achievement
                    const hasGreen = profileData.achievements.some((a: any) => a.code === 'EMERALD_SAGE');
                    if (!hasGreen) {
                        profileData.achievements.push({
                            code: 'EMERALD_SAGE',
                            name: 'Emerald Sage',
                            image_url: '/green-crystal.png',
                            xp: 2500
                        });
                        if (!profileData.medals.includes('EMERALD_SAGE')) profileData.medals.push('EMERALD_SAGE');
                    }

                    // Inject Moon Crystal Achievement
                    const hasMoon = profileData.achievements.some((a: any) => a.code === 'MOON_DANCER');
                    if (!hasMoon) {
                        profileData.achievements.push({
                            code: 'MOON_DANCER',
                            name: 'Moon Dancer',
                            image_url: '/moon-crystal.png',
                            xp: 3000
                        });
                        if (!profileData.medals.includes('MOON_DANCER')) profileData.medals.push('MOON_DANCER');
                    }

                    // Inject Sniper Achievement
                    const hasSniper = profileData.achievements.some((a: any) => a.code === 'MARKET_SNIPER');
                    if (!hasSniper) {
                        profileData.achievements.push({
                            code: 'MARKET_SNIPER',
                            name: 'Market Sniper',
                            image_url: '/emerald-sniper.png',
                            xp: 5000
                        });
                        if (!profileData.medals.includes('MARKET_SNIPER')) profileData.medals.push('MARKET_SNIPER');
                    }

                    // Inject Apex Skull Achievement
                    const hasApex = profileData.achievements.some((a: any) => a.code === 'APEX_PREDATOR');
                    if (!hasApex) {
                        profileData.achievements.push({
                            code: 'APEX_PREDATOR',
                            name: 'Apex Predator',
                            image_url: '/apex-skull.png',
                            xp: 10000
                        });
                        if (!profileData.medals.includes('APEX_PREDATOR')) profileData.medals.push('APEX_PREDATOR');
                    }

                    // Inject Gold Trophy Achievement (Rank 1)
                    const hasTrophy = profileData.achievements.some((a: any) => a.code === 'THE_CHAMPION');
                    if (!hasTrophy) {
                        profileData.achievements.push({
                            code: 'THE_CHAMPION',
                            name: 'The Champion',
                            image_url: '/gold-trophy.png',
                            xp: 50000
                        });
                        // Auto-equip for demo/lord
                        if (!profileData.medals.includes('GOLD_TROPHY')) profileData.medals.unshift('GOLD_TROPHY');
                    }

                    // Inject Legendary Trader Achievement (Gems Trophy for Biggest Win)
                    const hasLegendary = profileData.achievements.some((a: any) => a.code === 'LEGENDARY_TRADER');
                    if (!hasLegendary) {
                        profileData.achievements.push({
                            code: 'LEGENDARY_TRADER',
                            name: 'Legendary Trader',
                            image_url: '/gems-trophy.png',
                            xp: 100000
                        });
                        // Auto-equip for demo/lord
                        if (!profileData.medals.includes('LEGENDARY_TRADER')) profileData.medals.unshift('LEGENDARY_TRADER');
                    }

                    // Cleanup legacy VOID_WALKER
                    profileData.medals = profileData.medals.filter(m => m !== 'VOID_WALKER');
                }

                // PRIORITY 1: If user has wallet connected, check if this is THEIR profile
                if (publicKey) {
                    const myWallet = publicKey.toBase58();

                    // Load saved profile from localStorage first (fast, avoids flash)
                    const savedLocal = localStorage.getItem('djinn_user_profile');
                    if (savedLocal) {
                        try {
                            const parsed = JSON.parse(savedLocal);
                            // Check if URL slug matches saved username (case insensitive)
                            if (parsed.username?.toLowerCase() === profileSlug.toLowerCase()) {
                                isMe = true;
                                walletAddr = myWallet;
                                setTargetWalletAddress(walletAddr);
                                // Apply saved data
                                profileData = {
                                    ...profileData,
                                    username: parsed.username || profileData.username,
                                    bio: parsed.bio || profileData.bio,
                                    pfp: parsed.pfp || profileData.pfp,
                                    banner: parsed.banner || profileData.banner,
                                    gems: parsed.gems || 0,
                                    profit: parsed.profit || 0,
                                    medals: parsed.medals || [],
                                    activeBets: parsed.activeBets || profileData.activeBets,
                                    createdMarkets: parsed.createdMarkets || []
                                };
                            }
                        } catch (e) {
                            console.error('Error parsing localStorage profile:', e);
                        }
                    }

                    // Also check: if slug is "LORD" (default), or slug IS the wallet address
                    // but user is authenticated -> treat as their profile
                    const isSlugLord = profileSlug.toLowerCase() === 'lord' || profileSlug.toLowerCase() === initialProfile.username.toLowerCase();
                    const isSlugMyWallet = profileSlug === myWallet;

                    if (!isMe && (isSlugLord || isSlugMyWallet)) {
                        isMe = true;
                        walletAddr = myWallet;
                        setTargetWalletAddress(walletAddr);

                        // Load from localStorage if available
                        if (savedLocal) {
                            try {
                                const parsed = JSON.parse(savedLocal);
                                profileData = {
                                    ...profileData,
                                    username: parsed.username || profileData.username,
                                    bio: parsed.bio || profileData.bio,
                                    pfp: parsed.pfp || profileData.pfp,
                                    banner: parsed.banner || profileData.banner,
                                    gems: parsed.gems || 0,
                                    profit: parsed.profit || 0,
                                    medals: parsed.medals || [],
                                    activeBets: parsed.activeBets || profileData.activeBets,
                                    createdMarkets: parsed.createdMarkets || []
                                };
                            } catch (e) {
                                console.error('Error parsing saved profile:', e);
                            }
                        }
                    }

                    // Try to enhance with Supabase data if available
                    if (isMe) {
                        const dbProfile = await supabaseDb.getProfile(myWallet);
                        if (dbProfile) {
                            // Supabase overwrites localStorage for certain fields
                            if (dbProfile.avatar_url) profileData.pfp = dbProfile.avatar_url;
                            if (dbProfile.banner_url) profileData.banner = dbProfile.banner_url;
                            if (dbProfile.bio) profileData.bio = dbProfile.bio;
                            if (dbProfile.username) profileData.username = dbProfile.username;
                        }
                    }
                }

                // PRIORITY 2: If not my profile, check if viewing someone else's profile
                if (!isMe) {
                    // Try to find user in activity by username
                    const allProfiles = await supabaseDb.getActivity();
                    const userActivity = allProfiles.find((a: any) =>
                        a.username?.toLowerCase() === profileSlug.toLowerCase()
                    );

                    if (userActivity) {
                        walletAddr = userActivity.wallet_address;
                        setTargetWalletAddress(walletAddr);

                        // Load their profile from Supabase
                        const profileDb = await supabaseDb.getProfile(walletAddr);
                        if (profileDb) {
                            profileData.username = profileDb.username;
                            profileData.bio = profileDb.bio || profileData.bio;
                            profileData.pfp = profileDb.avatar_url || profileData.pfp;
                            profileData.banner = profileDb.banner_url || profileData.banner;
                        } else {
                            profileData.username = userActivity.username;
                        }
                    } else if (profileSlug.toLowerCase() !== 'lord' && profileSlug.toLowerCase() !== initialProfile.username.toLowerCase()) {
                        // GHOST PROFILE - user doesn't exist
                        profileData = {
                            ...initialProfile,
                            username: profileSlug,
                            bio: "This Djinn has not yet manifested fully in this realm.",
                            pfp: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileSlug}`,
                            gems: 0,
                            profit: 0,
                            portfolio: 0,
                            activeBets: [],
                            createdMarkets: [],
                            medals: [],
                            achievements: [],
                            showGems: true
                        };
                    }
                }

                // Load created markets from localStorage (for all profiles, user created markets are stored locally)
                const savedMarkets = localStorage.getItem('djinn_markets');
                if (savedMarkets && isMe) {
                    profileData.createdMarkets = JSON.parse(savedMarkets);
                }

                setIsMyProfile(isMe);
                setProfile(profileData);

                // Load active bets - use publicKey if it's my profile, otherwise use walletAddr
                const betsWallet = isMe && publicKey ? publicKey.toBase58() : walletAddr;
                if (betsWallet) {
                    loadActiveBets(betsWallet);
                    // Load Achievements
                    supabaseDb.getUserAchievements(betsWallet).then(achievements => {
                        setProfile(prev => ({ ...prev, achievements }));
                    });
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [isDefaultProfile, publicKey, profileSlug]);

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
        setProfile(newData);

        // Guardar estado local (bets, medals, stats)
        const { createdMarkets, portfolio, ...profileToSave } = newData;
        localStorage.setItem('djinn_user_profile', JSON.stringify(profileToSave));

        // Guardar identidad en Supabase
        if (publicKey) {
            await supabaseDb.upsertProfile({
                wallet_address: publicKey.toBase58(),
                username: newData.username,
                bio: newData.bio,
                avatar_url: newData.pfp,
                banner_url: newData.banner
            });
        }
    };

    const saveIdentity = () => {
        const updated = {
            ...profile,
            username: tempName || profile.username,
            bio: tempBio || profile.bio,
            pfp: tempPfp || profile.pfp,
            banner: tempBanner || profile.banner
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

    const addMedal = (medal: string = "🔮") => {
        if (profile.medals.length < 9) {
            updateAndSave({ ...profile, medals: [...profile.medals, medal] });
        }
    };

    const removeMedal = (index: number) => {
        const newMedals = profile.medals.filter((_, i) => i !== index);
        updateAndSave({ ...profile, medals: newMedals });
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'pfp') => {
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
        if (cropTarget === 'banner') {
            setTempBanner(croppedImage);
        } else if (cropTarget === 'pfp') {
            setTempPfp(croppedImage);
        }
        setCroppingFile(null);
        setCropTarget(null);
    };

    const handleCropCancel = () => {
        setCroppingFile(null);
        setCropTarget(null);
        // Reset inputs
        if (bannerInputRef.current) bannerInputRef.current.value = '';
        if (pfpInputRef.current) pfpInputRef.current.value = '';
    };

    return (
        <main className="min-h-screen text-white font-sans pb-40 selection:bg-[#F492B7] pt-52">
            {/* IMAGE CROPPER MODAL */}
            {croppingFile && (
                <ImageCropper
                    imageSrc={croppingFile}
                    aspectRatio={cropTarget === 'banner' ? 320 / 100 : 1} // Banner ~3.2:1 (ish), PFP 1:1. Let's adjust banner ratio dynamically if needed but 3:1 is a safe bet for a wide banner. User has h-320 w-screen... screen varies. Let's pick a wide standard 3:1.
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}
            {/* BANNER */}
            <div className="w-full h-[320px] relative overflow-hidden bg-[#0A0A0A] -mt-32 border-b border-white/5 shadow-2xl">
                <img src={profile.banner} className="w-full h-full object-cover object-center" alt="" />
            </div>

            <div className="max-w-[1600px] mx-auto px-14">
                {/* PROFILE HEADER - Start below banner */}
                {/* PROFILE HEADER - Start below banner */}
                <div className="flex items-start gap-12 -mt-32 relative z-10 mb-8">
                    <div className="w-60 h-60 rounded-full border-[6px] border-black overflow-hidden bg-black shadow-2xl">
                        <img src={profile.pfp} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="mt-36 flex-1">
                        <div className="flex items-center justify-between align-middle mb-2">
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
                                </div>
                            </div>
                            {/* EDIT PROFILE BUTTON - MOVED TO TOP RIGHT */}
                            {(isMyProfile || profile.username.toLowerCase() === 'lord') && (
                                <button
                                    onClick={() => {
                                        setTempName(profile.username);
                                        setTempBio(profile.bio);
                                        setTempPfp(profile.pfp);
                                        setTempBanner(profile.banner);
                                        setIsEditModalOpen(true);
                                    }}
                                    className="border border-white/20 bg-[#F492B7] text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-[#F492B7]/20 flex items-center gap-2 ml-auto"
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

                        {/* Wallet address - click anywhere to copy */}
                        {targetWalletAddress && (
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(targetWalletAddress);
                                    // Visual feedback
                                    const btn = document.getElementById('wallet-copy-btn');
                                    if (btn) {
                                        btn.textContent = '✅ Copied!';
                                        setTimeout(() => { btn.textContent = '📋 Copy'; }, 1500);
                                    }
                                }}
                                className="flex items-center gap-2 mt-4 group cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                <span className="text-gray-600 text-sm font-mono bg-white/5 px-3 py-1 rounded-lg group-hover:bg-white/10 transition-colors">
                                    {targetWalletAddress.slice(0, 6)}...{targetWalletAddress.slice(-4)}
                                </span>
                                <span id="wallet-copy-btn" className="text-gray-500 group-hover:text-[#F492B7] transition-colors text-xs">
                                    📋 Copy
                                </span>
                            </button>
                        )}


                    </div>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        label="Wallet balance"
                        value={`${profile.portfolio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SOL`}
                    />
                    <StatCard label="Win rate" value="0.0%" color="text-[#F492B7]" />
                    <StatCard label="Biggest win" value="+$0" color="text-[#10B981]" />
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
                    tempBanner={tempBanner}
                    tempPfp={tempPfp}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={saveIdentity}
                    addMedal={addMedal}
                    removeMedal={removeMedal}
                    bannerInputRef={bannerInputRef}
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
function EditModal({ profile, tempName, tempBio, setTempName, setTempBio, tempBanner, tempPfp, showGems, setShowGems, onClose, onSave, addMedal, removeMedal, bannerInputRef, pfpInputRef, handleFileChange }: any) {
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
                        {/* BANNER PREVIEW */}
                        <div className="w-full">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 ml-1">Profile Banner</p>
                            <button onClick={() => bannerInputRef.current?.click()} className="w-full h-40 bg-[#0A0A0A] border border-dashed border-white/20 rounded-3xl overflow-hidden relative group hover:border-[#F492B7]/40 transition-all cursor-pointer">
                                <img src={tempBanner || profile.banner} className="w-full h-full object-cover object-center opacity-70 group-hover:opacity-100 transition-all duration-500" alt="Banner Preview" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                                    <span className="text-xs font-black uppercase tracking-widest text-white border border-white/20 px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md group-hover:bg-[#F492B7] group-hover:text-black group-hover:border-[#F492B7] transition-all">Change Banner</span>
                                </div>
                            </button>
                        </div>

                        {/* PFP & DETAILS ROW */}
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
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Username</p>
                                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-[#F492B7] transition-all" placeholder="Username" value={tempName} onChange={(e) => setTempName(e.target.value)} />
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
                <input type="file" ref={bannerInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
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