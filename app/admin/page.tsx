'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { initializeProtocol, getProtocolStatePDA } from '@/lib/program';
import { PROTOCOL_AUTHORITY } from '@/lib/program-config';

export default function AdminPage() {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string>('');

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

    const checkProtocolState = async () => {
        setLoading(true);
        setError('');
        setStatus('Checking protocol state...');

        try {
            const [protocolPDA] = await getProtocolStatePDA();
            setStatus(`Protocol State PDA: ${protocolPDA.toBase58()}`);
        } catch (err: any) {
            setError(`Failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8">🔧 Admin Panel</h1>

                {/* Wallet Status */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4">Wallet Status</h2>
                    {wallet.publicKey ? (
                        <div>
                            <p className="text-green-400">✅ Connected: {wallet.publicKey.toBase58()}</p>
                            <p className="text-sm text-white/60 mt-2">
                                Authority: {PROTOCOL_AUTHORITY.toBase58()}
                            </p>
                            {wallet.publicKey.toBase58() === PROTOCOL_AUTHORITY.toBase58() ? (
                                <p className="text-green-400 mt-2">✅ You are the protocol authority</p>
                            ) : (
                                <p className="text-yellow-400 mt-2">⚠️ You are NOT the protocol authority</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-red-400">❌ Not connected</p>
                    )}
                </div>

                {/* Initialize Protocol */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4">Initialize Protocol</h2>
                    <p className="text-white/70 mb-4">
                        This should only be done ONCE when deploying the protocol for the first time.
                    </p>
                    <button
                        onClick={handleInitialize}
                        disabled={loading || !wallet.publicKey}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
                     rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 
                     transition disabled:opacity-50 disabled:cursor-not-allowed text-white"
                    >
                        {loading ? 'Initializing...' : 'Initialize Protocol'}
                    </button>
                </div>

                {/* Check Protocol State */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4">Check Protocol State</h2>
                    <button
                        onClick={checkProtocolState}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-500 rounded-lg font-semibold 
                     hover:shadow-lg hover:shadow-blue-500/50 transition 
                     disabled:opacity-50 text-white"
                    >
                        {loading ? 'Checking...' : 'Check Protocol State'}
                    </button>
                </div>

                {/* Status/Error Display */}
                {status && (
                    <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-4">
                        <p className="text-green-300 font-mono text-sm break-all">{status}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4">📝 Instructions</h2>
                    <ol className="text-white/80 space-y-2 list-decimal list-inside">
                        <li>Connect your wallet (must be protocol authority)</li>
                        <li>Click "Initialize Protocol" (only once, ever)</li>
                        <li>Wait for confirmation</li>
                        <li>Protocol is now ready for creating markets!</li>
                    </ol>

                    <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-300 text-sm">
                            ⚠️ <strong>Important:</strong> This only needs to be done ONE TIME when first deploying.
                            If you see "already initialized" error, the protocol is ready to use!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
