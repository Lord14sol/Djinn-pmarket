'use client';

import React, { useState } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { compressImage } from '@/lib/utils';
import { checkMarketMilestones, createMarket } from '@/lib/supabase-db';
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
    const { setVisible } = useWalletModal();
    const { createMarket: createMarketOnChain, isReady: isContractReady } = useDjinnProtocol();

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [marketType, setMarketType] = useState<'binary' | 'multiple'>('binary');
    const [poolName, setPoolName] = useState('');
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [options, setOptions] = useState([
        { id: 1, name: '' },
        { id: 2, name: '' }
    ]);
    const [initialBuyAmount, setInitialBuyAmount] = useState('0');
    const [initialBuySide, setInitialBuySide] = useState<'yes' | 'no'>('yes');
    const [error, setError] = useState('');

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

    // --- MAIN LOGIC (Ported from Hero.tsx) ---
    const handleCreateMarket = async () => {
        // ✅ Check if Supabase is configured
        if (!isSupabaseConfigured) {
            setError('⚠️ Supabase not configured. Check your .env.local file.');
            console.error('Supabase credentials missing!');
            return;
        }

        if (!publicKey) {
            setVisible(true);
            return;
        }
        if (!poolName) return alert("Please enter a question");


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

            const resolutionTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
            const finalBanner = mainImage ? await compressImage(mainImage) : "🔮";

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
                    const contractPromise = createMarketOnChain(
                        slug,
                        poolName,
                        new Date(resolutionTime * 1000),
                        buyAmount,
                        initialBuySide
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
                end_date: new Date(resolutionTime * 1000).toISOString(),
                market_pda: marketPDA,
                yes_token_mint: yesTokenMint,
                no_token_mint: noTokenMint,
                tx_signature: txSignature,
                total_yes_pool: 0,
                total_no_pool: 0,
                resolved: false,
                resolution_source: 'DERIVED', // Changed from derived to 'DERIVED' to match type if needed, or keeping explicit string
                banner_url: finalBanner
            });

            // SUCCESS - Show Animation and Redirect
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                router.push(`/market/${slug}`);
            }, 2000);

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
                category: 'New', // Force category to New
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

            onClose();

            // Trigger Milestones
            import('@/lib/supabase-db').then(mod => {
                mod.checkMarketMilestones(publicKey.toString());
            });

            // Redirect or Refresh (Optional)
            // window.location.reload(); 

        } catch (error: any) {
            console.error("❌ Error:", error);

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

                {isSuccess ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center space-y-6">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-[bounce_1s_infinite]">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h2 className="text-3xl font-black text-white">Market Created!</h2>
                        <p className="text-gray-400">Taking you there...</p>
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
                                <div>
                                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest block mb-2">Market Banner (Top Image)</label>
                                    <div className="w-full h-32 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center cursor-pointer overflow-hidden"
                                        onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.onchange = (e: any) => handleImageUpload(e.target.files[0]); input.click(); }}>
                                        {mainImage ? <img src={mainImage} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Upload Banner</span>}
                                    </div>
                                </div>

                                <input type="text" placeholder="Enter question..." className="w-full bg-black/40 border border-white/10 rounded-xl p-5 text-lg font-bold outline-none focus:border-[#F492B7]" value={poolName} onChange={(e) => setPoolName(e.target.value)} />



                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Outcomes</label>
                                        {marketType === 'multiple' && (
                                            <button onClick={addOption} className="text-[#F492B7] text-[10px] font-black uppercase tracking-widest hover:text-[#ff6fb7]">+ Add Outcome</button>
                                        )}
                                    </div>
                                    <div className="max-h-48 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                        {options.map((option, index) => (
                                            <div key={option.id} className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                <input type="text" placeholder={marketType === 'binary' ? (index === 0 ? "Yes" : "No") : "Outcome Name..."} className="w-full bg-transparent border-none text-white font-bold outline-none text-sm" value={option.name} onChange={(e) => {
                                                    const newOpts = [...options];
                                                    newOpts[index].name = e.target.value;
                                                    setOptions(newOpts);
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* INITIAL BUY SECTION */}
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Initial Buy (Optional)</label>
                                        <span className="text-[10px] text-gray-500 font-bold">Launch with a position</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                placeholder="0.0"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#F492B7] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={initialBuyAmount}
                                                onChange={(e) => setInitialBuyAmount(e.target.value)}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-500">SOL</span>
                                        </div>
                                        <div className="flex bg-black/40 rounded-xl border border-white/10 p-1">
                                            <button
                                                onClick={() => setInitialBuySide('yes')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${initialBuySide === 'yes' ? 'bg-[#F492B7] text-black' : 'text-gray-500'}`}
                                            >
                                                Yes
                                            </button>
                                            <button
                                                onClick={() => setInitialBuySide('no')}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${initialBuySide === 'no' ? 'bg-[#F492B7] text-black' : 'text-gray-500'}`}
                                            >
                                                No
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-gray-500 flex justify-between px-1 italic">
                                        <span>Creation Fee: 0.05 SOL</span>
                                        {parseFloat(initialBuyAmount) > 0 && <span>+ {initialBuyAmount} SOL investment</span>}
                                    </div>
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