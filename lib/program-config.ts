import { PublicKey } from '@solana/web3.js';

// Djinn Prediction Market Program ID (deployed on Devnet)
export const PROGRAM_ID = new PublicKey('BFgyP2Hba1kD6ZgzusZgSMuYmxnb6C1ne78sxvWxAHGk');

// Fee constants (must match smart contract)
export const MARKET_CREATION_FEE = 30_000_000; // 0.03 SOL in lamports
export const TRADING_FEE_BPS = 10; // 0.1%
export const RESOLUTION_FEE_BPS = 200; // 2%
export const BPS_DENOMINATOR = 10_000;

// Protocol authority (your wallet address)
export const PROTOCOL_AUTHORITY = new PublicKey('C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X');

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
    const creatorShare = Math.floor(fee / 2);
    const protocolShare = fee - creatorShare;
    return { creatorFee: creatorShare, protocolFee: protocolShare };
}
