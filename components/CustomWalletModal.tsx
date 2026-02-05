'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState, WalletName } from '@solana/wallet-adapter-base';
import { ShieldCheck, X } from 'lucide-react';

interface CustomWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CustomWalletModal({ isOpen, onClose }: CustomWalletModalProps) {
    const { wallets, select, connecting, connected } = useWallet();
    const [selectedWalletName, setSelectedWalletName] = useState<WalletName | null>(null);

    // Filter valid wallets
    const uniqueWallets = useMemo(() => {
        const seen = new Set();
        const list = [];
        for (const w of wallets) {
            if (seen.has(w.adapter.name)) continue;
            const isImportant = ['Phantom', 'Solflare'].includes(w.adapter.name);
            const isInstalled = w.readyState === WalletReadyState.Installed;
            if (isImportant || isInstalled) {
                seen.add(w.adapter.name);
                list.push(w);
            }
        }
        return list;
    }, [wallets]);

    // Handle Wallet Selection - THE ONLY RELEVANT ACTION
    const handleWalletSelect = useCallback((walletName: WalletName) => {
        if (connected || connecting) return;
        console.log('[CustomWalletModal] User selected:', walletName);
        setSelectedWalletName(walletName);

        // This is a direct user-triggered action. 
        // With autoConnect={true} in Provider, this will trigger the connection.
        select(walletName);
    }, [connected, connecting, select]);

    // Simple closing logic
    useEffect(() => {
        if (connected && isOpen) {
            onClose();
        }
    }, [connected, isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center h-screen w-screen p-4 overflow-hidden">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden">

                {connecting ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-8">
                        <div className="w-20 h-20 rounded-full border-4 border-t-[#F492B7] border-white/10 animate-spin"></div>
                        <div className="space-y-3">
                            <h3 className="text-2xl font-black text-white py-4">Connecting...</h3>
                            <p className="text-gray-400 text-sm">Please approve the request in your wallet.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="relative pt-6 pb-2 text-center">
                            <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full">
                                <X size={20} />
                            </button>
                            <h2 className="text-white/50 font-bold text-xs uppercase tracking-[0.2em] mt-2">Sign In</h2>
                        </div>

                        <div className="flex flex-col items-center justify-center py-6 gap-4">
                            <div className="relative w-48 h-48">
                                <img src="/djinn-logo.png?v=3" alt="Djinn" className="w-full h-full object-contain" />
                            </div>
                            <p className="text-[#F492B7] text-sm font-bold tracking-wide">Choose your wallet to continue</p>
                        </div>

                        <div className="px-6 space-y-3 pb-8 overflow-y-auto">
                            {uniqueWallets.map((wallet: any) => (
                                <button
                                    key={wallet.adapter.name}
                                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                                    className="w-full bg-[#252525] hover:bg-[#333] border border-white/5 rounded-xl p-4 flex items-center justify-between transition-all group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center border border-white/5">
                                            <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold text-white text-base">{wallet.adapter.name}</span>
                                    </div>
                                    {wallet.readyState === WalletReadyState.Installed && (
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="bg-[#151515] p-4 flex items-center justify-center text-[#FF0096]/60 border-t border-white/5 rounded-b-[2rem]">
                            <ShieldCheck size={18} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
