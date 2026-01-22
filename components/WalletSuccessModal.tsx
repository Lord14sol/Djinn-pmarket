'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export default function WalletSuccessModal() {
    const { connected, wallet } = useWallet();
    const [isOpen, setIsOpen] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(false);

    // Watch for connection changes
    useEffect(() => {
        if (connected) {
            // Check if user has connected before
            const hasConnectedBefore = localStorage.getItem('djinn_has_connected_before');

            if (!hasConnectedBefore) {
                // First time ever
                setIsFirstTime(true);
                localStorage.setItem('djinn_has_connected_before', 'true');
            } else {
                // Return visitor
                setIsFirstTime(false);
            }

            // Show modal
            setIsOpen(true);

            // Auto-hide after 3 seconds
            const timer = setTimeout(() => {
                setIsOpen(false);
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            setIsOpen(false);
        }
    }, [connected]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            {/* Backdrop excluded to be non-intrusive (pointer events none on container)
                But we want the modal itself to be clickable/visible */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto" onClick={() => setIsOpen(false)} />

            <div className="relative bg-[#0B0E14] border border-white/10 rounded-[2rem] p-8 md:p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200 pointer-events-auto transform transition-all">
                {/* Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Pink Glowing Checkmark */}
                <div className="relative mb-6 flex justify-center">
                    <div className="w-20 h-20 bg-[#F492B7] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(244,146,183,0.6)] animate-pulse-subtle">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    </div>
                    {/* Ring animation */}
                    <div className="absolute inset-0 border-2 border-[#F492B7] rounded-full animate-ping opacity-20"></div>
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-white">
                        Successfully Connected
                    </h3>

                    <div className="text-gray-400 font-medium text-sm">
                        {isFirstTime ? (
                            <>
                                <p className="text-[#F492B7] font-bold text-lg mb-1">Welcome to Djinn! 🧞‍♂️</p>
                                <p>Your wallet is ready.</p>
                            </>
                        ) : (
                            <p>You're good to go!</p>
                        )}
                        {wallet?.adapter.name && (
                            <div className="mt-2 text-xs bg-white/5 inline-block px-3 py-1 rounded-full border border-white/5">
                                via <span className="text-white">{wallet.adapter.name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
