import React from 'react';
import Link from 'next/link';

// --- ATENCIÓN AQUÍ: "export default" ES LA CLAVE ---
export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black pt-16 pb-8 text-gray-400 text-sm mt-auto">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">

                {/* GRILLA SUPERIOR */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">

                    {/* 1. BRANDING */}
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4 text-white">
                            <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center font-bold text-black text-xs">D</div>
                            <span className="font-bold tracking-wider">DJINN</span>
                        </div>
                        <p className="mb-4 text-xs leading-relaxed text-gray-500">
                            The future is priced in. <br />
                            Trade on the outcome of global events with instant liquidity on Solana.
                        </p>
                    </div>

                    {/* 2. PLATFORM */}
                    <div>
                        <h3 className="text-white font-bold mb-4">Platform</h3>
                        <ul className="space-y-2">
                            <li><Link href="#" className="hover:text-yellow-500 transition-colors">Markets</Link></li>
                            <li><Link href="#" className="hover:text-yellow-500 transition-colors">Leaderboard</Link></li>
                            <li><Link href="#" className="hover:text-yellow-500 transition-colors">Create Market</Link></li>
                        </ul>
                    </div>

                    {/* 3. COMMUNITY */}
                    <div>
                        <h3 className="text-white font-bold mb-4">Community</h3>
                        <ul className="space-y-2">
                            <li><Link href="#" className="hover:text-yellow-500 transition-colors">How it works</Link></li>
                            <li><Link href="#" className="hover:text-yellow-500 transition-colors">Discord</Link></li>
                            <li><Link href="#" className="hover:text-yellow-500 transition-colors">Twitter (X)</Link></li>
                        </ul>
                    </div>

                    {/* 4. LEGAL */}
                    <div>
                        <h3 className="text-white font-bold mb-4">Legal</h3>
                        <ul className="space-y-2">
                            <li><Link href="#" className="hover:text-yellow-500 transition-colors">Terms of Use</Link></li>
                            <li><Link href="#" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link></li>
                            <li><Link href="#" className="hover:text-yellow-500 transition-colors">Risk Policy</Link></li>
                        </ul>
                    </div>
                </div>

                {/* LÍNEA FINAL (COPYRIGHT + NETWORK STATUS) */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p>© 2026 Djinn Markets. All rights reserved.</p>

                    {/* Indicador de Status de Solana */}
                    <div className="flex gap-2 items-center bg-gray-900 px-3 py-1 rounded-full border border-white/5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-green-500 text-xs font-mono font-bold tracking-tight">Solana Network: Operational</span>
                    </div>
                </div>

            </div>
        </footer>
    );
}