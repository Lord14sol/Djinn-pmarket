import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const PROGRAM_ID = new PublicKey("9xXGnGG4hxwC4XTHavmy5BWAdb8MC2VJtTDMW9FfkGbg");
    const adminWallet = new PublicKey("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

    // Derive PDA using correct 'protocol' seed
    const [protocolState] = PublicKey.findProgramAddressSync(
        [Buffer.from("protocol")],
        PROGRAM_ID
    );

    console.log("Protocol State PDA:", protocolState.toBase58());

    // Discriminator for initializeProtocol
    const discriminator = Buffer.from([188, 233, 252, 106, 134, 146, 202, 91]);

    const ix = new TransactionInstruction({
        keys: [
            { pubkey: protocolState, isSigner: false, isWritable: true },
            { pubkey: provider.wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: adminWallet, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID,
        data: discriminator
    });

    const tx = new Transaction().add(ix);

    // Send
    console.log("Sending Raw Transaction...");
    const signature = await provider.sendAndConfirm(tx);
    console.log("✅ Initialization Success! Signature:", signature);
}

main().catch(console.error);
