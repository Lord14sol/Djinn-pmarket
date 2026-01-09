'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Importación de estilos vital para que el modal se vea bien (se puede personalizar luego para el estilo DJINN)
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaProvider({ children }: { children: React.ReactNode }) {
    // Aquí definimos la red. 'devnet' para desarrollo, cambiaremos a 'mainnet-beta' al lanzar.
    const network = WalletAdapterNetwork.Devnet;

    // Genera el endpoint de conexión
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // Inicializa las wallets (Phantom es la principal, podemos añadir Solflare luego)
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}