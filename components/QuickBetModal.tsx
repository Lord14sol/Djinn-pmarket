'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { placeTradeOnChain } from '@/lib/program';
import { getOrCreateUserTokenAccounts } from '@/lib/token-utils';

interface QuickBetModalProps {
    isOpen: boolean;
    onClose: () => void;
    market: {
        title: string;
        icon: string;
        chance: number;
        volume: string;
        marketPDA?: string;
        yesTokenMint?: string;
        noTokenMint?: string;
    };
    outcome: 'yes' | 'no'; // YES or NO
}

export default function QuickBetModal({ isOpen, onClose, market, outcome }: QuickBetModalProps) {
    const wallet = useWallet();
    const { setVisible } = useWalletModal();
    const [amount, setAmount] = useState(10);
    const [isLoading, setIsLoading] = useState(false);

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleDeposit = async () => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            setVisible(true);
            return;
        }

        if (!market.marketPDA || !market.yesTokenMint || !market.noTokenMint) {
            alert('Market not fully configured. Please create market first.');
            return;
        }

        setIsLoading(true);

        try {
            console.log(`🎲 Placing ${outcome.toUpperCase()} bet: ${amount} SOL`);

            // 1. Get/Create token accounts
            const { yesTokenAccount, noTokenAccount } = await getOrCreateUserTokenAccounts(
                wallet as any,
                new PublicKey(market.yesTokenMint),
                new PublicKey(market.noTokenMint)
            );

            // 2. Place trade on-chain
            const { signature } = await placeTradeOnChain(
                wallet as any,
                new PublicKey(market.marketPDA),
                new PublicKey(market.yesTokenMint),
                new PublicKey(market.noTokenMint),
                yesTokenAccount,
                noTokenAccount,
                outcome === 'yes',
                amount * 1_000_000_000 // Convert SOL to lamports
            );

            console.log('✅ Trade successful!', signature);

            alert(`✅ Bet placed!\n\n${outcome.toUpperCase()}: ${amount} SOL\n\nTX: ${signature.slice(0, 8)}...`);

            onClose();

        } catch (error: any) {
            console.error('❌ Error:', error);
            alert(`Failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal - Bottom Sheet Style */}
            <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
                <div className="bg-gradient-to-b from-gray-900 to-black rounded-t-3xl border-t border-white/10 p-6 shadow-2xl max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="text-4xl">{market.icon}</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white leading-tight">
                                    {market.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-2xl font-black text-pink-400">{market.chance}%</span>
                                    <span className="text-xs text-gray-500">chance</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition p-2"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Amount Input */}
                    <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Math.max(0.1, parseFloat(e.target.value) || 0))}
                                className="bg-transparent text-4xl font-black text-white outline-none w-full"
                                placeholder="0.0"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAmount(amount + 1)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition"
                                >
                                    +1
                                </button>
                                <button
                                    onClick={() => setAmount(amount + 10)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition"
                                >
                                    +10
                                </button>
                            </div>
                        </div>

                        {/* Slider */}
                        <input
                            type="range"
                            min="0.1"
                            max="100"
                            step="0.1"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #a855f7 ${(amount / 100) * 100}%, rgba(255,255,255,0.1) ${(amount / 100) * 100}%, rgba(255,255,255,0.1) 100%)`
                            }}
                        />
                    </div>

                    {/* Fee Info */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-yellow-300">Trading Fee (0.1%)</span>
                            <span className="font-bold text-yellow-200">~{(amount * 0.001).toFixed(4)} SOL</span>
                        </div>
                    </div>

                    {/* Deposit Button */}
                    <button
                        onClick={handleDeposit}
                        disabled={isLoading || amount <= 0}
                        className={`
              w-full py-4 rounded-xl font-black text-xl uppercase
              shadow-lg transition-all
              ${outcome === 'yes'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-green-500/50'
                                : 'bg-gradient-to-r from-red-500 to-pink-600 hover:shadow-red-500/50'
                            }
              text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:scale-105 active:scale-95
            `}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            `Bet ${amount} SOL on ${outcome.toUpperCase()}`
                        )}
                    </button>

                    {/* Info */}
                    <p className="text-center text-xs text-gray-500 mt-4">
                        You'll receive {outcome.toUpperCase()} shares • Volume: {market.volume}
                    </p>
                </div>
            </div>

            <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>
        </>
    );
}
