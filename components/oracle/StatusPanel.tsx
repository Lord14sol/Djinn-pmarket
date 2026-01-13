'use client';

import { OracleStatus } from '../../lib/oracle';
import { RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';

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
        <div className="border border-white/10 rounded-3xl bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm overflow-hidden">
            {/* Main Status Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                    {/* Animated Status Indicator */}
                    <div className="relative">
                        <div
                            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${status.enabled
                                    ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30'
                                    : 'bg-gradient-to-br from-gray-500/20 to-gray-600/10 border border-gray-500/30'
                                }`}
                        >
                            {status.enabled ? (
                                <Wifi className="w-8 h-8 text-emerald-400" />
                            ) : (
                                <WifiOff className="w-8 h-8 text-gray-400" />
                            )}
                        </div>
                        {status.enabled && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-pulse" />
                        )}
                    </div>

                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            Oracle Bot
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${status.enabled
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                }`}>
                                {status.enabled ? '● ONLINE' : '○ OFFLINE'}
                            </span>
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            {status.enabled
                                ? 'Actively monitoring markets for resolution events'
                                : 'Bot is paused - click Start to begin monitoring'
                            }
                        </p>
                    </div>
                </div>

                <button
                    onClick={onToggle}
                    disabled={isLoading}
                    className={`px-8 py-4 rounded-2xl font-black text-lg transition-all disabled:opacity-50 flex items-center gap-3 ${status.enabled
                            ? 'bg-red-500/20 text-red-400 border-2 border-red-500/30 hover:bg-red-500/30 hover:scale-105'
                            : 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/30 hover:bg-emerald-500/30 hover:scale-105'
                        }`}
                >
                    {isLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : status.enabled ? (
                        <>⏹ Stop Bot</>
                    ) : (
                        <>▶ Start Bot</>
                    )}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 divide-x divide-white/5">
                <div className="p-6 text-center">
                    <div className="text-3xl font-black text-white mb-1">
                        {formatLastRun(status.last_run)}
                    </div>
                    <div className="text-gray-500 text-sm font-medium">Last Check</div>
                </div>

                <div className="p-6 text-center">
                    <div className="text-3xl font-black text-[#F492B7] mb-1">
                        {status.pending_suggestions}
                    </div>
                    <div className="text-gray-500 text-sm font-medium">Pending Approvals</div>
                </div>

                <div className="p-6 text-center">
                    <div className="text-3xl font-black text-white mb-1">
                        {activeSources.length}
                    </div>
                    <div className="text-gray-500 text-sm font-medium">Active Sources</div>
                </div>
            </div>

            {/* Data Sources */}
            <div className="p-6 border-t border-white/5 bg-black/20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#F492B7]" />
                        Data Sources
                    </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {status.sources.map(source => (
                        <div
                            key={source.name}
                            className={`p-4 rounded-xl text-center transition-all ${source.enabled && source.status === 'active'
                                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                                    : source.enabled && source.status === 'error'
                                        ? 'bg-red-500/10 border border-red-500/30'
                                        : 'bg-white/5 border border-white/10 opacity-50'
                                }`}
                        >
                            <div className="text-2xl mb-2">
                                {source.name === 'twitter' && '𝕏'}
                                {source.name === 'reddit' && '🔴'}
                                {source.name === 'google' && '🔍'}
                                {source.name === 'gemini' && '✨'}
                                {source.name === 'openai' && '🤖'}
                            </div>
                            <div className={`text-sm font-bold ${source.enabled ? 'text-white' : 'text-gray-500'
                                }`}>
                                {source.display_name}
                            </div>
                            <div className={`text-xs mt-1 ${source.status === 'active' ? 'text-emerald-400' :
                                    source.status === 'error' ? 'text-red-400' : 'text-gray-500'
                                }`}>
                                {source.enabled ? (source.status === 'active' ? 'Connected' : source.status === 'error' ? 'Error' : 'Ready') : 'Disabled'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
