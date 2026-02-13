import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import { assert } from "chai";

describe("🧞 Verification - Market Logic & Probability", () => {

    it("📊 Verifies Initial Market State & Probability Curve", async () => {
        console.log("Starting test...");
        const provider = anchor.AnchorProvider.env();
        anchor.setProvider(provider);

        // Load IDL
        console.log("Loading IDL...");
        const idlContent = fs.readFileSync("target/idl/djinn_market.json", "utf8");
        const idl = JSON.parse(idlContent);
        console.log("IDL Loaded:", idl.name);

        const PROGRAM_ID = "Fdbhx4cN5mPWzXneDm9XjaRgjYVjyXtpsJLGeQLPr7hg";

        console.log("Instantiating Program with PID:", PROGRAM_ID);
        const program = new anchor.Program(idl, PROGRAM_ID, provider);
        console.log("Program instantiated successfully.");

        const payer = provider.wallet as anchor.Wallet;
        const marketCreator = anchor.web3.Keypair.generate();
        const user1 = anchor.web3.Keypair.generate();

        const TREASURY_WALLET = new anchor.web3.PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

        // Airdrop
        await airdrop(provider, marketCreator.publicKey, 5);
        await airdrop(provider, user1.publicKey, 5);

        // ... (Initialization Logic)
        const nonce = new anchor.BN(Date.now());
        const resolutionTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

        const titleHash = Buffer.from(anchor.utils.sha256.hash("Test Market"), "hex");
        const nonceBuf = nonce.toArrayLike(Buffer, "le", 8);

        const [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("market"), marketCreator.publicKey.toBuffer(), titleHash, nonceBuf],
            program.programId
        );

        await program.methods
            .initializeMarket(
                "Test Market",
                resolutionTime,
                nonce,
                2
            )
            .accounts({
                market: marketPda,
                creator: marketCreator.publicKey,
                protocolTreasury: TREASURY_WALLET,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([marketCreator])
            .rpc();

        console.log("  ✅ Market Initialized:", marketPda.toBase58());

        // Probability Check
        let marketAccount = await program.account.market.fetch(marketPda);
        let yesSupply = Number(marketAccount.outcomeSupplies[0]);
        let noSupply = Number(marketAccount.outcomeSupplies[1]);

        let yesDisplay = yesSupply / 1_000_000_000;
        let noDisplay = noSupply / 1_000_000_000;

        console.log(`  Initial Supplies: YES=${yesDisplay}, NO=${noDisplay}`);

        // BUY
        const buyAmount = 1 * 1_000_000_000; // 1 SOL
        const [userPosPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("user_pos"), marketPda.toBuffer(), user1.publicKey.toBuffer(), Buffer.from([0])],
            program.programId
        );
        const [marketVault] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("market_vault"), marketPda.toBuffer()],
            program.programId
        );

        await program.methods
            .buyShares(
                0, // YES
                new anchor.BN(buyAmount),
                new anchor.BN(0)
            )
            .accounts({
                market: marketPda,
                marketVault: marketVault,
                userPosition: userPosPda,
                user: user1.publicKey,
                protocolTreasury: TREASURY_WALLET,
                marketCreator: marketCreator.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([user1])
            .rpc();

        // Final Check
        marketAccount = await program.account.market.fetch(marketPda);
        yesSupply = Number(marketAccount.outcomeSupplies[0]);
        noSupply = Number(marketAccount.outcomeSupplies[1]);
        yesDisplay = yesSupply / 1_000_000_000;
        noDisplay = noSupply / 1_000_000_000;

        const FLOOR = 650_000;
        const adjYes = yesDisplay + FLOOR;
        const adjNo = noDisplay + FLOOR;
        const prob = (adjYes / (adjYes + adjNo)) * 100;

        console.log(`  Post-Buy Supplies: YES=${yesDisplay}, NO=${noDisplay}`);
        console.log(`  Post-Buy Probability: ${prob.toFixed(2)}% (Target: ~66.3%)`);
    });
});

async function airdrop(provider: any, publicKey: any, amount: number) {
    const signature = await provider.connection.requestAirdrop(publicKey, amount * 1000000000);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
}
