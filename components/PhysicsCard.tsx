'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Activity, Hash } from 'lucide-react';

export default function PhysicsCard() {
    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Mouse/Drag Position
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth Spring Physics for the Card
    const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
    const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

    // 3D Tilt Logic
    const rotateX = useTransform(mouseY, [-200, 200], [25, -25]);
    const rotateY = useTransform(mouseX, [-200, 200], [-25, 25]);

    // Glare / Shine Effect Position
    const glareX = useTransform(mouseX, [-200, 200], [100, 0]);
    const glareY = useTransform(mouseY, [-200, 200], [100, 0]);

    // Lanyard Point (Bezier Control)
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (containerRef.current) {
            setContainerSize({
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight
            });
        }
    }, []);

    // Drag constraints and handlers
    const onDrag = (event: any, info: any) => {
        x.set(info.offset.x);
        y.set(info.offset.y);
    };

    const onDragEnd = () => {
        x.set(0);
        y.set(0);
    };

    // Lanyard SVG Path Calculation
    // Point A (Fixed top): center of container top
    // Point B (Card top): center of card top
    // Control Point: smooth curve between them
    const pathD = useTransform([mouseX, mouseY], ([latestX, latestY]: any) => {
        const startX = containerSize.width / 2;
        const startY = 0;
        const endX = (containerSize.width / 2) + latestX;
        const endY = (containerSize.height / 2) - 100 + latestY; // Card top center approx

        const cp1X = startX;
        const cp1Y = (startY + endY) / 2;

        return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${endX} ${cp1Y}, ${endX} ${endY}`;
    });

    return (
        <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-visible perspective-1000">
            {/* THE LANYARD (CUERDA) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <motion.path
                    d={pathD}
                    fill="none"
                    stroke="#00FF41"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="opacity-40"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                />
            </svg>

            {/* THE CARD */}
            <motion.div
                drag
                dragConstraints={{ left: -300, right: 300, top: -200, bottom: 400 }}
                onDrag={onDrag}
                onDragEnd={onDragEnd}
                style={{
                    x: mouseX,
                    y: mouseY,
                    rotateX,
                    rotateY,
                    transformStyle: 'preserve-3d'
                }}
                whileTap={{ scale: 0.98 }}
                className="relative w-64 h-[400px] cursor-grab active:cursor-grabbing z-20"
            >
                {/* ID BADGE CONTAINER */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-xl border-2 border-[#00FF41]/30 rounded-2xl shadow-[0_0_50px_rgba(0,255,65,0.1)] overflow-hidden flex flex-col">

                    {/* Top Clip Hole */}
                    <div className="w-12 h-2 bg-black/50 border border-white/10 rounded-full mx-auto mt-4 mb-2 shadow-inner" />

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col">
                        {/* Profile Area */}
                        <div className="w-full aspect-square bg-[#0a0a0a] rounded-xl border border-white/5 relative overflow-hidden mb-6 group">
                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
                            {/* Glitchy Placeholder */}
                            <div className="w-full h-full flex items-center justify-center grayscale opacity-50 group-hover:opacity-100 transition-opacity">
                                <Zap className="w-16 h-16 text-[#00FF41] animate-pulse" />
                            </div>
                            {/* Scanline Effect */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[#00FF41]/10 to-transparent h-1 w-full animate-scanline" />
                        </div>

                        {/* ID Data */}
                        <div className="space-y-4 font-mono">
                            <div>
                                <p className="text-[8px] text-[#00FF41] uppercase tracking-widest mb-1">Agent Protocol</p>
                                <h3 className="text-white text-sm font-black truncate">CERBERUS_INITIATE</h3>
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-2">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/40 uppercase">Reputation</span>
                                    <span className="text-[#00FF41]">99.8%</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/40 uppercase">Success Rate</span>
                                    <span className="text-[#00FF41]">100%</span>
                                </div>
                            </div>
                        </div>

                        {/* QR / Barcode Vibe */}
                        <div className="mt-auto pt-6 flex flex-col gap-2">
                            <div className="h-4 w-full bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#ffffff22_2px,#ffffff22_4px)]" />
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[8px] text-white/20">AGENT_ID: 732E395A</span>
                                <Activity size={10} className="text-[#00FF41]/20" />
                            </div>
                        </div>
                    </div>

                    {/* Glare Effect Overlay */}
                    <motion.div
                        style={{
                            background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(0, 255, 65, 0.15) 0%, transparent 60%)`
                        }}
                        className="absolute inset-0 pointer-events-none"
                    />
                </div>

                {/* Depth Layers (Subtle 3D stack effect) */}
                <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl transform translate-z-[-10px] pointer-events-none" />
            </motion.div>
        </div>
    );
}
