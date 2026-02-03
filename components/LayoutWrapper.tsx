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

    // Achievement Trigger: Genesis Medal ONLY for first 1000 users
    useEffect(() => {
        if (connected && publicKey) {
            const walletAddr = publicKey.toBase58();
            const flagKey = `djinn_genesis_notified_v16_${walletAddr}`;

            const checkAndNotify = async () => {
                // 1. Check localStorage AND session ref (fast skip)
                if (localStorage.getItem(flagKey) || genesisTriggeredRef.current === walletAddr) return;

                // Mark as triggered EARLY to prevent race conditions
                genesisTriggeredRef.current = walletAddr;

                // 2. Check if user is in Genesis whitelist (primeros 1000)
                try {
                    const { getWhitelistStatus } = await import('@/lib/whitelist');
                    const status = await getWhitelistStatus(walletAddr);

                    // Solo mostrar Genesis si está registrado en whitelist O es admin
                    if (!status.isRegistered && !status.isAdmin) {
                        // No está en los primeros 1000, no mostrar nada
                        try { localStorage.setItem(flagKey, 'true'); } catch (e) { }
                        return;
                    }

                    // 3. Check if already has the achievement
                    const achievements = await supabaseDb.getUserAchievements(walletAddr);
                    if (achievements.some(a => a.code === 'GENESIS_MEMBER')) {
                        try { localStorage.setItem(flagKey, 'true'); } catch (e) { }
                        return;
                    }
                } catch (err) {
                    console.error("Error checking Genesis status:", err);
                    genesisTriggeredRef.current = null;
                    return;
                }

                // 4. Show Genesis notification (solo para primeros 1000)
                console.log(`🚀 Genesis trigger for WHITELISTED user: ${walletAddr}`);

                const timer = setTimeout(() => {
                    unlockAchievement({
                        name: "Genesis Member",
                        description: "One of the first 1000 Djinn users",
                        image_url: "/genesis-medal-v2.png"
                    });

                    supabaseDb.grantAchievement(walletAddr, 'GENESIS_MEMBER').then(res => {
                        if (res) console.log("✅ GENESIS Medal permanently unlocked in DB");
                    });

                    try {
                        localStorage.setItem(flagKey, 'true');
                    } catch (e) {
                        if (e instanceof Error && e.name === 'QuotaExceededError') {
                            try {
                                Object.keys(localStorage).forEach(k => {
                                    if (k.startsWith('djinn_profile_')) {
                                        localStorage.removeItem(k);
                                    }
                                });
                                localStorage.setItem(flagKey, 'true');
                            } catch (retryErr) { }
                        }
                    }
                }, 3000);

                return () => clearTimeout(timer);
            };

            const cleanup = checkAndNotify();
            return () => {
                if (typeof cleanup === 'function') (cleanup as any)();
            };
        } else if (!connected) {
            genesisTriggeredRef.current = null;
        }
    }, [connected, publicKey, unlockAchievement]);

    useEffect(() => {
        const checkAccess = async () => {
            // Only enforce on internal pages (skip for /markets to allow seamless experience)
            const protectedPaths = ['/admin', '/bets', '/profile'];
            const isProtected = protectedPaths.some(p => pathname.startsWith(p));

            if (isProtected && connected && publicKey) {
                try {
                    const { getWhitelistStatus, registerForWhitelist } = await import('@/lib/whitelist');
                    const status = await getWhitelistStatus(publicKey.toBase58());

                    if (!status.isAdmin && !status.isRegistered) {
                        // Try auto-registering before redirecting
                        if (!status.isFull) {
                            const result = await registerForWhitelist(publicKey.toBase58());
                            if (result.success) {
                                console.log('[LayoutWrapper] Auto-registered user');
                                return; // Stay on page
                            }
                        }
                        router.push('/');
                    }
                } catch (err) {
                    console.error("[LayoutWrapper] Access check failed:", err);
                    // Fail open - allow access if check fails
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
