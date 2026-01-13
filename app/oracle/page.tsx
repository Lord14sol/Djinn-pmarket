'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { OracleTerminal } from '../../components/oracle/OracleTerminal';
import { ResolutionQueue } from '../../components/oracle/ResolutionQueue';
import { StatusPanel } from '../../components/oracle/StatusPanel';
import { MarketMonitor } from '../../components/oracle/MarketMonitor';
import { OracleStatus, OracleLog, ResolutionSuggestion } from '../../lib/oracle';
import { ArrowLeft, Terminal, FileCheck, Eye, Shield } from 'lucide-react';

// Protocol Authority wallet address
const PROTOCOL_AUTHORITY = "G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma";

export default function OraclePage() {
    const { publicKey } = useWallet();
    const [status, setStatus] = useState<OracleStatus | null>(null);
    const [logs, setLogs] = useState<OracleLog[]>([]);
    const [suggestions, setSuggestions] = useState<ResolutionSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [activeTab, setActiveTab] = useState<'terminal' | 'queue' | 'markets'>('terminal');

    // Fetch all data
    const fetchData = useCallback(async () => {
        try {
            const [statusRes, logsRes, suggestionsRes] = await Promise.all([
                fetch('/api/oracle/status'),
                fetch('/api/oracle/logs?limit=100'),
                fetch('/api/oracle/suggestions'),
            ]);

            if (statusRes.ok) setStatus(await statusRes.json());
            if (logsRes.ok) setLogs(await logsRes.json());
            if (suggestionsRes.ok) setSuggestions(await suggestionsRes.json());
        } catch (error) {
            console.error('Failed to fetch oracle data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleToggle = async () => {
        if (!publicKey) return;
        setToggling(true);
        try {
            const action = status?.enabled ? 'stop' : 'start';
            const res = await fetch('/api/oracle/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, wallet: publicKey.toString() }),
            });
            if (res.ok) await fetchData();
        } catch (error) {
            console.error('Failed to toggle oracle:', error);
        } finally {
            setToggling(false);
        }
    };

    const handleAddLink = async (slug: string) => {
        // Log to terminal that we're searching
        console.log('Searching for market:', slug);
        // TODO: Trigger actual search
    };

    const handleApprove = async (id: string, marketSlug: string, outcome: string) => {
        if (!publicKey) return;
        const res = await fetch('/api/oracle/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                suggestionId: id,
                action: 'approve',
                wallet: publicKey.toString(),
                marketSlug,
                outcome,
            }),
        });
        if (res.ok) {
            setSuggestions(prev => prev.filter(s => s.id !== id));
            await fetchData();
        }
    };

    const handleReject = async (id: string) => {
        if (!publicKey) return;
        const res = await fetch('/api/oracle/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                suggestionId: id,
                action: 'reject',
                wallet: publicKey.toString(),
            }),
        });
        if (res.ok) {
            setSuggestions(prev => prev.filter(s => s.id !== id));
        }
    };

    const isAuthorized = publicKey?.toString() === PROTOCOL_AUTHORITY;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0E14] via-[#12151f] to-[#0B0E14] flex items-center justify-center">
                <div className="text-[#F492B7] font-bold text-xl animate-pulse flex items-center gap-3">
                    <span className="text-4xl">✨</span>
                    Initializing Oracle Bot...
                </div>
            </div>
        );
    }

    if (!publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0E14] via-[#12151f] to-[#0B0E14] flex flex-col items-center justify-center px-4">
                <div className="text-7xl mb-6">🔮</div>
                <h1 className="text-4xl font-black text-white mb-4 text-center">
                    Oracle Access Required
                </h1>
                <p className="text-gray-400 text-center max-w-md">
                    Connect your wallet to access the Oracle Bot control panel.
                </p>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0E14] via-[#12151f] to-[#0B0E14] flex flex-col items-center justify-center px-4">
                <div className="w-24 h-24 rounded-3xl bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mb-6">
                    <Shield className="w-12 h-12 text-red-400" />
                </div>
                <h1 className="text-4xl font-black text-red-400 mb-4 text-center">
                    Access Denied
                </h1>
                <p className="text-gray-400 text-center max-w-md mb-8">
                    Only the Protocol Authority can access the Oracle Bot.
                </p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 font-mono text-xs max-w-md">
                    <div className="text-gray-500 mb-2">Your Wallet:</div>
                    <div className="text-white break-all mb-4">{publicKey.toString()}</div>
                    <div className="text-gray-500 mb-2">Required:</div>
                    <div className="text-[#F492B7] break-all">{PROTOCOL_AUTHORITY}</div>
                </div>
                <Link
                    href="/"
                    className="mt-8 px-8 py-4 bg-gradient-to-r from-[#F492B7]/20 to-[#F492B7]/30 text-[#F492B7] rounded-2xl font-bold hover:shadow-[0_0_30px_rgba(244,146,183,0.2)] hover:scale-105 active:scale-95 transition-all border border-[#F492B7]/40 flex items-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Markets
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B0E14] via-[#12151f] to-[#0B0E14]">
            {/* Header */}
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-gray-400 hover:text-[#F492B7] transition-all group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            Markets
                        </Link>
                        <div className="w-px h-6 bg-white/10" />
                        <h1 className="text-3xl font-black text-white flex items-center gap-3">
                            <span className="text-4xl">✨</span>
                            <span>Oracle Bot</span>
                            <span className="text-[#F492B7] text-sm font-black bg-[#F492B7]/10 px-3 py-1 rounded-full border border-[#F492B7]/30">
                                BETA
                            </span>
                        </h1>
                    </div>
                    <div className="text-gray-500 font-mono text-sm bg-white/5 px-4 py-2 rounded-xl">
                        {new Date().toLocaleTimeString()}
                    </div>
                </div>

                {/* Status Panel */}
                {status && (
                    <div className="mb-8">
                        <StatusPanel
                            status={status}
                            onToggle={handleToggle}
                            isLoading={toggling}
                        />
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('terminal')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 ${activeTab === 'terminal'
                                ? 'bg-gradient-to-r from-[#F492B7]/20 to-[#F492B7]/30 text-[#F492B7] border border-[#F492B7]/40 shadow-[0_0_20px_rgba(244,146,183,0.15)]'
                                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10'
                            }`}
                    >
                        <Terminal className="w-5 h-5" />
                        Live Terminal
                    </button>
                    <button
                        onClick={() => setActiveTab('markets')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 ${activeTab === 'markets'
                                ? 'bg-gradient-to-r from-[#F492B7]/20 to-[#F492B7]/30 text-[#F492B7] border border-[#F492B7]/40 shadow-[0_0_20px_rgba(244,146,183,0.15)]'
                                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10'
                            }`}
                    >
                        <Eye className="w-5 h-5" />
                        Markets
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 ${activeTab === 'queue'
                                ? 'bg-gradient-to-r from-[#F492B7]/20 to-[#F492B7]/30 text-[#F492B7] border border-[#F492B7]/40 shadow-[0_0_20px_rgba(244,146,183,0.15)]'
                                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10'
                            }`}
                    >
                        <FileCheck className="w-5 h-5" />
                        Resolution Queue
                        {suggestions.length > 0 && (
                            <span className="px-2.5 py-1 bg-[#F492B7] text-black text-xs font-black rounded-full animate-pulse">
                                {suggestions.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[500px]">
                    {activeTab === 'terminal' && (
                        <OracleTerminal initialLogs={logs} />
                    )}
                    {activeTab === 'markets' && (
                        <MarketMonitor onAddLink={handleAddLink} />
                    )}
                    {activeTab === 'queue' && (
                        <ResolutionQueue
                            suggestions={suggestions}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-gray-600 text-sm">
                    <p>Oracle Bot v1.0 • Monitoring markets 24/7 • Powered by Gemini AI</p>
                </div>
            </div>
        </div>
    );
}
