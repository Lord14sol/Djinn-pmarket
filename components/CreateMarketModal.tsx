'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { isSupabaseConfigured } from '@/lib/supabase';
import { compressImage } from '@/lib/utils';
import { uploadToIPFS } from '@/lib/ipfs';
import { checkMarketMilestones, createMarket, updateMarketPrice } from '@/lib/supabase-db';
import AchievementToast from './AchievementToast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- ICONS ---
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

interface CreateMarketModalProps { isOpen: boolean; onClose: () => void; }

// Default Colors
const COLORS = [
    "#10B981", // Green (Yes)
    "#EF4444", // Red (No)
    "#3B82F6", // Blue
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#14B8A6", // Teal
];

export default function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
    const router = useRouter();
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { createMarket: createMarketOnChain, isReady: isContractReady } = useDjinnProtocol();

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [newAchievements, setNewAchievements] = useState<any[]>([]);
    const [marketType, setMarketType] = useState<'binary' | 'multiple'>('binary');
    const [poolName, setPoolName] = useState('');
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [sourceUrl, setSourceUrl] = useState('');
    const [activeColorPicker, setActiveColorPicker] = useState<number | null>(null);

    // Updated Option State with Color
    const [options, setOptions] = useState<{ id: number; name: string; color: string }[]>([
        { id: 1, name: 'Yes', color: '#10B981' },
        { id: 2, name: 'No', color: '#EF4444' }
    ]);

    const [initialBuyAmount, setInitialBuyAmount] = useState('0');
    const [initialBuySide, setInitialBuySide] = useState<'yes' | 'no'>('yes');

    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState<{
        txSignature: string;
        marketPda: string;
        yesMint: string;
        noMint: string;
        slug: string;
    } | null>(null);

    // Reset State logic
    React.useEffect(() => {
        if (!isOpen) {
            const t = setTimeout(() => {
                setIsSuccess(false);
                setIsLoading(false);
                setPoolName('');
                setMainImage(null);
                setMarketType('binary');
                setOptions([{ id: 1, name: 'Yes', color: '#10B981' }, { id: 2, name: 'No', color: '#EF4444' }]);
                setInitialBuyAmount('0');
                setInitialBuySide('yes');
                setSuccessData(null);
                setSourceUrl('');
            }, 300);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    // Helpers
    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => setMainImage(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const addOption = () => {
        const nextId = options.length + 1;
        const nextColor = COLORS[(nextId - 1) % COLORS.length];
        setOptions([...options, { id: nextId, name: '', color: nextColor }]);
    };

    const switchMode = (mode: 'binary' | 'multiple') => {
        setMarketType(mode);
        if (mode === 'binary') {
            setOptions([
                { id: 1, name: 'Yes', color: '#10B981' },
                { id: 2, name: 'No', color: '#EF4444' }
            ]);
        } else {
            setOptions([
                { id: 1, name: '', color: COLORS[0] },
                { id: 2, name: '', color: COLORS[1] },
                { id: 3, name: '', color: COLORS[2] }
            ]);
        }
    };

    // Auto-detect category from market title using keywords
    const autoDetectCategory = (title: string): string => {
        const lowerTitle = title.toLowerCase();
        const patterns = {
            'Crypto': ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana', 'sol', 'token', 'nft', 'defi'],
            'Politics': ['election', 'president', 'trump', 'biden', 'vote', 'political', 'government'],
            'Sports': ['match', 'game', 'score', 'team', 'player', 'win'],
            'Movies': ['movie', 'film', 'oscar', 'cinema', 'actor'],
            'Tech': ['apple', 'google', 'microsoft', 'ai', 'tech', 'startup', 'launch'],
            'Science': ['space', 'nasa', 'science', 'research'],
            'Finance': ['stock', 'market', 'price', 'economy'],
            'Gaming': ['game', 'xbox', 'playstation', 'nintendo'],
            'Culture': ['music', 'song', 'artist', 'concert']
        };

        for (const [category, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => lowerTitle.includes(keyword))) {
                return category;
            }
        }
        return 'Trending';
    };

    // --- MAIN LOGIC ---
    const handleCreateMarket = async () => {
        if (!isSupabaseConfigured) {
            setError('⚠️ Supabase not configured.');
            return;
        }

        if (!publicKey) {
            alert("Please connect your wallet first!");
            return;
        }
        if (!poolName) return alert("Please enter a question");

        const finalCategory = autoDetectCategory(poolName);
        setIsLoading(true);

        try {
            console.log("🚀 Creating market...");
            const timestamp = Date.now().toString(36);
            const sanitizedName = poolName.toLowerCase().trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 20);

            const slug = `${sanitizedName}-${timestamp}`;
            const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
            const finalResolutionTime = Math.floor(Date.now() / 1000) + SEVEN_DAYS_SECONDS;

            let finalBanner = "https://arweave.net/djinn-placeholder";
            if (mainImage) {
                const compressed = await compressImage(mainImage);
                finalBanner = await uploadToIPFS(compressed);
            }

            let marketPDA = '';
            let txSignature = '';
            let yesTokenMint = '';
            let noTokenMint = '';

            if (isContractReady && wallet && publicKey) {
                try {
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout - Network congested.')), 120000)
                    );

                    const buyAmount = parseFloat(initialBuyAmount) || 0;
                    const numOutcomes = options.length;
                    const contractPromise = createMarketOnChain(
                        poolName,
                        poolName,
                        new Date(finalResolutionTime * 1000),
                        sourceUrl,
                        finalBanner || "https://arweave.net/placeholder",
                        numOutcomes,
                        buyAmount,
                        initialBuySide === 'yes' ? 0 : 1
                    );

                    const result = await Promise.race([contractPromise, timeoutPromise]) as any;

                    if (!result || !result.tx) throw new Error("No transaction signature returned");

                    marketPDA = result.marketPda.toBase58();
                    yesTokenMint = result.yesMintPda.toBase58();
                    noTokenMint = result.noMintPda.toBase58();
                    txSignature = result.tx;
                } catch (blockchainError: any) {
                    console.error("⚠️ Blockchain failed:", blockchainError);
                    alert(`Blockchain Error: ${blockchainError.message}`);
                    throw blockchainError;
                }
            } else {
                marketPDA = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                txSignature = 'local_fallback';
            }

            // @ts-ignore
            await createMarket({
                slug,
                title: poolName,
                creator_wallet: publicKey.toString(),
                category: finalCategory,
                end_date: new Date(finalResolutionTime * 1000).toISOString(),
                market_pda: marketPDA,
                yes_token_mint: yesTokenMint,
                no_token_mint: noTokenMint,
                tx_signature: txSignature,
                total_yes_pool: 0,
                total_no_pool: 0,
                resolved: false,
                resolution_source: sourceUrl || 'DERIVED',
                banner_url: finalBanner,
                options: options.map(opt => opt.name || '').filter(name => name.trim() !== ''),
                outcome_colors: options.map(opt => opt.color) // ✅ Saving colors
            });

            const initialVol = parseFloat(initialBuyAmount) || 0;
            await updateMarketPrice(slug, 50, initialVol * 200);

            const optimisticMarket = {
                id: `local_${Date.now()}`,
                slug,
                title: poolName,
                volume: "$0",
                chance: 50,
                icon: finalBanner,
                category: finalCategory,
                createdAt: Date.now(),
                marketPDA,
                yesTokenMint,
                noTokenMint,
                resolved: false,
                winningOutcome: null,
                resolutionSource: sourceUrl || 'DERIVED',
                creator_wallet: publicKey.toString(),
                options: options.map(o => o.name),
                outcome_colors: options.map(o => o.color)
            };

            setSuccessData({
                txSignature,
                marketPda: marketPDA,
                yesMint: yesTokenMint,
                noMint: noTokenMint,
                slug
            });

            // 🎉 FIRE CONFETTI
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            setIsSuccess(true);

            // Cleanup
            setPoolName('');
            setMainImage(null);
            setMarketType('binary');
            setOptions([{ id: 1, name: 'Yes', color: '#10B981' }, { id: 2, name: 'No', color: '#EF4444' }]);

            try {
                const currentLocal = JSON.parse(localStorage.getItem('djinn_created_markets') || '[]');
                localStorage.setItem('djinn_created_markets', JSON.stringify([optimisticMarket, ...currentLocal]));
            } catch (e) {
                console.warn("LocalStorage save failed", e);
            }

            try {
                const dracoRes = await fetch('/api/markets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: optimisticMarket.id,
                        title: poolName,
                        sourceUrl: sourceUrl,
                        imageUrl: finalBanner,
                        creator: publicKey.toString(),
                        marketPda: marketPDA,
                        slug: slug
                    })
                });
            } catch (e) { }

            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('market-created', { detail: optimisticMarket }));

            import('@/lib/supabase-db').then(async mod => {
                try {
                    const achievements = await mod.checkMarketMilestones(publicKey.toString());
                    if (achievements && achievements.length > 0) {
                        const withImages = achievements.map(a => {
                            if (a.code === 'FIRST_MARKET') return { ...a, name: 'Genesis Creator', image_url: 'https://arweave.net/placeholder-medal' };
                            return a;
                        });
                        setNewAchievements(withImages);
                    }
                } catch (e) { console.error("Milestone check failed", e); }
            });

        } catch (error: any) {
            console.error("❌ Error:", error);
            setError(error.message || 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans animate-in fade-in duration-300">
            {/* BACKDROP: Clean semi-transparent black for high focus */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isLoading && onClose()} />

            {/* NEO-BRUTALIST CONTAINER */}
            <div className={`
                relative w-full overflow-hidden transition-all duration-300
                bg-white border-4 border-black rounded-3xl p-0
                shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]
                ${isSuccess ? 'max-w-md' : 'max-w-2xl max-h-[90vh] flex flex-col'}
            `}>

                {/* --- SUCCESS MODE --- */}
                {isSuccess && successData ? (
                    <div className="p-8 text-center flex flex-col items-center">
                        {/* Header: Title + Close */}
                        <div className="w-full flex justify-end mb-4">
                            <button onClick={onClose} className="bg-white border-2 border-black p-2 rounded-full hover:bg-gray-100 hover:scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all">
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Big Icon */}
                        <div className="mb-6 relative">
                            <div className="w-24 h-24 bg-[#10B981] border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in spin-in-12 duration-500">
                                <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                        </div>

                        <h2 className="text-4xl font-black text-black lowercase mb-2">market created!</h2>
                        <p className="text-gray-600 font-bold lowercase mb-8">you cooked. it's live on solana.</p>

                        {/* Receipt Card */}
                        <div className="w-full bg-[#f8f9fa] border-2 border-dashed border-black rounded-xl p-6 mb-8 text-left font-mono text-sm relative">
                            <div className="flex justify-between border-b-2 border-dashed border-gray-300 pb-2 mb-2">
                                <span className="text-gray-500">MARKET_PDA</span>
                                <span className="text-black font-bold">{successData.marketPda.slice(0, 4)}...{successData.marketPda.slice(-4)}</span>
                            </div>
                            <div className="flex justify-between border-b-2 border-dashed border-gray-300 pb-2 mb-2">
                                <span className="text-gray-500">ASSET_TYPE</span>
                                <span className="text-black font-bold">VIRTUAL_SHARES</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">OUTCOMES</span>
                                <span className="text-black font-bold">{options.length}</span>
                            </div>
                        </div>

                        {/* Action Primary */}
                        <button
                            onClick={() => { onClose(); router.push(`/market/${successData.slug}`); }}
                            className="w-full py-4 bg-[#F492B7] border-2 border-black rounded-xl font-black text-xl uppercase text-black hover:bg-[#ff85b0] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all mb-3 flex items-center justify-center gap-2"
                        >
                            Open Market 🚀
                        </button>
                    </div>
                ) : (
                    /* --- FORM MODE --- */
                    <>
                        {/* Header */}
                        <div className="p-6 md:p-8 pb-4 flex justify-between items-center bg-white border-b-4 border-black z-20">
                            <h1 className="text-3xl md:text-3xl font-black lowercase tracking-tight text-black leading-none">
                                create market
                            </h1>

                            {/* CLOSE BUTTON - Always Visible, Neo-Brutalist */}
                            <button
                                onClick={onClose}
                                className="group bg-red-400 border-2 border-black p-2.5 rounded-full hover:bg-red-500 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                            {/* Mode Switcher */}
                            <div className="flex gap-4 mb-8">
                                <button onClick={() => switchMode('binary')} className={`flex-1 py-3 border-2 border-black rounded-xl font-black uppercase text-sm transition-all ${marketType === 'binary' ? 'bg-[#F492B7] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-white text-gray-400 hover:text-black hover:bg-gray-50'}`}>
                                    Binary
                                </button>
                                <button onClick={() => switchMode('multiple')} className={`flex-1 py-3 border-2 border-black rounded-xl font-black uppercase text-sm transition-all ${marketType === 'multiple' ? 'bg-[#F492B7] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-white text-gray-400 hover:text-black hover:bg-gray-50'}`}>
                                    Multiple
                                </button>
                            </div>

                            <div className="space-y-8">
                                {/* Image & Title */}
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="w-32 shrink-0">
                                        <label className="text-black font-black lowercase mb-2 block tracking-tight">Icon</label>
                                        <div
                                            className="w-32 h-32 bg-white border-2 border-black border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-solid transition-all overflow-hidden relative group"
                                            onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => handleImageUpload(e.target.files[0]); input.click(); }}
                                        >
                                            {mainImage ? (
                                                <img src={mainImage} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <div className="text-3xl mb-1">📷</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-black font-black lowercase mb-2 block tracking-tight">Question</label>
                                        <textarea
                                            placeholder="what will happen?"
                                            className="w-full h-32 bg-white border-2 border-black rounded-xl p-4 text-xl font-bold text-black outline-none focus:shadow-[4px_4px_0px_0px_#F492B7] transition-all resize-none placeholder:text-gray-300"
                                            value={poolName}
                                            onChange={(e) => setPoolName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Source URL */}
                                <div>
                                    <label className="text-black font-black lowercase mb-2 block tracking-tight">resolution source</label>
                                    <input
                                        type="text"
                                        placeholder="https://x.com/..."
                                        className="w-full bg-white border-2 border-black rounded-xl py-4 px-4 font-bold text-black outline-none focus:shadow-[4px_4px_0px_0px_#F492B7] transition-all placeholder:text-gray-300"
                                        value={sourceUrl}
                                        onChange={(e) => setSourceUrl(e.target.value)}
                                    />
                                    <p className="text-xs font-bold text-gray-500 mt-2 lowercase">the oracle dogs use this to verify the outcome</p>
                                </div>

                                {/* Outcomes with Custom Color Menu */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-black font-black lowercase tracking-tight">Outcomes & Colors</label>
                                        {marketType === 'multiple' && (
                                            <button onClick={addOption} className="text-black bg-[#FFA07A] border-2 border-black px-3 py-1.5 rounded-lg text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-0 active:shadow-none transition-all">
                                                + Add
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {options.map((option, index) => (
                                            <div key={option.id} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">

                                                {/* LEFT: Color Picker (Click to Toggle) */}
                                                <div className="relative shrink-0">
                                                    {/* The Trigger Swatch (No Number) */}
                                                    <div
                                                        className="w-12 h-12 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 cursor-pointer hover:-translate-y-0.5 transition-transform flex items-center justify-center"
                                                        style={{ backgroundColor: option.color }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveColorPicker(activeColorPicker === index ? null : index);
                                                        }}
                                                    >
                                                    </div>

                                                    {/* The Mini Menu (Toggle on Click) */}
                                                    {activeColorPicker === index && (
                                                        <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-1 p-2 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-40 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                            {COLORS.map((c) => (
                                                                <button
                                                                    key={c}
                                                                    className="w-8 h-8 rounded-lg border-2 border-black hover:scale-110 transition-transform"
                                                                    style={{ backgroundColor: c }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const newOpts = [...options];
                                                                        newOpts[index].color = c;
                                                                        setOptions(newOpts);
                                                                        setActiveColorPicker(null); // Close after select
                                                                    }}
                                                                />
                                                            ))}
                                                            {/* Close Trigger (Optional) */}
                                                            <div className="fixed inset-0 z-[-1]" onClick={() => setActiveColorPicker(null)} />
                                                        </div>
                                                    )}

                                                    {/* Backdrop to close menu when clicking outside (Local) */}
                                                    {activeColorPicker === index && (
                                                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveColorPicker(null)} />
                                                    )}
                                                </div>

                                                {/* MIDDLE: Outcome Name Input */}
                                                <input
                                                    type="text"
                                                    placeholder={`Option ${index + 1}`}
                                                    className="flex-1 bg-white border-2 border-black rounded-xl py-3 px-4 font-bold text-black outline-none focus:shadow-[2px_2px_0px_0px_#F492B7] transition-all placeholder:text-gray-300"
                                                    value={option.name}
                                                    onChange={(e) => {
                                                        const newOpts = [...options];
                                                        newOpts[index].name = e.target.value;
                                                        setOptions(newOpts);
                                                    }}
                                                />

                                                {/* RIGHT: Delete Button */}
                                                {marketType === 'multiple' && options.length > 2 && (
                                                    <button
                                                        onClick={() => setOptions(options.filter((_, i) => i !== index))}
                                                        className="w-10 h-10 flex items-center justify-center text-black bg-red-100 border-2 border-black rounded-xl hover:bg-red-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none shrink-0"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="bg-red-50 border-2 border-red-500 text-red-600 font-bold p-4 rounded-xl">
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer / Submit */}
                        <div className="p-6 md:p-8 pt-4 bg-white border-t-4 border-black z-20">
                            <button
                                onClick={handleCreateMarket}
                                disabled={isLoading}
                                className="w-full py-5 bg-[#10B981] border-2 border-black rounded-xl font-black text-2xl uppercase text-black hover:bg-[#34d399] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin w-6 h-6" /> minting...
                                    </>
                                ) : (
                                    'Create Market'
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <AchievementToast achievements={newAchievements} onClose={() => setNewAchievements([])} />
        </div>
    );
}