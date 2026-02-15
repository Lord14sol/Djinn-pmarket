
import { createOrchestrator } from '../lib/cerberus';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
    console.log('🦁 Starting Cerberus 3-Headed Oracle...');

    // Check required keys
    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️ GEMINI_API_KEY is missing. Dog 2 (Analyst) will fail.');
    }

    // Initialize Orchestrator
    const orchestrator = createOrchestrator({
        pollingIntervalMs: 60000, // Poll every minute
        autoVerifyConfidenceThreshold: 85
    });

    // Handle events
    orchestrator.on('started', () => console.log('✅ Cerberus is Online'));
    orchestrator.on('market_processed', (verdict) => {
        console.log(`\n🔍 Processed Market: ${verdict.marketTitle}`);
        console.log(`   Verdict: ${verdict.finalStatus}`);
        console.log(`   Confidence: ${verdict.layer2.confidenceScore}%`);
    });
    orchestrator.on('error', (err) => console.error('❌ Cerberus Error:', err));

    // Start
    await orchestrator.start();

    // Keep alive
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping Cerberus...');
        orchestrator.stop();
        process.exit(0);
    });
}

main().catch(console.error);
