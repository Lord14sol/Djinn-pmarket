'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
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

    // Standard Wallet Adapters are automatically detected by the WalletProvider.
    // We do NOT instantiate legacy adapters like PhantomWalletAdapter manually to avoid conflicts.
    const wallets = useMemo(
        () => [],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider
                wallets={wallets}
                autoConnect={true}
                // App Identity for wallet signatures
                localStorageKey="djinn-wallet"
            >
                {/* ✅ NO uses WalletModalProvider aquí */}
                <WalletAuthWrapper>
                    {children}
                </WalletAuthWrapper>
            </WalletProvider>
        </ConnectionProvider>
    );
}