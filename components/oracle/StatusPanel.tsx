'use client';

import { OracleStatus } from '../../lib/oracle';
import { RefreshCw, Power, Zap, Activity, Cpu } from 'lucide-react';

interface StatusPanelProps {
    status: OracleStatus;
    onToggle: () => void;
    isLoading: boolean;
}

export function StatusPanel({ status, onToggle, isLoading }: StatusPanelProps) {
    const formatLastRun = (timestamp: string | null) => {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    const activeSources = status.sources.filter(s => s.enabled);

    return (
        <div className="border border-white/10 rounded-3xl bg-gradient-to-br from-[#0D1117] to-[#161B22] shadow-2xl overflow-hidden relative group">
            {/* Decorative Matrix Background Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent animate-pulse" />
                <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-[#F492B7]/50 to-transparent animate-pulse delay-700" />
            </div>

            {/* Main Status Header */}
            <div className="p-8 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-6">
                    {/* Animated Status Indicator - Digital Processor Style */}
                    <div className="relative">
                        <div
                            className={`w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-500 relative overflow-hidden ${status.enabled
                                ? 'bg-black/40 border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                                : 'bg-black/40 border-2 border-gray-500/30'
                                }`}
                        >
                            {/* Inner Circuits */}
                            <div className="absolute inset-0 opacity-20 bg-[url('/grid.png')] bg-center opacity-30" />

                            {status.enabled ? (
                                <>
                                    <div className="absolute inset-0 border-t border-emerald-500/30 animate-[scan_2s_linear_infinite]" />
                                    <Cpu className="w-12 h-12 text-emerald-400 relative z-10 animate-pulse" />
                                </>
                            ) : (
                                <Power className="w-10 h-10 text-gray-500 relative z-10" />
                            )}
                        </div>

                        {/* Corner Accents */}
                        <div className={`absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 rounded-tl ${status.enabled ? 'border-emerald-400' : 'border-gray-600'}`} />
                        <div className={`absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 rounded-tr ${status.enabled ? 'border-emerald-400' : 'border-gray-600'}`} />
                        <div className={`absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 rounded-bl ${status.enabled ? 'border-emerald-400' : 'border-gray-600'}`} />
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 rounded-br ${status.enabled ? 'border-emerald-400' : 'border-gray-600'}`} />
                    </div>

                    <div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                            ORACLE_CORE
                            <span className="text-xs font-mono text-gray-500">v1.0.4</span>
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs font-bold font-mono px-3 py-1 rounded-md border ${status.enabled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                }`}>
                                {status.enabled ? 'SYSTEM_ONLINE' : 'SYSTEM_OFFLINE'}
                            </span>
                            {status.enabled && (
                                <span className="text-xs font-mono text-emerald-500/70 animate-pulse">
                                    Processing market data...
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onToggle}
                    disabled={isLoading}
                    className={`group px-8 py-4 rounded-xl font-bold font-mono text-sm transition-all duration-300 disabled:opacity-50 flex items-center gap-3 border hover:shadow-lg ${status.enabled
                        ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                        }`}
                >
                    {isLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : status.enabled ? (
                        <>
                            <Power className="w-5 h-5" />
                            TERMINATE_PROCESS
                        </>
                    ) : (
                        <>
                            <Zap className="w-5 h-5" />
                            INITIALIZE_CORE
                        </>
                    )}
                </button>
            </div>

            {/* Stats Grid - Non-clickable */}
            <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 bg-black/40">
                <div className="p-6 text-center select-none backdrop-blur-sm">
                    <div className="text-3xl font-black text-white mb-1 font-mono tracking-tighter">
                        {formatLastRun(status.last_run)}
                    </div>
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Last Execution</div>
                </div>

                <div className="p-6 text-center select-none backdrop-blur-sm">
                    <div className="text-3xl font-black text-[#F492B7] mb-1 font-mono tracking-tighter">
                        {status.pending_suggestions}
                    </div>
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Pending Decisions</div>
                </div>

                <div className="p-6 text-center select-none backdrop-blur-sm">
                    <div className="text-3xl font-black text-white mb-1 font-mono tracking-tighter flex items-center justify-center gap-2">
                        {activeSources.length}
                        <Activity className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Active Links</div>
                </div>
            </div>

            {/* Data Sources */}
            <div className="p-6 border-t border-white/5 bg-gradient-to-b from-[#161B22] to-[#0D1117]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 font-bold text-xs flex items-center gap-2 uppercase tracking-widest">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        Neural Network Connections
                    </h3>
                    <span className="text-[10px] text-gray-600 font-mono">
                        SECURE ENCRYPTED
                    </span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                    {status.sources.map(source => (
                        <div
                            key={source.name}
                            className={`p-4 rounded-xl border transition-all duration-300 ${source.enabled && source.status === 'active'
                                ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                                : source.enabled && source.status === 'error'
                                    ? 'bg-red-500/5 border-red-500/20'
                                    : 'bg-white/5 border-white/5 opacity-40 grayscale'
                                }`}
                        >
                            <div className="text-2xl mb-3 flex justify-center">
                                {source.name === 'twitter' && <span className="text-white">𝕏</span>}
                                {source.name === 'reddit' && <span className="text-orange-500">🔴</span>}
                                {source.name === 'google' && <span className="text-blue-400">G</span>}
                                {source.name === 'gemini' && <span className="text-blue-300">✦</span>}
                                {source.name === 'openai' && <span className="text-green-400">🤖</span>}
                                {source.name === 'yahoo' && <span className="text-violet-400 font-bold">Y!</span>}
                                {source.name === 'dexscreener' && <span className="text-cyan-400">🦅</span>}
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {source.display_name}
                                </div>
                                <div className={`text-[9px] font-mono flex items-center justify-center gap-1.5 ${source.enabled ? (source.status === 'active' ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${source.enabled ? (source.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400') : 'bg-gray-600'
                                        }`} />
                                    {source.enabled ? (source.status === 'active' ? 'ONLINE' : 'ERROR') : 'OFFLINE'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
