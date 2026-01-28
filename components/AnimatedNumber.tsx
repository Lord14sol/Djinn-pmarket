'use client';

import { useSpring, useMotionValue } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface AnimatedNumberProps {
    value: number;
    className?: string; // e.g. "text-4xl font-bold"
    decimals?: number;
    prefix?: string;
    suffix?: string;
}

export const AnimatedNumber = ({
    value,
    className = '',
    decimals = 2,
    prefix = '',
    suffix = ''
}: AnimatedNumberProps) => {
    // 1. Internal Motion State
    const motionValue = useMotionValue(value);
    const springValue = useSpring(motionValue, {
        stiffness: 75,
        damping: 15,
        mass: 0.5
    });

    // 2. Direct DOM Manipulation Ref (Avoids React Re-renders)
    const ref = useRef<HTMLSpanElement>(null);

    // 3. Update target value when prop changes
    useEffect(() => {
        motionValue.set(value);
    }, [value, motionValue]);

    // 4. Subscribe to Spring changes and update textContent directly
    useEffect(() => {
        const unsubscribe = springValue.on("change", (latest) => {
            if (ref.current) {
                // Formatting logic
                const formatted = latest.toLocaleString('en-US', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                });
                // Imperative DOM update
                ref.current.textContent = `${prefix}${formatted}${suffix}`;
            }
        });
        return () => unsubscribe();
    }, [springValue, decimals, prefix, suffix]);

    // 5. Initial Render (SSR Safe)
    // We render the static value first to avoid hydration mismatch, then animation takes over
    const initialDisplay = `${prefix}${value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}${suffix}`;

    return (
        <span ref={ref} className={className}>
            {initialDisplay}
        </span>
    );
};
