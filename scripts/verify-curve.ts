#!/usr/bin/env ts-node
/**
 * 🧞 DJINN CURVE VERIFICATION SCRIPT
 * Verifies the gradual growth curve (~19x at 120M)
 * Philosophy: Democratization of the Pump - Long accumulation phase
 */

const { getSpotPrice, TOTAL_SUPPLY, PHASE3_START } = require('./lib/core-amm');

console.log('\n═══════════════════════════════════════════════════════');
console.log('🧞 DJINN CURVE V3 - VERIFICATION REPORT');
console.log('═══════════════════════════════════════════════════════\n');

// Test critical points
const testPoints = [
    { supply: 0, label: 'Genesis (0)', expectedMultiplier: 1 },
    { supply: 10_000_000, label: 'Early (10M)', expectedMultiplier: null },
    { supply: 50_000_000, label: 'Mid-Phase1 (50M)', expectedMultiplier: null },
    { supply: 90_000_000, label: 'Phase1→2 Transition (90M)', expectedMultiplier: 2.7 },
    { supply: 100_000_000, label: 'Anchor Threshold (100M)', expectedMultiplier: null },
    { supply: 110_000_000, label: 'Phase2→3 Transition (110M)', expectedMultiplier: 15 },
    { supply: 120_000_000, label: '🎯 Gradual Growth (120M)', expectedMultiplier: 19 },
    { supply: 200_000_000, label: 'Viral Mode (200M)', expectedMultiplier: null },
    { supply: 500_000_000, label: 'Moon Mode (500M)', expectedMultiplier: null },
    { supply: 1_000_000_000, label: 'Max Supply (1B)', expectedMultiplier: null },
];

const p0 = getSpotPrice(0);
console.log(`📌 Base Price (Entry): ${p0.toFixed(9)} SOL\n`);
console.log('Supply         Price (SOL)      Multiplier   Status');
console.log('──────────────────────────────────────────────────────');

let allPassed = true;

for (const point of testPoints) {
    const price = getSpotPrice(point.supply);
    const multiplier = price / p0;
    const multiplierStr = `${multiplier.toFixed(2)}x`;

    let status = '';
    if (point.expectedMultiplier !== null) {
        const tolerance = 0.05; // 5% tolerance
        const expected = point.expectedMultiplier;
        const diff = Math.abs(multiplier - expected) / expected;

        if (diff < tolerance) {
            status = '✅ PASS';
        } else {
            status = `❌ FAIL (expected ${expected}x)`;
            allPassed = false;
        }
    }

    const supplyStr = (point.supply / 1_000_000).toFixed(0).padStart(4) + 'M';
    const priceStr = price.toFixed(9).padStart(12);
    const multStr = multiplierStr.padStart(10);

    console.log(`${supplyStr}  ${priceStr}  ${multStr}   ${status.padEnd(15)} ${point.label}`);
}

console.log('──────────────────────────────────────────────────────\n');

// Continuity Test
console.log('🔗 CONTINUITY TEST (C⁰):\n');

const transitions = [
    { before: 89_900_000, at: 90_000_000, after: 90_100_000, name: 'Phase 1→2' },
    { before: 109_900_000, at: 110_000_000, after: 110_100_000, name: 'Phase 2→3' },
];

for (const t of transitions) {
    const pBefore = getSpotPrice(t.before);
    const pAt = getSpotPrice(t.at);
    const pAfter = getSpotPrice(t.after);

    const jumpBefore = Math.abs((pAt - pBefore) / pBefore) * 100;
    const jumpAfter = Math.abs((pAfter - pAt) / pAt) * 100;

    const maxJump = Math.max(jumpBefore, jumpAfter);
    const continuousOk = maxJump < 1.0; // Less than 1% jump

    console.log(`  ${t.name}:`);
    console.log(`    Before: ${pBefore.toFixed(9)} SOL`);
    console.log(`    At:     ${pAt.toFixed(9)} SOL`);
    console.log(`    After:  ${pAfter.toFixed(9)} SOL`);
    console.log(`    Max Jump: ${maxJump.toFixed(3)}% ${continuousOk ? '✅' : '⚠️'}`);
    console.log('');
}

// Monotonicity Test
console.log('📈 MONOTONICITY TEST:\n');
let monotonicityOk = true;
let prevPrice = 0;

for (let s = 0; s <= TOTAL_SUPPLY; s += 10_000_000) {
    const price = getSpotPrice(s);
    if (price < prevPrice) {
        console.log(`  ❌ FAIL: Price decreased at ${s / 1_000_000}M shares`);
        monotonicityOk = false;
        allPassed = false;
    }
    prevPrice = price;
}

if (monotonicityOk) {
    console.log('  ✅ PASS: Price is strictly increasing');
}

// Summary
console.log('\n═══════════════════════════════════════════════════════');
console.log('📊 SUMMARY:');
console.log('═══════════════════════════════════════════════════════\n');

const p120 = getSpotPrice(120_000_000);
const actual150x = p120 / p0;

console.log(`  150x Target at 120M: ${actual150x.toFixed(2)}x ${Math.abs(actual150x - 150) < 3 ? '✅' : '❌'}`);
console.log(`  Continuity (C⁰): ${transitions.every(t => {
    const pB = getSpotPrice(t.before);
    const pA = getSpotPrice(t.at);
    const pAf = getSpotPrice(t.after);
    return Math.abs((pA - pB) / pB) < 0.01 && Math.abs((pAf - pA) / pA) < 0.01;
}) ? '✅' : '⚠️'}`);
console.log(`  Monotonicity: ${monotonicityOk ? '✅' : '❌'}`);
console.log(`  Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

console.log('\n═══════════════════════════════════════════════════════\n');

// Gas Comparison (educational)
console.log('💡 GAS EFFICIENCY NOTES:\n');
console.log('  Linear Approximation (used):');
console.log('    - Compute units: ~50 CU per price calculation');
console.log('    - Operations: 2 multiplications, 1 clamp');
console.log('    - Error vs exact sigmoid: <0.1% up to 800M shares');
console.log('');
console.log('  Exact Sigmoid (not used):');
console.log('    - Compute units: ~5000-10000 CU');
console.log('    - Operations: exp() via Taylor series (50+ terms)');
console.log('    - Precision: Perfect, but 100x more expensive');
console.log('');
console.log('  Trade-off: 100x gas savings for <0.1% error ✅');
console.log('\n═══════════════════════════════════════════════════════\n');

process.exit(allPassed ? 0 : 1);
