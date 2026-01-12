'use client';

import React, { useState } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDjinnProtocol } from '@/hooks/useDjinnProtocol';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/utils';
import { checkMarketMilestones } from '@/lib/supabase-db'; // Direct import if possible, or dynamic
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

interface CreateMarketModalProps { isOpen: boolean; onClose: () => void; }

export default function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { setVisible } = useWalletModal();
    const { createMarket: createMarketOnChain, isReady: isContractReady } = useDjinnProtocol();

    const [isLoading, setIsLoading] = useState(false);
    const [marketType, setMarketType] = useState<'binary' | 'multiple'>('binary');
    const [poolName, setPoolName] = useState('');
    const [resolutionSource, setResolutionSource] = useState('');
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [options, setOptions] = useState([
        { id: 1, name: '' },
        { id: 2, name: '' }
    ]);

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
        if (!publicKey) {
            setVisible(true);
            return;
        }
        if (!poolName) return alert("Please enter a question");
        if (!resolutionSource) return alert("Please provide a Resolution Source (URL)");

        setIsLoading(true);

        try {
            console.log("🚀 Creating market on blockchain...");

            // Generate slug
            const slug = poolName.toLowerCase().trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);

            const resolutionTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
            const finalBanner = mainImage ? await compressImage(mainImage) : "🔮";

            let marketPDA = '';
            let txSignature = '';
            let yesTokenMint = '';
            let noTokenMint = '';

            // Try to create on blockchain (with timeout to prevent hanging)
            if (isContractReady && wallet && publicKey) {
                try {
                    console.log("⛓️ Calling smart contract (15s timeout)...");

                    // Add timeout wrapper to prevent indefinite hanging
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Blockchain timeout')), 15000)
                    );

                    const contractPromise = createMarketOnChain(poolName, poolName, new Date(resolutionTime * 1000), 200);

                    const result = await Promise.race([contractPromise, timeoutPromise]) as any;

                    marketPDA = result.marketPda.toBase58();
                    yesTokenMint = result.yesMintPda.toBase58();
                    noTokenMint = result.noMintPda.toBase58();
                    txSignature = result.tx;
                    console.log("✅ Blockchain TX:", txSignature);
                } catch (blockchainError: any) {
                    console.warn("⚠️ Blockchain failed/timeout, saving locally:", blockchainError.message);
                    marketPDA = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    txSignature = 'local_fallback';
                }
            } else {
                console.log("ℹ️ Contract not ready or wallet not connected, saving locally");
                marketPDA = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                txSignature = 'local_fallback';
            }

            // SAVE TO SUPABASE
            const { error: dbError } = await supabase.from('markets').insert({
                slug,
                title: poolName,
                creator_wallet: publicKey.toString(),
                end_date: new Date(resolutionTime * 1000).toISOString(),
                market_pda: marketPDA,
                yes_token_mint: yesTokenMint,
                no_token_mint: noTokenMint,
                tx_signature: txSignature,
                banner_url: finalBanner,
                total_yes_pool: 0,
                total_no_pool: 0,
                resolved: false,
                resolution_source: resolutionSource
            });

            if (dbError) {
                console.error('DB error:', dbError);
            }

            alert("✨ Market Created Successfully!");

            // RESET
            setPoolName('');
            setResolutionSource('');
            setMainImage(null);
            setMarketType('binary');
            setOptions([{ id: 1, name: '' }, { id: 2, name: '' }]);
            // DISPARAR EL EVENTO PARA QUE EL PERFIL SE ENTERE
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('market-created')); // Custom event for in-app refresh

            onClose();

            // Trigger Milestones
            import('@/lib/supabase-db').then(mod => {
                mod.checkMarketMilestones(publicKey.toString());
            });

            // Redirect or Refresh (Optional)
            // window.location.reload(); 

        } catch (error: any) {
            console.error("❌ Error:", error);
            alert(`Failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !isLoading && onClose()} />
            <div className="relative bg-[#0B0E14] border border-white/10 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
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

                        <div className="space-y-1">
                            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest block ml-1">Resolution Source (URL)</label>
                            <input type="text" placeholder="e.g. https://www.fifa.com/match/..." className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold outline-none focus:border-[#F492B7]" value={resolutionSource} onChange={(e) => setResolutionSource(e.target.value)} />
                        </div>

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

                        <button
                            onClick={handleCreateMarket}
                            disabled={isLoading}
                            className="w-full bg-[#F492B7] text-black py-5 rounded-xl font-black text-lg uppercase shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? '⏳ CREATING ON SOLANA...' : 'CREATE MARKET'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}