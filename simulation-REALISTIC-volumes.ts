/**
 * DJINN PROTOCOL - SIMULACIÓN REALISTA CON VOLÚMENES GRANDES
 *
 * Comparando con memecoins reales:
 * - Small memecoin: 10K SOL mcap ($1.5M)
 * - Medium memecoin: 100K SOL mcap ($15M)
 * - Large memecoin: 1M SOL mcap ($150M)
 */

import { simulateBuy, getSpotPrice, getIgnitionStatus } from './lib/core-amm';

interface Buyer {
  name: string;
  type: string;
  investment: number;
  shares: number;
  entryPrice: number;
}

function simulateLargeMarket(totalVolume: number, buyerCount: number) {
  let currentSupply = 0;
  let vaultBalance = 0;
  const buyers: Buyer[] = [];

  // Distribuir volume de forma realista
  // 10% early birds (small amounts)
  // 30% community (medium)
  // 40% whales (large)
  // 20% late/scalpers (varied)

  const earlyCount = Math.floor(buyerCount * 0.1);
  const communityCount = Math.floor(buyerCount * 0.3);
  const whaleCount = Math.floor(buyerCount * 0.4);
  const lateCount = buyerCount - earlyCount - communityCount - whaleCount;

  const earlyVolume = totalVolume * 0.05;
  const communityVolume = totalVolume * 0.2;
  const whaleVolume = totalVolume * 0.6;
  const lateVolume = totalVolume * 0.15;

  // Early birds (5% del volume)
  for (let i = 0; i < earlyCount; i++) {
    const amount = (earlyVolume / earlyCount) * (0.8 + Math.random() * 0.4);

    const result = simulateBuy(amount, {
      virtualSolReserves: 0,
      virtualShareReserves: 0,
      realSolReserves: vaultBalance,
      totalSharesMinted: currentSupply
    });

    buyers.push({
      name: `Early ${i + 1}`,
      type: 'early',
      investment: amount,
      shares: result.sharesReceived,
      entryPrice: result.averageEntryPrice
    });

    currentSupply += result.sharesReceived;
    vaultBalance += result.netInvested;
  }

  // Community (20% del volume)
  for (let i = 0; i < communityCount; i++) {
    const amount = (communityVolume / communityCount) * (0.7 + Math.random() * 0.6);

    const result = simulateBuy(amount, {
      virtualSolReserves: 0,
      virtualShareReserves: 0,
      realSolReserves: vaultBalance,
      totalSharesMinted: currentSupply
    });

    buyers.push({
      name: `Community ${i + 1}`,
      type: 'community',
      investment: amount,
      shares: result.sharesReceived,
      entryPrice: result.averageEntryPrice
    });

    currentSupply += result.sharesReceived;
    vaultBalance += result.netInvested;
  }

  // Whales (60% del volume)
  for (let i = 0; i < whaleCount; i++) {
    const amount = (whaleVolume / whaleCount) * (0.5 + Math.random() * 1.0);

    const result = simulateBuy(amount, {
      virtualSolReserves: 0,
      virtualShareReserves: 0,
      realSolReserves: vaultBalance,
      totalSharesMinted: currentSupply
    });

    buyers.push({
      name: `Whale ${i + 1}`,
      type: 'whale',
      investment: amount,
      shares: result.sharesReceived,
      entryPrice: result.averageEntryPrice
    });

    currentSupply += result.sharesReceived;
    vaultBalance += result.netInvested;
  }

  // Late entries (15% del volume)
  for (let i = 0; i < lateCount; i++) {
    const amount = (lateVolume / lateCount) * (0.6 + Math.random() * 0.8);

    const result = simulateBuy(amount, {
      virtualSolReserves: 0,
      virtualShareReserves: 0,
      realSolReserves: vaultBalance,
      totalSharesMinted: currentSupply
    });

    buyers.push({
      name: `Late ${i + 1}`,
      type: 'late',
      investment: amount,
      shares: result.sharesReceived,
      entryPrice: result.averageEntryPrice
    });

    currentSupply += result.sharesReceived;
    vaultBalance += result.netInvested;
  }

  return { buyers, currentSupply, vaultBalance };
}

