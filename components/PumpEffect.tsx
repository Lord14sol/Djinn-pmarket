'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PumpEffectProps {
  children: React.ReactNode;
  isActive: boolean;
  duration?: number; // milliseconds, default 10s
}

interface Particle {
  id: string;
  x: number;
  y: number;
  delay: number;
}

export default function PumpEffect({
  children,
  isActive,
  duration = 10000
}: PumpEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showGlow, setShowGlow] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      // Generate 12 pink particles at random positions
      const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
        id: `particle-${i}-${Date.now()}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5
      }));

      setParticles(newParticles);
      setShowGlow(true);

      const timer = setTimeout(() => {
        setShowGlow(false);
        setParticles([]);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  return (
    <motion.div
      className="relative h-full"
      initial={isActive ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1], // Bounce easing
        delay: 0.1
      }}
    >
      {/* Glowing Pink Border */}
      {showGlow && (
        <motion.div
          className="absolute -inset-[2px] rounded-[2rem] bg-gradient-to-r from-[#F492B7] via-[#FF007A] to-[#F492B7] -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.7, 1, 0] }}
          transition={{
            duration: duration / 1000,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Pink Particles */}
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 bg-[#F492B7] rounded-full pointer-events-none"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              boxShadow: '0 0 10px #F492B7'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.5, 1, 0],
              opacity: [0, 1, 1, 0],
              y: [0, -20, -40, -60],
              x: [0, (Math.random() - 0.5) * 30]
            }}
            transition={{
              duration: 2,
              delay: particle.delay,
              ease: "easeOut"
            }}
          />
        ))}
      </AnimatePresence>

      {children}
    </motion.div>
  );
}
