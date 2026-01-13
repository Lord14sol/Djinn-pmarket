import { PublicKey } from '@solana/web3.js';

// Djinn Prediction Market Program ID (Matches Anchor.toml)
// Djinn Prediction Market Program ID (Matches Anchor.toml)
export const PROGRAM_ID = new PublicKey('9xXGnGG4hxwC4XTHavmy5BWAdb8MC2VJtTDMW9FfkGbg');

// Fee constants (Matches V2 Smart Contract)
export const MARKET_CREATION_FEE = 50_000_000; // 0.05 SOL
export const TRADING_FEE_BPS = 100; // 1.0% Standard (Blueprint)
export const TRADING_FEE_ENDGAME_BPS = 10; // 0.1% Endgame (>0.95)
export const TRADING_FEE_CREATOR_BPS = 50; // 0.5% Creator Share
export const RESOLUTION_FEE_BPS = 200; // 2.0%

export const BPS_DENOMINATOR = 10_000;

// Protocol authority (your wallet address)
export const PROTOCOL_AUTHORITY = new PublicKey('G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma');

// Network configuration
export const NETWORK = 'devnet';
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// Calculate fees
export function calculateTradingFee(amount: number): number {
    return Math.floor((amount * TRADING_FEE_BPS) / BPS_DENOMINATOR);
}

export function calculateResolutionFee(totalPool: number): number {
    return Math.floor((totalPool * RESOLUTION_FEE_BPS) / BPS_DENOMINATOR);
}

export function splitTradingFee(fee: number, isCreator: boolean): { creatorFee: number; protocolFee: number } {
    if (isCreator) {
        return { creatorFee: 0, protocolFee: fee };
    }
    // V2: Creator gets 1.0%, Protocol gets 1.5% (Total 2.5%)
    // This helper might need accurate amount logic, but for simple split:
    // Creator Share = (Fee / 2.5) * 1.0 = Fee * 0.4
    const creatorShare = Math.floor(fee * 0.4);
    const protocolShare = fee - creatorShare;
    return { creatorFee: creatorShare, protocolFee: protocolShare };
}
