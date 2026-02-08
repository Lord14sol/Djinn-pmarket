'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform, useAnimationFrame, animate } from 'framer-motion';
import confetti from 'canvas-confetti';

interface PhysicsCardProps {
    username?: string;
}

export default function PhysicsCardBubblegum({ username }: PhysicsCardProps) {
    // 1. Refs
    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 2. States
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // 3. Raw Motion Values
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const autoRotate = useMotionValue(0);
    const floatY = useMotionValue(0);

    // Bouncy spring physics
    const springConfig = useMemo(() => ({
        stiffness: 120,
        damping: 20,
        mass: 0.5
    }), []);

    const mouseX = useSpring(x, springConfig);
    const mouseY = useSpring(y, springConfig);

    // 3D Tilt & Rotation Logic
    const rotateX = useTransform(mouseY, [-200, 200], [20, -20]);
    const rotateY = useTransform([mouseX, autoRotate], ([latestMouseX, latestAuto]: any) => {
        // High sensitivity: 150px drag = 180deg flip
        const manualRot = (latestMouseX / 150) * 180;
        return manualRot + latestAuto;
    });

    // Glare Position Logic
    const glareX = useTransform(mouseX, [-200, 200], [100, 0]);
    const glareY = useTransform(mouseY, [-200, 200], [100, 0]);

    // Magnetic Parallax Logic

    // Star Sniper 3D Parallax (like Pokemon card / SwiftUI style)
    const starParallaxX = useTransform(mouseX, (v: number) => v * 0.12);
    const starParallaxY = useTransform(mouseY, (v: number) => v * 0.12);

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

    // Interaction handlers
    const startLongPress = useCallback(() => {
        longPressTimeout.current = setTimeout(() => {
            setCanDrag(true);
        }, 500); // 500ms for long press
    }, []);

    const clearLongPress = useCallback(() => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
        }
        setCanDrag(false);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const mouseXPos = e.clientX - centerX;
        const mouseYPos = e.clientY - centerY;

        // Subtle tilt when just moving mouse
        x.set(mouseXPos * 0.4);
        y.set(mouseYPos * 0.4);
    }, [isDragging, x, y]);

    const handleMouseLeaveContainer = useCallback(() => {
        if (!isDragging) {
            x.set(0);
            y.set(0);
        }
    }, [isDragging, x, y]);

    const handleCardClick = useCallback(() => {
        if (!isDragging) {
            // Trigger 360 spin
            const currentAuto = autoRotate.get();
            animate(autoRotate, currentAuto + 360, {
                duration: 2.5,
                ease: "easeInOut"
            });
        }
    }, [isDragging, autoRotate]);

    const onDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const onDrag = useCallback((event: any, info: any) => {
        // High sensitivity for rotation during drag
        x.set(info.offset.x * 2.5);
        y.set(info.offset.y);
    }, [x, y]);

    const onDragEnd = useCallback(() => {
        setIsDragging(false);
        // Snap back to front smoothly
        animate(x, 0, {
            ...springConfig,
            stiffness: 80, // Slightly softer snap for rotation
            damping: 15
        });
        animate(y, 0, springConfig);
    }, [x, y, springConfig]);

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
            const cp1Y = startY + (endY - startY) * 0.45; // Increased weight
            const cp2X = endX - (latestX as number) * 0.2; // Reacts to X movement
            const cp2Y = endY - (endY - startY) * 0.15;

            return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
        }
    );

    // 4. Transform / Derived Hooks
    const cardY = useTransform([mouseY, floatY], ([my, fy]) => (my as number) + (fy as number));
    // Cyclic visibility logic: handle any degree value (360, 720, etc.)
    const frontOpacity = useTransform(rotateY, (v: number) => {
        const norm = ((v % 360) + 360) % 360;
        return (norm < 90 || norm > 270) ? 1 : 0;
    });
    const backOpacity = useTransform(rotateY, (v: number) => {
        const norm = ((v % 360) + 360) % 360;
        return (norm >= 90 && norm <= 270) ? 1 : 0;
    });

    // Logo Parallax Logic
    const logoRotateX = useTransform(mouseY, [-200, 200], [12, -12]);
    const logoRotateY = useTransform(mouseX, [-200, 200], [-12, 12]);
    const logoScale = useTransform(mouseY, [-200, 200], [1.08, 0.92]);

    const dynamicGlare = useTransform([glareX, glareY], ([gx, gy]) => `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.2) 0%, transparent 60%)`);
    const shimmerX = useTransform(mouseX, (v: number) => v * 0.4);
    const shimmerY = useTransform(mouseY, (v: number) => v * 0.4);
    const foilX = useTransform(mouseX, (v: number) => v * -0.15);
    const foilY = useTransform(mouseY, (v: number) => v * -0.15);

    // Reactive Glow Colors
    const glowColor = useTransform(
        [mouseX, mouseY],
        ([mx, my]) => {
            const angle = Math.atan2(my as number, mx as number) * (180 / Math.PI);
            return `hsl(${(angle + 360) % 360}, 70%, 60%)`;
        }
    );

    useAnimationFrame((t) => {
        if (!isDragging) {
            floatY.set(Math.sin(t / 1500) * 6);
        }
    });

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Celebration on Mount
    useEffect(() => {
        if (!isClient) return;
        const duration = 4 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 45, spread: 90, ticks: 100, zIndex: 1000 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            // Fire from the sides to surround the card
            confetti({
                ...defaults,
                particleCount: 20,
                origin: { x: 0, y: 0.5 },
                angle: 60
            });
            confetti({
                ...defaults,
                particleCount: 20,
                origin: { x: 1, y: 0.5 },
                angle: 120
            });

            // Subtle middle bursts
            if (Math.random() > 0.7) {
                confetti({
                    ...defaults,
                    particleCount: 30,
                    origin: { x: randomInRange(0.4, 0.6), y: 0.4 }
                });
            }
        }, 300);

        return () => clearInterval(interval);
    }, [isClient]);

    if (!isClient) return null;

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center overflow-visible"
            style={{ perspective: '1500px' }}
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

                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
                        <feColorMatrix type="saturate" values="0" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.05" />
                        </feComponentTransfer>
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


            {/* 🆕 GLOBAL PARALLAX BACKGROUND SCENE (Atras de la pagina) */}
            <motion.div
                style={{
                    x: useTransform(mouseX, (v: number) => v * -0.05),
                    y: useTransform(mouseY, (v: number) => v * -0.05),
                    opacity: 0.1,
                    scale: 1.4,
                }}
                className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
            >
                <img
                    src="/star-sniper-new.png?v=10"
                    alt=""
                    className="w-[800px] h-[800px] object-contain opacity-40 mix-blend-screen"
                />
            </motion.div>

            {/* AMBIENT GLOW BEHIND CARD */}
            <motion.div
                style={{
                    x: mouseX,
                    y: cardY,
                    scale: 1.1,
                    background: glowColor,
                    filter: 'blur(120px)',
                    opacity: 0.15,
                }}
                className="absolute w-[500px] h-[600px] rounded-full pointer-events-none z-0"
            />

            {/* THE CARD */}
            <motion.div
                ref={cardRef}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0}
                onClick={handleCardClick}
                onDragStart={onDragStart}
                onDrag={onDrag}
                onDragEnd={onDragEnd}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: 'preserve-3d'
                }}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                className="relative w-[442px] h-[576px] cursor-grab active:cursor-grabbing z-20 will-change-transform"
            >
                {/* FRONT FACE */}
                <motion.div
                    style={{
                        opacity: frontOpacity,
                        backfaceVisibility: 'hidden',
                        transformStyle: 'preserve-3d'
                    }}
                    className="absolute inset-0 bg-white/[0.03] backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden border border-white/10 rounded-[2.5rem]"
                >
                    {/* FLUID MOTION BACKGROUND LAYER */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none opacity-20"
                        style={{
                            background: `radial-gradient(circle at 50% 50%, #FF69B4, #7FFF9F, #FFB68F)`,
                            filter: 'blur(60px)',
                            x: shimmerX,
                            y: shimmerY,
                            scale: 1.5,
                        }}
                    />
                    {/* IRIDESCENT SHIMMER */}
                    <motion.div
                        className="absolute inset-x-[-100%] inset-y-[-100%] pointer-events-none opacity-20 mix-blend-overlay"
                        style={{
                            background: `linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)`,
                            x: shimmerX,
                            y: shimmerY,
                        }}
                    />

                    {/* NOISE OVERLAY */}
                    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-soft-light" style={{ filter: 'url(#noiseFilter)' }} />

                    {/* RAINBOW FOIL (Subtle) */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-screen"
                        style={{
                            background: `radial-gradient(circle at 50% 50%, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff)`,
                            filter: 'blur(80px)',
                            scale: 2,
                            x: foilX,
                            y: foilY,
                        }}
                    />

                    {/* Top Hole */}
                    <div className="relative z-20 w-24 h-2.5 bg-black/40 border border-white/5 rounded-full mx-auto mt-8 mb-6 shadow-inner pointer-events-none" />

                    {/* 🆕 ELITE 3D LOGO - Static Gray Watermark */}
                    <motion.div
                        className="absolute top-6 right-6 w-[180px] h-[180px] pointer-events-none z-10"
                        style={{
                            transformStyle: 'preserve-3d',
                            rotateX: logoRotateX,
                            rotateY: logoRotateY,
                            scale: logoScale,
                        }}
                    >
                        {/* Static Gray Watermark layers */}
                        <div className="absolute inset-0" style={{ transform: 'translateZ(-6px)' }}>
                            <Image
                                src="/djinn-logo.png"
                                alt=""
                                fill
                                className="object-contain opacity-[0.05] grayscale"
                                sizes="180px"
                            />
                        </div>

                        <div className="relative w-full h-full" style={{ transform: 'translateZ(0px)' }}>
                            <Image
                                src="/djinn-logo.png"
                                alt=""
                                fill
                                className="object-contain opacity-[0.05] grayscale brightness-150 contrast-100"
                                sizes="180px"
                                quality={100}
                                priority
                            />
                        </div>

                        <div className="absolute inset-0" style={{ transform: 'translateZ(8px)', opacity: 0.1 }}>
                            <Image
                                src="/djinn-logo.png"
                                alt=""
                                fill
                                className="object-contain grayscale brightness-200"
                                sizes="180px"
                            />
                        </div>
                    </motion.div>

                    {/* Content */}
                    <div className="p-10 flex flex-col h-full relative z-10">
                        {/* Top Left Branding */}
                        <div className="flex justify-start pt-2 pl-2 relative">
                            {/* 🆕 FLOATING COLORED LOGO NEXT TO TITLE */}
                            <motion.div
                                className="absolute -left-12 top-0 w-12 h-12 pointer-events-none z-20"
                                style={{
                                    transform: 'translateZ(20px)'
                                }}
                                animate={{
                                    y: [-2, 2, -2],
                                    rotate: [0, 5, 0]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Image
                                    src="/djinn-logo.png"
                                    alt="Djinn Logo"
                                    fill
                                    className="object-contain selection:bg-transparent brightness-125 contrast-125 hover:brightness-150 transition-all"
                                    priority
                                />
                            </motion.div>

                            <motion.h1
                                className="text-6xl font-black tracking-tighter"
                                style={{
                                    fontFamily: 'var(--font-adriane), serif',
                                    fontWeight: 700,
                                    color: '#fff'
                                }}
                                animate={{
                                    color: ['#ffffff', '#f0f0f0', '#b8b8b8', '#ffffff', '#dcdcdc', '#ffffff']
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                            >
                                Djinn
                            </motion.h1>
                        </div>

                        {/* Identity Centered Below (User and ID on same line, shifted up) */}
                        <div className="flex-1 flex flex-col justify-center mb-24">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-baseline gap-4">
                                    <motion.span
                                        className="text-6xl font-bold tracking-tight lowercase text-white"
                                        style={{
                                            fontFamily: 'var(--font-adriane), serif',
                                        }}
                                    >
                                        @{username || 'agent'}
                                    </motion.span>
                                    <motion.span
                                        className="text-2xl font-mono text-[#FF69B4] tracking-[0.2em] font-black opacity-80"
                                        style={{
                                            opacity: 0.8
                                        }}
                                    >
                                        #084
                                    </motion.span>
                                </div>

                                <div className="h-0.5 w-3/4 bg-gradient-to-r from-[#FF69B4]/50 via-[#FF69B4]/20 to-transparent" />
                            </div>
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
                            background: dynamicGlare
                        }}
                        className="absolute inset-0 pointer-events-none mix-blend-overlay z-30"
                    />
                </motion.div>

                {/* BACK FACE (Elite Full Chrome - Darker base for transparency) */}
                <motion.div
                    style={{
                        opacity: backOpacity,
                        rotateY: 180,
                        backfaceVisibility: 'hidden',
                        transformStyle: 'preserve-3d'
                    }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden border border-white/20 rounded-[2.5rem] flex flex-col items-center justify-start p-10 pt-16 text-center"
                >
                    {/* CHROME / MIRROR EFFECT OVERLAY */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 pointer-events-none" />
                    {/* 1. HOLOGRAPHIC FOIL LAYER (Pokemon Style IRIDESCENCE) */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none z-10 opacity-[0.25] mix-blend-color-dodge"
                        style={{
                            background: `linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.7) 50%, transparent 80%)`,
                            x: shimmerX,
                            y: shimmerY,
                            filter: 'blur(20px)',
                        }}
                    />
                    <motion.div
                        className="absolute inset-0 pointer-events-none z-10 opacity-[0.15] mix-blend-screen"
                        style={{
                            background: `radial-gradient(circle at 50% 50%, #ff00ff, #00ffff, #ffff00)`,
                            scale: 2,
                            x: foilX,
                            y: foilY,
                            filter: 'blur(100px)',
                        }}
                    />

                    {/* 3. SIMPLIFIED CHARACTER ASSET (NEW FIXED BACKGROUND) */}
                    <div className="relative w-80 h-80 mb-6 mt-2 z-20">
                        <img
                            src="/star-sniper-new.png?v=10"
                            alt="Star Sniper New"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* 4. CONTENT / TEXT (Simplified) */}
                    <div className="flex flex-col items-center gap-1 mb-6">
                        <motion.h2
                            className="text-4xl font-black tracking-[0.4em] uppercase"
                            style={{
                                fontFamily: 'var(--font-adriane), serif',
                                textShadow: '0 0 25px rgba(255,255,255,0.4)'
                            }}
                            animate={{
                                color: ['#FF69B4', '#fff', '#FF69B4']
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        >
                            Early Pass
                        </motion.h2>
                    </div>

                    <div className="flex flex-col gap-1 w-full max-w-[280px]">
                        <div className="flex flex-col items-center gap-0">
                            <span className="text-[13px] font-black text-white/90 uppercase tracking-tighter">Born to Trench</span>
                            <span className="text-[11px] font-bold text-white/70 uppercase tracking-tight">World is a Casino</span>
                        </div>

                        <div className="flex flex-col items-center gap-0 mt-2 relative">
                            {/* Decorative Flanking Logo Icons */}
                            <motion.div
                                className="absolute -left-12 top-1/2 -translate-y-1/2 w-10 h-10 z-50 pointer-events-none drop-shadow-lg"
                                style={{ transform: 'translateZ(10px)' }}
                                animate={{
                                    y: [-4, 4, -4],
                                    rotate: [-10, 10, -10]
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <img src="/djinn-logo.png" alt="" className="w-full h-full object-contain brightness-125" />
                            </motion.div>

                            <span className="text-[18px] font-black text-[#FF69B4] uppercase tracking-[-0.05em]" style={{ textShadow: '0 0 20px rgba(255,105,180,0.5)' }}>I AM A DJINN</span>
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">I predict the future</span>

                            <motion.div
                                className="absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-10 z-50 pointer-events-none drop-shadow-lg"
                                style={{ transform: 'translateZ(10px)' }}
                                animate={{
                                    y: [4, -4, 4],
                                    rotate: [10, -10, 10]
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            >
                                <img src="/djinn-logo.png" alt="" className="w-full h-full object-contain brightness-125" />
                            </motion.div>
                        </div>

                        <div className="w-full h-[1px] bg-white/10 my-2" />

                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] font-mono text-white/40 tracking-wider">410,757,864,530 NEW PAIRS</span>
                            <span className="text-[10px] font-bold text-white/60">Ape em all 2026 未来はあなたのもの</span>
                        </div>
                    </div>

                    {/* Scanline / Grid effect for back */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:24px_24px]" />
                </motion.div>

                {/* Depth layers (Central Spine) */}
                <div
                    className="absolute inset-0 bg-[#FF69B4]/10 border border-[#FF69B4]/20 rounded-[2.5rem] pointer-events-none"
                    style={{ transform: 'translateZ(-2px)' }}
                />
            </motion.div>
        </div>
    );
}
