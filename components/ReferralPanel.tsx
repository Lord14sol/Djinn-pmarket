'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, Sparkles, Loader2 } from 'lucide-react';
import { getReferralCount, getReferredUsers } from '@/lib/supabase-db';

interface ReferralPanelProps {
    username: string;
    userId: string;
    targetReferrals?: number;
}

export default function ReferralPanel({ username, userId, targetReferrals = 3 }: ReferralPanelProps) {
    const [copied, setCopied] = useState(false);
    const [referralLink, setReferralLink] = useState('');
    const [referralCount, setReferralCount] = useState(0);
    const [referredUsers, setReferredUsers] = useState<any[]>([]);
    const [isSharing, setIsSharing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const link = `${window.location.origin}/r/${username}`;
        setReferralLink(link);

        const fetchData = async () => {
            if (!userId) return;
            setIsLoading(true);
            try {
                const [count, users] = await Promise.all([
                    getReferralCount(userId),
                    getReferredUsers(userId)
                ]);
                setReferralCount(count);
                setReferredUsers(users);
            } catch (error) {
                console.error('Error fetching referral data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [username, userId]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
        }
    };

    const shareOnX = async () => {
        setIsSharing(true);
        try {
            const tweetText = `Just claimed my spot on Djinn! 🔮\n\nJoin me in the future of prediction markets.\n\n${referralLink}`;
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            window.open(twitterUrl, '_blank', 'width=550,height=420');
        } catch (error) {
            console.error('Error sharing:', error);
        } finally {
            setIsSharing(false);
        }
    };

    const progress = Math.min((referralCount / targetReferrals) * 100, 100);
    const isComplete = referralCount >= targetReferrals;

    if (isLoading && referralCount === 0) {
        return (
            <div className="w-full max-w-2xl mx-auto mt-8 p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF69B4]" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto mt-8 p-8 bg-black/40 backdrop-blur-xl rounded-[2.5rem] border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-3">
                    <Sparkles className="w-8 h-8 text-[#FFD700] animate-pulse" />
                    <h2 className="text-3xl font-black lowercase tracking-tighter text-white italic">unlock full access</h2>
                    <Sparkles className="w-8 h-8 text-[#FFD700] animate-pulse" />
                </div>
                <p className="text-gray-300 font-bold text-sm tracking-tight">
                    When 3 friends connect with your referral you have granted access to Djinn
                </p>
            </div>

            {/* Progress Tracker */}
            <div className="mb-10">
                <div className="flex justify-between items-end mb-3 px-2">
                    <span className="text-white font-black lowercase tracking-tighter text-xl italic">Progress</span>
                    <span className="text-[#F492B7] font-black text-3xl tracking-tighter italic">
                        {referralCount}/{targetReferrals}
                    </span>
                </div>

                {/* Progress Bar - Neo Brutalist */}
                <div className="w-full h-8 bg-white border-[4px] border-black rounded-full overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div
                        className="h-full bg-[#10B981] border-r-[4px] border-black transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Milestone indicators */}
                <div className="flex justify-between mt-6 px-4">
                    {[1, 2, 3].map((milestone) => (
                        <div
                            key={milestone}
                            className={`flex flex-col items-center gap-2 transition-all duration-300 ${referralCount >= milestone ? 'scale-110' : 'opacity-40'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${referralCount >= milestone
                                ? 'bg-[#10B981]'
                                : 'bg-white'
                                }`}>
                                {referralCount >= milestone ? (
                                    <Check className="w-7 h-7 text-black stroke-[4]" />
                                ) : (
                                    <span className="text-black font-black text-lg italic">{milestone}</span>
                                )}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#F492B7]">Friend {milestone}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Referral Link */}
            <div className="mb-8">
                <label className="block text-[#F492B7] font-black lowercase text-sm mb-3 ml-2 tracking-widest">Your Referral Link</label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 px-6 py-4 bg-white border-[3px] border-black rounded-2xl text-black font-bold text-lg select-all outline-none"
                    />
                    <button
                        onClick={copyToClipboard}
                        className="px-8 py-4 bg-[#F492B7] text-black border-[3px] border-black rounded-2xl font-black uppercase text-sm tracking-widest shadow-[4px_4px_0px_0px_black] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_black] active:translate-y-0 active:shadow-none transition-all flex items-center gap-2"
                    >
                        {copied ? <Check className="w-5 h-5 stroke-[4]" /> : <Copy className="w-5 h-5 stroke-[3]" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            </div>

            {/* Share Button */}
            <button
                onClick={shareOnX}
                disabled={isSharing}
                className="w-full py-6 bg-white text-black border-[3px] border-black rounded-[1.5rem] font-black text-2xl lowercase italic tracking-tighter shadow-[8px_8px_0px_0px_black] hover:shadow-[4px_4px_0px_0px_black] hover:translate-x-[4px] hover:translate-y-[4px] active:shadow-none active:translate-x-[8px] active:translate-y-[8px] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
            >
                {isSharing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Share2 className="w-8 h-8 stroke-[3]" />}
                {isSharing ? 'Opening...' : 'Share on 𝕏'}
            </button>

            {/* Referred Users List */}
            {referredUsers.length > 0 && (
                <div className="mt-10 pt-8 border-t-[3px] border-white/10">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 mb-5 ml-2">
                        Your Referrals ({referredUsers.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {referredUsers.map((user, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 bg-white/5 border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_black]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#F492B7] border-[3px] border-black rounded-full flex items-center justify-center overflow-hidden">
                                        <img src={user.avatar_url || '/pink-pfp.png'} className="w-full h-full object-cover" alt={user.username} />
                                    </div>
                                    <span className="text-white font-black italic">@{user.username}</span>
                                </div>
                                <div className="bg-[#10B981] border-2 border-black rounded-full p-1 shadow-[2px_2px_0px_0px_black]">
                                    <Check className="w-4 h-4 text-black stroke-[4]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Success State */}
            {isComplete && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-5 bg-[#10B981]/20 border-[3px] border-[#10B981] rounded-2xl"
                >
                    <div className="flex items-center justify-center gap-3 text-[#10B981] font-black italic text-lg lowercase tracking-tighter">
                        <Check className="w-6 h-6 stroke-[4]" />
                        <span>Congratulations! Access granted to Djinn market 🔮</span>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

import { motion } from 'framer-motion';
