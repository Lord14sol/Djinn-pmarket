'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface OracleStatus {
    isOnline: boolean;
    uptime: number;
    marketsResolved: number;
    successRate: number;
    feesCollected: number;
    lastActivity: string;
}

export function OracleDashboard() {
    const { publicKey } = useWallet();
    const [status, setStatus] = useState<OracleStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!publicKey) return;

        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/oracle/status', {
                    headers: {
                        'x-wallet-address': publicKey.toString()
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    setStatus(data);
                } else {
                    setStatus(null); // Unauthorized
                }
            } catch (e) {
                console.error("Dashboard fetch failed", e);
            }
            setLoading(false);
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Live Update

        return () => clearInterval(interval);
    }, [publicKey]);

    if (!publicKey) return <div className="p-8 text-center text-gray-500">Connect G1 Wallet to Access Oracle</div>;
    if (loading) return <div className="p-8 text-center text-neon-blue animate-pulse">Establishing Uplink...</div>;
    if (!status) return <div className="p-8 text-center text-red-500">⛔ Access Denied: Authorized Personnel Only</div>;

    return (
        <div className="p-6 bg-black/40 border border-white/10 rounded-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-blue to-purple-500 bg-clip-text text-transparent">
                    👁️ Sentinel Status (G1)
                </h1>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${status.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {status.isOnline ? '● SYSTEM ONLINE' : '● OFFLINE'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard title="Markets Resolved" value={status.marketsResolved} icon="⚖️" />
                <StatCard title="Accuracy Rate" value={`${status.successRate}%`} icon="🎯" />
                <StatCard title="Est. Fees (SOL)" value={status.feesCollected} icon="💰" />
            </div>

            <div className="bg-white/5 p-4 rounded-lg">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>Uptime: {(status.uptime / 3600).toFixed(2)} hrs</span>
                    <span>Last Sync: {new Date(status.lastActivity).toLocaleTimeString()}</span>
                </div>
                {/* Progress Bar Visual */}
                <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-neon-blue animate-progress-indeterminate"></div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon }: { title: string; value: string | number, icon: string }) {
    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-sm text-gray-400 uppercase tracking-wider font-mono">{title}</div>
            <div className="text-2xl font-bold text-white mt-1">{value}</div>
        </div>
    );
}
