'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Loader2, Lock, Unlock, Users, Link2 } from 'lucide-react';
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

        const fetchData = async (showLoading = false) => {
            if (!userId) return;
            if (showLoading) setIsLoading(true);
            try {
                const [count, users] = await Promise.all([
                    getReferralCount(userId),
                    getReferredUsers(userId)
                ]);

                // If we hit exactly 3, and were previously at < 3, trigger access
                if (count >= 3) {
                    const { grantReferralAccess } = await import('@/lib/supabase-db');
                    await grantReferralAccess(userId);
                }

                setReferralCount(count);
                setReferredUsers(users);
            } catch (error) {
                console.error('Error fetching referral data:', error);
            } finally {
                if (showLoading) setIsLoading(false);
            }
        };

        fetchData(referralCount === 0);
        const interval = setInterval(() => fetchData(false), 15000);
        return () => clearInterval(interval);
    }, [username, userId, referralCount]);

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
            const tweetText = `Just claimed my spot on @djinnmarkets! 🔮\n\nJoin me in the future of prediction markets.\n\n${referralLink}`;
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
            <div className="w-full max-w-2xl mx-auto p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#F492B7]" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 16 }}
            className="w-full max-w-2xl mx-auto"
        >
            {/* Main Card */}
            <div className="relative bg-white border-[4px] border-black rounded-[2rem] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">

                {/* Header Strip */}
                <div className="bg-black px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isComplete ? (
                            <Unlock className="w-6 h-6 text-[#10B981] stroke-[3]" />
                        ) : (
                            <Lock className="w-6 h-6 text-[#F492B7] stroke-[3]" />
                        )}
                        <h2 className="text-white font-black uppercase tracking-[0.15em] text-sm">
                            {isComplete ? 'Access Unlocked' : 'Unlock Access'}
                        </h2>
                    </div>
                    <div className="bg-white border-[3px] border-black rounded-full px-4 py-1.5 shadow-[3px_3px_0px_0px_#F492B7]">
                        <span className="font-black text-black text-lg tracking-tighter italic">
                            {referralCount}/{targetReferrals}
                        </span>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="px-8 pt-8 pb-6">
                    <p className="text-black/60 font-bold text-sm tracking-tight mb-6 text-center">
                        invite 3 friends to unlock full access to djinn
                    </p>

                    {/* Slot Machine Style Progress */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {[1, 2, 3].map((slot) => {
                            const isFilled = referralCount >= slot;
                            const user = referredUsers[slot - 1];
                            return (
                                <motion.div
                                    key={slot}
                                    initial={false}
                                    animate={isFilled ? { scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] } : {}}
                                    transition={{ duration: 0.5, delay: slot * 0.1 }}
                                    className="flex flex-col items-center gap-3"
                                >
                                    <div className={`
                                        relative w-20 h-20 rounded-2xl border-[4px] border-black
                                        flex items-center justify-center overflow-hidden
                                        transition-all duration-500
                                        ${isFilled
                                            ? 'bg-[#10B981] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
                                            : 'bg-gray-100 shadow-[5px_5px_0px_0px_rgba(0,0,0,0.15)]'
                                        }
                                    `}>
                                        {isFilled ? (
                                            user ? (
                                                <img
                                                    src={user.avatar_url || '/pink-pfp.png'}
                                                    className="w-full h-full object-cover"
                                                    alt={user.username}
                                                />
                                            ) : (
                                                <Check className="w-10 h-10 text-black stroke-[3]" />
                                            )
                                        ) : (
                                            <span className="text-black/20 font-black text-3xl italic">{slot}</span>
                                        )}
                                        {isFilled && (
                                            <div className="absolute -bottom-0.5 -right-0.5 bg-[#10B981] border-[2px] border-black rounded-full p-0.5">
                                                <Check className="w-3 h-3 text-black stroke-[4]" />
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isFilled ? 'text-[#10B981]' : 'text-black/30'}`}>
                                        {isFilled && user ? `@${user.username}` : `Friend ${slot}`}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full h-5 bg-gray-100 border-[3px] border-black rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                            className={`h-full rounded-full ${isComplete ? 'bg-[#10B981]' : 'bg-[#F492B7]'}`}
                        />
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-8 border-t-[3px] border-black/10" />

                {/* Referral Link Section */}
                <div className="px-8 py-6">
                    <label className="flex items-center gap-2 text-black font-black uppercase text-[11px] tracking-[0.2em] mb-3 ml-1">
                        <Link2 className="w-4 h-4 stroke-[3]" />
                        Your Link
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={referralLink}
                                readOnly
                                className="w-full px-5 py-3.5 bg-gray-50 border-[3px] border-black rounded-xl text-black font-bold text-sm select-all outline-none focus:bg-[#F492B7]/5 transition-colors truncate pr-3"
                            />
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className={`
                                px-6 py-3.5 border-[3px] border-black rounded-xl font-black uppercase text-xs tracking-widest
                                shadow-[4px_4px_0px_0px_black] hover:shadow-[2px_2px_0px_0px_black]
                                hover:translate-x-[2px] hover:translate-y-[2px]
                                active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                                transition-all flex items-center gap-2 whitespace-nowrap
                                ${copied
                                    ? 'bg-[#10B981] text-black'
                                    : 'bg-[#F492B7] text-black'
                                }
                            `}
                        >
                            {copied ? <Check className="w-4 h-4 stroke-[4]" /> : <Copy className="w-4 h-4 stroke-[3]" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* Share on X Button */}
                <div className="px-8 pb-8">
                    <button
                        onClick={shareOnX}
                        disabled={isSharing}
                        className="w-full py-5 bg-black text-white border-[3px] border-black rounded-2xl
                            font-black uppercase text-sm tracking-[0.15em]
                            shadow-[6px_6px_0px_0px_#F492B7]
                            hover:shadow-[3px_3px_0px_0px_#F492B7] hover:translate-x-[3px] hover:translate-y-[3px]
                            active:shadow-none active:translate-x-[6px] active:translate-y-[6px]
                            transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isSharing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        )}
                        {isSharing ? 'Opening...' : 'Share & Invite on X'}
                    </button>
                </div>
            </div>

            {/* Success Banner */}
            <AnimatePresence>
                {isComplete && (
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ type: 'spring', stiffness: 100, damping: 14 }}
                        className="mt-5 bg-[#10B981] border-[4px] border-black rounded-2xl px-6 py-5
                            shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-3"
                    >
                        <div className="bg-white border-[3px] border-black rounded-full p-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]">
                            <Unlock className="w-5 h-5 text-[#10B981] stroke-[3]" />
                        </div>
                        <span className="text-black font-black uppercase tracking-[0.12em] text-sm">
                            Access Granted — Welcome to Djinn
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Referred Users List (below main card) */}
            {referredUsers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-5"
                >
                    <div className="flex items-center gap-2 mb-3 ml-2">
                        <Users className="w-4 h-4 text-white/40 stroke-[3]" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                            Your Referrals ({referredUsers.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {referredUsers.map((user, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                className="flex items-center justify-between p-3.5 bg-white/5 backdrop-blur-sm
                                    border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-[#F492B7] border-[3px] border-black rounded-lg flex items-center justify-center overflow-hidden">
                                        <img src={user.avatar_url || '/pink-pfp.png'} className="w-full h-full object-cover" alt={user.username} />
                                    </div>
                                    <span className="text-white font-black italic text-sm">@{user.username}</span>
                                </div>
                                <div className="bg-[#10B981] border-[2px] border-black rounded-full p-1 shadow-[2px_2px_0px_0px_black]">
                                    <Check className="w-3.5 h-3.5 text-black stroke-[4]" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
