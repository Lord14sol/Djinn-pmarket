'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, TrendingUp, Globe, ScrollText, Target, ArrowRight, Check, Coins, DollarSign, BarChart3, Wallet, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

interface HowItWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabKey = 'START' | 'PICK' | 'BET' | 'CREATE' | 'CHRONOS' | 'WIN';

const TABS: { id: TabKey; label: string; icon: any }[] = [
    { id: 'START', label: 'Start', icon: Target },
    { id: 'PICK', label: 'Pick', icon: ScrollText },
    { id: 'BET', label: 'Bet', icon: TrendingUp },
    { id: 'CREATE', label: 'Create', icon: Plus },
    { id: 'CHRONOS', label: 'Chronos', icon: Globe },
    { id: 'WIN', label: 'Profit', icon: Trophy },
];

const COLORS = ['#10B981', '#F43F5E', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#6366F1', '#14B8A6'];

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('START');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setActiveTab('START');
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleNext = () => {
        const currentIndex = TABS.findIndex(t => t.id === activeTab);
        if (currentIndex < TABS.length - 1) {
            setActiveTab(TABS[currentIndex + 1].id);
        } else {
            onClose();
        }
    };

    if (!mounted) return null;

    const content = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 font-sans select-none">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        onClick={onClose}
                    />

                    {/* Main Container */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="relative w-full max-w-[1000px] h-[800px] bg-[#FAFAFA] rounded-[2.5rem] overflow-hidden shadow-[10px_10px_0px_0px_rgba(255,255,255,0.1)] flex flex-col isolate ring-4 ring-black"
                    >
                        {/* Elegant Dotted Background Pattern (Global) */}
                        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }} />

                        {/* 1. HEADER (Only Logo & Close) */}
                        <div className="px-8 pt-6 pb-3 flex items-center justify-between bg-transparent z-20 shrink-0 gap-4 relative">


                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="p-3 bg-red-400 text-white rounded-full border-2 border-black hover:bg-red-500 hover:scale-105 active:scale-95 transition-all shadow-[2px_2px_0px_0px_black] shrink-0"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* 2. CONTENT AREA */}
                        <div className="flex-1 relative overflow-hidden flex flex-col z-10">
                            <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-y-auto custom-scrollbar">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                        className="w-full h-full flex items-center justify-center"
                                    >
                                        <TabContent id={activeTab} setActiveTab={setActiveTab} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* TABS MOVED TO BOTTOM CENTER (Dock Style) */}
                            <div className="px-8 pb-4 flex justify-center shrink-0">
                                {/* Desktop Tabs Moved to Footer */}
                                {/* Mobile Tabs */}
                                <div className="md:hidden flex overflow-x-auto gap-2 scrollbar-hide w-full">
                                    {TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-4 py-2 rounded-full border-2 border-black text-[10px] font-black uppercase whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white' : 'bg-white text-black'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t-2 border-dashed border-gray-300 flex items-center shrink-0 bg-white/50 backdrop-blur-sm relative z-50">
                                {/* Left: Step Indicator */}
                                <div className="flex-1 flex justify-start min-w-0">
                                    <div className="text-[10px] md:text-xs font-black text-black uppercase tracking-widest hidden md:block whitespace-nowrap">
                                        {activeTab === 'START' ? 'Welcome' : `Step ${TABS.findIndex(t => t.id === activeTab)} of ${TABS.length - 1}`}
                                    </div>
                                </div>

                                {/* Center: Tabs */}
                                <div className="shrink-0 flex justify-center scale-115 origin-center mx-4">
                                    <div className="hidden md:flex bg-white p-2 rounded-full relative w-full max-w-[650px] border-2 border-black shadow-[6px_6px_0px_0px_black]">
                                        {TABS.map((tab) => {
                                            const isActive = activeTab === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`relative z-10 flex-1 py-2 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-colors duration-300 whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-400 hover:text-black'}`}
                                                >
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="tabPillLarge"
                                                            className="absolute inset-0 bg-black rounded-full"
                                                            transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                                        />
                                                    )}
                                                    <span className="relative z-10 flex items-center justify-center gap-3 py-1">
                                                        {tab.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right: Next Button */}
                                <div className="flex-1 flex justify-end min-w-0">
                                    <button
                                        onClick={activeTab === 'WIN' ? onClose : handleNext}
                                        className="flex items-center gap-2 px-6 py-3 bg-[#FFD600] text-black border-2 border-black rounded-xl font-black uppercase tracking-widest hover:bg-[#ffe033] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_black] active:translate-y-0 active:shadow-none transition-all text-xs whitespace-nowrap"
                                    >
                                        {activeTab === 'WIN' ? 'Start' : 'Next'}
                                        {activeTab !== 'WIN' && <ArrowRight size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(content, document.body);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTIVE CONTENT PANELS
// ═══════════════════════════════════════════════════════════════════════════════

function TabContent({ id, setActiveTab }: { id: TabKey, setActiveTab: (t: TabKey) => void }) {
    const { setVisible } = useWalletModal();
    const { connected } = useWallet();

    // State
    const [createCategory, setCreateCategory] = useState('Crypto');
    const [createQuestion, setCreateQuestion] = useState('Will Bitcoin hit $100k?');
    const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
    const [tradeOutcome, setTradeOutcome] = useState('YES');

    // Create Mode State
    const [createMode, setCreateMode] = useState<'binary' | 'multiple'>('binary');
    const [createOptions, setCreateOptions] = useState([
        { id: 'opt1', name: 'Option A', color: '#8B5CF6' },
        { id: 'opt2', name: 'Option B', color: '#3B82F6' },
        { id: 'opt3', name: 'Option C', color: '#F59E0B' }
    ]);
    // Separate state for binary options to allow color picking
    const [binaryOptions, setBinaryOptions] = useState([
        { id: 'yes', name: 'Yes', color: '#10B981' },
        { id: 'no', name: 'No', color: '#F43F5E' }
    ]);
    const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

    // Helpers
    const currentOptions = createMode === 'binary' ? binaryOptions : createOptions;
    const setOptions = createMode === 'binary' ? setBinaryOptions : setCreateOptions;


    switch (id) {
        case 'START':
            return (
                <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto h-full relative overflow-visible">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex flex-col items-center relative gap-6 w-full"
                    >
                        {/* Sniper + Djinn — Centered Layout */}
                        {/* Adjusted transform: +5% X, -18% Y (Up 10% more) */}
                        {/* Adjusted transform: Only raise (Y) drastically, center horizontally */}
                        <div className="flex items-center justify-center gap-0 -translate-y-[45%] w-full">
                            {/* Sniper */}
                            <div className="relative w-40 h-40 md:w-56 md:h-56 shrink-0 z-10">
                                <Image
                                    src="/star-sniper-new.png"
                                    alt="Djinn Sniper"
                                    fill
                                    className="object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                                />
                            </div>

                            {/* Djinn Title - Pushed down slightly relative to Sniper */}
                            <h1 className="text-7xl md:text-9xl font-black text-black leading-none tracking-tighter -ml-6 md:-ml-12 relative z-0 pl-4 translate-y-6" style={{ fontFamily: 'var(--font-adriane), serif' }}>
                                Djinn
                            </h1>
                        </div>

                        {/* Tagline - Pulled way up to sit 'between/below' center */}
                        <p className="text-xl md:text-3xl font-black text-black tracking-widest uppercase bg-[#FFD600] px-8 py-3 -rotate-1 border-3 border-black shadow-[6px_6px_0px_0px_black] mx-auto -mt-36 relative z-20">
                            The Future is Yours
                        </p>
                    </motion.div>
                </div>
            );

        case 'PICK':
            const PICK_CARDS: Record<string, { question: string; icon: string; iconBg: string; iconLabel: string }> = {
                'Crypto': { question: 'Will Bitcoin hit $100k?', icon: '₿', iconBg: '#F7931A', iconLabel: 'BTC' },
                'Politics': { question: 'Will Trump win 2028?', icon: '🏛️', iconBg: '#3B82F6', iconLabel: 'GOV' },
                'Sports': { question: 'Will Argentina win Copa America?', icon: '⚽', iconBg: '#10B981', iconLabel: 'FIFA' },
                'Pop Culture': { question: 'Will GTA 6 break records?', icon: '🎮', iconBg: '#8B5CF6', iconLabel: 'GAME' },
            };
            const pickCard = PICK_CARDS[createCategory] || PICK_CARDS['Crypto'];

            return (
                <div className="flex flex-col md:flex-row gap-12 w-full max-w-6xl items-center justify-center px-4 h-full">
                    {/* Ghost Writing */}
                    <div className="space-y-6 max-w-xs text-left">
                        <h2 className="text-6xl font-black uppercase tracking-tighter text-black leading-[0.9]">
                            Pick a<br />Market
                        </h2>
                        <p className="font-bold text-gray-500 text-lg leading-relaxed border-l-4 border-black pl-4">
                            Select a category.
                            <br />
                            <span className="text-black">Define the outcome.</span>
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {['Crypto', 'Politics', 'Sports', 'Pop Culture'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCreateCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border-2 border-black transition-all ${createCategory === cat ? 'bg-[#FFD600] text-black shadow-[2px_2px_0px_black] -translate-y-1' : 'bg-white text-black hover:bg-gray-100 hover:shadow-[2px_2px_0px_rgba(0,0,0,0.1)]'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MOCKUP: Replica exacta de MarketCard.tsx */}
                    <motion.div
                        className="w-full max-w-[340px] bg-white border-2 border-black rounded-2xl p-4 flex flex-col gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-pointer overflow-hidden"
                        whileHover={{ y: -4 }}
                    >
                        {/* Image — aspect-[4/3] like real MarketCard */}
                        <div className="w-full overflow-hidden bg-gray-50 relative border-2 border-black rounded-xl aspect-[4/3]">
                            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center relative">
                                {/* BTC Logo Overlay for Pick Tab specifically */}
                                {createCategory === 'Crypto' && (
                                    <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg')] bg-cover opacity-10 blur-sm mix-blend-overlay"></div>
                                )}
                                <div className="z-10 w-20 h-20 rounded-full border-4 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_black]" style={{ backgroundColor: pickCard.iconBg }}>
                                    <span className="text-4xl">{pickCard.icon}</span>
                                </div>
                            </div>
                            {/* Time badge */}
                            <div className="absolute top-2 left-2 flex gap-1.5">
                                <span className="bg-black text-white px-2 py-0.5 rounded-md text-[9px] font-bold lowercase">2d 3h</span>
                            </div>
                            {/* New badge */}
                            <div className="absolute right-2 top-2">
                                <span className="bg-[#F492B7] text-black border border-black px-2 py-0.5 rounded-md text-[9px] font-bold">new</span>
                            </div>
                        </div>

                        {/* Body — replica de MarketCard */}
                        <div className="flex-1 flex flex-col gap-2 relative">
                            {/* Title */}
                            <h3 className="font-bold text-black leading-tight line-clamp-2 text-base">
                                {pickCard.question}
                            </h3>

                            {/* Category */}
                            <span className="text-[10px] font-medium text-gray-400 lowercase tracking-wide">
                                {createCategory.toLowerCase()}
                            </span>

                            {/* Outcomes section — identical to MarketCard binary */}
                            <div className="mt-auto w-full space-y-3">
                                {/* Probability Label */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-emerald-600">yes 65%</span>
                                    <span className="text-[10px] text-gray-400 font-medium">$42,069</span>
                                </div>

                                {/* Probability Bar */}
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-black/10 relative">
                                    <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-l-full" style={{ width: '65%' }} />
                                    <div className="absolute inset-y-0 right-0 bg-red-400 rounded-r-full" style={{ width: '35%' }} />
                                </div>

                                {/* YES / NO Buttons — like real MarketCard (non-crypto) */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button className="bg-emerald-500 text-white border-2 border-black rounded-xl font-bold py-2.5 text-xs transition-all hover:brightness-110 active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none flex items-center justify-center gap-1.5">
                                        <span>yes</span>
                                    </button>
                                    <button className="bg-red-500 text-white border-2 border-black rounded-xl font-bold py-2.5 text-xs transition-all hover:brightness-110 active:scale-95 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none flex items-center justify-center gap-1.5">
                                        <span>no</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            );

        case 'BET':
            return (
                <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl items-center justify-center px-4 h-full">
                    {/* Left: Title + Feature Cards */}
                    <div className="space-y-4 max-w-[260px] text-left shrink-0">
                        <h2 className="text-5xl font-black uppercase tracking-tighter text-black leading-[0.9]">Place<br />a Bet</h2>
                        <p className="text-sm font-bold text-gray-400 leading-relaxed">
                            Support your conviction. Win if you&apos;re right.
                        </p>

                        {/* Feature cards — compact */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-2.5 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="w-9 h-9 bg-emerald-400 border-2 border-black rounded-lg flex items-center justify-center shrink-0">
                                    <TrendingUp size={16} strokeWidth={3} />
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase block leading-tight">Sell Anytime</span>
                                    <span className="text-[9px] text-gray-400 leading-tight">exit before resolution, lock gains</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="w-9 h-9 bg-[#FFD600] border-2 border-black rounded-lg flex items-center justify-center shrink-0">
                                    <BarChart3 size={16} strokeWidth={3} />
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase block leading-tight">Up to 100x</span>
                                    <span className="text-[9px] text-gray-400 leading-tight">multiplier on low probability bets</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="w-9 h-9 bg-[#F492B7] border-2 border-black rounded-lg flex items-center justify-center shrink-0">
                                    <Coins size={16} strokeWidth={3} />
                                </div>
                                <div>
                                    <span className="text-[11px] font-black uppercase block leading-tight">Any Outcome</span>
                                    <span className="text-[9px] text-gray-400 leading-tight">trade yes, no, or custom options</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Compact Trade Panel */}
                    <div className="w-full max-w-[340px] bg-white rounded-3xl border-2 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        {/* Pool Header — compact */}
                        <div className="w-full flex flex-col items-center px-4 py-4 rounded-2xl bg-gradient-to-br from-[#FF92C6] via-[#FFB6C1] to-[#F492CC] border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-black/50">Total Pool</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-4xl font-black text-black">42.50</span>
                                <span className="text-xl font-black text-white">SOL</span>
                            </div>
                        </div>

                        {/* BUY/SELL Toggle */}
                        <div className="mb-3 p-1 bg-gray-100 border-3 border-black rounded-xl flex gap-1">
                            <button
                                onClick={() => setTradeSide('buy')}
                                className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${tradeSide === 'buy' ? 'bg-emerald-400 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'text-black/40 border-transparent'}`}
                            >
                                BUY
                            </button>
                            <button
                                onClick={() => setTradeSide('sell')}
                                className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${tradeSide === 'sell' ? 'bg-rose-400 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'text-black/40 border-transparent'}`}
                            >
                                SELL
                            </button>
                        </div>

                        {/* YES/NO Selector */}
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setTradeOutcome('YES')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black border-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 transition-all ${tradeOutcome === 'YES' ? 'bg-emerald-400 text-black border-black -translate-y-0.5' : 'bg-white text-black border-black hover:bg-emerald-50'}`}
                            >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 2L10 7H2L6 2Z" fill="currentColor" /></svg>
                                YES
                            </button>
                            <button
                                onClick={() => setTradeOutcome('NO')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black border-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 transition-all ${tradeOutcome === 'NO' ? 'bg-rose-400 text-black border-black -translate-y-0.5' : 'bg-white text-black border-black hover:bg-rose-50'}`}
                            >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 10L2 5H10L6 10Z" fill="currentColor" /></svg>
                                NO
                            </button>
                        </div>

                        {/* Amount Input */}
                        <div className="bg-white rounded-xl border-3 border-black p-3 mb-3">
                            <label className="text-[8px] font-black uppercase text-black/40 mb-1 block">
                                {tradeSide === 'buy' ? 'Principal (SOL)' : 'Volume (Shares)'}
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-black text-black tabular-nums">0.50</span>
                                <div className="bg-black px-2.5 py-1 rounded-lg ml-auto">
                                    <span className="text-[10px] font-black text-white">{tradeSide === 'buy' ? 'SOL' : 'SHR'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Execute Button */}
                        <button className="w-full py-4 rounded-xl font-black text-base uppercase tracking-[0.15em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-3 border-black bg-black text-white hover:bg-[#F492B7] hover:text-black transition-all">
                            EXECUTE
                        </button>
                    </div>
                </div>
            );

        case 'CREATE':
            return (
                <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl items-center justify-center px-4 h-full">
                    {/* Left: Copy + Earn Badge */}
                    <div className="space-y-4 max-w-[240px] text-left shrink-0">
                        <h2 className="text-5xl font-black uppercase tracking-tighter text-black leading-[0.9]">
                            Create<br />Anything
                        </h2>
                        <p className="text-sm font-bold text-gray-400 leading-relaxed">
                            Your market. Your rules. Set the question, pick the outcomes.
                        </p>

                        {/* Earn 50% Fees Banner */}
                        <div className="bg-[#FFD600] border-3 border-black rounded-2xl p-3 shadow-[3px_3px_0px_0px_black] -rotate-1">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center shrink-0">
                                    <DollarSign size={18} className="text-[#FFD600]" strokeWidth={3} />
                                </div>
                                <div>
                                    <span className="text-base font-black uppercase block leading-tight">Earn 50% Fees</span>
                                    <span className="text-[9px] font-bold text-black/50">every trade earns you revenue</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Create Market Form */}
                    <div
                        className="w-full max-w-[420px] bg-white border-3 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col relative"
                        onClick={() => setActiveColorPicker(null)}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b-3 border-black flex justify-between items-center bg-white shrink-0">
                            <span className="text-lg font-black lowercase tracking-tight">create market</span>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-3 bg-white overflow-y-auto flex-1 custom-scrollbar">
                            {/* Mode Switcher */}
                            <div className="flex gap-1.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCreateMode('binary'); }}
                                    className={`flex-1 py-2 border-2 border-black rounded-lg text-center text-[10px] font-black uppercase transition-all ${createMode === 'binary' ? 'bg-[#F492B7] shadow-[2px_2px_0px_black] -translate-y-0.5' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                                >
                                    Binary
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCreateMode('multiple'); }}
                                    className={`flex-1 py-2 border-2 border-black rounded-lg text-center text-[10px] font-black uppercase transition-all ${createMode === 'multiple' ? 'bg-[#F492B7] shadow-[2px_2px_0px_black] -translate-y-0.5' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                                >
                                    Multiple
                                </button>
                            </div>

                            {/* Image + Question */}
                            <div className="flex gap-3">
                                <div className="w-16 h-16 shrink-0 border-2 border-dashed border-black rounded-lg bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                                    <span className="text-2xl">📷</span>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[8px] font-black uppercase text-gray-400 mb-0.5 block">Question</label>
                                    <input
                                        type="text"
                                        value={createQuestion}
                                        onChange={(e) => setCreateQuestion(e.target.value)}
                                        className="w-full border-2 border-black rounded-lg p-2 font-bold text-black text-xs outline-none focus:shadow-[2px_2px_0px_#F492B7] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Category Selector */}
                            <div>
                                <label className="text-[8px] font-black uppercase text-gray-400 mb-1 block">Category</label>
                                <div className="flex flex-wrap gap-1">
                                    {['Crypto', 'Politics', 'Sports', 'Business', 'Science'].map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={(e) => { e.stopPropagation(); setCreateCategory(cat); }}
                                            className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border-2 border-black transition-all ${createCategory === cat ? 'bg-[#FFD600] shadow-[1px_1px_0px_black] -translate-y-0.5' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resolution Source - Added as requested */}
                            <div>
                                <label className="text-[8px] font-black uppercase text-gray-400 mb-0.5 block">Resolution Source</label>
                                <input
                                    type="text"
                                    placeholder="https://x.com/..."
                                    className="w-full border-2 border-black rounded-lg p-2 text-xs text-black font-bold outline-none focus:shadow-[2px_2px_0px_#F492B7] transition-all placeholder:text-gray-300"
                                />
                            </div>

                            {/* Outcomes — Interactive Color Picker & Editable Text for BOTH Modes */}
                            <div className="space-y-1.5 pb-10">
                                <div className="flex justify-between items-center">
                                    <label className="text-[8px] font-black uppercase text-gray-400">Outcomes</label>
                                    {createMode === 'multiple' && currentOptions.length < 6 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); (setOptions as any)([...currentOptions, { id: Date.now().toString(), name: `Option ${currentOptions.length + 1}`, color: COLORS[currentOptions.length % COLORS.length] }]); }}
                                            className="text-[8px] font-black uppercase text-black bg-emerald-300 px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_black] hover:-translate-y-0.5 transition-transform"
                                        >
                                            + Add
                                        </button>
                                    )}
                                </div>

                                {/* Unified Rendering for Binary & Multiple to enable Color Picker in Binary too */}
                                <div className="flex flex-col gap-1 relative">
                                    {currentOptions.map((opt) => (
                                        <div
                                            key={opt.id}
                                            className={`flex items-center gap-2 p-2 border-2 border-black rounded-lg bg-white relative ${activeColorPicker === opt.id ? 'z-50' : 'z-0'}`}
                                        >
                                            {/* Color Picker Trigger */}
                                            <div
                                                className="w-4 h-4 rounded-md border-2 border-black shrink-0 cursor-pointer hover:scale-110 transition-transform relative"
                                                style={{ backgroundColor: opt.color }}
                                                onClick={(e) => { e.stopPropagation(); setActiveColorPicker(activeColorPicker === opt.id ? null : opt.id); }}
                                            >
                                                {/* Color Palette Popup - High Z-Index */}
                                                {activeColorPicker === opt.id && (
                                                    <div className="absolute top-6 left-0 bg-white border-2 border-black p-2 rounded-xl shadow-[4px_4px_0px_black] z-[100] grid grid-cols-4 gap-1 w-28">
                                                        {COLORS.map(c => (
                                                            <div
                                                                key={c}
                                                                className="w-5 h-5 rounded border border-black cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                                                                style={{ backgroundColor: c }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Ugly cast because TypeScript struggles with the union state setter in this simplified view
                                                                    (setOptions as any)(currentOptions.map((o: any) => o.id === opt.id ? { ...o, color: c } : o));
                                                                    setActiveColorPicker(null);
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <input
                                                type="text"
                                                value={opt.name}
                                                onChange={(e) => (setOptions as any)(currentOptions.map((o: any) => o.id === opt.id ? { ...o, name: e.target.value } : o))}
                                                className="text-[11px] font-black flex-1 outline-none bg-transparent min-w-0 text-black"
                                            />
                                            {createMode === 'multiple' && currentOptions.length > 3 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); (setOptions as any)(currentOptions.filter((o: any) => o.id !== opt.id)); }}
                                                    className="text-gray-300 hover:text-red-500 shrink-0"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer — Create button */}
                        <div className="p-4 pt-2 bg-white shrink-0">
                            <div className="w-full py-3 bg-[#10B981] border-3 border-black rounded-xl text-center font-black uppercase text-sm shadow-[4px_4px_0px_black] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer hover:bg-emerald-400 group text-white">
                                Create Market <span className="inline-block group-hover:translate-x-1 transition-transform">🚀</span>
                            </div>
                        </div>
                    </div>
                </div>
            );

        case 'CHRONOS': {
            const targetPrice = 97350;
            const currentPrice = 97580;
            const chartPoints = [97200, 97180, 97250, 97320, 97280, 97350, 97400, 97380, 97420, 97500, 97470, 97510, 97490, 97530, 97560, 97540, 97520, 97550, 97570, 97580];
            const cMin = Math.min(...chartPoints, targetPrice) - 60;
            const cMax = Math.max(...chartPoints, targetPrice) + 60;
            const cRange = cMax - cMin;

            const svgW = 700;
            const svgH = 260;
            const padL = 0;
            const padR = 70;
            const padT = 10;
            const padB = 25;
            const plotW = svgW - padL - padR;
            const plotH = svgH - padT - padB;

            const toX = (i: number) => padL + (i / (chartPoints.length - 1)) * plotW;
            const toY = (v: number) => padT + plotH - ((v - cMin) / cRange) * plotH;

            const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p).toFixed(1)}`).join(' ');
            const areaPath = `${linePath} L${toX(chartPoints.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${toX(0).toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

            const yLabels = [cMin, cMin + cRange * 0.25, cMin + cRange * 0.5, cMin + cRange * 0.75, cMax];
            const timeLabels2 = ['0:00', '5:00', '10:00', '15:00'];

            const lastX = toX(chartPoints.length - 1);
            const lastY = toY(currentPrice);
            const tgtY = toY(targetPrice);

            return (
                <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl px-4 h-full items-stretch">
                    {/* Left: Explainer */}
                    <div className="space-y-4 max-w-[240px] text-left shrink-0 flex flex-col justify-center">
                        <h2 className="text-5xl font-black uppercase tracking-tighter text-black leading-[0.9]">
                            Chronos
                        </h2>
                        <p className="text-sm font-bold text-gray-400 leading-relaxed">
                            Predict if the price goes <span className="text-emerald-600 font-black">UP</span> or <span className="text-red-500 font-black">DOWN</span> before time runs out.
                        </p>

                        {/* Timeframe cards */}
                        <div className="space-y-1.5">
                            {[
                                { tf: '15 min', desc: 'Fast rounds, quick wins' },
                                { tf: '1 hour', desc: 'Short-term momentum' },
                                { tf: '24 hours', desc: 'Daily trend bets' },
                                { tf: '1 week', desc: 'Macro conviction plays' },
                            ].map((item, i) => (
                                <div key={item.tf} className={`flex items-center gap-2.5 p-2 border-2 border-black rounded-xl transition-all ${i === 0 ? 'bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]' : 'bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}>
                                    <span className={`text-[11px] font-black uppercase w-14 ${i === 0 ? 'text-[#F492B7]' : 'text-black'}`}>{item.tf}</span>
                                    <span className={`text-[9px] ${i === 0 ? 'text-gray-300' : 'text-gray-400'}`}>{item.desc}</span>
                                </div>
                            ))}
                        </div>

                        {/* Crypto logos */}
                        <div className="flex gap-2 items-center pt-1">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg" alt="BTC" className="w-6 h-6" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg" alt="ETH" className="w-6 h-6" />
                            <img src="https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png" alt="SOL" className="w-6 h-6 object-contain" />
                            <span className="text-[9px] font-bold text-gray-400 ml-1">BTC, ETH, SOL & more</span>
                        </div>
                    </div>

                    {/* Right: Static Chart Card */}
                    <div className="flex-1 bg-white border-4 border-black rounded-[2rem] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-0 overflow-hidden">
                        {/* Chart Header — Target Price + Current Price + Timer */}
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 shrink-0">
                            <div className="flex items-center gap-3">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg" alt="BTC" className="w-6 h-6" />
                                <div>
                                    <span className="font-black text-base block leading-none">BTC/USD</span>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase">15 min round</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                    <span className="text-[7px] font-bold text-gray-400 uppercase">target price</span>
                                    <span className="font-mono font-black text-xs leading-none text-black">${targetPrice.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[7px] font-bold text-[#F7931A] uppercase">current price</span>
                                    <span className="font-mono font-black text-xs leading-none text-emerald-600">${currentPrice.toLocaleString()}</span>
                                </div>
                                <div className="font-mono font-black text-sm px-2 py-0.5 rounded-lg border-2 border-black bg-gray-100 text-black">
                                    7:32
                                </div>
                            </div>
                        </div>

                        {/* Chart SVG */}
                        <div className="flex-1 relative overflow-hidden rounded-xl bg-white min-h-0">
                            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                {yLabels.map((v, i) => (
                                    <line key={`grid-${i}`} x1={padL} x2={svgW - padR} y1={toY(v)} y2={toY(v)} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
                                ))}
                                {yLabels.map((v, i) => (
                                    <text key={`ylabel-${i}`} x={svgW - padR + 6} y={toY(v) + 3} fontSize="9" fontWeight="700" fill="#9CA3AF" fontFamily="monospace">
                                        ${v.toFixed(0)}
                                    </text>
                                ))}
                                {timeLabels2.map((t, i) => (
                                    <text key={`xlabel-${i}`} x={padL + (i / (timeLabels2.length - 1)) * plotW} y={svgH - 4} fontSize="10" fontWeight="600" fill="#9CA3AF" textAnchor="middle">
                                        {t}
                                    </text>
                                ))}

                                <defs>
                                    <linearGradient id="howChartGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d={areaPath} fill="url(#howChartGrad)" />

                                {/* Target/Strike Line */}
                                <line x1={padL} x2={svgW - padR} y1={tgtY} y2={tgtY} stroke="#000" strokeWidth="2" strokeDasharray="6 4" />
                                <rect x={svgW - padR - 78} y={tgtY - 10} width="74" height="18" rx="4" fill="#000" />
                                <text x={svgW - padR - 41} y={tgtY + 3} fontSize="9" fontWeight="900" fill="#fff" textAnchor="middle">
                                    ${targetPrice.toLocaleString()}
                                </text>

                                {/* Price Line */}
                                <path d={linePath} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Live price dot */}
                                <circle cx={lastX} cy={lastY} r="5" fill="#10B981" stroke="white" strokeWidth="2" />

                                {/* Live price label */}
                                <line x1={lastX} x2={svgW - padR} y1={lastY} y2={lastY} stroke="#10B981" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                                <rect x={svgW - padR - 78} y={lastY - 10} width="74" height="18" rx="4" fill="#10B981" />
                                <text x={svgW - padR - 41} y={lastY + 3} fontSize="9" fontWeight="900" fill="#fff" textAnchor="middle">
                                    ${currentPrice.toLocaleString()}
                                </text>
                            </svg>
                        </div>

                        {/* UP/DOWN Actions */}
                        <div className="flex gap-3 mt-2 h-11 shrink-0">
                            <button className="flex-1 bg-emerald-400 border-3 border-black rounded-xl shadow-[3px_3px_0px_black] flex items-center justify-center gap-2">
                                <TrendingUp size={18} className="text-black" strokeWidth={3} />
                                <span className="font-black text-base uppercase tracking-widest">UP</span>
                            </button>
                            <button className="flex-1 bg-red-400 border-3 border-black rounded-xl shadow-[3px_3px_0px_black] flex items-center justify-center gap-2">
                                <TrendingUp size={18} className="text-black rotate-180" strokeWidth={3} />
                                <span className="font-black text-base uppercase tracking-widest">DOWN</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        case 'WIN':
            return (
                <div className="flex flex-col items-center justify-center text-center space-y-10 max-w-4xl mx-auto h-full px-4">
                    <div>
                        <h2 className="text-7xl font-black uppercase tracking-tighter text-black mb-4">Profit <span className="text-4xl align-top">🤑</span></h2>
                        <p className="text-lg font-bold text-gray-400 max-w-lg mx-auto leading-relaxed">
                            Sell your shares anytime to lock in gains.
                            <br />
                            Winners redeem for <span className="text-black font-black">$1.00</span> per share.
                        </p>
                    </div>

                    {/* Claim Reward Mockup - Neo Brutalist */}
                    <motion.div
                        className="bg-white p-8 rounded-3xl border-4 border-black shadow-[12px_12px_0px_black] w-full max-w-md relative"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        whileHover={{ rotate: -1, scale: 1.02 }}
                    >
                        <div className="absolute -top-6 -right-6 bg-[#F492B7] text-black border-2 border-black px-4 py-2 font-black uppercase -rotate-12 shadow-[4px_4px_0px_black] z-10">
                            You Won!
                        </div>

                        <div className="flex justify-between items-center mb-8 border-b-2 border-dashed border-gray-300 pb-4">
                            <div className="flex flex-col text-left">
                                <span className="text-xs font-black text-gray-400 uppercase">Market</span>
                                <span className="font-bold text-lg leading-none">Bitcoin hits $100k?</span>
                            </div>
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-black">
                                <Check size={20} className="text-emerald-600" strokeWidth={4} />
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-8">
                            <span className="text-xl font-black text-gray-800 uppercase">Payout</span>
                            <span className="text-5xl font-black text-black tracking-tighter">$250.00</span>
                        </div>

                        <button className="w-full py-4 bg-[#FFD600] text-black border-2 border-black rounded-xl font-black uppercase tracking-widest text-lg shadow-[6px_6px_0px_black] hover:bg-[#ffe033] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-3">
                            <Trophy size={24} strokeWidth={3} /> Claim Reward
                        </button>
                    </motion.div>
                </div>
            );
        default: return null;
    }
}
