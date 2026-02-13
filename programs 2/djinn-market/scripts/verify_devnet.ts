import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DjinnMarket } from "../target/types/djinn_market";
import { BN } from "bn.js";
import fs from 'fs';

async function main() {
    // 1. Setup Provider (Devnet)
    const keypair = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync("../../devnet-deploy.json", "utf-8")))
    );
    const wallet = new anchor.Wallet(keypair);
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com");
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);

    const programId = new anchor.web3.PublicKey("EkWbgwnLtY76MYzKZPWCz6xBwkrScktK6cpgXQb4GdU6");
    const program = new Program<DjinnMarket>(
        require("../target/idl/djinn_market.json"),
        programId,
        provider
    );

    console.log("🚀 Initializing Market on Devnet...");
    console.log("   > Program ID:", programId.toString());
    console.log("   > Payer:", wallet.publicKey.toString());
    console.log("   > Treasury Authority:", "G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

    // 2. Derive PDAs
    const title = "Djinn Genesis: Devnet Prime";
    const now = Math.floor(Date.now() / 1000);
    const G1_TREASURY = new anchor.web3.PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

    const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("market"), wallet.publicKey.toBuffer(), Buffer.from(title)],
        programId
    );
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("market_vault"), marketPda.toBuffer()],
        programId
    );

    // 3. Send Transaction
    try {
        const tx = await program.methods.initializeMarket(
            title,
            new BN(now + 86400), // 24h Duration 
            2,
            new BN(0)
        )
            .accounts({
                market: marketPda,
                marketVault: vaultPda,
                creator: wallet.publicKey,
                protocolTreasury: G1_TREASURY,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([keypair])
            .rpc();

        console.log("\n✅ SUCCESS! Market Created.");
        console.log(`   > Tx Signature: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        console.log(`   > Market Address: ${marketPda.toString()}`);
    } catch (err) {
        console.error("\n❌ FAILURE:", err);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