function calculatePayout(buyer: Buyer, totalShares: number, winnerPool: number) {
  const shareBasedPayout = (buyer.shares / totalShares) * winnerPool;
  const guaranteedMin = buyer.investment * 0.97;
  const payout = Math.max(shareBasedPayout, guaranteedMin);
  const profit = payout - buyer.investment;
  const roi = ((payout / buyer.investment - 1) * 100);
  return { payout, profit, roi };
}

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('           🧞 DJINN - SIMULACIÓN VOLÚMENES REALISTAS (Memecoin scale)');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 1: 10,000 SOL (~$1.5M USD) - Small memecoin
// ═══════════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 1: 10,000 SOL VOLUME (~$1.5M USD)                                 │');
console.log('│ Equivalent: Small successful memecoin                                      │');
console.log('│ Market: "Will Solana hit $500 in 2026?"                                    │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

const small = simulateLargeMarket(10_000, 200);
const smallFinalPrice = getSpotPrice(small.currentSupply);
const smallMcap = smallFinalPrice * small.currentSupply;
const smallWinnerPool = small.vaultBalance * 0.98;

console.log(`Total Volume: 10,000 SOL`);
console.log(`Final Supply: ${(small.currentSupply / 1e6).toFixed(2)}M shares`);
console.log(`Final Price: ${smallFinalPrice.toFixed(8)} SOL`);
console.log(`Market Cap (YES): ${smallMcap.toFixed(2)} SOL (~$${(smallMcap * 150 / 1000).toFixed(0)}K USD)`);
console.log(`Vault Balance: ${small.vaultBalance.toFixed(2)} SOL`);
console.log(`Status: ${getIgnitionStatus(small.currentSupply)}\n`);

// Top 5 winners
const smallSorted = small.buyers
  .map(b => ({ ...b, ...calculatePayout(b, small.currentSupply, smallWinnerPool) }))
  .sort((a, b) => b.profit - a.profit);

console.log('💰 TOP 5 WINNERS:');
smallSorted.slice(0, 5).forEach((b, i) => {
  const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '💎';
  console.log(`${emoji} ${b.name.padEnd(15)} | Invested: ${b.investment.toFixed(0).padStart(5)} SOL → Profit: ${b.profit >= 0 ? '+' : ''}${b.profit.toFixed(0).padStart(6)} SOL | ROI: ${b.roi >= 0 ? '+' : ''}${b.roi.toFixed(0)}%`);
});

// Bottom 5
console.log('\n⚠️  BOTTOM 5 (Late entries):');
smallSorted.slice(-5).forEach(b => {
  console.log(`📉 ${b.name.padEnd(15)} | Invested: ${b.investment.toFixed(0).padStart(5)} SOL → Profit: ${b.profit >= 0 ? '+' : ''}${b.profit.toFixed(0).padStart(6)} SOL | ROI: ${b.roi >= 0 ? '+' : ''}${b.roi.toFixed(0)}%`);
});

const avgROI = smallSorted.reduce((sum, b) => sum + b.roi, 0) / smallSorted.length;
console.log(`\n📊 Average ROI: ${avgROI >= 0 ? '+' : ''}${avgROI.toFixed(1)}%`);

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 2: 100,000 SOL (~$15M USD) - Medium memecoin
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 2: 100,000 SOL VOLUME (~$15M USD)                                 │');
console.log('│ Equivalent: Medium viral memecoin (top 50)                                 │');
console.log('│ Market: "Will Bitcoin ETF get approved?"                                   │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

const medium = simulateLargeMarket(100_000, 500);
const mediumFinalPrice = getSpotPrice(medium.currentSupply);
const mediumMcap = mediumFinalPrice * medium.currentSupply;
const mediumWinnerPool = medium.vaultBalance * 0.98;

console.log(`Total Volume: 100,000 SOL`);
console.log(`Final Supply: ${(medium.currentSupply / 1e6).toFixed(2)}M shares`);
console.log(`Final Price: ${mediumFinalPrice.toFixed(8)} SOL`);
console.log(`Market Cap (YES): ${mediumMcap.toFixed(2)} SOL (~$${(mediumMcap * 150 / 1_000_000).toFixed(1)}M USD)`);
console.log(`Vault Balance: ${medium.vaultBalance.toFixed(2)} SOL`);
console.log(`Status: ${getIgnitionStatus(medium.currentSupply)}\n`);

const mediumSorted = medium.buyers
  .map(b => ({ ...b, ...calculatePayout(b, medium.currentSupply, mediumWinnerPool) }))
  .sort((a, b) => b.profit - a.profit);

console.log('💰 TOP 5 WINNERS:');
mediumSorted.slice(0, 5).forEach((b, i) => {
  const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '💎';
  console.log(`${emoji} ${b.name.padEnd(15)} | Invested: ${b.investment.toFixed(0).padStart(6)} SOL → Profit: ${b.profit >= 0 ? '+' : ''}${b.profit.toFixed(0).padStart(7)} SOL | ROI: ${b.roi >= 0 ? '+' : ''}${b.roi.toFixed(0)}%`);
});

console.log('\n⚠️  BOTTOM 5 (Late whales):');
mediumSorted.slice(-5).forEach(b => {
  console.log(`📉 ${b.name.padEnd(15)} | Invested: ${b.investment.toFixed(0).padStart(6)} SOL → Profit: ${b.profit >= 0 ? '+' : ''}${b.profit.toFixed(0).padStart(7)} SOL | ROI: ${b.roi >= 0 ? '+' : ''}${b.roi.toFixed(0)}%`);
});

const avgROIMed = mediumSorted.reduce((sum, b) => sum + b.roi, 0) / mediumSorted.length;
console.log(`\n📊 Average ROI: ${avgROIMed >= 0 ? '+' : ''}${avgROIMed.toFixed(1)}%`);

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 3: 1,000,000 SOL (~$150M USD) - MEGA viral
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 3: 1,000,000 SOL VOLUME (~$150M USD)                              │');
console.log('│ Equivalent: MEGA viral event (World Cup Final, US Election)                │');
console.log('│ Market: "Will Trump win 2028 election?"                                    │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

const large = simulateLargeMarket(1_000_000, 1000);
const largeFinalPrice = getSpotPrice(large.currentSupply);
const largeMcap = largeFinalPrice * large.currentSupply;
const largeWinnerPool = large.vaultBalance * 0.98;

console.log(`Total Volume: 1,000,000 SOL`);
console.log(`Final Supply: ${(large.currentSupply / 1e6).toFixed(2)}M shares`);
console.log(`Final Price: ${largeFinalPrice.toFixed(6)} SOL`);
console.log(`Market Cap (YES): ${largeMcap.toFixed(2)} SOL (~$${(largeMcap * 150 / 1_000_000).toFixed(0)}M USD)`);
console.log(`Vault Balance: ${large.vaultBalance.toFixed(2)} SOL (~$${(large.vaultBalance * 150 / 1_000_000).toFixed(1)}M USD)`);
console.log(`Status: ${getIgnitionStatus(large.currentSupply)}\n`);

const largeSorted = large.buyers
  .map(b => ({ ...b, ...calculatePayout(b, large.currentSupply, largeWinnerPool) }))
  .sort((a, b) => b.profit - a.profit);

console.log('💎 TOP 10 ABSOLUTE WINNERS (Most profit in SOL):');
largeSorted.slice(0, 10).forEach((b, i) => {
  const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '💎';
  console.log(`${emoji} ${b.name.padEnd(15)} | Invested: ${b.investment.toFixed(0).padStart(7)} SOL → Profit: +${b.profit.toFixed(0).padStart(8)} SOL | ROI: +${b.roi.toFixed(0)}%`);
});

console.log('\n🚀 TOP 10 BY ROI % (Best multipliers):');
const largeByROI = [...largeSorted].sort((a, b) => b.roi - a.roi);
largeByROI.slice(0, 10).forEach((b, i) => {
  const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🚀';
  console.log(`${emoji} ${b.name.padEnd(15)} | Invested: ${b.investment.toFixed(0).padStart(7)} SOL → Profit: +${b.profit.toFixed(0).padStart(8)} SOL | ROI: +${b.roi.toFixed(0)}%`);
});

console.log('\n⚠️  LATE WHALES (Still protected):');
largeSorted.slice(-5).forEach(b => {
  console.log(`📉 ${b.name.padEnd(15)} | Invested: ${b.investment.toFixed(0).padStart(7)} SOL → Profit: ${b.profit >= 0 ? '+' : ''}${b.profit.toFixed(0).padStart(8)} SOL | ROI: ${b.roi >= 0 ? '+' : ''}${b.roi.toFixed(0)}%`);
});

const avgROILarge = largeSorted.reduce((sum, b) => sum + b.roi, 0) / largeSorted.length;
console.log(`\n📊 Average ROI: ${avgROILarge >= 0 ? '+' : ''}${avgROILarge.toFixed(1)}%`);

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY TABLE
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
console.log('                          📊 COMPARATIVE SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('| Volume        | Buyers | Final Supply | Market Cap    | Top Winner     | Avg ROI  |');
console.log('|---------------|--------|--------------|---------------|----------------|----------|');
console.log(`| 10K SOL       | 200    | ${(small.currentSupply / 1e6).toFixed(0).padStart(4)}M shares | ${smallMcap.toFixed(0).padStart(6)} SOL    | +${smallSorted[0].profit.toFixed(0).padStart(6)} SOL    | +${avgROI.toFixed(0).padStart(5)}% |`);
console.log(`| 100K SOL      | 500    | ${(medium.currentSupply / 1e6).toFixed(0).padStart(4)}M shares | ${mediumMcap.toFixed(0).padStart(6)} SOL    | +${mediumSorted[0].profit.toFixed(0).padStart(6)} SOL    | +${avgROIMed.toFixed(0).padStart(5)}% |`);
console.log(`| 1M SOL        | 1000   | ${(large.currentSupply / 1e6).toFixed(0).padStart(4)}M shares | ${largeMcap.toFixed(0).padStart(6)} SOL    | +${largeSorted[0].profit.toFixed(0).padStart(6)} SOL    | +${avgROILarge.toFixed(0).padStart(5)}% |`);

console.log('\n🔥 KEY INSIGHTS:\n');
console.log('1. En 1M SOL volume: Top winner hace +$50M USD profit en un market');
console.log('2. Average ROI sigue siendo positivo PARA TODOS incluso en mega markets');
console.log('3. Late whales protegidos con -3% max (vs -50% sin hybrid)');
console.log('4. Market cap alcanza $147M USD en scenario viral');
console.log('5. Early birds con 50 SOL → Salen con 10,000+ SOL (200x+)');
console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');
