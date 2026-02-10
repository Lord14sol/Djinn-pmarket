'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform, useAnimationFrame, animate } from 'framer-motion';
import confetti from 'canvas-confetti';

interface PhysicsCardProps {
    username?: string;
    memberNumber?: number;
}

export default function PhysicsCardBubblegum({ username, memberNumber }: PhysicsCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isDragging, setIsDragging] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const autoRotate = useMotionValue(0);
    const floatY = useMotionValue(0);

    const springConfig = useMemo(() => ({
        stiffness: 80,
        damping: 15,
        mass: 0.8
    }), []);

    const mouseX = useSpring(x, springConfig);
    const mouseY = useSpring(y, springConfig);

    const rotateX = useTransform(mouseY, [-200, 200], [20, -20]);
    const rotateY = useTransform([mouseX, autoRotate], ([latestMouseX, latestAuto]: any) => {
        const manualRot = (latestMouseX / 150) * 180;
        return manualRot + latestAuto;
    });

    const glareX = useTransform(mouseX, [-200, 200], [100, 0]);
    const glareY = useTransform(mouseY, [-200, 200], [100, 0]);

    const textParallaxX = useTransform(mouseX, (v: number) => v * 0.05);
    const textParallaxY = useTransform(mouseY, (v: number) => v * 0.05);

    // 3D Parallax layers - different depths for true depth effect
    const parallaxDeepX = useTransform(mouseX, (v: number) => v * -0.03);   // Background layer (moves opposite)
    const parallaxDeepY = useTransform(mouseY, (v: number) => v * -0.03);
    const parallaxMidX = useTransform(mouseX, (v: number) => v * 0.08);     // Mid layer
    const parallaxMidY = useTransform(mouseY, (v: number) => v * 0.08);
    const parallaxFrontX = useTransform(mouseX, (v: number) => v * 0.15);   // Foreground (Djinn text - most movement)
    const parallaxFrontY = useTransform(mouseY, (v: number) => v * 0.15);

    // Glare moves OPPOSITE to drag for realism
    const glareParallaxX = useTransform(mouseX, (v: number) => v * -0.12);
    const glareParallaxY = useTransform(mouseY, (v: number) => v * -0.12);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(() => { });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // No mouse-move tilt — only drag moves the card
    const handleMouseMove = useCallback((_e: React.MouseEvent) => { }, []);
    const handleMouseLeaveContainer = useCallback(() => { }, []);

    const autoRotateOffset = useRef(0);

    const handleCardClick = useCallback(() => { }, []);

    const onDragStart = useCallback(() => {
        setIsDragging(true);
        // Save current auto rotation so we can resume from the right offset
        autoRotateOffset.current = autoRotate.get();
    }, [autoRotate]);

    const onDrag = useCallback((_event: any, info: any) => {
        x.set(info.offset.x * 2.5);
        y.set(info.offset.y);
    }, [x, y]);

    const onDragEnd = useCallback(() => {
        setIsDragging(false);
        animate(x, 0, { stiffness: 50, damping: 12, mass: 1 });
        animate(y, 0, { stiffness: 60, damping: 14, mass: 0.8 });
    }, [x, y, springConfig]);

    const cardY = useTransform([mouseY, floatY], ([my, fy]) => (my as number) + (fy as number));
    const frontOpacity = useTransform(rotateY, (v: number) => {
        const norm = ((v % 360) + 360) % 360;
        return (norm < 90 || norm > 270) ? 1 : 0;
    });
    const backOpacity = useTransform(rotateY, (v: number) => {
        const norm = ((v % 360) + 360) % 360;
        return (norm >= 90 && norm <= 270) ? 1 : 0;
    });

    const dynamicGlare = useTransform([glareX, glareY], ([gx, gy]) =>
        `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)`
    );
    const shimmerX = useTransform(mouseX, (v: number) => v * 0.4);
    const shimmerY = useTransform(mouseY, (v: number) => v * 0.4);
    const foilX = useTransform(mouseX, (v: number) => v * -0.15);
    const foilY = useTransform(mouseY, (v: number) => v * -0.15);

    const auroraGradient = `linear-gradient(90deg, #00FF87, #00FFAB, #00E5FF, #00FF87, #7B61FF, #00FFAB, #00E5FF, #00FF87, #7B61FF, #FF61DC, #00FF87)`;

    const specularX = useTransform(mouseX, [-200, 200], [-150, 150]);
    const specularY = useTransform(mouseY, [-200, 200], [-150, 150]);

    // Ultra-rare holographic intensity based on rotation angle
    // Peaks when card is at ~90deg or ~270deg (edge-on during flip)
    const holoIntensity = useTransform(rotateY, (v: number) => {
        const norm = ((v % 360) + 360) % 360;
        // Peak at 90 and 270 degrees (mid-flip)
        const dist90 = Math.abs(norm - 90);
        const dist270 = Math.abs(norm - 270);
        const minDist = Math.min(dist90, dist270);
        // Wider range - starts showing much earlier (120deg window instead of 60)
        return Math.max(0, 1 - minDist / 120);
    });

    const holoOpacity = useTransform(holoIntensity, [0, 1], [0, 0.7]);
    const holoFlashOpacity = useTransform(holoIntensity, [0, 0.5, 1], [0, 0, 0.5]);
    const holoBorderOpacity = useTransform(holoIntensity, [0, 1], [0.15, 0.8]);

    const lastTimeRef = useRef(0);

    useAnimationFrame((t) => {
        if (!isDragging) {
            floatY.set(Math.sin(t / 1500) * 6);
            // Slow continuous rotation ~1 full turn every 12 seconds
            if (lastTimeRef.current === 0) lastTimeRef.current = t;
            const elapsed = (t - lastTimeRef.current) / 1000;
            autoRotate.set(autoRotateOffset.current + elapsed * 30);
        } else {
            // Reset timer so when drag ends, we continue smoothly
            lastTimeRef.current = t;
        }
    });

    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);

    // Celebration on Mount - confetti bursts FROM the card position
    useEffect(() => {
        if (!isClient || !cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const cardCenterX = (rect.left + rect.width / 2) / window.innerWidth;
        const cardCenterY = (rect.top + rect.height / 2) / window.innerHeight;

        const defaults = { startVelocity: 55, ticks: 80, zIndex: 1000, origin: { x: cardCenterX, y: cardCenterY } };

        // Burst from card center in all directions
        confetti({ ...defaults, particleCount: 60, spread: 360, startVelocity: 40 });
        confetti({ ...defaults, particleCount: 40, spread: 160, angle: 270, startVelocity: 60 }); // upward burst

        // Follow-up burst
        const timer = setTimeout(() => {
            if (!cardRef.current) return;
            const r = cardRef.current.getBoundingClientRect();
            const cx = (r.left + r.width / 2) / window.innerWidth;
            const cy = (r.top + r.height / 2) / window.innerHeight;
            confetti({ ...defaults, origin: { x: cx, y: cy }, particleCount: 35, spread: 360, startVelocity: 30 });
        }, 250);

        return () => clearTimeout(timer);
    }, [isClient]);

    const displayNumber = memberNumber ? String(memberNumber).padStart(3, '0') : '001';

    if (!isClient) return null;

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeaveContainer}
            style={{ perspective: '1500px' }}
        >
            {/* SVG Filters only - no lanyard */}
            <svg className="absolute w-0 h-0">
                <defs>
                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
                        <feColorMatrix type="saturate" values="0" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.05" />
                        </feComponentTransfer>
                    </filter>
                </defs>
            </svg>

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
                    y: cardY,
                    transformStyle: 'preserve-3d'
                }}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
                className="relative w-[480px] h-[650px] cursor-grab active:cursor-grabbing z-20 will-change-transform"
            >
                {/* Card edge / thickness - silver chrome */}
                <div className="absolute -inset-[3px] rounded-[2.7rem] z-0"
                    style={{
                        background: 'linear-gradient(180deg, #d0d0d8 0%, #909098 30%, #b8b8c0 50%, #808088 70%, #c0c0c8 100%)',
                    }}
                />

                {/* ============ FRONT FACE ============ */}
                <motion.div
                    style={{
                        opacity: frontOpacity,
                        backfaceVisibility: 'hidden',
                        transformStyle: 'preserve-3d',
                        isolation: 'isolate',
                    }}
                    className="absolute inset-0 rounded-[2.5rem] overflow-hidden"
                >
                    {/* BASE: Chrome metallic */}
                    <div className="absolute inset-0 rounded-[2.5rem]" style={{
                        background: 'linear-gradient(165deg, #e8e8ec 0%, #ffffff 8%, #8a8a96 18%, #d8d8e0 26%, #3a3a42 35%, #f0f0f4 42%, #6e6e7a 50%, #ffffff 58%, #4a4a54 65%, #e0e0e8 72%, #2e2e36 80%, #f8f8fc 88%, #a0a0ac 95%)'
                    }} />
                    <div className="absolute inset-0 backdrop-blur-[40px] rounded-[2.5rem]" />

                    {/* LIQUID METAL REFLECTIONS */}
                    <div className="absolute inset-0 pointer-events-none rounded-[2.5rem]" style={{
                        background: 'linear-gradient(130deg, rgba(255,255,255,0.5) 0%, transparent 15%, rgba(255,255,255,0.3) 25%, transparent 35%, rgba(0,0,0,0.15) 45%, rgba(255,255,255,0.6) 55%, transparent 65%, rgba(0,0,0,0.1) 75%, rgba(255,255,255,0.4) 85%, transparent 100%)'
                    }} />

                    {/* FLUID IRIDESCENT BLOB */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none opacity-[0.08]"
                        style={{
                            background: 'radial-gradient(ellipse at 30% 40%, #FF69B4, transparent 60%), radial-gradient(ellipse at 70% 60%, #A855F7, transparent 60%), radial-gradient(ellipse at 50% 80%, #FF6B35, transparent 50%)',
                            filter: 'blur(60px)',
                            x: shimmerX,
                            y: shimmerY,
                            scale: 1.3,
                        }}
                    />

                    {/* HOLOGRAPHIC OVERLAY */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none mix-blend-screen z-25 rounded-[2.5rem]"
                        style={{
                            opacity: holoOpacity,
                            background: 'conic-gradient(from 0deg at 50% 50%, #ff0080, #ff8c00, #ffff00, #00ff88, #00ffff, #0088ff, #8800ff, #ff00ff, #ff0080)',
                        }}
                    />

                    {/* NOISE TEXTURE */}
                    <div className="absolute inset-0 pointer-events-none opacity-25 mix-blend-soft-light" style={{ filter: 'url(#noiseFilter)' }} />

                    {/* Inner border highlight */}
                    <div className="absolute inset-[1px] rounded-[2.4rem] border border-white/20 pointer-events-none" />

                    {/* ---- CONTENT ---- */}
                    <div className="relative z-10 flex flex-col items-center h-full p-8" style={{ transformStyle: 'preserve-3d' }}>

                        {/* 1. TOP DJINN LOGO (Higher up) */}
                        <motion.div
                            className="w-full flex justify-center mt-4 mb-4"
                            style={{
                                x: parallaxDeepX,
                                y: parallaxDeepY,
                                transform: 'translateZ(10px)'
                            }}
                        >
                            <Image
                                src="/djinn-logo.png"
                                alt="Djinn"
                                width={120}
                                height={120}
                                className="object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]"
                                priority
                            />
                        </motion.div>

                        {/* 2. CENTER X PROFILE PICTURE (Circular) */}
                        <div className="relative flex-1 flex items-center justify-center w-full" style={{ transformStyle: 'preserve-3d' }}>
                            <motion.div
                                className="relative w-48 h-48 rounded-full p-1 bg-gradient-to-br from-white to-gray-400 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                                style={{
                                    x: parallaxMidX,
                                    y: parallaxMidY,
                                    transform: 'translateZ(30px)'
                                }}
                            >
                                <div className="w-full h-full rounded-full overflow-hidden border-4 border-white/50 relative bg-black">
                                    {/* Mock X PFP - In real app use props */}
                                    <Image
                                        src="/pink-pfp.png"
                                        alt="X Profile"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                {/* Verified Badge */}
                                <div className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-200">
                                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-black"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                </div>
                            </motion.div>
                        </div>


                        {/* 3. BOTTOM INFO */}
                        <div className="w-full mt-auto space-y-4" style={{ transformStyle: 'preserve-3d' }}>

                            {/* X Handle (Front Center) */}
                            <motion.div
                                className="text-center"
                                style={{
                                    x: parallaxFrontX,
                                    y: parallaxFrontY,
                                    transform: 'translateZ(40px)'
                                }}
                            >
                                <div className="inline-flex items-center gap-2 bg-black/5 backdrop-blur-md px-4 py-2 rounded-full border border-black/10 shadow-lg">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                    <span className="text-lg font-black tracking-tight text-black">@DjinnUser</span>
                                </div>
                            </motion.div>

                            {/* Djinn Username + ID (Right aligned as requested) */}
                            <div className="flex items-center justify-between border-t border-black/10 pt-4 px-2">
                                <motion.div className="flex flex-col items-start">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Identity</span>
                                    <span className="text-xl font-black lowercase tracking-tight text-black" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                                        {username || 'agent'}
                                    </span>
                                </motion.div>

                                <motion.div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Joined</span>
                                    <span className="text-xl font-black tracking-widest text-black font-mono">
                                        #{displayNumber}
                                    </span>
                                </motion.div>
                            </div>
                        </div>

                    </div>

                    {/* Dynamic Glare */}
                    <motion.div
                        style={{ background: dynamicGlare }}
                        className="absolute inset-0 pointer-events-none mix-blend-overlay z-30 rounded-[2.5rem]"
                    />
                </motion.div>

                {/* ============ BACK FACE ============ */}
                <motion.div
                    style={{
                        opacity: backOpacity,
                        rotateY: 180,
                        backfaceVisibility: 'hidden',
                        transformStyle: 'preserve-3d',
                        isolation: 'isolate',
                    }}
                    className="absolute inset-0 rounded-[2.5rem] overflow-hidden"
                >
                    {/* BASE: Chrome metallic */}
                    <div className="absolute inset-0 rounded-[2.5rem]" style={{
                        background: 'linear-gradient(165deg, #e8e8ec 0%, #ffffff 8%, #8a8a96 18%, #d8d8e0 26%, #3a3a42 35%, #f0f0f4 42%, #6e6e7a 50%, #ffffff 58%, #4a4a54 65%, #e0e0e8 72%, #2e2e36 80%, #f8f8fc 88%, #a0a0ac 95%)'
                    }} />
                    <div className="absolute inset-0 backdrop-blur-[40px] rounded-[2.5rem]" />

                    {/* LIQUID METAL REFLECTIONS BACK */}
                    <div className="absolute inset-0 pointer-events-none rounded-[2.5rem]" style={{
                        background: 'linear-gradient(150deg, rgba(255,255,255,0.4) 0%, transparent 12%, rgba(0,0,0,0.15) 22%, rgba(255,255,255,0.5) 35%, transparent 45%, rgba(255,255,255,0.3) 55%, rgba(0,0,0,0.1) 65%, rgba(255,255,255,0.5) 78%, transparent 90%)'
                    }} />
                    <div className="absolute inset-0 pointer-events-none rounded-[2.5rem]" style={{
                        background: 'radial-gradient(ellipse at 65% 25%, rgba(255,255,255,0.5) 0%, transparent 35%), radial-gradient(ellipse at 35% 75%, rgba(255,255,255,0.3) 0%, transparent 30%)'
                    }} />

                    {/* IRIDESCENT SHIMMER */}
                    <motion.div
                        className="absolute inset-[-100%] pointer-events-none opacity-20 mix-blend-overlay"
                        style={{
                            background: 'linear-gradient(45deg, transparent 42%, rgba(255,255,255,0.9) 50%, transparent 58%)',
                            x: shimmerX,
                            y: shimmerY
                        }}
                    />

                    {/* HOLOGRAPHIC OVERLAY BACK - ultra rare shine during rotation */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none mix-blend-screen z-25 rounded-[2.5rem]"
                        style={{
                            opacity: holoOpacity,
                            background: 'conic-gradient(from 180deg at 50% 50%, #ff0080, #ff8c00, #ffff00, #00ff88, #00ffff, #0088ff, #8800ff, #ff00ff, #ff0080)',
                        }}
                    />
                    {/* Holographic white flash on back surface */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none z-26 rounded-[2.5rem]"
                        style={{
                            opacity: holoFlashOpacity,
                            background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)',
                        }}
                    />
                    {/* Rainbow sparkle bands across back */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none mix-blend-color-dodge z-26 rounded-[2.5rem] overflow-hidden"
                        style={{
                            opacity: holoOpacity,
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            inset: '-50%',
                            background: 'conic-gradient(from 135deg, transparent 0%, rgba(255,255,255,0.5) 3%, transparent 6%, transparent 12%, rgba(255,200,100,0.4) 15%, transparent 18%, transparent 24%, rgba(100,200,255,0.4) 27%, transparent 30%, transparent 36%, rgba(255,100,255,0.4) 39%, transparent 42%, transparent 48%, rgba(255,255,255,0.4) 51%, transparent 54%, transparent 60%, rgba(200,255,100,0.4) 63%, transparent 66%, transparent 72%, rgba(100,255,255,0.4) 75%, transparent 78%, transparent 84%, rgba(255,150,50,0.4) 87%, transparent 90%, transparent 100%)',
                        }} />
                    </motion.div>

                    {/* NOISE */}
                    <div className="absolute inset-0 pointer-events-none opacity-25 mix-blend-soft-light" style={{ filter: 'url(#noiseFilter)' }} />

                    {/* Inner border */}
                    <div className="absolute inset-[1px] rounded-[2.4rem] border border-white/20 pointer-events-none" />

                    {/* ---- CONTENT ---- */}
                    <div className="relative z-10 flex flex-col items-center h-full p-10 pt-12 text-center" style={{ transformStyle: 'preserve-3d' }}>

                        {/* STAR - Watermark stamp with parallax depth (sunk into card) */}
                        <motion.div
                            className="relative w-48 h-48 mb-6 mx-auto flex-shrink-0 opacity-[0.1]"
                            style={{
                                x: parallaxDeepX,
                                y: parallaxDeepY,
                                transform: 'translateZ(-20px)',
                                transformStyle: 'preserve-3d',
                            }}
                        >
                            <Image
                                src="/star-sniper-new.png"
                                alt=""
                                width={400}
                                height={293}
                                className="w-full h-full object-contain grayscale brightness-200"
                                unoptimized
                                priority
                            />
                        </motion.div>

                        {/* BRANDING - 3D Parallax multi-layer */}
                        <div className="flex flex-col items-center mt-6 mb-4 relative" style={{ transformStyle: 'preserve-3d' }}>
                            {/* Deep shadow */}
                            <motion.h2
                                className="text-5xl font-black tracking-[-0.04em] leading-[0.85] absolute"
                                style={{
                                    fontFamily: 'var(--font-adriane), serif',
                                    fontWeight: 700,
                                    color: 'rgba(0,0,0,0.1)',
                                    filter: 'blur(5px)',
                                    x: parallaxDeepX,
                                    y: parallaxDeepY,
                                    transform: 'translateZ(-10px)',
                                }}
                                aria-hidden="true"
                            >
                                Djinn
                            </motion.h2>
                            {/* Main text - floats forward */}
                            <motion.h2
                                className="text-5xl font-black tracking-[-0.04em] leading-[0.85] text-black/70 relative"
                                style={{
                                    fontFamily: 'var(--font-adriane), serif',
                                    fontWeight: 700,
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                                    x: parallaxFrontX,
                                    y: parallaxFrontY,
                                    transform: 'translateZ(20px)',
                                }}
                            >
                                Djinn
                            </motion.h2>
                        </div>

                        {/* MANIFESTO - spaced out to fill card, mid-depth parallax */}
                        <motion.div
                            className="flex flex-col gap-0 w-full max-w-[300px] flex-1"
                            style={{
                                x: parallaxMidX,
                                y: parallaxMidY,
                                transform: 'translateZ(10px)',
                                transformStyle: 'preserve-3d',
                            }}
                        >
                            <div className="flex flex-col items-center mb-3">
                                <span className="text-sm font-black uppercase tracking-tight text-black/70">Born to Trench</span>
                            </div>
                            <div className="flex flex-col items-center mb-5">
                                <span className="text-[11px] font-bold tracking-wider text-black/35" style={{ fontFamily: 'var(--font-unbounded), sans-serif' }}>WRLD IS A CASINO</span>
                            </div>

                            <div className="flex flex-col items-center mb-3 mx-auto">
                                <span
                                    className="text-base font-black tracking-wide leading-none text-black/60"
                                    style={{ fontFamily: 'var(--font-unbounded), sans-serif' }}
                                >
                                    i am a <span style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>Djinn</span>
                                </span>
                            </div>
                            <div className="flex flex-col items-center mb-5">
                                <span className="text-[10px] font-bold tracking-widest text-black/30" style={{ fontFamily: 'var(--font-unbounded), sans-serif' }}>I PREDICT THE FUTURE</span>
                            </div>

                            <div className="flex flex-col items-center mb-5">
                                <span
                                    className="text-[10px] font-black tracking-wider text-black/40"
                                    style={{ fontFamily: 'var(--font-unbounded), sans-serif' }}
                                >
                                    410,756,435,823 NEW PAIRS
                                </span>
                            </div>

                            <div className="flex-1" />

                            <div className="flex flex-col items-center pb-2" style={{ transform: 'translateZ(5px)' }}>
                                <motion.span
                                    className="text-[10px] font-black tracking-[0.25em] uppercase"
                                    style={{
                                        fontFamily: 'var(--font-unbounded), sans-serif',
                                        background: auroraGradient,
                                        backgroundSize: '200% auto',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        filter: 'drop-shadow(0 0 15px rgba(0,229,255,0.4))',
                                    }}
                                    animate={{ backgroundPosition: ['0% center', '200% center'] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                >
                                    Ape em all 2026 未来はあなたのもの
                                </motion.span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Chrome grid subtle */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.025] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

                    {/* SPECULAR HIGHLIGHT BACK */}
                    <motion.div
                        className="absolute inset-[-50%] pointer-events-none opacity-35 mix-blend-color-dodge z-30"
                        style={{
                            background: 'radial-gradient(circle at center, rgba(255,255,255,0.7) 0%, transparent 50%)',
                            x: specularX,
                            y: specularY,
                            filter: 'blur(50px)'
                        }}
                    />

                    {/* CHROME SHINE SWEEP BACK */}
                    <motion.div
                        className="absolute inset-x-[-150%] inset-y-0 pointer-events-none opacity-18 mix-blend-screen z-30"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, transparent 35%, rgba(255,255,255,0.7) 50%, transparent 65%, transparent 100%)',
                            skewX: -15
                        }}
                        animate={{ x: ['-100%', '250%'] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
                    />

                    {/* Dynamic Glare back */}
                    <motion.div
                        style={{ background: dynamicGlare }}
                        className="absolute inset-0 pointer-events-none mix-blend-overlay z-30 rounded-[2.5rem]"
                    />
                </motion.div>

                {/* Physical glass edge depth */}
                <div
                    className="absolute inset-0 rounded-[2.5rem] border border-white/15 pointer-events-none"
                    style={{ transform: 'translateZ(-2px)' }}
                />
            </motion.div>
        </div>
    );
}
