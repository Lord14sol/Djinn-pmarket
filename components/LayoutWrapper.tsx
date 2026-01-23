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
        const checkAccess = async () => {
            // Only enforce on internal pages
            if (pathname !== '/' && connected && publicKey) {
                try {
                    const { getWhitelistStatus } = await import('@/lib/whitelist');
                    const status = await getWhitelistStatus(publicKey.toBase58());

                    if (!status.isAdmin && !status.isRegistered) {
                        router.push('/');
                    }
                } catch (err) {
                    console.error("[LayoutWrapper] Access check failed:", err);
                }
            }
        };

        checkAccess();
    }, [pathname, connected, publicKey, router]);

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
