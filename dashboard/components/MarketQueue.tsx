'use client';
import { useEffect, useState } from 'react';

interface QueueItem {
    market: { question: string; address?: string };
    priority: number;
    status: string;
    retries: number;
}

export function MarketQueue() {
    const [queue, setQueue] = useState<QueueItem[]>([]);

    useEffect(() => {
        // Fetch queue data from API
        // Simplified for this artifact
        fetch('/api/oracle/queue').then(r => r.json()).then(d => setQueue(d.queue || []));
    }, []);

    return (
        <div className="bg-gray-800/50 border border-white/5 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-white/5 uppercase font-mono text-xs">
                    <tr>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Market Question</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Retries</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {queue.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center">Queue Empty</td></tr>
                    ) : queue.map((item, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.priority >= 8 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    Lvl {item.priority}
                                </span>
                            </td>
                            <td className="p-3 font-medium text-white">{item.market.question}</td>
                            <td className="p-3">
                                {item.status === 'processing' ? (
                                    <span className="flex items-center gap-2 text-neon-blue">
                                        <span className="animate-spin text-xs">⚙️</span> Processing
                                    </span>
                                ) : (
                                    <span>Pending</span>
                                )}
                            </td>
                            <td className="p-3">{item.retries > 0 ? `⚠️ ${item.retries}` : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
