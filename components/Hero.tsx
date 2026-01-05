import React from 'react';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const QuestionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
);

export default function Hero() {
    return (
        // --- AJUSTE MAESTRO: pt-40 ---
        // Esto asegura que el contenido empiece justo debajo de su Navbar de h-28.
        <div className="relative bg-black text-white pt-40 pb-20 px-6 flex flex-col items-center justify-center text-center overflow-hidden min-h-[50vh]">

            {/* Fondo decorativo (Luz amarilla) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-yellow-500/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Botón "¿How it works?" */}
            <button className="relative z-10 mb-6 flex items-center gap-2 px-4 py-2 rounded-full border border-gray-800 bg-gray-900/50 hover:border-yellow-500/50 hover:text-yellow-400 transition-all group">
                <QuestionIcon />
                <span className="text-sm font-medium tracking-wide">How it works?</span>
            </button>

            {/* Barra de Búsqueda */}
            <div className="relative z-10 w-full max-w-3xl mb-8 group">
                <div className="relative flex items-center">
                    <div className="absolute left-6 pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for markets or profiles..."
                        className="w-full bg-gray-900 border border-gray-700 text-white text-xl md:text-2xl rounded-2xl pl-16 pr-6 py-6 shadow-2xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all placeholder:text-gray-500 font-light"
                    />
                    <div className="absolute right-6 pointer-events-none hidden sm:block">
                        <span className="bg-gray-800 text-gray-400 text-xs font-bold px-2 py-1 rounded border border-gray-700">CTRL K</span>
                    </div>
                </div>
            </div>

            {/* Botón "CREATE A MARKET" */}
            <button className="relative z-10 group overflow-hidden rounded-xl bg-yellow-500 px-10 py-5 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(234,179,8,0.3)]">
                <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 skew-x-12 -translate-x-full"></div>
                <span className="relative flex items-center gap-3 text-black font-black text-xl md:text-2xl tracking-tighter uppercase">
                    CREATE A MARKET
                </span>
            </button>

        </div>
    );
}