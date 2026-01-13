'use client';

import { useState } from 'react';
import { Eye, Key, Shield } from 'lucide-react';

interface ConfigPanelProps {
    onSave: (source: string, config: any) => Promise<void>;
}

export function ConfigPanel({ onSave }: ConfigPanelProps) {
    const [activeSource, setActiveSource] = useState('google');
    const [keys, setKeys] = useState<any>({});
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            // In a real app, this would validate and save
            // For now we just log
            console.log('Saving config for', activeSource, keys);
            await onSave(activeSource, keys);
        } finally {
            setLoading(false);
        }
    };

    const updateKey = (key: string, value: string) => {
        setKeys((prev: any) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="border border-white/10 rounded-3xl bg-[#0D1117] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-black/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#F492B7]" />
                    API Configuration
                </h3>
                <p className="text-gray-500 text-xs mt-1">
                    Configure external data sources for enhanced market analysis
                </p>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <div className="w-1/4 border-r border-white/5 bg-black/20 p-2 space-y-1">
                    {['google', 'reddit', 'openai', 'twitter'].map(source => (
                        <button
                            key={source}
                            onClick={() => setActiveSource(source)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeSource === source
                                    ? 'bg-[#F492B7]/10 text-[#F492B7] border border-[#F492B7]/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            {source.charAt(0).toUpperCase() + source.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Form */}
                <div className="flex-1 p-6">
                    {activeSource === 'google' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Google API Key</label>
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                    placeholder="AIza..."
                                    onChange={e => updateKey('api_key', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Search Engine ID (CX)</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                    placeholder="0123456789..."
                                    onChange={e => updateKey('cx', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {activeSource === 'reddit' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Client ID</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                    placeholder="Client ID from Reddit App Prefs"
                                    onChange={e => updateKey('client_id', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Client Secret</label>
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                    placeholder="Secret..."
                                    onChange={e => updateKey('client_secret', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {activeSource === 'openai' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">OpenAI API Key</label>
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                    placeholder="sk-..."
                                    onChange={e => updateKey('api_key', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {activeSource === 'twitter' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Bearer Token</label>
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                    placeholder="AAAA..."
                                    onChange={e => updateKey('bearer_token', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-3 bg-[#F492B7]/10 text-[#F492B7] border border-[#F492B7]/30 rounded-xl font-bold hover:bg-[#F492B7]/20 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
