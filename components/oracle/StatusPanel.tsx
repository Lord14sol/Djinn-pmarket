'use client';

import { OracleStatus } from '../../lib/oracle';

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

    return (
        <div className="border border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-3 h-3 rounded-full ${status.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}
                        style={{ boxShadow: status.enabled ? '0 0 10px rgba(52, 211, 153, 0.5)' : 'none' }}
                    />
                    <h2 className="text-xl font-bold text-white">
                        Bot Status
                    </h2>
                    <span className={`text-sm font-mono px-3 py-1 rounded-full ${status.enabled
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                        {status.enabled ? 'ACTIVE' : 'OFFLINE'}
                    </span>
                </div>
                <button
                    onClick={onToggle}
                    disabled={isLoading}
                    className={`px-6 py-2.5 rounded-2xl font-bold transition-all disabled:opacity-50 ${status.enabled
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                        }`}
                >
                    {isLoading ? '...' : status.enabled ? '⏹ Stop' : '▶ Start'}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-gray-500 text-xs font-medium mb-1">Status</div>
                    <div className={`text-lg font-bold ${status.enabled ? 'text-emerald-400' : 'text-gray-400'}`}>
                        {status.enabled ? 'Running' : 'Stopped'}
                    </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-gray-500 text-xs font-medium mb-1">Last Check</div>
                    <div className="text-lg font-bold text-white">
                        {formatLastRun(status.last_run)}
                    </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-gray-500 text-xs font-medium mb-1">Pending</div>
                    <div className="text-lg font-bold text-[#F492B7]">
                        {status.pending_suggestions}
                    </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-gray-500 text-xs font-medium mb-1">Sources</div>
                    <div className="text-lg font-bold text-white">
                        {status.sources.filter(s => s.enabled).length}/{status.sources.length}
                    </div>
                </div>
            </div>

            {/* Sources Status */}
            <div>
                <h3 className="text-gray-400 text-sm font-medium mb-3">Data Sources</h3>
                <div className="flex flex-wrap gap-2">
                    {status.sources.map(source => (
                        <div
                            key={source.name}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border ${source.status === 'active'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                    : source.status === 'error'
                                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                        : 'border-white/10 bg-white/5 text-gray-500'
                                }`}
                        >
                            {source.display_name}
                            <span className="ml-2 text-xs">
                                {source.status === 'active' ? '●' : source.status === 'error' ? '⚠' : '○'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
