'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState, useRef, useEffect } from 'react';
import type { WalletName } from '@solana/wallet-adapter-base';

interface WalletConnectionState {
    isConnecting: boolean;
    error: string | null;
    lastAttempt: number | null;
}

export function useWalletConnection() {
    const { select, connect, disconnect, wallet, connecting, connected, wallets } = useWallet();

    const [state, setState] = useState<WalletConnectionState>({
        isConnecting: false,
        error: null,
        lastAttempt: null,
    });

    const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const connectionAttemptRef = useRef<boolean>(false);
    const pendingConnectRef = useRef<boolean>(false);

    const cleanup = useCallback(() => {
        if (connectTimeoutRef.current) {
            clearTimeout(connectTimeoutRef.current);
            connectTimeoutRef.current = null;
        }
        connectionAttemptRef.current = false;
        pendingConnectRef.current = false;
    }, []);

    // STEP 2: After select() updates the wallet in Provider, call connect()
    // This runs when `wallet` changes after our select() call
    useEffect(() => {
        if (pendingConnectRef.current && wallet && !connected && !connecting) {
            pendingConnectRef.current = false;
            console.log('[Wallet] Wallet selected, now calling Provider connect()...');

            connect().catch((err) => {
                cleanup();
                const msg = err?.message || '';

                if (msg.includes('User rejected') || msg.includes('user rejected')) {
                    setState(prev => ({ ...prev, isConnecting: false, error: 'Connection cancelled' }));
                } else if (msg.includes('Already connected')) {
                    setState(prev => ({ ...prev, isConnecting: false, error: null }));
                } else {
                    console.error('[Wallet] Provider connect() failed:', msg);
                    setState(prev => ({ ...prev, isConnecting: false, error: msg || 'Connection failed' }));
                }
            });
        }
    }, [wallet, connected, connecting, connect, cleanup]);

    // Detect successful connection
    useEffect(() => {
        if (connected && connectionAttemptRef.current) {
            cleanup();
            console.log('[Wallet] Fully connected via Provider!');
            setState(prev => ({ ...prev, isConnecting: false, error: null }));
        }
    }, [connected, cleanup]);

    const connectWallet = useCallback(async (walletName: WalletName) => {
        if (connectionAttemptRef.current || connecting) {
            return { success: false, error: 'Connection already in progress' };
        }

        if (connected && wallet?.adapter?.name === walletName) {
            return { success: true, error: null };
        }

        // Switching wallets
        if (connected) {
            try { await disconnect(); } catch (e) { /* ignore */ }
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        connectionAttemptRef.current = true;
        setState(prev => ({ ...prev, isConnecting: true, error: null, lastAttempt: Date.now() }));

        // Safety timeout
        connectTimeoutRef.current = setTimeout(() => {
            if (connectionAttemptRef.current) {
                cleanup();
                setState(prev => ({ ...prev, isConnecting: false, error: 'Wallet did not respond - try again' }));
            }
        }, 15000);

        // STEP 1: select() tells WalletProvider which wallet to use
        // This triggers a React state update → wallet changes → useEffect above calls connect()
        console.log('[Wallet] Selecting:', walletName);
        pendingConnectRef.current = true;
        select(walletName);

        // Return optimistically - the useEffect chain handles the rest
        return { success: true, error: null };
    }, [select, connecting, connected, wallet, disconnect, cleanup]);

    const disconnectWallet = useCallback(async () => {
        try {
            cleanup();
            await disconnect();
            setState({ isConnecting: false, error: null, lastAttempt: null });
            return { success: true };
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }, [disconnect, cleanup]);

    const retry = useCallback(async () => {
        if (!wallet?.adapter?.name) {
            return { success: false, error: 'No wallet selected' };
        }
        return connectWallet(wallet.adapter.name as WalletName);
    }, [wallet, connectWallet]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    return {
        isConnecting: state.isConnecting || connecting,
        error: state.error,
        connected,
        wallet,
        connectWallet,
        disconnectWallet,
        retry,
        clearError,
        canRetry: !!(state.error && wallet?.adapter?.name),
    };
}
