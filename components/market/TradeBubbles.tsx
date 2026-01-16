'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Bubble {
    id: string;
    text: string;
    // Styling/Positioning logic handled by flex stack now
}

export default function TradeBubbles({ trigger }: { trigger: { amount: number; side: 'YES' | 'NO' } | null }) {
    const [bubbles, setBubbles] = useState<Bubble[]>([]);

    const addBubble = useCallback((amount: number, side: 'YES' | 'NO') => {
        const id = Math.random().toString(36).substr(2, 9);

        const newBubble: Bubble = {
            id,
            // Format as USD currency
            text: `+ $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        };

        setBubbles(prev => [newBubble, ...prev].slice(0, 5)); // Keep max 5, add to TOP
        setTimeout(() => {
            setBubbles(prev => prev.filter(b => b.id !== id));
        }, 4000); // 4s Fade Out
    }, []);

    useEffect(() => {
        if (trigger && trigger.amount > 0) {
            addBubble(trigger.amount, trigger.side);
        }
    }, [trigger, addBubble]);

    return (
        <div className="absolute top-4 left-6 z-20 flex flex-col gap-2 pointer-events-none">
            <AnimatePresence mode='popLayout'>
                {bubbles.map(bubble => (
                    <motion.div
                        key={bubble.id}
                        initial={{ opacity: 0, y: 20, scale: 0.8, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                        transition={{ duration: 0.4, ease: "backOut" }}
                        className="
                            px-4 py-2 
                            bg-[rgba(255,50,150,0.25)] 
                            border border-[#FF007A]/40
                            text-white text-sm font-bold
                            rounded-lg shadow-[0_0_15px_rgba(255,0,122,0.2)]
                            backdrop-blur-md
                            flex items-center gap-2
                        "
                    >
                        <span className="text-[#FF007A] drop-shadow-sm">Buy</span>
                        <span>{bubble.text}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
