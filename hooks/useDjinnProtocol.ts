import { useCallback, useMemo } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN, web3 } from '@project-serum/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '../lib/idl/djinn_market.json';

import { PROGRAM_ID } from '../lib/program-config';

const MASTER_TREASURY = new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

export const useDjinnProtocol = () => {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const provider = useMemo(() => {
        if (!wallet) return null;
        return new AnchorProvider(connection, wallet, {
            preflightCommitment: 'processed',
        });
    }, [connection, wallet]);

    const program = useMemo(() => {
        if (!provider) return null;
        return new Program(idl as Idl, PROGRAM_ID, provider);
    }, [provider]);

    const createMarket = useCallback(async (
        title: string,
        description: string,
        endDate: Date,
        initialBuyAmount: number = 0,
        initialBuySide: 'yes' | 'no' = 'yes'
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            const [marketPda] = await PublicKey.findProgramAddress(
                [
                    Buffer.from("market"),
                    wallet.publicKey.toBuffer(),
                    Buffer.from(title)
                ],
                program.programId
            );

            const [yesMintPda] = await PublicKey.findProgramAddress(
                [Buffer.from("yes_mint"), marketPda.toBuffer()],
                program.programId
            );

            const [noMintPda] = await PublicKey.findProgramAddress(
                [Buffer.from("no_mint"), marketPda.toBuffer()],
                program.programId
            );

            const { getAssociatedTokenAddress } = await import('@solana/spl-token');
            const userYesATA = await getAssociatedTokenAddress(yesMintPda, wallet.publicKey);
            const userNoATA = await getAssociatedTokenAddress(noMintPda, wallet.publicKey);

            // 1. Create Market Instruction 
            // (Standard 200k compute is enough for just creation, but we keep 600k for safety if bundled)
            const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
                units: 600_000
            });
            const addPriorityFee = web3.ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 10000
            });

            const tx = new web3.Transaction();
            tx.add(modifyComputeUnits);
            tx.add(addPriorityFee);

            const createIx = await program.methods
                .createMarket(
                    title,
                    new BN(Math.floor(endDate.getTime() / 1000))
                )
                .accounts({
                    market: marketPda,
                    yesTokenMint: yesMintPda,
                    noTokenMint: noMintPda,
                    creator: wallet.publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: web3.SYSVAR_RENT_PUBKEY,
                })
                .instruction();

            tx.add(createIx);

            // 2. Initial Buy Instruction (Bundled)
            if (initialBuyAmount > 0) {
                const sideArg = initialBuySide === 'yes' ? { yes: {} } : { no: {} };
                const initialBuyBN = new BN(Math.floor(initialBuyAmount * web3.LAMPORTS_PER_SOL));
                const minSharesOut = new BN(0); // Slippage 100% allowed for initial buy (self)

                const buyIx = await program.methods
                    .placeBet(
                        sideArg,
                        initialBuyBN,
                        minSharesOut
                    )
                    .accounts({
                        market: marketPda,
                        user: wallet.publicKey,
                        yesTokenMint: yesMintPda,
                        noTokenMint: noMintPda,
                        userYesAccount: userYesATA,
                        userNoAccount: userNoATA,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        protocolTreasury: MASTER_TREASURY,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .instruction();

                tx.add(buyIx);
            }

            // Send Transaction
            if (!provider) throw new Error("Provider not available");
            const signature = await provider.sendAndConfirm(tx);

            return { tx, marketPda, yesMintPda, noMintPda };
        } catch (error) {
            console.error("Error creating market:", error);
            throw error;
        }
    }, [program, wallet]);

    const placeBet = useCallback(async (
        marketPda: PublicKey,
        side: 'yes' | 'no',
        amountSol: number,
        yesMint: PublicKey,
        noMint: PublicKey,
        minSharesOut: number = 0
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            const amountLamports = new BN(amountSol * web3.LAMPORTS_PER_SOL);
            const minSharesBN = new BN(minSharesOut * 1_000_000_000);

            const { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } = await import('@solana/spl-token');

            const userYesATA = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
            const userNoATA = await getAssociatedTokenAddress(noMint, wallet.publicKey);

            const transaction = new web3.Transaction();
            transaction.add(
                web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }), // Priority Fee
                createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userYesATA, wallet.publicKey, yesMint),
                createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userNoATA, wallet.publicKey, noMint)
            );

            const sideArg = side === 'yes' ? { yes: {} } : { no: {} };

            const [protocolStatePda] = await PublicKey.findProgramAddress(
                [Buffer.from("protocol")],
                program.programId
            );
            const stateAccount = await program.account.protocolState.fetchNullable(protocolStatePda);
            const treasuryKey = stateAccount ? (stateAccount as any).treasury : MASTER_TREASURY;

            const placeBetIx = await program.methods
                .placeBet(sideArg, amountLamports, minSharesBN)
                .accounts({
                    market: marketPda,
                    user: wallet.publicKey,
                    yesTokenMint: yesMint,
                    noTokenMint: noMint,
                    userYesAccount: userYesATA,
                    userNoAccount: userNoATA,
                    protocolTreasury: treasuryKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            transaction.add(placeBetIx);

            // @ts-ignore
            const txHash = await program.provider.sendAndConfirm(transaction);
            return txHash;

        } catch (error) {
            console.error("Error placing bet:", error);
            throw error;
        }
    }, [program, wallet]);

    const resolveMarket = useCallback(async (
        marketPda: PublicKey,
        outcome: 'yes' | 'no' | 'void'
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            const [protocolStatePda] = await PublicKey.findProgramAddress(
                [Buffer.from("protocol")],
                program.programId
            );

            const outcomeArg = outcome === 'yes' ? { yes: {} } : outcome === 'no' ? { no: {} } : { void: {} };

            const tx = await program.methods
                .resolveMarket(outcomeArg)
                .accounts({
                    market: marketPda,
                    authority: wallet.publicKey,
                    protocolState: protocolStatePda,
                })
                .rpc();

            return tx;
        } catch (error) {
            console.error("Error resolving market:", error);
            throw error;
        }
    }, [program, wallet]);

    const claimReward = useCallback(async (
        marketPda: PublicKey,
        yesMint: PublicKey,
        noMint: PublicKey
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            const { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } = await import('@solana/spl-token');
            const userYesATA = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
            const userNoATA = await getAssociatedTokenAddress(noMint, wallet.publicKey);

            const [protocolStatePda] = await PublicKey.findProgramAddress(
                [Buffer.from("protocol")],
                program.programId
            );
            const stateAccount = await program.account.protocolState.fetchNullable(protocolStatePda);
            const treasuryKey = stateAccount ? (stateAccount as any).treasury : MASTER_TREASURY;

            const transaction = new web3.Transaction();
            // Ensure ATAs exist (needed for contract validation even if empty)
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userYesATA, wallet.publicKey, yesMint),
                createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userNoATA, wallet.publicKey, noMint)
            );

            const claimIx = await program.methods
                .claimReward()
                .accounts({
                    market: marketPda,
                    user: wallet.publicKey,
                    yesTokenMint: yesMint,
                    noTokenMint: noMint,
                    userYesAccount: userYesATA,
                    userNoAccount: userNoATA,
                    protocolTreasury: treasuryKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            transaction.add(claimIx);

            // @ts-ignore
            const tx = await program.provider.sendAndConfirm(transaction);
            console.log("✅ Reward claimed:", tx);
            return tx;
        } catch (error) {
            console.error("Error claiming reward:", error);
            throw error;
        }
    }, [program, wallet]);

    const getUserBalance = useCallback(async (mint: PublicKey) => {
        if (!wallet || !mint) return 0;
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        try {
            const ata = await getAssociatedTokenAddress(mint, wallet.publicKey);
            const balance = await connection.getTokenAccountBalance(ata);
            return balance.value.uiAmount;
        } catch (e) {
            return 0;
        }
    }, [connection, wallet]);

    const sellShares = useCallback(async (
        marketPda: PublicKey,
        side: 'yes' | 'no',
        sharesAmount: number,
        yesMint: PublicKey,
        noMint: PublicKey,
        minSolOut: number = 0
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            // Robust Rounding for BN
            const sharesRaw = new BN(Math.floor(sharesAmount * 1_000_000_000));
            const minSolBN = new BN(Math.floor(minSolOut * web3.LAMPORTS_PER_SOL));

            if (sharesRaw.isZero()) throw new Error("Amount too small to sell");

            const { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } = await import('@solana/spl-token');
            const userYesATA = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
            const userNoATA = await getAssociatedTokenAddress(noMint, wallet.publicKey);

            const transaction = new web3.Transaction();
            // Ensure BOTH ATAs exist for the contract to validate them
            transaction.add(
                web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }),
                createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userYesATA, wallet.publicKey, yesMint),
                createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userNoATA, wallet.publicKey, noMint)
            );

            const sideArg = side === 'yes' ? { yes: {} } : { no: {} };

            console.log(`Selling ${sharesAmount} shares of ${side}`);

            const [protocolStatePda] = await PublicKey.findProgramAddress(
                [Buffer.from("protocol")],
                program.programId
            );
            const stateAccount = await program.account.protocolState.fetchNullable(protocolStatePda);
            const treasuryKey = stateAccount ? (stateAccount as any).treasury : MASTER_TREASURY;

            const sellIx = await program.methods
                .sellShares(sideArg, sharesRaw, minSolBN)
                .accounts({
                    market: marketPda,
                    user: wallet.publicKey,
                    yesTokenMint: yesMint,
                    noTokenMint: noMint,
                    userYesAccount: userYesATA,
                    userNoAccount: userNoATA,
                    protocolTreasury: treasuryKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            transaction.add(sellIx);

            // @ts-ignore
            const tx = await program.provider.sendAndConfirm(transaction);
            console.log("✅ Shares sold:", tx);
            return tx;
        } catch (error) {
            console.error("Error selling shares:", error);
            throw error;
        }
    }, [program, wallet]);

    return {
        program,
        createMarket,
        placeBet,
        sellShares,
        resolveMarket,
        claimReward,
        getUserBalance,
        isReady: !!program
    };
};
