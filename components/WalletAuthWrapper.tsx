'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

export function WalletAuthWrapper({ children }: { children: React.ReactNode }) {
    const { publicKey, signMessage, connected, disconnect } = useWallet();
    const [isVerifying, setIsVerifying] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        if (connected && publicKey) {
            const checkAuth = async () => {
                const walletAddress = publicKey.toBase58();
                const key = `djinn_auth_signature_${walletAddress}`;
                const storedSig = localStorage.getItem(key);

                if (storedSig) {
                    setIsAuthenticated(true);
                    return;
                }

                if (signMessage) {
                    setIsVerifying(true);
                    try {
                        const messageContent = `Welcome to Djinn Markets!\n\nPlease sign this message to verify ownership of your wallet.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
                        const message = new TextEncoder().encode(messageContent);

                        const signature = await signMessage(message);

                        try {
                            localStorage.setItem(key, bs58.encode(signature));
                        } catch (quotaError) {
                            if (quotaError instanceof Error && quotaError.name === 'QuotaExceededError') {
                                console.warn("⚠️ LocalStorage full, cleaning up old profile caches...");
                                // Clear only profile caches to make room
                                Object.keys(localStorage).forEach(k => {
                                    if (k.startsWith('djinn_profile_')) {
                                        localStorage.removeItem(k);
                                    }
                                });
                                // Retry saving the signature
                                localStorage.setItem(key, bs58.encode(signature));
                            } else {
                                throw quotaError;
                            }
                        }

                        setIsAuthenticated(true);
                        console.log("✅ Wallet Authenticated & Signed");
                    } catch (error) {
                        console.error("User rejected signature", error);
                        disconnect();
                    } finally {
                        setIsVerifying(false);
                    }
                }
            };

            checkAuth();
        } else {
            // Not connected, so "authenticated" in the sense that we show public UI
            setIsAuthenticated(true);
        }
    }, [connected, publicKey, signMessage, disconnect]);

    // BLOCK UI IF CONNECTED BUT NOT YET SIGNED
    if (connected && !isAuthenticated) {
        return (
            <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8">
                <div className="w-20 h-20 rounded-full border-4 border-t-[#F492B7] border-white/10 animate-spin mb-8"></div>
                <h2 className="text-3xl font-black mb-4 tracking-tighter">Verifying Ownership</h2>
                <p className="text-gray-400 text-center max-w-md">
                    Please sign the message in your wallet to verify you own this address.
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
