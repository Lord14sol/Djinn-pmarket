import { useCallback, useMemo } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN, web3 } from '@project-serum/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '../lib/idl/djinn_market.json';

import { PROGRAM_ID } from '../lib/program-config';


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

    const createMarket = useCallback(async (title: string, description: string, endDate: Date, feePercentage: number = 200) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            const [protocolStatePda] = await PublicKey.findProgramAddress(
                [Buffer.from("protocol")],
                program.programId
            );

            // Fetch state or fallback (MVP)
            const stateAccount = await program.account.protocolState.fetchNullable(protocolStatePda);
            const treasuryKey = stateAccount ? (stateAccount as any).treasury : wallet.publicKey;

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

            console.log("Creating market:", { title, feePercentage, endDate });

            const tx = await program.methods
                .createMarket(title, new BN(endDate.getTime() / 1000))
                .accounts({
                    market: marketPda,
                    yesTokenMint: yesMintPda,
                    noTokenMint: noMintPda,
                    creator: wallet.publicKey,
                    protocolState: protocolStatePda,
                    protocolTreasury: treasuryKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: web3.SYSVAR_RENT_PUBKEY,
                })
                .rpc();

            console.log("✅ Market created tx:", tx);
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
        minSharesOut: number = 0 // Optional Slippage param
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            const amountLamports = new BN(amountSol * web3.LAMPORTS_PER_SOL);
            const minSharesBN = new BN(minSharesOut * 1_000_000_000); // 9 decimal precision for shares?

            // Import helper to get ATAs
            const { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } = await import('@solana/spl-token');

            const userYesATA = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
            const userNoATA = await getAssociatedTokenAddress(noMint, wallet.publicKey);

            // Create Transaction to ensure ATAs exist + Place Bet
            const transaction = new web3.Transaction();

            // Create ATAs idempotently
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userYesATA, wallet.publicKey, yesMint),
                createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userNoATA, wallet.publicKey, noMint)
            );

            // Anchor Enum Argument
            const sideArg = side === 'yes' ? { yes: {} } : { no: {} };

            // Get Treasury (Added for Fee logic)
            const [protocolStatePda] = await PublicKey.findProgramAddress(
                [Buffer.from("protocol")],
                program.programId
            );
            const stateAccount = await program.account.protocolState.fetchNullable(protocolStatePda);
            const treasuryKey = stateAccount ? (stateAccount as any).treasury : new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

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
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            transaction.add(placeBetIx);

            // @ts-ignore
            const txHash = await program.provider.sendAndConfirm(transaction);
            console.log("✅ Bet placed:", txHash);
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

            console.log("✅ Market resolved:", tx);
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
            const { getAssociatedTokenAddress } = await import('@solana/spl-token');
            const userYesATA = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
            const userNoATA = await getAssociatedTokenAddress(noMint, wallet.publicKey);

            // Get Treasury (for fee safety, though usually done in resolve, current contract does it in claim)
            const [protocolStatePda] = await PublicKey.findProgramAddress(
                [Buffer.from("protocol")],
                program.programId
            );
            const stateAccount = await program.account.protocolState.fetchNullable(protocolStatePda);
            const treasuryKey = stateAccount ? (stateAccount as any).treasury : wallet.publicKey;


            const tx = await program.methods
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
                })
                .rpc();

            console.log("✅ Reward claimed:", tx);
            return tx;
        } catch (error) {
            console.error("Error claiming reward:", error);
            throw error;
        }
    }, [program, wallet]);

    // Use standard Connection to get balance if needed, as Position PDA is gone
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
        sharesAmount: number, // Raw number of shares (not lamports)
        yesMint: PublicKey,
        noMint: PublicKey,
        minSolOut: number = 0 // Optional Slippage param
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            // Need to convert float shares to raw u64 based on decimals?
            // "Mint decimals = 9".
            const sharesRaw = new BN(sharesAmount * 1_000_000_000); // 9 decimals
            const minSolBN = new BN(minSolOut * web3.LAMPORTS_PER_SOL);

            const { getAssociatedTokenAddress } = await import('@solana/spl-token');
            const userYesATA = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
            const userNoATA = await getAssociatedTokenAddress(noMint, wallet.publicKey);

            const sideArg = side === 'yes' ? { yes: {} } : { no: {} };

            console.log(`Selling ${sharesAmount} shares (${sharesRaw.toString()}) of ${side}`);

            // Get Treasury
            const [protocolStatePda] = await PublicKey.findProgramAddress(
                [Buffer.from("protocol")],
                program.programId
            );
            // Fetch state or fallback
            // Note: If protocol isn't initialized, this might fail or we default. 
            // Assuming initialized since we are betting.
            const stateAccount = await program.account.protocolState.fetchNullable(protocolStatePda);
            const treasuryKey = stateAccount ? (stateAccount as any).treasury : new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

            const tx = await program.methods
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
                .rpc();

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
