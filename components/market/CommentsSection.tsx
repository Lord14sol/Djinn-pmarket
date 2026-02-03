'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Send, Image as ImageIcon, MessageSquare, Heart, X, CornerDownRight, Loader2 } from 'lucide-react';
import * as supabaseDb from '@/lib/supabase-db';

interface CommentsSectionProps {
    marketSlug: string;
    publicKey: string | null;
    userProfile: { username: string; avatarUrl: string };
    marketOutcomes: any[]; // Passed from parent to determine colors
    myHeldPosition: string | null;
    myHeldAmount: string | null;
}

// Helper for dynamic colors (replicated from page.tsx for consistency)
const getOutcomeColor = (title: string, outcomes: any[]) => {
    if (!title) return '#9CA3AF'; // Gray
    const normalized = title.toUpperCase();
    if (normalized === 'YES') return '#10B981';
    if (normalized === 'NO') return '#EF4444';

    // Try to find in outcomes if color is defined there
    const outcome = outcomes.find(o => o.title === title);
    if (outcome && outcome.color) return outcome.color;

    // Fallback hash for dynamic outcomes
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
};

// FORMAT TIME AGO (Mejorado para mostrar "Just now", "2m ago", etc. correctamente)
function formatTimeAgo(timestamp: string): string {
    if (!timestamp) return 'Just now';
    const now = Date.now();
    const created = new Date(timestamp).getTime();

    // Si la fecha es inválida o futura (por error de reloj), mostrar Just now
    if (isNaN(created) || created > now) return 'Just now';

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

export default function CommentsSection({ marketSlug, publicKey, userProfile, myHeldPosition, myHeldAmount }: CommentsSectionProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [newCommentText, setNewCommentText] = useState("");
    const [newCommentImage, setNewCommentImage] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [replyImage, setReplyImage] = useState<string | null>(null); // ✅ NEW: Image for replies
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replyFileInputRef = useRef<HTMLInputElement>(null); // ✅ NEW: Separate ref for reply images
    const isPostingCommentRef = useRef(false);

    // 🔥 Estado del perfil del usuario actual
    const [currentUserProfile, setCurrentUserProfile] = useState({
        username: publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : 'Guest',
        pfp: '/pink-pfp.png'
    });

    // 🔥 FUNCIÓN PARA CARGAR PERFIL DEL USUARIO
    const loadCurrentUserProfile = async () => {
        if (!publicKey) {
            setCurrentUserProfile({ username: 'Guest', pfp: '/pink-pfp.png' });
            return;
        }

        const walletAddress = publicKey; // publicKey string in props
        const defaultName = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

        // 1️⃣ Intentar cache primero
        try {
            const cached = localStorage.getItem(`djinn_profile_${walletAddress}`);
            if (cached) {
                const profile = JSON.parse(cached);
                setCurrentUserProfile({
                    username: profile.username || defaultName,
                    pfp: profile.avatar_url || '/pink-pfp.png'
                });
            }
        } catch (e) {
            console.error('Cache error:', e);
        }

        // 2️⃣ Sincronizar con DB
        try {
            const dbProfile = await supabaseDb.getProfile(walletAddress);
            if (dbProfile) {
                const updated = {
                    username: dbProfile.username || defaultName,
                    pfp: dbProfile.avatar_url || '/pink-pfp.png'
                };
                setCurrentUserProfile(updated);
            }
        } catch (err) {
            console.error('Comment profile sync error:', err);
        }
    };

    // 🔥 EFFECT: Cargar perfil y escuchar actualizaciones
    useEffect(() => {
        if (publicKey) {
            loadCurrentUserProfile();

            const handleProfileUpdate = () => {
                console.log('🔄 CommentSection: Refreshing profile');
                loadCurrentUserProfile();
            };

            window.addEventListener('djinn-profile-updated', handleProfileUpdate);

            return () => {
                window.removeEventListener('djinn-profile-updated', handleProfileUpdate);
            };
        }
    }, [publicKey]);

    // Cargar comentarios
    const loadComments = useCallback(async () => {
        try {
            const data = await supabaseDb.getComments(marketSlug, publicKey || undefined);
            if (data && Array.isArray(data)) {
                const formatted = data.map(c => ({
                    ...c,
                    timeAgo: formatTimeAgo(c.created_at || ''),
                    replies: c.replies?.map((r: any) => ({ ...r, timeAgo: formatTimeAgo(r.created_at || '') })) || []
                }));
                setComments(formatted);
            } else {
                setComments([]);
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading comments:', error);
            setComments([]);
            setIsLoading(false);
        }
    }, [marketSlug, publicKey]);

    useEffect(() => {
        if (!marketSlug) return;

        loadComments();

        // Suscripción Realtime
        const channel = supabaseDb.subscribeToComments(marketSlug, (payload: any) => {
            // Recargar todo si hay cambios (para simplificar replies y estado)
            if ((payload?.new || payload?.old) && !isPostingCommentRef.current) {
                loadComments().catch(err => console.error('Error reloading comments:', err));
            }
        });

        // Interval para actualizar "time ago" cada minuto
        const interval = setInterval(() => {
            setComments(prev => prev.map(c => ({
                ...c,
                timeAgo: formatTimeAgo(c.created_at || ''),
                replies: c.replies?.map((r: any) => ({ ...r, timeAgo: formatTimeAgo(r.created_at || '') })) || []
            })));
        }, 60000);

        return () => {
            try {
                if (channel) channel.unsubscribe();
            } catch (err) {
                console.error('Error unsubscribing channel:', err);
            }
            clearInterval(interval);
        };
    }, [marketSlug, publicKey, loadComments]);

    const handlePostComment = async () => {
        if (!newCommentText.trim() && !newCommentImage) return;
        if (!publicKey) return alert("Connect wallet to comment");

        const tempId = 'temp-' + Date.now();
        // Optimistic UI update
        const tempComment = {
            id: tempId,
            username: userProfile.username,
            avatar_url: userProfile.avatarUrl,
            text: newCommentText,
            image_url: newCommentImage,
            position: myHeldPosition,
            position_amount: myHeldAmount,
            created_at: new Date().toISOString(),
            timeAgo: 'Just now',
            likes_count: 0,
            liked_by_me: false,
            replies: []
        };
        setComments([tempComment, ...comments]);

        // Guardar texto e imagen temporalmente para poder restaurar si falla
        const savedText = newCommentText;
        const savedImage = newCommentImage;

        // Limpiar input después del optimistic update
        setNewCommentText("");
        setNewCommentImage(null);

        isPostingCommentRef.current = true;
        try {
            // ✅ UPLOAD IMAGE TO STORAGE (if exists)
            let imageUrl: string | null = null;
            if (savedImage) {
                console.log('📤 Uploading image to Supabase Storage...');
                imageUrl = await supabaseDb.uploadImage(savedImage);
                if (!imageUrl) {
                    console.warn('⚠️ Image upload failed, falling back to base64');
                    imageUrl = savedImage; // Fallback to base64 if upload fails
                }
            }

            const { data: result, error } = await supabaseDb.createComment({
                market_slug: marketSlug,
                wallet_address: publicKey,
                username: userProfile.username,
                avatar_url: userProfile.avatarUrl,
                text: savedText || '', // Asegurar que text nunca sea undefined
                image_url: imageUrl, // ✅ Use storage URL or base64 fallback
                position: myHeldPosition,
                position_amount: myHeldAmount,
                parent_id: null
            });

            if (result && !error) {
                // Si se creó correctamente, recargar comentarios para obtener el ID real
                await loadComments();
            } else {
                console.error("Supabase Error:", error);
                // Si falló, restaurar el input y remover el comentario temporal
                setNewCommentText(savedText);
                setNewCommentImage(savedImage);
                setComments(prev => prev.filter(c => c.id !== tempId));
                alert(`Error al guardar el comentario: ${error?.message || JSON.stringify(error)}`);
            }
        } catch (error: any) {
            console.error('Error creating comment:', error);
            // Restaurar el input y remover el comentario temporal
            setNewCommentText(savedText);
            setNewCommentImage(savedImage);
            setComments(prev => prev.filter(c => c.id !== tempId));
            alert(`Error detallado: ${error.message || JSON.stringify(error, null, 2)}`);
        } finally {
            isPostingCommentRef.current = false;
        }
    };

    const handlePostReply = async (parentId: string) => {
        if (!replyText.trim() && !replyImage) return; // ✅ Allow image-only replies
        if (!publicKey) return alert("Connect wallet to reply");

        const savedReplyText = replyText;
        const savedReplyImage = replyImage;
        setReplyText("");
        setReplyImage(null); // ✅ Clear image state

        isPostingCommentRef.current = true;
        try {
            // ✅ UPLOAD IMAGE TO STORAGE (if exists)
            let imageUrl: string | null = null;
            if (savedReplyImage) {
                console.log('📤 Uploading reply image to Supabase Storage...');
                imageUrl = await supabaseDb.uploadImage(savedReplyImage);
                if (!imageUrl) {
                    console.warn('⚠️ Reply image upload failed, falling back to base64');
                    imageUrl = savedReplyImage; // Fallback to base64
                }
            }

            const { data: result, error } = await supabaseDb.createComment({
                market_slug: marketSlug,
                wallet_address: publicKey,
                username: userProfile.username,
                avatar_url: userProfile.avatarUrl,
                text: savedReplyText || '', // ✅ Empty string if no text
                image_url: imageUrl, // ✅ Use storage URL or base64 fallback
                position: myHeldPosition,
                position_amount: myHeldAmount,
                parent_id: parentId
            });

            if (result && !error) {
                setActiveReplyId(null);
                await loadComments();
            } else {
                console.error("Supabase Reply Error:", error);
                // Restaurar el texto e imagen si falló
                setReplyText(savedReplyText);
                setReplyImage(savedReplyImage);
                alert(`Error al guardar la respuesta: ${error?.message || JSON.stringify(error)}`);
            }
        } catch (error: any) {
            console.error('Error creating reply:', error);
            setReplyText(savedReplyText);
            setReplyImage(savedReplyImage);
            alert(`Error al guardar la respuesta: ${error.message || JSON.stringify(error)}`);
        } finally {
            isPostingCommentRef.current = false;
        }
    };

    const handleLike = async (commentId: string) => {
        if (!publicKey) return alert("Connect wallet to like");

        // Optimistic Like
        setComments(prev => prev.map(c => {
            if (c.id === commentId) return { ...c, likes_count: c.liked_by_me ? c.likes_count - 1 : c.likes_count + 1, liked_by_me: !c.liked_by_me };
            if (c.replies) {
                const updatedReplies = c.replies.map((r: any) => {
                    if (r.id === commentId) return { ...r, likes_count: r.liked_by_me ? r.likes_count - 1 : r.likes_count + 1, liked_by_me: !r.liked_by_me };
                    return r;
                });
                return { ...c, replies: updatedReplies };
            }
            return c;
        }));

        await supabaseDb.toggleLike(commentId, publicKey);
        // No recargamos para no romper el flow visual, confiamos en optimistic o futuro refresh
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewCommentImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // ✅ NEW: Handler for reply image uploads
    const handleReplyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setReplyImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="bg-[#0E0E0E] rounded-3xl p-6 md:p-8">
            <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-[#F492B7]" />
                Comments
            </h3>

            {/* INPUT AREA */}
            <div className="flex gap-4 mb-10">
                <div className="shrink-0">
                    <img
                        src={userProfile.avatarUrl || '/pink-pfp.png'}
                        className="w-10 h-10 rounded-full object-cover"
                        alt={userProfile.username}
                        onError={(e) => {
                            e.currentTarget.src = '/pink-pfp.png';
                        }}
                    />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-[#F492B7]">{userProfile.username || 'You'}</span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 focus-within:bg-black transition-all">
                        <textarea
                            className="w-full bg-transparent p-2 text-sm focus:outline-none resize-none h-20 placeholder:text-gray-600 font-medium"
                            placeholder="Add a comment..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                        />
                        {newCommentImage && (
                            <div className="relative inline-block mt-2">
                                <img src={newCommentImage} alt="Preview" className="h-20 rounded-lg border border-white/10" />
                                <button onClick={() => setNewCommentImage(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"><X size={10} /></button>
                            </div>
                        )}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                            <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-white transition-colors">
                                <ImageIcon size={18} />
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" />
                            <button
                                onClick={handlePostComment}
                                disabled={!newCommentText.trim() && !newCommentImage}
                                className="bg-[#F492B7] text-black px-6 py-2 rounded-xl text-xs font-black uppercase hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Send size={12} /> Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* COMMENTS LIST */}
            <div className="space-y-8">
                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-500" /></div>
                ) : comments.length === 0 ? (
                    null
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="group">
                            <div className="flex gap-4">
                                {/* Avatar */}
                                <Link href={`/profile/${comment.username}`} className="shrink-0 hover:opacity-80 transition-opacity">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                        <img
                                            src={comment.avatar_url || "/pink-pfp.png"}
                                            className="w-full h-full object-cover"
                                            alt={comment.username}
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = "/pink-pfp.png";
                                            }}
                                        />
                                    </div>
                                </Link>
                                <div className="flex-1">
                                    <div className="flex items-baseline justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/profile/${comment.username}`} className={`text-sm font-bold hover:text-[#F492B7] transition-colors ${comment.username === currentUserProfile.username ? 'text-[#F492B7]' : 'text-white'}`}>
                                                {comment.username}
                                            </Link>
                                            <span className="text-[10px] text-gray-500 font-medium">{comment.timeAgo}</span>
                                            {comment.position && (
                                                <span
                                                    className="text-[9px] font-black px-1.5 py-0.5 rounded border ml-2"
                                                    style={{
                                                        borderColor: `${getOutcomeColor(comment.position, [])}40`, // 40 = 25% opacity
                                                        backgroundColor: `${getOutcomeColor(comment.position, [])}20`, // 20 = 12% opacity
                                                        color: getOutcomeColor(comment.position, [])
                                                    }}
                                                >
                                                    BOUGHT {comment.position} {comment.position_amount}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-gray-300 text-sm leading-relaxed mb-3">
                                        {comment.text}
                                    </div>
                                    {comment.image_url && (
                                        <img src={comment.image_url} alt="Comment attachment" className="rounded-xl max-h-60 border border-white/10 mb-3" />
                                    )}

                                    <div className="flex items-center gap-6">
                                        <button onClick={() => handleLike(comment.id)} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${comment.liked_by_me ? 'text-pink-500' : 'text-gray-500 hover:text-pink-400'}`}>
                                            <Heart size={14} fill={comment.liked_by_me ? "currentColor" : "none"} /> {comment.likes_count || 0}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (activeReplyId === comment.id) {
                                                    setActiveReplyId(null);
                                                    setReplyImage(null); // ✅ Clear image when closing
                                                    setReplyText(''); // ✅ Clear text too
                                                } else {
                                                    setActiveReplyId(comment.id);
                                                }
                                            }}
                                            className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1.5"
                                        >
                                            Reply
                                        </button>
                                    </div>

                                    {/* REPLY INPUT - ✅ ENHANCED WITH IMAGE SUPPORT */}
                                    {activeReplyId === comment.id && (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs shrink-0">You</div>
                                                <div className="flex-1">
                                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 focus-within:border-[#F492B7] transition-colors">
                                                        <input
                                                            autoFocus
                                                            className="w-full bg-transparent text-sm focus:outline-none"
                                                            placeholder="Write a reply..."
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePostReply(comment.id)}
                                                        />
                                                        {replyImage && (
                                                            <div className="relative inline-block mt-2">
                                                                <img src={replyImage} alt="Reply preview" className="h-16 rounded-lg border border-white/10" />
                                                                <button onClick={() => setReplyImage(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors">
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                                                            <button onClick={() => replyFileInputRef.current?.click()} className="text-gray-500 hover:text-white transition-colors">
                                                                <ImageIcon size={16} />
                                                            </button>
                                                            <input type="file" ref={replyFileInputRef} className="hidden" onChange={handleReplyImageUpload} accept="image/*" />
                                                            <button
                                                                onClick={() => handlePostReply(comment.id)}
                                                                disabled={!replyText.trim() && !replyImage}
                                                                className="bg-[#F492B7] text-black px-4 py-1.5 rounded-lg text-xs font-black uppercase hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                                            >
                                                                <Send size={14} /> Send
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* REPLIES LIST */}
                                    {comment.replies && comment.replies.length > 0 && (
                                        <div className="mt-4 space-y-4 pl-4 border-l-2 border-white/5">
                                            {comment.replies.map((reply: any) => (
                                                <div key={reply.id} className="flex gap-3">
                                                    <div className="shrink-0">
                                                        {reply.avatar_url ? (
                                                            <img
                                                                src={reply.avatar_url}
                                                                className="w-8 h-8 rounded-full object-cover border border-white/10"
                                                                alt={reply.username}
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${reply.username}&background=random`;
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">👤</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Link href={reply.username === userProfile.username ? `/profile/${userProfile.username}` : '/profile/default'} className="text-xs font-bold text-[#F492B7] hover:underline">
                                                                {reply.username}
                                                            </Link>
                                                            <span className="text-[9px] text-gray-500">{reply.timeAgo}</span>
                                                        </div>
                                                        <p className="text-gray-400 text-xs leading-relaxed">{reply.text}</p>
                                                        {/* ✅ NEW: Display reply image if exists */}
                                                        {reply.image_url && (
                                                            <img src={reply.image_url} alt="Reply attachment" className="rounded-lg max-h-40 border border-white/10 mt-2" />
                                                        )}
                                                        <button onClick={() => handleLike(reply.id)} className={`mt-2 flex items-center gap-1 text-[10px] font-bold transition-colors ${reply.liked_by_me ? 'text-pink-500' : 'text-gray-600 hover:text-pink-400'}`}>
                                                            <Heart size={10} fill={reply.liked_by_me ? "currentColor" : "none"} /> {reply.likes_count || 0}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="h-px bg-white/5 my-6" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
