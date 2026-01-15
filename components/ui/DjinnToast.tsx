'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import Image from 'next/image';

export type DjinnToastType = 'SUCCESS' | 'ERROR' | 'INFO';

export interface DjinnToastProps {
    isVisible: boolean;
    onClose: () => void;
    type: DjinnToastType;
    title?: string;
    message: string;
    actionLink?: string;
    actionLabel?: string;
    duration?: number;
}

export default function DjinnToast({
    isVisible,
    onClose,
    type,
    title,
    message,
    actionLink,
    actionLabel = 'View Transaction',
    duration = 5000
}: DjinnToastProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            // Animation trigger
            const showTimer = setTimeout(() => setShow(true), 50);

            // Auto-hide
            const hideTimer = setTimeout(() => {
                setShow(false);
                setTimeout(onClose, 300); // Wait for exit animation
            }, duration);

            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
            };
        } else {
            setShow(false);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !show) return null;

    // Styles based on type
    const styles = {
        SUCCESS: {
            bg: 'bg-[#F492B7]/10',
            // border (handled by container)
            iconColor: 'text-[#F492B7]',
            button: 'bg-[#F492B7] text-black hover:bg-[#ff6fb7] shadow-[0_0_15px_rgba(244,146,183,0.4)]',
            icon: CheckCircle2
        },
        ERROR: {
            bg: 'bg-red-500/10',
            iconColor: 'text-red-500',
            button: 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:brightness-110',
            icon: AlertCircle
        },
        INFO: {
            bg: 'bg-blue-500/10',
            iconColor: 'text-blue-500',
            button: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:brightness-110',
            icon: Info
        }
    };

    const currentStyle = styles[type];
    const Icon = currentStyle.icon;

    return (
        <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-500 ease-out ${show ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}`}>
            <div className={`relative w-96 backdrop-blur-xl bg-[#0E0E0E] bg-opacity-95 border-2 border-[#F492B7] rounded-3xl p-6 shadow-[0_0_30px_-10px_rgba(244,146,183,0.3)] overflow-hidden`}>

                {/* Glow Effect */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none bg-[#F492B7]/20`} />

                {/* Close Button */}
                <button
                    onClick={() => { setShow(false); setTimeout(onClose, 300); }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>

                <div className="flex gap-5">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${currentStyle.bg} border border-[#F492B7]/30 shadow-inner`}>
                        <Icon size={24} className={currentStyle.iconColor} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <h4 className="font-black text-base uppercase tracking-wider mb-1 text-white shadow-black drop-shadow-md">
                            {title || type}
                        </h4>
                        <p className="text-gray-200 text-sm leading-relaxed font-bold mb-4">
                            {message}
                        </p>

                        {/* Action Link */}
                        {actionLink && (
                            <a
                                href={actionLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] ${currentStyle.button}`}
                            >
                                {actionLabel} <ExternalLink size={12} />
                            </a>
                        )}

                        {/* Branding Removed per request */}
                    </div>
                </div>
            </div>
        </div>
    );
}
