'use client';
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDjinnProtocol } from '../../hooks/useDjinnProtocol';
import { supabase } from '../../lib/supabase';
import { PublicKey } from '@solana/web3.js';
import { resolveMarket as resolveMarketInDb } from '../../lib/supabase-db'; // Import DB function
import { PROTOCOL_AUTHORITY } from '@/lib/program-config';

// Hardcoded Protocol Authority for simplicity (You can make this dynamic later)

// Separate component for content that uses hooks
function AdminContent() {
    const { publicKey } = useWallet();
    const { resolveMarket } = useDjinnProtocol();
    const [markets, setMarkets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    // Fetch unresolved markets
    useEffect(() => {
        const fetchMarkets = async () => {
            const { data, error } = await supabase
                .from('markets')
                .select('*')
                .eq('resolved', false)
                .order('created_at', { ascending: false });

            if (data) setMarkets(data);
            setLoading(false);
        };
        fetchMarkets();
    }, []);

    const handleResolve = async (market: any, outcome: 'yes' | 'no' | 'void') => {
        if (!publicKey) return alert("Connect wallet");
        if (publicKey.toString() !== PROTOCOL_AUTHORITY) return alert("Unauthorized: You are not the Protocol Authority");

        if (!market.market_pda || market.market_pda.startsWith('local_')) {
            return alert("Cannot resolve local/mock markets on-chain");
        }

        if (!confirm(`Are you sure you want to resolve "${market.title}" as ${outcome.toUpperCase()}?`)) return;

        setResolvingId(market.id);

        try {
            console.log(`Resolving market ${market.market_pda} as ${outcome.toUpperCase()}`);

            // 1. Resolve on Blockchain
            const tx = await resolveMarket(new PublicKey(market.market_pda), outcome);
            console.log("Blockchain resolution tx:", tx);

            // 2. Resolve in Database & Calculate Payouts
            const outcomeString = outcome.toUpperCase() as 'YES' | 'NO' | 'VOID';
            const dbResult = await resolveMarketInDb(market.slug, outcomeString);

            if (dbResult.error) {
                console.error("DB Error:", dbResult.error);
                alert("Blockchain Resolved, but DB update failed. Check console.");
            } else {
                alert(`✅ Market Resolved Successfully!\n\nBlockchain TX: ${tx.slice(0, 10)}...\n\nPayouts Calculated:\nPool: ${dbResult.totalPool || 0} SOL\nWinning Bets: ${dbResult.winningBets || 0}`);

                // Remove from list
                setMarkets(markets.filter(m => m.id !== market.id));
            }

        } catch (error: any) {
            console.error("Resolution Error:", error);
            alert(`Failed: ${error.message}`);
        } finally {
            setResolvingId(null);
        }
    };

    if (loading) return <div className="p-20 text-center text-white">Loading admin panel...</div>;

    if (!publicKey || publicKey.toString() !== PROTOCOL_AUTHORITY) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-white">
                <h1 className="text-4xl font-bold mb-4 text-red-500">ACCESS DENIED</h1>
                <p>You are not the Protocol Authority.</p>
                <div className="mt-8 p-4 bg-white/5 rounded-xl text-xs font-mono">
                    Your Wallet: {publicKey?.toString() || "Not Connected"}
                    <br />
                    Required: {PROTOCOL_AUTHORITY}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 text-white">
            <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
                <span className="text-[#F492B7]">⚡</span> Admin Console
            </h1>

            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-400">Unresolved Markets ({markets.length})</h2>

                {markets.map((market) => (
                    <div key={market.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">{market.title}</h3>
                            <div className="flex gap-4 text-sm text-gray-400 font-mono">
                                <span>Slug: {market.slug}</span>
                                <span>PDA: {market.market_pda?.slice(0, 8)}...</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => handleResolve(market, 'yes')}
                                disabled={!!resolvingId}
                                className="px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 font-bold transition-all disabled:opacity-50"
                            >
                                {resolvingId === market.id ? 'Resolving... ' : 'Resolve YES'}
                            </button>

                            <button
                                onClick={() => handleResolve(market, 'no')}
                                disabled={!!resolvingId}
                                className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 font-bold transition-all disabled:opacity-50"
                            >
                                {resolvingId === market.id ? 'Resolving... ' : 'Resolve NO'}
                            </button>

                            <button
                                onClick={() => handleResolve(market, 'void')}
                                disabled={!!resolvingId}
                                className="px-6 py-3 rounded-xl bg-gray-500/20 text-gray-400 border border-gray-500/50 hover:bg-gray-500/30 font-bold transition-all disabled:opacity-50"
                            >
                                {resolvingId === market.id ? 'Resolving... ' : 'Resolve VOID'}
                            </button>
                        </div>
                    </div>
                ))}

                {markets.length === 0 && (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 text-gray-500">
                        No unresolved markets found. Good job! 🎉
                    </div>
                )}
            </div>
        </div>
    );
}

import React, { Suspense } from 'react';

export default function AdminPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center text-white">Loading Admin...</div>}>
            <AdminContent />
        </Suspense>
    );
}
