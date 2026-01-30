'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

export function SolanaProvider({ children }: { children: React.ReactNode }) {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

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
                autoConnect={false}
                // App Identity for wallet signatures
                localStorageKey="djinn-wallet"
            >
                {/* ✅ NO uses WalletModalProvider aquí */}
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}