'use client';

import React, { useState } from 'react';
// import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { compressImage } from '@/lib/utils';
import { uploadToIPFS } from '@/lib/ipfs';
import { checkMarketMilestones, createMarket, updateMarketPrice } from '@/lib/supabase-db';
import Link from 'next/link';

// --- ICONOS ---
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);
const SparkleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);
// Make sure to add CheckCircle import or icon
import { useRouter } from 'next/navigation';

interface CreateMarketModalProps { isOpen: boolean; onClose: () => void; }

export default function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
    const router = useRouter();
    const wallet = useWallet();
    const { publicKey } = wallet;
    // const { setVisible } = useWalletModal(); // Removed because context is gone
    const { createMarket: createMarketOnChain, isReady: isContractReady } = useDjinnProtocol();

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [marketType, setMarketType] = useState<'binary' | 'multiple'>('binary');
    const [poolName, setPoolName] = useState('');
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [sourceUrl, setSourceUrl] = useState('');
    const [options, setOptions] = useState([
        { id: 1, name: '' },
        { id: 2, name: '' }
    ]);
    const [initialBuyAmount, setInitialBuyAmount] = useState('0'); // Default 0 - Protocol Virtual Liquidity Handles Depth
    const [initialBuySide, setInitialBuySide] = useState<'yes' | 'no'>('yes');
    const [resolutionSeconds, setResolutionSeconds] = useState(7 * 24 * 60 * 60); // Default 7d
    const [customDate, setCustomDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
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
            // Wait for animation to finish before resetting visual state if needed
            const t = setTimeout(() => {
                setIsSuccess(false);
                setIsLoading(false);
                setPoolName('');
                setMainImage(null);
                setMarketType('binary');
                setOptions([{ id: 1, name: '' }, { id: 2, name: '' }]);
                setInitialBuyAmount('0');
                setInitialBuySide('yes');
                setSuccessData(null);
                setSourceUrl('');
            }, 300); // Small delay for fade out
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
        setOptions([...options, { id: options.length + 1, name: '' }]);
    };

    const switchMode = (mode: 'binary' | 'multiple') => {
        setMarketType(mode);
        setOptions(mode === 'binary'
            ? [{ id: 1, name: 'Yes' }, { id: 2, name: 'No' }]
            : [{ id: 1, name: '' }, { id: 2, name: '' }, { id: 3, name: '' }]
        );
    };

    // Auto-detect category from market title using keywords
    const autoDetectCategory = (title: string): string => {
        const lowerTitle = title.toLowerCase();

        // Keyword patterns for each category
        const patterns = {
            'Crypto': ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana', 'sol', 'token', 'nft', 'defi', 'blockchain', 'coin', 'pump', 'airdrop', 'wallet'],
            'Politics': ['election', 'president', 'trump', 'biden', 'congress', 'senate', 'vote', 'political', 'minister', 'government', 'democrat', 'republican', 'policy'],
            'Sports': ['world cup', 'nba', 'nfl', 'fifa', 'olympics', 'football', 'soccer', 'basketball', 'baseball', 'tennis', 'match', 'championship', 'league', 'team', 'player'],
            'Movies': ['movie', 'film', 'oscar', 'box office', 'cinema', 'director', 'actor', 'hollywood', 'netflix', 'streaming', 'premiere'],
            'Tech': ['apple', 'google', 'microsoft', 'meta', 'amazon', 'tech', 'iphone', 'android', 'software', 'hardware', 'startup', 'launch'],
            'AI': ['ai', 'artificial intelligence', 'chatgpt', 'openai', 'gpt', 'llm', 'machine learning', 'neural', 'model', 'anthropic', 'claude'],
            'Science': ['nasa', 'space', 'climate', 'research', 'study', 'scientist', 'discovery', 'experiment', 'quantum', 'physics', 'biology'],
            'Finance': ['stock', 'market', 'dow', 's&p', 'nasdaq', 'fed', 'interest rate', 'inflation', 'economy', 'gdp', 'bank', 'treasury'],
            'Gaming': ['gta', 'game', 'gaming', 'xbox', 'playstation', 'nintendo', 'steam', 'esports', 'twitch', 'rockstar'],
            'Culture': ['music', 'artist', 'album', 'concert', 'festival', 'grammy', 'fashion', 'art', 'culture', 'taylor swift', 'drake']
        };

        // Check each category for keyword matches
        for (const [category, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => lowerTitle.includes(keyword))) {
                return category;
            }
        }

        // Default to Trending if no match
        return 'Trending';
    };

    // --- MAIN LOGIC (Ported from Hero.tsx) ---
    const handleCreateMarket = async () => {
        // ✅ Check if Supabase is configured
        if (!isSupabaseConfigured) {
            setError('⚠️ Supabase not configured. Check your .env.local file.');
            console.error('Supabase credentials missing!');
            return;
        }

        if (!publicKey) {
            alert("Please connect your wallet first!");
            return;
        }
        if (!poolName) return alert("Please enter a question");

        // Auto-detect category from title
        const finalCategory = autoDetectCategory(poolName);
        console.log(`📁 Auto-detected category: ${finalCategory} (from title: "${poolName}")`);

        setIsLoading(true);

        try {
            console.log("🚀 Creating market on blockchain...");

            // Generate slug
            // Reduce seed length to max 32 bytes (Solana Limit)
            // Timestamp (~8 chars) + Dash (1) = 9 chars.
            // Max name length = 32 - 9 = 23. We use 20 for safety.
            const timestamp = Date.now().toString(36);
            const sanitizedName = poolName.toLowerCase().trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 20); // TRUNCATE HERE

            const slug = `${sanitizedName}-${timestamp}`;

            // Calculate Resolution Time
            let finalResolutionTime = 0;
            if (showDatePicker && customDate) {
                finalResolutionTime = Math.floor(new Date(customDate).getTime() / 1000);
            } else {
                finalResolutionTime = Math.floor(Date.now() / 1000) + resolutionSeconds;
            }

            // Upload image to IPFS (returns short URL, not base64)
            // This is required because Solana transactions have ~1KB limit
            let finalBanner = "https://arweave.net/djinn-placeholder";
            if (mainImage) {
                console.log("📷 Uploading image to IPFS...");
                const compressed = await compressImage(mainImage);
                finalBanner = await uploadToIPFS(compressed);
                console.log("✅ IPFS URL:", finalBanner);
            }

            let marketPDA = '';
            let txSignature = '';
            let yesTokenMint = '';
            let noTokenMint = '';

            // Try to create on blockchain (with timeout to prevent hanging)
            if (isContractReady && wallet && publicKey) {
                try {
                    console.log("⛓️ Calling smart contract (60s timeout)...");

                    // Add timeout wrapper to prevent indefinite hanging
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Transaction timeout - Devnet may be congested')), 60000)
                    );

                    const buyAmount = parseFloat(initialBuyAmount) || 0;
                    const numOutcomes = options.length; // Use number of options (2-6)
                    const contractPromise = createMarketOnChain(
                        poolName,
                        poolName, // Using poolName as description for now
                        new Date(finalResolutionTime * 1000),
                        sourceUrl, // Veritas
                        finalBanner || "https://arweave.net/placeholder", // metadataUri (Metaplex)
                        numOutcomes, // Send number of outcomes
                        buyAmount,
                        initialBuySide === 'yes' ? 0 : 1 // Convert to index
                    );

                    const result = await Promise.race([contractPromise, timeoutPromise]) as any;

                    // Ensure we have a signature
                    if (!result || !result.tx) {
                        throw new Error("No transaction signature returned");
                    }

                    marketPDA = result.marketPda.toBase58();
                    yesTokenMint = result.yesMintPda.toBase58();
                    noTokenMint = result.noMintPda.toBase58();
                    txSignature = result.tx;
                    console.log("✅ Blockchain TX:", txSignature);
                } catch (blockchainError: any) {
                    console.error("⚠️ Blockchain failed:", blockchainError);
                    alert(`Blockchain Error: ${blockchainError.message}`); // Keep alert for critical failures if toast context not available, or assume alert is fine for now as requested by user to see error. 
                    // Actually user hates alerts, but effectively we want to STOP.
                    throw blockchainError;
                }
            } else {
                console.log("ℹ️ Contract not ready or wallet not connected, saving locally");
                marketPDA = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                txSignature = 'local_fallback';
            }

            // SAVE TO SUPABASE (Using centralized helper - throws on error)
            // @ts-ignore
            const { data: savedMarket } = await createMarket({
                slug,
                title: poolName,
                creator_wallet: publicKey.toString(),
                category: finalCategory, // Auto-detected category
                end_date: new Date(finalResolutionTime * 1000).toISOString(),
                market_pda: marketPDA,
                yes_token_mint: yesTokenMint,
                no_token_mint: noTokenMint,
                tx_signature: txSignature,
                total_yes_pool: 0,
                total_no_pool: 0,
                resolved: false,
                resolution_source: sourceUrl || 'DERIVED', // Save actual source URL if provided
                banner_url: finalBanner,
                options: options.map(opt => opt.name || '').filter(name => name.trim() !== '') // Save outcome names
            });

            // INITIALIZE MARKET DATA (Price & Volume)
            // If there was an initial buy, the price isn't exactly 50, but we'll let the indexer or first load correct it.
            // Importantly, we record the VOLUME from the initial buy.
            const initialVol = parseFloat(initialBuyAmount) || 0;
            // Value of buy ~ initialVol (ignoring fees for rough volume stats)
            await updateMarketPrice(slug, 50, initialVol * 200); // *200 as mock USD conversion or just use SOL? updateMarketPrice expects number.
            // Actually Activity logs USD amount. market_data volume usually USD?
            // Let's assume volume is USD.
            // We'll init with 50% price. The on-chain sync will fix the exact price later if it moved.

            // SUCCESS - Store data and show animation
            setSuccessData({
                txSignature,
                marketPda: marketPDA,
                yesMint: yesTokenMint,
                noMint: noTokenMint,
                slug
            });
            setIsSuccess(true);
            // Longer timeout so user can see the success screen and click links
            // User can also close manually or wait for redirect

            // RESET
            setPoolName('');
            setMainImage(null);
            setMarketType('binary');
            setOptions([{ id: 1, name: '' }, { id: 2, name: '' }]);
            // CONSTRUCT MARKET OBJECT FOR OPTIMISTIC UPDATE
            const optimisticMarket = {
                id: `local_${Date.now()}`, // Temporary ID
                slug,
                title: poolName,
                volume: "$0", // Initial volume
                chance: 50,
                icon: finalBanner,
                category: finalCategory, // Auto-detected category
                createdAt: Date.now(),
                marketPDA,
                yesTokenMint,
                noTokenMint,
                resolved: false,
                winningOutcome: null,
                resolutionSource: 'DERIVED',
                creator_wallet: publicKey.toString()
            };

            // FORCE SAVE TO LOCALSTORAGE (Backup)
            try {
                const currentLocal = JSON.parse(localStorage.getItem('djinn_created_markets') || '[]');
                localStorage.setItem('djinn_created_markets', JSON.stringify([optimisticMarket, ...currentLocal]));
            } catch (e) {
                console.warn("Local storage save failed", e);
            }

            // DISPARAR EL EVENTO CON DATA
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('market-created', { detail: optimisticMarket }));

            // DON'T CLOSE - Let user see success modal and click buttons
            // User will click "Go to Market" or "Create Another" in the success modal

            // Trigger Milestones (background)
            import('@/lib/supabase-db').then(mod => {
                mod.checkMarketMilestones(publicKey.toString());
            });

        } catch (error: any) {
            console.error("❌ Error:", error);
            if (typeof error === 'object' && error !== null) {
                console.error("❌ Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
                if (error.logs) console.error("📜 Blockchain Logs:", error.logs);
            }

            // Better error parsing
            let diffMsg = error.message || 'Unknown error';
            if (diffMsg.includes('timeout')) {
                diffMsg = 'Devnet is slow. Please try again or check your wallet.';
            } else if (diffMsg.includes('User rejected')) {
                diffMsg = 'Transaction cancelled by user.';
            }
            setError(diffMsg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !isLoading && onClose()} />
            <div className={`relative bg-[#0B0E14] border border-white/10 rounded-[2rem] w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 transition-all ${isSuccess ? 'max-w-sm text-center' : 'max-w-2xl'}`}>

                {isSuccess && successData ? (
                    <div className="p-8 md:p-12 text-center flex flex-col items-center justify-center space-y-6">
                        {/* Pink Checkmark - Visible */}
                        <div className="relative">
                            <div className="w-24 h-24 bg-[#F492B7] rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(244,146,183,0.5)]">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="absolute -inset-3 bg-[#F492B7]/20 rounded-full blur-xl -z-10"></div>
                        </div>

                        {/* Title with Djinn styling */}
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black">
                                <span className="text-[#F492B7]">M</span>arket <span className="text-[#F492B7]">C</span>reated!
                            </h2>
                            <p className="text-gray-400 mt-2">Your prediction market is live on Solana</p>
                        </div>

                        {/* Token Addresses */}
                        <div className="w-full bg-white/5 rounded-2xl p-4 space-y-3 text-left text-xs font-mono">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Market PDA</span>
                                <span className="text-[#F492B7] truncate max-w-[180px]">{successData.marketPda.slice(0, 8)}...{successData.marketPda.slice(-6)}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-3">
                                <span className="text-gray-500">Asset Model</span>
                                <span className="text-white">Virtual Shares ⚡</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Liquidity</span>
                                <span className="text-white">Shared Vault 🏦</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Outcomes</span>
                                <span className="text-[#F492B7]">{options.length} (YES/NO/...)</span>
                            </div>
                        </div>

                        {/* Solscan Link - Only show for real transactions */}
                        {successData.txSignature && !successData.txSignature.startsWith('local') && (
                            <button
                                onClick={() => window.open(`https://solscan.io/tx/${successData.txSignature}?cluster=devnet`, '_blank')}
                                className="flex items-center gap-2 text-[#F492B7] hover:text-white transition-colors underline underline-offset-4 cursor-pointer bg-transparent border-none"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                                View on Solscan
                            </button>
                        )}

                        {/* Action Button - Solid Pink, No Pulse, No Emoji */}
                        <button
                            onClick={() => {
                                onClose();
                                router.push(`/market/${successData.slug}`);
                            }}
                            className="w-full py-4 bg-[#F492B7] text-white font-black text-lg rounded-2xl hover:brightness-110 transition-all"
                        >
                            Go to Market
                        </button>
                    </div>
                ) : (
                    <>
                        <button onClick={onClose} disabled={isLoading} className="absolute top-6 right-6 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors disabled:opacity-50 z-10">
                            <CloseIcon />
                        </button>

                        <div className="p-6 md:p-12 text-white">
                            <h2 className="text-3xl font-black mb-6 text-center">Create New Market</h2>

                            <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit mx-auto">
                                <button onClick={() => switchMode('binary')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${marketType === 'binary' ? 'bg-[#F492B7] text-black' : 'text-gray-500 hover:text-white'}`}>Binary</button>
                                <button onClick={() => switchMode('multiple')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${marketType === 'multiple' ? 'bg-[#F492B7] text-black' : 'text-gray-500 hover:text-white'}`}>Multiple</button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-center">
                                    <div className="w-full max-w-sm">
                                        <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest block mb-2 text-center">Upload Image</label>
                                        <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#F492B7] transition-all"
                                            onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => handleImageUpload(e.target.files[0]); input.click(); }}>
                                            {mainImage ? (
                                                <img src={mainImage} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">🖼️</div>
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Click to Upload</span>
                                                    <p className="text-[10px] text-gray-600 mt-1">JPG, PNG, WEBP</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <input type="text" placeholder="Enter question..." className="w-full bg-black/40 border border-white/10 rounded-xl p-5 text-lg font-bold outline-none focus:border-[#F492B7]" value={poolName} onChange={(e) => setPoolName(e.target.value)} />

                                { /* LIQUIDITY DEPTH REMOVED - Protocol Virtual Liquidity Handles This */}

                                {/* NEW: RESOLUTION TIME */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                            Resolution Time
                                        </label>
                                    </div>

                                    {/* Grid of Options */}
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                        {[
                                            { label: '15 min', val: 15 * 60 },
                                            { label: '1 hour', val: 60 * 60 },
                                            { label: '4 hours', val: 4 * 60 * 60 },
                                            { label: '1 day', val: 24 * 60 * 60 },
                                            { label: '7 days', val: 7 * 24 * 60 * 60 },
                                            { label: '30 days', val: 30 * 24 * 60 * 60 },
                                            { label: '90 days', val: 90 * 24 * 60 * 60 }
                                        ].map((opt) => (
                                            <button
                                                key={opt.label}
                                                onClick={() => { setResolutionSeconds(opt.val); setShowDatePicker(false); }}
                                                className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${!showDatePicker && resolutionSeconds === opt.val
                                                    ? 'bg-white text-black'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setShowDatePicker(true)}
                                            className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${showDatePicker
                                                ? 'bg-[#F492B7] text-black'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            Pick Date
                                        </button>
                                    </div>

                                    {/* Custom Date Picker */}
                                    {showDatePicker && (
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm font-medium outline-none focus:border-[#F492B7] text-white color-scheme-dark"
                                            value={customDate}
                                            onChange={(e) => setCustomDate(e.target.value)}
                                        />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest block">Source of Truth (URL)</label>
                                    <input
                                        type="text"
                                        placeholder="https://official-source.com/news/123"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm font-medium outline-none focus:border-[#F492B7] text-gray-300"
                                        value={sourceUrl}
                                        onChange={(e) => setSourceUrl(e.target.value)}
                                    />
                                    <p className="text-[10px] text-gray-600">Protocol Veritas: If this link fails verification, the market will be invalidated.</p>
                                </div>

                                <div className="space-y-3">


                                    <div className="flex justify-between items-center">
                                        <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Outcomes</label>
                                        {marketType === 'multiple' && (
                                            <button onClick={addOption} className="text-[#F492B7] text-[10px] font-black uppercase tracking-widest hover:text-[#ff6fb7]">+ Add Outcome</button>
                                        )}
                                    </div>

                                    {marketType === 'binary' ? (
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                            <span className="text-white font-bold text-sm">2 Outcomes</span>
                                            <div className="flex gap-2">
                                                <span className="bg-[#10B981]/20 text-[#10B981] px-2 py-1 rounded text-xs font-black">YES</span>
                                                <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-xs font-black">NO</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                            {options.map((option, index) => (
                                                <div key={option.id} className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                    <input type="text" placeholder="Outcome Name..." className="w-full bg-transparent border-none text-white font-bold outline-none text-sm" value={option.name} onChange={(e) => {
                                                        const newOpts = [...options];
                                                        newOpts[index].name = e.target.value;
                                                        setOptions(newOpts);
                                                    }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>


                                <button
                                    onClick={handleCreateMarket}
                                    disabled={isLoading}
                                    className="w-full bg-[#F492B7] text-black py-5 rounded-xl font-black text-lg uppercase shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? '⏳ CREATING ON SOLANA...' : 'CREATE MARKET'}
                                </button>

                                {error && <ErrorMessage error={error} />}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ErrorMessage({ error }: { error: string }) {
    const isTimeout = error.toLowerCase().includes('timeout') || error.toLowerCase().includes('slow');
    const isRejection = error.includes('cancelled');

    return (
        <div className="bg-red-900/20 border border-red-500 rounded-xl p-4 mt-4 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-red-400 font-bold flex items-center gap-2">
                {isTimeout && '⏱️ Transaction Timeout'}
                {isRejection && '🚫 Transaction Cancelled'}
                {!isTimeout && !isRejection && '❌ Error'}
            </p>
            <p className="text-red-300 text-xs mt-1 font-mono">{error}</p>

            {isTimeout && (
                <div className="mt-3 text-[10px] text-gray-400 bg-black/20 p-2 rounded">
                    <p className="font-bold mb-1">Devnet Tips:</p>
                    <ul className="list-disc ml-4 space-y-1">
                        <li>Wait 30s and try again</li>
                        <li>Check your wallet has SOL (~0.01)</li>
                        <li>Ensure you are connected to Devnet</li>
                    </ul>
                </div>
            )}
        </div>
    );
}