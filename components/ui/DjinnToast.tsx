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
            // Elegant Pink Glass
            container: 'bg-gradient-to-br from-[#F492B7]/20 to-[#FFD1DC]/10 border-[#F492B7]/30 shadow-[0_8px_32px_rgba(244,146,183,0.25)]',
            iconBg: 'bg-white/20',
            iconColor: 'text-[#F492B7]',
            titleColor: 'text-white',
            msgColor: 'text-white/80',
            button: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-lg backdrop-blur-md',
            icon: CheckCircle2
        },
        ERROR: {
            container: 'bg-gradient-to-br from-red-500/20 to-black/40 border-red-500/30 shadow-[0_8px_32px_rgba(239,68,68,0.25)]',
            iconBg: 'bg-red-500/10',
            iconColor: 'text-red-500',
            titleColor: 'text-white',
            msgColor: 'text-white/80',
            button: 'bg-red-500/80 hover:bg-red-500 text-white shadow-lg',
            icon: AlertCircle
        },
        INFO: {
            container: 'bg-gradient-to-br from-blue-500/20 to-black/40 border-blue-500/30 shadow-[0_8px_32px_rgba(59,130,246,0.25)]',
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-500',
            titleColor: 'text-white',
            msgColor: 'text-white/80',
            button: 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg',
            icon: Info
        }
    };

    const currentStyle = styles[type];
    const Icon = currentStyle.icon;

    return (
        <div className={`fixed top-24 right-6 z-[100] transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${show ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-[120%] opacity-0 scale-90'}`}>
            <div className={`relative w-96 backdrop-blur-3xl border rounded-[2rem] p-6 overflow-hidden ${currentStyle.container}`}>

                {/* Subtle sheen effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={() => { setShow(false); setTimeout(onClose, 300); }}
                    className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors z-20"
                >
                    <X size={18} />
                </button>

                <div className="flex gap-4 items-start relative z-10">
                    {/* Icon Bubble */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${currentStyle.iconBg} shadow-inner`}>
                        <Icon size={20} className={currentStyle.iconColor} strokeWidth={3} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                        <h4 className={`font-black text-sm uppercase tracking-widest mb-1 ${currentStyle.titleColor}`}>
                            {title || type}
                        </h4>
                        <p className={`text-xs font-bold leading-relaxed mb-4 ${currentStyle.msgColor}`}>
                            {message}
                        </p>

                        {/* Action Link (Pill Shape) */}
                        {actionLink && (
                            <a
                                href={actionLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${currentStyle.button}`}
                            >
                                {actionLabel} <ExternalLink size={10} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
