'use client';

import React from 'react';

// Skeleton pulse animation base class
const pulseClass = "animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]";

// Market Card Skeleton
export function MarketCardSkeleton() {
    return (
        <div className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/5 overflow-hidden">
            {/* Image skeleton */}
            <div className={`h-48 ${pulseClass}`} />

            {/* Content */}
            <div className="p-8">
                {/* Title skeleton */}
                <div className={`h-6 w-3/4 rounded-lg mb-4 ${pulseClass}`} />
                <div className={`h-4 w-1/2 rounded-lg mb-6 ${pulseClass}`} />

                {/* Progress bar skeleton */}
                <div className={`h-3 w-full rounded-full mb-6 ${pulseClass}`} />

                {/* Buttons skeleton */}
                <div className="flex gap-3">
                    <div className={`h-12 flex-1 rounded-xl ${pulseClass}`} />
                    <div className={`h-12 flex-1 rounded-xl ${pulseClass}`} />
                </div>

                {/* Footer skeleton */}
                <div className="flex justify-between mt-6">
                    <div className={`h-4 w-20 rounded ${pulseClass}`} />
                    <div className={`h-4 w-16 rounded ${pulseClass}`} />
                </div>
            </div>
        </div>
    );
}

// Market Card Grid Skeleton
export function MarketGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {Array.from({ length: count }).map((_, i) => (
                <MarketCardSkeleton key={i} />
            ))}
        </div>
    );
}

// Chart Skeleton
export function ChartSkeleton() {
    return (
        <div className="relative h-64 md:h-80 w-full bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl border border-white/5 overflow-hidden">
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }} />

            {/* Fake chart line */}
            <div className="absolute inset-x-8 bottom-20 h-1/2">
                <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <path
                        d="M0,40 Q15,35 25,38 T50,25 T75,30 T100,15"
                        fill="none"
                        stroke="rgba(244, 146, 183, 0.2)"
                        strokeWidth="2"
                        className="animate-pulse"
                    />
                </svg>
            </div>

            {/* Y axis labels */}
            <div className="absolute left-4 top-4 bottom-16 flex flex-col justify-between">
                {[100, 75, 50, 25, 0].map((v) => (
                    <div key={v} className={`h-3 w-8 rounded ${pulseClass}`} />
                ))}
            </div>
        </div>
    );
}

// Profile Stats Skeleton
export function ProfileStatsSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
                    <div className={`h-3 w-16 rounded mb-3 ${pulseClass}`} />
                    <div className={`h-8 w-24 rounded ${pulseClass}`} />
                </div>
            ))}
        </div>
    );
}

// Button Loading Spinner
export function ButtonSpinner({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    return (
        <svg className={`${sizeClasses[size]} animate-spin`} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );
}

// Full Page Loading
export function PageLoader() {
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                {/* Animated Djinn star */}
                <div className="relative w-24 h-24">
                    <img
                        src="/star.png"
                        alt="Loading"
                        className="w-full h-full animate-pulse"
                        style={{ animationDuration: '1.5s' }}
                    />
                    <div className="absolute inset-0 bg-[#F492B7]/20 rounded-full blur-xl animate-ping" style={{ animationDuration: '2s' }} />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg">Loading</span>
                    <span className="flex gap-1">
                        <span className="w-2 h-2 bg-[#F492B7] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <span className="w-2 h-2 bg-[#F492B7] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <span className="w-2 h-2 bg-[#F492B7] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </span>
                </div>
            </div>
        </div>
    );
}

// Inline text skeleton
export function TextSkeleton({ width = 'w-24' }: { width?: string }) {
    return <span className={`inline-block h-4 ${width} rounded ${pulseClass}`} />;
}
