/**
 * 🧞 DETAILED HODLER SIMULATION
 *
 * Tests specific scenario requested:
 * - Early buyers at 0.1 SOL
 * - Some hodl all the way (never sell)
 * - Others take profit at 4x
 * - Final state: 10M YES mcap, 4M NO mcap
 * - Calculate vault SOL and USD values
 */

import { getSpotPrice, simulateBuy, getSupplyFromPrice } from "../lib/core-amm";

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    🧞 DETAILED HODLER SIMULATION                             ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

// ============================================================================
// STARTING CONDITIONS
// ============================================================================

console.log('\n📍 PHASE 1: EARLY ACCUMULATION (Start at 0 liquidity)');
console.log('='.repeat(80));

let yesSupply = 0;
let noSupply = 0;
let totalVaultSOL = 0;

console.log('\n🏁 INITIAL STATE:');
console.log(`  YES Supply: ${yesSupply} shares`);
console.log(`  NO Supply: ${noSupply} shares`);
console.log(`  YES Price: ${getSpotPrice(yesSupply).toFixed(9)} SOL`);
console.log(`  NO Price: ${getSpotPrice(noSupply).toFixed(9)} SOL`);
console.log(`  Vault SOL: ${totalVaultSOL} SOL`);

// ============================================================================
// EARLY BUYERS (0.1 - 0.5 SOL)
// ============================================================================

console.log('\n\n📍 PHASE 2: EARLY BUYERS (0.1 - 0.5 SOL each)');
console.log('='.repeat(80));

interface Trader {
    name: string;
    yesShares: number;
    noShares: number;
    invested: number;
    soldAt4x: boolean;
}

const traders: Trader[] = [
    { name: 'Alice', yesShares: 0, noShares: 0, invested: 0, soldAt4x: false },
    { name: 'Bob', yesShares: 0, noShares: 0, invested: 0, soldAt4x: true },
    { name: 'Carol', yesShares: 0, noShares: 0, invested: 0, soldAt4x: false },
    { name: 'Dave', yesShares: 0, noShares: 0, invested: 0, soldAt4x: true },
    { name: 'Eve', yesShares: 0, noShares: 0, invested: 0, soldAt4x: false },
];

// Early buys
const earlyBuys = [
    { trader: 0, amount: 0.1, side: 'YES' }, // Alice
    { trader: 1, amount: 0.2, side: 'YES' }, // Bob
    { trader: 2, amount: 0.15, side: 'YES' }, // Carol
    { trader: 3, amount: 0.3, side: 'YES' }, // Dave
    { trader: 4, amount: 0.25, side: 'YES' }, // Eve
];

console.log('\n🛒 EARLY BUYS:');
earlyBuys.forEach(buy => {
    const sim = simulateBuy(buy.amount, {
        totalSharesMinted: yesSupply,
        virtualSolReserves: 0,
        virtualShareReserves: 0,
        realSolReserves: 0
    });

    yesSupply += sim.sharesReceived;
    totalVaultSOL += buy.amount;

    traders[buy.trader].yesShares = sim.sharesReceived;
    traders[buy.trader].invested = buy.amount;

    const currentPrice = getSpotPrice(yesSupply);
    const currentValue = traders[buy.trader].yesShares * currentPrice;
    const unrealizedProfit = currentValue - traders[buy.trader].invested;
    const roi = (unrealizedProfit / traders[buy.trader].invested) * 100;

    console.log(`  ${traders[buy.trader].name}: Bought ${buy.amount} SOL → ${sim.sharesReceived.toFixed(2)} shares @ ${sim.averageEntryPrice.toFixed(9)} SOL`);
    console.log(`     Current Value: ${currentValue.toFixed(4)} SOL | Unrealized P&L: ${unrealizedProfit >= 0 ? '+' : ''}${unrealizedProfit.toFixed(4)} SOL (${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%)`);
});

console.log(`\n📊 STATE AFTER EARLY BUYS:`);
console.log(`  YES Supply: ${(yesSupply / 1e6).toFixed(2)}M shares`);
console.log(`  YES Price: ${getSpotPrice(yesSupply).toFixed(9)} SOL`);
console.log(`  YES Mcap: ${(yesSupply * getSpotPrice(yesSupply)).toFixed(4)} SOL`);
console.log(`  Vault SOL: ${totalVaultSOL.toFixed(4)} SOL`);

