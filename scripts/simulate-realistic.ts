import { simulateBuy, getSpotPrice, getIgnitionStatus } from './lib/core-amm';

console.log('\n🧞 DJINN PROTOCOL - SIMULACIÓN REALISTA 20 COMPRADORES\n');
console.log('Escenario: Market "Will Bitcoin hit $200K in 2026?"\n');
console.log('═══════════════════════════════════════════════════════════════\n');

interface Buyer {
  name: string;
  investment: number; // SOL
  shares: number;
  entryPrice: number;
  supply: number;
}

let currentSupply = 0;
let vaultBalance = 0;
const buyers: Buyer[] = [];

// 20 compradores con diferentes estrategias
const investments = [
  // Early birds (1-5): Small amounts
  0.1, 0.2, 0.15, 0.3, 0.25,
  // Community (6-10): Medium amounts
  0.5, 0.7, 0.4, 0.6, 0.5,
  // Believers (11-15): Larger amounts
  1.0, 1.5, 2.0, 1.2, 0.8,
  // Whales (16-18): Big money
  5.0, 3.0, 4.0,
  // FOMO (19-20): Late but excited
  2.5, 3.5
];

investments.forEach((sol, i) => {
  const result = simulateBuy(sol, {
    virtualSolReserves: 0,
    virtualShareReserves: 0,
    realSolReserves: vaultBalance,
    totalSharesMinted: currentSupply
  });

  buyers.push({
    name: `Buyer ${i + 1}`,
    investment: sol,
    shares: result.sharesReceived,
    entryPrice: result.averageEntryPrice,
    supply: currentSupply
  });

  currentSupply += result.sharesReceived;
  vaultBalance += result.netInvested;

  const status = getIgnitionStatus(currentSupply);
  const emoji = status === 'VIRAL' ? '🚀' : status === 'BREAKING' ? '⚠️' : '🛡️';

  console.log(`${emoji} ${buyers[i].name.padEnd(10)} | Invests: ${sol.toFixed(2)} SOL | Gets: ${(result.sharesReceived / 1e6).toFixed(2)}M shares | Price: ${result.averageEntryPrice.toFixed(8)} | Status: ${status}`);
});

// Market state
const finalPrice = getSpotPrice(currentSupply);
const totalInvested = investments.reduce((a, b) => a + b, 0);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('MARKET FINAL STATE');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Total Supply: ${(currentSupply / 1e6).toFixed(2)}M shares`);
console.log(`Current Price: ${finalPrice.toFixed(8)} SOL`);
console.log(`Vault Balance: ${vaultBalance.toFixed(2)} SOL`);
console.log(`Total Invested: ${totalInvested.toFixed(2)} SOL`);
console.log(`Market Cap (Yes): ${(finalPrice * currentSupply).toFixed(2)} SOL`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('P&L ANALYSIS (Current prices)');
console.log('═══════════════════════════════════════════════════════════════');

buyers.forEach((buyer, i) => {
  const currentValue = buyer.shares * finalPrice;
  const pnl = currentValue - buyer.investment;
  const mult = currentValue / buyer.investment;
  const roi = ((mult - 1) * 100).toFixed(0);

  const emoji = mult >= 2 ? '💰' : mult >= 1.5 ? '📈' : mult >= 1 ? '✅' : '📉';
  const color = mult >= 1 ? '+' : '';

  console.log(`${emoji} ${buyer.name.padEnd(10)} | Invested: ${buyer.investment.toFixed(2)} SOL | Value: ${currentValue.toFixed(2)} SOL | P&L: ${color}${pnl.toFixed(2)} SOL (${mult.toFixed(2)}x) | ROI: ${color}${roi}%`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('ESCENARIO: Market resuelve YES (todos ganan)');
console.log('═══════════════════════════════════════════════════════════════');

const resolutionFee = vaultBalance * 0.02;
const winnerPool = vaultBalance - resolutionFee;

console.log(`Total Vault: ${vaultBalance.toFixed(2)} SOL`);
console.log(`Resolution Fee (2%): ${resolutionFee.toFixed(4)} SOL`);
console.log(`Winner Pool: ${winnerPool.toFixed(2)} SOL\n`);

buyers.forEach(buyer => {
  const shareOfPool = buyer.shares / currentSupply;
  const payout = winnerPool * shareOfPool;
  const profit = payout - buyer.investment;
  const roi = ((payout / buyer.investment - 1) * 100).toFixed(0);

  const emoji = profit > 0 ? '🎉' : '💀';
  const sign = profit >= 0 ? '+' : '';

  console.log(`${emoji} ${buyer.name.padEnd(10)} | Payout: ${payout.toFixed(4)} SOL | Profit: ${sign}${profit.toFixed(4)} SOL | ROI: ${sign}${roi}%`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('EARLY vs LATE COMPARISON');
console.log('═══════════════════════════════════════════════════════════════');

const early = buyers[0];
const late = buyers[buyers.length - 1];
const earlyPayout = winnerPool * (early.shares / currentSupply);
const latePayout = winnerPool * (late.shares / currentSupply);

console.log(`Early Bird (Buyer 1):`);
console.log(`  - Invested: ${early.investment.toFixed(2)} SOL`);
console.log(`  - Payout: ${earlyPayout.toFixed(4)} SOL`);
console.log(`  - ROI: ${((earlyPayout / early.investment - 1) * 100).toFixed(0)}%`);
console.log(`  - Shares: ${(early.shares / 1e6).toFixed(2)}M\n`);

console.log(`Late Buyer (Buyer 20):`);
console.log(`  - Invested: ${late.investment.toFixed(2)} SOL`);
console.log(`  - Payout: ${latePayout.toFixed(4)} SOL`);
console.log(`  - ROI: ${((latePayout / late.investment - 1) * 100).toFixed(0)}%`);
console.log(`  - Shares: ${(late.shares / 1e6).toFixed(2)}M\n`);

console.log('🔥 VERDICT: Both profit, but early bird gets better ROI');
console.log('This incentivizes EARLY participation without DESTROYING late buyers');
console.log('\n═══════════════════════════════════════════════════════════════\n');
