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

            // Track if checking DB to avoid duplicate async calls
            const checkAndNotify = async () => {
                // 1. Double check localStorage AND current session ref (fast)
                if (localStorage.getItem(flagKey) || genesisTriggeredRef.current === walletAddr) return;

                // Mark as triggered EARLY to prevent race conditions during async check
                genesisTriggeredRef.current = walletAddr;

                // 2. Check Supabase (once per lifetime)
                try {
                    const achievements = await supabaseDb.getUserAchievements(walletAddr);
                    if (achievements.some(a => a.code === 'FIRST_MARKET')) {
                        // Mark as notified in LS silently and stop
                        try { localStorage.setItem(flagKey, 'true'); } catch (e) { }
                        return;
                    }
                } catch (err) {
                    console.error("Error checking achievements:", err);
                    // On error, we reset the ref so it can try again next mount if needed,
                    // but usually we want to be safe.
                    genesisTriggeredRef.current = null;
                    return;
                }

                // 3. Initiate Notification
                console.log(`🚀 Genesis trigger initiated for ${walletAddr}`);

                const timer = setTimeout(() => {
                    unlockAchievement({
                        name: "Genesis Creator",
                        description: "First time connecting to Djinn",
                        image_url: "/genesis-medal-v2.png"
                    });

                    supabaseDb.grantAchievement(walletAddr, 'FIRST_MARKET').then(res => {
                        if (res) console.log("✅ GENESIS Medal permanently unlocked in DB");
                    });

                    try {
                        localStorage.setItem(flagKey, 'true');
                    } catch (e) {
                        // SILENT FAIL - Never red-screen the user for a flag
                        if (e instanceof Error && e.name === 'QuotaExceededError') {
                            try {
                                // Aggressive cleanup: remove all djinn_profile_ caches to make room
                                Object.keys(localStorage).forEach(k => {
                                    if (k.startsWith('djinn_profile_')) {
                                        localStorage.removeItem(k);
                                    }
                                });
                                // Try one last time
                                localStorage.setItem(flagKey, 'true');
                            } catch (retryErr) {
                                // Ignore retry failure
                            }
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
