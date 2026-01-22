'use client';

import React, { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { ShieldCheck, X } from 'lucide-react';

interface CustomWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CustomWalletModal({ isOpen, onClose }: CustomWalletModalProps) {
    const { wallets, select, connecting, wallet } = useWallet();
    const [isConnecting, setIsConnecting] = React.useState(false);

    // Sync local connecting state with wallet adapter
    React.useEffect(() => {
        if (connecting) setIsConnecting(true);
        else {
            // Small delay to prevent flickering on fast connections or failures
            const t = setTimeout(() => setIsConnecting(false), 500);
            return () => clearTimeout(t);
        }
    }, [connecting]);

    const handleConnect = (walletName: any) => {
        select(walletName);
        // The wallet adapter 'connecting' state should trigger the view change
    };

    // Filter and deduplicate wallets
    const uniqueWallets = useMemo(() => {
        const walletMap = new Map();
        const allowedWallets = ['Phantom', 'Solflare', 'Backpack', 'MetaMask', 'Jupiter'];

        wallets.forEach(wallet => {
            const name = wallet.adapter.name;
            const readyState = wallet.adapter.readyState;

            if (allowedWallets.includes(name)) {
                // Solo si está instalada o cargable
                const isReady = readyState === WalletReadyState.Installed ||
                    readyState === WalletReadyState.Loadable;

                if (isReady && !walletMap.has(name)) {
                    walletMap.set(name, wallet);
                }
            }
        });

        return Array.from(walletMap.values());
    }, [wallets]);

    if (!isOpen) return null;

    return (
        // CONTENEDOR PRINCIPAL: Fixed + Inset-0 + z-max
        <div className="fixed inset-0 z-[9999] flex items-center justify-center h-screen w-screen p-4 overflow-hidden">

            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* MODAL CONTAINER */}
            <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-200 overflow-hidden">

                {isConnecting ? (
                    // CONNECTING STATE (Pink Djinn Style)
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-6">
                        {/* Pink Spinner Wrapper */}
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            {/* Spinning Gradient Ring */}
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#F492B7] border-r-[#F492B7]/50 animate-spin" style={{ animationDuration: '1s' }} />
                            {/* Inner Static Glow */}
                            <div className="absolute inset-2 bg-[#F492B7]/10 rounded-full blur-md" />

                            {/* Central Icon */}
                            <div className="relative w-12 h-12">
                                <img src="/star.png" alt="Loading" className="w-full h-full object-contain animate-pulse" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Sign to verify</h3>
                            <p className="text-gray-400 text-sm max-w-[200px] mx-auto leading-relaxed">
                                Check your {wallet?.adapter.name || "wallet"} browser window to connect.
                            </p>
                        </div>

                        <div className="w-full bg-[#111] rounded-xl p-4 mt-4 border border-white/5">
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-mono animate-pulse">
                                <span className="w-2 h-2 bg-[#F492B7] rounded-full"></span>
                                Establishing secure channel...
                            </div>
                        </div>
                    </div>
                ) : (
                    // SELECT WALLET STATE
                    <>
                        {/* HEADER */}
                        <div className="relative pt-6 pb-2 text-center flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="absolute right-5 top-5 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <h2 className="text-white font-bold text-lg tracking-wide">Log in or sign up</h2>
                        </div>

                        {/* LOGO SECTION */}
                        <div className="flex justify-center py-6 flex-shrink-0">
                            <div className="relative w-44 h-44">
                                <div className="absolute inset-0 bg-[#FF0096]/20 blur-2xl rounded-full" />
                                <img
                                    src="/star.png"
                                    alt="Djinn"
                                    className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(255,0,150,0.6)]"
                                    style={{
                                        filter: "drop-shadow(0 0 20px rgba(255,0,150,0.5))",
                                        transform: "translateZ(0)",
                                        imageRendering: "auto"
                                    }}
                                />
                            </div>
                        </div>

                        {/* WALLET LIST */}
                        <div className="px-6 space-y-3 pb-8 overflow-y-auto scrollbar-hide flex-grow" style={{ maxHeight: '45vh' }}>
                            {uniqueWallets.map((wallet: any) => (
                                <button
                                    key={wallet.adapter.name}
                                    onClick={() => handleConnect(wallet.adapter.name)}
                                    className="w-full bg-[#252525] hover:bg-[#333] border border-white/5 hover:border-white/20 rounded-xl p-4 flex items-center justify-between transition-all group shrink-0"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center">
                                            {wallet.adapter.icon ? (
                                                <img
                                                    src={wallet.adapter.icon}
                                                    alt={wallet.adapter.name}
                                                    className="w-8 h-8 object-contain"
                                                />
                                            ) : (
                                                <span className="text-xl">💼</span>
                                            )}
                                        </div>
                                        <span className="font-bold text-white text-base group-hover:text-gray-100">
                                            {wallet.adapter.name}
                                        </span>
                                    </div>

                                    <span className="text-[10px] font-bold text-gray-500 bg-black/30 px-3 py-1 rounded border border-white/5 uppercase tracking-wide">
                                        Solana
                                    </span>
                                </button>
                            ))}

                            {uniqueWallets.length === 0 && (
                                <div className="text-center text-gray-500 text-xs py-6">
                                    No supported Solana wallets detected.
                                    <br />
                                    Please install Phantom, Solflare, or Backpack.
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="bg-[#151515] p-4 flex items-center justify-center gap-2 text-[#FF0096]/60 border-t border-white/5 flex-shrink-0 rounded-b-[2rem]">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] uppercase font-bold tracking-widest">
                                Secure Connection
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
