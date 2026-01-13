'use client';

import { OracleStatus } from '../../lib/oracle';
import { RefreshCw, Sparkles, Power, Zap, Activity } from 'lucide-react';

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
        <div className="border border-white/10 rounded-3xl bg-gradient-to-br from-[#F492B7]/5 via-transparent to-transparent backdrop-blur-sm overflow-hidden">
            {/* Main Status Header */}
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    {/* Animated Status Indicator - Djinn Style */}
                    <div className="relative">
                        <div
                            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${status.enabled
                                    ? 'bg-gradient-to-br from-[#F492B7]/30 to-[#F492B7]/10 border-2 border-[#F492B7]/50 shadow-[0_0_30px_rgba(244,146,183,0.3)]'
                                    : 'bg-gradient-to-br from-gray-500/20 to-gray-600/10 border-2 border-gray-500/30'
                                }`}
                        >
                            {status.enabled ? (
                                <Sparkles className="w-10 h-10 text-[#F492B7] animate-pulse" />
                            ) : (
                                <Power className="w-10 h-10 text-gray-400" />
                            )}
                        </div>
                        {status.enabled && (
                            <>
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#F492B7] rounded-full animate-ping opacity-75" />
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#F492B7] rounded-full" />
                            </>
                        )}
                    </div>

                    <div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            Oracle Bot
                            <span className={`text-sm font-black px-4 py-1.5 rounded-full transition-all ${status.enabled
                                    ? 'bg-[#F492B7]/20 text-[#F492B7] border border-[#F492B7]/40 shadow-[0_0_15px_rgba(244,146,183,0.2)]'
                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                }`}>
                                {status.enabled ? '● LIVE' : '○ OFF'}
                            </span>
                        </h2>
                        <p className="text-gray-400 text-sm mt-2 max-w-md">
                            {status.enabled
                                ? '✨ Actively monitoring markets and searching for resolution events'
                                : 'Bot is paused — Start to begin monitoring markets'
                            }
                        </p>
                    </div>
                </div>

                <button
                    onClick={onToggle}
                    disabled={isLoading}
                    className={`group px-10 py-5 rounded-2xl font-black text-lg transition-all duration-300 disabled:opacity-50 flex items-center gap-3 hover:scale-105 active:scale-95 ${status.enabled
                            ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border-2 border-red-500/40 hover:border-red-500/60 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                            : 'bg-gradient-to-r from-[#F492B7]/20 to-[#F492B7]/30 text-[#F492B7] border-2 border-[#F492B7]/50 hover:border-[#F492B7]/80 hover:shadow-[0_0_30px_rgba(244,146,183,0.3)]'
                        }`}
                >
                    {isLoading ? (
                        <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : status.enabled ? (
                        <>
                            <Power className="w-6 h-6 group-hover:rotate-180 transition-transform duration-300" />
                            Stop Bot
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-6 h-6 group-hover:scale-125 transition-transform duration-300" />
                            Start Bot
                        </>
                    )}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 bg-black/20">
                <div className="p-5 text-center hover:bg-white/5 transition-colors cursor-default">
                    <div className="text-3xl font-black text-white mb-1">
                        {formatLastRun(status.last_run)}
                    </div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Last Check</div>
                </div>

                <div className="p-5 text-center hover:bg-white/5 transition-colors cursor-default">
                    <div className="text-3xl font-black text-[#F492B7] mb-1">
                        {status.pending_suggestions}
                    </div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pending</div>
                </div>

                <div className="p-5 text-center hover:bg-white/5 transition-colors cursor-default">
                    <div className="text-3xl font-black text-white mb-1 flex items-center justify-center gap-2">
                        {activeSources.length}
                        <Activity className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Sources</div>
                </div>
            </div>

            {/* Data Sources */}
            <div className="p-6 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wider">
                        <Zap className="w-4 h-4 text-[#F492B7]" />
                        Data Sources
                    </h3>
                </div>
                <div className="grid grid-cols-5 gap-3">
                    {status.sources.map(source => (
                        <div
                            key={source.name}
                            className={`group p-4 rounded-2xl text-center transition-all duration-300 cursor-pointer hover:scale-105 ${source.enabled && source.status === 'active'
                                    ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/40 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]'
                                    : source.enabled && source.status === 'error'
                                        ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/40'
                                        : 'bg-white/5 border border-white/10 opacity-60 hover:opacity-100'
                                }`}
                        >
                            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                                {source.name === 'twitter' && '𝕏'}
                                {source.name === 'reddit' && '🔴'}
                                {source.name === 'google' && '🔍'}
                                {source.name === 'gemini' && '✨'}
                                {source.name === 'openai' && '🤖'}
                            </div>
                            <div className={`text-xs font-bold ${source.enabled ? 'text-white' : 'text-gray-500'
                                }`}>
                                {source.display_name}
                            </div>
                            <div className={`text-[10px] mt-1 font-medium ${source.status === 'active' ? 'text-emerald-400' :
                                    source.status === 'error' ? 'text-red-400' : 'text-gray-500'
                                }`}>
                                {source.enabled ? (source.status === 'active' ? '● Connected' : source.status === 'error' ? '● Error' : '○ Ready') : '○ Disabled'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
