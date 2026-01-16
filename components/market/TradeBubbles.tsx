'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Bubble {
    id: string;
    text: string;
    x: number;
    y: number;
}

export default function TradeBubbles({ trigger }: { trigger: { amount: number; side: 'YES' | 'NO' } | null }) {
    const [bubbles, setBubbles] = useState<Bubble[]>([]);

    const addBubble = useCallback((amount: number, side: 'YES' | 'NO') => {
        const id = Math.random().toString(36).substr(2, 9);
        const x = 20 + Math.random() * 60; // 20% to 80% width
        const y = 40 + Math.random() * 40; // 40% to 80% height

        const newBubble: Bubble = {
            id,
            text: `+ $${amount.toFixed(0)}`,
            x,
            y
        };

        setBubbles(prev => [...prev, newBubble]);
        setTimeout(() => {
            setBubbles(prev => prev.filter(b => b.id !== id));
        }, 2000);
    }, []);

    useEffect(() => {
        if (trigger) {
            addBubble(trigger.amount, trigger.side);
        }
    }, [trigger, addBubble]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            <AnimatePresence>
                {bubbles.map(bubble => (
                    <motion.div
                        key={bubble.id}
                        initial={{ opacity: 0, y: bubble.y, scale: 0.5 }}
                        animate={{ opacity: 1, y: bubble.y - 100, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute whitespace-nowrap px-3 py-1 bg-[#F492B7] text-black text-[10px] font-black rounded-full shadow-[0_0_20px_#F492B7]"
                        style={{ left: `${bubble.x}%`, top: `${bubble.y}%` }}
                    >
                        {bubble.text}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
