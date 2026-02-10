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
                <div className="px-6 pb-4 space-y-4">
                    <RuleItem
                        emoji="🔍"
                        title="Literal Search"
                        description="The oracle looks for the EXACT phrase. 'Crypto' is not 'Cripto'. Make sure your keyword is precise."
                    />
                    <RuleItem
                        emoji="🔄"
                        title="Data Source"
                        description="We use the official endpoint. Only original tweets from the target user count. Retweets are ignored."
                    />
                    <RuleItem
                        emoji="👻"
                        title="Anti-Ghosting Protocol"
                        description="If the source is deleted BEFORE the resolution condition is met, the market resolves to NO. If deleted AFTER resolution, the result stands."
                    />
                    <RuleItem
                        emoji="⏳"
                        title="7-Day Limit"
                        description="Twitter markets obey the API's memory horizon. You can only bet on events happening within the next 7 days."
                    />
                    <RuleItem
                        emoji="⚡️"
                        title="Instant Resolution"
                        description="The moment the condition is met (Likes/Keyword), the market resolves YES immediately. No waiting for the deadline."
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

function RuleItem({ emoji, title, description }: { emoji: string; title: string; description: string }) {
    return (
        <div className="flex gap-4 items-start group">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-transform">
                <span className="text-xl">{emoji}</span>
            </div>
            <div>
                <p className="font-black text-base text-black uppercase tracking-tight leading-tight mb-1">{title}</p>
                <p className="text-sm text-black/80 font-medium leading-snug">{description}</p>
            </div>
        </div>
    );
}
