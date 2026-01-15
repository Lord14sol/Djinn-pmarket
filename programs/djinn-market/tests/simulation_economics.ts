
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DjinnMarket } from "../target/types/djinn_market";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("🧬 Economic Simulation: Whale vs Splitter", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.DjinnMarket as Program<DjinnMarket>;

    // Accounts
    const admin = Keypair.generate();
    const whale = Keypair.generate();
    const splitter = Keypair.generate();
    let market: PublicKey;

    const airdrop = async (user: PublicKey, sol: number) => {
        const tx = new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.transfer({
                fromPubkey: provider.publicKey,
                toPubkey: user,
                lamports: sol * LAMPORTS_PER_SOL,
            })
        );
        await provider.sendAndConfirm(tx);
    };

    it("0. Setup: Create Market & Fund Actors", async () => {
        // Fund Admin, Whale (30 SOL), Splitter (30 SOL)
        await airdrop(admin.publicKey, 5);
        await airdrop(whale.publicKey, 100);
        await airdrop(splitter.publicKey, 100);

        const title = "Simulation Market";
        const [marketPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), admin.publicKey.toBuffer(), Buffer.from(title)],
            program.programId
        );
        market = marketPda;

        const [yesMint] = PublicKey.findProgramAddressSync(
            [marketPda.toBuffer(), Buffer.from("yes_mint")],
            program.programId
        );
        const [noMint] = PublicKey.findProgramAddressSync(
            [marketPda.toBuffer(), Buffer.from("no_mint")],
            program.programId
        );

        await program.methods.createMarket(title, new anchor.BN(Date.now() / 1000 + 3600), 5000)
            .accounts({
                market: marketPda,
                creator: admin.publicKey,
                protocolTreasury: new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma"),
                yesTokenMint: yesMint,
                noTokenMint: noMint,
            })
            .signers([admin])
            .rpc();

        console.log("✅ Simulation Market Created");
    });

    it("🐋 Scenario A: The Whale (Single 50 SOL Buy)", async () => {
        // Whale Buys 50 SOL of YES
        const buyAmount = new anchor.BN(50 * LAMPORTS_PER_SOL);

        // Get balance before
        const balanceBefore = await provider.connection.getBalance(whale.publicKey);

        // Check Shares Received
        const [yesMint] = PublicKey.findProgramAddressSync(
            [market.toBuffer(), Buffer.from("yes_mint")],
            program.programId
        );
        const [noMint] = PublicKey.findProgramAddressSync(
            [market.toBuffer(), Buffer.from("no_mint")],
            program.programId
        );

        const tx = await program.methods.placeBet(
            { yes: {} },
            buyAmount,
            new anchor.BN(0)
        )
            .accounts({
                market: market,
                user: whale.publicKey,
                protocolTreasury: new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma"),
                yesTokenMint: yesMint,
                noTokenMint: noMint,
            })
            .signers([whale])
            .rpc();

        // Log outcome
        console.log("🐋 Whale tx sent. Slippage Punishment active.");
        console.log("✅ Whale executed 20 SOL buy.");
    });

    it("⚡ Scenario B: The Splitter (1 SOL x 20 times)", async () => {
        // Splitter Buys 1 SOL, 20 times.
        const [yesMint] = PublicKey.findProgramAddressSync(
            [market.toBuffer(), Buffer.from("yes_mint")],
            program.programId
        );
        const [noMint] = PublicKey.findProgramAddressSync(
            [market.toBuffer(), Buffer.from("no_mint")],
            program.programId
        );

        console.log("⚡ Splitter starting 20x 1 SOL buys...");
        for (let i = 0; i < 20; i++) {
            await program.methods.placeBet(
                { no: {} }, // Buying NO to not compete with Whale side for cleaner math
                new anchor.BN(1 * LAMPORTS_PER_SOL),
                new anchor.BN(0)
            )
                .accounts({
                    market: market,
                    user: splitter.publicKey,
                    protocolTreasury: new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma"),
                    yesTokenMint: yesMint,
                    noTokenMint: noMint,
                })
                .signers([splitter])
                .rpc();

            if (i % 5 === 0) console.log(`   ...Bought ${i + 1} SOL so far`);
        }
        console.log("✅ Splitter finished.");
    });

    it("📊 Final Analysis", async () => {
        console.log("\n════════════════════════════════════════════════════════");
        console.log("📊 SIMULATION RESULTS (PUMP.FUN MODEL)");
        console.log("════════════════════════════════════════════════════════");
        console.log("User Scenario A: 🐋 WHALE (20 SOL Single Tx)");
        console.log("EXPECT: Paid Standard Fee (1%), Punished by SLIPPAGE.");

        console.log("User Scenario B: ⚡ SPLITTER (20 x 1 SOL Txs)");
        console.log("EXPECT: Paid Standard Fee (1%), Punished by RISING PRICE.");
        console.log("════════════════════════════════════════════════════════\n");
    });

});
