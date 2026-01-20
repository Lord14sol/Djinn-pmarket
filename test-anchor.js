// Quick test script to verify the contract works
const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

// Load IDL
const idl = require('./lib/idl/djinn_market.json');

// Constants
const PROGRAM_ID = new PublicKey(idl.address);
const MASTER_TREASURY = new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

async function main() {
    console.log("🔍 Testing Anchor program methods...");
    console.log("Program ID:", PROGRAM_ID.toBase58());

    // Create a dummy provider for testing
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    // Load wallet from keypair file
    const walletPath = process.env.HOME + '/.config/solana/id.json';
    let wallet;
    try {
        const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
        wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
        console.log("Wallet loaded:", wallet.publicKey.toBase58());
    } catch (e) {
        console.log("No wallet found, using dummy");
        wallet = Keypair.generate();
    }

    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(wallet),
        { preflightCommitment: 'processed' }
    );

    // Initialize program
    console.log("\n📦 Initializing program...");
    const program = new anchor.Program(idl, PROGRAM_ID, provider);

    console.log("✅ Program initialized!");
    console.log("Available methods:", Object.keys(program.methods));

    // Check if initializeMarket exists
    console.log("\n🔍 Checking initializeMarket method...");
    console.log("Type:", typeof program.methods.initializeMarket);

    // Try to create a method builder
    const title = "test-market";
    const resolutionTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);
    const numOutcomes = 2;
    const curveConstant = new anchor.BN("1000000000000"); // Try with string
    const nonce = new anchor.BN(Date.now());

    console.log("\n📝 Creating method builder with args:", {
        title,
        resolutionTime: resolutionTime.toString(),
        numOutcomes,
        curveConstant: curveConstant.toString(),
        nonce: nonce.toString()
    });

    try {
        const methodBuilder = program.methods.initializeMarket(
            title,
            resolutionTime,
            numOutcomes,
            curveConstant,
            nonce
        );
        console.log("✅ Method builder created!");
        console.log("Builder type:", typeof methodBuilder);
        console.log("Builder keys:", Object.keys(methodBuilder));

        // Check the instruction
        console.log("\n🔍 Checking instruction...");
        const [marketPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("market"),
                wallet.publicKey.toBuffer(),
                Buffer.from(title.slice(0, 32)),
                nonce.toArrayLike(Buffer, 'le', 8)
            ],
            PROGRAM_ID
        );
        console.log("Market PDA:", marketPda.toBase58());

        const [marketVaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market_vault"), marketPda.toBuffer()],
            PROGRAM_ID
        );

        const ix = await methodBuilder
            .accounts({
                market: marketPda,
                marketVault: marketVaultPda,
                creator: wallet.publicKey,
                protocolTreasury: MASTER_TREASURY,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        console.log("✅ Instruction created!");
        console.log("Instruction program ID:", ix.programId.toBase58());
        console.log("Instruction keys count:", ix.keys.length);
        console.log("Instruction data length:", ix.data.length);

        // Print first 8 bytes (discriminator)
        console.log("Discriminator:", Buffer.from(ix.data.slice(0, 8)).toString('hex'));

    } catch (e) {
        console.error("❌ Error:", e.message);
        console.error("Stack:", e.stack);
    }
}

main().catch(console.error);
