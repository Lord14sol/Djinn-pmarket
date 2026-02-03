'use client';

import React, { useState, useEffect } from 'react';
import { isUsernameAvailable, upsertProfile } from '@/lib/supabase-db';
import { Loader2 } from 'lucide-react';

interface ClaimUsernameModalProps {
    isOpen: boolean;
    walletAddress: string;
    onSuccess: (username: string) => void;
    onClose: () => void; // Allow closing (disconnects?)
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
        <div className="fixed inset-0 z-[100] bg-[#F3F4F6] flex items-center justify-center p-4 font-sans animate-in fade-in duration-300">
            {/* Main Card */}
            <div className="w-full max-w-md bg-[#F2F2F2] border-4 border-black rounded-3xl p-8 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

                {/* Header: Title + Close(Disconnect) */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black lowercase tracking-tight text-black">
                        claim your<br />username
                    </h1>
                    <button
                        onClick={onClose}
                        className="bg-white border-2 border-black p-2 rounded-full hover:bg-gray-100 hover:scale-105 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Avatar Placeholder (Skull/Icon) */}
                <div className="flex justify-center mb-10">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-black bg-gradient-to-br from-pink-300 to-orange-300 flex items-center justify-center overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <img src="/pink-pfp.png" className="w-full h-full object-cover" alt="Avatar" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-[#10B981] border-2 border-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            New
                        </div>
                    </div>
                </div>

                {/* Connect Wallet Step (Already Done visually) */}
                <div className="bg-[#E5E7EB] border-2 border-black rounded-2xl p-4 mb-4 opacity-60">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                            <span className="font-bold text-black lowercase">wallet connected</span>
                        </div>
                        <span className="font-mono text-xs text-black truncate max-w-[100px]">{walletAddress}</span>
                    </div>
                </div>

                {/* Choose Username Step (Active) */}
                <div className="bg-white border-2 border-black rounded-2xl p-6 relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="absolute -top-3 left-4 bg-black text-white px-3 py-1 rounded-full text-xs font-bold border-2 border-white">
                        step 2
                    </div>

                    <label className="block text-black font-black lowercase mb-2 ml-1">choose username</label>
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full bg-[#F3F4F6] border-2 border-black rounded-xl px-4 py-3 font-bold text-lg outline-none focus:bg-white transition-all placeholder:text-gray-400 lowercase"
                            placeholder="e.g. degen420"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            maxLength={15}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isChecking ? (
                                <Loader2 className="w-5 h-5 animate-spin text-black" />
                            ) : username.length >= 3 ? (
                                isAvailable ? (
                                    <span className="text-green-500 text-xl">✓</span>
                                ) : (
                                    <span className="text-red-500 text-xl">✕</span>
                                )
                            ) : null}
                        </div>
                    </div>

                    <p className="text-xs font-bold text-gray-500 mt-2 ml-1 lowercase">
                        {error ? <span className="text-red-500">{error}</span> : isAvailable === false ? <span className="text-red-500">Username taken</span> : '3-15 chars, letters & numbers'}
                    </p>
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!isAvailable || username.length < 3 || isSubmitting}
                        className={`
                            flex items-center gap-2 px-8 py-3 rounded-full font-black text-lg border-2 border-black transition-all
                            ${isAvailable && !isSubmitting
                                ? 'bg-[#FFA07A] hover:bg-[#FFB6C1] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
                        `}
                    >
                        {isSubmitting ? 'Minting...' : 'Claim Identity →'}
                    </button>
                </div>

            </div>
        </div>
    );
}