// ============================================================================
// PUMP TO 4x (some traders sell here)
// ============================================================================

console.log('\n\n📍 PHASE 3: PUMP TO 4x (Bob & Dave sell, others HODL)');
console.log('='.repeat(80));

// Simulate more buys to pump the market
console.log('\n📈 PUMPING MARKET (viral buys)...');

let pumpSOL = 0;
while (totalVaultSOL < 4) { // Pump until early investors are at ~4x
    const buyAmount = 0.5 + Math.random() * 1.5; // Random buys 0.5-2 SOL
    const sim = simulateBuy(buyAmount, {
        totalSharesMinted: yesSupply,
        virtualSolReserves: 0,
        virtualShareReserves: 0,
        realSolReserves: 0
    });

    yesSupply += sim.sharesReceived;
    totalVaultSOL += buyAmount;
    pumpSOL += buyAmount;
}

console.log(`  Pumped with ${pumpSOL.toFixed(2)} SOL from viral traders`);

console.log(`\n📊 STATE AFTER PUMP:`);
const yesPriceAfterPump = getSpotPrice(yesSupply);
console.log(`  YES Supply: ${(yesSupply / 1e6).toFixed(2)}M shares`);
console.log(`  YES Price: ${yesPriceAfterPump.toFixed(9)} SOL`);
console.log(`  YES Mcap: ${(yesSupply * yesPriceAfterPump).toFixed(4)} SOL`);
console.log(`  Vault SOL: ${totalVaultSOL.toFixed(4)} SOL`);

// Check who is at 4x and let them sell
console.log('\n💰 TRADER STATUS AT THIS POINT:');
traders.forEach((trader, idx) => {
    const currentValue = trader.yesShares * yesPriceAfterPump;
    const unrealizedProfit = currentValue - trader.invested;
    const roi = (unrealizedProfit / trader.invested) * 100;
    const multiple = currentValue / trader.invested;

    console.log(`  ${trader.name}: ${trader.yesShares.toFixed(2)} shares = ${currentValue.toFixed(4)} SOL (${multiple.toFixed(2)}x invested)`);

    if (trader.soldAt4x && multiple >= 4) {
        console.log(`    → ${trader.name} SELLS at ${multiple.toFixed(2)}x! 🎯`);
        // In real scenario, they would sell here and reduce supply
        // For simplicity, we just mark them as sold
    } else {
        console.log(`    → ${trader.name} HODLS 💎🙌`);
    }
});

// ============================================================================
// CONTINUE PUMP TO TARGET MCAP
// ============================================================================

console.log('\n\n📍 PHASE 4: PUMP TO TARGET (10M YES mcap, 4M NO mcap)');
console.log('='.repeat(80));

// Target: 10M YES mcap
const targetYesMcap = 10_000_000; // 10M SOL mcap
const targetNoMcap = 4_000_000;   // 4M SOL mcap

console.log(`\n🎯 TARGET:`);
console.log(`  YES Mcap: ${(targetYesMcap / 1e6).toFixed(1)}M SOL`);
console.log(`  NO Mcap: ${(targetNoMcap / 1e6).toFixed(1)}M SOL`);

// Calculate required supply for target mcap
// Mcap = Supply × Price
// We need to iteratively solve for supply given target mcap

console.log('\n📈 PUMPING TO TARGET...');

// For YES: Find supply that gives us 10M mcap
let targetYesSupply = yesSupply;
for (let i = 0; i < 100; i++) {
    const price = getSpotPrice(targetYesSupply);
    const mcap = targetYesSupply * price;

    if (mcap >= targetYesMcap) break;

    // Increase supply
    targetYesSupply += 10_000_000; // Add 10M shares per iteration
}

// Calculate how much SOL needed to reach this supply
let solNeededForYes = 0;
let currentYesSupply = yesSupply;

while (currentYesSupply < targetYesSupply) {
    const buyAmount = 10; // Buy in 10 SOL chunks
    const sim = simulateBuy(buyAmount, {
        totalSharesMinted: currentYesSupply,
        virtualSolReserves: 0,
        virtualShareReserves: 0,
        realSolReserves: 0
    });

    currentYesSupply += sim.sharesReceived;
    solNeededForYes += buyAmount;

    if (solNeededForYes > 100000) {
        console.log('⚠️  Safety break: Would need more than 100K SOL');
        break;
    }
}

