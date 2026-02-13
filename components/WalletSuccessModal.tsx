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
            // Check if we already notified this session to avoid refresh-spam
            const hasNotifiedThisSession = sessionStorage.getItem('djinn_notified_connection');
            if (hasNotifiedThisSession) return;

            const hasConnectedBefore = localStorage.getItem('djinn_has_connected_before');
            if (!hasConnectedBefore) {
                setIsFirstTime(true);
                localStorage.setItem('djinn_has_connected_before', 'true');
            } else {
                setIsFirstTime(false);
            }

            setIsOpen(true);
            setIsClosing(false);
            sessionStorage.setItem('djinn_notified_connection', 'true');

            // Auto-hide after 3 seconds (faster for better UX)
            const timer = setTimeout(() => {
                handleClose();
            }, 3000);

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
            {/* Backdrop: Higher opacity for contrast */}
            <div
                className={`absolute inset-0 bg-black/70 backdrop-blur-md transition-all cursor-pointer ${isClosing ? 'animate-out fade-out duration-500' : 'animate-in fade-in duration-700'}`}
                onClick={handleClose}
            />

            <div className={`
                relative w-full max-w-sm text-center transform transition-all cursor-default
                ${isClosing ? 'animate-out zoom-out-95 slide-out-to-bottom-2 fade-out duration-500' : 'animate-in zoom-in-90 slide-in-from-bottom-2 fade-in duration-700'}
            `}>
                {/* Offset shadow layer */}
                <div className="absolute inset-0 bg-black rounded-[2.5rem] translate-x-[12px] translate-y-[12px]" />

                {/* Main card */}
                <div className="relative bg-white border-[4px] border-black rounded-[2.5rem] p-8 md:p-10 overflow-hidden">
                    {/* Close Button: Neo-Brutalist */}
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 bg-white border-2 border-black text-black p-2 rounded-xl hover:bg-[#F492B7] transition-all active:scale-95 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] z-20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Pink Glowing Checkmark - Neo-Brutalist */}
                    <div className="relative mb-8 flex justify-center">
                        <div className="w-24 h-24 bg-[#F492B7] border-[4px] border-black rounded-full flex items-center justify-center shadow-[6px_6px_0px_#000] relative z-10">
                            <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        {/* Static Brutalist Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#F492B7]/20 rounded-full blur-2xl animate-pulse" />
                    </div>

                    {/* Text Content */}
                    <div className="space-y-4">
                        <h3
                            className="text-3xl font-black text-black lowercase tracking-tighter italic leading-none"
                            style={{ fontFamily: 'var(--font-unbounded), sans-serif' }}
                        >
                            connected<br />successfully
                        </h3>

                        <div className="space-y-2">
                            {isFirstTime ? (
                                <>
                                    <p className="text-[#F492B7] font-black text-xl lowercase tracking-tight italic">welcome to djinn!</p>
                                    <p className="text-black/40 font-bold text-sm lowercase tracking-tight italic">your wallet is ready.</p>
                                </>
                            ) : (
                                <p className="text-black/60 font-black text-lg lowercase tracking-tighter italic">you're good to go!</p>
                            )}

                            {wallet?.adapter.name && (
                                <div className="mt-4 bg-black/5 border-2 border-black/10 inline-block px-4 py-1.5 rounded-full">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                                        via <span className="text-black">{wallet.adapter.name}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
