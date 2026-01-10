'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Clock, DollarSign, Wallet, MessageSquare, Activity, Image as ImageIcon, X, Send, Heart, CornerDownRight, TrendingUp, TrendingDown, Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as supabaseDb from '@/lib/supabase-db';

// Función para formatear tiempo relativo
function formatTimeAgo(timestamp: string): string {
    if (!timestamp) return 'Just now';
    const now = Date.now();
    const created = new Date(timestamp).getTime();
    const diff = now - created;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// --- CONFIGURACIÓN DE TESORERÍA ---
const TREASURY_WALLET = new PublicKey("C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X");

// --- TIPOS ---
type PositionType = 'YES' | 'NO' | null;

interface Comment {
    id: number; user: string; avatar: string | null; isMe: boolean; time: string; text: string;
    image: string | null; likes: number; likedByMe: boolean; position: PositionType; positionAmount: string | null; replies: Comment[];
}

interface Holder { rank: number; name: string; avatar: string; shares: string; isMe: boolean; }

interface ActivityItem { user: string; action: string; amount: string; time: string; isSell: boolean; }

// --- DATOS MOCK ---
const marketData: Record<string, any> = {
    'argentina-world-cup-2026': { type: 'binary', title: "Will Argentina be finalist on the FIFA World Cup 2026?", icon: "🇦🇷", yesPrice: 45, noPrice: 55, volume: "$12.5M", description: "Se resuelve YES si Argentina juega la final." },
    'btc-hit-150k': { type: 'binary', title: 'Will Bitcoin reach ATH on 2026?', icon: '₿', yesPrice: 82, noPrice: 18, volume: '$45.2M', description: 'Resolves YES if BTC breaks its previous record.' }
};

const INITIAL_HOLDERS_YES: Holder[] = [
    { rank: 1, name: "wilderson", avatar: "🔴", shares: "21,730", isMe: false },
    { rank: 2, name: "InfiniteCrypt0", avatar: "♾️", shares: "19,882", isMe: false },
    { rank: 3, name: "Lord", avatar: "", shares: "15,000", isMe: true },
];

const INITIAL_HOLDERS_NO: Holder[] = [
    { rank: 1, name: "369market", avatar: "👩", shares: "19,780", isMe: false },
    { rank: 2, name: "Shirohige77", avatar: "🏴‍☠️", shares: "11,915", isMe: false },
    { rank: 3, name: "d573", avatar: "🟣", shares: "5,512", isMe: false },
];

const INITIAL_ACTIVITY: ActivityItem[] = [
    { user: "Whale_0x99", action: "Bought YES", amount: "5.00 SOL", time: "2m ago", isSell: false },
];

const initialComments: Comment[] = [
    { id: 1, user: "SatoshiNakamoto", avatar: "😈", isMe: false, time: "2h ago", text: "This is free money honestly.", image: null, likes: 45, likedByMe: false, position: 'YES', positionAmount: '$50k', replies: [] }
];

const generateChartData = (basePrice: number = 50) => {
    const data = [];
    let current = basePrice;
    for (let i = 0; i < 50; i++) {
        const change = (Math.random() - 0.5) * 5;
        current += change;
        if (current > 99) current = 99; if (current < 1) current = 1;
        const date = new Date(); date.setHours(date.getHours() - (50 - i));
        data.push({ time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), fullDate: date.toLocaleString(), value: Number(current.toFixed(1)) });
    }
    return data;
};

