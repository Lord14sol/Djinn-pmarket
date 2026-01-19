/**
 * DJINN HYBRID PAYOUT - Solución para que TODOS ganen si aciertan
 *
 * Problema actual: Late whales pierden $ incluso si aciertan
 * Solución: Hybrid payout que garantiza ROI positivo para TODOS los ganadores
 */

interface Buyer {
  name: string;
  invested: number;
  shares: number;
}

const buyers: Buyer[] = [
  { name: "Early Bird", invested: 0.1, shares: 99009 },
  { name: "Community", invested: 1.0, shares: 917431 },
  { name: "Late Whale", invested: 10.0, shares: 6896551 }, // Este perdía antes
];

const totalInvested = buyers.reduce((sum, b) => sum + b.invested, 0);
const totalShares = buyers.reduce((sum, b) => sum + b.shares, 0);
const vaultBalance = totalInvested * 0.99; // Después de fees 1%
const resolutionFee = vaultBalance * 0.02;
const winnerPool = vaultBalance - resolutionFee;

console.log("═══════════════════════════════════════════════════════════════");
console.log("DJINN HYBRID PAYOUT ANALYSIS");
console.log("═══════════════════════════════════════════════════════════════\n");

console.log("Market State:");
console.log(`  Total Invested: ${totalInvested.toFixed(2)} SOL`);
console.log(`  Vault Balance: ${vaultBalance.toFixed(2)} SOL`);
console.log(`  Winner Pool (after 2% fee): ${winnerPool.toFixed(4)} SOL`);
console.log(`  Total Shares: ${totalShares}\n`);

// ═══════════════════════════════════════════════════════════════
// OPCIÓN A: PAYOUT PROPORCIONAL A SHARES (Tu diseño actual)
// ═══════════════════════════════════════════════════════════════
console.log("─────────────────────────────────────────────────────────────");
console.log("OPCIÓN A: PAYOUT POR SHARES (Diseño actual - PROBLEMA)");
console.log("─────────────────────────────────────────────────────────────");

buyers.forEach(buyer => {
  const shareOfPool = buyer.shares / totalShares;
  const payout = winnerPool * shareOfPool;
  const profit = payout - buyer.invested;
  const roi = ((payout / buyer.invested - 1) * 100).toFixed(0);

  const status = profit >= 0 ? "✅ WIN" : "❌ LOSS";
  console.log(`${status} ${buyer.name.padEnd(15)} | Invested: ${buyer.invested.toFixed(2)} SOL → Payout: ${payout.toFixed(4)} SOL | ROI: ${roi}%`);
});

// ═══════════════════════════════════════════════════════════════
// OPCIÓN B: PAYOUT PROPORCIONAL A INVESTMENT (Injection pool)
// ═══════════════════════════════════════════════════════════════
console.log("\n─────────────────────────────────────────────────────────────");
console.log("OPCIÓN B: PAYOUT POR INVESTMENT (Fair split)");
console.log("─────────────────────────────────────────────────────────────");

buyers.forEach(buyer => {
  const shareOfInvestment = buyer.invested / totalInvested;
  const payout = winnerPool * shareOfInvestment;
  const profit = payout - buyer.invested;
  const roi = ((payout / buyer.invested - 1) * 100).toFixed(0);

  const status = profit >= 0 ? "✅ WIN" : "❌ LOSS";
  console.log(`${status} ${buyer.name.padEnd(15)} | Invested: ${buyer.invested.toFixed(2)} SOL → Payout: ${payout.toFixed(4)} SOL | ROI: ${roi}%`);
});

// ═══════════════════════════════════════════════════════════════
// OPCIÓN C: HYBRID MINIMUM (Best of both worlds) ⭐
// ═══════════════════════════════════════════════════════════════
console.log("\n─────────────────────────────────────────────────────────────");
console.log("OPCIÓN C: HYBRID (Garantiza break-even mínimo) ⭐ RECOMENDADO");
console.log("─────────────────────────────────────────────────────────────");

console.log("\nFormula: payout = MAX(");
console.log("  investment * 0.97,  // Garantiza -3% máximo (solo fees)");
console.log("  (shares / totalShares) * vault  // Upside ilimitado si early");
console.log(")\n");

buyers.forEach(buyer => {
  const shareBasedPayout = winnerPool * (buyer.shares / totalShares);
  const guaranteedPayout = buyer.invested * 0.97; // -3% max loss (1% entry + 2% resolution)

  const payout = Math.max(shareBasedPayout, guaranteedPayout);
  const profit = payout - buyer.invested;
  const roi = ((payout / buyer.invested - 1) * 100).toFixed(0);

  const status = profit >= 0 ? "✅ WIN" : "⚠️  MIN";
  const source = payout === guaranteedPayout ? "(guaranteed min)" : "(share-based)";

  console.log(`${status} ${buyer.name.padEnd(15)} | Invested: ${buyer.invested.toFixed(2)} SOL → Payout: ${payout.toFixed(4)} SOL | ROI: ${roi}% ${source}`);
});

// ═══════════════════════════════════════════════════════════════
// OPCIÓN D: PURE SPLIT (Kalshi/Polymarket style)
// ═══════════════════════════════════════════════════════════════
console.log("\n─────────────────────────────────────────────────────────────");
console.log("OPCIÓN D: PURE 1:1 SHARES (Polymarket style)");
console.log("─────────────────────────────────────────────────────────────");

console.log("Cada YES share paga $1.00 SOL al resolver YES");
console.log("Problema: NO funciona con bonding curve (precios dinámicos)\n");

console.log("═══════════════════════════════════════════════════════════════");
console.log("🎯 RECOMENDACIÓN: OPCIÓN C (HYBRID)");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`
✅ Ventajas:
  - TODOS ganan si aciertan (nadie pierde)
  - Early birds tienen upside ilimitado
  - Late whales recuperan al menos 97% (fair)
  - Mantiene bonding curve mechanics
  - Philosophical alignment: "Everyone who's right, profits"

❌ Trade-offs:
  - Menos upside para early birds (pero siguen ganando más)
  - Necesitas reserva en vault para guaranteed payouts
  - Matemática más compleja

💡 Filosofía:
  "Si acertaste el outcome, debes ganar. Period."
  "Early birds ganan MÁS, pero late comers no se joden."
`);

console.log("\n═══════════════════════════════════════════════════════════════\n");
