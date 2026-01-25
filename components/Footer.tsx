'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePrice } from '@/lib/PriceContext';
import { usePathname } from 'next/navigation';

const SocialIcon = ({ children }: { children: React.ReactNode }) => (
    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#F492B7] hover:text-black transition-all duration-300 cursor-pointer hover:scale-110 hover:shadow-[0_0_15px_rgba(244,146,183,0.4)]">
        {children}
    </div>
);

export default function Footer() {
    const pathname = usePathname();
    const isLanding = pathname === '/';

    return (
        // CAMBIOS CLAVE:
        // 1. Eliminado 'mt-32'. ¡Adiós a la franja gigante!
        // 2. Agregado 'border-t border-white/5'. Una línea divisoria muy sutil y elegante.
        <footer className="pt-20 pb-10 px-6 md:px-12 relative overflow-hidden bg-black">

            {/* Luz ambiental sutil */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#F492B7] opacity-[0.03] blur-[100px] pointer-events-none"></div>

            <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 relative z-10">

                {/* Columna 1: Brand */}
                <div className="col-span-1 flex flex-col">
                    <div className="flex items-start opacity-90">
                        <div className="relative w-32 h-32 transition-transform hover:scale-105 duration-500 cursor-pointer -ml-2">
                            <Image src="/djinn-logo.png?v=3" alt="Djinn Logo" fill className="object-contain drop-shadow-[0_0_20px_rgba(244,146,183,0.15)]" unoptimized />
                        </div>
                    </div>

                    <div className={`flex items-center -mt-2 ${isLanding ? 'justify-between w-full max-w-[340px]' : 'gap-6'}`}>
                        <p
                            className={`pl-1 relative z-20 transition-all duration-500 hover:text-white ${isLanding ? 'text-white text-base' : 'text-gray-500 text-sm'}`}
                        >
                            {isLanding ? "The Future Is Yours" : "The future is priced in."}
                        </p>

                        {isLanding && (
                            <a href="https://x.com/Djinnmarket" target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 hover:text-[#F492B7] transition-all duration-300">
                                <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </a>
                        )}
                    </div>
                </div>

                {/* Columna 2: Resources - HIDDEN ON LANDING */}
                {!isLanding && (
                    <div className="pt-4">
                        <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Resources</h4>
                        <ul className="flex flex-col gap-4 text-sm text-gray-400 font-medium">
                            <li className="hover:text-[#F492B7] cursor-pointer w-max transition-colors">Documentation</li>
                            <li className="hover:text-[#F492B7] cursor-pointer w-max transition-colors">Help Center</li>
                            <li><Link href="/legal" className="hover:text-[#F492B7] cursor-pointer w-max transition-colors">Terms of Service</Link></li>
                            <li><Link href="/legal" className="hover:text-[#F492B7] cursor-pointer w-max transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>
                )}

                {/* Columna 3: Community */}
                {!isLanding && (
                    <div className="pt-4">
                        <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Community</h4>
                        <p className="text-gray-400 text-sm mb-6">Join the conversation.</p>
                        <div className="flex gap-4">
                            <a href="https://x.com/Djinnmarket" target="_blank" rel="noopener noreferrer">
                                <SocialIcon>
                                    <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                </SocialIcon>
                            </a>
                        </div>
                    </div>
                )}

            </div>

            {/* Barra inferior */}
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center pt-8 gap-4 relative z-10">
                <div className="flex items-center gap-6">
                    <span className="text-gray-500 text-xs font-medium">© 2026 Djinn. All rights reserved.</span>
                    {!isLanding && (
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            <img
                                src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                                alt="SOL"
                                className="w-3 h-3 rounded-full"
                            />
                            <span className="text-[10px] font-black text-white font-mono uppercase tracking-tighter">SOL</span>
                            <span className="text-[10px] font-bold text-[#10B981] font-mono">${usePrice().solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4 text-gray-500 text-xs font-mono">
                    {!isLanding && <span>v1.0.3-beta</span>}
                </div>
            </div>
        </footer>
    );
}