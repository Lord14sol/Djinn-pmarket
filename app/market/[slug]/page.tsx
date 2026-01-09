'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Clock, DollarSign, Wallet, MessageSquare, Activity, Image as ImageIcon, X, Send, Heart, CornerDownRight } from 'lucide-react';

// --- TIPOS DE DATOS ---
type PositionType = 'YES' | 'NO' | null;

interface Comment {
    id: number;
    user: string;
    avatar: string | null; // Null si usamos el gradiente por defecto o la imagen de perfil
    isMe: boolean; // Para identificar si es MI LORD
    time: string;
    text: string;
    image: string | null;
    likes: number;
    likedByMe: boolean;
    position: PositionType;
    positionAmount: string | null; // NUEVO: Para guardar cuánto compró
    replies: Comment[];
}

const marketData: Record<string, any> = {
    'argentina-world-cup-2026': { title: "Will Argentina be finalist on the FIFA World Cup 2026?", icon: "🇦🇷", yesPrice: 45, noPrice: 55, volume: "$12.5M", description: "Se resuelve YES si Argentina juega la final." },
    'btc-hit-150k': { title: 'Will Bitcoin reach ATH on 2026?', icon: '₿', yesPrice: 82, noPrice: 18, volume: '$45.2M', description: 'Resolves YES if BTC breaks its previous record.' },
    'pumpfun-airdrop-2026': { title: "Will PumpFun do a airdrop on 2026?", icon: "💊", yesPrice: 91, noPrice: 9, volume: "$8.1M", description: "Resolves YES if a token is distributed." },
    'nothing-ever-happens': { title: "Nothing ever happens?", icon: "🥱", yesPrice: 99, noPrice: 1, volume: "$2.4M", description: "The ultimate bet on stability." },
    'gta-6-delay': { title: "Will Rockstar Games delay GTA 6 on 2026?", icon: "🎮", yesPrice: 55, noPrice: 45, volume: "$15.3M", description: "Resolves YES if Rockstar officially announces a delay." },
    'china-taiwan-invasion': { title: "Will China invade Taiwan?", icon: "🇨🇳", yesPrice: 12, noPrice: 88, volume: "$33.1M", description: "Geopolitical resolution based on international news." },
    'buenos-aires-temperature': { title: "Highest temperature in Buenos Aires today?", icon: "☀️", yesPrice: 75, noPrice: 25, volume: "$500K", description: "Resolves based on SMN official records." },
    'trump-djinn-tweet': { title: "Will Trump tweet about Djinn?", icon: "🇺🇸", yesPrice: 5, noPrice: 95, volume: "$1.2M", description: "Resolves YES if 'Djinn' is mentioned by Trump on X." }
};

// INITIAL COMMENTS DATA
const initialComments: Comment[] = [
    {
        id: 1, user: "SatoshiNakamoto", avatar: "😈", isMe: false, time: "2h ago",
        text: "This is free money honestly. Look at the volume spike. Whales are accumulating YES shares.",
        image: null, likes: 45, likedByMe: false, position: 'YES', positionAmount: '$50k', replies: []
    },
    {
        id: 2, user: "AlienTruth", avatar: "👽", isMe: false, time: "5h ago",
        text: "Don't be fooled, whales are trapping bulls here. The resistance at 85 cents is too strong.",
        image: null, likes: 12, likedByMe: false, position: 'NO', positionAmount: '$12.5k', replies: []
    }
];

