'use client';

import { useEffect, useRef, useState } from 'react';
import { OracleLog, subscribeToLogs } from '../../lib/oracle';

interface OracleTerminalProps {
    initialLogs: OracleLog[];
}

const TYPE_COLORS: Record<string, string> = {
    system: 'text-blue-400',
    fetch: 'text-emerald-400',
    analyze: 'text-yellow-400',
    suggest: 'text-purple-400',
    approve: 'text-emerald-400',
    reject: 'text-red-400',
    error: 'text-red-500',
    warning: 'text-orange-400',
};

const TYPE_ICONS: Record<string, string> = {
    system: '⚙️',
    fetch: '📡',
    analyze: '🧠',
    suggest: '💡',
    approve: '✅',
    reject: '❌',
    error: '🚨',
    warning: '⚠️',
};

export function OracleTerminal({ initialLogs }: OracleTerminalProps) {
    const [logs, setLogs] = useState<OracleLog[]>(initialLogs);
    const [isPaused, setIsPaused] = useState(false);
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const channel = subscribeToLogs((newLog: OracleLog) => {
            setLogs((prev: OracleLog[]) => [newLog, ...prev].slice(0, 200));
        });

        return () => {
            channel.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!isPaused && terminalRef.current) {
            terminalRef.current.scrollTop = 0;
        }
    }, [logs, isPaused]);

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="relative">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white/5 border border-white/10 border-b-0 rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-gray-400 font-mono text-sm ml-2">
                        oracle.log
                    </span>
                </div>
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isPaused
                            ? 'bg-[#F492B7]/20 text-[#F492B7] border border-[#F492B7]/30'
                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                        }`}
                >
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
            </div>

            {/* Terminal Body */}
            <div
                ref={terminalRef}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                className="h-[400px] overflow-y-auto bg-[#0a0d12] border border-white/10 border-t-0 rounded-b-2xl font-mono text-sm p-4"
            >
                {logs.length === 0 ? (
                    <div className="text-gray-500 flex items-center gap-2">
                        <span className="animate-pulse">●</span>
                        Waiting for oracle events...
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex gap-3 py-1.5 hover:bg-white/5 rounded px-2 -mx-2 group">
                            {/* Timestamp */}
                            <span className="text-gray-600 shrink-0">
                                {formatTimestamp(log.created_at)}
                            </span>

                            {/* Type Icon */}
                            <span className="shrink-0">
                                {TYPE_ICONS[log.type] || '📋'}
                            </span>

                            {/* Source */}
                            <span className="text-gray-500 shrink-0 w-16 truncate">
                                {log.source || 'system'}
                            </span>

                            {/* Message */}
                            <span className={`${TYPE_COLORS[log.type] || 'text-gray-300'}`}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
