'use client';

import React, { useState } from 'react';

// Close Icon
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

// Plus Icon
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

// Trash Icon
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

// Sparkle Icon
const SparkleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

interface CreateMarketModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type MarketType = 'binary' | 'multiple';

const EMOJI_OPTIONS = ['🇦🇷', '₿', '💊', '🥱', '🎮', '🇨🇳', '☀️', '🇺🇸', '⚽', '🏈', '🏀', '🎾', '🏐', '⚾', '🎯', '🎲', '🎰', '🎪', '🎭', '🎨', '🎬', '🎹', '🎺', '🎻', '📱', '💻', '🖥️', '⌚', '📷', '📺', '🔬', '🔭', '⚗️', '🧬', '🚀', '✈️', '🚁', '⛵', '🏆', '🥇', '🥈', '🥉', '💰', '💵', '💎', '📈', '📉', '🌍', '🌎', '🌏', '⭐', '🌟', '💫', '🔥', '⚡', '💧', '🌊'];

export default function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
    const [marketType, setMarketType] = useState<MarketType>('binary');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Politics');
    const [selectedEmoji, setSelectedEmoji] = useState('🎯');
    const [endDate, setEndDate] = useState('');
    const [resolutionSource, setResolutionSource] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // For multiple choice markets
    const [participants, setParticipants] = useState<string[]>(['', '']);

    const addParticipant = () => {
        setParticipants([...participants, '']);
    };

    const removeParticipant = (index: number) => {
        if (participants.length > 2) {
            setParticipants(participants.filter((_, i) => i !== index));
        }
    };

    const updateParticipant = (index: number, value: string) => {
        const newParticipants = [...participants];
        newParticipants[index] = value;
        setParticipants(newParticipants);
    };

    const handleSubmit = () => {
        const marketData = {
            type: marketType,
            title,
            description,
            category,
            icon: selectedEmoji,
            endDate,
            resolutionSource,
            ...(marketType === 'multiple' && { participants })
        };
        console.log('Creating market:', marketData);
        // TODO: Submit to backend
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Glow Effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[600px] h-[600px] bg-[#F492B7]/20 rounded-full blur-[120px]"></div>
            </div>

            {/* Modal */}
            <div className="relative bg-gradient-to-b from-[#0f1219] to-[#0B0E14] border border-[#F492B7]/20 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[0_0_80px_rgba(244,146,183,0.4)] animate-in zoom-in-95 duration-300">

                {/* Header with gradient */}
                <div className="sticky top-0 bg-gradient-to-r from-[#F492B7]/10 via-[#F492B7]/5 to-transparent border-b border-[#F492B7]/20 p-8 flex justify-between items-center z-10 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F492B7]/20 flex items-center justify-center border border-[#F492B7]/30">
                            <SparkleIcon />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                                Create Market
                            </h2>
                            <p className="text-sm text-gray-400 mt-1">Design your prediction market</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-all p-3 hover:bg-white/10 rounded-2xl hover:rotate-90 duration-300"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Content with better spacing */}
                <div className="p-8 space-y-8">

                    {/* Market Type Selection - Enhanced */}
                    <div>
                        <label className="block text-xs font-black text-[#F492B7] uppercase tracking-[0.2em] mb-4">
                            Market Type
                        </label>
                        <div className="grid grid-cols-2 gap-5">
                            <button
                                onClick={() => setMarketType('binary')}
                                className={`group p-6 rounded-[24px] border-2 transition-all duration-300 relative overflow-hidden ${marketType === 'binary'
                                    ? 'bg-gradient-to-br from-[#F492B7]/20 to-[#F492B7]/5 border-[#F492B7] shadow-[0_0_30px_rgba(244,146,183,0.3)]'
                                    : 'bg-white/[0.02] border-white/10 hover:border-white/30 hover:bg-white/[0.05]'
                                    }`}
                            >
                                {marketType === 'binary' && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#F492B7]/10 to-transparent opacity-50"></div>
                                )}
                                <div className="relative">
                                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎯</div>
                                    <div className="text-xl font-black mb-2" style={{ fontFamily: 'var(--font-adriane), serif' }}>Yes/No</div>
                                    <div className="text-sm text-gray-400">Binary outcome market</div>
                                </div>
                            </button>
                            <button
                                onClick={() => setMarketType('multiple')}
                                className={`group p-6 rounded-[24px] border-2 transition-all duration-300 relative overflow-hidden ${marketType === 'multiple'
                                    ? 'bg-gradient-to-br from-[#F492B7]/20 to-[#F492B7]/5 border-[#F492B7] shadow-[0_0_30px_rgba(244,146,183,0.3)]'
                                    : 'bg-white/[0.02] border-white/10 hover:border-white/30 hover:bg-white/[0.05]'
                                    }`}
                            >
                                {marketType === 'multiple' && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#F492B7]/10 to-transparent opacity-50"></div>
                                )}
                                <div className="relative">
                                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏆</div>
                                    <div className="text-xl font-black mb-2" style={{ fontFamily: 'var(--font-adriane), serif' }}>Multiple Choice</div>
                                    <div className="text-sm text-gray-400">2+ participants</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Market Title - Enhanced */}
                    <div>
                        <label className="block text-xs font-black text-[#F492B7] uppercase tracking-[0.2em] mb-4">
                            Market Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={marketType === 'binary' ? 'e.g., Will Bitcoin reach $150k in 2026?' : 'e.g., Who will win the 2026 World Cup?'}
                            className="w-full bg-black/50 border-2 border-white/10 rounded-[20px] p-5 text-lg text-white placeholder-gray-500 focus:border-[#F492B7] focus:bg-black/70 outline-none transition-all shadow-inner"
                        />
                    </div>

                    {/* Icon Selector - Enhanced */}
                    <div>
                        <label className="block text-xs font-black text-[#F492B7] uppercase tracking-[0.2em] mb-4">
                            Market Icon
                        </label>
                        <div className="flex gap-5 items-center">
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="w-24 h-24 bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/10 rounded-[20px] flex items-center justify-center text-5xl hover:border-[#F492B7] hover:scale-105 transition-all duration-300 hover:shadow-[0_0_30px_rgba(244,146,183,0.3)]"
                            >
                                {selectedEmoji}
                            </button>
                            <div className="flex-1">
                                <div className="text-sm text-gray-300 font-medium mb-1">
                                    Choose an icon for your market
                                </div>
                                <div className="text-xs text-gray-500">
                                    Click the box to browse {EMOJI_OPTIONS.length}+ options
                                </div>
                            </div>
                        </div>

                        {showEmojiPicker && (
                            <div className="mt-6 p-5 bg-black/50 border-2 border-[#F492B7]/20 rounded-[20px] grid grid-cols-10 gap-2 max-h-64 overflow-y-auto shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
                                {EMOJI_OPTIONS.map((emoji, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSelectedEmoji(emoji);
                                            setShowEmojiPicker(false);
                                        }}
                                        className="w-12 h-12 flex items-center justify-center text-2xl hover:bg-[#F492B7]/20 rounded-xl transition-all hover:scale-125 active:scale-95"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Participants (Multiple Choice Only) - Enhanced */}
                    {marketType === 'multiple' && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="block text-xs font-black text-[#F492B7] uppercase tracking-[0.2em] mb-4">
                                Participants * <span className="text-gray-500 normal-case tracking-normal">({participants.length} options)</span>
                            </label>
                            <div className="space-y-3">
                                {participants.map((participant, index) => (
                                    <div key={index} className="flex gap-3 group">
                                        <div className="flex-shrink-0 w-10 h-14 rounded-xl bg-[#F492B7]/10 border border-[#F492B7]/20 flex items-center justify-center font-black text-[#F492B7]">
                                            {index + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={participant}
                                            onChange={(e) => updateParticipant(index, e.target.value)}
                                            placeholder={`Option ${index + 1} (e.g., ${index === 0 ? 'Argentina' : index === 1 ? 'Brazil' : 'France'})`}
                                            className="flex-1 bg-black/50 border-2 border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:border-[#F492B7] focus:bg-black/70 outline-none transition-all"
                                        />
                                        {participants.length > 2 && (
                                            <button
                                                onClick={() => removeParticipant(index)}
                                                className="px-5 bg-red-500/10 border-2 border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 hover:border-red-500/40 transition-all hover:scale-105 active:scale-95"
                                            >
                                                <TrashIcon />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={addParticipant}
                                    className="w-full py-4 px-5 bg-gradient-to-r from-[#F492B7]/10 to-[#F492B7]/5 border-2 border-[#F492B7]/20 rounded-xl text-[#F492B7] hover:border-[#F492B7]/40 hover:from-[#F492B7]/15 hover:to-[#F492B7]/10 transition-all flex items-center justify-center gap-3 font-black text-sm uppercase tracking-wider hover:scale-[1.02] active:scale-95"
                                >
                                    <PlusIcon />
                                    Add Participant
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Description - Enhanced */}
                    <div>
                        <label className="block text-xs font-black text-[#F492B7] uppercase tracking-[0.2em] mb-4">
                            Description & Resolution Rules *
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Explain how this market works, what triggers YES/NO, and where you'll get the official result from..."
                            rows={5}
                            className="w-full bg-black/50 border-2 border-white/10 rounded-[20px] p-5 text-white placeholder-gray-500 focus:border-[#F492B7] focus:bg-black/70 outline-none transition-all resize-none shadow-inner"
                        />
                    </div>

                    {/* Two Column Layout for Category and End Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Category */}
                        <div>
                            <label className="block text-xs font-black text-[#F492B7] uppercase tracking-[0.2em] mb-4">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-black/50 border-2 border-white/10 rounded-xl p-4 text-white focus:border-[#F492B7] focus:bg-black/70 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="Politics">Politics</option>
                                <option value="Crypto">Crypto</option>
                                <option value="Sports">Sports</option>
                                <option value="Culture">Culture</option>
                                <option value="Tech">Tech</option>
                                <option value="Science">Science</option>
                                <option value="Finance">Finance</option>
                                <option value="Climate">Climate</option>
                            </select>
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-xs font-black text-[#F492B7] uppercase tracking-[0.2em] mb-4">
                                Close Date *
                            </label>
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-black/50 border-2 border-white/10 rounded-xl p-4 text-white focus:border-[#F492B7] focus:bg-black/70 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Resolution Source - Enhanced */}
                    <div>
                        <label className="block text-xs font-black text-[#F492B7] uppercase tracking-[0.2em] mb-4">
                            Resolution Source *
                        </label>
                        <input
                            type="text"
                            value={resolutionSource}
                            onChange={(e) => setResolutionSource(e.target.value)}
                            placeholder="e.g., CoinMarketCap, FIFA Official, Reuters, Bloomberg"
                            className="w-full bg-black/50 border-2 border-white/10 rounded-[20px] p-5 text-white placeholder-gray-500 focus:border-[#F492B7] focus:bg-black/70 outline-none transition-all shadow-inner"
                        />
                        <div className="mt-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                            <p className="text-xs text-blue-300 font-medium flex items-start gap-2">
                                <span className="text-lg">ℹ️</span>
                                <span>Specify the official, trusted source that will be used to determine the outcome. This builds trust with traders.</span>
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer - Enhanced */}
                <div className="sticky bottom-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14] to-transparent border-t border-[#F492B7]/20 p-8 flex gap-4 backdrop-blur-xl">
                    <button
                        onClick={onClose}
                        className="flex-1 py-5 px-8 bg-white/5 border-2 border-white/10 rounded-[20px] text-white font-black hover:bg-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-95 text-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title || !description || !endDate || !resolutionSource || (marketType === 'multiple' && participants.some(p => !p))}
                        className="flex-1 py-5 px-8 bg-gradient-to-r from-[#F492B7] to-[#ff6fb7] text-black rounded-[20px] font-black hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(244,146,183,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:from-gray-600 disabled:to-gray-700 text-lg uppercase tracking-wide"
                    >
                        Create Market
                    </button>
                </div>

            </div>
        </div>
    );
}