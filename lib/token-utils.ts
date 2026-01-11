import {
    Connection,
    PublicKey,
    Keypair,
    Transaction,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    getMint,
    getAccount,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { RPC_ENDPOINT } from './program-config';

/**
 * Create YES and NO token mints for a market
 * Returns the mint addresses
 */
export async function createMarketTokenMints(
    wallet: WalletContextState,
    marketPDA: PublicKey
): Promise<{ yesTokenMint: PublicKey; noTokenMint: PublicKey }> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
    }

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    console.log('Creating token mints for market:', marketPDA.toBase58());

    // Create YES token mint
    const yesTokenMint = await createMint(
        connection,
        wallet as any,
        marketPDA, // Market PDA is the mint authority
        null, // No freeze authority
        9, // 9 decimals (like SOL)
        undefined,
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID
    );

    console.log('YES token mint created:', yesTokenMint.toBase58());

    // Create NO token mint
    const noTokenMint = await createMint(
        connection,
        wallet as any,
        marketPDA, // Market PDA is the mint authority
        null,
        9,
        undefined,
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID
    );

    console.log('NO token mint created:', noTokenMint.toBase58());

    return { yesTokenMint, noTokenMint };
}

/**
 * Get or create associated token accounts for a user
 */
export async function getOrCreateUserTokenAccounts(
    wallet: WalletContextState,
    yesTokenMint: PublicKey,
    noTokenMint: PublicKey
): Promise<{ yesTokenAccount: PublicKey; noTokenAccount: PublicKey }> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
    }

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    console.log('Getting/creating user token accounts...');

    // Get or create YES token account
    const yesTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet as any,
        yesTokenMint,
        wallet.publicKey,
        false,
        'confirmed',
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log('YES token account:', yesTokenAccountInfo.address.toBase58());

    // Get or create NO token account
    const noTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet as any,
        noTokenMint,
        wallet.publicKey,
        false,
        'confirmed',
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log('NO token account:', noTokenAccountInfo.address.toBase58());

    return {
        yesTokenAccount: yesTokenAccountInfo.address,
        noTokenAccount: noTokenAccountInfo.address,
    };
}

/**
 * Get token account balance
 */
export async function getTokenBalance(
    wallet: WalletContextState,
    tokenAccount: PublicKey
): Promise<number> {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    try {
        const accountInfo = await getAccount(
            connection,
            tokenAccount,
            'confirmed',
            TOKEN_PROGRAM_ID
        );
        return Number(accountInfo.amount);
    } catch (error) {
        console.error('Error getting token balance:', error);
        return 0;
    }
}

/**
 * Derive associated token address without creating it
 */
export function getAssociatedTokenAddress(
    mint: PublicKey,
    owner: PublicKey
): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
        [
            owner.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return address;
}
