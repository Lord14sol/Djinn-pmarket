'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { initializeProtocol, getProtocolStatePDA } from '@/lib/program';
import { PROTOCOL_AUTHORITY } from '@/lib/program-config';
import * as supabaseDb from '@/lib/supabase-db';

export default function AdminPage() {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [markets, setMarkets] = useState<supabaseDb.Market[]>([]);
    const [activeTab, setActiveTab] = useState<'protocol' | 'markets'>('markets');

    // Load markets on mount
    useEffect(() => {
        loadMarkets();
    }, []);

    const loadMarkets = async () => {
        const data = await supabaseDb.getMarkets();
        setMarkets(data);
    };

    const handleInitialize = async () => {
        if (!wallet.publicKey) {
            setError('Please connect your wallet first');
            return;
        }

        if (wallet.publicKey.toBase58() !== PROTOCOL_AUTHORITY.toBase58()) {
            setError('Only protocol authority can initialize');
            return;
        }

        setLoading(true);
        setError('');
        setStatus('Initializing protocol...');

        try {
            const result = await initializeProtocol(wallet);
            setStatus(`✅ Protocol initialized! TX: ${result.signature}`);
            console.log('Protocol State:', result.protocolState.toBase58());
        } catch (err: any) {
            setError(`Failed: ${err.message}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResolveMarket = async (slug: string, outcome: 'YES' | 'NO') => {
        if (!wallet.publicKey || wallet.publicKey.toBase58() !== PROTOCOL_AUTHORITY.toBase58()) {
            setError('Only protocol authority can resolve markets');
            return;
        }

        setLoading(true);
        setError('');
        setStatus(`Resolving market "${slug}" as ${outcome}...`);

        try {
            const result = await supabaseDb.resolveMarket(slug, outcome);
            if (result.error) {
                setError(`Failed: ${result.error.message}`);
            } else {
                setStatus(`✅ Market resolved! Winner: ${outcome} | Pool: ${result.totalPool?.toFixed(4)} SOL | Winners: ${result.winningBets} | Losers: ${result.losingBets}`);
                loadMarkets(); // Refresh
            }
        } catch (err: any) {
            setError(`Failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const isAuthority = wallet.publicKey?.toBase58() === PROTOCOL_AUTHORITY.toBase58();

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8">🔧 Admin Panel</h1>

                {/* Wallet Status */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4">Wallet Status</h2>
                    {wallet.publicKey ? (
                        <div>
                            <p className="text-green-400">✅ Connected: {wallet.publicKey.toBase58()}</p>
                            {isAuthority ? (
                                <p className="text-green-400 mt-2">✅ You are the protocol authority</p>
                            ) : (
                                <p className="text-yellow-400 mt-2">⚠️ You are NOT the protocol authority</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-red-400">❌ Not connected</p>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('markets')}
                        className={`px-6 py-3 rounded-xl font-bold transition ${activeTab === 'markets' ? 'bg-[#F492B7] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        📊 Resolve Markets
                    </button>
                    <button
                        onClick={() => setActiveTab('protocol')}
                        className={`px-6 py-3 rounded-xl font-bold transition ${activeTab === 'protocol' ? 'bg-[#F492B7] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        ⚙️ Protocol Settings
                    </button>
                </div>

                {/* Markets Tab */}
                {activeTab === 'markets' && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Markets ({markets.length})</h2>
                            <button onClick={loadMarkets} className="px-4 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition">
                                🔄 Refresh
                            </button>
                        </div>

                        {markets.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No markets found. Create one from the homepage!</p>
                        ) : (
                            <div className="space-y-4">
                                {markets.map(market => (
                                    <div key={market.slug} className={`bg-black/40 rounded-xl p-6 border ${market.resolved ? 'border-green-500/30' : 'border-white/10'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{market.title}</h3>
                                                <p className="text-gray-400 text-sm">Slug: {market.slug}</p>
                                                <p className="text-gray-500 text-xs">Creator: {market.creator_wallet.slice(0, 8)}...</p>
                                            </div>
                                            {market.resolved ? (
                                                <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                                                    <span className="text-green-400 font-bold">✅ Resolved: {market.winning_outcome}</span>
                                                </div>
                                            ) : (
                                                <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                                                    <span className="text-yellow-400 font-bold">⏳ Active</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Pool Info */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                                                <p className="text-gray-400 text-xs">YES Pool</p>
                                                <p className="text-emerald-400 font-bold">{market.total_yes_pool || 0} SOL</p>
                                            </div>
                                            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                                                <p className="text-gray-400 text-xs">NO Pool</p>
                                                <p className="text-red-400 font-bold">{market.total_no_pool || 0} SOL</p>
                                            </div>
                                        </div>

                                        {/* Resolve Buttons */}
                                        {!market.resolved && isAuthority && (
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => handleResolveMarket(market.slug, 'YES')}
                                                    disabled={loading}
                                                    className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition disabled:opacity-50"
                                                >
                                                    ✅ Resolve YES
                                                </button>
                                                <button
                                                    onClick={() => handleResolveMarket(market.slug, 'NO')}
                                                    disabled={loading}
                                                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition disabled:opacity-50"
                                                >
                                                    ❌ Resolve NO
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Protocol Tab */}
                {activeTab === 'protocol' && (
                    <div className="space-y-6">
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h2 className="text-xl font-bold text-white mb-4">Initialize Protocol</h2>
                            <p className="text-white/70 mb-4">
                                This should only be done ONCE when deploying the protocol for the first time.
                            </p>
                            <button
                                onClick={handleInitialize}
                                disabled={loading || !wallet.publicKey}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed text-white"
                            >
                                {loading ? 'Initializing...' : 'Initialize Protocol'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Status/Error Display */}
                {status && (
                    <div className="mt-6 bg-green-500/20 border border-green-500 rounded-lg p-4">
                        <p className="text-green-300 font-mono text-sm break-all">{status}</p>
                    </div>
                )}

                {error && (
                    <div className="mt-6 bg-red-500/20 border border-red-500 rounded-lg p-4">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
