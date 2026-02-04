'use client';

import React, { useState, useEffect } from 'react';
import { isUsernameAvailable, upsertProfile } from '@/lib/supabase-db';
import { Loader2, X } from 'lucide-react';
import StarBackground from '@/components/ui/StarBackground';

interface ClaimUsernameModalProps {
    isOpen: boolean;
    walletAddress: string;
    onSuccess: (username: string) => void;
    onClose: () => void;
}

export default function ClaimUsernameModal({ isOpen, walletAddress, onSuccess, onClose }: ClaimUsernameModalProps) {
    const [username, setUsername] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const checkAvailability = async () => {
            if (username.length < 3) {
                setIsAvailable(null);
                return;
            }
            setIsChecking(true);
            const avail = await isUsernameAvailable(username);
            setIsAvailable(avail);
            setIsChecking(false);
        };

        const timeout = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timeout);
    }, [username, isOpen]);

    const handleSubmit = async () => {
        if (!isAvailable || username.length < 3) return;

        setIsSubmitting(true);
        setError('');

        try {
            const newProfile = await upsertProfile({
                wallet_address: walletAddress,
                username: username,
                bio: 'New Djinn Trader',
                avatar_url: '/pink-pfp.png'
            });

            if (newProfile) {
                onSuccess(newProfile.username);
            } else {
                setError('Failed to create profile. Try again.');
            }
        } catch (e) {
            console.error(e);
            setError('An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 font-sans animate-in fade-in duration-300 relative overflow-hidden">

            {/* --- STAR BACKGROUND --- */}
            <StarBackground />

            {/* Main Card */}
            <div className="w-full max-w-md bg-black/90 backdrop-blur-xl border-2 border-[#F492B7]/30 rounded-3xl p-8 relative shadow-[0_0_50px_rgba(244,146,183,0.15)] z-10">

                {/* Header: Title + Close(Disconnect) */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black lowercase tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                        claim your<br />username
                    </h1>

                    {/* FIXED CLOSE BUTTON: High Contrast White on Black */}
                    <button
                        onClick={onClose}
                        className="bg-white text-black border-2 border-white p-2 rounded-full hover:bg-[#F492B7] hover:border-[#F492B7] hover:scale-110 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)] group"
                    >
                        <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    </button>
                </div>

                {/* Avatar Placeholder (Skull/Icon) */}
                <div className="flex justify-center mb-10">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-white/10 bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(244,146,183,0.3)]">
                            <img src="/pink-pfp.png" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" alt="Avatar" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-[#F492B7] border-2 border-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-black shadow-[2px_2px_0px_0px_black]">
                            New
                        </div>
                    </div>
                </div>

                {/* Connect Wallet Step (Already Done) */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#F492B7] text-black w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-black">1</div>
                            <span className="font-bold text-gray-300 lowercase text-sm">wallet connected</span>
                        </div>
                        <span className="font-mono text-xs text-[#F492B7] truncate max-w-[100px]">{walletAddress}</span>
                    </div>
                </div>

                {/* Choose Username Step (Active) */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                    <div className="absolute -top-3 left-4 bg-[#F492B7] text-black px-3 py-1 rounded-full text-xs font-bold border-2 border-black">
                        step 2
                    </div>

                    <label className="block text-white font-black lowercase mb-2 ml-1 text-sm mt-2">choose username</label>
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full bg-black/50 border-2 border-white/20 rounded-xl px-4 py-3 font-bold text-lg text-white outline-none focus:border-[#F492B7] focus:shadow-[0_0_15px_rgba(244,146,183,0.3)] transition-all placeholder:text-gray-700 lowercase"
                            placeholder="e.g. degen420"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            maxLength={15}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isChecking ? (
                                <Loader2 className="w-5 h-5 animate-spin text-[#F492B7]" />
                            ) : username.length >= 3 ? (
                                isAvailable ? (
                                    <span className="text-[#10B981] text-xl drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">✓</span>
                                ) : (
                                    <span className="text-red-500 text-xl drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">✕</span>
                                )
                            ) : null}
                        </div>
                    </div>

                    <p className="text-xs font-bold text-gray-500 mt-2 ml-1 lowercase">
                        {error ? <span className="text-red-500">{error}</span> : isAvailable === false ? <span className="text-red-400">Username taken</span> : '3-15 chars, letters & numbers'}
                    </p>
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!isAvailable || username.length < 3 || isSubmitting}
                        className={`
                            flex items-center gap-2 px-8 py-3 rounded-full font-black text-lg border-2 border-transparent transition-all
                            ${isAvailable && !isSubmitting
                                ? 'bg-[#F492B7] text-black hover:bg-white hover:scale-105 hover:shadow-[0_0_20px_rgba(244,146,183,0.5)] cursor-pointer'
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'}
                        `}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                        {isSubmitting ? 'Minting...' : 'Claim Identity →'}
                    </button>
                </div>

            </div>
        </div>
    );
}
