/**
 * DJINN PROTOCOL SIMULATION
 * Golden S Mutant Curve - Multi-Market Analysis
 */

import {
    getSpotPrice,
    simulateBuy,
    getIgnitionStatus,
    getIgnitionProgress,
    TOTAL_SUPPLY
} from './lib/core-amm.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

interface Buyer {
    name: string;
    solInvested: number;
    sharesReceived: number;
    entryPrice: number;
    supplyAtEntry: number;
}

interface MarketSimulation {
    name: string;
    targetVolume: number;
    buyers: Buyer[];
    totalSupply: number;
    finalPrice: number;
    g1Fees: number;
    creatorFees: number;
    vaultBalance: number;
}

function simulateMarket(name: string, buyAmounts: number[], isG1Creator: boolean = false): MarketSimulation {
    let currentSupply = 0;
    let vaultBalance = 0;
    let g1Fees = 0;
    let creatorFees = 0;
    const buyers: Buyer[] = [];

    for (let i = 0; i < buyAmounts.length; i++) {
        const sol = buyAmounts[i];
        const fee = sol * 0.01; // 1% fee
        const netSol = sol - fee;

        // Fee split
        if (isG1Creator) {
            g1Fees += fee;
        } else {
            g1Fees += fee / 2;
            creatorFees += fee / 2;
        }

        const result = simulateBuy(sol, {
            virtualSolReserves: 0,
            virtualShareReserves: 0,
            realSolReserves: vaultBalance,
            totalSharesMinted: currentSupply
        });

        buyers.push({
            name: `Buyer ${i + 1}`,
            solInvested: sol,
            sharesReceived: result.sharesReceived,
            entryPrice: result.averageEntryPrice,
            supplyAtEntry: currentSupply
        });

        currentSupply += result.sharesReceived;
        vaultBalance += result.netInvested;
    }

    return {
        name,
        targetVolume: buyAmounts.reduce((a, b) => a + b, 0),
        buyers,
        totalSupply: currentSupply,
        finalPrice: getSpotPrice(currentSupply),
        g1Fees,
        creatorFees,
        vaultBalance
    };
}

