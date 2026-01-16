import { Connection, PublicKey, Keypair, Transaction, SendTransactionError } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, Idl } from '@coral-xyz/anchor';
import { loadVault } from '../config/vault.ts';
import type { Market } from '../types/index.ts';
import * as anchor from "@coral-xyz/anchor";
import fs from 'fs';

export class BlockchainClient {
    private program: Program<any> | null = null;
    private provider: AnchorProvider;

    constructor(config: any) {
        const connection = new Connection(config.solanaRpcUrl);
        const wallet = new Wallet(config.oracleKeypair);
        this.provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

        // Load IDL (assuming it's updated)
        try {
            const idl = JSON.parse(fs.readFileSync('./target/idl/djinn_market.json', 'utf-8'));
            this.program = new Program(idl, config.programId, this.provider);
        } catch (e) {
            console.error("IDL Load Error (Run 'anchor build' first):", e);
        }
    }

    async scanMarkets(): Promise<Market[]> {
        if (!this.program) return [];
        // Fetch all markets (this would fetch 'Proposed' ones too in real impl)
        // For now, fetching all 'Market' accounts
        const accounts = await this.program.account.market.all();
        return accounts.map(a => ({
            address: a.publicKey,
            question: a.account.title,
            resolutionTime: a.account.resolutionTime.toNumber(),
            isResolved: JSON.stringify(a.account.status).includes("resolved"), // Robust check
            totalLiquidity: a.account.virtualSolReserves.toNumber(),
            sourceLink: "https://google.com", // Placeholder: In real app, store link in Account or Fetch from IPFS
            outcomes: ["YES", "NO"]
        }));
    }

    async proposeOutcome(marketParams: PublicKey, outcomeStr: string) {
        if (!this.program) return;
        const outcome = { [outcomeStr.toLowerCase()]: {} }; // { yes: {} } or { no: {} }

        // Derive PDAs
        const [protocolState] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], this.program.programId);

        await this.program.methods.proposeOutcome(outcome)
            .accounts({
                market: marketParams,
                authority: this.provider.wallet.publicKey,
                protocolState: protocolState
            })
            .rpc();
        console.log(`⛓️ On-Chain: Outcome Proposed for ${marketParams.toBase58()}`);
    }

    async emergencyFreeze(marketParams: PublicKey) {
        if (!this.program) return;
        const [protocolState] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], this.program.programId);

        await this.program.methods.emergencyFreeze()
            .accounts({
                market: marketParams,
                authority: this.provider.wallet.publicKey,
                protocolState: protocolState
            })
            .rpc();
        console.log(`❄️ On-Chain: Market FROZEN ${marketParams.toBase58()}`);
    }

    async finalizeService(marketParams: PublicKey) {
        if (!this.program) return;
        const [protocolState] = PublicKey.findProgramAddressSync([Buffer.from("protocol")], this.program.programId);

        await this.program.methods.finalizeService()
            .accounts({
                market: marketParams,
                authority: this.provider.wallet.publicKey,
                protocolState: protocolState
            })
            .rpc();
        console.log(`✅ On-Chain: Market Finalized ${marketParams.toBase58()}`);
    }

    /**
     * CAPA 2: Governance Vote Tally
     * Fetches on-chain events or state to determine if holders agree with AI.
     */
    async getVoteTally(marketAddr: PublicKey): Promise<{ majority: string, conflictWithAI: boolean }> {
        // In a real implementation, we would query 'VoteCast' events for this marketAddr
        // or check a specific voting account.
        console.log(`🗳️ Querying Governance for ${marketAddr.toBase58()}...`);

        // Mocking for logic parity:
        return {
            majority: 'YES',
            conflictWithAI: false // Change to true to test escalation
        };
    }
}
