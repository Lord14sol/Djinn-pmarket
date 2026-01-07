'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const initialTrades = [
    { id: '1', user: 'OnchainScammer', action: 'YES', amount: 4500.50, market: 'Will BTC hit $150k?', time: 'JUST NOW' },
    { id: '2', user: 'SolWhale_88', action: 'NO', amount: 120.00, market: 'Argentina GDP > 3%', time: '2M AGO' },
    { id: '3', user: 'DegenOracle', action: 'YES', amount: 105000.00, market: 'Solana Mobile 3 Launch', time: '5M AGO' },
];

export default function ActivityPage() {
    const [minAmount, setMinAmount] = useState(0);

    return (
        <div className="min-h-screen bg-black pt-40 px-6 pb-20 selection:bg-[#F492B7] selection:text-black">
            <div className="max-w-4xl mx-auto">

                {/* Título Djinn */}
                <h1 className="text-6xl md:text-7xl text-white mb-16 tracking-[-0.05em]"
                    style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                    Activity
                </h1>

                {/* Filtros de Categoría */}
                <div className="flex gap-4 mb-14 items-center">
                    {[0, 100, 1000, 100000].map((amt) => (
                        <button
                            key={amt}
                            onClick={() => setMinAmount(amt)}
                            className={`px-5 py-1.5 rounded-full text-[10px] font-[900] uppercase tracking-[0.2em] transition-all duration-300 border ${minAmount === amt
                                    ? 'bg-[#F492B7] text-black border-[#F492B7] shadow-[0_0_15px_rgba(244,146,183,0.3)]'
                                    : 'text-gray-500 border-white/10 hover:border-white/30'
                                }`}
                        >
                            {amt === 0 ? 'All' : `$${amt.toLocaleString()}+`}
                        </button>
                    ))}
                </div>

                {/* Lista de Actividad Interactiva */}
                <div className="space-y-3">
                    {initialTrades.filter(t => t.amount >= minAmount).map((trade) => (
                        /* El Link ahora lleva al perfil del usuario para ver su apuesta */
                        <Link
                            href={`/profile/${trade.user.toLowerCase()}`}
                            key={trade.id}
                            className="flex items-center justify-between py-5 px-8 rounded-2xl bg-black border border-white/[0.04] 
                                       hover:border-[#F492B7]/30 hover:bg-white/[0.01] hover:-translate-y-1.5 
                                       active:scale-[0.97] transition-all duration-300 group cursor-pointer block"
                        >
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[12px] font-black text-white tracking-[0.1em] uppercase group-hover:text-[#F492B7] transition-colors">
                                        @{trade.user}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Profile</span>
                                </div>
                                <span className="text-[11px] text-gray-500 italic tracking-tight font-medium uppercase opacity-60">
                                    {trade.market}
                                </span>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-right">
                                    {/* Números Gruesos Estilo Fortnite */}
                                    <span className="text-3xl font-[900] text-white block tracking-tighter italic leading-none">
                                        ${trade.amount.toLocaleString()}
                                    </span>
                                    {/* Tiempo en Rosa Djinn */}
                                    <span className="text-[9px] text-[#F492B7] font-black uppercase tracking-[0.3em] mt-2 block opacity-90">
                                        {trade.time}
                                    </span>
                                </div>

                                {/* Barra de Acción Engrosada */}
                                <div className={`w-3 h-14 rounded-full transition-all duration-300 ${trade.action === 'YES'
                                        ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] group-hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]'
                                        : 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] group-hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]'
                                    }`}></div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}