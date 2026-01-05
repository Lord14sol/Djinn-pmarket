'use client';

import React from 'react';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const Hero = () => {
    return (
        // AJUSTE CRÍTICO: 
        // - min-h-[40vh]: Reducido de 50 a 40 para que ocupe menos pantalla vertical.
        // - pb-6: Reducido para que lo siguiente ("Trending Markets") se pegue más.
        // - pt-24: Subimos un poco el inicio.
        <section className="relative w-full min-h-[40vh] flex flex-col items-center justify-center px-4 pt-24 pb-6">

            {/* Container principal */}
            <div className="w-full max-w-3xl flex flex-col items-center gap-5">

                {/* --- 1. SEARCH BAR --- */}
                <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-12 pr-4 py-4 bg-[#1C1D25] border border-gray-800 rounded-2xl text-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#F492B7] focus:border-transparent outline-none transition-all shadow-2xl"
                        placeholder="Search for markets or profiles..."
                    />
                </div>

                {/* --- 2. CREATE A MARKET BUTTON --- */}
                <div className="flex justify-center mt-1">
                    <button className="bg-[#F492B7] text-black text-xl font-black py-4 px-12 rounded-xl 
                               shadow-[0_0_30px_rgba(244,146,183,0.3)] 
                               hover:shadow-[0_0_50px_rgba(244,146,183,0.5)] 
                               hover:scale-105 active:scale-95 
                               transition-all duration-300 uppercase tracking-wide">
                        Create a Market
                    </button>
                </div>

                {/* --- 3. HOW IT WORKS --- */}
                <button className="px-6 py-2 rounded-full bg-[#F492B7]/10 border border-[#F492B7]/20 text-[#F492B7] hover:bg-[#F492B7] hover:text-black transition-all duration-300 text-sm font-bold shadow-[0_0_15px_rgba(244,146,183,0.1)] hover:scale-105 mt-1">
                    How it works?
                </button>

            </div>

            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#F492B7]/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        </section>
    );
};

export default Hero;