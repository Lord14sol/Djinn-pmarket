'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform, useAnimationFrame } from 'framer-motion';
import confetti from 'canvas-confetti';

interface PhysicsCardProps {
    username?: string;
}

export default function PhysicsCardBubblegum({ username }: PhysicsCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Subtle floating
    const floatY = useMotionValue(0);
    useAnimationFrame((t) => {
        floatY.set(Math.sin(t / 1500) * 6);
    });

    // Mouse/Drag Position
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Bouncy spring physics
    const springConfig = useMemo(() => ({
        stiffness: 120,
        damping: 20,
        mass: 0.5
    }), []);

    const mouseX = useSpring(x, springConfig);
    const mouseY = useSpring(y, springConfig);

    // 3D Tilt Logic
    const rotateX = useTransform(mouseY, [-200, 200], [8, -8]);
    const rotateY = useTransform(mouseX, [-200, 200], [-8, 8]);

    // Glare Position Logic
    const glareX = useTransform(mouseX, [-200, 200], [100, 0]);
    const glareY = useTransform(mouseY, [-200, 200], [100, 0]);

    // Measure container size
    useEffect(() => {
        if (!containerRef.current) return;

        const updateSize = () => {
            if (containerRef.current) {
                const { offsetWidth, offsetHeight } = containerRef.current;
                setContainerSize({ width: offsetWidth, height: offsetHeight });
            }
        };

        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    // Drag handlers
    const onDragStart = useCallback(() => setIsDragging(true), []);

    const onDrag = useCallback((event: any, info: any) => {
        x.set(info.offset.x);
        y.set(info.offset.y);
    }, [x, y]);

    const onDragEnd = useCallback(() => {
        setIsDragging(false);
        x.set(0);
        y.set(0);
    }, [x, y]);

    // Lanyard Path
    const lanyardPath = useTransform(
        [mouseX, mouseY],
        ([latestX, latestY]) => {
            if (!containerSize.width || !containerSize.height) return '';

            const startX = containerSize.width / 2;
            const startY = 0;

            const endX = (containerSize.width / 2) + (latestX as number);
            const endY = (containerSize.height / 2) - 180 + (latestY as number);

            const cp1X = startX;
            const cp1Y = startY + (endY - startY) * 0.35;
            const cp2X = endX;
            const cp2Y = endY - (endY - startY) * 0.25;

            return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
        }
    );

    // State
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Celebration on Mount
    useEffect(() => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center overflow-visible"
            style={{ perspective: '1200px' }}
        >
            {/* LANYARD */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    <linearGradient id="lanyardAnimated" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%">
                            <animate
                                attributeName="stop-color"
                                values="#FF69B4;#00FF41;#FF6B35;#FF69B4"
                                dur="6s"
                                repeatCount="indefinite"
                            />
                        </stop>
                        <stop offset="50%">
                            <animate
                                attributeName="stop-color"
                                values="#FFB6D9;#7FFF9F;#FFB68F;#FFB6D9"
                                dur="6s"
                                repeatCount="indefinite"
                            />
                        </stop>
                        <stop offset="100%">
                            <animate
                                attributeName="stop-color"
                                values="#FF69B4;#00FF41;#FF6B35;#FF69B4"
                                dur="6s"
                                repeatCount="indefinite"
                            />
                        </stop>
                    </linearGradient>

                    <filter id="subtleGlow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <motion.path
                    d={lanyardPath}
                    fill="none"
                    stroke="url(#lanyardAnimated)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    filter="url(#subtleGlow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.8 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            </svg>

            {/* THE CARD */}
            <motion.div
                ref={cardRef}
                drag
                dragConstraints={{
                    left: -Math.min(300, containerSize.width * 0.4),
                    right: Math.min(300, containerSize.width * 0.4),
                    top: -Math.min(180, containerSize.height * 0.3),
                    bottom: Math.min(420, containerSize.height * 0.6)
                }}
                dragElastic={0.15}
                dragTransition={{ bounceStiffness: 250, bounceDamping: 20 }}
                onDragStart={onDragStart}
                onDrag={onDrag}
                onDragEnd={onDragEnd}
                style={{
                    x: mouseX,
                    y: useTransform([mouseY, floatY], ([my, fy]) => (my as number) + (fy as number)),
                    rotateX,
                    rotateY,
                    transformStyle: 'preserve-3d'
                }}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                className="relative w-[384px] h-[576px] cursor-grab active:cursor-grabbing z-20 will-change-transform"
            >
                {/* CARD CONTAINER - PREMIUM GLASS BASE */}
                <div
                    className="absolute inset-0 bg-white/[0.03] backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden border border-white/10 rounded-[2.5rem]"
                    style={{
                        maskImage: 'radial-gradient(circle at 192px 40px, transparent 15px, white 16px)',
                        WebkitMaskImage: 'radial-gradient(circle at 192px 40px, transparent 15px, white 16px)'
                    }}
                >

                    {/* IRIDESCENT SHIMMER */}
                    <motion.div
                        className="absolute inset-x-[-100%] inset-y-[-100%] pointer-events-none opacity-20 mix-blend-overlay"
                        style={{
                            background: `linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)`,
                            x: useTransform(mouseX, (v) => v * 0.3),
                            y: useTransform(mouseY, (v) => v * 0.3),
                        }}
                    />

                    {/* RAINBOW FOIL (Subtle) */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-screen"
                        style={{
                            background: `radial-gradient(circle at 50% 50%, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff)`,
                            filter: 'blur(80px)',
                            scale: 2,
                            x: useTransform(mouseX, (v) => v * -0.1),
                            y: useTransform(mouseY, (v) => v * -0.1),
                        }}
                    />

                    {/* Top Hole */}
                    <div className="relative z-20 w-24 h-2.5 bg-black/40 border border-white/5 rounded-full mx-auto mt-8 mb-6 shadow-inner pointer-events-none" />

                    {/* WATERMARK - Top Right Corner (Larger) */}
                    <div className="absolute top-10 right-10 w-28 h-28 opacity-15 pointer-events-none z-10">
                        <div className="relative w-full h-full">
                            <Image
                                src="/djinn-logo.png"
                                alt=""
                                fill
                                className="object-contain grayscale brightness-200"
                                sizes="112px"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-10 flex flex-col h-full relative z-10">

                        {/* Top Right Branding (Larger) */}
                        <div className="flex justify-end pt-2 pr-4">
                            <motion.h1
                                className="text-6xl font-black tracking-tighter"
                                style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}
                                animate={{
                                    color: ['#FF69B4', '#fff', '#FF69B4']
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            >
                                Djinn
                            </motion.h1>
                        </div>

                        {/* Middle Identity Area */}
                        <div className="flex-1 flex flex-col justify-center gap-12">
                            <div className="flex items-center gap-6">
                                <span
                                    className="text-5xl font-bold tracking-tight lowercase text-white"
                                    style={{ fontFamily: 'var(--font-adriane), serif' }}
                                >
                                    @{username || 'agent'}
                                </span>

                                <div className="h-10 w-[1px] bg-white/20" />

                                <span
                                    className="text-2xl font-mono text-white/30 tracking-widest"
                                >
                                    #084
                                </span>
                            </div>
                        </div>

                        {/* Bottom Status (Reduced to simple indicator) */}
                        <div className="pb-10 flex justify-center">
                            <div className="w-2 h-2 rounded-full bg-[#00FF41] shadow-[0_0_12px_#00FF41] animate-pulse" />
                        </div>
                    </div>

                    {/* CRYSTAL CHROME SHINE */}
                    <motion.div
                        className="absolute inset-x-[-150%] inset-y-0 pointer-events-none opacity-40 mix-blend-color-dodge z-30"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 70%, transparent 100%)',
                            skewX: -20
                        }}
                        animate={{
                            x: ['-100%', '200%']
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                            repeatDelay: 2
                        }}
                    />

                    {/* Dynamic Glare */}
                    <motion.div
                        style={{
                            background: useTransform(
                                [glareX, glareY],
                                ([gx, gy]) => `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)`
                            )
                        }}
                        className="absolute inset-0 pointer-events-none mix-blend-overlay z-30"
                    />
                </div>

                {/* Depth layers */}
                <div
                    className="absolute inset-0 bg-white/5 border border-white/5 rounded-[2.5rem] pointer-events-none"
                    style={{ transform: 'translateZ(-12px)' }}
                />
            </motion.div>

        </div>
    );
}
