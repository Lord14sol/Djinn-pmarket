'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Navbar from './Navbar';
import LavaLampBackground from './LavaLampBackground';
import { ADMIN_WALLETS } from '@/lib/whitelist';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const isGenesis = pathname === '/';

    useEffect(() => {
        // Only enforce on internal pages
        if (!isGenesis) {
            // If connected but not admin, bounce
            if (connected && publicKey) {
                const address = publicKey.toBase58();
                if (!ADMIN_WALLETS.includes(address)) {
                    router.push('/');
                }
            }
        }
    }, [isGenesis, connected, publicKey, router]);

    return (
        <>
            {!isGenesis && <Navbar />}
            {!isGenesis && <LavaLampBackground />}
            <div className={!isGenesis ? "pt-20" : ""}>
                {children}
            </div>
        </>
    );
}
