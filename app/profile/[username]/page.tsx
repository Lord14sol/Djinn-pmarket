'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

// --- SOLANA IMPORTS PARA SALDO REAL ---
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// --- RECHARTS ---
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import * as supabaseDb from '@/lib/supabase-db';

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();

    // SOLANA HOOKS
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [betTab, setBetTab] = useState<'active' | 'closed'>('active');

    const initialProfile = {
        username: "LORD",
        bio: "The future is priced in. Controlling the Solana prediction bazaar with arcane precision.",
        pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=lord",
        banner: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070",
        gems: 0,
        profit: 15375.00,
        portfolio: 0,
        winRate: 68.5,
        biggestWin: 2450,
        medals: ["🏆", "🥇", "💎", "🔥"],
        activeBets: [
            { id: '1', title: "Will Bitcoin reach $100k by end of January 2026?", invested: 500, current: 725, side: "YES", change: "+45.0%", profit: 225 },
            { id: '2', title: "Tesla stock above $300 by Q2 2026", invested: 300, current: 340, side: "NO", change: "+13.3%", profit: 40 },
            { id: '3', title: "Will Apple announce AR glasses in 2026?", invested: 750, current: 690, side: "YES", change: "-8.0%", profit: -60 },
            { id: '4', title: "Ethereum merge to finality in Q1 2026", invested: 450, current: 580, side: "YES", change: "+28.9%", profit: 130 }
        ],
        closedBets: [],
        createdMarkets: []
    };

    const [profile, setProfile] = useState(initialProfile);
    const [tempName, setTempName] = useState(profile.username);
    const [tempBio, setTempBio] = useState(profile.bio);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const pfpInputRef = useRef<HTMLInputElement>(null);

    // --- 1. OBTENER SALDO REAL DE SOLANA ---
    useEffect(() => {
        if (!connection || !publicKey) return;
        connection.getBalance(publicKey).then((balance) => {
            const solAmount = balance / LAMPORTS_PER_SOL;
            setProfile(prev => ({ ...prev, portfolio: solAmount }));
        });
    }, [connection, publicKey]);

    // El slug del perfil
    const profileSlug = params.username as string;
    const isDefaultProfile = profileSlug === 'default';
    const [isMyProfile, setIsMyProfile] = useState(false);
    const [targetWalletAddress, setTargetWalletAddress] = useState<string | null>(null);

    // 2. CARGA DE PERFIL (SUPABASE + LOCALSTORAGE) - SUPPORT FOR OTHER USERS
    useEffect(() => {
        if (isDefaultProfile) {
            setProfile({
                username: "New User",
                bio: "This user hasn't customized their profile yet.",
                pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
                banner: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070",
                gems: 0, profit: 0, portfolio: 0, winRate: 0, biggestWin: 0, medals: [], activeBets: [], closedBets: [], createdMarkets: []
            });
            setIsMyProfile(false);
            return;
        }

        const loadProfile = async () => {
            try {
                // First, try to load profile by username from Supabase
                const allProfiles = await supabaseDb.getActivity(); // Get all to filter by username
                // Find the user's wallet by looking up their username in activity
                const userActivity = allProfiles.find((a: any) => a.username === profileSlug);

                let profileData = { ...initialProfile };
                let walletAddr: string | null = null;

                if (userActivity) {
                    walletAddr = userActivity.wallet_address;
                    setTargetWalletAddress(walletAddr);

                    // Load profile from Supabase
                    const profileDb = await supabaseDb.getProfile(walletAddr);
                    if (profileDb) {
                        profileData.username = profileDb.username;
                        profileData.bio = profileDb.bio || profileData.bio;
                        profileData.pfp = profileDb.avatar_url || profileData.pfp;
                        profileData.banner = profileDb.banner_url || profileData.banner;
                    }
                } else if (publicKey) {
                    // Fallback: if username not found in activity, check if viewing own profile
                    const myProfile = await supabaseDb.getProfile(publicKey.toBase58());
                    if (myProfile && myProfile.username === profileSlug) {
                        walletAddr = publicKey.toBase58();
                        setTargetWalletAddress(walletAddr);
                        profileData.username = myProfile.username;
                        profileData.bio = myProfile.bio || profileData.bio;
                        profileData.pfp = myProfile.avatar_url || profileData.pfp;
                        profileData.banner = myProfile.banner_url || profileData.banner;
                    } else {
                        // Load from localStorage as last resort
                        const savedProfileLocal = localStorage.getItem('djinn_user_profile');
                        if (savedProfileLocal) {
                            const parsed = JSON.parse(savedProfileLocal);
                            if (parsed.username === profileSlug) {
                                const { portfolio, ...rest } = parsed;
                                profileData = { ...profileData, ...rest };
                                walletAddr = publicKey.toBase58();
                                setTargetWalletAddress(walletAddr);
                            }
                        }
                    }
                }

                // Check if viewing own profile
                setIsMyProfile(publicKey ? walletAddr === publicKey.toBase58() : false);

                // Load created markets from localStorage
                const savedMarkets = localStorage.getItem('djinn_markets');
                if (savedMarkets) profileData.createdMarkets = JSON.parse(savedMarkets);

                setProfile(profileData);

                // Load active bets if we have a wallet address
                if (walletAddr) {
                    loadActiveBets(walletAddr);
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            }
        };

        loadProfile();
    }, [isDefaultProfile, publicKey, profileSlug]);

    // 3. LOAD ACTIVE BETS FROM SUPABASE
    const loadActiveBets = async (walletAddress: string) => {
        try {
            const activity = await supabaseDb.getActivity();
            const userActivity = activity.filter((a: any) => a.wallet_address === walletAddress);

            // Transform activity into bet format
            const bets = await Promise.all(userActivity.map(async (act: any) => {
                // Fetch current market price to calculate profit
                const marketData = await supabaseDb.getMarketData(act.market_slug);
                const currentPrice = marketData?.live_price || 50;

                // Calculate based on YES/NO position
                const purchasePrice = act.action === 'YES' ? currentPrice : (100 - currentPrice);
                const invested = act.amount || 0;
                const shares = act.shares || 0;

                // Simple profit calculation (shares value at current price - invested)
                const currentValue = shares * (purchasePrice / 100);
                const profit = currentValue - invested;
                const change = invested > 0 ? ((profit / invested) * 100).toFixed(1) : '0.0';

                return {
                    id: act.id || act.market_slug,
                    title: act.market_title,
                    invested,
                    current: currentValue,
                    side: act.action,
                    change: `${profit >= 0 ? '+' : ''}${change}%`,
                    profit
                };
            }));

            setProfile(prev => ({ ...prev, activeBets: bets }));
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
        const updated = { ...profile, username: tempName || profile.username, bio: tempBio || profile.bio };
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

    const addMedal = () => {
        if (profile.medals.length < 5) {
            updateAndSave({ ...profile, medals: [...profile.medals, "🔮"] });
        }
    };

    const removeMedal = (index: number) => {
        const newMedals = profile.medals.filter((_, i) => i !== index);
        updateAndSave({ ...profile, medals: newMedals });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'pfp') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newData = { ...profile, [type]: reader.result as string };
                updateAndSave(newData);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white font-sans pb-40 selection:bg-[#F492B7] pt-32">
            {/* BANNER */}
            <div className="w-full h-[420px] relative overflow-hidden bg-[#0A0A0A] -mt-32">
                <img src={profile.banner} className="w-full h-full object-cover opacity-90" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent" />
                {!isDefaultProfile && (
                    <button
                        onClick={() => { setTempName(profile.username); setTempBio(profile.bio); setIsEditModalOpen(true); }}
                        className="absolute bottom-10 right-14 border border-white/20 bg-black/50 backdrop-blur-xl text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] z-20 hover:bg-[#F492B7] hover:text-black transition-all"
                    >
                        ✎ Edit Profile
                    </button>
                )}
            </div>

            <div className="max-w-[1600px] mx-auto px-14">
                {/* PROFILE HEADER */}
                <div className="flex items-start gap-12 -mt-24 relative z-10 mb-20">
                    <div className="w-60 h-60 rounded-full border-[6px] border-black overflow-hidden bg-black shadow-2xl">
                        <img src={profile.pfp} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="mt-28 flex-1">
                        <h1 className="text-7xl font-black tracking-tighter uppercase leading-none drop-shadow-2xl">{profile.username}</h1>
                        {/* Bio estilo Twitter - sin barra lateral */}
                        <p className="text-gray-400 text-lg mt-4 max-w-2xl leading-relaxed">{profile.bio}</p>

                        {/* Gems flexeadas debajo del bio */}
                        <div className="flex items-center gap-3 mt-6">
                            <span className="text-4xl font-[900] text-white" style={{ textShadow: '0 0 30px rgba(244,146,183,0.4)' }}>
                                {profile.gems.toLocaleString('en-US')}
                            </span>
                            <span className="text-[#F492B7] text-sm font-black uppercase tracking-widest">💎 Gems</span>
                        </div>

                        {/* Wallet address */}
                        {targetWalletAddress && (
                            <div className="flex items-center gap-2 mt-4">
                                <span className="text-gray-600 text-sm font-mono bg-white/5 px-3 py-1 rounded-lg">
                                    {targetWalletAddress.slice(0, 6)}...{targetWalletAddress.slice(-4)}
                                </span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(targetWalletAddress)}
                                    className="text-gray-500 hover:text-[#F492B7] transition-colors text-xs"
                                >
                                    📋 Copy
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        label="WALLET BALANCE"
                        value={`${profile.portfolio.toLocaleString('en-US', { minimumFractionDigits: 2 })} SOL`}
                    />
                    <StatCard label="WIN RATE" value={`${profile.winRate.toFixed(1)}%`} color="text-[#F492B7]" />
                    <StatCard label="BIGGEST WIN" value={`+$${profile.biggestWin.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} color="text-[#10B981]" />
                    <StatCard label="MARKETS CREATED" value={profile.createdMarkets?.length || 0} color="text-blue-400" />
                </div>

                {/* P/L CHART - POLYMARKET STYLE */}
                <ProfitLossCard profit={profile.profit} activeBets={profile.activeBets} />

                {/* CREATOR REWARDS - PUMPFUN STYLE */}
                {profile.createdMarkets && profile.createdMarkets.length > 0 && (
                    <CreatorRewardsCard createdMarkets={profile.createdMarkets} />
                )}

                {/* CREATED MARKETS */}
                <div className="mt-32 mb-32 space-y-12">
                    <h3 className="text-5xl font-black uppercase tracking-tighter">My Markets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {profile.createdMarkets && profile.createdMarkets.length > 0 ? (
                            profile.createdMarkets.map((market: any) => (
                                <MarketCard key={market.id} market={market} router={router} />
                            ))
                        ) : (
                            <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[3.5rem] bg-white/[0.01]">
                                <p className="text-gray-600 font-black uppercase tracking-[0.4em] italic opacity-40 text-xl">No markets summoned yet, Master.</p>
                                <p className="text-gray-700 text-sm mt-4">Create your first prediction market to get started</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ACTIVE BETS */}
                <div className="border-t border-white/5 pt-20">
                    <h3 className="text-5xl font-black uppercase tracking-tighter mb-12">Active Bets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {profile.activeBets.map((bet: any) => (
                            <BetCard key={bet.id} bet={bet} onCashOut={handleCashOut} router={router} />
                        ))}
                    </div>
                </div>
            </div>

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <EditModal
                    profile={profile}
                    tempName={tempName}
                    tempBio={tempBio}
                    setTempName={setTempName}
                    setTempBio={setTempBio}
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
            <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] mb-4">{label}</p>
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

    const handleShare = () => {
        setShowShareModal(true);
    };

    const handleCopyShare = () => {
        const shareText = `🔮 I'm ${isPositive ? 'up' : 'down'} ${bet.change} on "${bet.title}" | Djinn Markets`;
        navigator.clipboard.writeText(shareText);
        alert('📋 Copied to clipboard!');
    };

    return (
        <>
            <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-[2rem] p-6 hover:border-[#F492B7]/30 transition-all group relative overflow-hidden">
                {/* Background glow based on profit */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${isPositive ? 'bg-[#10B981]/10' : 'bg-red-500/10'} rounded-full blur-2xl pointer-events-none`}></div>

                {/* Djinn watermark */}
                <div className="absolute bottom-4 right-4 opacity-10 pointer-events-none">
                    <div className="flex items-center gap-0">
                        <img src="/star.png" alt="" className="w-16 h-16 -mr-2" />
                        <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>Djinn</span>
                    </div>
                </div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <span className={`text-[11px] font-black px-4 py-2 rounded-lg ${bet.side === 'YES' ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>{bet.side}</span>
                        <button
                            onClick={handleShare}
                            className="text-gray-500 hover:text-[#F492B7] transition-colors text-xs font-bold flex items-center gap-1"
                        >
                            📤 Share
                        </button>
                    </div>

                    {/* Title */}
                    <h4 onClick={() => router.push(`/market/${bet.id}`)} className="text-lg font-bold text-white mb-6 leading-tight hover:text-[#F492B7] cursor-pointer line-clamp-2">{bet.title}</h4>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Invested</p>
                            <p className="text-white text-xl font-black">${bet.invested.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Value</p>
                            <p className="text-white text-xl font-black">${bet.current.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Profit */}
                    <div className={`rounded-xl p-4 mb-4 ${isPositive ? 'bg-[#10B981]/10 border border-[#10B981]/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`text-3xl ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>{isPositive ? '↗' : '↘'}</span>
                                <span className={`text-2xl font-black ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>{isPositive ? '+' : ''}${bet.profit.toFixed(2)}</span>
                            </div>
                            <span className={`text-xl font-black ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>{bet.change}</span>
                        </div>
                    </div>

                    {/* Cash Out button */}
                    <button onClick={() => onCashOut(bet.id)} className="w-full bg-[#F492B7] text-black py-4 rounded-xl text-sm font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-[0_0_20px_rgba(244,146,183,0.2)]">Cash Out</button>
                </div>
            </div>

            {/* SHARE MODAL */}
            {showShareModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl" onClick={() => setShowShareModal(false)}>
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
                                        <p className="text-white text-lg font-black">${bet.current}</p>
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

function EditModal({ profile, tempName, tempBio, setTempName, setTempBio, onClose, onSave, addMedal, removeMedal, bannerInputRef, pfpInputRef, handleFileChange }: any) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/98 backdrop-blur-2xl">
            <div className="relative bg-[#080808] border border-white/10 w-full max-w-2xl rounded-[3.5rem] p-14 shadow-2xl">
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 text-[#F492B7]">Edit Identity</h2>
                <div className="mb-12 border-b border-white/10 pb-10">
                    <label className="text-[11px] font-black text-gray-700 mb-6 block">Manage Medals (Max 5)</label>
                    <div className="flex gap-4">
                        {profile.medals.map((medal: string, i: number) => (
                            <button key={i} onClick={() => removeMedal(i)} className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl border border-red-500/20 group hover:border-red-500/50 transition-all"><span className="group-hover:hidden">{medal}</span><span className="hidden group-hover:block text-red-500 font-bold text-xl">×</span></button>
                        ))}
                        {profile.medals.length < 5 && <button onClick={addMedal} className="w-16 h-16 rounded-full border-2 border-dashed border-[#F492B7]/40 text-2xl text-[#F492B7] hover:bg-[#F492B7]/10 transition-all">+</button>}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                        <button onClick={() => bannerInputRef.current?.click()} className="p-10 bg-white/5 border border-dashed border-white/20 rounded-3xl flex flex-col items-center hover:border-[#F492B7]/40 transition-all"><span className="text-[11px] font-black uppercase mb-4 opacity-60">Banner</span><img src={profile.banner} className="h-16 w-32 object-cover rounded-xl" alt="" /></button>
                        <button onClick={() => pfpInputRef.current?.click()} className="p-10 bg-white/5 border border-dashed border-white/20 rounded-3xl flex flex-col items-center hover:border-[#F492B7]/40 transition-all"><span className="text-[11px] font-black uppercase mb-4 opacity-60">PFP</span><img src={profile.pfp} className="h-16 w-16 object-cover rounded-full border-2 border-[#F492B7]" alt="" /></button>
                    </div>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-black outline-none focus:border-[#F492B7] transition-all" placeholder="Username" value={tempName} onChange={(e) => setTempName(e.target.value)} />
                    <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg outline-none h-32 resize-none focus:border-[#F492B7] transition-all" placeholder="Bio" value={tempBio} onChange={(e) => setTempBio(e.target.value)} />
                </div>
                <input type="file" ref={bannerInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
                <input type="file" ref={pfpInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'pfp')} />
                <div className="flex gap-4 mt-14">
                    <button onClick={onClose} className="flex-1 bg-white/5 text-white py-7 rounded-3xl font-black uppercase text-sm hover:bg-white/10 transition-all">Cancel</button>
                    <button onClick={onSave} className="flex-1 bg-[#F492B7] text-black py-7 rounded-3xl font-black uppercase text-sm shadow-2xl hover:brightness-110 transition-all">Save Changes</button>
                </div>
            </div>
        </div>
    );
}

// --- PROFIT/LOSS CARD - POLYMARKET STYLE ---
function ProfitLossCard({ profit, activeBets }: { profit: number; activeBets: any[] }) {
    const [period, setPeriod] = useState<'1D' | '1W' | '1M' | 'ALL'>('1M');

    // Generate chart data based on period
    const generateChartData = () => {
        const dataPoints = period === '1D' ? 24 : period === '1W' ? 7 : period === '1M' ? 30 : 90;
        const data = [];
        let cumulative = 0;

        for (let i = 0; i < dataPoints; i++) {
            const change = (Math.random() - 0.45) * (profit / dataPoints);
            cumulative += change;
            data.push({
                time: i,
                value: Math.max(0, cumulative),
                label: period === '1D' ? `${i}h` : period === '1W' ? `Day ${i + 1}` : `${i + 1}`
            });
        }
        // Ensure last value matches actual profit
        if (data.length > 0) {
            data[data.length - 1].value = Math.max(0, profit);
        }
        return data;
    };

    const chartData = generateChartData();
    const isPositive = profit >= 0;
    const periodLabels = { '1D': 'Past Day', '1W': 'Past Week', '1M': 'Past Month', 'ALL': 'All Time' };

    return (
        <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-[2.5rem] p-10 mb-12 shadow-2xl relative overflow-hidden">
            {/* Background glow */}
            <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${isPositive ? 'from-[#10B981]/5' : 'from-red-500/5'} via-transparent to-transparent pointer-events-none`}></div>

            <div className="relative z-10">
                {/* Header with period selector */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className={`${isPositive ? 'text-[#10B981]' : 'text-red-500'} text-xs font-black uppercase tracking-[0.2em]`}>
                            {isPositive ? '▲' : '▼'} Profit/Loss
                        </span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                        {(['1D', '1W', '1M', 'ALL'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 text-sm font-black rounded-lg transition-all ${period === p
                                    ? 'bg-[#F492B7]/20 text-[#F492B7] border border-[#F492B7]/30'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Value */}
                <div className="mb-2">
                    <h2 className={`text-5xl font-[900] ${isPositive ? 'text-[#10B981]' : 'text-red-500'} tracking-tighter italic leading-none`}>
                        ${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mt-2">{periodLabels[period]}</p>
                </div>

                {/* Chart with Djinn Watermark */}
                <div className="h-48 mt-8 bg-black/40 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }} />
                    {/* Djinn watermark - same as MarketChart */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.12]">
                        <div className="flex items-center gap-0">
                            <img src="/star.png" alt="" className="w-40 h-40 -mr-4" />
                            <span className="text-6xl font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>Djinn</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#F492B7" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#F492B7" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="label" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{
                                    background: '#0A0A0A',
                                    border: '1px solid rgba(244, 146, 183, 0.2)',
                                    borderRadius: '12px',
                                    padding: '8px 12px'
                                }}
                                labelStyle={{ color: '#999', fontSize: 10 }}
                                formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Value']}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#F492B7"
                                strokeWidth={2}
                                fill="url(#profitGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

// --- CREATOR REWARDS CARD - DJINN STYLE ---
function CreatorRewardsCard({ createdMarkets }: { createdMarkets: any[] }) {
    const [period, setPeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'all'>('1W');

    // Mock rewards data
    const totalRewards = createdMarkets.length * 0.03 * 180; // Estimated from creation fees
    const solRewards = totalRewards / 180; // Mock conversion
    const unclaimedRewards = totalRewards * 0.3;
    const unclaimedSol = solRewards * 0.3;

    // Generate rewards chart data
    const generateRewardsData = () => {
        const dataPoints = period === '1D' ? 24 : period === '1W' ? 7 : period === '1M' ? 30 : 90;
        const data = [];
        let cumulative = 0;

        for (let i = 0; i < dataPoints; i++) {
            cumulative += (totalRewards / dataPoints) * (0.8 + Math.random() * 0.4);
            data.push({
                time: i,
                value: cumulative
            });
        }
        return data;
    };

    const chartData = generateRewardsData();

    return (
        <div className="bg-gradient-to-br from-[#0D0D0D] to-black border border-white/10 rounded-[2.5rem] p-10 mb-12 shadow-2xl relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#F492B7]/5 via-transparent to-transparent pointer-events-none"></div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Creator Rewards</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (typeof window !== 'undefined' && (window as any).solana) {
                                    alert(`✅ Claiming ${unclaimedSol.toFixed(3)} SOL to your connected wallet...\n\nThis would send the accumulated creator fees to your wallet.`);
                                } else {
                                    alert('⚠️ Please connect your wallet first to claim rewards!');
                                }
                            }}
                            className="px-5 py-2.5 bg-[#10B981] text-white font-black text-sm rounded-xl hover:bg-[#0ea472] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        >
                            💰 Claim {unclaimedSol.toFixed(3)} SOL
                        </button>
                        <button className="px-5 py-2.5 bg-white/5 border border-white/10 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all">
                            Share
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div>
                        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Total</p>
                        <p className="text-5xl font-[900] text-[#10B981] tracking-tighter italic leading-none">
                            ${totalRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-gray-500 text-sm mt-2">{solRewards.toFixed(3)} SOL</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Unclaimed</p>
                        <p className="text-5xl font-[900] text-[#F492B7] tracking-tighter italic leading-none">
                            ${unclaimedRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-gray-500 text-sm mt-2">{unclaimedSol.toFixed(3)} SOL</p>
                    </div>
                </div>

                {/* Chart with Djinn Watermark */}
                <div className="h-48 mb-6 relative overflow-hidden">
                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }} />
                    {/* Djinn watermark - same as MarketChart */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.12]">
                        <div className="flex items-center gap-0">
                            <img src="/star.png" alt="" className="w-40 h-40 -mr-4" />
                            <span className="text-6xl font-bold text-white" style={{ fontFamily: 'var(--font-adriane), serif' }}>Djinn</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="rewardsGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#F492B7" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#F492B7" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#F492B7"
                                strokeWidth={2}
                                fill="url(#rewardsGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Period selector */}
                <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 w-fit">
                    {(['1D', '1W', '1M', '3M', '1Y', 'all'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-2 text-xs font-black rounded-lg transition-all ${period === p
                                ? 'bg-[#F492B7]/20 text-[#F492B7] border border-[#F492B7]/30'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
}