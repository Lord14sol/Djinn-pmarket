'use client';

import React, { useState } from 'react';

export default function ActivityPage() {
    const [minAmount, setMinAmount] = useState(0);

    const trades = [
        { id: '1', user: 'OnchainScammer', action: 'YES', amount: 4500.50, market: 'Will BTC hit $150k?', time: 'Just now' },
        { id: '2', user: 'SolWhale_88', action: 'NO', amount: 120.00, market: 'Argentina GDP > 3%', time: '2m ago' },
        { id: '3', user: 'DegenOracle', action: 'YES', amount: 8900.00, market: 'Solana Mobile 3 Launch', time: '5m ago' },
    ];

    const filteredTrades = trades.filter(t => t.amount >= minAmount);

    return (
        <div className="min-h-screen bg-black pt-40 px-6 pb-20">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-5xl font-black text-white italic mb-10 uppercase tracking-tighter">The Pulse</h1>

                <div className="flex gap-3 mb-10 bg-[#111] p-2 rounded-2xl w-fit border border-white/5">
                    {[0, 100, 1000, 5000].map((amt) => (
                        <button
                            key={amt}
                            onClick={() => setMinAmount(amt)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${minAmount === amt ? 'bg-[#F492B7] text-black shadow-[0_0_20px_rgba(244,146,183,0.3)]' : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {amt === 0 ? 'All' : `$${amt}+`}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {filteredTrades.map((trade) => (
                        <div key={trade.id} className="flex items-center justify-between p-6 rounded-3xl bg-[#0B0E14] border border-white/5 hover:border-[#F492B7]/20 transition-all">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white mb-1">@{trade.user}</span>
                                <span className="text-xs text-gray-500 italic">{trade.market}</span>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <span className="text-3xl font-black text-white block">${trade.amount.toLocaleString()}</span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase mt-2">{trade.time}</span>
                                </div>
                                <div className={`w-1.5 h-16 rounded-full ${trade.action === 'YES' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                                    }`}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

}