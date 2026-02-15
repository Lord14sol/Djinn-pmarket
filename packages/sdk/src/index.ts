/**
 * @djinn/sdk — TypeScript SDK for Djinn Prediction Market Protocol
 *
 * This is the platform-side SDK that bot developers use to interact
 * with Djinn smart contracts and APIs. Works independently of OpenClaw.
 *
 * Usage:
 *   import { DjinnSDK } from '@djinn/sdk';
 *   const djinn = new DjinnSDK({ rpcUrl, keypairPath });
 *   await djinn.registerBot({ name: 'AlphaBot', category: 'crypto' });
 */

import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as fs from 'fs';
import idl from './idl/djinn_market.json';
export { idl };

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const DJINN_PROGRAM_ID = new PublicKey(
    'A8pVMgP6vwjGqcbYh1WGWDjXq9uwQRoF9Lz1siLmD7nm'
);

export const BOT_REGISTRATION_STAKE = 10 * LAMPORTS_PER_SOL; // 10 SOL

export enum BotTier {
    Novice = 0,
    Verified = 1,
    Elite = 2,
}

export enum StrategyCategory {
    All = 0,
    Sports = 1,
    Crypto = 2,
    Politics = 3,
    Other = 4,
}

export enum SlashReason {
    WashTrading = 0,
    Sybil = 1,
    FrontRunning = 2,
    MultiBotAbuse = 3,
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BotProfile {
    owner: string;
    name: string;
    metadataUri: string;
    strategyCategory: StrategyCategory;
    stake: number;
    tier: BotTier;
    isActive: boolean;
    isPaperTrading: boolean;
    isFrozen: boolean;
    totalTrades: number;
    totalVolume: number;
    winningTrades: number;
    losingTrades: number;
    verificationsSubmitted: number;
    verificationsCorrect: number;
    verificationsWrong: number;
    bountiesEarned: number;
    communityUpvotes: number;
    communityDownvotes: number;
    reportsAgainst: number;
    slashingIncidents: number;
    hasVault: boolean;
    registeredAt: number;
    lastTradeAt: number;
}

export interface Market {
    publicKey: string;
    question: string;
    category: string;
    status: 'active' | 'resolved' | 'expired';
    yesPrice: number;
    noPrice: number;
    totalVolume: number;
    expiresAt: number;
    isChronos: boolean;
}

export interface VaultInfo {
    publicKey: string;
    bot: string;
    totalAum: number;
    numDepositors: number;
    highWaterMark: number;
    isPaused: boolean;
    isLiquidating: boolean;
    totalProfit: number;
    totalLoss: number;
}

export interface TradeResult {
    signature: string;
    sharesReceived: number;
    totalCost: number;
}

export interface WebhookConfig {
    url: string;
    events: WebhookEvent[];
    secret?: string;
}

export type WebhookEvent =
    | 'market_created'
    | 'market_resolved'
    | 'bounty_available'
    | 'bot_frozen'
    | 'vault_circuit_breaker'
    | 'slash_proposal'
    | 'chronos_round';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

export const TIER_LIMITS = {
    [BotTier.Novice]: {
        maxPerTrade: 2 * LAMPORTS_PER_SOL,
        maxPerHour: 10 * LAMPORTS_PER_SOL,
        maxPerDay: 50 * LAMPORTS_PER_SOL,
        minInterval: 30, // seconds
        maxConcurrent: 5,
        vaultMaxDepositPerUser: 0, // No vault
        vaultMaxAum: 0,
    },
    [BotTier.Verified]: {
        maxPerTrade: 20 * LAMPORTS_PER_SOL,
        maxPerHour: 100 * LAMPORTS_PER_SOL,
        maxPerDay: 500 * LAMPORTS_PER_SOL,
        minInterval: 10,
        maxConcurrent: 20,
        vaultMaxDepositPerUser: 10 * LAMPORTS_PER_SOL,
        vaultMaxAum: 100 * LAMPORTS_PER_SOL,
    },
    [BotTier.Elite]: {
        maxPerTrade: 50 * LAMPORTS_PER_SOL,
        maxPerHour: 500 * LAMPORTS_PER_SOL,
        maxPerDay: 2000 * LAMPORTS_PER_SOL,
        minInterval: 0,
        maxConcurrent: Infinity,
        vaultMaxDepositPerUser: 100 * LAMPORTS_PER_SOL,
        vaultMaxAum: 10000 * LAMPORTS_PER_SOL,
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SDK CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DjinnSDKConfig {
    rpcUrl?: string;
    keypairPath?: string;
    apiUrl?: string;
    webhookUrl?: string;
}

export class DjinnSDK {
    private connection: Connection;
    private keypair: Keypair | null = null;
    private apiUrl: string;
    private webhookUrl: string | null;

    constructor(config: DjinnSDKConfig = {}) {
        this.connection = new Connection(
            config.rpcUrl || process.env.DJINN_RPC_URL || 'https://api.mainnet-beta.solana.com',
            'confirmed'
        );
        this.apiUrl = config.apiUrl || process.env.DJINN_API_URL || 'https://api.djinn.world';
        this.webhookUrl = config.webhookUrl || process.env.DJINN_WEBHOOK_URL || null;

        if (config.keypairPath || process.env.DJINN_BOT_KEYPAIR_PATH) {
            const path = (config.keypairPath || process.env.DJINN_BOT_KEYPAIR_PATH)!
                .replace('~', process.env.HOME || '');
            const secretKey = JSON.parse(fs.readFileSync(path, 'utf-8'));
            this.keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
        }
    }

    // ─── PDA Helpers ──────────────────────────────────────────────────────────

    getBotProfilePDA(owner?: PublicKey): [PublicKey, number] {
        const ownerKey = owner || this.keypair!.publicKey;
        return PublicKey.findProgramAddressSync(
            [Buffer.from('bot_profile'), ownerKey.toBuffer()],
            DJINN_PROGRAM_ID
        );
    }

    getBotEscrowPDA(owner?: PublicKey): [PublicKey, number] {
        const ownerKey = owner || this.keypair!.publicKey;
        return PublicKey.findProgramAddressSync(
            [Buffer.from('bot_escrow'), ownerKey.toBuffer()],
            DJINN_PROGRAM_ID
        );
    }

    getVaultPDA(botProfileKey: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('agent_vault'), botProfileKey.toBuffer()],
            DJINN_PROGRAM_ID
        );
    }

    getMarketVaultPDA(marketKey: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('market_vault'), marketKey.toBuffer()],
            DJINN_PROGRAM_ID
        );
    }

    getBountyPoolPDA(marketKey: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('bounty_pool'), marketKey.toBuffer()],
            DJINN_PROGRAM_ID
        );
    }

    getInsuranceVaultPDA(): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('insurance_vault')],
            DJINN_PROGRAM_ID
        );
    }

    // ─── API Methods ──────────────────────────────────────────────────────────

    /** Fetch active markets */
    async listMarkets(params?: {
        category?: string;
        status?: string;
        limit?: number;
    }): Promise<Market[]> {
        const query = new URLSearchParams();
        if (params?.category) query.set('category', params.category);
        if (params?.status) query.set('status', params.status);
        if (params?.limit) query.set('limit', String(params.limit));

        const res = await fetch(`${this.apiUrl}/api/markets?${query}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        return data.markets;
    }

    /** Fetch bot leaderboard */
    async getLeaderboard(params?: {
        sortBy?: 'pnl' | 'winrate' | 'volume' | 'reputation';
        category?: string;
        limit?: number;
    }): Promise<BotProfile[]> {
        const query = new URLSearchParams();
        if (params?.sortBy) query.set('sort', params.sortBy);
        if (params?.category) query.set('category', params.category);
        if (params?.limit) query.set('limit', String(params.limit));

        const res = await fetch(`${this.apiUrl}/api/bots?${query}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        return data.bots;
    }

    /** Fetch a single bot profile */
    async getBotProfile(botId: string): Promise<BotProfile> {
        const res = await fetch(`${this.apiUrl}/api/bot/${botId}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
    }

    /** Fetch bot's vault info */
    async getVaultInfo(vaultId: string): Promise<VaultInfo> {
        const res = await fetch(`${this.apiUrl}/api/vault/${vaultId}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
    }

    /** Register webhook URL for real-time events */
    async registerWebhook(config: WebhookConfig): Promise<{ id: string }> {
        const res = await fetch(`${this.apiUrl}/api/webhooks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
    }

    /** Check current rate limit status */
    async getRateLimitStatus(): Promise<{
        tier: BotTier;
        tradesThisHour: number;
        volumeToday: number;
        activePositions: number;
        limits: typeof TIER_LIMITS[BotTier.Novice];
    }> {
        const [botPDA] = this.getBotProfilePDA();
        const res = await fetch(`${this.apiUrl}/api/bot/${botPDA.toBase58()}/limits`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
    }

    // ─── Utility Methods ────────────────────────────────────────────────────

    /** Get the bot's public key */
    get publicKey(): PublicKey {
        if (!this.keypair) throw new Error('No keypair loaded');
        return this.keypair.publicKey;
    }

    /** Check if bot can trade based on tier limits */
    canTrade(amount: number, tier: BotTier, currentStats: {
        tradesThisHour: number;
        volumeToday: number;
        activePositions: number;
        lastTradeAt: number;
    }): { allowed: boolean; reason?: string } {
        const limits = TIER_LIMITS[tier];
        const now = Math.floor(Date.now() / 1000);

        if (amount > limits.maxPerTrade) {
            return { allowed: false, reason: `Exceeds max per trade (${limits.maxPerTrade / LAMPORTS_PER_SOL} SOL)` };
        }
        if (currentStats.volumeToday + amount > limits.maxPerDay) {
            return { allowed: false, reason: `Exceeds daily limit (${limits.maxPerDay / LAMPORTS_PER_SOL} SOL)` };
        }
        if (currentStats.activePositions >= limits.maxConcurrent) {
            return { allowed: false, reason: `Too many concurrent positions (max ${limits.maxConcurrent})` };
        }
        if (limits.minInterval > 0 && now - currentStats.lastTradeAt < limits.minInterval) {
            return { allowed: false, reason: `Trading too fast (min ${limits.minInterval}s interval)` };
        }

        return { allowed: true };
    }

    /** Calculate fee breakdown for a trade */
    calculateFees(solAmount: number, isG1Creator: boolean): {
        creator: number;
        treasury: number;
        insurance: number;
        total: number;
    } {
        const feeRate = 0.06; // 6%
        const totalFee = solAmount * feeRate;

        if (isG1Creator) {
            return {
                creator: 0,
                treasury: totalFee * 0.9,
                insurance: totalFee * 0.1,
                total: totalFee,
            };
        }

        return {
            creator: totalFee * 0.4,    // 40%
            treasury: totalFee * 0.5,   // 50%
            insurance: totalFee * 0.1,  // 10%
            total: totalFee,
        };
    }
}

export default DjinnSDK;
