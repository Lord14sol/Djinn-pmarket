'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { encodeBS58 } from '@/utils/bs58-compat';

export function WalletAuthWrapper({ children }: { children: React.ReactNode }) {
    const { publicKey, signMessage, connected, disconnect } = useWallet();
    const [isVerifying, setIsVerifying] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authSkipped, setAuthSkipped] = useState(false);
    const authTriggeredRef = useRef(false);
    const retryCountRef = useRef(0);

    const attemptAuth = useCallback(async () => {
        if (!publicKey || !signMessage) return;

        const walletAddress = publicKey.toBase58();
        const key = `djinn_auth_signature_${walletAddress}`;

        // Check if already authenticated
        const storedSig = localStorage.getItem(key);
        if (storedSig) {
            setIsAuthenticated(true);
            return;
        }

        setIsVerifying(true);
        try {
            const messageContent = `Welcome to Djinn Markets!\n\nPlease sign this message to verify ownership of your wallet.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
            const message = new TextEncoder().encode(messageContent);

            const signature = await signMessage(message);

            try {
                localStorage.setItem(key, encodeBS58(signature));
            } catch (quotaError) {
                if (quotaError instanceof Error && (quotaError.name === 'QuotaExceededError' || quotaError.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                    console.warn('[Auth] LocalStorage full, purging...');
                    Object.keys(localStorage).forEach(k => {
                        if (k.startsWith('djinn_pfp_') ||
                            k.startsWith('djinn_profile_') ||
                            k.startsWith('djinn_markets') ||
                            k.startsWith('djinn_created_markets')) {
                            localStorage.removeItem(k);
                        }
                    });
                    try {
                        localStorage.setItem(key, encodeBS58(signature));
                    } catch (retryError) {
                        console.error('[Auth] Still cannot save after purge');
                        Object.keys(localStorage).forEach(k => {
                            if (k.startsWith('djinn_')) localStorage.removeItem(k);
                        });
                        localStorage.setItem(key, encodeBS58(signature));
                    }
                } else {
                    throw quotaError;
                }
            }

            setIsAuthenticated(true);
            retryCountRef.current = 0;
            console.log('[Auth] Wallet authenticated');
        } catch (error) {
            console.warn('[Auth] Signature rejected or failed:', error);
            // Don't disconnect - let user stay connected and skip auth
            // They can still use the app, just not verified
            setAuthSkipped(true);
            setIsAuthenticated(true); // Let them through anyway
        } finally {
            setIsVerifying(false);
        }
    }, [publicKey, signMessage]);

    useEffect(() => {
        if (connected && publicKey && !authTriggeredRef.current) {
            authTriggeredRef.current = true;

            // Wait for Phantom popup to fully close before requesting signature
            // 2s delay prevents popup collision
            const timer = setTimeout(() => {
                attemptAuth();
            }, 2000);

            return () => clearTimeout(timer);
        } else if (!connected) {
            setIsAuthenticated(false);
            setAuthSkipped(false);
            authTriggeredRef.current = false;
            retryCountRef.current = 0;
        }
    }, [connected, publicKey, attemptAuth]);

    // Show verification screen only while actively signing (not blocking indefinitely)
    if (connected && !isAuthenticated && !authSkipped) {
        return (
            <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8">
                <div className="w-20 h-20 rounded-full border-4 border-t-[#F492B7] border-white/10 animate-spin mb-8" />
                <h2 className="text-3xl font-black mb-4 tracking-tighter">
                    {isVerifying ? 'Sign to Verify' : 'Connecting...'}
                </h2>
                <p className="text-gray-400 text-center max-w-md mb-6">
                    {isVerifying
                        ? 'Please sign the message in your wallet to verify ownership.'
                        : 'Preparing verification...'}
                </p>
                {/* Skip button so user isn't stuck */}
                <button
                    onClick={() => {
                        setAuthSkipped(true);
                        setIsAuthenticated(true);
                    }}
                    className="text-white/30 hover:text-white/60 text-xs uppercase tracking-widest font-bold transition-colors mt-4"
                >
                    Skip for now
                </button>
            </div>
        );
    }

    return <>{children}</>;
}
