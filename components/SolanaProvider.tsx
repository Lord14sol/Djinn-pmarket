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
                // App Identity for wallet signatures
                localStorageKey="djinn-wallet"
                onError={(error) => {
                    // Silently swallow "Unexpected error" from adapter race conditions
                    if (error.message?.includes('Unexpected error')) {
                        console.warn('[SolanaProvider] Suppressed transient error:', error.message);
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