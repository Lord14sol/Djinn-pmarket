import { useCallback, useMemo, useEffect } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN, web3, utils } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

// Import IDL - now has address field at root level
import idlJson from '../lib/idl/djinn_market.json';

const MASTER_TREASURY = new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

// Get program ID (HARDCODED as it might be missing from IDL in some builds)
const PROGRAM_ID = "Fdbhx4cN5mPWzXneDm9XjaRgjYVjyXtpsJLGeQLPr7hg";
const PROGRAM_PUBKEY = new PublicKey(PROGRAM_ID);

export const useDjinnProtocol = () => {
    const { connection } = useConnection();
    const anchorWallet = useAnchorWallet();
    const { sendTransaction, publicKey } = useWallet();

    // 1. Stable Provider (Rule 5.4/5.5)
    // Only recreate if connection or wallet *identity* changes, not on every render.
    const provider = useMemo(() => {
        if (!anchorWallet) return null;
        return new AnchorProvider(connection, anchorWallet, {
            preflightCommitment: 'processed',
        });
    }, [connection, anchorWallet]);

    // 2. Stable Program Instance
    // This is the critical fix. Previously checking 'provider' in dependency could loop if provider wasn't stable.
    const program = useMemo(() => {
        if (!provider) return null;
        try {
            // Cast to Idl type - Anchor 0.28 expects address at root level
            return new Program(idlJson as Idl, PROGRAM_PUBKEY, provider);
        } catch (e) {
            console.error('[Djinn] Failed to initialize program:', e);
            return null;
        }
    }, [provider]);

    const isContractReady = useMemo(() => {
        return !!(program && provider && anchorWallet && anchorWallet.publicKey);
    }, [program, provider, anchorWallet]);

    // Cleanup: Removed noisy useEffect logging loop

    const createMarket = useCallback(async (
        title: string,
        description: string,
        endDate: Date,
        sourceUrl: string = '',
        metadataUri: string, // Kept for API compatibility, stored in DB only
        numOutcomes: number = 2, // 2-6 outcomes
        initialBuyAmount: number = 0,
        initialBuySide: number = 0 // 0-based index
    ) => {
        if (!isContractReady || !program || !anchorWallet || !provider || !publicKey) {
            console.warn('⚠️ Contract not ready - falling back to local mode');
            throw new Error("Wallet not connected or contract not ready");
        }

        try {
            console.log('[Djinn] Starting on-chain creation...', { title, initialBuyAmount });

            // Pre-flight checks
            const balance = await provider.connection.getBalance(anchorWallet.publicKey);

            if (balance < 0.05 * 1e9) {
                throw new Error('Insufficient SOL balance (need ~0.05 SOL for market creation fee + gas)');
            }

            // Generate unique nonce for duplicate title support
            const nonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);

            // Convert nonce to little-endian i64 bytes
            const nonceBuffer = new Uint8Array(8);
            let n = BigInt(nonce);
            for (let i = 0; i < 8; i++) {
                nonceBuffer[i] = Number(n & BigInt(0xff));
                n >>= BigInt(8);
            }

            // Market PDA with nonce in seeds (allows duplicate titles)
            const [marketPda] = await PublicKey.findProgramAddress(
                [
                    Buffer.from("market"),
                    anchorWallet.publicKey.toBuffer(),
                    Buffer.from(utils.sha256.hash(title), "hex"),
                    Buffer.from(nonceBuffer)
                ],
                program.programId
            );

            // CHECK: Does this market PDA already exist on-chain?
            const existingAccount = await provider.connection.getAccountInfo(marketPda);

            if (existingAccount !== null) {
                console.warn("[Djinn] ⚠️ Market already exists! Returning existing PDA.");
                return { tx: 'existing_market', marketPda, yesMintPda: marketPda, noMintPda: marketPda };
            }

            const [marketVaultPda] = await PublicKey.findProgramAddress(
                [Buffer.from("market_vault"), marketPda.toBuffer()],
                program.programId
            );

            // MANUAL TRANSACTION CONSTRUCTION
            const tx = new web3.Transaction();

            // Add Compute Budget
            tx.add(web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
            tx.add(web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }));

            // Get Instruction
            const ix = await program.methods
                .initializeMarket(
                    title,
                    new BN(Math.floor(endDate.getTime() / 1000)),
                    new BN(nonce),
                    numOutcomes
                )
                .accounts({
                    market: marketPda,
                    marketVault: marketVaultPda,
                    creator: anchorWallet.publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            tx.add(ix);

            // Use sendTransaction from wallet adapter (handles signing + sending)
            const signature = await sendTransaction(tx, connection, { skipPreflight: true });

            console.log("[Djinn] ✅ Transaction sent:", signature);
            await connection.confirmTransaction(signature, 'confirmed');

            return { tx: signature, marketPda, yesMintPda: marketPda, noMintPda: marketPda, numOutcomes };
        } catch (error) {
            console.error("Error creating market:", error);
            throw error;
        }
    }, [program, anchorWallet, isContractReady, provider, connection, publicKey]);

    const buyShares = useCallback(async (
        marketPda: PublicKey,
        outcomeIndex: number,
        amountSol: number,
        marketCreator: PublicKey,
        minSharesOut: number = 0
    ) => {
        if (!program || !anchorWallet || !connection || !publicKey) throw new Error("Wallet not connected");

        try {
            const amountLamports = new BN(Math.round(amountSol * web3.LAMPORTS_PER_SOL));
            const minSharesBN = new BN(Math.floor(minSharesOut)).mul(new BN(1_000_000_000));

            // V2: PDA now includes outcome_index
            const userPositionPda = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            )[0];

            const marketVaultPda = PublicKey.findProgramAddressSync(
                [Buffer.from("market_vault"), marketPda.toBuffer()],
                program.programId
            )[0];

            if (!program.methods || !program.methods.buyShares) {
                throw new Error('buyShares method not available in program');
            }

            const tx = new web3.Transaction();

            // Add Compute Units
            tx.add(web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
            tx.add(web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 })); // Turbo Fee (0.001 SOL per tx approx)

            const ix = await program.methods
                .buyShares(
                    outcomeIndex,
                    amountLamports,
                    minSharesBN
                )
                .accounts({
                    market: marketPda,
                    marketVault: marketVaultPda,
                    userPosition: userPositionPda,
                    user: publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    marketCreator: marketCreator,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            tx.add(ix);

            const signature = await sendTransaction(tx, connection, { skipPreflight: true });

            console.log("✅ Buy TX Sent Sig:", signature);
            await connection.confirmTransaction(signature, 'confirmed');

            return signature;

        } catch (error) {
            console.error("Error buying shares:", error);
            throw error;
        }
    }, [program, anchorWallet, connection, publicKey]);

    const resolveMarket = useCallback(async (
        marketPda: PublicKey,
        outcome: 'yes' | 'no' | 'void'
    ) => {
        if (!program || !wallet || !connection) throw new Error("Wallet not connected");

        try {
            const [marketVaultPda] = await PublicKey.findProgramAddress(
                [Buffer.from("market_vault"), marketPda.toBuffer()],
                program.programId
            );

            const winningOutcome = outcome === 'yes' ? 0 : 1;

            const tx = new web3.Transaction();
            const ix = await program.methods
                .resolveMarket(winningOutcome)
                .accounts({
                    market: marketPda,
                    marketVault: marketVaultPda,
                    authority: publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            tx.add(ix);
            const signature = await sendTransaction(tx, connection);

            await connection.confirmTransaction(
                { signature, ...latestBlockhash },
                'confirmed'
            );

            return signature;
        } catch (error) {
            console.error("Error resolving market:", error);
            throw error;
        }
    }, [program, anchorWallet, connection, publicKey]);

    const claimReward = useCallback(async (
        marketPda: PublicKey,
        yesMint: PublicKey,
        noMint: PublicKey,
        side: 'yes' | 'no' = 'yes'
    ) => {
        if (!program || !wallet || !connection) throw new Error("Wallet not connected");

        try {
            const outcomeIndex = side.toLowerCase() === 'yes' ? 0 : 1;

            const [marketVaultPda] = await PublicKey.findProgramAddress(
                [Buffer.from("market_vault"), marketPda.toBuffer()],
                program.programId
            );

            const userPositionPda = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            )[0];

            const tx = new web3.Transaction();
            const ix = await program.methods
                .claimWinnings(outcomeIndex)
                .accounts({
                    market: marketPda,
                    marketVault: marketVaultPda,
                    userPosition: userPositionPda,
                    user: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            tx.add(ix);

            // Use sendTransaction
            const signature = await sendTransaction(tx, connection, { skipPreflight: true });

            await connection.confirmTransaction(signature, 'confirmed');
            return signature;
        } catch (error) {
            console.error("Error claiming winnings:", error);
            throw error;
        }
    }, [program, anchorWallet, connection, publicKey]);

    const getUserBalance = useCallback(async (marketPda: PublicKey, outcomeIndex: number) => {
        if (!program || !anchorWallet || !publicKey) return 0;
        try {
            const [userPositionPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            );
            // @ts-ignore
            const posAccount = await program.account.userPosition.fetch(userPositionPda);
            return posAccount ? Number(posAccount.shares) / 1e9 : 0;
        } catch (e) {
            return 0;
        }
    }, [program, anchorWallet, publicKey]);

    const sellShares = useCallback(async (
        marketPda: PublicKey,
        outcomeIndex: number,
        sharesAmount: number,
        yesMint: PublicKey,
        noMint: PublicKey,
        marketCreator: PublicKey, // Added
        minSolOut: number = 0,
        sellMax: boolean = false
    ) => {
        if (!program || !anchorWallet || !publicKey) throw new Error("Wallet not connected");

        try {

            const userPositionPda = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            )[0];

            let onChainSharesRaw = BigInt(0);
            try {
                // @ts-ignore
                const posAccount = await program.account.userPosition.fetch(userPositionPda);
                if (posAccount) {
                    // @ts-ignore
                    onChainSharesRaw = BigInt(posAccount.shares.toString());
                }
            } catch (e) {
                console.error("Failed to get on-chain position:", e);
            }

            let sharesToBurnBN: BN;
            if (sellMax || sharesAmount >= Number(onChainSharesRaw) / 1e9 * 0.99) {
                sharesToBurnBN = new BN(onChainSharesRaw.toString());
            } else {
                const rawStr = Math.floor(sharesAmount * 1e9).toString();
                sharesToBurnBN = new BN(rawStr);
            }

            if (sharesToBurnBN.isZero() || sharesToBurnBN.isNeg()) {
                throw new Error("No shares to sell.");
            }

            // MANUAL TRANSACTION CONSTRUCTION TO BYPASS ANCHOR RPC BUG
            const tx = new web3.Transaction();

            // Add Compute Units
            tx.add(web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
            tx.add(web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }));

            // @ts-ignore
            const sellInstruction = program.idl.instructions.find(i => i.name === 'sellShares');
            const argCount = sellInstruction?.args?.length || 0;

            let ix;
            if (argCount >= 3) {
                const minSolBN = new BN(minSolOut);
                ix = await program.methods.sellShares(outcomeIndex, sharesToBurnBN, minSolBN)
                    .accounts({
                        market: marketPda,
                        marketVault: PublicKey.findProgramAddressSync([Buffer.from("market_vault"), marketPda.toBuffer()], program.programId)[0],
                        userPosition: userPositionPda,
                        user: publicKey,
                        protocolTreasury: MASTER_TREASURY,

                        systemProgram: SystemProgram.programId,
                        marketCreator: marketCreator || MASTER_TREASURY,
                    })
                    .instruction();
            } else {
                ix = await program.methods.sellShares(outcomeIndex, sharesToBurnBN)
                    .accounts({
                        market: marketPda,
                        marketVault: PublicKey.findProgramAddressSync([Buffer.from("market_vault"), marketPda.toBuffer()], program.programId)[0],
                        userPosition: userPositionPda,
                        user: publicKey,
                        protocolTreasury: MASTER_TREASURY,

                        systemProgram: SystemProgram.programId,
                        marketCreator: marketCreator || MASTER_TREASURY,
                    })
                    .instruction();
            }

            tx.add(ix);

            const signature = await sendTransaction(tx, connection, { skipPreflight: true });

            await connection.confirmTransaction(signature, 'confirmed');
            return signature;
        } catch (error: any) {
            console.error("❌ Error selling shares:", error);
            throw error;
        }
    }, [program, anchorWallet, connection, publicKey]);

    return {
        program,
        createMarket,
        buyShares,
        sellShares,
        resolveMarket,
        claimReward,
        getUserBalance,
        isReady: isContractReady
    };
};
