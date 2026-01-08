'use client';

import React, { useState } from 'react';

// --- ICONOS MANTENIDOS ---
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);
const SparkleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

interface CreateMarketModalProps { isOpen: boolean; onClose: () => void; }
type MarketType = 'binary' | 'multiple';
const EMOJI_OPTIONS = ['🇦🇷', '₿', '💊', '🥱', '🎮', '🇨🇳', '☀️', '🇺🇸', '⚽', '🏈', '🏀', '🎾', '🏐', '⚾', '🎯', '🎲', '🎰', '🎪', '🎭', '🎨', '🎬', '🎹', '🎺', '🎻', '📱', '💻', '🖥️', '⌚', '📷', '📺', '🔬', '🔭', '⚗️', '🧬', '🚀', '✈️', '🚁', '⛵', '🏆', '💰', '🔥', '⚡', '💎'];

export default function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
    const [marketType, setMarketType] = useState<MarketType>('binary');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Politics');
    const [selectedEmoji, setSelectedEmoji] = useState('🎯');
    const [endDate, setEndDate] = useState('');
    const [resolutionSource, setResolutionSource] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [participants, setParticipants] = useState<string[]>(['', '']);

    const addParticipant = () => setParticipants([...participants, '']);
    const removeParticipant = (index: number) => { if (participants.length > 2) setParticipants(participants.filter((_, i) => i !== index)); };
    const updateParticipant = (index: number, value: string) => {
        const newParticipants = [...participants];
        newParticipants[index] = value;
        setParticipants(newParticipants);
    };

    const handleSubmit = () => {
        const newMarket = {
            id: Date.now().toString(),
            question: title, // USAR QUESTION PARA MATCH CON EL PERFIL
            type: marketType,
            description,
            category,
            icon: selectedEmoji,
            image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832",
            endDate,
            resolutionSource,
            participants: marketType === 'multiple' ? participants : ['Yes', 'No'],
            timestamp: new Date().toISOString(),
            status: 'LIVE'
        };

        const existing = JSON.parse(localStorage.getItem('djinn_created_markets') || '[]');
        localStorage.setItem('djinn_created_markets', JSON.stringify([newMarket, ...existing]));

        // DISPARAR EL EVENTO PARA QUE EL PERFIL SE ENTERE
        window.dispatchEvent(new Event('storage'));

        onClose();
        setTitle('');
        setDescription('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-[#080808] border border-white/10 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="sticky top-0 bg-[#080808]/80 border-b border-white/5 p-8 flex justify-between items-center z-10 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F492B7]/10 flex items-center justify-center border border-[#F492B7]/20"><SparkleIcon /></div>
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Summon Market</h2>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase font-black tracking-[0.3em]">Forge the future destiny</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-3 hover:bg-white/5 rounded-2xl"><CloseIcon /></button>
                </div>
                <div className="p-10 space-y-10">
                    <div>
                        <label className="block text-[10px] font-black text-[#F492B7] uppercase tracking-[0.3em] mb-4 opacity-60">Architecture</label>
                        <div className="grid grid-cols-2 gap-6">
                            <button onClick={() => setMarketType('binary')} className={`group p-8 rounded-[2rem] border-2 transition-all duration-500 ${marketType === 'binary' ? 'bg-[#F492B7]/5 border-[#F492B7]' : 'bg-white/[0.02] border-white/5'}`}>
                                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎯</div>
                                <div className="text-xl font-black mb-2 uppercase tracking-tight">Binary Market</div>
                            </button>
                            <button onClick={() => setMarketType('multiple')} className={`group p-8 rounded-[2rem] border-2 transition-all duration-500 ${marketType === 'multiple' ? 'bg-[#F492B7]/5 border-[#F492B7]' : 'bg-white/[0.02] border-white/5'}`}>
                                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
                                <div className="text-xl font-black mb-2 uppercase tracking-tight">Multiple Choice</div>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4">The Prediction Question *</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Will Bitcoin reach $150k in 2026?" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-xl font-black text-white focus:border-[#F492B7] outline-none transition-all placeholder:opacity-20" />
                    </div>
                    {marketType === 'multiple' && (
                        <div className="space-y-4">
                            {participants.map((p, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <input type="text" value={p} onChange={(e) => updateParticipant(idx, e.target.value)} placeholder={`Option ${idx + 1}`} className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl p-5 text-white font-bold outline-none focus:border-[#F492B7]" />
                                    {participants.length > 2 && <button onClick={() => removeParticipant(idx)} className="px-6 bg-red-500/10 text-red-500 rounded-xl font-black">-</button>}
                                </div>
                            ))}
                            <button onClick={addParticipant} className="w-full py-4 border-2 border-dashed border-[#F492B7]/20 rounded-xl text-[#F492B7] font-black uppercase text-[10px] tracking-widest hover:bg-[#F492B7]/5 transition-all">+ Add Outcome Path</button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4">Fate Close Date *</label>
                            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-white outline-none focus:border-[#F492B7]" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4">Oracle Source *</label>
                            <input type="text" value={resolutionSource} onChange={(e) => setResolutionSource(e.target.value)} placeholder="Bloomberg, Reuters, On-chain" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-white outline-none focus:border-[#F492B7]" />
                        </div>
                    </div>
                </div>
                <div className="sticky bottom-0 bg-[#080808] border-t border-white/5 p-10 flex gap-6 backdrop-blur-xl">
                    <button onClick={onClose} className="flex-1 py-6 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                    <button onClick={handleSubmit} disabled={!title || !endDate} className="flex-1 py-6 bg-[#F492B7] text-black rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-[0_0_50px_rgba(244,146,183,0.3)] hover:scale-[1.02] transition-all">Summon Market</button>
                </div>
            </div>
        </div>
    );
}