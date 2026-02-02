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
    const { wallets, select, connect, connecting, connected, wallet } = useWallet();
    const [isConnecting, setIsConnecting] = useState(false);
    const [selectedWalletName, setSelectedWalletName] = useState<WalletName | null>(null);

    // Filter valid wallets
    const uniqueWallets = useMemo(() => {
        const seen = new Set();
        const list = [];
        const preferredOrder = ['Phantom', 'Solflare', 'Backpack', 'MetaMask', 'Jupiter'];

        for (const w of wallets) {
            if (seen.has(w.adapter.name)) continue;

            // ALWAYS show Phantom and Solflare if present (Crucial for user visibility)
            // For others, check if installed/loadable to avoid spamming 50+ wallets
            const isImportant = ['Phantom', 'Solflare'].includes(w.adapter.name);
            const isReady = w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable;

            if (isImportant || isReady) {
                seen.add(w.adapter.name);
                list.push(w);
            }
        }

        return list.sort((a, b) => {
            const idxA = preferredOrder.indexOf(a.adapter.name);
            const idxB = preferredOrder.indexOf(b.adapter.name);
            const posA = idxA === -1 ? 999 : idxA;
            const posB = idxB === -1 ? 999 : idxB;
            return posA - posB;
        });
    }, [wallets]);

    // Handle Wallet Selection
    const handleWalletSelect = useCallback((walletName: WalletName) => {
        if (connected) return;

        console.log('[CustomWalletModal] Selecting wallet:', walletName);
        select(walletName);
        setSelectedWalletName(walletName);
        setIsConnecting(true);
    }, [connected, select]);

    // Trigger Connection when wallet updates
    useEffect(() => {
        if (!selectedWalletName || connected || connecting) return;

        // If the selected wallet matches the current wallet adapter, try connecting
        if (wallet?.adapter.name === selectedWalletName) {
            console.log('[CustomWalletModal] Wallet ready, attempting connect...');

            const connectWallet = async () => {
                try {
                    await connect();
                } catch (error: any) {
                    console.error('[CustomWalletModal] Connection failed:', error);
                    // Only alert if it's not a "User rejected" error which is common
                    if (error.name !== 'WalletConnectionError' || !error.message.includes('User rejected')) {
                        alert(`Connection Failed: ${error.message}`);
                    }
                    setSelectedWalletName(null);
                } finally {
                    setIsConnecting(false);
                }
            };

            connectWallet();
        }
    }, [wallet, selectedWalletName, connected, connecting, connect]);

    // Cleanup on Close/Connect
    useEffect(() => {
        if (connected) {
            setSelectedWalletName(null);
            setIsConnecting(false);
            if (isOpen) onClose();
        }
    }, [connected, isOpen, onClose]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setIsConnecting(false);
            setSelectedWalletName(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        // CONTENEDOR PRINCIPAL: Fixed + Inset-0 + z-max
        <div className="fixed inset-0 z-[9999] flex items-center justify-center h-screen w-screen p-4 overflow-hidden">

            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-500"
                onClick={onClose}
            />

            {/* MODAL CONTAINER */}
            <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 overflow-hidden">

                {(isConnecting || connecting) ? (
                    // CONNECTING STATE (Pink Djinn Style)
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-8 animate-in fade-in duration-500">
                        {/* Pink Spinner Wrapper */}
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            {/* Spinning Gradient Ring - SLOWER (3s) */}
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#F492B7] border-r-[#F492B7]/30 animate-spin" style={{ animationDuration: '3s' }} />
                            {/* Inner Static Glow */}
                            <div className="absolute inset-4 bg-[#F492B7]/5 rounded-full blur-xl" />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-2xl font-black text-white tracking-tight">Connecting...</h3>
                            <p className="text-gray-400 text-sm max-w-[220px] mx-auto leading-relaxed">
                                Please approve the request in your wallet.
                            </p>
                        </div>
                    </div>
                ) : (
                    // SELECT WALLET STATE
                    <>
                        {/* HEADER */}
                        <div className="relative pt-6 pb-2 text-center flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="absolute right-6 top-6 text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                            >
                                <X size={20} />
                            </button>
                            <h2 className="text-white/50 font-bold text-xs uppercase tracking-[0.2em] mt-2">Sign In</h2>
                        </div>

                        {/* LOGO SECTION - RESTYLED */}
                        <div className="flex flex-col items-center justify-center py-6 flex-shrink-0 gap-4">
                            <div className="relative">
                                <div className="relative z-10 flex flex-col items-center justify-center">
                                    <div className="relative w-48 h-48 mb-1">
                                        <img src="/djinn-logo.png?v=3" alt="Djinn" className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(244,146,183,0.5)]" />
                                    </div>
                                </div>
                            </div>
                            <p className="text-[#F492B7] text-sm font-bold tracking-wide">Choose your wallet to continue</p>
                        </div>

                        {/* WALLET LIST */}
                        <div className="px-6 space-y-3 pb-8 overflow-y-auto scrollbar-hide flex-grow" style={{ maxHeight: '45vh' }}>
                            {uniqueWallets.map((wallet: any) => (
                                <button
                                    key={wallet.adapter.name}
                                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                                    className={`w-full bg-[#252525] hover:bg-[#333] border border-white/5 hover:border-white/20 rounded-xl p-4 flex items-center justify-between transition-all group shrink-0 active:scale-[0.98] duration-200`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center border border-white/5">
                                            {wallet.adapter.icon ? (
                                                <img
                                                    src={wallet.adapter.icon}
                                                    alt={wallet.adapter.name}
                                                    className="w-6 h-6 object-contain"
                                                />
                                            ) : (
                                                <span className="text-xl">💼</span>
                                            )}
                                        </div>
                                        <span className="font-bold text-white text-base group-hover:text-gray-100">
                                            {wallet.adapter.name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {wallet.adapter.readyState === WalletReadyState.Installed && (
                                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                        )}
                                    </div>
                                </button>
                            ))}

                            {uniqueWallets.length === 0 && (
                                <div className="text-center text-gray-500 text-xs py-6 bg-white/5 rounded-xl border border-white/5 mx-2">
                                    No Solana wallets found.
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="bg-[#151515] p-4 flex items-center justify-center gap-2 text-[#FF0096]/60 border-t border-white/5 flex-shrink-0 rounded-b-[2rem]">
                            <ShieldCheck size={18} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
