'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [betTab, setBetTab] = useState<'active' | 'closed'>('active');
    const [chartTime, setChartTime] = useState('1W');

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
            { id: '1', title: "Will Bitcoin reach $100k by end of January 2026?", invested: 500, current: 725, side: "YES", change: "+45.0%" },
            { id: '2', title: "Tesla stock above $300 by Q2 2026", invested: 300, current: 340, side: "NO", change: "+13.3%" },
            { id: '3', title: "Apple announce AR glasses in 2026?", invested: 750, current: 690, side: "YES", change: "-8.0%" },
            { id: '4', title: "Solana TVL breaks $10B in 2026?", invested: 1000, current: 1200, side: "YES", change: "+20.0%" }
        ],
        closedBets: [],
        createdMarkets: []
    };

    const [profile, setProfile] = useState(initialProfile);

    // --- CARGA BLINDADA: NO BORRA NADA ---
    useEffect(() => {
        const loadEverything = () => {
            const savedProfile = localStorage.getItem('djinn_user_profile');
            const savedMarkets = localStorage.getItem('djinn_created_markets');

            setProfile(prev => {
                let updated = { ...prev };
                if (savedProfile) {
                    const parsed = JSON.parse(savedProfile);
                    updated = { ...updated, ...parsed };
                }
                if (savedMarkets) {
                    updated.createdMarkets = JSON.parse(savedMarkets);
                }
                return updated;
            });
        };

        loadEverything();
        window.addEventListener('storage', loadEverything);
        return () => window.removeEventListener('storage', loadEverything);
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

    const [tempName, setTempName] = useState(profile.username);
    const [tempBio, setTempBio] = useState(profile.bio);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const pfpInputRef = useRef<HTMLInputElement>(null);

    return (
        <main className="min-h-screen bg-black text-white font-sans pb-40 selection:bg-[#F492B7]">
            <Navbar />
            <div className="w-full h-[420px] relative overflow-hidden bg-[#0A0A0A]">
                <img src={profile.banner} className="w-full h-full object-cover opacity-90" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent" />
                <button onClick={() => { setTempName(profile.username); setTempBio(profile.bio); setIsEditModalOpen(true); }} className="absolute bottom-10 right-14 border border-white/20 bg-black/50 backdrop-blur-xl text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] z-20 hover:bg-[#F492B7] hover:text-black transition-all">✎ Edit Profile</button>
            </div>
            <div className="max-w-[1600px] mx-auto px-14">
                <div className="flex items-start gap-12 -mt-24 relative z-10 mb-20">
                    <div className="w-60 h-60 rounded-full border-[8px] border-black overflow-hidden bg-black ring-2 ring-[#F492B7]/40 shadow-2xl">
                        <img src={profile.pfp} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="mt-28">
                        <h1 className="text-7xl font-black tracking-tighter uppercase leading-none drop-shadow-2xl">{profile.username}</h1>
                        <p className="text-gray-400 text-xl mt-6 border-l-4 border-[#F492B7] pl-8 italic max-w-2xl">{profile.bio}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-24 items-start">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <MiniCard label="PORTFOLIO" value={`$${(profile.portfolio || 0).toLocaleString()}`} />
                            <MiniCard label="WIN RATE" value={`${profile.winRate}%`} color="text-[#F492B7]" />
                        </div>
                        <div className="bg-[#0D0D0D] border border-white/5 p-10 rounded-[3rem] border-l-4 border-l-[#10B981] shadow-2xl">
                            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-4 opacity-50">BIGGEST WIN</p>
                            <p className="text-5xl font-black text-[#10B981] tracking-tighter">+${(profile.biggestWin || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="lg:col-span-8 bg-[#0D0D0D] border border-white/5 p-10 rounded-[3.5rem] relative overflow-hidden h-full shadow-2xl flex flex-col justify-center">
                        <p className="text-[#10B981] text-xs font-black uppercase tracking-widest mb-4">P/L PERFORMANCE</p>
                        <h2 className="text-8xl font-black tracking-tighter">+${(profile.profit || 0).toLocaleString()}</h2>
                    </div>
                </div>

                <div className="flex flex-col items-center py-20 border-b border-white/5 mb-32">
                    <div className="flex justify-center gap-10 mb-10">
                        {profile.medals.map((medal, i) => (
                            <div key={i} className="w-28 h-28 rounded-full border-2 border-white/5 bg-[#0D0D0D] flex items-center justify-center text-5xl shadow-2xl">{medal}</div>
                        ))}
                    </div>
                    <span className="text-[100px] font-black tracking-tighter leading-none">{(profile.gems || 0).toLocaleString()}</span>
                    <span className="text-gray-600 text-sm font-black uppercase tracking-[0.5em] mt-4">Gems Earned</span>
                </div>

                <div className="mt-32 space-y-12">
                    <h3 className="text-5xl font-black uppercase tracking-tighter">Created Markets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {profile.createdMarkets && profile.createdMarkets.length > 0 ? (
                            profile.createdMarkets.map((m: any, i: number) => (
                                <div key={i} onClick={() => router.push(`/market/${m.id}`)} className="group bg-[#0D0D0D] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-[#F492B7]/40 transition-all cursor-pointer shadow-2xl relative">
                                    <div className="h-48 w-full relative overflow-hidden bg-gradient-to-br from-[#F492B7]/20 to-black">
                                        <img src={m.image} className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700" alt="" />
                                        <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live</span>
                                        </div>
                                        <div className="absolute bottom-4 right-6 text-4xl">{m.icon || '🔮'}</div>
                                    </div>
                                    <div className="p-8 space-y-4">
                                        <h4 className="text-2xl font-black uppercase leading-tight tracking-tighter h-16 overflow-hidden group-hover:text-[#F492B7] transition-colors">{m.question}</h4>
                                        <div className="flex justify-between items-center border-t border-white/5 pt-6">
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{m.type}</span>
                                            <span className="text-white text-[11px] font-black uppercase tracking-widest opacity-40">VOL: $0</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[3.5rem] bg-white/[0.01]">
                                <p className="text-gray-600 font-black uppercase tracking-[0.4em] italic opacity-40">No markets summoned yet, Master.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-40 border-t border-white/5 pt-20">
                    <div className="flex items-center gap-12 mb-12 border-b border-white/5 pb-6">
                        <button onClick={() => setBetTab('active')} className={`text-4xl font-black uppercase tracking-tighter transition-all ${betTab === 'active' ? 'text-white border-b-4 border-[#F492B7] pb-2' : 'text-gray-700 hover:text-gray-400'}`}>Active Bets</button>
                        <button onClick={() => setBetTab('closed')} className={`text-4xl font-black uppercase tracking-tighter transition-all ${betTab === 'closed' ? 'text-white border-b-4 border-[#F492B7] pb-2' : 'text-gray-700 hover:text-gray-400'}`}>Closed</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {betTab === 'active' ? (
                            profile.activeBets.map((bet: any) => (
                                <div key={bet.id} className="bg-[#0D0D0D] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative group">
                                    <div className="flex justify-between items-center mb-8">
                                        <span className={`text-[11px] font-black px-4 py-1.5 rounded-lg border ${bet.side === 'YES' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{bet.side}</span>
                                        <span className="text-[#10B981] text-2xl font-black">{bet.change}</span>
                                    </div>
                                    <p onClick={() => router.push(`/market/${bet.id}`)} className="text-xl font-black mb-10 leading-tight uppercase hover:text-[#F492B7] cursor-pointer h-14 overflow-hidden">{bet.title}</p>
                                    <div className="flex justify-between border-t border-white/5 pt-8 mb-10">
                                        <div className="flex flex-col"><span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Invested</span><span className="text-3xl font-black">${bet.invested.toFixed(2)}</span></div>
                                        <div className="flex flex-col text-right"><span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Value</span><span className="text-3xl font-black text-[#10B981]">${bet.current.toFixed(2)}</span></div>
                                    </div>
                                    <button onClick={() => handleCashOut(bet.id)} className="w-full bg-[#F492B7] text-black py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] hover:brightness-110 transition-all shadow-lg">Cash Out</button>
                                </div>
                            ))
                        ) : (
                            profile.closedBets.map((bet: any, i: number) => (
                                <div key={i} className="bg-[#0D0D0D]/50 border border-white/10 p-10 rounded-[3rem] border-l-4 border-l-[#10B981] grayscale opacity-70">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-[10px] text-gray-500 border border-white/10 px-3 py-1 rounded-lg font-black uppercase">CONQUERED</span>
                                        <span className="text-[#10B981] text-xl font-black">+${(bet.closedAt - bet.invested).toFixed(2)}</span>
                                    </div>
                                    <p className="text-lg font-black text-gray-400 uppercase leading-tight">{bet.title}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/98 backdrop-blur-2xl">
                    <div className="relative bg-[#080808] border border-white/10 w-full max-w-2xl rounded-[3.5rem] p-14 shadow-2xl">
                        <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 text-[#F492B7] font-bold">Edit Identity</h2>
                        <div className="mb-12 border-b border-white/10 pb-10">
                            <label className="text-[11px] font-black text-gray-700 mb-6 block font-bold">Manage Medals (Max 5)</label>
                            <div className="flex gap-4">
                                {profile.medals.map((medal, i) => (
                                    <button key={i} onClick={() => removeMedal(i)} className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl border border-red-500/20 group">
                                        <span className="group-hover:hidden">{medal}</span><span className="hidden group-hover:block text-red-500 font-bold text-xl">-</span>
                                    </button>
                                ))}
                                {profile.medals.length < 5 && <button onClick={addMedal} className="w-16 h-16 rounded-full border-2 border-dashed border-[#F492B7]/40 text-2xl text-[#F492B7]">+</button>}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-8">
                                <button onClick={() => bannerInputRef.current?.click()} className="p-10 bg-white/5 border border-dashed border-white/20 rounded-3xl flex flex-col items-center">
                                    <span className="text-[11px] font-black uppercase mb-4 opacity-60">Banner</span>
                                    <img src={profile.banner} className="h-16 w-32 object-cover rounded-xl" alt="" />
                                </button>
                                <button onClick={() => pfpInputRef.current?.click()} className="p-10 bg-white/5 border border-dashed border-white/20 rounded-3xl flex flex-col items-center">
                                    <span className="text-[11px] font-black uppercase mb-4 opacity-60">PFP</span>
                                    <img src={profile.pfp} className="h-16 w-16 object-cover rounded-full border-2 border-[#F492B7]" alt="" />
                                </button>
                            </div>
                            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-black outline-none" value={tempName} onChange={(e) => setTempName(e.target.value)} />
                            <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg outline-none h-32 resize-none" value={tempBio} onChange={(e) => setTempBio(e.target.value)} />
                        </div>
                        <input type="file" ref={bannerInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
                        <input type="file" ref={pfpInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'pfp')} />
                        <button onClick={saveIdentity} className="w-full mt-14 bg-[#F492B7] text-black py-7 rounded-3xl font-black uppercase text-sm shadow-2xl">Confirm</button>
                    </div>
                </div>
            )}
        </main>
    );
}

function MiniCard({ label, value, color = "text-white" }: any) {
    return (
        <div className="bg-[#0D0D0D] border border-white/5 p-8 rounded-[2.5rem] border-t-white/10 shadow-xl">
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-3">{label}</p>
            <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
        </div>
    );
}