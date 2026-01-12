'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';
import { upsertProfile } from '@/lib/supabase-db';
import nacl from 'tweetnacl';
import { decodeUTF8 } from 'tweetnacl-util';
import Image from 'next/image';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileCreated: () => void;
}

const AVATAR_OPTIONS = [
    '/avatars/frog.png', // Fallback or existing assets
    '🐸', '🧙‍♂️', '🔮', '🧞‍♂️', '🌙', '⭐', '🔥', '💎', '🚀'
];

export default function OnboardingModal({ isOpen, onClose, onProfileCreated }: OnboardingModalProps) {
    const { publicKey, signMessage } = useWallet();
    const [username, setUsername] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('🐸');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Info, 2: Sign

    // Generate specific message to sign
    const getMessageToSign = (wallet: string, username: string) => {
        return `Welcome to Djinn Markets!
        
Please sign this message to create your account.
        
Wallet: ${wallet}
Username: ${username}
Timestamp: ${Date.now()}`;
    };

    const handleCreateAccount = async () => {
        if (!publicKey || !signMessage) return;
        if (!username.trim()) return alert("Please enter a username");

        setIsLoading(true);

        try {
            // 1. Prepare Message
            const messageContent = getMessageToSign(publicKey.toBase58(), username);
            const message = new TextEncoder().encode(messageContent);

            // 2. Request Signature
            const signature = await signMessage(message);

            // 3. Verify Signature (Client-side for MVP, but good practice)
            const isValid = nacl.sign.detached.verify(
                message,
                signature,
                publicKey.toBytes()
            );

            if (!isValid) throw new Error("Signature verification failed");

            // 4. Save to Supabase
            // Note: In a real app, you'd send the signature to backend API for verification
            // Here we rely on RLS policies (user can only insert their own row)
            const profile = await upsertProfile({
                wallet_address: publicKey.toBase58(),
                username: username,
                avatar_url: selectedAvatar,
                bio: 'Just joined Djinn Markets!'
            });

            if (profile) {
                // 5. Grant 'First Login' achievement logic could go here
                onProfileCreated();
                onClose();
            } else {
                throw new Error("Failed to create profile");
            }

        } catch (error: any) {
            console.error("Onboarding error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#0B0E14] border border-[#F492B7]/20 rounded-2xl shadow-[0_0_50px_rgba(244,146,183,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F492B7] to-transparent opacity-50" />

                <div className="p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 mb-6 relative">
                        <div className="absolute inset-0 bg-[#F492B7] rounded-full blur-xl opacity-20" />
                        <div className="relative w-full h-full bg-[#1A1A1A] rounded-full border border-white/10 flex items-center justify-center text-4xl">
                            {selectedAvatar}
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                        Welcome to Djinn
                    </h2>
                    <p className="text-gray-400 text-sm mb-8">
                        Create your decentralized identity to start trading.
                    </p>

                    <div className="w-full space-y-6">
                        {/* Username Input */}
                        <div className="space-y-2 text-left">
                            <label className="text-xs uppercase tracking-widest text-[#F492B7] font-bold">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="CryptoWizard99"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#F492B7]/50 transition-colors"
                                maxLength={20}
                            />
                        </div>

                        {/* Avatar Selection */}
                        <div className="space-y-2 text-left">
                            <label className="text-xs uppercase tracking-widest text-[#F492B7] font-bold">Variations</label>
                            <div className="flex flex-wrap gap-2 justify-center p-3 bg-black/30 rounded-xl border border-white/5">
                                {AVATAR_OPTIONS.map((avatar) => (
                                    <button
                                        key={avatar}
                                        onClick={() => setSelectedAvatar(avatar)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${selectedAvatar === avatar
                                                ? 'bg-[#F492B7]/20 border border-[#F492B7] scale-110'
                                                : 'hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        {avatar}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleCreateAccount}
                            disabled={isLoading || !username}
                            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${isLoading || !username
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-[#F492B7] text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(244,146,183,0.3)]'
                                }`}
                        >
                            {isLoading ? 'Signing...' : 'Create Identity'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
