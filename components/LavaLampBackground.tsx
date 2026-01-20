"use client";

export default function LavaLampBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Main Background */}
            <div className="absolute inset-0 bg-[#020202]" />

            {/* Animated Blob 1 - Top Right */}
            <div
                className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.23] blur-[120px] animate-blob"
                style={{
                    background: 'radial-gradient(circle, #F492B7 0%, #EC4899 50%, transparent 70%)',
                }}
            />

            {/* Animated Blob 2 - Bottom Left */}
            <div
                className="absolute -bottom-60 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.17] blur-[100px] animate-blob"
                style={{
                    background: 'radial-gradient(circle, #10B981 0%, #06B6D4 50%, transparent 70%)',
                    animationDelay: '7s'
                }}
            />

            {/* Animated Blob 3 - Center */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.17] blur-[150px] animate-blob-slow"
                style={{
                    background: 'radial-gradient(circle, #F492B7 0%, #8B5CF6 40%, transparent 70%)',
                }}
            />

            {/* Floating Particles */}
            <div
                className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-[#F492B7]/30 animate-float-particle"
                style={{ animationDelay: '0s' }}
            />
            <div
                className="absolute top-1/3 left-1/3 w-1 h-1 rounded-full bg-[#10B981]/40 animate-float-particle"
                style={{ animationDelay: '2s' }}
            />
            <div
                className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 rounded-full bg-[#EC4899]/30 animate-float-particle"
                style={{ animationDelay: '4s' }}
            />
            <div
                className="absolute top-2/3 left-1/4 w-1 h-1 rounded-full bg-[#F492B7]/20 animate-float-particle"
                style={{ animationDelay: '6s' }}
            />
        </div>
    );
}
