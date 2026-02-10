/**
 * CERBERUS GAUNTLET - TEST SCENARIOS
 * Tests the 3-Dogs verification system
 */

import { createOrchestrator } from '../orchestrator';
import { MarketData, DEFAULT_CONFIG } from '../types';

// Test scenarios
const TEST_MARKETS: MarketData[] = [
    // SCENARIO A: SCAM - Should be REJECTED
    {
        publicKey: 'test_scam_aliens_123',
        title: 'Aliens will land in Times Square by tomorrow',
        description: 'Impossible claim',
        sourceUrl: 'https://fakenews.xyz/aliens-landing',
        createdAt: Date.now(),
        creator: { wallet: 'ScammerWallet123', displayName: 'Scammer' },
        pool: { yesShares: 100, noShares: 50, totalLiquidity: 500 },
        feesCollected: 10
    },

    // SCENARIO B: TRUTH - Should be VERIFIED with CHECKMARK
    {
        publicKey: 'test_btc_halving_456',
        title: 'Will Bitcoin reach $100,000 by December 2025?',
        description: 'BTC price prediction',
        sourceUrl: 'https://coindesk.com/btc-halving-analysis',
        category: 'crypto',
        createdAt: Date.now(),
        expiresAt: new Date('2025-12-31').getTime(),
        creator: { wallet: 'CryptoTrader789', displayName: 'CryptoTrader' },
        pool: { yesShares: 5000, noShares: 3000, totalLiquidity: 25000 },
        feesCollected: 250
    },

    // SCENARIO C: GREY AREA - Should be FLAGGED
    {
        publicKey: 'test_celebrity_rumor_789',
        title: 'Minor celebrity will announce something big soon',
        description: 'Vague celebrity rumor',
        sourceUrl: 'https://twitter.com/random_user/status/123456',
        category: 'entertainment',
        createdAt: Date.now(),
        creator: { wallet: 'RumorMonger456', displayName: 'RumorAccount' },
        pool: { yesShares: 200, noShares: 300, totalLiquidity: 1000 },
        feesCollected: 15
    },

    // SCENARIO D: SPORTS - Should be VERIFIED
    {
        publicKey: 'test_lakers_nba_101',
        title: 'Will the Lakers win the 2025 NBA Championship?',
        description: 'NBA prediction',
        sourceUrl: 'https://espn.com/nba/lakers-season-preview',
        category: 'sports',
        createdAt: Date.now(),
        expiresAt: new Date('2025-06-30').getTime(),
        creator: { wallet: 'SportsGuru202', displayName: 'SportsGuru' },
        pool: { yesShares: 8000, noShares: 12000, totalLiquidity: 50000 },
        feesCollected: 500
    },

    // SCENARIO E: POLITICS - Should be VERIFIED
    {
        publicKey: 'test_election_2026_202',
        title: 'Will the current party win the 2026 midterm elections?',
        description: 'Political prediction',
        sourceUrl: 'https://reuters.com/politics/us-elections',
        category: 'politics',
        createdAt: Date.now(),
        expiresAt: new Date('2026-11-15').getTime(),
        creator: { wallet: 'PoliticalAnalyst303', displayName: 'PoliticsWatcher' },
        pool: { yesShares: 15000, noShares: 18000, totalLiquidity: 100000 },
        feesCollected: 1000
    }
];

async function runGauntlet() {
    console.log('\nCERBERUS GAUNTLET - VERIFICATION TEST SUITE');
    console.log(`Running ${TEST_MARKETS.length} test scenarios...\n`);

    const orchestrator = createOrchestrator({
        ...DEFAULT_CONFIG,
        pollingIntervalMs: 60000
    });

    const results = [];

    for (const market of TEST_MARKETS) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`TEST: ${market.title.substring(0, 50)}...`);
        console.log(`${'='.repeat(70)}`);

        try {
            const verdict = await orchestrator.processMarket(market);
            results.push({
                market: market.title,
                status: verdict.finalStatus,
                checkmark: verdict.checkmark,
                action: verdict.action,
                category: verdict.category,
                processingTime: verdict.totalProcessingTime
            });
        } catch (error) {
            console.error(`Error processing market:`, error);
            results.push({
                market: market.title,
                status: 'ERROR',
                checkmark: false,
                action: 'ERROR',
            });
        }
    }

    // Print summary
    console.log('\n\nGAUNTLET RESULTS SUMMARY\n');

    for (const result of results) {
        const title = result.market.substring(0, 38).padEnd(38);
        const status = result.status.padEnd(9);
        const checkmark = (result.checkmark ? 'YES' : 'NO').padEnd(5);
        console.log(`${title} | ${status} | ${checkmark} | ${result.action}`);
    }

    const verified = results.filter(r => r.status === 'VERIFIED').length;
    const flagged = results.filter(r => r.status === 'FLAGGED').length;
    const rejected = results.filter(r => r.status === 'REJECTED').length;

    console.log(`\nTotal: ${results.length} | Verified: ${verified} | Flagged: ${flagged} | Rejected: ${rejected}`);
}

// Run gauntlet
runGauntlet().catch(console.error);
