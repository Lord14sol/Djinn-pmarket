'use client';

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';

type SoundVariant = 'success' | 'error' | 'click' | 'toggle' | 'shimmer' | 'fireworks';

interface SoundContextType {
    play: (variant: SoundVariant) => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

export function useSound() {
    const context = useContext(SoundContext);
    if (!context) throw new Error('useSound must be used within SoundProvider');
    return context;
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const initAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    // Also try to unlock on mount with a global listener for the first interaction
    useEffect(() => {
        const unlock = () => {
            initAudioCtx();
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('keydown', unlock);
        return () => {
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
        };
    }, [initAudioCtx]);

    const play = useCallback((variant: SoundVariant) => {
        initAudioCtx();
        if (!audioCtxRef.current) return;

        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.4, now); // Increased from 0.2
        masterGain.connect(ctx.destination);

        if (variant === 'click') {
            // Sharper, more audible mechanical click
            const osc = ctx.createOscillator();
            const g = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1600, now); // Higher frequency for a crisper click
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

            g.gain.setValueAtTime(0.5, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(g);
            g.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.05);

            // Add a bit of snap with noise
            const bufferSize = ctx.sampleRate * 0.02;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.1, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

            noise.connect(noiseGain);
            noiseGain.connect(masterGain);
            noise.start(now);
            noise.stop(now + 0.03); // Slightly longer for more "snap"
        }

        else if (variant === 'success') {
            // High pitch, clean chime (harmonic series)
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const g = ctx.createGain();

            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(880, now); // A5
            osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.1); // E6

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1760, now); // A6

            osc1.connect(g);
            osc2.connect(g);
            g.connect(masterGain);

            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.3, now + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.5);
            osc2.stop(now + 0.5);
        }

        else if (variant === 'error') {
            // Low thud / dull sound
            const osc = ctx.createOscillator();
            const g = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

            osc.connect(g);
            g.connect(masterGain);

            g.gain.setValueAtTime(0.5, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.3);
        }

        else if (variant === 'toggle') {
            // Subtle sine blip
            const osc = ctx.createOscillator();
            const g = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);

            osc.connect(g);
            g.connect(masterGain);

            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.2, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.start(now);
            osc.stop(now + 0.1);
        }

        else if (variant === 'fireworks') {
            // Complex celebratory sound: White noise burst + high resonant pings
            const bufferSize = ctx.sampleRate * 2; // 2 seconds
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.5));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            noise.connect(noiseGain);
            noiseGain.connect(masterGain);
            noise.start(now);

            // Resonant Pings
            for (let j = 0; j < 5; j++) {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(800 + Math.random() * 2000, now + j * 0.1);
                g.gain.setValueAtTime(0, now + j * 0.1);
                g.gain.linearRampToValueAtTime(0.2, now + j * 0.1 + 0.05);
                g.gain.exponentialRampToValueAtTime(0.001, now + j * 0.1 + 0.4);
                o.connect(g);
                g.connect(masterGain);
                o.start(now + j * 0.1);
                o.stop(now + j * 0.1 + 0.4);
            }
        }
    }, [initAudioCtx]);

    return (
        <SoundContext.Provider value={{ play }}>
            {children}
        </SoundContext.Provider>
    );
}
