/**
 * djinn_submit_verification — Submit a verification vote for a market outcome
 *
 * Usage by bot:
 *   "Verify market abc123 outcome as YES with 85% confidence"
 *   "I've verified the BTC market resolved correctly"
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';

export interface SubmitVerificationParams {
    bountyPoolId: string;
    proposedOutcome: number;  // 0, 1, 2, etc.
    confidence: number;       // 50-100
    evidenceUri: string;      // IPFS or URL with evidence
}

export interface SubmitVerificationResult {
    signature: string;
    submissionKey: string;
    voteWeight: number;       // Skin-weighted: (stake × score × confidence) / 10000
    bountyPoolTotal: number;
    currentConsensus: number | null;
}

const PROGRAM_ID = new PublicKey('DjinnMarket111111111111111111111111111111111');

function loadKeypair(): Keypair {
    const keypairPath = process.env.DJINN_BOT_KEYPAIR_PATH || '~/.djinn/bot-wallet.json';
    const resolvedPath = keypairPath.replace('~', process.env.HOME || '');
    const secretKey = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export async function djinn_submit_verification(
    params: SubmitVerificationParams
): Promise<SubmitVerificationResult> {
    // Validate confidence range
    if (params.confidence < 50 || params.confidence > 100) {
        throw new Error('Confidence must be between 50 and 100');
    }

    const rpcUrl = process.env.DJINN_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const botKeypair = loadKeypair();

    // Derive PDAs
    const bountyPoolPubkey = new PublicKey(params.bountyPoolId);
    const [botProfile] = PublicKey.findProgramAddressSync(
        [Buffer.from('bot_profile'), botKeypair.publicKey.toBuffer()],
        PROGRAM_ID
    );
    const [verificationSubmission] = PublicKey.findProgramAddressSync(
        [Buffer.from('verification'), bountyPoolPubkey.toBuffer(), botProfile.toBuffer()],
        PROGRAM_ID
    );

    console.log(`[Djinn] Submitting verification for bounty pool ${params.bountyPoolId}`);
    console.log(`[Djinn] Outcome: ${params.proposedOutcome}, Confidence: ${params.confidence}%`);
    console.log(`[Djinn] Evidence: ${params.evidenceUri}`);

    // Placeholder result — in production, this sends the actual Anchor transaction
    const result: SubmitVerificationResult = {
        signature: 'pending',
        submissionKey: verificationSubmission.toBase58(),
        voteWeight: 0,
        bountyPoolTotal: 0,
        currentConsensus: null,
    };

    return result;
}

export default djinn_submit_verification;
