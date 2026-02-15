/**
 * djinn_get_market — Fetch detailed market data
 */

import {
    Connection,
    PublicKey,
} from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { idl, DJINN_PROGRAM_ID } from '@djinn/sdk';

export interface GetMarketResult {
    publicKey: string;
    question: string;
    category: number; // enum
    status: string; // active, resolved...
    expiry: number;
    yesPrice: number;
    noPrice: number;
    totalVolume: number;
    creator: string;
}

export async function djinn_get_market(marketId: string): Promise<GetMarketResult> {
    const rpcUrl = process.env.DJINN_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Read-only provider
    const provider = new AnchorProvider(connection, {
        publicKey: new PublicKey('11111111111111111111111111111111'), // Dummy
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
    }, AnchorProvider.defaultOptions());

    const program = new Program(idl as Idl, DJINN_PROGRAM_ID, provider);
    const marketPubkey = new PublicKey(marketId);

    console.log(`[Djinn] Fetching market ${marketId}...`);

    try {
        const market = await program.account.market.fetch(marketPubkey);

        // Calculate current price based on bonding curve phase if available, 
        // or just return the state variables.
        // The market struct has `yes_amount`, `no_amount`? 
        // In `lib.rs`: `pub total_yes_shares: u64`, `pub total_no_shares: u64`.
        // Price calculation logic is complex (bonding curve).
        // Let's just return share counts for now or approximate price if possible.
        // Or better yet, call a view function? Anchor doesn't support view functions easily.
        // We can just return raw data.

        // Let's assume price ~ supply for now or just return raw supply.
        // Real price calc needs consistent logic with contract.

        return {
            publicKey: marketId,
            question: market.question as string,
            category: market.category as number,
            status: Object.keys(market.status as any)[0], // enum variant name
            expiry: (market.expiryTs as any).toNumber(),
            yesPrice: 0, // Pending implementaion of off-chain curve math
            noPrice: 0,
            totalVolume: (market.totalVolume as any).toNumber() / 1e9,
            creator: (market.creator as PublicKey).toBase58(),
        };
    } catch (e) {
        throw new Error(`Market not found: ${e.message}`);
    }
}

export default djinn_get_market;
