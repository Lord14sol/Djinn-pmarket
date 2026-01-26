'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// ❌ NO IMPORTES ESTO - Lo reemplazamos con nuestro CustomWalletModal
// import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaProvider({ children }: { children: React.ReactNode }) {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // Solo las wallets disponibles en el paquete principal
    // Backpack se detectará automáticamente si está instalada
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
                autoConnect
                // App Identity for wallet signatures
                localStorageKey="djinn-wallet"
            >
                {/* ✅ NO uses WalletModalProvider aquí */}
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}