yesSupply = currentYesSupply;
totalVaultSOL += solNeededForYes;

console.log(`  Pumped YES with ${solNeededForYes.toFixed(2)} SOL`);

// For NO: Do the same
let targetNoSupply = 0;
for (let i = 0; i < 100; i++) {
    const price = getSpotPrice(targetNoSupply);
    const mcap = targetNoSupply * price;

    if (mcap >= targetNoMcap) break;

    targetNoSupply += 10_000_000;
}

let solNeededForNo = 0;
let currentNoSupply = noSupply;

while (currentNoSupply < targetNoSupply) {
    const buyAmount = 10;
    const sim = simulateBuy(buyAmount, {
        totalSharesMinted: currentNoSupply,
        virtualSolReserves: 0,
        virtualShareReserves: 0,
        realSolReserves: 0
    });

    currentNoSupply += sim.sharesReceived;
    solNeededForNo += buyAmount;

    if (solNeededForNo > 100000) break;
}

noSupply = currentNoSupply;
totalVaultSOL += solNeededForNo;

console.log(`  Pumped NO with ${solNeededForNo.toFixed(2)} SOL`);

// ============================================================================
// FINAL STATE
// ============================================================================

console.log('\n\n📍 FINAL STATE');
console.log('='.repeat(80));

const finalYesPrice = getSpotPrice(yesSupply);
const finalNoPrice = getSpotPrice(noSupply);
const finalYesMcap = yesSupply * finalYesPrice;
const finalNoMcap = noSupply * finalNoPrice;
const solPriceUSD = 150;

console.log('\n💎 YES TOKEN:');
console.log(`  Supply: ${(yesSupply / 1e6).toFixed(2)}M shares`);
console.log(`  Price: ${finalYesPrice.toFixed(9)} SOL ($${(finalYesPrice * solPriceUSD).toFixed(2)} USD)`);
console.log(`  Mcap: ${(finalYesMcap / 1e6).toFixed(2)}M SOL ($${(finalYesMcap * solPriceUSD / 1e6).toFixed(2)}M USD)`);

console.log('\n💎 NO TOKEN:');
console.log(`  Supply: ${(noSupply / 1e6).toFixed(2)}M shares`);
console.log(`  Price: ${finalNoPrice.toFixed(9)} SOL ($${(finalNoPrice * solPriceUSD).toFixed(2)} USD)`);
console.log(`  Mcap: ${(finalNoMcap / 1e6).toFixed(2)}M SOL ($${(finalNoMcap * solPriceUSD / 1e6).toFixed(2)}M USD)`);

console.log('\n🏦 VAULT TOTALS:');
console.log(`  Total SOL in Vault: ${totalVaultSOL.toFixed(2)} SOL`);
console.log(`  Total USD Value: $${(totalVaultSOL * solPriceUSD).toFixed(2)} USD`);
console.log(`  Combined Mcap: ${((finalYesMcap + finalNoMcap) / 1e6).toFixed(2)}M SOL ($${((finalYesMcap + finalNoMcap) * solPriceUSD / 1e6).toFixed(2)}M USD)`);

// Calculate probability
const totalSupply = yesSupply + noSupply;
const yesProb = (yesSupply / totalSupply) * 100;
const noProb = (noSupply / totalSupply) * 100;

console.log('\n📊 PROBABILITY:');
console.log(`  YES: ${yesProb.toFixed(2)}%`);
console.log(`  NO: ${noProb.toFixed(2)}%`);

// ============================================================================
// EARLY HODLER RESULTS
// ============================================================================

console.log('\n\n📍 EARLY HODLER PROFITS (Diamond Hands 💎🙌)');
console.log('='.repeat(80));

console.log('\n👥 TRADER FINAL P&L:');

let totalEarlyInvested = 0;
let totalEarlyValue = 0;

traders.forEach((trader, idx) => {
    const currentValue = trader.yesShares * finalYesPrice;
    const profit = currentValue - trader.invested;
    const roi = (profit / trader.invested) * 100;
    const multiple = currentValue / trader.invested;

    totalEarlyInvested += trader.invested;
    totalEarlyValue += currentValue;

    const emoji = profit > 0 ? '🚀' : '📉';

    console.log(`\n  ${emoji} ${trader.name}:`);
    console.log(`     Invested: ${trader.invested.toFixed(4)} SOL`);
    console.log(`     Current Value: ${currentValue.toFixed(4)} SOL`);
    console.log(`     Profit: ${profit >= 0 ? '+' : ''}${profit.toFixed(4)} SOL`);
    console.log(`     ROI: ${roi >= 0 ? '+' : ''}${roi.toFixed(2)}% (${multiple.toFixed(2)}x)`);
    console.log(`     Strategy: ${trader.soldAt4x ? 'Sold at 4x ✂️' : 'HODL to moon 💎'}`);
});

