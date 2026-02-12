'use client';

import { useState } from 'react';
import Link from 'next/link';

interface WalletProfileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    pfp: string | null;
    walletAddress: string;
    disconnect: () => void;
    onEditProfile: () => void;
    hasGenesisGem?: boolean;
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
    onEditProfile,
    hasGenesisGem = false
}: WalletProfileMenuProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            {/* BACKDROP */}
            <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* MODAL MENU - Raised 30% from bottom */}
            <div className="fixed bottom-[35%] left-1/2 -translate-x-1/2 w-[340px] bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-[70] overflow-hidden flex flex-col items-center pt-8 pb-8 animate-in fade-in slide-in-from-bottom-8 duration-300">

                {/* CLOSE BUTTON (X) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-black hover:text-[#F492B7] transition-colors font-black text-xl"
                >
                    ✕
                </button>

                {/* 1. USERNAME */}
                <div className="flex items-center gap-2 mb-1">
                    <Link
                        href={`/profile/${username}`}
                        onClick={onClose}
                        className="text-black text-2xl font-black hover:text-[#F492B7] transition-colors uppercase tracking-tight"
                    >
                        {username}
                    </Link>
                </div>

                {/* 2. PROFILE LINK (Mock) */}
                <Link href={`/profile/${username}`} className="text-gray-500 text-xs mb-6 hover:text-black transition-colors font-mono">
                    djinn.markets/profile/{username}
                </Link>

                {/* 3. EDIT PROFILE BUTTON */}
                <button
                    onClick={() => { onClose(); onEditProfile(); }}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl border-2 border-black bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-[#F492B7] transition-all mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-none"
                >
                    Edit profile <span className="text-[10px]">✎</span>
                </button>

                {/* 4. CIRCLE PFP */}
                <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-black shadow-none">
                        <img
                            src={pfp || '/pink-pfp.png'}
                            alt={username}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = '/pink-pfp.png'; }}
                        />
                    </div>
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

            </div >
        </>
    );
}
