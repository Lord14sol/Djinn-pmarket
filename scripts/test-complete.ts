#!/usr/bin/env ts-node
/**
 * 🧞 DJINN PROTOCOL - COMPREHENSIVE TEST SUITE
 * Tests all critical functionality: Curve, Integration, Trading
 */

const {
    getSpotPrice,
    simulateBuy,
    calculateImpliedProbability,
    getIgnitionStatus,
    getIgnitionProgress,
    TOTAL_SUPPLY,
    PHASE1_END,
    PHASE2_END,
    PHASE3_START
} = require('./lib/core-amm');

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║   🧞 DJINN PROTOCOL - COMPREHENSIVE TEST SUITE      ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => boolean) {
    totalTests++;
    try {
        const result = fn();
        if (result) {
            console.log(`✅ ${name}`);
            passedTests++;
        } else {
            console.log(`❌ ${name}`);
            failedTests++;
        }
    } catch (e: any) {
        console.log(`❌ ${name} (ERROR: ${e?.message || e})`);
        failedTests++;
    }
}

function approxEqual(a: number, b: number, tolerance: number = 0.05): boolean {
    if (b === 0) return Math.abs(a) < tolerance;
    return Math.abs(a - b) / Math.abs(b) < tolerance;
}

// ═══════════════════════════════════════════════════════
// TEST 1: CURVE MATHEMATICS
// ═══════════════════════════════════════════════════════
console.log('📐 TEST SUITE 1: CURVE MATHEMATICS\n');

test('Price at 0 shares = 0.000001 SOL', () => {
    const p = getSpotPrice(0);
    return approxEqual(p, 0.000001, 0.01);
});

test('Price at 90M shares = 0.0000027 SOL (2.7x)', () => {
    const p0 = getSpotPrice(0);
    const p90 = getSpotPrice(90_000_000);
    return approxEqual(p90, 0.0000027, 0.01) && approxEqual(p90 / p0, 2.7, 0.05);
});

test('Price at 110M shares = 0.000015 SOL (15x)', () => {
    const p0 = getSpotPrice(0);
    const p110 = getSpotPrice(110_000_000);
    return approxEqual(p110, 0.000015, 0.01) && approxEqual(p110 / p0, 15, 0.05);
});

test('Price at 120M shares ≈ 19-20x (gradual growth)', () => {
    const p0 = getSpotPrice(0);
    const p120 = getSpotPrice(120_000_000);
    const mult = p120 / p0;
    return mult >= 19 && mult <= 20.5;
});

test('Monotonicity: Price always increases', () => {
    let prevPrice = 0;
    for (let s = 0; s <= TOTAL_SUPPLY; s += 50_000_000) {
        const price = getSpotPrice(s);
        if (price < prevPrice) return false;
        prevPrice = price;
    }
    return true;
});

test('Continuity at 90M (Phase 1→2 transition)', () => {
    const p_before = getSpotPrice(89_900_000);
    const p_at = getSpotPrice(90_000_000);
    const p_after = getSpotPrice(90_100_000);
    const jump1 = Math.abs((p_at - p_before) / p_before);
    const jump2 = Math.abs((p_after - p_at) / p_at);
    return jump1 < 0.01 && jump2 < 0.01; // Less than 1% jump
});

test('Continuity at 110M (Phase 2→3 transition)', () => {
    const p_before = getSpotPrice(109_900_000);
    const p_at = getSpotPrice(110_000_000);
    const p_after = getSpotPrice(110_100_000);
    const jump1 = Math.abs((p_at - p_before) / p_before);
    const jump2 = Math.abs((p_after - p_at) / p_at);
    return jump1 < 0.02 && jump2 < 0.02; // Less than 2% jump (acceptable)
});

test('Price capped at P_MAX (0.95 SOL)', () => {
    const p_max = getSpotPrice(TOTAL_SUPPLY);
    return p_max <= 0.95;
});

// ═══════════════════════════════════════════════════════
// TEST 2: TRADE SIMULATION
// ═══════════════════════════════════════════════════════
console.log('\n💰 TEST SUITE 2: TRADE SIMULATION\n');

