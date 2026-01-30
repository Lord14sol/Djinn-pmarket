'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAchievement } from '@/lib/AchievementContext';
import Navbar from './Navbar';
import LavaLampBackground from './LavaLampBackground';
import { ADMIN_WALLETS } from '@/lib/whitelist';
import * as supabaseDb from '@/lib/supabase-db';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const { unlockAchievement } = useAchievement();
    const isGenesis = pathname === '/';

    // Track if we've already triggered the genesis sequence for the current session/wallet
    const genesisTriggeredRef = React.useRef<string | null>(null);

    // Achievement Trigger: Genesis Medal on first connection
    useEffect(() => {
        if (connected && publicKey) {
            const walletAddr = publicKey.toBase58();
            const flagKey = `djinn_genesis_notified_v15_${walletAddr}`;

            // Check if already notified in localStorage
            if (localStorage.getItem(flagKey)) {
                console.log(`ℹ️ [Genesis] Already notified for ${walletAddr.slice(0, 8)}`);
                return;
            }

            // Session check: ensure we don't start multiple timers for the same wallet
            if (genesisTriggeredRef.current === walletAddr) return;
            genesisTriggeredRef.current = walletAddr;

            console.log(`🚀 Genesis trigger initiated for ${walletAddr}`);

            const timer = setTimeout(() => {
                unlockAchievement({
                    name: "GENESIS",
                    description: "First time connecting to Djinn",
                    image_url: "/genesis-medal-v2.png"
                });

                // Only grant to DB if not already there (handled by supabase-db.ts)
                supabaseDb.grantAchievement(walletAddr, 'GENESIS').then(res => {
                    if (res) console.log("✅ GENESIS Medal permanently unlocked in DB");
                });

                localStorage.setItem(flagKey, 'true');
            }, 3000); // 3s delay for smoother entry

            return () => clearTimeout(timer);
        } else if (!connected) {
            // Reset ref if wallet disconnects to allow fresh trigger if they reconnect another wallet
            genesisTriggeredRef.current = null;
        }
    }, [connected, publicKey, unlockAchievement]);

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
            {/* LavaLampBackground Removed for Pure Black Space Theme */}
            <div className={!isGenesis ? "pt-20" : ""}>
                {children}
            </div>
        </>
    );
}
