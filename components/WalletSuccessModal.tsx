'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export default function WalletSuccessModal() {
    const { connected, wallet } = useWallet();
    const [isOpen, setIsOpen] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Watch for connection changes
    useEffect(() => {
        if (connected) {
            const hasConnectedBefore = localStorage.getItem('djinn_has_connected_before');
            if (!hasConnectedBefore) {
                setIsFirstTime(true);
                localStorage.setItem('djinn_has_connected_before', 'true');
            } else {
                setIsFirstTime(false);
            }

            setIsOpen(true);
            setIsClosing(false); // Reset closing state

            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                handleClose();
            }, 5000);

            return () => clearTimeout(timer);
        } else {
            setIsOpen(false);
        }
    }, [connected]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 500); // Match animation duration
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all cursor-pointer ${isClosing ? 'animate-out fade-out duration-500' : 'animate-in fade-in duration-700'}`}
                onClick={handleClose}
            />

            <div className={`relative bg-[#0B0E14] border border-white/10 rounded-[2rem] p-8 md:p-10 max-w-sm w-full text-center shadow-2xl transform transition-all cursor-default ${isClosing ? 'animate-out zoom-out-95 slide-out-to-bottom-2 fade-out duration-500' : 'animate-in zoom-in-90 slide-in-from-bottom-2 fade-in duration-700'}`}>
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-2 rounded-full active:scale-90 z-20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Pink Glowing Checkmark - Slower Pulse */}
                <div className="relative mb-6 flex justify-center">
                    <div className="w-20 h-20 bg-[#F492B7] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(244,146,183,0.6)] animate-pulse" style={{ animationDuration: '3s' }}>
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    </div>
                    {/* Ring animation - Slower */}
                    <div className="absolute inset-0 border-2 border-[#F492B7] rounded-full animate-ping opacity-20" style={{ animationDuration: '2s' }}></div>
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