const totalEarlyProfit = totalEarlyValue - totalEarlyInvested;
const avgEarlyROI = (totalEarlyProfit / totalEarlyInvested) * 100;

console.log('\n📈 AGGREGATE EARLY TRADER STATS:');
console.log(`  Total Invested: ${totalEarlyInvested.toFixed(4)} SOL`);
console.log(`  Total Current Value: ${totalEarlyValue.toFixed(4)} SOL`);
console.log(`  Total Profit: +${totalEarlyProfit.toFixed(4)} SOL`);
console.log(`  Average ROI: +${avgEarlyROI.toFixed(2)}%`);

// ============================================================================
// KEY INSIGHTS
// ============================================================================

console.log('\n\n📍 KEY INSIGHTS');
console.log('='.repeat(80));

console.log('\n✅ VAULT MECHANICS:');
console.log(`  - Total SOL deposited: ${totalVaultSOL.toFixed(2)} SOL`);
console.log(`  - This SOL is "locked" until market resolution`);
console.log(`  - If YES wins: All vault SOL goes to YES holders`);
console.log(`  - If NO wins: All vault SOL goes to NO holders`);

const yesSharesNeededFor1SOL = 1 / finalYesPrice;
const noSharesNeededFor1SOL = 1 / finalNoPrice;

console.log('\n💰 PAYOUT MATH (if market resolves):');
console.log(`\n  If YES wins:`);
console.log(`    - Total vault: ${totalVaultSOL.toFixed(2)} SOL`);
console.log(`    - Total YES shares: ${(yesSupply / 1e6).toFixed(2)}M`);
console.log(`    - Payout per share: ${(totalVaultSOL / yesSupply).toFixed(9)} SOL`);
console.log(`    - To get 1 SOL payout, you need: ${(yesSupply / totalVaultSOL).toFixed(0)} shares`);
console.log(`    - Current price to buy those shares: ${((yesSupply / totalVaultSOL) * finalYesPrice).toFixed(4)} SOL`);
console.log(`    - Expected profit buying now: ${(1 - ((yesSupply / totalVaultSOL) * finalYesPrice)).toFixed(4)} SOL per SOL bet`);

console.log(`\n  If NO wins:`);
console.log(`    - Total vault: ${totalVaultSOL.toFixed(2)} SOL`);
console.log(`    - Total NO shares: ${(noSupply / 1e6).toFixed(2)}M`);
console.log(`    - Payout per share: ${(totalVaultSOL / noSupply).toFixed(9)} SOL`);
console.log(`    - To get 1 SOL payout, you need: ${(noSupply / totalVaultSOL).toFixed(0)} shares`);
console.log(`    - Current price to buy those shares: ${((noSupply / totalVaultSOL) * finalNoPrice).toFixed(4)} SOL`);
console.log(`    - Expected profit buying now: ${(1 - ((noSupply / totalVaultSOL) * finalNoPrice)).toFixed(4)} SOL per SOL bet`);

console.log('\n🎯 ARBITRAGE CHECK:');
const yesImpliedOdds = yesProb / 100;
const noImpliedOdds = noProb / 100;
const yesPayoutRatio = (totalVaultSOL / yesSupply) / finalYesPrice;
const noPayoutRatio = (totalVaultSOL / noSupply) / finalNoPrice;

console.log(`  YES: Probability ${yesProb.toFixed(2)}% vs Payout ratio ${yesPayoutRatio.toFixed(2)}x`);
console.log(`  NO: Probability ${noProb.toFixed(2)}% vs Payout ratio ${noPayoutRatio.toFixed(2)}x`);

if (yesPayoutRatio < yesImpliedOdds || noPayoutRatio < noImpliedOdds) {
    console.log('  ⚠️  Arbitrage opportunity exists! Market is mispriced.');
} else {
    console.log('  ✅ Market is fairly priced. No arbitrage.');
}

console.log('\n');
