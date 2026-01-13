'use client';

import { useState, useEffect } from 'react';
import { Eye, Key, Shield, Plus, Trash2, Globe } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

interface ConfigPanelProps {
    onSave: (source: string, config: any) => Promise<void>;
}

export function ConfigPanel({ onSave }: ConfigPanelProps) {
    const { publicKey } = useWallet();
    const [activeSource, setActiveSource] = useState('google');
    const [keys, setKeys] = useState<any>({});
    const [customUrls, setCustomUrls] = useState<string[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    // Load existing config (mock for now, ideally fetch from API)
    useEffect(() => {
        // In a real app, fetch /api/oracle/config?source=activeSource here
    }, [activeSource]);

    const handleSave = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            if (activeSource === 'custom') {
                await saveConfig('custom_urls', { urls: customUrls });
            } else {
                await saveConfig(activeSource, keys);
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error(err);
            alert('Failed to save configuration');
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async (source: string, config: any) => {
        const res = await fetch('/api/oracle/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source,
                config,
                wallet: publicKey?.toString()
            })
        });
        if (!res.ok) throw new Error('Failed to save');
    };

    const updateKey = (key: string, value: string) => {
        setKeys((prev: any) => ({ ...prev, [key]: value }));
    };

    const addCustomUrl = () => {
        if (newUrl && !customUrls.includes(newUrl)) {
            setCustomUrls([...customUrls, newUrl]);
            setNewUrl('');
        }
    };

    const removeCustomUrl = (url: string) => {
        setCustomUrls(customUrls.filter(u => u !== url));
    };

    return (
        <div className="border border-white/10 rounded-3xl bg-[#0D1117] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-black/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#F492B7]" />
                    API & Source Configuration
                </h3>
                <p className="text-gray-500 text-xs mt-1">
                    Configure external data sources and custom monitoring pages
                </p>
            </div>

            <div className="flex min-h-[400px]">
                {/* Sidebar */}
                <div className="w-1/4 border-r border-white/5 bg-black/20 p-2 space-y-1">
                    {['google', 'reddit', 'openai', 'twitter', 'gemini'].map(source => (
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
                    <div className="h-px bg-white/10 my-2" />
                    <button
                        onClick={() => setActiveSource('custom')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeSource === 'custom'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                    >
                        + Custom Pages
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 p-6 relative">
                    {activeSource === 'custom' ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Add Monitoring Page</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newUrl}
                                        onChange={(e) => setNewUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCustomUrl()}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
                                        placeholder="https://example.com/news..."
                                    />
                                    <button
                                        onClick={addCustomUrl}
                                        className="px-4 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30 hover:bg-purple-500/30"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Monitored Pages ({customUrls.length})</label>
                                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                    {customUrls.length === 0 && (
                                        <div className="text-gray-600 text-sm italic">No custom pages added.</div>
                                    )}
                                    {customUrls.map((url, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                                                <span className="text-sm text-gray-300 truncate">{url}</span>
                                            </div>
                                            <button
                                                onClick={() => removeCustomUrl(url)}
                                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeSource === 'gemini' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Gemini API Key</label>
                                    <input
                                        type="password"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                        placeholder="AIza..."
                                        onChange={e => updateKey('api_key', e.target.value)}
                                    />
                                    <p className="text-xs text-green-400 mt-2">✓ Key active in database</p>
                                </div>
                            )}

                            {activeSource === 'google' && (
                                <>
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
                                </>
                            )}

                            {activeSource === 'reddit' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Client ID</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                            placeholder="Client ID..."
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
                                </>
                            )}

                            {activeSource === 'openai' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">OpenAI API Key</label>
                                    <input
                                        type="password"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                        placeholder="sk-..."
                                        onChange={e => updateKey('api_key', e.target.value)}
                                    />
                                </div>
                            )}

                            {activeSource === 'twitter' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Bearer Token</label>
                                    <input
                                        type="password"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#F492B7]/50 focus:outline-none transition-colors"
                                        placeholder="AAAA..."
                                        onChange={e => updateKey('bearer_token', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="absolute bottom-6 right-6">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className={`px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${saved
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-[#F492B7]/10 text-[#F492B7] border border-[#F492B7]/30 hover:bg-[#F492B7]/20'
                                }`}
                        >
                            {loading ? 'Saving...' : saved ? 'Saved Successfully!' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