export default function MarketPage() {
    const params = useParams();
    const slug = params.slug as string;

    // --- PERFIL DE MI LORD (CON FOTO REAL) ---
    const [userProfile, setUserProfile] = useState({
        username: "Lord",
        avatarUrl: null as string | null // URL de la foto de perfil real
    });

    const [market, setMarket] = useState<any>(null);
    const [betAmount, setBetAmount] = useState('');
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');
    const [bottomTab, setBottomTab] = useState<'ACTIVITY' | 'COMMENTS'>('ACTIVITY');

    // ESTADO DE POSICIÓN (Lo que compró mi Lord)
    const [myHeldPosition, setMyHeldPosition] = useState<PositionType>(null);
    const [myHeldAmount, setMyHeldAmount] = useState<string | null>(null); // Guardamos el monto formateado

    // ESTADOS PARA COMENTARIOS
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [newCommentText, setNewCommentText] = useState("");
    const [newCommentImage, setNewCommentImage] = useState<string | null>(null);

    // REFS para inputs de archivo
    const fileInputRef = useRef<HTMLInputElement>(null); // Para imágenes en comentarios
    const profileFileInputRef = useRef<HTMLInputElement>(null); // Para la foto de perfil

    // ESTADOS PARA RESPUESTAS
    const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");

    // 1. CARGAR DATOS
    useEffect(() => {
        let foundMarket = marketData[slug];

        // Recuperar perfil guardado (Simulación)
        const savedProfile = localStorage.getItem('djinn_user_profile');
        if (savedProfile) {
            setUserProfile(JSON.parse(savedProfile));
        }

        if (!foundMarket) {
            const savedMarkets = localStorage.getItem('djinn_markets');
            if (savedMarkets) {
                const customMarkets = JSON.parse(savedMarkets);
                foundMarket = customMarkets.find((m: any) => m.slug === slug);
                if (foundMarket) {
                    foundMarket = {
                        ...foundMarket,
                        yesPrice: foundMarket.chance || 50,
                        noPrice: 100 - (foundMarket.chance || 50),
                        description: "New market manifested by a Djinn Master. Predictions are live."
                    };
                }
            }
        }
        if (!foundMarket) {
            foundMarket = { title: slug ? slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Unknown Market', icon: "🔮", yesPrice: 50, noPrice: 50, volume: "$0", description: "Predicting the future of this unique event." };
        }
        setMarket(foundMarket);

        // Recuperar Estado
        const savedComments = localStorage.getItem(`comments_${slug}`);
        if (savedComments) setComments(JSON.parse(savedComments));

        const savedPosition = localStorage.getItem(`position_${slug}`);
        if (savedPosition) setMyHeldPosition(savedPosition as PositionType);

        const savedAmount = localStorage.getItem(`amount_${slug}`);
        if (savedAmount) setMyHeldAmount(savedAmount);

    }, [slug]);

    // 2. GUARDAR CAMBIOS
    useEffect(() => {
        if (slug) {
            localStorage.setItem(`comments_${slug}`, JSON.stringify(comments));
        }
    }, [comments, slug]);

    // --- TRADING LOGIC ---
    const handlePlaceBet = () => {
        if (!betAmount || parseFloat(betAmount) <= 0) return;

        const formattedAmount = `$${betAmount}`; // Formato simple

        setMyHeldPosition(selectedSide);
        setMyHeldAmount(formattedAmount);

        localStorage.setItem(`position_${slug}`, selectedSide);
        localStorage.setItem(`amount_${slug}`, formattedAmount);

        alert(`¡Apuesta realizada, mi Lord! Ahora posee ${formattedAmount} en ${selectedSide}.`);
        setBetAmount('');
    };

    // --- COMENTARIOS PRINCIPALES ---
    const handlePostComment = () => {
        if (!newCommentText.trim() && !newCommentImage) return;

        const newComment: Comment = {
            id: Date.now(),
            user: userProfile.username,
            avatar: null, // Null fuerza a usar el avatar del perfil del Lord
            isMe: true, // ES USTED
            time: "Just now",
            text: newCommentText,
            image: newCommentImage,
            likes: 0,
            likedByMe: false,
            position: myHeldPosition,
            positionAmount: myHeldAmount, // Inyectamos el monto comprado
            replies: []
        };

        setComments([newComment, ...comments]);
        setNewCommentText("");
        setNewCommentImage(null);
    };

    // --- RESPUESTAS (REPLIES) ---
    const handlePostReply = (parentId: number) => {
        if (!replyText.trim()) return;

        const newReply: Comment = {
            id: Date.now(),
            user: userProfile.username,
            avatar: null,
            isMe: true,
            time: "Just now",
            text: replyText,
            image: null,
            likes: 0,
            likedByMe: false,
            position: myHeldPosition,
            positionAmount: myHeldAmount,
            replies: []
        };

        const updatedComments = comments.map(comment => {
            if (comment.id === parentId) {
                return { ...comment, replies: [...comment.replies, newReply] };
            }
            return comment;
        });

        setComments(updatedComments);
        setReplyText("");
        setActiveReplyId(null);
    };

    const handleToggleLike = (commentId: number, isReply = false, parentId: number | null = null) => {
        const updateLike = (c: Comment) => ({ ...c, likes: c.likedByMe ? c.likes - 1 : c.likes + 1, likedByMe: !c.likedByMe });
        if (!isReply) {
            setComments(comments.map(c => c.id === commentId ? updateLike(c) : c));
        } else if (parentId) {
            setComments(comments.map(parent => {
                if (parent.id === parentId) {
                    return { ...parent, replies: parent.replies.map(r => r.id === commentId ? updateLike(r) : r) };
                }
                return parent;
            }));
        }
    };

    // Subir imagen para el comentario
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setNewCommentImage(reader.result as string); };
            reader.readAsDataURL(file);
        }
    };

    // Subir foto de perfil REAL
    const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newUrl = reader.result as string;
                const newProfile = { ...userProfile, avatarUrl: newUrl };
                setUserProfile(newProfile);
                localStorage.setItem('djinn_user_profile', JSON.stringify(newProfile));
            };
            reader.readAsDataURL(file);
        }
    };

    if (!market) return <div className="min-h-screen bg-black" />;

    const potentialPayout = betAmount
        ? (parseFloat(betAmount) * (100 / (selectedSide === 'YES' ? market.yesPrice : market.noPrice))).toFixed(2)
        : "0.00";

    const returnPercentage = betAmount
        ? (((parseFloat(potentialPayout) - parseFloat(betAmount)) / parseFloat(betAmount)) * 100).toFixed(0)
        : "0";

    // COMPONENTE HELPER PARA EL AVATAR (Actualizado)
    const UserAvatar = ({ isMe, avatar, onClick }: { isMe: boolean, avatar: string | null, onClick?: () => void }) => {
        const commonClasses = "w-10 h-10 rounded-full shrink-0 shadow-lg border border-white/10 object-cover";

        if (isMe) {
            if (userProfile.avatarUrl) {
                // FOTO DE PERFIL REAL DEL LORD
                return <img src={userProfile.avatarUrl} alt="Profile" className={`${commonClasses} cursor-pointer`} onClick={onClick} />;
            }
            // Gradiente por defecto si no hay foto
            return <div className={`${commonClasses} bg-gradient-to-br from-[#F492B7] to-purple-600 cursor-pointer`} onClick={onClick} />;
        }
        // Avatar de mortales
        return (
            <div className={`${commonClasses} bg-white/5 flex items-center justify-center text-lg`}>
                {avatar}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#F492B7] selection:text-black font-sans pb-32">
            <Navbar />
            <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#F492B7]/5 via-black to-black pointer-events-none" />

            <div className="max-w-7xl mx-auto pt-32 px-6 relative z-10">
                <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
                    {typeof market.icon === 'string' && market.icon.startsWith('data:') ? (
                        <img src={market.icon} className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.05)] border border-white/10" alt="" />
                    ) : (
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-[#0E0E0E] rounded-3xl border border-white/10 flex items-center justify-center text-6xl shadow-2xl">{market.icon}</div>
                    )}
                    <div className="flex-1">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-6 leading-[1.1] max-w-4xl">{market.title}</h1>
                        <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"><DollarSign size={12} className="text-[#F492B7]" /><span>Vol: <span className="text-white">{market.volume}</span></span></div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"><Clock size={12} className="text-blue-400" /><span>Ends: <span className="text-white">2026</span></span></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {/* CHART SECTION */}
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden group">
                            <div className="flex justify-between items-end mb-8 relative z-10">
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Probability over time</p>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-5xl font-black text-[#10B981]">{market.yesPrice}%</span>
                                        <span className="text-sm font-bold text-emerald-500/60">+2.4% Today</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {['1H', '1D', '1W', 'ALL'].map(time => (
                                        <button key={time} className="px-3 py-1 rounded bg-white/5 text-[10px] font-bold text-gray-500 hover:text-white transition-colors">{time}</button>
                                    ))}
                                </div>
                            </div>
                            <MockChart color="#10B981" />
                        </div>

                        <div className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-8">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Market Rules</h3>
                            <p className="text-gray-300 leading-relaxed font-medium">{market.description}</p>
                        </div>

                        {/* COMMENTS SECTION */}
                        <div className="pt-8 border-t border-white/5">
                            <div className="flex items-center gap-6 mb-8">
                                <button onClick={() => setBottomTab('ACTIVITY')} className={`flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-colors ${bottomTab === 'ACTIVITY' ? 'text-white border-b-2 border-[#F492B7] pb-2' : 'text-gray-600 hover:text-gray-400 pb-2'}`}><Activity size={16} /> Activity</button>
                                <button onClick={() => setBottomTab('COMMENTS')} className={`flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-colors ${bottomTab === 'COMMENTS' ? 'text-white border-b-2 border-[#F492B7] pb-2' : 'text-gray-600 hover:text-gray-400 pb-2'}`}><MessageSquare size={16} /> Comments</button>
                            </div>

                            {bottomTab === 'ACTIVITY' && (
                                <div className="bg-[#0E0E0E] rounded-[2rem] border border-white/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                                    <ActivityRow user="0x34...A2" action="Bought YES" amount="$5,000" time="2m ago" />
                                    <ActivityRow user="Whale_Hunter" action="Bought NO" amount="$12,500" time="5m ago" isSell />
                                    <ActivityRow user="ElonLover" action="Bought YES" amount="$420" time="12m ago" />
                                </div>
                            )}

                            {bottomTab === 'COMMENTS' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    {/* INPUT AREA CON FOTO DE PERFIL */}
                                    <div className="flex gap-4 mb-8 items-start">
                                        {/* Click en el avatar para cambiar la foto */}
                                        <UserAvatar isMe={true} avatar={null} onClick={() => profileFileInputRef.current?.click()} />
                                        <input type="file" ref={profileFileInputRef} className="hidden" accept="image/*" onChange={handleProfileImageUpload} />

                                        <div className="flex-1 space-y-3">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={newCommentText}
                                                    onChange={(e) => setNewCommentText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                                    placeholder={`Comentar como ${userProfile.username}...`}
                                                    className="w-full bg-[#0E0E0E] border border-white/10 rounded-2xl pl-4 pr-24 py-3 text-sm focus:border-[#F492B7] outline-none transition-colors"
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"><ImageIcon size={18} /></button>
                                                    <button onClick={handlePostComment} className="p-2 text-[#F492B7] hover:bg-[#F492B7]/10 rounded-lg transition-all"><Send size={18} /></button>
                                                </div>
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </div>
                                            {newCommentImage && (
                                                <div className="relative inline-block">
                                                    <img src={newCommentImage} className="h-20 w-auto rounded-lg border border-white/10" alt="Preview" />
                                                    <button onClick={() => setNewCommentImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"><X size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* COMMENTS LIST */}
                                    <div className="space-y-8">
                                        {comments.map((comment) => (
                                            <div key={comment.id} className="group">
                                                <div className="flex gap-4">

                                                    <UserAvatar isMe={comment.isMe} avatar={comment.avatar} />

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-sm font-bold ${comment.isMe ? 'text-[#F492B7]' : 'text-white'}`}>
                                                                {comment.user}
                                                            </span>

                                                            {/* --- BADGES CON MONTO MAS GRANDE Y VISIBLE --- */}
                                                            {comment.position === 'YES' && (
                                                                <span className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                                    BOUGHT YES
                                                                    {comment.positionAmount && <span className="font-mono text-white font-black text-sm ml-0.5">{comment.positionAmount}</span>}
                                                                </span>
                                                            )}
                                                            {comment.position === 'NO' && (
                                                                <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                                    BOUGHT NO
                                                                    {comment.positionAmount && <span className="font-mono text-white font-black text-sm ml-0.5">{comment.positionAmount}</span>}
                                                                </span>
                                                            )}
                                                            {/* ------------------------------------ */}

                                                            <span className="text-[10px] text-gray-600 font-black uppercase ml-auto">{comment.time}</span>
                                                        </div>

                                                        <p className="text-gray-300 text-base leading-relaxed">{comment.text}</p>

                                                        {comment.image && (
                                                            <img src={comment.image} className="mt-3 rounded-xl border border-white/10 max-h-80 w-auto shadow-lg" alt="Comment attachment" />
                                                        )}

                                                        <div className="flex items-center gap-4 mt-2">
                                                            <button
                                                                onClick={() => handleToggleLike(comment.id)}
                                                                className={`flex items-center gap-1 text-xs font-bold transition-colors ${comment.likedByMe ? 'text-[#F492B7]' : 'text-gray-500 hover:text-white'}`}
                                                            >
                                                                <Heart size={14} fill={comment.likedByMe ? "currentColor" : "none"} />
                                                                {comment.likes > 0 ? comment.likes : 'Like'}
                                                            </button>
                                                            <button onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)} className="text-xs font-bold text-gray-500 hover:text-white transition-colors">Reply</button>
                                                        </div>

                                                        {/* REPLY INPUT */}
                                                        {activeReplyId === comment.id && (
                                                            <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
                                                                <UserAvatar isMe={true} avatar={null} />
                                                                <div className="flex-1 relative">
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        value={replyText}
                                                                        onChange={(e) => setReplyText(e.target.value)}
                                                                        onKeyDown={(e) => e.key === 'Enter' && handlePostReply(comment.id)}
                                                                        placeholder={`Reply to ${comment.user}...`}
                                                                        className="w-full bg-[#0E0E0E] border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-[#F492B7] outline-none"
                                                                    />
                                                                    <button onClick={() => handlePostReply(comment.id)} className="absolute right-2 top-1.5 text-[#F492B7]"><CornerDownRight size={14} /></button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* REPLIES LIST */}
                                                {comment.replies.length > 0 && (
                                                    <div className="mt-4 ml-12 space-y-4 border-l-2 border-white/5 pl-4">
                                                        {comment.replies.map((reply) => (
                                                            <div key={reply.id} className="flex gap-3">
                                                                <UserAvatar isMe={reply.isMe} avatar={reply.avatar} />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <span className={`text-xs font-bold ${reply.isMe ? 'text-[#F492B7]' : 'text-white'}`}>{reply.user}</span>
                                                                        {reply.position === 'YES' && <span className="text-[8px] bg-[#10B981]/10 text-[#10B981] px-1 rounded font-black uppercase">YES Holder</span>}
                                                                        {reply.position === 'NO' && <span className="text-[8px] bg-red-500/10 text-red-500 px-1 rounded font-black uppercase">NO Holder</span>}
                                                                        <span className="text-[9px] text-gray-600 font-black ml-auto">{reply.time}</span>
                                                                    </div>
                                                                    <p className="text-gray-400 text-sm leading-snug">{reply.text}</p>
                                                                    <div className="flex items-center gap-3 mt-1">
                                                                        <button
                                                                            onClick={() => handleToggleLike(reply.id, true, comment.id)}
                                                                            className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${reply.likedByMe ? 'text-[#F492B7]' : 'text-gray-600 hover:text-white'}`}
                                                                        >
                                                                            <Heart size={10} fill={reply.likedByMe ? "currentColor" : "none"} />
                                                                            {reply.likes > 0 && reply.likes}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-32 space-y-4">
                            <div className="bg-[#0E0E0E] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F492B7]/5 blur-[50px] rounded-full pointer-events-none" />
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Trade</h3>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-lg"><Wallet size={10} /> <span>0.00 SOL</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button onClick={() => setSelectedSide('YES')} className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 group ${selectedSide === 'YES' ? 'bg-[#10B981]/10 border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                                        <span className={`block text-xs font-black uppercase tracking-widest mb-1 ${selectedSide === 'YES' ? 'text-[#10B981]' : 'text-gray-500'}`}>YES</span>
                                        <span className={`block text-3xl font-black ${selectedSide === 'YES' ? 'text-white' : 'text-gray-600'}`}>{market.yesPrice}¢</span>
                                    </button>
                                    <button onClick={() => setSelectedSide('NO')} className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 group ${selectedSide === 'NO' ? 'bg-red-500/10 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                                        <span className={`block text-xs font-black uppercase tracking-widest mb-1 ${selectedSide === 'NO' ? 'text-red-500' : 'text-gray-500'}`}>NO</span>
                                        <span className={`block text-3xl font-black ${selectedSide === 'NO' ? 'text-white' : 'text-gray-600'}`}>{market.noPrice}¢</span>
                                    </button>
                                </div>
                                <div className="mb-6 relative group">
                                    <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0" className="w-full bg-black border border-white/10 rounded-2xl p-6 text-3xl font-black text-white focus:border-[#F492B7] outline-none transition-all placeholder:text-gray-800 no-spinner" />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-sm uppercase tracking-widest pointer-events-none">USDC</span>
                                </div>
                                {betAmount && (
                                    <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center animate-in fade-in zoom-in duration-200">
                                        <div className="flex flex-col"><span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Potential Return</span><span className="text-lg font-black text-[#F492B7]">+{returnPercentage}%</span></div>
                                        <div className="text-right"><span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Payout</span><span className="block text-xl font-black text-white">${potentialPayout}</span></div>
                                    </div>
                                )}
                                <button onClick={handlePlaceBet} className="w-full bg-[#FF5858] hover:bg-[#ff4444] active:scale-[0.98] text-white font-black py-5 rounded-xl text-sm tracking-widest shadow-[0_0_20px_rgba(255,88,88,0.4)] transition-all uppercase">Place Bet</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---
function MockChart({ color }: { color: string }) {
    return (
        <div className="relative w-full h-[250px] overflow-hidden group">
            <svg viewBox="0 0 400 150" className="w-full h-full preserve-3d">
                <defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.4" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
                <path d="M0,150 L0,100 C50,90 100,120 150,80 C200,40 250,90 300,50 C350,10 400,30 400,30 L400,150 Z" fill="url(#chartGradient)" />
                <path d="M0,100 C50,90 100,120 150,80 C200,40 250,90 300,50 C350,10 400,30" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </svg>
        </div>
    )
}
function ActivityRow({ user, action, amount, time, isSell = false }: any) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/5 px-4 transition-colors cursor-default">
            <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${isSell ? 'bg-red-500' : 'bg-[#10B981]'}`} /><span className="text-sm font-bold text-white font-mono">{user}</span><span className={`text-xs font-black uppercase ${isSell ? 'text-red-500' : 'text-[#10B981]'}`}>{action}</span></div>
            <div className="text-right"><span className="block text-sm font-bold text-white">{amount}</span><span className="text-[10px] text-gray-600 font-bold uppercase">{time}</span></div>
        </div>
    )
}