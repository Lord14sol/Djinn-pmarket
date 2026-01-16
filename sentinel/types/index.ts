import { PublicKey } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';

export interface SentinelConfig {
    solanaRpcUrl: string;
    oracleKeypair: Keypair;
    programId: PublicKey;
    checkInterval: number; // ms entre cada scan
    maxConcurrentResolutions: number;
}

export interface Market {
    address: PublicKey;
    question: string;
    sourceLink: string;
    resolutionTime: number; // Unix timestamp
    isResolved: boolean;
    totalLiquidity: number; // Lamports
    outcomes: string[]; // ["YES", "NO"] typical
}

export interface LinkData {
    isValid: boolean;
    text: string;
    publishDate?: string;
    author?: string;
    images?: string[];
    type: 'article' | 'tweet' | 'youtube' | 'pdf' | 'unknown';
}

export interface AIResponse {
    answer: 'YES' | 'NO' | 'UNCERTAIN';
    reasoning: string;
    confidence: number; // 0.0 to 1.0
    sources: string[];
}

export interface ResolutionResult {
    market: Market;
    finalOutcome: 'YES' | 'NO' | 'INCERTAIN' | 'ESCALATE';
    confidenceScore: number;
    sourcesUsed: AIResponse[];
    processingTimeMs: number;
    error?: string;
}

export interface SentinelStatus {
    isRunning: boolean;
    uptime: number;
    totalResolved: number;
    queueSize: number;
    successRate: number;
    feesCollected: number;
    lastActivity: string;
}
