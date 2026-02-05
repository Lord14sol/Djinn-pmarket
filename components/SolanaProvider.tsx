'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAuthWrapper } from './WalletAuthWrapper';

export function SolanaProvider({ children }: { children: React.ReactNode }) {
    const network = WalletAdapterNetwork.Devnet;

    const endpoint = useMemo(() => {
        if (process.env.NEXT_PUBLIC_RPC_URL) {
            return process.env.NEXT_PUBLIC_RPC_URL;
        }
        return clusterApiUrl(network);
    }, [network]);

    // Explicitly add adapters to ensure detection
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider
                wallets={wallets}
                autoConnect={false}
                onError={(error) => {
                    // Silently swallow transient/empty errors from adapter race conditions
                    const msg = error.message || '';
                    const isTransient =
                        msg.includes('Unexpected error') ||
                        msg.includes('User rejected') ||
                        msg === '' ||
                        error.name === 'WalletConnectionError';

                    if (isTransient) {
                        console.warn('[SolanaProvider] Suppressed error:', error.name, msg || '(empty)');
                        return;
                    }
                    console.error('[SolanaProvider] Wallet error:', error);
                }}
            >
                {/* ✅ NO uses WalletModalProvider aquí */}
                <WalletAuthWrapper>
                    {children}
                </WalletAuthWrapper>
            </WalletProvider>
        </ConnectionProvider>
    );
}