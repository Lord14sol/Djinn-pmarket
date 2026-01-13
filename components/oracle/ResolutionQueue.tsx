'use client';

import { useState } from 'react';
import { ResolutionSuggestion } from '../../lib/oracle';

interface ResolutionQueueProps {
    suggestions: ResolutionSuggestion[];
    onApprove: (id: string, slug: string, outcome: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
}

export function ResolutionQueue({ suggestions, onApprove, onReject }: ResolutionQueueProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleApprove = async (s: ResolutionSuggestion) => {
        if (s.suggested_outcome === 'UNCERTAIN') {
            alert('Cannot approve UNCERTAIN suggestions. The market needs more evidence.');
            return;
        }
        setProcessingId(s.id);
        try {
            await onApprove(s.id, s.market_slug, s.suggested_outcome);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            await onReject(id);
        } finally {
            setProcessingId(null);
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
        if (confidence >= 60) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
        return 'text-red-400 bg-red-500/20 border-red-500/30';
    };

    const getOutcomeStyles = (outcome: string) => {
        switch (outcome) {
            case 'YES': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'NO': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
    };

    if (suggestions.length === 0) {
        return (
            <div className="text-center py-16 border border-white/10 rounded-3xl bg-white/5">
                <div className="text-5xl mb-4">🔮</div>
                <p className="text-gray-400 font-medium">
                    No pending resolutions
                </p>
                <p className="text-gray-600 text-sm mt-1">
                    Oracle is monitoring active markets...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {suggestions.map((s) => (
                <div
                    key={s.id}
                    className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden hover:border-[#F492B7]/30 transition-all"
                >
                    {/* Header */}
                    <div className="p-5 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-lg truncate">
                                {s.market_title || s.market_slug}
                            </h3>
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                                {/* Outcome Badge */}
                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getOutcomeStyles(s.suggested_outcome)}`}>
                                    {s.suggested_outcome}
                                </span>

                                {/* Confidence */}
                                <span className={`px-3 py-1 rounded-full text-sm font-mono border ${getConfidenceColor(s.confidence)}`}>
                                    {s.confidence}% confidence
                                </span>

                                {/* Sources */}
                                <span className="text-gray-500 text-sm">
                                    via {s.sources_used?.join(', ') || 'AI analysis'}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                            {s.suggested_outcome !== 'UNCERTAIN' && (
                                <button
                                    onClick={() => handleApprove(s)}
                                    disabled={!!processingId}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold transition-all disabled:opacity-50"
                                >
                                    {processingId === s.id ? '...' : '✓ Approve'}
                                </button>
                            )}
                            <button
                                onClick={() => handleReject(s.id)}
                                disabled={!!processingId}
                                className="px-5 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-bold transition-all disabled:opacity-50"
                            >
                                {processingId === s.id ? '...' : '✗ Reject'}
                            </button>
                        </div>
                    </div>

                    {/* Expand Toggle */}
                    <button
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        className="w-full px-5 py-3 text-left text-sm text-gray-500 hover:text-[#F492B7] hover:bg-white/5 border-t border-white/5 transition-all"
                    >
                        {expandedId === s.id ? '▼' : '▶'} View AI Analysis & Evidence
                    </button>

                    {/* Expanded Content */}
                    {expandedId === s.id && (
                        <div className="px-5 pb-5 space-y-4 border-t border-white/5 bg-black/20">
                            {/* AI Reasoning */}
                            <div className="mt-4">
                                <h4 className="text-[#F492B7] text-sm font-medium mb-2">🧠 AI Analysis</h4>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {s.ai_analysis || 'No analysis available'}
                                </p>
                            </div>

                            {/* Evidence */}
                            {s.evidence && s.evidence.length > 0 && (
                                <div>
                                    <h4 className="text-[#F492B7] text-sm font-medium mb-2">📋 Evidence ({s.evidence.length})</h4>
                                    <div className="space-y-2">
                                        {s.evidence.map((e, i) => (
                                            <a
                                                key={i}
                                                href={e.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#F492B7]/30 transition-all"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className="text-gray-500 text-xs uppercase shrink-0">
                                                        [{e.source}]
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-white font-medium text-sm truncate">{e.title}</p>
                                                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{e.snippet}</p>
                                                    </div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
