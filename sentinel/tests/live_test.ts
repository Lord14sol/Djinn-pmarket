import { ConsensusEngine } from '../src/consensus.ts';
import { loadVault } from '../config/vault.ts';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runLiveTest() {
    console.log("🔥 SENTINEL LIVE REASONING TEST 🔥");
    const engine = new ConsensusEngine();

    const question = "¿El precio de Bitcoin superó los $90,000 USD hoy 15 de enero de 2026?";
    const mockLinkData = {
        isValid: true,
        text: "Bitcoin price is currently hovering around $92,500. It opened at $89,100 and peaked at $93,000 during the afternoon session.",
        type: "news"
    };
    const source = "https://finance.yahoo.com/quote/BTC-USD";

    console.log(`\n[Input]: ${question}`);
    console.log(`[Source]: ${source}\n`);

    try {
        const result = await engine.executeLayer1Forge(question, mockLinkData, source);

        console.log("-----------------------------------------");
        console.log("🛡️ SENTINEL RESULT:");
        console.log(`ANSWER: ${result.answer}`);
        console.log(`CONFIDENCE: ${(result.confidence * 100).toFixed(2)}%`);
        console.log(`REASONING: ${result.reasoning}`);
        console.log("-----------------------------------------");

    } catch (e: any) {
        console.error("Test Failed:", e.message);
    }
}

runLiveTest();
