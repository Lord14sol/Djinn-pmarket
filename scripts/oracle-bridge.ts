
import { createClient } from '@supabase/supabase-js';
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DjinnMarket } from "../programs/djinn-market/target/types/djinn_market"; // Correct path to nested program target
import { PublicKey, Keypair } from "@solana/web3.js";
import 'dotenv/config';

// CONFIG
const RPC_URL = process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("CMA2yM8ZUEiJ2t9cYNYShGaH2TbvcxPh2ZKbotm8wUHL");

// 1. Setup Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // MUST BE SERVICE ROLE TO UPDATE STATUS
);

// 2. Setup Solana/Anchor
const connection = new anchor.web3.Connection(RPC_URL, "confirmed");

// Load Admin Keypair from Environment or File
// WARNING: In production, use a secure vault or HSM
const adminKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.ADMIN_WALLET_JSON!))
);

const wallet = new anchor.Wallet(adminKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);

async function main() {
    console.log("🤖 Oracle Bridge Starting...");

    // We need the IDL. For now assume it's loaded or fetch it.
    // In a real script we would import the IDL JSON file directly.
    const idl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
    if (!idl) throw new Error("IDL not found for program");

    const program = new anchor.Program(idl, PROGRAM_ID, provider);

    // 3. Poll for APPROVED suggestions that are NOT executed
    const { data: suggestions, error } = await supabase
        .from('resolution_suggestions')
        .select('*')
        .eq('status', 'approved')
        .is('executed_at', null); // Assuming we add this field or filter by a new 'executed' status

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    if (!suggestions || suggestions.length === 0) {
        console.log("No pending approved resolutions.");
        return;
    }

    for (const suggestion of suggestions) {
        console.log(`Processing resolution for market: ${suggestion.market_slug} -> ${suggestion.suggested_outcome}`);

        try {
            // Fetch Market Account PDA using slug/title logic
            // NOTE: We need the exact 'title' used to create the market to derive the PDA.
            // The suggestion table has 'market_title'.

            const [marketPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), adminKeypair.publicKey.toBuffer(), Buffer.from(suggestion.market_title)],
                program.programId
            );

            // Fetch Protocol State PDA
            const [protocolPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("protocol")],
                program.programId
            );

            // Determine Outcome Enum
            const outcome = suggestion.suggested_outcome === 'YES' ? { yes: {} } : { no: {} };

            // Execute Transaction
            const tx = await program.methods
                .resolveMarket(outcome)
                .accounts({
                    market: marketPda,
                    authority: adminKeypair.publicKey,
                    protocolState: protocolPda,
                })
                .rpc();

            console.log(`✅ Market Resolved On-Chain! Tx: ${tx}`);

            // Update Supabase
            await supabase
                .from('resolution_suggestions')
                .update({
                    status: 'executed', // Update status to executed
                    executed_at: new Date().toISOString(),
                    tx_signature: tx
                })
                .eq('id', suggestion.id);

        } catch (err) {
            console.error(`❌ Failed to resolve ${suggestion.market_slug}:`, err);
            // Log error to DB?
        }
    }
}

main().catch(console.error);
