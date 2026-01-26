"use client";

import { motion, AnimatePresence, useSpring } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCompact } from "@/lib/utils";

interface Holding {
    outcomeName: string;
    shares: number;
    color: string;
    previousShares?: number;
}

interface HoldingsPanelProps {
    holdings: Holding[];
    className?: string;
}

// Smooth Animated Number
const AnimatedNumber = ({ value, decimals = 2, color }: { value: number; decimals?: number; color?: string }) => {
    const spring = useSpring(value, { stiffness: 180, damping: 22 });
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        spring.set(value);
        const unsubscribe = spring.on("change", (latest) => {
            setDisplayValue(latest);
        });
        return unsubscribe;
    }, [value, spring]);

    const formattedValue = displayValue >= 1000
        ? formatCompact(displayValue)
        : displayValue.toFixed(decimals);

    return (
        <motion.span
            className="font-mono font-bold tabular-nums text-base"
            style={{ color: color || 'inherit' }}
        >
            {formattedValue}
        </motion.span>
    );
};

// Minimal Holding Row
const HoldingRow = ({ holding, index }: { holding: Holding; index: number }) => {
    const [previousValue, setPreviousValue] = useState(holding.shares);
    const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
    const [showTrendIcon, setShowTrendIcon] = useState(false);

    useEffect(() => {
        if (holding.shares > previousValue) {
            setTrend('up');
            setShowTrendIcon(true);
            setTimeout(() => setShowTrendIcon(false), 2000);
        } else if (holding.shares < previousValue) {
            setTrend('down');
            setShowTrendIcon(true);
            setTimeout(() => setShowTrendIcon(false), 2000);
        }
        setPreviousValue(holding.shares);
    }, [holding.shares]);

    // Map outcome to correct colors
    const isNo = holding.outcomeName.toUpperCase().includes('NO');
    const isYes = holding.outcomeName.toUpperCase().includes('YES');
    const displayColor = isNo ? '#F492B7' : isYes ? '#10B981' : holding.color;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
                delay: index * 0.04,
                type: "spring",
                stiffness: 200,
                damping: 20
            }}
            className="group"
        >
            <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-[#1A1A1A]/40 border border-white/5 hover:border-white/10 hover:bg-[#1A1A1A]/60 transition-all duration-200">
                {/* Left: Outcome Name */}
                <div className="flex items-center gap-3 flex-1">
                    {/* Simple Color Bar */}
                    <div
                        className="w-1 h-8 rounded-full"
                        style={{ backgroundColor: displayColor }}
                    />
                    <span className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
                        {holding.outcomeName}
                    </span>
                </div>

                {/* Right: Shares */}
                <div className="flex items-center gap-3 relative">
                    <div className="text-right">
                        <AnimatedNumber
                            value={holding.shares}
                            decimals={2}
                            color={displayColor}
                        />
                        <div className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
                            Shares
                        </div>
                    </div>

                    {/* Trend Indicator */}
                    <AnimatePresence>
                        {showTrendIcon && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: 0 }}
                                animate={{
                                    opacity: [0, 1, 1, 0],
                                    scale: [0.5, 1.2, 1, 0.8],
                                    y: trend === 'up' ? [0, -8, -12, -16] : [0, 8, 12, 16]
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                className="absolute -right-2"
                            >
                                {trend === 'up' ? (
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-rose-400" />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default function HoldingsPanel({ holdings, className = "" }: HoldingsPanelProps) {
    const totalShares = holdings.reduce((sum, h) => sum + h.shares, 0);
    const hasHoldings = holdings.length > 0 && totalShares > 0.001;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`relative ${className}`}
        >
            {/* Paper-like Coffee Background Container */}
            <div className="relative bg-gradient-to-br from-[#2A2520] via-[#1F1B18] to-[#1A1612] rounded-2xl border border-[#3A3530] overflow-hidden shadow-2xl">
                {/* Subtle Texture Overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`
                    }}
                />

                {/* Header */}
                <div className="relative px-4 py-3 border-b border-[#3A3530]/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-[#C8B8A8]" />
                            <h3 className="text-xs font-bold text-[#E5D5C5] uppercase tracking-wider">
                                Your Holdings
                            </h3>
                        </div>
                        {hasHoldings && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md"
                            >
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">
                                    Active
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Holdings List */}
                <div className="relative p-3">
                    <AnimatePresence mode="popLayout">
                        {hasHoldings ? (
                            <div className="space-y-2">
                                {holdings
                                    .filter(h => h.shares > 0.001)
                                    .map((holding, index) => (
                                        <HoldingRow
                                            key={holding.outcomeName}
                                            holding={holding}
                                            index={index}
                                        />
                                    ))}

                                {/* Total Summary */}
                                {holdings.length > 1 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: holdings.length * 0.04 + 0.15 }}
                                        className="pt-2 mt-2 border-t border-[#3A3530]/50"
                                    >
                                        <div className="flex items-center justify-between px-4 py-2 bg-[#0E0E0E]/30 rounded-lg border border-white/5">
                                            <span className="text-[10px] font-bold text-[#C8B8A8] uppercase tracking-wider">
                                                Total
                                            </span>
                                            <div className="flex items-baseline gap-1.5">
                                                <AnimatedNumber
                                                    value={totalShares}
                                                    decimals={2}
                                                    color="#E5D5C5"
                                                />
                                                <span className="text-[9px] text-zinc-600 font-medium uppercase">
                                                    shares
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-8"
                            >
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#0E0E0E]/30 border border-[#3A3530]/50 flex items-center justify-center">
                                    <Wallet className="w-6 h-6 text-[#5A4A3A]" />
                                </div>
                                <p className="text-sm text-[#C8B8A8] font-medium">
                                    No holdings yet
                                </p>
                                <p className="text-xs text-[#8A7A6A] mt-1">
                                    Place a bet to get started
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
