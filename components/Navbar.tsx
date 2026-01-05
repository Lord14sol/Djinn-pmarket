'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// --- ICONOS ---
const DjinnStar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1 text-yellow-500 animate-pulse">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);
const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-gray-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);
const PodiumIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>);
const EcgIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12h5.25L9 15.75l1.5-7.5 2.25 9 1.5-4.5h4.5" /></svg>);
const MenuIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>);

const categories = ["Trending", "New", "Earth 🌍", "Politics", "Crypto", "Sports", "Culture", "Tech", "Science", "Finance", "Climate", "Mentions", "Movies", "Social Media", "Space", "AI", "Gaming"];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-black/95 backdrop-blur-md border-b border-white/10">

            {/* --- CAMBIO CLAVE: Usamos 'w-full' y padding lateral grande (px-6 md:px-12) --- */}
            {/* Esto hace que el contenido se estire pero mantenga un margen de seguridad a los lados */}
            <div className="w-full px-6 md:px-12 h-28 flex items-center justify-between gap-4">

                {/* LOGO + BRAND */}
                <Link href="/" className="flex items-center gap-0 group min-w-max">
                    <div className="relative w-28 h-28 transition-transform duration-300 group-hover:scale-105 z-10">
                        <Image
                            src="/star.png"
                            alt="Djinn Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span
                        className="text-4xl text-white tracking-tight hidden sm:block -ml-6 mt-4 z-0"
                        style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}
                    >
                        Djinn
                    </span>
                </Link>

                {/* Espaciador flexible */}
                <div className="flex-1"></div>

                {/* Botones Derecha */}
                <div className="flex items-center gap-4">
                    <button className="bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-sm py-3 px-6 rounded-lg transition-transform hover:scale-105 shadow-lg hidden sm:block uppercase tracking-wide">
                        Connect Wallet
                    </button>

                    <button onClick={() => setIsOpen(!isOpen)} className="p-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg border border-white/10">
                        {isOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>
            </div>

            {/* CATEGORÍAS (También ajustadas al ancho completo) */}
            <div className="border-t border-white/5 relative group">
                {/* Ajustamos el padding-left aquí también para que coincida con el logo */}
                <div className="flex items-center overflow-x-auto scrollbar-hide py-3 pl-6 md:pl-12 pr-32">
                    <div className="flex gap-8 text-sm font-bold text-gray-400 whitespace-nowrap uppercase tracking-wider">
                        {categories.map((cat) => (
                            <Link
                                key={cat}
                                href="#"
                                className={`flex items-center transition-colors hover:text-yellow-500 ${cat.includes("Earth") ? "text-blue-400 font-black" : ""} ${cat === "Trending" ? "text-yellow-400 font-black" : ""}`}
                            >
                                {cat === "Trending" && <DjinnStar />}
                                {cat.toUpperCase()}
                            </Link>
                        ))}
                    </div>
                </div>
                {/* Fade */}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black via-black/90 to-transparent flex items-center justify-end pr-4">
                    <div className="animate-pulse opacity-50">
                        <ChevronRightIcon />
                    </div>
                </div>
            </div>

            {/* MENÚ DESPLEGABLE */}
            {isOpen && (
                <div className="absolute top-28 right-6 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-5">
                    {/* ...contenido del menú... */}
                    <div className="p-4 border-b border-gray-800 grid grid-cols-2 gap-2">
                        <button className="flex items-center justify-center gap-2 p-2 rounded-lg bg-black border border-gray-800 hover:border-gray-600 transition-colors text-xs text-gray-400">☀️ Light</button>
                        <button className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-800 border border-gray-600 text-white transition-colors text-xs font-bold">🌙 Dark</button>
                    </div>
                    <div className="p-2">
                        <Link href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                            <div className="p-2 rounded bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-colors"><PodiumIcon /></div>
                            <div><div className="text-sm font-bold text-white">Leaderboard</div><div className="text-xs text-gray-500">Top Traders</div></div>
                        </Link>
                        {/* ...más links... */}
                        <Link href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                            <div className="p-2 rounded bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors"><EcgIcon /></div>
                            <div><div className="text-sm font-bold text-white">Activity</div><div className="text-xs text-gray-500">Live</div></div>
                        </Link>
                    </div>
                    <div className="p-4 border-t border-gray-800 bg-black/40">
                        <div className="flex flex-col gap-3 text-sm text-gray-400">
                            <Link href="#" className="hover:text-white flex justify-between">Support <span>↗</span></Link>
                            <Link href="#" className="hover:text-white flex justify-between">Terms & Conditions <span>↗</span></Link>
                        </div>
                        <div className="mt-4 sm:hidden">
                            <button className="w-full bg-yellow-500 text-black font-bold py-2 rounded-lg text-sm">Connect Wallet</button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}