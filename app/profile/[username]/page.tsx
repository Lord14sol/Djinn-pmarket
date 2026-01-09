'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [betTab, setBetTab] = useState<'active' | 'closed'>('active');

    const initialProfile = {
        username: "LORD",
        bio: "The future is priced in. Controlling the Solana prediction bazaar with arcane precision.",
        pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=lord",
        banner: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070",
        gems: 1250,
        profit: 15375.00,
        portfolio: 27785.00,
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

    // CARGA AUTOMÁTICA DE MERCADOS CREADOS
    useEffect(() => {
        const loadEverything = () => {
            const savedProfile = localStorage.getItem('djinn_user_profile');
            const savedMarkets = localStorage.getItem('djinn_markets');

            setProfile(prev => {
                let updated = { ...prev };
                if (savedProfile) {
                    const parsed = JSON.parse(savedProfile);
                    updated = { ...updated, ...parsed };
                }
                if (savedMarkets) {
                    const markets = JSON.parse(savedMarkets);
                    updated.createdMarkets = markets;
                }
                return updated;
            });
        };

        loadEverything();
        window.addEventListener('storage', loadEverything);
        const interval = setInterval(loadEverything, 1000);
        return () => {
            window.removeEventListener('storage', loadEverything);
            clearInterval(interval);
        };
    }, []);

    const updateAndSave = (newData: any) => {
        setProfile(newData);
        const { createdMarkets, ...profileToSave } = newData;
        localStorage.setItem('djinn_user_profile', JSON.stringify(profileToSave));
    };

    const saveIdentity = () => {
        const updated = { ...profile, username: tempName || profile.username, bio: tempBio || profile.bio };
        updateAndSave(updated);
        setIsEditModalOpen(false);
    };

    const handleCashOut = (betId: string) => {
        const bet = profile.activeBets.find(b => b.id === betId);
        if (!bet) return;
        const profitChange = bet.current - bet.invested;
        const newActive = profile.activeBets.filter(b => b.id !== betId);
        const newClosed = [...profile.closedBets, { ...bet, closedAt: bet.current }];
        const updated = {
            ...profile,
            activeBets: newActive,
            closedBets: newClosed,
            profit: profile.profit + profitChange,
            portfolio: profile.portfolio - bet.invested,
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
                updateAndSave({ ...profile, [type]: reader.result as string });
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
                <button
                    onClick={() => { setTempName(profile.username); setTempBio(profile.bio); setIsEditModalOpen(true); }}
                    className="absolute bottom-10 right-14 border border-white/20 bg-black/50 backdrop-blur-xl text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] z-20 hover:bg-[#F492B7] hover:text-black transition-all"
                >
                    ✎ Edit Profile
                </button>
            </div>

            <div className="max-w-[1600px] mx-auto px-14">
                {/* PROFILE HEADER */}
                <div className="flex items-start gap-12 -mt-24 relative z-10 mb-20">
                    <div className="w-60 h-60 rounded-full border-[8px] border-black overflow-hidden bg-black ring-2 ring-[#F492B7]/40 shadow-2xl">
                        <img src={profile.pfp} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="mt-28">
                        <h1 className="text-7xl font-black tracking-tighter uppercase leading-none drop-shadow-2xl">{profile.username}</h1>
                        <p className="text-gray-400 text-xl mt-6 border-l-4 border-[#F492B7] pl-8 italic max-w-2xl">{profile.bio}</p>
                    </div>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    <StatCard label="PORTFOLIO" value={`$${profile.portfolio.toLocaleString()}`} />
                    <StatCard label="WIN RATE" value={`${profile.winRate}%`} color="text-[#F492B7]" />
                    <StatCard label="BIGGEST WIN" value={`+$${profile.biggestWin.toLocaleString()}`} color="text-[#10B981]" />
                    <StatCard label="MARKETS CREATED" value={profile.createdMarkets?.length || 0} color="text-blue-400" />
                </div>

                {/* P/L CHART CON GRÁFICO */}
                <div className="bg-[#0D0D0D] border border-white/5 rounded-[3rem] p-10 mb-12 shadow-2xl">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-2">P/L PERFORMANCE</p>
                            <h2 className="text-6xl font-black tracking-tighter text-[#10B981]">+${profile.profit.toLocaleString()}</h2>
                        </div>
                    </div>

                    {/* GRÁFICO SIMPLE */}
                    <ProfitChart activeBets={profile.activeBets} />
                </div>

                {/* GEMS */}
                <div className="flex flex-col items-center py-20 border-y border-white/5 mb-32">
                    <div className="flex justify-center gap-10 mb-10">
                        {profile.medals.map((medal, i) => (
                            <div key={i} className="w-28 h-28 rounded-full border-2 border-white/5 bg-[#0D0D0D] flex items-center justify-center text-5xl shadow-2xl hover:scale-110 transition-transform cursor-pointer">
                                {medal}
                            </div>
                        ))}
                    </div>
                    <span className="text-[100px] font-black tracking-tighter leading-none">{profile.gems.toLocaleString()}</span>
                    <span className="text-gray-600 text-sm font-black uppercase tracking-[0.5em] mt-4">Gems Earned</span>
                </div>

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

// PROFIT CHART COMPONENT
function ProfitChart({ activeBets }: any) {
    const maxProfit = Math.max(...activeBets.map((b: any) => b.profit), 100);
    const minProfit = Math.min(...activeBets.map((b: any) => b.profit), -100);
    const range = maxProfit - minProfit;

    return (
        <div className="relative h-48 w-full bg-black/30 rounded-2xl p-6 border border-white/5">
            {/* GRID LINES */}
            <div className="absolute inset-6 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-full h-px bg-white/5" />
                ))}
            </div>

            {/* BARS */}
            <div className="relative h-full flex items-end justify-around gap-4">
                {activeBets.map((bet: any, idx: number) => {
                    const height = Math.abs((bet.profit / range) * 100);
                    const isPositive = bet.profit >= 0;

                    return (
                        <div key={idx} className="flex flex-col items-center flex-1 group">
                            <div className="relative w-full flex flex-col items-center justify-end h-full">
                                {isPositive ? (
                                    <div
                                        className="w-full bg-gradient-to-t from-[#10B981] to-[#10B981]/50 rounded-t-lg transition-all duration-300 group-hover:brightness-125"
                                        style={{ height: `${height}%`, minHeight: '8px' }}
                                    />
                                ) : (
                                    <div
                                        className="w-full bg-gradient-to-b from-red-500 to-red-500/50 rounded-b-lg transition-all duration-300 group-hover:brightness-125"
                                        style={{ height: `${height}%`, minHeight: '8px' }}
                                    />
                                )}
                            </div>

                            {/* TOOLTIP */}
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-black/90 border border-white/20 rounded-lg p-2 text-xs font-bold whitespace-nowrap transition-opacity z-10">
                                <span className={bet.profit >= 0 ? 'text-[#10B981]' : 'text-red-500'}>
                                    {bet.profit >= 0 ? '+' : ''}${bet.profit}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ZERO LINE */}
            <div className="absolute left-6 right-6 top-1/2 h-px bg-white/20" />
        </div>
    );
}

// STAT CARD
function StatCard({ label, value, color = "text-white" }: any) {
    return (
        <div className="bg-[#0D0D0D] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-[#F492B7]/20 transition-all hover:-translate-y-1">
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-3">{label}</p>
            <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
        </div>
    );
}

// MARKET CARD
function MarketCard({ market, router }: any) {
    return (
        <div
            onClick={() => router.push(`/market/${market.slug}`)}
            className="group bg-[#0D0D0D] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-[#F492B7]/40 transition-all cursor-pointer shadow-2xl hover:-translate-y-2 duration-300"
        >
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
                <h4 className="text-2xl font-black uppercase leading-tight tracking-tighter h-16 overflow-hidden group-hover:text-[#F492B7] transition-colors">
                    {market.title}
                </h4>
                <div className="flex justify-between items-center border-t border-white/5 pt-6">
                    <div>
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">Type</span>
                        <span className="text-white text-sm font-black uppercase">{market.type || 'Binary'}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">Volume</span>
                        <span className="text-white text-sm font-black">{market.volume || '$0'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// BET CARD - ESTILO FIGMA
function BetCard({ bet, onCashOut, router }: any) {
    const isPositive = bet.profit >= 0;

    return (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[2rem] p-8 hover:border-[#F492B7]/30 transition-all group">
            {/* HEADER */}
            <div className="flex justify-between items-start mb-6">
                <span className={`text-[11px] font-black px-4 py-2 rounded-lg ${bet.side === 'YES'
                    ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                    : 'bg-red-500/20 text-red-500 border border-red-500/30'
                    }`}>
                    {bet.side}
                </span>
            </div>

            {/* TITLE */}
            <h4
                onClick={() => router.push(`/market/${bet.id}`)}
                className="text-lg font-bold text-white mb-8 leading-tight hover:text-[#F492B7] cursor-pointer line-clamp-2"
            >
                {bet.title}
            </h4>

            {/* STATS */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Invested:</p>
                    <p className="text-white text-2xl font-bold">${bet.invested.toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Value:</p>
                    <p className="text-white text-2xl font-bold">${bet.current.toFixed(2)}</p>
                </div>
            </div>

            {/* PROFIT ROW */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <span className={`text-2xl ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>
                        {isPositive ? '↗' : '↘'}
                    </span>
                    <span className={`text-2xl font-black ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}${bet.profit.toFixed(2)}
                    </span>
                </div>
                <span className={`text-xl font-black ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>
                    {bet.change}
                </span>
            </div>

            {/* CASH OUT BUTTON */}
            <button
                onClick={() => onCashOut(bet.id)}
                className="w-full bg-[#F492B7] text-black py-4 rounded-xl text-sm font-black uppercase tracking-wider hover:brightness-110 transition-all"
            >
                Cash Out
            </button>
        </div>
    );
}

// EDIT MODAL
function EditModal({ profile, tempName, tempBio, setTempName, setTempBio, onClose, onSave, addMedal, removeMedal, bannerInputRef, pfpInputRef, handleFileChange }: any) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/98 backdrop-blur-2xl">
            <div className="relative bg-[#080808] border border-white/10 w-full max-w-2xl rounded-[3.5rem] p-14 shadow-2xl">
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 text-[#F492B7]">Edit Identity</h2>

                <div className="mb-12 border-b border-white/10 pb-10">
                    <label className="text-[11px] font-black text-gray-700 mb-6 block">Manage Medals (Max 5)</label>
                    <div className="flex gap-4">
                        {profile.medals.map((medal: string, i: number) => (
                            <button
                                key={i}
                                onClick={() => removeMedal(i)}
                                className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl border border-red-500/20 group hover:border-red-500/50 transition-all"
                            >
                                <span className="group-hover:hidden">{medal}</span>
                                <span className="hidden group-hover:block text-red-500 font-bold text-xl">×</span>
                            </button>
                        ))}
                        {profile.medals.length < 5 && (
                            <button
                                onClick={addMedal}
                                className="w-16 h-16 rounded-full border-2 border-dashed border-[#F492B7]/40 text-2xl text-[#F492B7] hover:bg-[#F492B7]/10 transition-all"
                            >
                                +
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                        <button
                            onClick={() => bannerInputRef.current?.click()}
                            className="p-10 bg-white/5 border border-dashed border-white/20 rounded-3xl flex flex-col items-center hover:border-[#F492B7]/40 transition-all"
                        >
                            <span className="text-[11px] font-black uppercase mb-4 opacity-60">Banner</span>
                            <img src={profile.banner} className="h-16 w-32 object-cover rounded-xl" alt="" />
                        </button>
                        <button
                            onClick={() => pfpInputRef.current?.click()}
                            className="p-10 bg-white/5 border border-dashed border-white/20 rounded-3xl flex flex-col items-center hover:border-[#F492B7]/40 transition-all"
                        >
                            <span className="text-[11px] font-black uppercase mb-4 opacity-60">PFP</span>
                            <img src={profile.pfp} className="h-16 w-16 object-cover rounded-full border-2 border-[#F492B7]" alt="" />
                        </button>
                    </div>

                    <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-black outline-none focus:border-[#F492B7] transition-all"
                        placeholder="Username"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                    />

                    <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg outline-none h-32 resize-none focus:border-[#F492B7] transition-all"
                        placeholder="Bio"
                        value={tempBio}
                        onChange={(e) => setTempBio(e.target.value)}
                    />
                </div>

                <input type="file" ref={bannerInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
                <input type="file" ref={pfpInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'pfp')} />

                <div className="flex gap-4 mt-14">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-white/5 text-white py-7 rounded-3xl font-black uppercase text-sm hover:bg-white/10 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        className="flex-1 bg-[#F492B7] text-black py-7 rounded-3xl font-black uppercase text-sm shadow-2xl hover:brightness-110 transition-all"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}