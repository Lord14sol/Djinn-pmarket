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

    const styles = {
        SUCCESS: {
            container: 'bg-[#F492B7] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
            iconBg: 'bg-black/10',
            iconColor: 'text-black',
            titleColor: 'text-black',
            msgColor: 'text-black/80',
            button: 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
            icon: CheckCircle2
        },
        ERROR: {
            container: 'bg-red-400 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
            iconBg: 'bg-black/10',
            iconColor: 'text-black',
            titleColor: 'text-black',
            msgColor: 'text-black/80',
            button: 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
            icon: AlertCircle
        },
        INFO: {
            container: 'bg-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
            iconBg: 'bg-black/5',
            iconColor: 'text-black',
            titleColor: 'text-black',
            msgColor: 'text-black/60',
            button: 'bg-gray-100 border-2 border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
            icon: Info
        }
    };

    const currentStyle = styles[type];
    const Icon = currentStyle.icon;

    return (
        <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${show ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-95'}`}>
            <div className={`relative w-[28rem] border-4 border-black rounded-3xl p-6 overflow-hidden ${currentStyle.container}`}>

                {/* Close Button - Bright Red & Visible */}
                <button
                    onClick={() => { setShow(false); setTimeout(onClose, 300); }}
                    className="absolute top-4 right-4 bg-red-500 border-2 border-black text-white p-1.5 rounded-full hover:bg-red-600 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none z-20"
                >
                    <X size={16} strokeWidth={4} />
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