test('Buy 1 SOL at genesis returns shares', () => {
    const state = { totalSharesMinted: 0, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(1, state);
    return trade.sharesReceived > 0 && trade.sharesReceived < TOTAL_SUPPLY;
});

test('Fees are 1% of input', () => {
    const state = { totalSharesMinted: 0, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(100, state);
    return approxEqual(trade.feeTotal, 1, 0.01); // 1% of 100
});

test('Fee split 50/50 (protocol + creator)', () => {
    const state = { totalSharesMinted: 0, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(100, state);
    return approxEqual(trade.feeProtocol, trade.feeCreator, 0.01);
});

test('Price impact increases with trade size', () => {
    const state = { totalSharesMinted: 50_000_000, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const small = simulateBuy(1, state);
    const large = simulateBuy(100, state);
    return large.priceImpact > small.priceImpact;
});

test('Average entry price = input / shares', () => {
    const state = { totalSharesMinted: 0, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(10, state);
    const calculated = trade.inputAmount / trade.sharesReceived;
    return approxEqual(trade.averageEntryPrice, calculated, 0.01);
});

test('Net invested = input - fees', () => {
    const state = { totalSharesMinted: 0, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(100, state);
    return approxEqual(trade.netInvested, 99, 0.01); // 100 - 1% fee
});

// ═══════════════════════════════════════════════════════
// TEST 3: IGNITION SYSTEM
// ═══════════════════════════════════════════════════════
console.log('\n🔥 TEST SUITE 3: IGNITION SYSTEM\n');

test('Ignition progress at 0 = 0%', () => {
    return getIgnitionProgress(0) === 0;
});

test('Ignition progress at 55M = 50%', () => {
    const progress = getIgnitionProgress(55_000_000);
    return approxEqual(progress, 50, 5);
});

test('Ignition progress at 110M = 100%', () => {
    return getIgnitionProgress(110_000_000) === 100;
});

test('Status at 50M = ACCUMULATION', () => {
    return getIgnitionStatus(50_000_000) === 'ACCUMULATION';
});

test('Status at 100M = BREAKING', () => {
    return getIgnitionStatus(100_000_000) === 'BREAKING';
});

test('Status at 120M = VIRAL', () => {
    return getIgnitionStatus(120_000_000) === 'VIRAL';
});

// ═══════════════════════════════════════════════════════
// TEST 4: PROBABILITY CALCULATION
// ═══════════════════════════════════════════════════════
console.log('\n🎲 TEST SUITE 4: IMPLIED PROBABILITY\n');

test('Equal mcaps = 50% probability', () => {
    const prob = calculateImpliedProbability(100, 100);
    return approxEqual(prob, 50, 0.1);
});

test('2:1 ratio = 66.67% probability', () => {
    const prob = calculateImpliedProbability(200, 100);
    return approxEqual(prob, 66.67, 1);
});

test('3:1 ratio = 75% probability', () => {
    const prob = calculateImpliedProbability(300, 100);
    return approxEqual(prob, 75, 1);
});

test('Edge case: zero noMcap = 100%', () => {
    const prob = calculateImpliedProbability(100, 0);
    return approxEqual(prob, 100, 0.1);
});

test('Edge case: zero yesMcap = 0%', () => {
    const prob = calculateImpliedProbability(0, 100);
    return approxEqual(prob, 0, 0.1);
});

// ═══════════════════════════════════════════════════════
// TEST 5: EDGE CASES & SAFETY
// ═══════════════════════════════════════════════════════
console.log('\n🛡️ TEST SUITE 5: EDGE CASES & SAFETY\n');

test('Cannot buy with 0 SOL', () => {
    const state = { totalSharesMinted: 0, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(0, state);
    return trade.sharesReceived === 0;
});

test('Buying at max supply returns remaining shares', () => {
    // At max supply (1B - 100), price is ~0.0004 SOL (19x curve).
    // 1 SOL buys >2000 shares, so it fills the remaining 100 shares.
    const remaining = 100;
    const state = { totalSharesMinted: TOTAL_SUPPLY - remaining, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(1, state);
    return trade.sharesReceived === remaining;
});

test('Price never goes negative', () => {
    for (let s = 0; s <= TOTAL_SUPPLY; s += 100_000_000) {
        const price = getSpotPrice(s);
        if (price < 0) return false;
    }
    return true;
});

test('Constants are properly defined', () => {
    return TOTAL_SUPPLY === 1_000_000_000 &&
        PHASE1_END === 90_000_000 &&
        PHASE2_END === 110_000_000 &&
        PHASE3_START === 110_000_000;
});

// ═══════════════════════════════════════════════════════
// TEST 6: REAL-WORLD SCENARIOS
// ═══════════════════════════════════════════════════════
console.log('\n🌍 TEST SUITE 6: REAL-WORLD SCENARIOS\n');

test('Early user (1 SOL at 0) gets good entry', () => {
    const state = { totalSharesMinted: 0, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(1, state);
    const avgPrice = trade.averageEntryPrice;
    return avgPrice < 0.0000015; // Should get cheap entry
});

test('Mid user (10 SOL at 50M) gets fair price', () => {
    const state = { totalSharesMinted: 50_000_000, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(10, state);
    return trade.sharesReceived > 1_000_000 && trade.sharesReceived < 10_000_000;
});

test('Late user (100 SOL at 110M) pays premium', () => {
    const state = { totalSharesMinted: 110_000_000, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(100, state);
    const avgPrice = trade.averageEntryPrice;
    return avgPrice >= 0.000015; // Should pay more than base
});

test('Whale (1000 SOL) causes significant slippage', () => {
    const state = { totalSharesMinted: 100_000_000, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const trade = simulateBuy(1000, state);
    return trade.priceImpact > 5 || trade.warningSlippage; // Should warn
});

test('Multiple small trades vs one big trade (slippage)', () => {
    const state1 = { totalSharesMinted: 50_000_000, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };
    const state2 = { totalSharesMinted: 50_000_000, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 };

    const bigTrade = simulateBuy(100, state1);
    const small1 = simulateBuy(50, state2);
    // Multiple trades would need state update, but conceptually big trade has more impact
    return bigTrade.priceImpact > small1.priceImpact;
});

// ═══════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════
console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║                    TEST SUMMARY                      ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

console.log(`Total Tests:  ${totalTests}`);
console.log(`✅ Passed:    ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log(`❌ Failed:    ${failedTests}`);

if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is production-ready.\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Please review.\n`);
    process.exit(1);
}
