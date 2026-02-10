import React from 'react';

interface TwitterWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
}

export default function TwitterWarningModal({ isOpen, onClose, onAccept }: TwitterWarningModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#FFD600] border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-black uppercase tracking-tight leading-tight">
                            twitter market rules
                        </h2>
                        <p className="text-xs font-bold text-black/60 lowercase">read before creating</p>
                    </div>
                </div>

                {/* Rules */}
                <div className="px-6 pb-4 space-y-3">
                    <RuleItem
                        number="1"
                        title="literal search"
                        description={`the oracle searches exact words. "Cripto" ≠ "Crypto". case-insensitive.`}
                    />
                    <RuleItem
                        number="2"
                        title="no retweets"
                        description="RTs do not count as a fulfilled prediction. only original tweets."
                    />
                    <RuleItem
                        number="3"
                        title="deleted tweets"
                        description="if the tweet is deleted before the oracle indexes it (~15 min), it does NOT count. once indexed, the result is FINAL."
                    />
                    <RuleItem
                        number="4"
                        title="7-day maximum"
                        description="twitter markets are limited to 7 days. the API only searches the last 7 days of tweets."
                    />
                    <RuleItem
                        number="5"
                        title="early resolution"
                        description="if the condition is met before expiry, the market resolves YES immediately. no more bets after resolution."
                    />
                    <RuleItem
                        number="6"
                        title="source of truth"
                        description="resolution is based strictly on Twitter/X API availability via Cerberus oracle."
                    />
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white border-2 border-black rounded-xl font-black text-sm uppercase text-black/60 hover:text-black hover:bg-gray-50 transition-all"
                    >
                        cancel
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 py-3 bg-black border-2 border-black rounded-xl font-black text-sm uppercase text-[#FFD600] hover:bg-gray-900 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0 active:shadow-none transition-all"
                    >
                        i understand
                    </button>
                </div>
            </div>
        </div>
    );
}

function RuleItem({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <div className="flex gap-3 items-start">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#FFD600] font-black text-xs">{number}</span>
            </div>
            <div>
                <p className="font-black text-sm text-black lowercase leading-tight">{title}</p>
                <p className="text-xs text-black/70 font-medium leading-snug">{description}</p>
            </div>
        </div>
    );
}
