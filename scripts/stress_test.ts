
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { DjinnMarket } from "../target/types/djinn_market"; // Adjusted import based on program name
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";

// CONSTANTS
const NUM_BOTS = 10;
const SPAM_DURATION_MS = 45000; // 45 seconds
const BUY_AMOUNT = new BN(100_000_000); // 0.1 SOL
const G1_TREASURY = new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

async function main() {
    console.log("🚀 DJINN PROTOCOL: AGGRESSIVE STRESS TEST (CLAUDE MODE)");
    console.log(`🤖 Bots: ${NUM_BOTS}`);
    console.log(`⏱️  Duration: ${SPAM_DURATION_MS}ms`);

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.DjinnMarket as Program<DjinnMarket>;

    // 1. Setup Market Creator & Treasuries
    const creator = Keypair.generate();
    await fund(provider, creator.publicKey, 5); // Fund creator
    console.log(`✅ Creator funded: ${creator.publicKey.toBase58()}`);

    // Derive Global Accounts
    const [insuranceVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("insurance_vault")],
        program.programId
    );

    // 2. Initialize a Target Market
    const marketKeypair = Keypair.generate();
    const now = Math.floor(Date.now() / 1000);
    const resolutionTime = new BN(now + 3600); // 1 hour from now

    try {
        await program.methods
            .initializeMarket(
                "STRESS-TEST-" + now, // Title
                resolutionTime,
                new BN(now),          // Nonce
                2                     // Num outcomes
            )
            .accounts({
                market: marketKeypair.publicKey,
                creator: creator.publicKey,
                protocolTreasury: G1_TREASURY,
                systemProgram: SystemProgram.programId,
            })
            .signers([creator, marketKeypair])
            .rpc();
        console.log(`✅ Target Market Initialized: ${marketKeypair.publicKey.toBase58()}`);
    } catch (e) {
        console.error("❌ Failed to init market:", e);
        process.exit(1);
    }

    // Check Cluster
    const connection = provider.connection;
    const genesisHash = await connection.getGenesisHash();
    const isDevnet = genesisHash !== "localnet_genesis_hash"; // Simplified check, or check URL
    // Actually better to check provider.connection.rpcEndpoint
    const endpoint = (provider.connection as any)._rpcEndpoint;
    const isLocal = endpoint.includes("127.0.0.1") || endpoint.includes("localhost");

    const activeBots = isLocal ? NUM_BOTS : 1; // 1 Bot on Devnet
    console.log(`🌍 Cluster: ${isLocal ? 'Localnet' : 'Devnet (Lite Mode)'}`);
    console.log(`🤖 Spawning ${activeBots} Bot(s)...`);

    // 3. Spawn & Fund Bots
    const bots: Keypair[] = [];
    for (let i = 0; i < activeBots; i++) bots.push(Keypair.generate());

    if (isLocal) {
        await Promise.all(bots.map(b => fund(provider, b.publicKey, 10)));
        console.log("✅ Bots Funded (10 SOL each).");
    } else {
        console.log("⚠️  Devnet Mode: Skipping Airdrop (Rate Limits). Using Main Wallet as Payer if needed, or hoping for the best.");
        // Actually for Devnet we should probably use the Provider wallet itself as the 'Bot' or attempt to fund 1 bot slowly.
        // Let's try to fund the 1 bot with a small amount if possible, or assume user funded it?
        // Better: Use the Provider Wallet as the ONLY bot.
        bots[0] = (provider.wallet as any).payer;
        console.log("✅ Using Provider Wallet as Bot 0.");
    }

    // 4. THE ATTACK (Concurrent Spam)
    console.log("\n⚔️  STARTING ATTACK WAVE...");
    const startTime = Date.now();
    const endTime = startTime + SPAM_DURATION_MS;

    // Metrics
    let totalOps = 0;
    let errors = 0;

    // Helper: Buy Action
    const spamBot = async (bot: Keypair, index: number) => {
        let ops = 0;

        while (Date.now() < endTime) {
            try {
                // Derive Account PDAs
                const [marketVault] = PublicKey.findProgramAddressSync(
                    [Buffer.from("market_vault"), marketKeypair.publicKey.toBuffer()],
                    program.programId
                );

                // User Position PDA
                const outcomeIndex = Math.random() > 0.5 ? 0 : 1; // Random Outcome
                const [userPos] = PublicKey.findProgramAddressSync(
                    [Buffer.from("user_pos"), marketKeypair.publicKey.toBuffer(), bot.publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                    program.programId
                );

                // Execute BUY
                await program.methods
                    .buyShares(
                        outcomeIndex,
                        BUY_AMOUNT,
                        new BN(0) // Accept any shares (0 slippage protection for stress test)
                    )
                    .accounts({
                        market: marketKeypair.publicKey,
                        marketVault: marketVault,
                        userPosition: userPos,
                        user: bot.publicKey,
                        protocolTreasury: G1_TREASURY,
                        marketCreator: creator.publicKey,
                        insuranceVault: insuranceVault,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([bot])
                    .rpc({ skipPreflight: true }); // Faster spam

                ops++;
                process.stdout.write("B"); // Buy success
            } catch (e) {
                errors++;
                process.stdout.write("x"); // Fail
                // Small sleep on error to avoid pure congestion lock (or remove for TRUE stress)
                await new Promise(r => setTimeout(r, 100));
            }
        }
        return ops;
    };

    // Construct promises
    const workers = bots.map((bot, idx) => spamBot(bot, idx));
    const results = await Promise.all(workers);

    // 5. Results
    totalOps = results.reduce((a, b) => a + b, 0);
    const durationSec = (Date.now() - startTime) / 1000;
    const tps = totalOps / durationSec;

    console.log("\n\n🛑 ATTACK FINISHED.");
    console.log(`📊 Statistics:`);
    console.log(`   - Total Tx Sent: ${totalOps}`);
    console.log(`   - Errors: ${errors} (Rate Limited/Failed)`);
    console.log(`   - Duration: ${durationSec.toFixed(1)}s`);
    console.log(`⚡ MEAN TPS: ${tps.toFixed(2)} Tx/sec`);

    if (tps > 50) {
        console.log("🔥 HIGH PERFORMANCE DETECTED");
    } else {
        console.log("⚠️  Moderate/Low Performance (Check RPC limits)");
    }
}

// Utils
async function fund(provider: anchor.AnchorProvider, address: PublicKey, amount: number) {
    try {
        const tx = await provider.connection.requestAirdrop(address, amount * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(tx);
    } catch (e) {
        console.warn(`Fund error for ${address.toBase58()}`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
