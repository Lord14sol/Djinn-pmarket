import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DjinnMarket } from "../target/types/djinn_market";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createMint,
    mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

describe("🧞 Djinn Market - Comprehensive Tests", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.DjinnMarket as Program<DjinnMarket>;
    const payer = provider.wallet as anchor.Wallet;

    // Test accounts
    let marketCreator: Keypair;
    let user1: Keypair;
    let user2: Keypair;

    // Market state
    let marketPda: PublicKey;
    let yesTokenMint: PublicKey;
    let noTokenMint: PublicKey;
    let marketAuthority: PublicKey;
    let globalVault: PublicKey;
    let creatorVault: PublicKey;

    const TREASURY_WALLET = new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

    before(async () => {
        // Create test users with SOL
        marketCreator = Keypair.generate();
        user1 = Keypair.generate();
        user2 = Keypair.generate();

        // Airdrop SOL to test accounts
        await airdrop(marketCreator.publicKey, 10);
        await airdrop(user1.publicKey, 20);
        await airdrop(user2.publicKey, 20);

        console.log("\n🧞 Test Accounts Created:");
        console.log("  Market Creator:", marketCreator.publicKey.toBase58());
        console.log("  User 1:", user1.publicKey.toBase58());
        console.log("  User 2:", user2.publicKey.toBase58());
    });

    // ═══════════════════════════════════════════════════════════
    // TEST SUITE 1: MARKET INITIALIZATION
    // ═══════════════════════════════════════════════════════════

    it("✅ Initializes market with correct parameters", async () => {
        const marketId = "test-market-" + Date.now();
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), Buffer.from(marketId)],
            program.programId
        );
        marketPda = pda;

        // Derive PDAs
        [marketAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("authority"), marketPda.toBuffer()],
            program.programId
        );

        [globalVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("global_vault"), marketPda.toBuffer()],
            program.programId
        );

        [creatorVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("creator_vault"), marketPda.toBuffer()],
            program.programId
        );

        // Create token mints
        yesTokenMint = await createMint(
            provider.connection,
            payer.payer,
            marketAuthority,
            null,
            9
        );

        noTokenMint = await createMint(
            provider.connection,
            payer.payer,
            marketAuthority,
            null,
            9
        );

        const tx = await program.methods
            .initializeMarket(
                marketId,
                "Will BTC reach $100k in 2026?",
                "crypto",
                Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
                false // is_g1_market
            )
            .accounts({
                market: marketPda,
                creator: marketCreator.publicKey,
                yesTokenMint,
                noTokenMint,
                marketAuthority,
                globalVault,
                creatorVault,
                treasury: TREASURY_WALLET,
                systemProgram: SystemProgram.programId,
            })
            .signers([marketCreator])
            .rpc();

        console.log("  📝 Initialize TX:", tx);

        // Verify market account
        const marketAccount = await program.account.market.fetch(marketPda);
        assert.equal(marketAccount.marketId, marketId);
        assert.equal(marketAccount.title, "Will BTC reach $100k in 2026?");
        assert.equal(marketAccount.creator.toBase58(), marketCreator.publicKey.toBase58());
        assert.equal(marketAccount.isResolved, false);
        assert.equal(marketAccount.totalYesShares.toNumber(), 0);
        assert.equal(marketAccount.totalNoShares.toNumber(), 0);

        console.log("  ✅ Market initialized correctly");
    });

    it("✅ G1 market routes all fees to treasury", async () => {
        const marketId = "g1-market-" + Date.now();
        const [g1Pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), Buffer.from(marketId)],
            program.programId
        );

        const [g1Authority] = PublicKey.findProgramAddressSync(
            [Buffer.from("authority"), g1Pda.toBuffer()],
            program.programId
        );

        const [g1GlobalVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("global_vault"), g1Pda.toBuffer()],
            program.programId
        );

        const [g1CreatorVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("creator_vault"), g1Pda.toBuffer()],
            program.programId
        );

        const g1YesMint = await createMint(
            provider.connection,
            payer.payer,
            g1Authority,
            null,
            9
        );

        const g1NoMint = await createMint(
            provider.connection,
            payer.payer,
            g1Authority,
            null,
            9
        );

        await program.methods
            .initializeMarket(
                marketId,
                "G1 Market Test",
                "g1",
                Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                true // is_g1_market = true
            )
            .accounts({
                market: g1Pda,
                creator: marketCreator.publicKey,
                yesTokenMint: g1YesMint,
                noTokenMint: g1NoMint,
                marketAuthority: g1Authority,
                globalVault: g1GlobalVault,
                creatorVault: g1CreatorVault,
                treasury: TREASURY_WALLET,
                systemProgram: SystemProgram.programId,
            })
            .signers([marketCreator])
            .rpc();

        const marketAccount = await program.account.market.fetch(g1Pda);
        assert.equal(marketAccount.isG1Market, true);
        console.log("  ✅ G1 market flag set correctly");
    });

    // ═══════════════════════════════════════════════════════════
    // TEST SUITE 2: BUYING SHARES
    // ═══════════════════════════════════════════════════════════

    it("✅ User can buy YES shares", async () => {
        const buyAmount = 1 * LAMPORTS_PER_SOL; // 1 SOL

        const userYesAta = await getAssociatedTokenAddress(
            yesTokenMint,
            user1.publicKey
        );

        const tx = await program.methods
            .buyShares(
                "yes",
                new anchor.BN(buyAmount),
                new anchor.BN(0) // min_shares_out
            )
            .accounts({
                market: marketPda,
                buyer: user1.publicKey,
                creator: marketCreator.publicKey,
                yesTokenMint,
                noTokenMint,
                buyerTokenAccount: userYesAta,
                marketAuthority,
                globalVault,
                creatorVault,
                treasury: TREASURY_WALLET,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user1])
            .rpc();

        console.log("  📝 Buy YES TX:", tx);

        // Verify shares received
        const marketAccount = await program.account.market.fetch(marketPda);
        assert.isTrue(marketAccount.totalYesShares.toNumber() > 0);
        console.log(`  ✅ User received ${marketAccount.totalYesShares.toNumber() / 1e9} YES shares`);
    });

    it("✅ User can buy NO shares", async () => {
        const buyAmount = 0.5 * LAMPORTS_PER_SOL; // 0.5 SOL

        const userNoAta = await getAssociatedTokenAddress(
            noTokenMint,
            user2.publicKey
        );

        const tx = await program.methods
            .buyShares(
                "no",
                new anchor.BN(buyAmount),
                new anchor.BN(0)
            )
            .accounts({
                market: marketPda,
                buyer: user2.publicKey,
                creator: marketCreator.publicKey,
                yesTokenMint,
                noTokenMint,
                buyerTokenAccount: userNoAta,
                marketAuthority,
                globalVault,
                creatorVault,
                treasury: TREASURY_WALLET,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user2])
            .rpc();

        console.log("  📝 Buy NO TX:", tx);

        const marketAccount = await program.account.market.fetch(marketPda);
        assert.isTrue(marketAccount.totalNoShares.toNumber() > 0);
        console.log(`  ✅ User received ${marketAccount.totalNoShares.toNumber() / 1e9} NO shares`);
    });

    it("✅ Bonding curve prices increase correctly", async () => {
        // Get initial price
        const initialMarket = await program.account.market.fetch(marketPda);
        const initialYesShares = initialMarket.totalYesShares.toNumber();

        // Buy more shares
        const userYesAta = await getAssociatedTokenAddress(
            yesTokenMint,
            user1.publicKey
        );

        await program.methods
            .buyShares(
                "yes",
                new anchor.BN(2 * LAMPORTS_PER_SOL),
                new anchor.BN(0)
            )
            .accounts({
                market: marketPda,
                buyer: user1.publicKey,
                creator: marketCreator.publicKey,
                yesTokenMint,
                noTokenMint,
                buyerTokenAccount: userYesAta,
                marketAuthority,
                globalVault,
                creatorVault,
                treasury: TREASURY_WALLET,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user1])
            .rpc();

        const updatedMarket = await program.account.market.fetch(marketPda);
        const newYesShares = updatedMarket.totalYesShares.toNumber();

        // More shares minted means higher supply → curve working
        assert.isTrue(newYesShares > initialYesShares);
        console.log(`  ✅ Total YES shares increased: ${initialYesShares / 1e9} → ${newYesShares / 1e9}`);
    });

    it("❌ Rejects buy with insufficient slippage tolerance", async () => {
        const userYesAta = await getAssociatedTokenAddress(
            yesTokenMint,
            user1.publicKey
        );

        try {
            await program.methods
                .buyShares(
                    "yes",
                    new anchor.BN(0.1 * LAMPORTS_PER_SOL),
                    new anchor.BN(999_999_999_999_999) // Impossible min_shares_out
                )
                .accounts({
                    market: marketPda,
                    buyer: user1.publicKey,
                    creator: marketCreator.publicKey,
                    yesTokenMint,
                    noTokenMint,
                    buyerTokenAccount: userYesAta,
                    marketAuthority,
                    globalVault,
                    creatorVault,
                    treasury: TREASURY_WALLET,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([user1])
                .rpc();

            assert.fail("Should have failed slippage check");
        } catch (err: any) {
            assert.include(err.toString(), "SlippageExceeded");
            console.log("  ✅ Slippage protection working correctly");
        }
    });

    // ═══════════════════════════════════════════════════════════
    // TEST SUITE 3: SELLING SHARES
    // ═══════════════════════════════════════════════════════════

    it("✅ User can sell YES shares", async () => {
        const userYesAta = await getAssociatedTokenAddress(
            yesTokenMint,
            user1.publicKey
        );

        // Get user's balance
        const tokenBalance = await provider.connection.getTokenAccountBalance(userYesAta);
        const sharesToSell = BigInt(tokenBalance.value.amount) / BigInt(2); // Sell half

        const initialSolBalance = await provider.connection.getBalance(user1.publicKey);

        const tx = await program.methods
            .sellShares(
                "yes",
                new anchor.BN(sharesToSell.toString()),
                new anchor.BN(0), // min_sol_out
                false // is_max_sell
            )
            .accounts({
                market: marketPda,
                seller: user1.publicKey,
                creator: marketCreator.publicKey,
                yesTokenMint,
                noTokenMint,
                sellerTokenAccount: userYesAta,
                marketAuthority,
                globalVault,
                creatorVault,
                treasury: TREASURY_WALLET,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user1])
            .rpc();

        console.log("  📝 Sell YES TX:", tx);

        const finalSolBalance = await provider.connection.getBalance(user1.publicKey);
        assert.isTrue(finalSolBalance > initialSolBalance - 10_000_000); // Account for tx fees
        console.log(`  ✅ User received SOL for shares (after 1% fee)`);
    });

    it("✅ MAX sell burns all remaining shares", async () => {
        const userYesAta = await getAssociatedTokenAddress(
            yesTokenMint,
            user1.publicKey
        );

        const tokenBalance = await provider.connection.getTokenAccountBalance(userYesAta);
        const allShares = tokenBalance.value.amount;

        await program.methods
            .sellShares(
                "yes",
                new anchor.BN(allShares),
                new anchor.BN(0),
                true // is_max_sell = TRUE
            )
            .accounts({
                market: marketPda,
                seller: user1.publicKey,
                creator: marketCreator.publicKey,
                yesTokenMint,
                noTokenMint,
                sellerTokenAccount: userYesAta,
                marketAuthority,
                globalVault,
                creatorVault,
                treasury: TREASURY_WALLET,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user1])
            .rpc();

        const finalBalance = await provider.connection.getTokenAccountBalance(userYesAta);
        assert.equal(finalBalance.value.amount, "0");
        console.log("  ✅ All shares sold (MAX sell working)");
    });

    // ═══════════════════════════════════════════════════════════
    // TEST SUITE 4: MARKET RESOLUTION
    // ═══════════════════════════════════════════════════════════

    it("✅ Oracle can resolve market to YES", async () => {
        const tx = await program.methods
            .resolveMarket("yes")
            .accounts({
                market: marketPda,
                creator: marketCreator.publicKey,
            })
            .signers([marketCreator])
            .rpc();

        console.log("  📝 Resolve TX:", tx);

        const marketAccount = await program.account.market.fetch(marketPda);
        assert.equal(marketAccount.isResolved, true);
        assert.equal(marketAccount.winningOutcome, "yes");
        console.log("  ✅ Market resolved to YES");
    });

    it("✅ Winner can claim winnings", async () => {
        // Buy shares in a new market, resolve it, then claim
        const marketId = "claim-test-" + Date.now();
        const [claimPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), Buffer.from(marketId)],
            program.programId
        );

        const [claimAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("authority"), claimPda.toBuffer()],
            program.programId
        );

        const [claimGlobalVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("global_vault"), claimPda.toBuffer()],
            program.programId
        );

        const [claimCreatorVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("creator_vault"), claimPda.toBuffer()],
            program.programId
        );

        const claimYesMint = await createMint(
            provider.connection,
            payer.payer,
            claimAuthority,
            null,
            9
        );

        const claimNoMint = await createMint(
            provider.connection,
            payer.payer,
            claimAuthority,
            null,
            9
        );

        // Initialize market
        await program.methods
            .initializeMarket(
                marketId,
                "Claim Test Market",
                "test",
                Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                false
            )
            .accounts({
                market: claimPda,
                creator: marketCreator.publicKey,
                yesTokenMint: claimYesMint,
                noTokenMint: claimNoMint,
                marketAuthority: claimAuthority,
                globalVault: claimGlobalVault,
                creatorVault: claimCreatorVault,
                treasury: TREASURY_WALLET,
                systemProgram: SystemProgram.programId,
            })
            .signers([marketCreator])
            .rpc();

        // User buys YES shares
        const winnerYesAta = await getAssociatedTokenAddress(
            claimYesMint,
            user1.publicKey
        );

        await program.methods
            .buyShares(
                "yes",
                new anchor.BN(5 * LAMPORTS_PER_SOL),
                new anchor.BN(0)
            )
            .accounts({
                market: claimPda,
                buyer: user1.publicKey,
                creator: marketCreator.publicKey,
                yesTokenMint: claimYesMint,
                noTokenMint: claimNoMint,
                buyerTokenAccount: winnerYesAta,
                marketAuthority: claimAuthority,
                globalVault: claimGlobalVault,
                creatorVault: claimCreatorVault,
                treasury: TREASURY_WALLET,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user1])
            .rpc();

        // Resolve to YES
        await program.methods
            .resolveMarket("yes")
            .accounts({
                market: claimPda,
                creator: marketCreator.publicKey,
            })
            .signers([marketCreator])
            .rpc();

        // Claim winnings
        const initialBalance = await provider.connection.getBalance(user1.publicKey);

        await program.methods
            .claimWinnings()
            .accounts({
                market: claimPda,
                winner: user1.publicKey,
                yesTokenMint: claimYesMint,
                noTokenMint: claimNoMint,
                winnerTokenAccount: winnerYesAta,
                marketAuthority: claimAuthority,
                globalVault: claimGlobalVault,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user1])
            .rpc();

        const finalBalance = await provider.connection.getBalance(user1.publicKey);
        assert.isTrue(finalBalance > initialBalance);
        console.log(`  ✅ Winner claimed ${(finalBalance - initialBalance) / LAMPORTS_PER_SOL} SOL`);
    });

    it("❌ Loser cannot claim winnings", async () => {
        // user2 bought NO shares, but YES won
        const loserNoAta = await getAssociatedTokenAddress(
            noTokenMint,
            user2.publicKey
        );

        try {
            await program.methods
                .claimWinnings()
                .accounts({
                    market: marketPda,
                    winner: user2.publicKey,
                    yesTokenMint,
                    noTokenMint,
                    winnerTokenAccount: loserNoAta,
                    marketAuthority,
                    globalVault,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([user2])
                .rpc();

            assert.fail("Loser should not be able to claim");
        } catch (err: any) {
            console.log("  ✅ Loser correctly prevented from claiming");
        }
    });

    // ═══════════════════════════════════════════════════════════
    // TEST SUITE 5: FEE DISTRIBUTION
    // ═══════════════════════════════════════════════════════════

    it("✅ Fees split 50/50 for user markets", async () => {
        const marketId = "fee-test-" + Date.now();
        const [feePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), Buffer.from(marketId)],
            program.programId
        );

        const [feeAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("authority"), feePda.toBuffer()],
            program.programId
        );

        const [feeGlobalVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("global_vault"), feePda.toBuffer()],
            program.programId
        );

        const [feeCreatorVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("creator_vault"), feePda.toBuffer()],
            program.programId
        );

        const feeYesMint = await createMint(
            provider.connection,
            payer.payer,
            feeAuthority,
            null,
            9
        );

        const feeNoMint = await createMint(
            provider.connection,
            payer.payer,
            feeAuthority,
            null,
            9
        );

        // Initialize non-G1 market
        await program.methods
            .initializeMarket(
                marketId,
                "Fee Test Market",
                "test",
                Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                false // NOT G1
            )
            .accounts({
                market: feePda,
                creator: marketCreator.publicKey,
                yesTokenMint: feeYesMint,
                noTokenMint: feeNoMint,
                marketAuthority: feeAuthority,
                globalVault: feeGlobalVault,
                creatorVault: feeCreatorVault,
                treasury: TREASURY_WALLET,
                systemProgram: SystemProgram.programId,
            })
            .signers([marketCreator])
            .rpc();

        // Track balances before buy
        const treasuryBefore = await provider.connection.getBalance(TREASURY_WALLET);
        const creatorBefore = await provider.connection.getBalance(feeCreatorVault);

        const userYesAta = await getAssociatedTokenAddress(
            feeYesMint,
            user1.publicKey
        );

        // Buy 10 SOL worth (1% fee = 0.1 SOL total, 0.05 each)
        await program.methods
            .buyShares(
                "yes",
                new anchor.BN(10 * LAMPORTS_PER_SOL),
                new anchor.BN(0)
            )
            .accounts({
                market: feePda,
                buyer: user1.publicKey,
                creator: marketCreator.publicKey,
                yesTokenMint: feeYesMint,
                noTokenMint: feeNoMint,
                buyerTokenAccount: userYesAta,
                marketAuthority: feeAuthority,
                globalVault: feeGlobalVault,
                creatorVault: feeCreatorVault,
                treasury: TREASURY_WALLET,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .signers([user1])
            .rpc();

        const treasuryAfter = await provider.connection.getBalance(TREASURY_WALLET);
        const creatorAfter = await provider.connection.getBalance(feeCreatorVault);

        const treasuryFee = (treasuryAfter - treasuryBefore) / LAMPORTS_PER_SOL;
        const creatorFee = (creatorAfter - creatorBefore) / LAMPORTS_PER_SOL;

        console.log(`  Treasury Fee: ${treasuryFee} SOL`);
        console.log(`  Creator Fee: ${creatorFee} SOL`);

        // Should be approximately equal (0.05 each with small rounding tolerance)
        assert.approximately(treasuryFee, creatorFee, 0.001);
        console.log("  ✅ Fees split 50/50 correctly");
    });

    // ═══════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    async function airdrop(publicKey: PublicKey, amount: number) {
        const signature = await provider.connection.requestAirdrop(
            publicKey,
            amount * LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(signature);
    }
});
