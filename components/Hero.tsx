'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

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

const Hero = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const [marketType, setMarketType] = useState<'binary' | 'multiple'>('binary');
    const [poolName, setPoolName] = useState('');
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [options, setOptions] = useState([
        { id: 1, name: 'Yes', image: null as string | null },
        { id: 2, name: 'No', image: null as string | null }
    ]);

    const { setVisible } = useWalletModal();

    const handleImageUpload = (file: File, index?: number) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (marketType === 'binary') {
                setMainImage(result);
            } else if (index !== undefined) {
                const newOptions = [...options];
                newOptions[index].image = result;
                setOptions(newOptions);
            }
        };
        reader.readAsDataURL(file);
    };

    const addOption = () => {
        setOptions([...options, { id: options.length + 1, name: '', image: null }]);
    };

    const switchMode = (mode: 'binary' | 'multiple') => {
        setMarketType(mode);
        if (mode === 'binary') {
            setOptions([{ id: 1, name: 'Yes', image: null }, { id: 2, name: 'No', image: null }]);
        } else {
            setOptions([{ id: 1, name: '', image: null }, { id: 2, name: '', image: null }, { id: 3, name: '', image: null }]);
        }
    };

    const steps = [
        { title: "1. Pick a Tent", description: "Enter the Djinn bazaar and choose your fortune.", image: (<div className="h-40 bg-amber-100 rounded-2xl flex items-center justify-center text-4xl">🔮</div>) },
        { title: "2. Deposit Solana", description: "Connect your Phantom wallet to fund your journey.", image: (<div className="h-40 bg-purple-100 rounded-2xl flex items-center justify-center text-4xl">👻</div>) },
        { title: "3. Claim Your Fortune 💰", description: "The Djinn rewards the bold.", image: (<div className="h-40 bg-yellow-100 rounded-2xl flex items-center justify-center text-4xl">💰</div>) }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
        else { setVisible(true); setIsHowItWorksOpen(false); setCurrentStep(0); }
    };

    return (
        <>
            <section className="relative w-full min-h-[40vh] flex flex-col items-center justify-center px-4 pt-24 pb-6">
                <div className="w-full max-w-3xl flex flex-col items-center gap-5">
                    <div className="relative group w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                        <input type="text" className="block w-full pl-12 pr-4 py-4 bg-[#1C1D25] border border-gray-800 rounded-2xl text-lg text-white outline-none focus:ring-2 focus:ring-[#F492B7]" placeholder="Search for markets..." />
                    </div>

                    <div className="flex justify-center mt-1">
                        <button onClick={() => setIsCreateModalOpen(true)} className="bg-[#F492B7] text-black text-xl font-black py-4 px-12 rounded-xl shadow-[0_0_30px_rgba(244,146,183,0.3)] hover:scale-105 active:scale-95 transition-all uppercase">
                            Create a Market
                        </button>
                    </div>

                    <button onClick={() => setIsHowItWorksOpen(true)} className="px-6 py-2 rounded-full bg-[#F492B7]/10 border border-[#F492B7]/20 text-[#F492B7] text-sm font-bold">
                        How it works?
                    </button>
                </div>
            </section>

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsCreateModalOpen(false)} />

                    <div className="relative bg-[#0B0E14] border border-white/10 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
                            <CloseIcon />
                        </button>

                        <div className="p-10 md:p-12 text-white">
                            <h2 className="text-4xl text-white mb-8 tracking-tight"
                                style={{ fontFamily: 'var(--font-adriane), serif', fontWeight: 700 }}>
                                New Market
                            </h2>

                            <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit border border-white/5">
                                <button onClick={() => switchMode('binary')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${marketType === 'binary' ? 'bg-[#F492B7] text-black' : 'text-gray-500 hover:text-white'}`}>Binary</button>
                                <button onClick={() => switchMode('multiple')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${marketType === 'multiple' ? 'bg-[#F492B7] text-black' : 'text-gray-500 hover:text-white'}`}>Multiple</button>
                            </div>

                            <div className="space-y-6">
                                {marketType === 'binary' && (
                                    <div
                                        className="w-full h-32 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center hover:border-[#F492B7] transition-all cursor-pointer overflow-hidden"
                                        onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.onchange = (e: any) => handleImageUpload(e.target.files[0]); input.click(); }}
                                    >
                                        {mainImage ? (
                                            <img src={mainImage} className="w-full h-full object-cover" alt="Main" />
                                        ) : (
                                            <div className="text-center">
                                                <span className="text-xl block mb-1">🖼️</span>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Add Market Image</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest block mb-2">Market Question</label>
                                    <input
                                        type="text"
                                        placeholder="Enter question..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-5 text-lg font-bold outline-none focus:border-[#F492B7] transition-colors placeholder:text-gray-700"
                                        value={poolName}
                                        onChange={(e) => setPoolName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                            Outcomes
                                        </label>
                                        {marketType === 'multiple' && (
                                            <button onClick={addOption} className="text-[#F492B7] text-[10px] font-black uppercase tracking-widest hover:text-[#ff6fb7]">+ Add Option</button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {options.map((option, index) => (
                                            <div key={option.id} className="flex gap-4 items-center bg-white/5 p-3 rounded-xl border border-white/10 transition-all focus-within:border-[#F492B7] hover:border-white/20">
                                                {marketType === 'multiple' && (
                                                    <div
                                                        className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center bg-black/40 hover:border-[#F492B7] cursor-pointer overflow-hidden"
                                                        onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.onchange = (e: any) => handleImageUpload(e.target.files[0], index); input.click(); }}
                                                    >
                                                        {option.image ? <img src={option.image} className="w-full h-full object-cover" /> : <span className="opacity-30 text-xs">🖼️</span>}
                                                    </div>
                                                )}
                                                <input
                                                    type="text"
                                                    placeholder={marketType === 'binary' ? (index === 0 ? "Yes" : "No") : "Option name..."}
                                                    className="flex-1 bg-transparent border-none text-white font-bold outline-none text-sm placeholder:text-gray-600 focus:text-[#F492B7] transition-colors"
                                                    value={option.name}
                                                    onChange={(e) => {
                                                        const newOpts = [...options];
                                                        newOpts[index].name = e.target.value;
                                                        setOptions(newOpts);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button onClick={() => setIsCreateModalOpen(false)} className="w-full bg-[#F492B7] text-black py-5 rounded-xl font-black text-lg hover:shadow-[0_0_30px_rgba(244,146,183,0.3)] transition-all uppercase mt-4 tracking-wider">
                                    Create Market
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isHowItWorksOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsHowItWorksOpen(false); setCurrentStep(0); }} />
                    <div className="relative bg-white rounded-3xl w-full max-w-3xl p-12 shadow-2xl">
                        <button onClick={() => { setIsHowItWorksOpen(false); setCurrentStep(0); }} className="absolute top-6 right-6 text-gray-400"><CloseIcon /></button>
                        {steps[currentStep].image}
                        <div className="mt-8 text-center">
                            <h2 className="text-4xl font-black text-gray-900 mb-4">{steps[currentStep].title}</h2>
                            <p className="text-lg text-gray-600 leading-relaxed">{steps[currentStep].description}</p>
                        </div>
                        <button onClick={handleNext} className="mt-10 w-full bg-[#F492B7] text-white py-5 rounded-2xl font-black text-xl">
                            {currentStep === steps.length - 1 ? 'Own the Future' : 'Next →'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Hero;