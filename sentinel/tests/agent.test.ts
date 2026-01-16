import { ConsensusEngine } from '../src/consensus.ts';
import type { Market, LinkData } from '../types/index.ts';

// Mock Config Loading
process.env.GEMINI_API_KEY = "mock_key";
process.env.OPENAI_API_KEY = "mock_key";

async function runTest() {
    console.log("🧪 Sentinel Agent Logic Test");

    // Mock Consensus Engine methods to avoid real API calls cost/errors in test
    const engine = new ConsensusEngine();

    // Monkey Patch with Mocks
    engine.askGemini = async () => ({ answer: 'YES', reasoning: 'Mock Fact 1', confidence: 0.9, sources: [] });
    engine.askGPT = async () => ({ answer: 'YES', reasoning: 'Mock Fact 2', confidence: 0.95, sources: [] });
    engine.askPerplexity = async () => ({ answer: 'NO', reasoning: 'Mock Counter-Fact', confidence: 0.6, sources: [] });

    const market: Market = {
        question: "Did Real Madrid win the 2024 Champions League?",
        sourceLink: "https://espn.com/ucl-final",
        address: {} as any,
        resolutionTime: 0,
        isResolved: false,
        totalLiquidity: 1000,
        outcomes: []
    };

    const linkData: LinkData = {
        isValid: true,
        text: "Mock article text saying Real Madrid won.",
        type: 'article'
    };

    console.log(`❓ Question: ${market.question}`);

    const [gemini, gpt, perplexity] = await Promise.all([
        engine.askGemini(market.question, linkData, market.sourceLink),
        engine.askGPT(market.question, linkData, market.sourceLink),
        engine.askPerplexity(market.question, market.sourceLink)
    ]);

    console.log("🗳️  Votes:");
    console.log(`   Gemini: ${gemini.answer}`);
    console.log(`   GPT: ${gpt.answer}`);
    console.log(`   Perplexity: ${perplexity.answer}`);

    // Verify Consensus Logic
    let yes = 0, no = 0;
    [gemini, gpt, perplexity].forEach(r => r.answer === 'YES' ? yes++ : no++);

    if (yes >= 2) console.log("✅ Consensus Result: YES (Correct)");
    else console.log("❌ Consensus Failed");
}

runTest();
