import { useCallback, useMemo, useEffect } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN, web3 } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

// Import IDL - now has address field at root level
import idlJson from '../lib/idl/djinn_market.json';

const MASTER_TREASURY = new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

// Get program ID from IDL (more reliable than separate config)
const PROGRAM_ID = (idlJson as any).address;
const PROGRAM_PUBKEY = new PublicKey(PROGRAM_ID);

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
        try {
            console.log('[Djinn] Initializing Program with IDL:', {
                name: (idlJson as any).name,
                address: (idlJson as any).address,
                instructionCount: (idlJson as any).instructions?.length
            });

            // Cast to Idl type - Anchor 0.28 expects address at root level
            const p = new Program(idlJson as Idl, PROGRAM_PUBKEY, provider);

            console.log('[Djinn] Program initialized successfully');
            console.log('[Djinn] Available methods:', Object.keys(p.methods));
            console.log('[Djinn] buyShares method exists?', typeof p.methods.buyShares);
            console.log('[Djinn] Program ID:', p.programId.toString());

            // CRITICAL CHECK: Verify buyShares exists
            if (!p.methods.buyShares) {
                console.error('❌ buyShares method not found in program!');
                console.error('Available methods:', Object.keys(p.methods));
            }

            return p;
        } catch (e) {
            console.error('[Djinn] Failed to initialize program:', e);
            return null;
        }
    }, [provider]);

    const isContractReady = useMemo(() => {
        return !!(program && provider && wallet && wallet.publicKey);
    }, [program, provider, wallet]);

    useEffect(() => {
        console.log('[Djinn Protocol] Contract Status:', {
            program: !!program,
            provider: !!provider,
            wallet: !!wallet,
            isReady: isContractReady,
            programId: PROGRAM_ID
        });

        if (program) {
            console.log("🔍 IDL NAME:", (program.idl as any).name);
            console.log("🔍 IDL INSTRUCTIONS:", (program.idl as any).instructions?.map((i: any) => i.name));
            const idlInstruction = (program.idl as any).instructions?.find((i: any) => i.name === 'initializeMarket');
            console.log("🔍 initializeMarket instruction found?:", !!idlInstruction);
            console.log("🔍 initializeMarket ARGS:", idlInstruction?.args);
            console.log("🔍 program.methods:", Object.keys(program.methods));
            console.log("🔍 program.methods.initializeMarket:", typeof (program.methods as any).initializeMarket);
        }
    }, [isContractReady, program, provider, wallet]);

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
        if (!isContractReady || !program || !wallet || !provider) {
            console.warn('⚠️ Contract not ready - falling back to local mode');
            throw new Error("Wallet not connected or contract not ready");
        }

        try {
            console.log('[Djinn] Starting on-chain creation...', { title, initialBuyAmount });

            // Pre-flight checks
            const balance = await provider.connection.getBalance(wallet.publicKey);
            console.log('[Djinn] Wallet balance:', balance / 1e9, 'SOL');

            if (balance < 0.01 * 1e9) {
                throw new Error('Insufficient SOL balance (need ~0.01 SOL for transaction)');
            }

            // Generate unique nonce for duplicate title support
            const nonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);
            console.log("[Djinn] 🎲 Unique nonce generated:", nonce);

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
                    wallet.publicKey.toBuffer(),
                    Buffer.from(title.slice(0, 32)), // Truncate title for seed safety
                    Buffer.from(nonceBuffer)
                ],
                program.programId
            );

            // CHECK: Does this market PDA already exist on-chain?
            const existingAccount = await provider.connection.getAccountInfo(marketPda);
            console.log("[Djinn] 🔎 Market PDA:", marketPda.toBase58());
            console.log("[Djinn] 🔎 PDA exists on-chain?:", existingAccount !== null);

            if (existingAccount !== null) {
                console.warn("[Djinn] ⚠️ Market already exists! Returning existing PDA.");
                return { tx: 'existing_market', marketPda, yesMintPda: marketPda, noMintPda: marketPda };
            }

            const [marketVaultPda] = await PublicKey.findProgramAddress(
                [Buffer.from("market_vault"), marketPda.toBuffer()],
                program.programId
            );

            // ON-CHAIN IDL expects: title, resolutionTime, nonce, numOutcomes
            console.log("DEBUG: Sending InitializeMarket Params:", {
                title: title.slice(0, 32),
                resolutionTime: Math.floor(endDate.getTime() / 1000),
                nonce,
                numOutcomes,
                accounts: {
                    market: marketPda.toBase58(),
                    marketVault: marketVaultPda.toBase58(),
                    creator: wallet.publicKey.toBase58(),
                    protocolTreasury: MASTER_TREASURY.toBase58()
                }
            });

            // Use .rpc() directly - NEW IDL format
            const signature = await program.methods
                .initializeMarket(
                    title.slice(0, 32),
                    new BN(Math.floor(endDate.getTime() / 1000)),
                    new BN(nonce),
                    numOutcomes
                )
                .accounts({
                    market: marketPda,
                    marketVault: marketVaultPda,
                    creator: wallet.publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    systemProgram: SystemProgram.programId,
                })
                .preInstructions([
                    web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
                    web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
                ])
                .rpc({ skipPreflight: true, commitment: 'confirmed' });

            console.log("[Djinn] ✅ Transaction confirmed:", signature);

            return { tx: signature, marketPda, yesMintPda: marketPda, noMintPda: marketPda, numOutcomes };
        } catch (error) {
            console.error("Error creating market:", error);
            if (typeof error === 'object' && error !== null) {
                console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
                if ((error as any).logs) {
                    console.error("📜 Program Logs:");
                    (error as any).logs.forEach((log: string) => console.log(log));
                }
            }
            throw error;
        }
    }, [program, wallet]);

    const buyShares = useCallback(async (
        marketPda: PublicKey,
        side: 'yes' | 'no',
        amountSol: number,
        yesMint: PublicKey,
        noMint: PublicKey,
        marketCreator: PublicKey,
        minSharesOut: number = 0
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            const amountLamports = new BN(amountSol * web3.LAMPORTS_PER_SOL);

            // CRITICAL FIX: JS Number limit is 9e15. 2B shares * 1e9 = 2e18.
            // We must use BN multiplication, NOT JS multiplication.
            const minSharesBN = new BN(Math.floor(minSharesOut)).mul(new BN(1_000_000_000));

            // Side -> Outcome Index (0=Yes, 1=No for V1 Binary)
            const outcomeIndex = side.toLowerCase() === 'yes' ? 0 : 1;

            // CRITICAL DEBUG: Log arguments before calling contract
            console.log("🛠️ BUY ARGS DEBUG:");
            console.log("- outcomeIndex:", outcomeIndex);
            console.log("- amountLamports:", amountLamports.toString());
            console.log("- minSharesBN:", minSharesBN.toString());

            // FIX: Use .rpc() instead of sendAndConfirm to avoid duplicate transaction issues.
            // V2: PDA now includes outcome_index to allow holding both YES and NO positions
            const userPositionPda = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            )[0];

            // CRITICAL CHECK: Verify method exists before calling
            if (!program.methods || !program.methods.buyShares) {
                console.error('❌ CRITICAL: buyShares method not found!');
                console.error('Available methods:', Object.keys(program.methods || {}));
                throw new Error('buyShares method not available in program');
            }

            console.log('✅ buyShares method found, calling with args:', {
                outcomeIndex,
                amountLamports: amountLamports.toString(),
                minSharesBN: minSharesBN.toString()
            });

            // On-chain IDL expects: outcomeIndex, solIn, minSharesOut
            const preInstructions = [
                web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
            ];

            const txHash = await program.methods
                .buyShares(
                    outcomeIndex,
                    amountLamports,
                    minSharesBN
                )
                .accounts({
                    market: marketPda,
                    marketVault: PublicKey.findProgramAddressSync([Buffer.from("market_vault"), marketPda.toBuffer()], program.programId)[0],
                    userPosition: userPositionPda,
                    user: wallet.publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    marketCreator: marketCreator,
                    systemProgram: SystemProgram.programId,
                })
                .preInstructions(preInstructions)
                .rpc({ skipPreflight: true, commitment: 'confirmed' });

            console.log("✅ Buy TX Hash:", txHash);
            return txHash;

        } catch (error) {
            console.error("Error buying shares:", error);
            if (typeof error === 'object' && error !== null) {
                console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
                if ((error as any).logs) {
                    console.error("📜 Program Logs:");
                    (error as any).logs.forEach((log: string) => console.log(log));
                }
            }
            throw error;
        }
    }, [program, wallet]);

    const resolveMarket = useCallback(async (
        marketPda: PublicKey,
        outcome: 'yes' | 'no' | 'void'
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            // Derive market vault PDA
            const [marketVaultPda] = await PublicKey.findProgramAddress(
                [Buffer.from("market_vault"), marketPda.toBuffer()],
                program.programId
            );

            // IDL expects winningOutcome as u8: 0=Yes, 1=No (void is not in IDL)
            const winningOutcome = outcome === 'yes' ? 0 : 1;

            const tx = await program.methods
                .resolveMarket(winningOutcome)
                .accounts({
                    market: marketPda,
                    marketVault: marketVaultPda,
                    authority: wallet.publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    systemProgram: SystemProgram.programId,
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
        noMint: PublicKey,
        side: 'yes' | 'no' = 'yes'
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {
            // IDL method is 'claimWinnings', takes outcome (u8) as argument
            const outcomeIndex = side.toLowerCase() === 'yes' ? 0 : 1;

            // Derive required PDAs
            const [marketVaultPda] = await PublicKey.findProgramAddress(
                [Buffer.from("market_vault"), marketPda.toBuffer()],
                program.programId
            );

            const userPositionPda = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            )[0];

            const tx = await program.methods
                .claimWinnings(outcomeIndex)
                .accounts({
                    market: marketPda,
                    marketVault: marketVaultPda,
                    userPosition: userPositionPda,
                    user: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc({ skipPreflight: true, commitment: 'confirmed' });

            console.log("✅ Winnings claimed:", tx);
            return tx;
        } catch (error) {
            console.error("Error claiming winnings:", error);
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
        minSolOut: number = 0,
        sellMax: boolean = false
    ) => {
        if (!program || !wallet) throw new Error("Wallet not connected");

        // DEBUG: Verify program is loaded correctly
        console.log("🔍 SELL DEBUG - Program Check:");
        console.log("- Program ID:", program.programId.toBase58());
        console.log("- IDL Instructions:", (program.idl as any).instructions?.map((i: any) => i.name));
        console.log("- sellShares exists?:", !!(program.methods as any).sellShares);

        try {
            const { getAssociatedTokenAddress } = await import('@solana/spl-token');
            const userYesATA = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
            const userNoATA = await getAssociatedTokenAddress(noMint, wallet.publicKey);

            // V2: Derive outcome index from side
            const outcomeIndex = side.toLowerCase() === 'yes' ? 0 : 1;

            console.error("🔍 SELL - PDA Derivation Debug:");
            console.error("- marketPda:", marketPda.toBase58());
            console.error("- wallet:", wallet.publicKey.toBase58());
            console.error("- outcomeIndex:", outcomeIndex);
            console.error("- program.programId:", program.programId.toBase58());

            // ALWAYS read shares directly from on-chain UserPosition PDA
            // This avoids all JavaScript precision issues with large numbers
            const userPositionPda = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            )[0];
            console.error("- userPositionPda:", userPositionPda.toBase58());

            let onChainSharesRaw = BigInt(0);
            try {
                const posAcct = await connection.getAccountInfo(userPositionPda);
                console.error("📦 UserPosition account exists?:", posAcct !== null);
                console.error("📦 Account data length:", posAcct?.data?.length);

                if (posAcct?.data && posAcct.data.length >= 57) {
                    // Debug: Print first 66 bytes
                    console.error("📦 Account data (first 66 bytes hex):", posAcct.data.subarray(0, 66).toString('hex'));

                    // Parse shares from UserPosition: offset 41, 16 bytes (u128)
                    const lo = posAcct.data.readBigUInt64LE(41);
                    const hi = posAcct.data.readBigUInt64LE(49);
                    onChainSharesRaw = lo + (hi * BigInt(2 ** 64));
                    console.error("📊 On-chain raw shares u128:", onChainSharesRaw.toString());
                    console.error("📊 On-chain normalized shares:", Number(onChainSharesRaw) / 1e9);
                } else {
                    console.error("⚠️ UserPosition account not found or too small");
                    console.error("⚠️ This means you either haven't bought shares ON-CHAIN, or the PDA derivation is wrong");
                    console.error("⚠️ The UI shows DB shares, but on-chain position is 0!");
                }
            } catch (e) {
                console.error("Failed to get on-chain position:", e);
            }

            let sharesToBurnBN: BN;
            if (sellMax || sharesAmount >= Number(onChainSharesRaw) / 1e9 * 0.99) {
                // For MAX sell or selling almost all, use exact on-chain balance
                sharesToBurnBN = new BN(onChainSharesRaw.toString());
                console.log("🔥 SELL ALL - Using exact on-chain balance:", sharesToBurnBN.toString());
            } else {
                // For partial sell, calculate from sharesAmount
                // sharesAmount is normalized (e.g., 7.5 shares)
                // Need to convert to raw (7.5 * 1e9 = 7,500,000,000)
                // Use string multiplication to avoid JS precision loss
                const sharesStr = sharesAmount.toFixed(9); // e.g., "7.500000000"
                const [intPart, decPart = ''] = sharesStr.split('.');
                const paddedDec = decPart.padEnd(9, '0').slice(0, 9);
                const rawStr = intPart + paddedDec; // e.g., "7500000000"
                sharesToBurnBN = new BN(rawStr);
                console.log("📊 Partial sell - calculated shares:", sharesToBurnBN.toString());
            }

            console.log("🛠️ SELL ARGS DEBUG:");
            console.log("- sharesAmount (UI):", sharesAmount);
            console.log("- onChainSharesRaw:", onChainSharesRaw.toString());
            console.log("- sharesToBurnBN:", sharesToBurnBN.toString());
            console.log("- outcomeIndex:", outcomeIndex);
            console.log("- sellMax:", sellMax);

            if (sharesToBurnBN.isZero() || sharesToBurnBN.isNeg()) {
                throw new Error("No shares to sell. Check your position.");
            }

            console.log("📍 PDAs:");
            console.log("- userPositionPda:", userPositionPda.toBase58());
            console.log("- marketVault:", PublicKey.findProgramAddressSync([Buffer.from("market_vault"), marketPda.toBuffer()], program.programId)[0].toBase58());

            // On-chain IDL expects: outcomeIndex, sharesToSell - and 6 accounts (no marketCreator)
            const tx = await program.methods
                .sellShares(outcomeIndex, sharesToBurnBN)
                .accounts({
                    market: marketPda,
                    marketVault: PublicKey.findProgramAddressSync([Buffer.from("market_vault"), marketPda.toBuffer()], program.programId)[0],
                    userPosition: userPositionPda,
                    user: wallet.publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    systemProgram: SystemProgram.programId,
                })
                .preInstructions([
                    web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                    web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
                ])
                .rpc({ skipPreflight: true, commitment: 'confirmed' });

            console.log("✅ Shares sold:", tx);
            return tx;
        } catch (error) {
            console.error("Error selling shares:", error);
            throw error;
        }
    }, [program, wallet, connection]);

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
