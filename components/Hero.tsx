'use client';

import React, { useState } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { compressImage } from '@/lib/utils';
import HowItWorksModal from './HowItWorksModal';

// --- CONFIGURACIÓN DE LA BÓVEDA MAESTRA ---
const CREATION_FEE_SOL = 0.05;
const TREASURY_WALLET = new PublicKey("C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X");

// --- ICONOS ---
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const Hero = ({ onMarketCreated }: { onMarketCreated: (m: any) => void }) => {
    // Hooks de Solana
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { setVisible } = useWalletModal();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [marketType, setMarketType] = useState<'binary' | 'multiple'>('binary');
    const [poolName, setPoolName] = useState('');
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [options, setOptions] = useState([
        { id: 1, name: '' },
        { id: 2, name: '' }
    ]);

    // --- FUNCIÓN DE CREACIÓN MAESTRA ---
    const handleCreateMarket = async () => {
        // 1. Validaciones
        if (!publicKey) {
            setVisible(true);
            return;
        }
        if (!poolName) return alert("Please enter a question, Sir.");

        setIsLoading(true);

        try {
            console.log("Iniciando protocolo de cobro...");

            // 2. OBTENER BLOCKHASH RECIENTE (Evita que se congele)
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

            // 3. CONSTRUIR TRANSACCIÓN
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_WALLET,
                    lamports: CREATION_FEE_SOL * LAMPORTS_PER_SOL,
                })
            );

            // 4. ENVIAR Y CONFIRMAR
            const signature = await sendTransaction(transaction, connection);

            // Confirmación robusta
            await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            }, 'confirmed');

            console.log("Pago confirmado. Signature:", signature);

            // 5. LÓGICA DE CREACIÓN VISUAL
            const finalBanner = mainImage ? await compressImage(mainImage) : "🔮";

            const newMarket = {
                id: Date.now(),
                title: poolName,
                icon: finalBanner,
                type: marketType,
                options: marketType === 'multiple' ? options : [
                    { id: 1, name: 'Yes', chance: 50 },
                    { id: 2, name: 'No', chance: 50 }
                ],
                chance: 50,
                volume: "$0",
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                slug: poolName.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, ''),
                creator: publicKey.toString(),
                createdAt: Date.now(),
                txSignature: signature,
                economics: {
                    creationFee: CREATION_FEE_SOL,
                    resolutionFee: 2.0
                }
            };

            onMarketCreated(newMarket);

            // 6. RESETEAR FORMULARIO
            setIsCreateModalOpen(false);
            setPoolName('');
            setMainImage(null);
            setMarketType('binary');
            setOptions([{ id: 1, name: '' }, { id: 2, name: '' }]);

        } catch (error) {
            console.error("Error creating market:", error);
            // No alertamos si el usuario rechaza la transacción manualmente
        } finally {
            setIsLoading(false);
        }
    };

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

    return (
        <>
            <section className="relative w-full min-h-[40vh] flex flex-col items-center justify-center px-4 pt-24 pb-6">
                <div className="w-full max-w-3xl flex flex-col items-center gap-5">
                    {/* BARRA DE BÚSQUEDA */}
                    <div className="relative group w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                        <input type="text" className="block w-full pl-12 pr-4 py-4 bg-[#1C1D25] border border-gray-800 rounded-2xl text-lg text-white outline-none focus:ring-2 focus:ring-[#F492B7]" placeholder="Search for markets..." />
                    </div>

                    {/* BOTÓN PRINCIPAL */}
                    <div className="flex justify-center mt-1">
                        <button onClick={() => setIsCreateModalOpen(true)} className="bg-[#F492B7] text-black text-xl font-black py-4 px-12 rounded-xl shadow-[0_0_30px_rgba(244,146,183,0.3)] hover:scale-105 active:scale-95 transition-all uppercase">
                            Create a Market
                        </button>
                    </div>

                    {/* BOTÓN HOW IT WORKS */}
                    <button onClick={() => setIsHowItWorksOpen(true)} className="px-6 py-2 rounded-full bg-[#F492B7]/10 border border-[#F492B7]/20 text-[#F492B7] text-sm font-bold hover:bg-[#F492B7]/20 transition-all">
                        How it works?
                    </button>
                </div>
            </section>

            {/* MODAL DE CREACIÓN */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !isLoading && setIsCreateModalOpen(false)} />
                    <div className="relative bg-[#0B0E14] border border-white/10 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl">
                        <button onClick={() => setIsCreateModalOpen(false)} disabled={isLoading} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors disabled:opacity-50">
                            <CloseIcon />
                        </button>

                        <div className="p-10 md:p-12 text-white">
                            <h2 className="text-4xl text-white mb-8 font-bold tracking-tight">New Market</h2>

                            <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit">
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

                                <button
                                    onClick={handleCreateMarket}
                                    disabled={isLoading}
                                    className="w-full bg-[#F492B7] text-black py-5 rounded-xl font-black text-lg uppercase shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? 'Processing...' : 'Create Market'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <HowItWorksModal
                isOpen={isHowItWorksOpen}
                onClose={() => setIsHowItWorksOpen(false)}
            />
        </>
    );
};

export default Hero;