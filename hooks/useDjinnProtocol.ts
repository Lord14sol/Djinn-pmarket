import { useCallback, useMemo, useEffect } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN, web3 } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';

// Import IDL - now has address field at root level
import idlJson from '../lib/idl/djinn_market.json';

const MASTER_TREASURY = new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

// Get program ID (HARDCODED as it might be missing from IDL in some builds)
const PROGRAM_ID = "ExdGFD3ucmvsNHFQnc7PQMkoNKZnQVcvrsQcYp1g2UHa";
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
                address: PROGRAM_ID,
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

            if (balance < 0.05 * 1e9) {
                throw new Error('Insufficient SOL balance (need ~0.05 SOL for market creation fee + gas)');
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

            // MANUAL TRANSACTION CONSTRUCTION
            const tx = new web3.Transaction();

            // Add Compute Budget
            tx.add(web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
            tx.add(web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }));

            // Get Instruction
            const ix = await program.methods
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
                .instruction();

            tx.add(ix);

            // Fetch latest blockhash and sign
            const latestBlockhash = await connection.getLatestBlockhash();
            tx.recentBlockhash = latestBlockhash.blockhash;
            tx.feePayer = wallet.publicKey;

            console.log("✅ Signing Market Creation Transaction...");
            // @ts-ignore
            const signedTx = await wallet.signTransaction(tx);

            console.log("✅ Sending Market Creation Transaction...");
            const signature = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: true,
            });

            console.log("[Djinn] ✅ Transaction sent:", signature);
            await connection.confirmTransaction(
                { signature, ...latestBlockhash },
                'confirmed'
            );

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
        outcomeIndex: number,
        amountSol: number,
        yesMint: PublicKey,
        noMint: PublicKey,
        marketCreator: PublicKey,
        minSharesOut: number = 0
    ) => {
        if (!program || !wallet || !connection) throw new Error("Wallet not connected");

        try {
            const amountLamports = new BN(Math.round(amountSol * web3.LAMPORTS_PER_SOL));

            // CRITICAL FIX: JS Number limit is 9e15. 2B shares * 1e9 = 2e18.
            // We must use BN multiplication, NOT JS multiplication.
            const minSharesBN = new BN(Math.floor(minSharesOut)).mul(new BN(1_000_000_000));

            // CRITICAL DEBUG: Log arguments before calling contract
            console.log("🛠️ BUY ARGS DEBUG:");
            console.log("- outcomeIndex:", outcomeIndex);
            console.log("- amountLamports:", amountLamports.toString());
            console.log("- minSharesBN:", minSharesBN.toString());

            // V2: PDA now includes outcome_index to allow holding both YES and NO positions
            const userPositionPda = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            )[0];

            const marketVaultPda = PublicKey.findProgramAddressSync(
                [Buffer.from("market_vault"), marketPda.toBuffer()],
                program.programId
            )[0];

            // CRITICAL CHECK: Verify method exists before calling
            if (!program.methods || !program.methods.buyShares) {
                throw new Error('buyShares method not available in program');
            }

            console.log('✅ buyShares method found, constructing manual transaction...');

            // Construct Transaction manually to avoid 'Unknown action undefined' bug
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
                    user: wallet.publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    marketCreator: marketCreator,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            tx.add(ix);

            // Fetch latest blockhash and sign
            const latestBlockhash = await connection.getLatestBlockhash();
            tx.recentBlockhash = latestBlockhash.blockhash;
            tx.feePayer = wallet.publicKey;

            console.log("✅ Signing Buy Transaction...");
            // @ts-ignore
            const signedTx = await wallet.signTransaction(tx);

            console.log("✅ Sending Buy Transaction...");
            const signature = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: true,
            });

            console.log("✅ Buy TX Sent Sig:", signature);
            await connection.confirmTransaction(
                { signature, ...latestBlockhash },
                'confirmed'
            );

            return signature;

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
    }, [program, wallet, connection]);

    const resolveMarket = useCallback(async (
        marketPda: PublicKey,
        outcome: 'yes' | 'no' | 'void'
    ) => {
        if (!program || !wallet || !connection) throw new Error("Wallet not connected");

        try {
            // Derive market vault PDA
            const [marketVaultPda] = await PublicKey.findProgramAddress(
                [Buffer.from("market_vault"), marketPda.toBuffer()],
                program.programId
            );

            // IDL expects winningOutcome as u8: 0=Yes, 1=No (void is not in IDL)
            const winningOutcome = outcome === 'yes' ? 0 : 1;

            const tx = new web3.Transaction();
            const ix = await program.methods
                .resolveMarket(winningOutcome)
                .accounts({
                    market: marketPda,
                    marketVault: marketVaultPda,
                    authority: wallet.publicKey,
                    protocolTreasury: MASTER_TREASURY,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            tx.add(ix);
            const latestBlockhash = await connection.getLatestBlockhash();
            tx.recentBlockhash = latestBlockhash.blockhash;
            tx.feePayer = wallet.publicKey;

            // @ts-ignore
            const signedTx = await wallet.signTransaction(tx);
            const signature = await connection.sendRawTransaction(signedTx.serialize());

            await connection.confirmTransaction(
                { signature, ...latestBlockhash },
                'confirmed'
            );

            return signature;
        } catch (error) {
            console.error("Error resolving market:", error);
            throw error;
        }
    }, [program, wallet, connection]);

    const claimReward = useCallback(async (
        marketPda: PublicKey,
        yesMint: PublicKey,
        noMint: PublicKey,
        side: 'yes' | 'no' = 'yes'
    ) => {
        if (!program || !wallet || !connection) throw new Error("Wallet not connected");

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

            const tx = new web3.Transaction();
            const ix = await program.methods
                .claimWinnings(outcomeIndex)
                .accounts({
                    market: marketPda,
                    marketVault: marketVaultPda,
                    userPosition: userPositionPda,
                    user: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            tx.add(ix);
            const latestBlockhash = await connection.getLatestBlockhash();
            tx.recentBlockhash = latestBlockhash.blockhash;
            tx.feePayer = wallet.publicKey;

            // @ts-ignore
            const signedTx = await wallet.signTransaction(tx);
            const signature = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: true,
            });

            console.log("✅ Winnings claimed:", signature);
            await connection.confirmTransaction(
                { signature, ...latestBlockhash },
                'confirmed'
            );
            return signature;
        } catch (error) {
            console.error("Error claiming winnings:", error);
            throw error;
        }
    }, [program, wallet, connection]);

    // Fetch User Position (Shares) directly from PDA - No SPL Tokens involved
    const getUserBalance = useCallback(async (marketPda: PublicKey, outcomeIndex: number) => {
        if (!program || !wallet) return 0;
        try {
            const [userPositionPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            );
            // Use Anchor to fetch and deserialize
            // @ts-ignore
            const posAccount = await program.account.userPosition.fetch(userPositionPda);
            return posAccount ? Number(posAccount.shares) / 1e9 : 0;
        } catch (e) {
            // Account likely doesn't exist yet (0 shares)
            return 0;
        }
    }, [program, wallet]);

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
        if (!program || !wallet) throw new Error("Wallet not connected");

        try {

            const userPositionPda = PublicKey.findProgramAddressSync(
                [Buffer.from("user_pos"), marketPda.toBuffer(), wallet.publicKey.toBuffer(), Buffer.from([outcomeIndex])],
                program.programId
            )[0];

            let onChainSharesRaw = BigInt(0);
            try {
                // Use Anchor's built-in fetch to handle padding/alignment automatically
                // @ts-ignore
                const posAccount = await program.account.userPosition.fetch(userPositionPda);
                if (posAccount) {
                    // @ts-ignore
                    onChainSharesRaw = BigInt(posAccount.shares.toString());
                    console.log("🔍 On-Chain Shares (fetched via Anchor):", onChainSharesRaw.toString());
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

            console.log("🛠️ SELL SHARES ARGS:", {
                marketPda: marketPda.toBase58(),
                outcomeIndex,
                sharesAmount,
                sharesToBurn: sharesToBurnBN.toString(),
                marketCreator: marketCreator.toBase58(),
                minSolOut,
                sellMax
            });

            // LOG IDL METHODS TO VERIFY ARGS
            // @ts-ignore
            const sellInstruction = program.idl.instructions.find(i => i.name === 'sellShares');
            const argCount = sellInstruction?.args?.length || 0;
            console.log("🔍 sellShares IDL Args Count:", argCount);
            if (sellInstruction?.args) {
                console.log("🔍 sellShares Arg Names:", sellInstruction.args.map((a: any) => a.name));
            }

            // MANUAL TRANSACTION CONSTRUCTION TO BYPASS ANCHOR RPC BUG
            const tx = new web3.Transaction();

            // Add Compute Units
            tx.add(web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
            tx.add(web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }));

            // Construct Instruction manually depending on IDL
            let ix;
            if (argCount >= 3) {
                const minSolBN = new BN(minSolOut);
                ix = await program.methods.sellShares(outcomeIndex, sharesToBurnBN, minSolBN)
                    .accounts({
                        market: marketPda,
                        marketVault: PublicKey.findProgramAddressSync([Buffer.from("market_vault"), marketPda.toBuffer()], program.programId)[0],
                        userPosition: userPositionPda,
                        user: wallet.publicKey,
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
                        user: wallet.publicKey,
                        protocolTreasury: MASTER_TREASURY,

                        systemProgram: SystemProgram.programId,
                        marketCreator: marketCreator || MASTER_TREASURY,
                    })
                    .instruction();
            }

            if (!ix) throw new Error("Failed to construct instruction");

            tx.add(ix);

            // Fetch latest blockhash and sign
            const latestBlockhash = await connection.getLatestBlockhash();
            tx.recentBlockhash = latestBlockhash.blockhash;
            tx.feePayer = wallet.publicKey;

            console.log("✅ Transaction constructed manually. Signing with wallet...");

            // LOWEST LEVEL SIGNING TO BYPASS FRAMEWORK BUGS
            // @ts-ignore
            const signedTx = await wallet.signTransaction(tx);

            console.log("✅ Signed. Sending raw transaction...");
            const signature = await connection.sendRawTransaction(signedTx.serialize());

            console.log("✅ Sent raw. Sig:", signature);
            await connection.confirmTransaction(
                { signature, ...latestBlockhash },
                'confirmed'
            );
            return signature;
        } catch (error: any) {
            console.error("❌ Error selling shares:", error);

            // Try to extract logs
            if (error.logs) {
                console.error("📜 Logs:");
                error.logs.forEach((l: string) => console.log(l));
            }

            // Extract generic message
            console.error("❌ Error Message:", error.message);

            // Attempt to stringify entire error for hidden props (like InstructionError)
            try {
                const errString = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
                console.log("❌ Full Error Object:", errString);
            } catch (e) {
                console.log("Could not stringify error");
            }
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