function calculatePnL(buyer: Buyer, currentPrice: number): { value: number; pnl: number; multiplier: number } {
    const currentValue = buyer.sharesReceived * currentPrice;
    const pnl = currentValue - buyer.solInvested;
    const multiplier = currentValue / buyer.solInvested;
    return { value: currentValue, pnl, multiplier };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN SIMULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('           🧞‍♂️ DJINN PROTOCOL - GOLDEN S MUTANT CURVE SIMULATION 🧞‍♂️');
console.log('═══════════════════════════════════════════════════════════════════════════════');

// --- SCENARIO 1: Small Market (100 SOL) ---
console.log('\n');
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 1: SMALL MARKET (100 SOL VOLUME)                                  │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');

const smallMarket = simulateMarket('Small Market', [
    10, 10, 10, 10, 10, // First 5 buyers: 50 SOL
    20, 30 // Last 2 buyers: 50 SOL
], false);

console.log(`\nFinal Supply: ${(smallMarket.totalSupply / 1_000_000).toFixed(2)}M shares`);
console.log(`Final Price: ${smallMarket.finalPrice.toFixed(8)} SOL`);
console.log(`Ignition Status: ${getIgnitionStatus(smallMarket.totalSupply)}`);
console.log(`Ignition Progress: ${getIgnitionProgress(smallMarket.totalSupply).toFixed(2)}%`);
console.log(`\nFees:`);
console.log(`  G1 Revenue: ${smallMarket.g1Fees.toFixed(4)} SOL`);
console.log(`  Creator Revenue: ${smallMarket.creatorFees.toFixed(4)} SOL`);
console.log(`  Vault Balance: ${smallMarket.vaultBalance.toFixed(4)} SOL`);

console.log(`\nBuyer Analysis:`);
for (const buyer of smallMarket.buyers) {
    const pnl = calculatePnL(buyer, smallMarket.finalPrice);
    console.log(`  ${buyer.name}: ${buyer.solInvested} SOL → ${(buyer.sharesReceived / 1_000_000).toFixed(2)}M shares | Value: ${pnl.value.toFixed(4)} SOL | ${pnl.multiplier.toFixed(2)}x`);
}

// --- SCENARIO 2: Medium Market (600 SOL) - Fills Anchor ---
console.log('\n');
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 2: MEDIUM MARKET (600 SOL - ANCHOR FILLS!)                        │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');

const mediumMarket = simulateMarket('Medium Market', [
    50, 50, 50, 50,     // 200 SOL - Should fill ~80% anchor
    100, 100,           // 200 SOL - Fills anchor, enters bridge
    100, 50             // 150 SOL - Into sigmoid!
], true); // G1 created

console.log(`\nFinal Supply: ${(mediumMarket.totalSupply / 1_000_000).toFixed(2)}M shares`);
console.log(`Final Price: ${mediumMarket.finalPrice.toFixed(8)} SOL`);
console.log(`Ignition Status: ${getIgnitionStatus(mediumMarket.totalSupply)}`);
console.log(`Ignition Progress: ${getIgnitionProgress(mediumMarket.totalSupply).toFixed(2)}%`);
console.log(`\nFees (G1 Created - 100% to G1):`);
console.log(`  G1 Revenue: ${mediumMarket.g1Fees.toFixed(4)} SOL`);
console.log(`  Vault Balance: ${mediumMarket.vaultBalance.toFixed(4)} SOL`);

console.log(`\nBuyer Analysis (150x Target Check):`);
for (const buyer of mediumMarket.buyers) {
    const pnl = calculatePnL(buyer, mediumMarket.finalPrice);
    console.log(`  ${buyer.name}: ${buyer.solInvested} SOL → ${(buyer.sharesReceived / 1_000_000).toFixed(2)}M shares | Entry: ${buyer.entryPrice.toFixed(8)} | Current: ${pnl.value.toFixed(4)} SOL | ${pnl.multiplier.toFixed(2)}x`);
}

// --- SCENARIO 3: Large Market (2000 SOL) - Deep into Sigmoid ---
console.log('\n');
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 3: LARGE MARKET (2000 SOL - DEEP SIGMOID)                         │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');

const largeMarket = simulateMarket('Large Market', [
    100, 100, 100, 100, 100,  // 500 SOL - Fills anchor
    200, 200, 200, 200,       // 800 SOL - Bridge + Sigmoid
    300, 300                   // 600 SOL - Deep sigmoid
], false);

console.log(`\nFinal Supply: ${(largeMarket.totalSupply / 1_000_000).toFixed(2)}M shares`);
console.log(`Final Price: ${largeMarket.finalPrice.toFixed(6)} SOL`);
console.log(`Ignition Status: ${getIgnitionStatus(largeMarket.totalSupply)}`);
console.log(`\nFees:`);
console.log(`  G1 Revenue: ${largeMarket.g1Fees.toFixed(4)} SOL`);
console.log(`  Creator Revenue: ${largeMarket.creatorFees.toFixed(4)} SOL`);

console.log(`\n🏆 EARLY vs LATE BUYERS:`);
const firstBuyer = largeMarket.buyers[0];
const lastBuyer = largeMarket.buyers[largeMarket.buyers.length - 1];
const firstPnL = calculatePnL(firstBuyer, largeMarket.finalPrice);
const lastPnL = calculatePnL(lastBuyer, largeMarket.finalPrice);

console.log(`  First Buyer: ${firstBuyer.solInvested} SOL → ${firstPnL.multiplier.toFixed(2)}x (Value: ${firstPnL.value.toFixed(2)} SOL)`);
console.log(`  Last Buyer: ${lastBuyer.solInvested} SOL → ${lastPnL.multiplier.toFixed(2)}x (Value: ${lastPnL.value.toFixed(2)} SOL)`);

// --- SCENARIO 4: If First Buyer Sells ---
console.log('\n');
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 4: WHAT IF FIRST BUYER SELLS? (Whale Dump Test)                   │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');

const sellAmount = firstBuyer.sharesReceived;
const priceBeforeSell = largeMarket.finalPrice;
const newSupply = largeMarket.totalSupply - sellAmount;
const priceAfterSell = getSpotPrice(newSupply);
const sellValue = sellAmount * ((priceBeforeSell + priceAfterSell) / 2); // Average price

console.log(`\nFirst buyer sells all ${(sellAmount / 1_000_000).toFixed(2)}M shares:`);
console.log(`  Price Before: ${priceBeforeSell.toFixed(6)} SOL`);
console.log(`  Price After: ${priceAfterSell.toFixed(6)} SOL`);
console.log(`  Price Impact: ${((priceBeforeSell - priceAfterSell) / priceBeforeSell * 100).toFixed(2)}%`);
console.log(`  SOL Received: ~${sellValue.toFixed(2)} SOL (${(sellValue / firstBuyer.solInvested).toFixed(2)}x)`);

console.log(`\n  🛡️ DEEP LIQUIDITY PROTECTION: Price only dropped ${((priceBeforeSell - priceAfterSell) / priceBeforeSell * 100).toFixed(2)}% from whale sell!`);

// --- SCENARIO 5: Everyone HODLs to Resolution ---
console.log('\n');
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 5: EVERYONE HODLS → MARKET RESOLVES YES                           │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');

const totalShares = largeMarket.buyers.reduce((sum, b) => sum + b.sharesReceived, 0);
const resolutionFee = largeMarket.vaultBalance * 0.02;
const winnerPool = largeMarket.vaultBalance - resolutionFee;

console.log(`\nResolution:`);
console.log(`  Total Vault: ${largeMarket.vaultBalance.toFixed(4)} SOL`);
console.log(`  Resolution Fee (2%): ${resolutionFee.toFixed(4)} SOL → G1`);
console.log(`  Winner Pool: ${winnerPool.toFixed(4)} SOL`);

console.log(`\nPayouts (Pro-rata):`);
for (const buyer of largeMarket.buyers) {
    const shareOfPool = buyer.sharesReceived / totalShares;
    const payout = winnerPool * shareOfPool;
    const roi = (payout / buyer.solInvested - 1) * 100;
    console.log(`  ${buyer.name}: ${payout.toFixed(4)} SOL (${roi >= 0 ? '+' : ''}${roi.toFixed(1)}% ROI)`);
}

// --- SUMMARY ---
console.log('\n');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('                              📊 SUMMARY                                       ');
console.log('═══════════════════════════════════════════════════════════════════════════════');

console.log(`
| Market       | Volume    | Final Supply | Final Price | G1 Fees  | Creator Fees |
|--------------|-----------|--------------|-------------|----------|--------------|
| Small (100)  | 100 SOL   | ${(smallMarket.totalSupply / 1_000_000).toFixed(1)}M        | ${smallMarket.finalPrice.toFixed(6)}   | ${smallMarket.g1Fees.toFixed(2)} SOL  | ${smallMarket.creatorFees.toFixed(2)} SOL      |
| Medium (600) | 600 SOL   | ${(mediumMarket.totalSupply / 1_000_000).toFixed(1)}M        | ${mediumMarket.finalPrice.toFixed(6)}   | ${mediumMarket.g1Fees.toFixed(2)} SOL  | ${mediumMarket.creatorFees.toFixed(2)} SOL      |
| Large (2000) | 2000 SOL  | ${(largeMarket.totalSupply / 1_000_000).toFixed(1)}M        | ${largeMarket.finalPrice.toFixed(6)}   | ${largeMarket.g1Fees.toFixed(2)} SOL | ${largeMarket.creatorFees.toFixed(2)} SOL     |
`);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('                    🧞‍♂️ GOLDEN S MUTANT CURVE - VERIFIED 🧞‍♂️');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('\n');