export default function MarketPage() {
    const params = useParams();
    const slug = params.slug as string;
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const [solPrice, setSolPrice] = useState<number>(0);
    const [solBalance, setSolBalance] = useState<number>(0);
    const [livePrice, setLivePrice] = useState<number>(50);
    const [isPending, setIsPending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [userProfile, setUserProfile] = useState({ username: "Lord", avatarUrl: null as string | null });
    const [market, setMarket] = useState<any>(null);
    const [activeOptionId, setActiveOptionId] = useState<number | null>(null);
    const [betAmount, setBetAmount] = useState('');
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');
    const [bottomTab, setBottomTab] = useState<'ACTIVITY' | 'COMMENTS' | 'HOLDERS'>('ACTIVITY');
    const [chartData, setChartData] = useState<any[]>([]);

    const [activityList, setActivityList] = useState<ActivityItem[]>(INITIAL_ACTIVITY);
    const [holdersYes, setHoldersYes] = useState<Holder[]>(INITIAL_HOLDERS_YES);
    const [holdersNo, setHoldersNo] = useState<Holder[]>(INITIAL_HOLDERS_NO);

    const [myHeldPosition, setMyHeldPosition] = useState<PositionType>(null);
    const [myHeldAmount, setMyHeldAmount] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [newCommentText, setNewCommentText] = useState("");
    const [newCommentImage, setNewCommentImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");

    // OBTENER PRECIO SOL TIEMPO REAL
    useEffect(() => {
        const fetchSolPrice = async () => {
            try {
                const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
                const data = await res.json();
                setSolPrice(parseFloat(data.price));
            } catch (e) { console.error("Error price"); }
        };
        fetchSolPrice();
        const interval = setInterval(fetchSolPrice, 15000);
        return () => clearInterval(interval);
    }, []);

    // ACTUALIZAR SALDO CON LÓGICA DE REINTENTO
    const updateBalance = async () => {
        if (!connection || !publicKey) return;
        try {
            const balance = await connection.getBalance(publicKey, 'confirmed');
            setSolBalance(balance / LAMPORTS_PER_SOL);
        } catch (e) { console.error("Balance Error:", e); }
    };

    useEffect(() => { updateBalance(); }, [connection, publicKey]);

    useEffect(() => {
        let foundMarket = marketData[slug];
        const savedProfile = localStorage.getItem('djinn_user_profile');
        if (savedProfile) setUserProfile(JSON.parse(savedProfile));
        if (!foundMarket) foundMarket = { type: 'binary', title: slug, icon: "🔮", yesPrice: 50, noPrice: 50, volume: "$0", description: "Market info..." };
        setMarket(foundMarket);

        // CARGAR DATOS DESDE SUPABASE
        const loadFromSupabase = async () => {
            // Cargar precio del market
            const marketDataDb = await supabaseDb.getMarketData(slug);
            if (marketDataDb) {
                setLivePrice(marketDataDb.live_price);
                setChartData(generateChartData(marketDataDb.live_price));
            } else {
                setLivePrice(foundMarket.yesPrice || 50);
                setChartData(generateChartData(foundMarket.yesPrice || 50));
            }

            // Cargar comentarios desde Supabase
            const walletAddress = publicKey?.toBase58();
            const commentsDb = await supabaseDb.getComments(slug, walletAddress);
            if (commentsDb.length > 0) {
                // Convertir formato de Supabase a formato local
                const formattedComments = commentsDb.map(c => ({
                    id: c.id as any,
                    user: c.username,
                    avatar: c.avatar_url,
                    isMe: c.wallet_address === walletAddress,
                    time: formatTimeAgo(c.created_at || ''),
                    text: c.text,
                    image: c.image_url,
                    likes: c.likes_count,
                    likedByMe: c.liked_by_me || false,
                    position: c.position as 'YES' | 'NO' | null,
                    positionAmount: c.position_amount,
                    replies: c.replies?.map(r => ({
                        id: r.id as any,
                        user: r.username,
                        avatar: r.avatar_url,
                        isMe: r.wallet_address === walletAddress,
                        time: formatTimeAgo(r.created_at || ''),
                        text: r.text,
                        image: r.image_url,
                        likes: r.likes_count,
                        likedByMe: r.liked_by_me || false,
                        position: r.position as 'YES' | 'NO' | null,
                        positionAmount: r.position_amount,
                        replies: []
                    })) || []
                }));
                setComments(formattedComments);
            }
        };

        loadFromSupabase();

        // Suscribirse a cambios en tiempo real
        const commentsChannel = supabaseDb.subscribeToComments(slug, () => {
            loadFromSupabase();
        });

        const marketChannel = supabaseDb.subscribeToMarketData(slug, (payload) => {
            if (payload.new?.live_price) {
                setLivePrice(payload.new.live_price);
            }
        });

        return () => {
            commentsChannel.unsubscribe();
            marketChannel.unsubscribe();
        };
    }, [slug, publicKey]);

    const amountNum = parseFloat(betAmount) || 0;
    const isOverBalance = amountNum > solBalance;
    const currentPriceForSide = selectedSide === 'YES' ? livePrice : (100 - livePrice);
    const estimatedShares = amountNum > 0 ? (amountNum / (currentPriceForSide / 100)) : 0;
    const usdValueInTrading = (amountNum * solPrice).toFixed(2);
    const potentialProfit = estimatedShares - amountNum;

    // --- PLACE BET CORREGIDO (CON CONFIRMACIÓN REAL + ACTIVITY) ---
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

            // ESPERAR CONFIRMACIÓN REAL EN LA BLOCKCHAIN
            const latestBlockhash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({
                signature,
                ...latestBlockhash
            }, 'confirmed');

            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);

            // Impacto AMM realista estilo Polymarket
            // Fórmula: impacto = (monto_usd / liquidez_virtual) * factor
            // Mercado con $10M de liquidez virtual, factor 0.5
            const virtualLiquidity = 10000000; // $10M
            const usdBet = amountNum * solPrice;
            const priceImpact = (usdBet / virtualLiquidity) * 50; // ~0.5% por cada $100,000
            const newPrice = selectedSide === 'YES'
                ? Math.min(99, livePrice + priceImpact)
                : Math.max(1, livePrice - priceImpact);
            setLivePrice(newPrice);

            // Guardar mi posición para mostrar en comments
            setMyHeldPosition(selectedSide);
            const usdAmount = (amountNum * solPrice).toFixed(2);
            setMyHeldAmount(`$${usdAmount}`);

            // Actualizar mi posición en Supabase (para comments)
            await supabaseDb.updateCommentPosition(publicKey.toBase58(), slug, selectedSide, `$${usdAmount}`);

            // Actualizar comments locales para feedback inmediato
            const updatedComments = comments.map(c =>
                c.isMe ? { ...c, position: selectedSide, positionAmount: `$${usdAmount}` } : c
            );
            setComments(updatedComments);

            const now = new Date();
            const newChartPoint = { time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: Number(newPrice.toFixed(1)) };
            setChartData(prev => {
                const updatedChart = [...prev, newChartPoint];
                return updatedChart;
            });

            // Activity con shares y USD
            const sharesAmount = estimatedShares.toFixed(2);

            // GUARDAR DATOS DEL MARKET EN SUPABASE (PERSISTENCIA GLOBAL)
            await supabaseDb.updateMarketPrice(slug, newPrice, usdBet);

            // GUARDAR ACTIVIDAD EN SUPABASE (GLOBAL)
            await supabaseDb.createActivity({
                wallet_address: publicKey.toBase58(),
                username: userProfile.username,
                avatar_url: userProfile.avatarUrl,
                action: selectedSide,
                amount: parseFloat(usdAmount),
                shares: parseFloat(sharesAmount),
                market_title: market?.title || 'Unknown Market',
                market_slug: slug
            });

            setBetAmount('');
            setTimeout(() => updateBalance(), 1000);

        } catch (e) {
            console.error(e);
            alert("Transaction failed or was rejected.");
        } finally {
            setIsPending(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => { setNewCommentImage(reader.result as string); }; reader.readAsDataURL(file); }
    };

    // Función para recargar comentarios desde Supabase
    const reloadComments = async () => {
        const walletAddress = publicKey?.toBase58();
        const commentsDb = await supabaseDb.getComments(slug, walletAddress);
        const formattedComments = commentsDb.map(c => ({
            id: c.id as any,
            user: c.username,
            avatar: c.avatar_url,
            isMe: c.wallet_address === walletAddress,
            time: formatTimeAgo(c.created_at || ''),
            text: c.text,
            image: c.image_url,
            likes: c.likes_count,
            likedByMe: c.liked_by_me || false,
            position: c.position as 'YES' | 'NO' | null,
            positionAmount: c.position_amount,
            replies: c.replies?.map(r => ({
                id: r.id as any,
                user: r.username,
                avatar: r.avatar_url,
                isMe: r.wallet_address === walletAddress,
                time: formatTimeAgo(r.created_at || ''),
                text: r.text,
                image: r.image_url,
                likes: r.likes_count,
                likedByMe: r.liked_by_me || false,
                position: r.position as 'YES' | 'NO' | null,
                positionAmount: r.position_amount,
                replies: []
            })) || []
        }));
        setComments(formattedComments);
    };

    const handlePostComment = async () => {
        if (!newCommentText.trim() && !newCommentImage) return;
        if (!publicKey) {
            alert('Please connect your wallet to comment');
            return;
        }

        // Guardar en Supabase
        await supabaseDb.createComment({
            market_slug: slug,
            wallet_address: publicKey.toBase58(),
            username: userProfile.username,
            avatar_url: userProfile.avatarUrl,
            text: newCommentText,
            image_url: newCommentImage,
            position: myHeldPosition,
            position_amount: myHeldAmount,
            parent_id: null
        });

        setNewCommentText("");
        setNewCommentImage(null);

        // Recargar comentarios
        await reloadComments();
    };

    const handlePostReply = async (parentId: string | number) => {
        if (!replyText.trim()) return;
        if (!publicKey) {
            alert('Please connect your wallet to reply');
            return;
        }

        // Guardar en Supabase
        await supabaseDb.createComment({
            market_slug: slug,
            wallet_address: publicKey.toBase58(),
            username: userProfile.username,
            avatar_url: userProfile.avatarUrl,
            text: replyText,
            image_url: null,
            position: myHeldPosition,
            position_amount: myHeldAmount,
            parent_id: parentId as string
        });

        setReplyText("");
        setActiveReplyId(null);

        // Recargar comentarios
        await reloadComments();
    };

    const handleToggleLike = async (commentId: string | number) => {
        if (!publicKey) {
            alert('Please connect your wallet to like');
            return;
        }

        // Toggle like en Supabase
        await supabaseDb.toggleLike(commentId as string, publicKey.toBase58());

        // Recargar comentarios
        await reloadComments();
    };

    if (!market) return <div className="min-h-screen bg-black" />;
    const chartColor = selectedSide === 'YES' ? '#10b981' : '#EF4444'; // emerald-500 para YES

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32">
            <Navbar />
            <div className="max-w-7xl mx-auto pt-32 px-4 md:px-6 relative z-10">
                <div className="flex flex-col md:flex-row items-start gap-6 mb-10">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-[#0E0E0E] rounded-2xl border border-white/10 flex items-center justify-center text-5xl shadow-2xl overflow-hidden">
                        {typeof market.icon === 'string' && market.icon.startsWith('data:') ? <img src={market.icon} className="w-full h-full object-cover" /> : market.icon}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-4 leading-tight">{market.title}</h1>
                        <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"><DollarSign size={12} className="text-[#F492B7]" /><span>Vol: <span className="text-white">{market.volume}</span></span></div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"><Clock size={12} className="text-blue-400" /><span>Ends: <span className="text-white">2026</span></span></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-5xl font-black tracking-tighter" style={{ color: chartColor }}>{livePrice.toFixed(1)}%</span>
                                    <span className="text-xl font-bold text-gray-500">chance</span>
                                </div>
                            </div>
                            <div className="h-[300px] w-full -ml-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs><linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColor} stopOpacity={0.3} /><stop offset="95%" stopColor={chartColor} stopOpacity={0} /></linearGradient></defs>
                                        <Tooltip contentStyle={{ background: '#1C1D25', border: '1px solid #333', borderRadius: '12px' }} />
                                        <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={3} fill="url(#chartGrad)" animationDuration={1000} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="pt-8">
                            <div className="flex items-center gap-6 mb-6 border-b border-white/5 pb-2">
                                <TabButton label="Comments" icon={<MessageSquare size={14} />} active={bottomTab === 'COMMENTS'} onClick={() => setBottomTab('COMMENTS')} />
                                <TabButton label="Activity" icon={<Activity size={14} />} active={bottomTab === 'ACTIVITY'} onClick={() => setBottomTab('ACTIVITY')} />
                                <TabButton label="Top Holders" icon={<Users size={14} />} active={bottomTab === 'HOLDERS'} onClick={() => setBottomTab('HOLDERS')} />
                            </div>
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                {bottomTab === 'COMMENTS' && (
                                    <div className="space-y-6">
                                        <div className="bg-[#0E0E0E] p-4 rounded-[2rem] border border-white/10">
                                            <textarea className="w-full bg-transparent p-2 text-sm focus:outline-none resize-none h-20" placeholder="Thoughts?" value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} />
                                            {newCommentImage && <div className="relative inline-block mt-2"><img src={newCommentImage} className="max-h-40 rounded-xl" /><button onClick={() => setNewCommentImage(null)} className="absolute top-0 right-0 bg-red-500 rounded-full p-1"><X size={10} /></button></div>}
                                            <div className="flex justify-between mt-3 border-t border-white/5 pt-3">
                                                <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-white transition-colors"><ImageIcon size={18} /></button>
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                <button onClick={handlePostComment} className="bg-[#F492B7] text-black px-6 py-2 rounded-xl text-xs font-black uppercase">Send Comment</button>
                                            </div>
                                        </div>
                                        {comments.map(c => (
                                            <div key={c.id} className="flex gap-4 group">
                                                <UserAvatar isMe={c.isMe} avatar={c.avatar} />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <Link href={c.isMe ? `/profile/${c.user}` : '/profile/default'} className={`text-sm font-bold hover:underline transition-colors ${c.isMe ? 'text-[#F492B7]' : 'text-white'}`}>{c.user}</Link>
                                                        {c.position && <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${c.position === 'YES' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{c.position} HOLDER • {c.positionAmount}</div>}
                                                        <span className="text-[10px] text-gray-600 ml-auto">{c.time}</span>
                                                    </div>
                                                    <p className="text-gray-300 text-sm leading-relaxed">{c.text}</p>
                                                    {c.image && <img src={c.image} className="mt-3 rounded-xl max-w-md border border-white/10 shadow-lg" />}
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <button onClick={() => handleToggleLike(c.id)} className={`flex items-center gap-1 text-xs font-bold transition-colors ${c.likedByMe ? 'text-[#F492B7]' : 'text-gray-500 hover:text-white'}`}><Heart size={14} fill={c.likedByMe ? "currentColor" : "none"} /> {c.likes}</button>
                                                        <button onClick={() => setActiveReplyId(activeReplyId === c.id ? null : c.id)} className="text-xs font-bold text-gray-500 hover:text-white">Reply</button>
                                                    </div>
                                                    {activeReplyId === c.id && (
                                                        <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
                                                            <UserAvatar isMe={true} avatar={null} />
                                                            <div className="flex-1 relative">
                                                                <input autoFocus type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePostReply(c.id)} placeholder={`Reply to ${c.user}...`} className="w-full bg-[#0E0E0E] border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-[#F492B7] outline-none" />
                                                                <button onClick={() => handlePostReply(c.id)} className="absolute right-2 top-1.5 text-[#F492B7]"><CornerDownRight size={14} /></button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {c.replies.map(r => (
                                                        <div key={r.id} className="mt-4 flex gap-3 pl-8 border-l border-white/5">
                                                            <UserAvatar isMe={r.isMe} avatar={r.avatar} />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <Link href={r.isMe ? `/profile/${r.user}` : '/profile/default'} className="text-xs font-bold text-[#F492B7]">{r.user}</Link>
                                                                    <span className="text-[8px] text-gray-600">{r.time}</span>
                                                                </div>
                                                                <p className="text-gray-400 text-xs mt-1">{r.text}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {bottomTab === 'ACTIVITY' && (
                                    <div className="bg-[#0E0E0E] rounded-[2rem] border border-white/5 overflow-hidden">
                                        {activityList.map((act, i) => (
                                            <ActivityRow key={i} user={act.user} action={act.action} amount={act.amount} time={act.time} isSell={act.isSell} />
                                        ))}
                                    </div>
                                )}
                                {bottomTab === 'HOLDERS' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-[#0E0E0E] rounded-[2rem] border border-white/5 p-6">
                                            <h3 className="text-[#10B981] font-black uppercase text-xs mb-4">Yes Holders</h3>
                                            {holdersYes.map((h) => <HolderRow key={h.name} holder={h} />)}
                                        </div>
                                        <div className="bg-[#0E0E0E] rounded-[2rem] border border-white/5 p-6">
                                            <h3 className="text-red-500 font-black uppercase text-xs mb-4">No Holders</h3>
                                            {holdersNo.map((h) => <HolderRow key={h.name} holder={h} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: TRADING */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-32 bg-[#0E0E0E] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
                            <div className="flex justify-between mb-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-white opacity-40">Trade</h3>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-[#F492B7] bg-[#F492B7]/10 px-3 py-1 rounded-full"><Wallet size={10} /> <span>{solBalance.toFixed(2)} SOL</span></div>
                            </div>

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

                            <div className="mb-6 relative group">
                                <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0" className={`w-full bg-black border-2 rounded-2xl p-5 text-2xl font-black text-white focus:border-[#F492B7] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isOverBalance ? 'border-red-500' : 'border-white/10'}`} />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs uppercase tracking-widest pointer-events-none">SOL</span>
                            </div>

                            {amountNum > 0 && !isOverBalance && (
                                <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2 animate-in fade-in zoom-in">
                                    <div className="flex justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Value in USD</span>
                                        <span className="text-sm font-bold text-[#10B981]">${usdValueInTrading}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-white/5 pt-2">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Net Profit</span>
                                        <span className="text-sm font-bold text-[#10B981]">+{potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} SOL</span>
                                    </div>
                                </div>
                            )}

                            {isOverBalance && <div className="mb-6 text-red-500 text-[10px] font-black uppercase flex items-center gap-2 animate-pulse"><AlertCircle size={14} /> Insufficient Balance</div>}

                            <button onClick={handlePlaceBet} disabled={isPending || isOverBalance} className={`w-full font-black py-4 rounded-xl text-sm transition-all uppercase flex items-center justify-center gap-2 ${isSuccess ? 'bg-[#10B981]' : isOverBalance ? 'bg-gray-800' : 'bg-[#3B82F6] hover:bg-[#2563EB]'}`}>
                                {isPending ? <Loader2 className="animate-spin" size={18} /> : isSuccess ? <CheckCircle2 size={18} /> : 'Place Order'}
                            </button>

                            <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">SOL</span></div>
                                <span className="text-sm font-black text-white">${solPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// HELPERS MANTENIDOS
function TabButton({ label, icon, active, onClick }: any) { return <button onClick={onClick} className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors pb-2 ${active ? 'text-white border-b-2 border-[#F492B7]' : 'text-gray-600 hover:text-gray-400'}`}>{icon} {label}</button>; }
function ActivityRow({ user, action, amount, time, isSell = false }: any) { return <div className="flex items-center justify-between py-3 border-b border-white/5 px-4 hover:bg-white/5 transition-colors"><div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${isSell ? 'bg-red-500' : 'bg-[#10B981]'}`} /><Link href="/profile/default" className="text-xs font-bold text-white font-mono hover:text-[#F492B7] transition-colors">{user}</Link><span className={`text-[10px] font-black uppercase ${isSell ? 'text-red-500' : 'text-[#10B981]'}`}>{action}</span></div><div className="text-right"><span className="block text-xs font-bold text-white">{amount}</span><span className="text-[9px] text-gray-600 font-bold uppercase">{time}</span></div></div>; }
function HolderRow({ holder }: { holder: Holder }) { return <div className="flex items-center justify-between group py-2 px-4 hover:bg-white/5 rounded-xl transition-all"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">{holder.avatar || '👤'}</div><Link href={holder.isMe ? `/profile/${holder.name}` : '/profile/default'} className={`text-sm font-bold hover:underline hover:text-[#F492B7] transition-colors ${holder.isMe ? 'text-[#F492B7]' : 'text-gray-300'}`}>{holder.name} {holder.isMe && '(You)'}</Link></div><span className="font-mono text-sm font-black text-white">{holder.shares}</span></div>; }
function UserAvatar({ isMe, avatar }: { isMe: boolean, avatar: string | null }) { const commonClasses = "w-10 h-10 rounded-full shrink-0 shadow-lg border border-white/10 object-cover"; if (isMe) { if (avatar) return <img src={avatar} alt="Profile" className={commonClasses} />; return <div className={`${commonClasses} bg-gradient-to-br from-[#F492B7] to-purple-600`} />; } return <div className={`${commonClasses} bg-white/5 flex items-center justify-center text-lg`}>{avatar || '👤'}</div>; }