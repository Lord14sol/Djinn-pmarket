"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertTriangle, FileText, Scale } from 'lucide-react';
import Link from 'next/link';

export default function LegalPage() {
    const [activeTab, setActiveTab] = useState<'TERMS' | 'PRIVACY' | 'RISK'>('TERMS');

    return (
        <div className="min-h-screen bg-black pt-28 pb-20 px-4 md:px-8 max-w-5xl mx-auto font-sans">
            <div className="mb-12 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4"
                >
                    <Scale size={14} className="text-[#F492B7]" />
                    <span className="text-xs font-bold text-[#F492B7] uppercase tracking-widest">Legal Hub</span>
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
                    Terms & Protocol <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F492B7] to-cyan-400">Governance</span>
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    Djinn is a decentralized, non-custodial prediction market protocol.
                    By using the interface, you agree to the following terms and acknowledge the risks involved.
                </p>
            </div>

            {/* TABS */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
                <TabButton
                    label="Terms of Service"
                    icon={<FileText size={16} />}
                    isActive={activeTab === 'TERMS'}
                    onClick={() => setActiveTab('TERMS')}
                />
                <TabButton
                    label="Risk Disclaimer"
                    icon={<AlertTriangle size={16} />}
                    isActive={activeTab === 'RISK'}
                    onClick={() => setActiveTab('RISK')}
                />
                <TabButton
                    label="Privacy Policy"
                    icon={<Lock size={16} />}
                    isActive={activeTab === 'PRIVACY'}
                    onClick={() => setActiveTab('PRIVACY')}
                />
            </div>

            {/* CONTENT CARD */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-[#0E0E0E] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F492B7]/5 rounded-full blur-[120px] pointer-events-none" />

                {activeTab === 'TERMS' && <TermsContent />}
                {activeTab === 'RISK' && <RiskContent />}
                {activeTab === 'PRIVACY' && <PrivacyContent />}

            </motion.div>

            <div className="mt-12 text-center border-t border-white/5 pt-8">
                <p className="text-xs text-gray-600 uppercase tracking-widest">
                    Last Updated: January 2026 • Djinn Protocol v1.0
                </p>
                <div className="mt-4">
                    <Link href="/" className="text-sm font-bold text-white hover:text-[#F492B7] transition-colors">
                        ← Back to Markets
                    </Link>
                </div>
            </div>
        </div>
    );
}

function TabButton({ label, icon, isActive, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 ${isActive
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

function TermsContent() {
    return (
        <div className="space-y-8 text-gray-300">
            <Section title="1. Non-Custodial Nature">
                <p>
                    Djinn is a completely non-custodial interface. We do not hold, control, or have access to your funds.
                    All transactions occur directly on the Solana blockchain between your wallet and the smart contract.
                    You retain full control and responsibility for your private keys and assets at all times.
                </p>
            </Section>

            <Section title="2. Market Resolution">
                <p>
                    Markets are resolved based on real-world outcomes determined by our Oracle mechanism (AI-assisted + Committee verification).
                    By participating, you accept that the Oracle's decision is final and binding on the smart contract level.
                    Djinn Protocol is not liable for "incorrect" resolutions if the Oracle behaves according to the defined rules.
                </p>
            </Section>

            <Section title="3. Fees & Economics">
                <p>
                    The protocol charges the following fees to sustain operations and liquidity:
                </p>
                <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                    <li><strong className="text-white">Trading Fee:</strong> 1.0% on every trade (split between Market Creator and Protocol).</li>
                    <li><strong className="text-white">Resolution Fee:</strong> 2.0% on settlement profits.</li>
                    <li><strong className="text-white">Creation Fee:</strong> 0.05 SOL to prevent spam.</li>
                </ul>
            </Section>

            <Section title="4. Geography Restrictions">
                <p>
                    You agree that you are NOT a resident of, or accessing this interface from, any jurisdiction where prediction markets
                    or crypto-derivatives are prohibited by law (including but not limited to the USA, North Korea, Iran).
                    It is your sole responsibility to ensure compliance with your local laws.
                </p>
            </Section>
        </div>
    );
}

function RiskContent() {
    return (
        <div className="space-y-8 text-gray-300">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-4 items-start mb-6">
                <AlertTriangle className="text-red-500 shrink-0 mt-1" />
                <div>
                    <h4 className="text-red-500 font-bold mb-1">Standard Crypto Risk Warning</h4>
                    <p className="text-sm">
                        Prediction markets are high-risk financial instruments. You can lose 100% of your capital if your prediction is incorrect.
                    </p>
                </div>
            </div>

            <Section title="Smart Contract Risk">
                <p>
                    While we strive for security, smart contracts are innovative experimental technology.
                    Bugs, hacks, or exploits could result in the loss of funds. Djinn makes no guarantees regarding the security of the underlying blockchain code.
                </p>
            </Section>

            <Section title="Liquidity Risk">
                <p>
                    Markets primarily use a Virtual AMM (CPMM). In low-liquidity markets, slippage can be high.
                    You may not be able to exit your position at a favorable price if there is insufficient counter-party volume.
                </p>
            </Section>

            <Section title="Oracle Failure">
                <p>
                    In extremely rare cases, an Oracle may fail to report, report incorrectly, or be delayed.
                    Mechanisms are in place to dispute or void markets, but time-delays may occur in fund withdrawal.
                </p>
            </Section>
        </div>
    );
}

function PrivacyContent() {
    return (
        <div className="space-y-8 text-gray-300">
            <Section title="No Personal Data Collection">
                <p>
                    Djinn does not collect, store, or process personal identifiers (names, emails, addresses).
                    We strictly operate with public blockchain addresses.
                </p>
            </Section>

            <Section title="Public Blockchain Data">
                <p>
                    Please be aware that all your transactions (bets, claims, market creation) are permanently recorded on the public Solana blockchain.
                    This history is visible to anyone and cannot be erased by us.
                </p>
            </Section>

            <Section title="Local Storage">
                <p>
                    We use local browser storage to save your preferences (e.g., chart settings, last viewed markets).
                    This data never leaves your device.
                </p>
            </Section>

            <Section title="Cookies & Tracking">
                <p>
                    We do not use third-party tracking cookies or analytics pixels that sell your data.
                    We respect the ethos of Web3 privacy.
                </p>
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="border-b border-white/5 pb-6 last:border-0 last:pb-0">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Shield size={16} className="text-[#F492B7]" />
                {title}
            </h3>
            <div className="leading-relaxed">
                {children}
            </div>
        </div>
    );
}
