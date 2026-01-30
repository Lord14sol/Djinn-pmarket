'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface WalletProfileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    pfp: string | null;
    walletAddress: string;
    disconnect: () => void;
    onEditProfile: () => void;
    // Extra props passed from Navbar
    openCreateMarket?: () => void;
    openActivityFeed?: () => void;
    connected?: boolean;
    publicKey?: any;
}

export default function WalletProfileMenu({
    isOpen,
    onClose,
    username,
    pfp,
    walletAddress,
    disconnect,
    onEditProfile
}: WalletProfileMenuProps) {
    const [copied, setCopied] = useState(false);
    const router = useRouter();

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            {/* BACKDROP */}
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* MODAL MENU - Raised 30% from bottom */}
            <div className="fixed bottom-[35%] left-1/2 -translate-x-1/2 w-[320px] bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl z-[70] overflow-hidden flex flex-col items-center pt-8 pb-4 animate-in fade-in slide-in-from-bottom-8 duration-300">

                {/* CLOSE BUTTON (X) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    ✕
                </button>

                {/* 1. USERNAME */}
                <Link
                    href={`/profile/${username}`}
                    onClick={onClose}
                    className="text-white text-lg font-bold mb-1 hover:text-[#F492B7] transition-colors"
                >
                    @{username}
                </Link>

                {/* 2. PROFILE LINK (Mock) */}
                <Link href={`/profile/${username}`} className="text-gray-500 text-xs mb-4 hover:text-[#F492B7] transition-colors">
                    djinn.markets/profile/{username}
                </Link>

                {/* 3. EDIT PROFILE BUTTON */}
                <button
                    onClick={() => { onClose(); onEditProfile(); }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-white/10 text-white text-xs font-bold hover:bg-white/5 transition-colors mb-6"
                >
                    Edit profile <span className="text-[10px]">✎</span>
                </button>

                {/* 4. CIRCLE PFP */}
                <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10">
                        <img
                            src={pfp || '/pink-pfp.png'}
                            alt={username}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = '/pink-pfp.png'; }}
                        />
                    </div>
                </div>

                {/* 5. WALLET ADDRESS & COPY */}
                <div className="flex items-center gap-2 mb-6">
                    <span className="text-gray-300 font-mono text-sm">
                        {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                    </span>
                    <button
                        onClick={handleCopy}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        {copied ? '✅' : '❐'}
                    </button>
                </div>


                {/* 7. SEPARATOR OR */}
                <div className="relative w-full text-center mb-6">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[80%] border-t border-white/5"></div>
                    </div>
                    <span className="relative z-10 bg-[#0A0A0A] px-4 text-gray-600 text-xs">or</span>
                </div>

                {/* 8. DISCONNECT BUTTON */}
                <button
                    onClick={() => { onClose(); disconnect(); }}
                    className="w-[90%] bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3 rounded-xl transition-colors mb-2 text-sm"
                >
                    Disconnect wallet
                </button>

            </div>
        </>
    );
}
