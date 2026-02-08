import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveTicker({
    value,
    prefix = '$',
    decimals = 2
}: {
    value: number;
    prefix?: string;
    decimals?: number;
}) {
    const prevValue = useRef(value);
    const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');

    useEffect(() => {
        if (value > prevValue.current) {
            setTrend('up');
        } else if (value < prevValue.current) {
            setTrend('down');
        }

        const timeout = setTimeout(() => setTrend('neutral'), 1000); // 1s flash
        prevValue.current = value;
        return () => clearTimeout(timeout);
    }, [value]);

    const colorClass = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-white';

    // Split integer and decimal for better styling if needed
    const formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    return (
        <div className="flex items-center">
            <span className="text-gray-400 mr-0.5 font-sans">{prefix}</span>
            <span className={`font-mono font-bold transition-colors duration-300 ${colorClass}`}>
                {formatted}
            </span>
            {trend === 'up' && (
                <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="ml-1 text-[10px] text-green-500"
                >
                    ▲
                </motion.span>
            )}
            {trend === 'down' && (
                <motion.span
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="ml-1 text-[10px] text-red-500"
                >
                    ▼
                </motion.span>
            )}
        </div>
    );
}
