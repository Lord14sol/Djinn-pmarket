'use client';
import { OracleDashboard } from '@/dashboard/components/OracleStatus';
import { MarketQueue } from '@/dashboard/components/MarketQueue';

export default function OraclePage() {
    return (
        <div className="min-h-screen bg-black text-white pt-24 px-4">
            <div className="max-w-6xl mx-auto space-y-8">
                <OracleDashboard />

                <div className="flex gap-8">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-purple-400 mb-4 flex items-center gap-2">
                            <span>🌩️</span> Resolution Queue
                        </h2>
                        <MarketQueue />
                    </div>

                    <div className="w-80 space-y-4">
                        <div className="bg-gray-900 border border-white/10 p-4 rounded-lg">
                            <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Manual Override</h3>
                            <p className="text-xs text-gray-500 mb-4">Force resolve disputed markets directly on-chain.</p>
                            <button className="w-full py-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded hover:bg-red-500/20 transition-colors text-sm font-mono">
                                ☢️ EMERGENCY RESOLVE
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
