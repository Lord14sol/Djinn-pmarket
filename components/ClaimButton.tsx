'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDjinnProtocol } from '../hooks/useDjinnProtocol';
import { PublicKey } from '@solana/web3.js';
import confetti from 'canvas-confetti';

interface ClaimButtonProps {
    marketPda: string;
    yesTokenMint: string;
    noTokenMint: string;
    winningOutcome: 'YES' | 'NO' | null | undefined;
    onClaimSuccess?: () => void;
}

export default function ClaimButton({ marketPda, yesTokenMint, noTokenMint, winningOutcome, onClaimSuccess }: ClaimButtonProps) {
    const { claimReward, getUserBalance, isReady } = useDjinnProtocol();
    const { publicKey } = useWallet();
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [winningShares, setWinningShares] = useState(0);

    // Check if user has winnings
    useEffect(() => {
        if (!isReady || !publicKey || !marketPda || !winningOutcome || !yesTokenMint || !noTokenMint) {
            setChecking(false);
            return;
        }

        const checkWinnings = async () => {
            try {
                const mintToCheck = winningOutcome === 'YES' ? yesTokenMint : noTokenMint;
                const balance = await getUserBalance(new PublicKey(mintToCheck));
                setWinningShares(balance || 0);
            } catch (err) {
                console.error("Error checking winnings:", err);
            } finally {
                setChecking(false);
            }
        };

        checkWinnings();
    }, [isReady, publicKey, marketPda, winningOutcome, getUserBalance, yesTokenMint, noTokenMint]);

    const handleClaim = async () => {
        if (!marketPda) return;
        setLoading(true);
        try {
            const tx = await claimReward(
                new PublicKey(marketPda),
                new PublicKey(yesTokenMint),
                new PublicKey(noTokenMint)
            );
            console.log("Claimed!", tx);

            // Celebration
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#F492B7', '#10B981', '#FFD700']
            });

            alert(`💰 Winnings Claimed Successfully!\nTX: ${tx.slice(0, 10)}...`);
            setWinningShares(0); // Hide button
            if (onClaimSuccess) onClaimSuccess();

        } catch (error: any) {
            console.error("Claim error:", error);
            alert(`Failed to claim: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (checking) return null; // Or a mini spinner
    if (winningShares <= 0) return null; // Nothing to claim

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
            <button
                onClick={handleClaim}
                disabled={loading}
                className={`
                    px-8 py-4 rounded-full font-black text-xl uppercase tracking-wider shadow-2xl
                    flex items-center gap-3
                    transition-all hover:scale-105 active:scale-95
                    ${loading ? 'bg-gray-600 cursor-wait' : 'bg-gradient-to-r from-yellow-400 to-amber-600 text-white border-4 border-yellow-200'}
                `}
            >
                {loading ? (
                    <>⏳ Claiming...</>
                ) : (
                    <>
                        🏆 Claim Winnings
                        <span className="bg-white/20 px-2 py-0.5 rounded text-sm normal-case">
                            {winningOutcome} Wins
                        </span>
                    </>
                )}
            </button>

            {/* Glow effect */}
            <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-30 animate-pulse -z-10 rounded-full"></div>
        </div>
    );
}
