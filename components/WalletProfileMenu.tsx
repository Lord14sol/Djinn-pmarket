'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ADMIN_WALLETS } from '@/lib/whitelist';

const PhysicsCardBubblegum = dynamic(() => import('./PhysicsCardBubblegum'), {
    ssr: false,
    loading: () => <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-700 animate-pulse" />
});

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

    const isAdmin = ADMIN_WALLETS.includes(walletAddress);

    return (
        <>
            {/* BACKDROP */}
            <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* MODAL MENU - Raised and resized for Card */}
            <div className="fixed bottom-[15%] left-1/2 -translate-x-1/2 w-[380px] bg-white border-2 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] z-[70] overflow-hidden flex flex-col items-center pt-6 pb-8 animate-in fade-in slide-in-from-bottom-8 duration-300">

                {/* CLOSE BUTTON (X) */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-8 text-black hover:text-[#F492B7] transition-colors font-black text-xl z-[80]"
                >
                    ✕
                </button>

                {/* 1. AGENT CARD (The main attraction) */}
                <div className="relative w-full h-[400px] mb-2 pointer-events-auto">
                    <PhysicsCardBubblegum username={username} />
                </div>

                {/* 2. USERNAME & IDENTITY */}
                <div className="flex flex-col items-center mb-6">
                    <Link
                        href={`/profile/${username}`}
                        onClick={onClose}
                        className="text-black text-3xl font-black hover:text-[#F492B7] transition-colors uppercase tracking-tight"
                    >
                        @{username}
                    </Link>
                    <Link href={`/profile/${username}`} className="text-gray-500 text-[10px] hover:text-black transition-colors font-mono">
                        djinn.markets/profile/{username}
                    </Link>
                </div>

                {/* 5. WALLET ADDRESS & COPY (Original Keycap Style) */}
                <button
                    onClick={handleCopy}
                    className="group relative flex items-center justify-center gap-3 mb-6 px-5 py-3 bg-[#E0E0E0] border-b-4 border-[#999] hover:border-[#BBB] active:border-b-0 active:translate-y-1 rounded-xl w-[80%] transition-all"
                    title="Copy Address"
                >
                    <span className="text-black font-mono text-sm font-bold tracking-wider">
                        {copied ? 'COPIED!' : `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
                    </span>
                    {!copied && <span className="text-xs">📋</span>}
                </button>


                {/* 7. SEPARATOR OR */}
                <div className="relative w-full text-center mb-6">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[80%] border-t-2 border-black/10"></div>
                    </div>
                    <span className="relative z-10 bg-white px-4 text-black text-xs font-black uppercase">or</span>
                </div>

                {/* 8. DISCONNECT BUTTON (Red/Black Keycap) */}
                <button
                    onClick={() => { onClose(); disconnect(); }}
                    className="w-[85%] bg-black text-white font-black uppercase tracking-widest py-3 rounded-xl border-2 border-black hover:bg-gray-900 active:translate-y-1 transition-all shadow-[4px_4px_0px_0px_#F492B7] hover:shadow-[2px_2px_0px_0px_#F492B7] active:shadow-none text-xs"
                >
                    Disconnect wallet
                </button>

            </div>
        </>
    );
}
