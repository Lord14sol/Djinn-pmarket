import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface PrizePoolCounterProps {
    totalSol: number;
}

export const PrizePoolCounter = ({ totalSol }: PrizePoolCounterProps) => {
    // Determine Spark Level
    const intensity = useMemo(() => {
        if (totalSol >= 1000) return 3; // Explosion
        if (totalSol >= 100) return 2;  // Intermittent
        if (totalSol >= 10) return 1;   // Subtle
        return 0; // None
    }, [totalSol]);

    const formattedPool = totalSol.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    return (
        <div className="relative flex flex-col items-center justify-center p-6 bg-black/40 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] overflow-hidden">

            {/* Background Glow - Subtle */}
            <div className={`absolute inset-0 bg-white opacity-[0.02] ${intensity >= 2 ? 'animate-pulse' : ''}`} />

            <span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 z-10">
                Total Pool
            </span>

            <div className="relative z-10 flex items-baseline gap-2">
                <motion.span
                    className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#34D399] italic transform -skew-x-12"
                    animate={intensity >= 3 ? {
                        textShadow: ["0 0 10px #10B981", "0 0 20px #10B981", "0 0 10px #10B981"],
                        scale: [1, 1.02, 1]
                    } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                >
                    {formattedPool} SOL
                </motion.span>

                {/* Level 1 & 2 Sparks (CSS/SVG) would go here, simulating simple particles */}
            </div>

            {/* Particle System (Simplified for React) */}
            {intensity >= 2 && (
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white/30 rounded-full"
                            initial={{ x: "50%", y: "50%", opacity: 1 }}
                            animate={{
                                x: `${Math.random() * 200 - 100}%`,
                                y: `${Math.random() * 200 - 100}%`,
                                opacity: 0
                            }}
                            transition={{
                                duration: Math.random() * 2 + 1,
                                repeat: Infinity,
                                ease: "easeOut"
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
