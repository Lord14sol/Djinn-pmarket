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
    const { wallets, select, connect, connecting, connected, wallet, publicKey } = useWallet();
    const [isConnecting, setIsConnecting] = useState(false);

    // Debug: Log state changes
    useEffect(() => {
        console.log('[Modal] State:', {
            isOpen,
            connected,
            connecting,
            isConnecting,
            walletName: wallet?.adapter.name,
            publicKey: publicKey?.toBase58()?.slice(0, 8)
        });
    }, [isOpen, connected, connecting, isConnecting, wallet, publicKey]);

    // Filter valid wallets
    const uniqueWallets = useMemo(() => {
        const seen = new Set();
        const list = [];
        const preferredOrder = ['Phantom', 'Solflare', 'Backpack', 'MetaMask', 'Jupiter'];

        for (const w of wallets) {
            if (seen.has(w.adapter.name)) continue;
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
            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        });
    }, [wallets]);

    // Track which wallet we're trying to connect
    const [pendingWallet, setPendingWallet] = useState<WalletName | null>(null);

    // Handle wallet click - just select, useEffect will handle connect
    const handleWalletClick = useCallback((walletName: WalletName) => {
        console.log('[Modal] handleWalletClick:', walletName);

        // Prevent double-clicks
        if (isConnecting || connecting || connected) {
            console.log('[Modal] Blocked - already connecting/connected');
            return;
        }

        const targetWallet = wallets.find(w => w.adapter.name === walletName);
        if (!targetWallet) {
            console.error('[Modal] Wallet not found in list');
            return;
        }

        // Check if wallet is installed
        if (targetWallet.readyState !== WalletReadyState.Installed &&
            targetWallet.readyState !== WalletReadyState.Loadable) {
            console.log('[Modal] Wallet not installed, opening URL');
            if (targetWallet.adapter.url) {
                window.open(targetWallet.adapter.url, '_blank');
            }
            return;
        }

        console.log('[Modal] Selecting wallet and waiting for hook to update...');
        setIsConnecting(true);
        setPendingWallet(walletName);
        select(walletName);
    }, [wallets, select, isConnecting, connecting, connected]);

    // Effect: Connect when wallet hook updates to match our selection
    useEffect(() => {
        if (!pendingWallet || connected || connecting) return;

        // Wait for the hook's wallet to match our selection
        if (wallet?.adapter.name === pendingWallet) {
            console.log('[Modal] Wallet hook updated! Calling connect()...');

            const doConnect = async () => {
                try {
                    await connect();
                    console.log('[Modal] SUCCESS! Connected.');
                } catch (err: any) {
                    console.error('[Modal] Connection error:', err?.name, err?.message);
                } finally {
                    setPendingWallet(null);
                    setIsConnecting(false);
                }
            };

            doConnect();
        }
    }, [wallet, pendingWallet, connected, connecting, connect]);

    // Auto-close modal when connected
    useEffect(() => {
        if (connected && isOpen) {
            console.log('[Modal] Connected! Closing modal...');
            onClose();
        }
    }, [connected, isOpen, onClose]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsConnecting(false);
            setPendingWallet(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const showSpinner = isConnecting || connecting;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center h-screen w-screen p-4 overflow-hidden">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* MODAL */}
            <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden">
                {showSpinner ? (
                    // CONNECTING STATE
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-8">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <div
                                className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#F492B7] border-r-[#F492B7]/30 animate-spin"
                                style={{ animationDuration: '3s' }}
                            />
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

                        {/* LOGO */}
                        <div className="flex flex-col items-center justify-center py-6 flex-shrink-0 gap-4">
                            <div className="relative w-48 h-48 mb-1">
                                <img
                                    src="/djinn-logo.png?v=3"
                                    alt="Djinn"
                                    className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(244,146,183,0.5)]"
                                />
                            </div>
                            <p className="text-[#F492B7] text-sm font-bold tracking-wide">Choose your wallet to continue</p>
                        </div>

                        {/* WALLET LIST */}
                        <div className="px-6 space-y-3 pb-8 overflow-y-auto flex-grow" style={{ maxHeight: '45vh' }}>
                            {uniqueWallets.map((w) => (
                                <button
                                    key={w.adapter.name}
                                    onClick={() => handleWalletClick(w.adapter.name as WalletName)}
                                    className="w-full bg-[#252525] hover:bg-[#333] border border-white/5 hover:border-white/20 rounded-xl p-4 flex items-center justify-between transition-all group active:scale-[0.98] duration-200"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center border border-white/5">
                                            {w.adapter.icon ? (
                                                <img
                                                    src={w.adapter.icon}
                                                    alt={w.adapter.name}
                                                    className="w-6 h-6 object-contain"
                                                />
                                            ) : (
                                                <span className="text-xl">💼</span>
                                            )}
                                        </div>
                                        <span className="font-bold text-white text-base group-hover:text-gray-100">
                                            {w.adapter.name}
                                        </span>
                                    </div>
                                    {w.readyState === WalletReadyState.Installed && (
                                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                    )}
                                </button>
                            ))}

                            {uniqueWallets.length === 0 && (
                                <div className="text-center text-gray-500 text-xs py-6 bg-white/5 rounded-xl border border-white/5">
                                    No Solana wallets found.
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="bg-[#151515] p-4 flex items-center justify-center gap-2 text-[#FF0096]/60 border-t border-white/5 rounded-b-[2rem]">
                            <ShieldCheck size={18} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
