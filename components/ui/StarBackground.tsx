'use client';

import React, { useMemo } from 'react';

const StarBackground = () => {
    // Generate Abundant Sparkles (high count to ensure constant activity)
    const stars = useMemo(() => {
        return Array.from({ length: 150 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: Math.random() * 8 + 4, // 4px - 12px
            // Randomize delay heavily so they pop in unexpectedly
            delay: `${Math.random() * 15}s`, // Longer delay spread for slower pacing
            // Duration defines how long they "live". Slower = 6s to 12s
            duration: `${Math.random() * 6 + 6}s`,
            // Random drift direction (Slower drift)
            moveX: (Math.random() - 0.5) * 30,
            moveY: (Math.random() - 0.5) * 30,
        }));
    }, []);

    const pinkStars = useMemo(() => {
        return Array.from({ length: 16 }).map((_, i) => ({ // Increased count slightly
            id: `pink-${i}`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: Math.random() * 10 + 6,
            delay: `${Math.random() * 20}s`,
            duration: `${Math.random() * 8 + 6}s`, // Even slower for pink ones
            moveX: (Math.random() - 0.5) * 40,
            moveY: (Math.random() - 0.5) * 40,
        }));
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden h-screen w-screen bg-black">
            <style jsx>{`
                @keyframes sparkle {
                    0% { 
                        opacity: 0; 
                        transform: scale(0.5) translate(0, 0) rotate(0deg); 
                    }
                    50% { 
                        opacity: var(--max-opacity); 
                        transform: scale(1) translate(var(--move-x), var(--move-y)) rotate(180deg); 
                    }
                    100% { 
                        opacity: 0; 
                        transform: scale(1.3) translate(var(--move-x), var(--move-y)) rotate(360deg); 
                    }
                }
                .animate-sparkle {
                    animation-name: sparkle;
                    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); /* Ultra smooth sine */
                    animation-iteration-count: infinite;
                }
            `}</style>

            {/* White Sparkles */}
            {stars.map((star) => (
                <div
                    key={star.id}
                    className="absolute animate-sparkle"
                    style={{
                        left: star.left,
                        top: star.top,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        '--max-opacity': 0.6, // Semi-transparent as requested
                        '--move-x': `${star.moveX}px`,
                        '--move-y': `${star.moveY}px`,
                        animationDelay: star.delay,
                        animationDuration: star.duration,
                    } as React.CSSProperties}
                >
                    <svg viewBox="0 0 24 24" fill="white" className="w-full h-full drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]">
                        <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
                    </svg>
                </div>
            ))}

            {/* Pink Sparkles (Rarer) */}
            {pinkStars.map((star) => (
                <div
                    key={star.id}
                    className="absolute animate-sparkle"
                    style={{
                        left: star.left,
                        top: star.top,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        '--max-opacity': 0.8,
                        '--move-x': `${star.moveX}px`,
                        '--move-y': `${star.moveY}px`,
                        animationDelay: star.delay,
                        animationDuration: star.duration,
                    } as React.CSSProperties}
                >
                    <svg viewBox="0 0 24 24" fill="#F492B7" className="w-full h-full drop-shadow-[0_0_8px_rgba(244,146,183,0.8)]">
                        <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
                    </svg>
                </div>
            ))}
        </div>
    );
};

export default StarBackground;
