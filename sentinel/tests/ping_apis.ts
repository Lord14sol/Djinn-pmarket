import { ConsensusEngine } from '../src/consensus.ts';
import { loadVault } from '../config/vault.ts';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testConnection() {
    console.log("🚀 Testing Sentinel API Connectivity...");
    const engine = new ConsensusEngine();
    const vault = loadVault();

    console.log("Vault Status:");
    console.log(`- Gemini: ${vault.GEMINI_API_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log(`- OpenAI: ${vault.OPENAI_API_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log(`- Perplexity: ${vault.PERPLEXITY_API_KEY ? '✅ Present' : '❌ Missing'}`);

    if (vault.GEMINI_API_KEY) {
        try {
            console.log("Ping Gemini...");
            const res = await (engine as any).askGemini("Ping", { text: "test", isValid: true }, "http://test.com");
            console.log(`Gemini Response: ${res.answer}`);
        } catch (e: any) { console.error(`Gemini Error: ${e.message}`); }
    }

    if (vault.OPENAI_API_KEY) {
        try {
            console.log("Ping GPT...");
            const res = await (engine as any).askGPT("Ping", { text: "test", isValid: true }, "http://test.com");
            console.log(`GPT Response: ${res.answer}`);
        } catch (e: any) { console.error(`GPT Error: ${e.message}`); }
    }
}

testConnection();
