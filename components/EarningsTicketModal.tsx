import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Share2, Ticket } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSound } from './providers/SoundProvider';

interface EarningsTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number; // SOL Amount
    marketTitle: string;
    outcome: string;
    shares: number;
    onClaim: () => Promise<void>;
}

export default function EarningsTicketModal({ isOpen, onClose, amount, marketTitle, outcome, shares, onClaim }: EarningsTicketModalProps) {
    const { play } = useSound();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isClaimed, setIsClaimed] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            play('toggle');
        } else {
            document.body.style.overflow = 'unset';
            setIsClaimed(false); // Reset on close
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleClaim = async () => {
        setIsLoading(true);
        try {
            await onClaim();
            setIsClaimed(true);
            play('success');

            // Confetti
            const duration = 3000;
            const end = Date.now() + duration;
            const colors = ['#10B981', '#FFD600', '#F492B7'];

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors,
                    zIndex: 99999
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors,
                    zIndex: 99999
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isLoading && onClose()} />

            {/* Ticket Container */}
            <div className={`relative w-full max-w-sm transition-all duration-300 ${isClaimed ? 'scale-105' : 'scale-100'}`}>

                {/* Visual "Rip" Effect Top */}
                <div className="w-full h-4 bg-transparent relative z-10">
                    <div className="absolute bottom-0 w-full h-full bg-[radial-gradient(circle_at_bottom,transparent_6px,#FAFAFA_6px)] bg-[length:20px_20px] rotate-180" />
                </div>

                {/* Main Ticket Body */}
                <div className="bg-[#FAFAFA] w-full p-8 relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center">

                    {/* Punch Hole Left */}
                    <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-black" />
                    {/* Punch Hole Right */}
                    <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-black" />

                    {/* Content */}
                    <div className="w-full flex justify-between items-start mb-6 border-b-2 border-dashed border-gray-300 pb-6">
                        <div>
                            <h2 className="text-3xl font-black text-black uppercase tracking-tighter leading-none mb-1">
                                {isClaimed ? 'PAID OUT' : 'YOU WON'}
                            </h2>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {isClaimed ? 'FUNDS SENT TO WALLET' : 'CLAIM YOUR EARNINGS'}
                            </span>
                        </div>
                        <div className="w-12 h-12 bg-[#FFD600] border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_black]">
                            <Ticket size={24} className="text-black" />
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="mb-8 text-center">
                        <span className="text-6xl font-black text-black tracking-tighter block">
                            {amount.toFixed(2)}
                        </span>
                        <span className="text-xl font-bold text-emerald-500 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-lg">
                            SOL
                        </span>
                    </div>

                    {/* Details Receipt */}
                    <div className="w-full bg-white border-2 border-black rounded-xl p-4 mb-6 space-y-2 font-mono text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-400">MARKET</span>
                            <span className="text-black font-bold truncate max-w-[150px]">{marketTitle}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">OUTCOME</span>
                            <span className="text-black font-bold">{outcome}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">SHARES</span>
                            <span className="text-black font-bold">{shares.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    {!isClaimed ? (
                        <button
                            onClick={handleClaim}
                            disabled={isLoading}
                            className="w-full py-4 bg-black text-white font-black text-xl uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.2)] hover:bg-[#F492B7] hover:text-black hover:shadow-[6px_6px_0px_black] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border-2 border-transparent hover:border-black"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'CLAIM NOW'}
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-[#10B981] text-black font-black text-xl uppercase tracking-widest rounded-xl border-2 border-black shadow-[4px_4px_0px_black] hover:-translate-y-1 transition-all"
                        >
                            DONE
                        </button>
                    )}

                </div>

                {/* Visual "Rip" Effect Bottom */}
                <div className="w-full h-4 bg-transparent relative z-10">
                    <div className="absolute top-0 w-full h-full bg-[radial-gradient(circle_at_top,transparent_6px,#FAFAFA_6px)] bg-[length:20px_20px]" />
                </div>
            </div>
        </div>,
        document.body
    );
}
