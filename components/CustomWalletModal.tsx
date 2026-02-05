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
    const { wallets, select, connect, connecting, connected } = useWallet();
    const [selectedWalletName, setSelectedWalletName] = useState<WalletName | null>(null);

    // Filter valid wallets
    const uniqueWallets = useMemo(() => {
        const seen = new Set();
        const list = [];
        for (const w of wallets) {
            if (seen.has(w.adapter.name)) continue;
            const isReady = w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable;
            if (isReady) {
                seen.add(w.adapter.name);
                list.push(w);
            }
        }
        return list;
    }, [wallets]);

    // Handle Wallet Selection - GESTURE SAFE
    const handleWalletSelect = useCallback(async (walletName: WalletName) => {
        if (connected || connecting) return;

        console.log('[CustomWalletModal] Attempting manual connection to:', walletName);
        setSelectedWalletName(walletName);

        try {
            // Find the adapter in the wallets list
            const walletToConnect = wallets.find(w => w.adapter.name === walletName);

            if (walletToConnect) {
                // 1. SELECT first (updates context)
                select(walletName);

                // 2. CONNECT IMMEDIATELY (must be in the same execution stack for gesture trust)
                await walletToConnect.adapter.connect();
            }
        } catch (error: any) {
            console.error('[CustomWalletModal] Connection failed:', error);
            // Silence "Unexpected error" as it's often a transient state
            if (!error.message?.includes('Unexpected error')) {
                alert(`Error: ${error.message}`);
            }
            setSelectedWalletName(null);
        }
    }, [connected, connecting, select, wallets]);

    // Close on connection successful
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

                {(connecting || (selectedWalletName && !connected)) ? (
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-8">
                        <div className="w-20 h-20 rounded-full border-4 border-t-[#F492B7] border-white/10 animate-spin"></div>
                        <div className="space-y-3">
                            <h3 className="text-2xl font-black text-white">Connecting...</h3>
                            <p className="text-gray-400 text-sm">Please approve in your {selectedWalletName || 'wallet'}.</p>
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
                            <div className="relative w-40 h-40">
                                <img src="/djinn-logo.png?v=3" alt="Djinn" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(244,146,183,0.3)]" />
                            </div>
                            <p className="text-[#F492B7] text-sm font-bold tracking-wide">Select your wallet</p>
                        </div>
                        <div className="px-6 space-y-3 pb-8 overflow-y-auto scrollbar-hide">
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
                                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
