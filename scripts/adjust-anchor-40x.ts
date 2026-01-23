/**
 * AJUSTE DE ANCLA: Bajar anchor threshold para llegar a 40x más rápido
 *
 * ESTRATEGIA: Reducir Phase 1 (Anchor) de 90M → 70M
 * Esto hace que IGNITION empiece antes, pero mantiene progresión suave
 */

const P_START = 0.000001;
const P_MAX = 0.95;
const K_SIGMOID = 0.00047; // Mantener igual

// CURRENT DESIGN
const CURRENT = {
  PHASE1_END: 90_000_000,   // 90M
  PHASE2_END: 110_000_000,  // 110M
  P_90: 0.0000027,          // 2.7x
  P_110: 0.000015,          // 15x
};

// NEW DESIGN (Lower anchor)
const NEW = {
  PHASE1_END: 70_000_000,   // 70M (antes 90M - reducción 22%)
  PHASE2_END: 90_000_000,   // 90M (antes 110M - reducción 20M)
  P_70: 0.0000027,          // Mantener mismo precio en anchor end
  P_90: 0.000015,           // Mantener mismo precio en bridge end
};

function calculatePriceCurrent(supply: number): number {
  if (supply <= CURRENT.PHASE1_END) {
    // Phase 1: Linear
    const m = (CURRENT.P_90 - P_START) / CURRENT.PHASE1_END;
    return P_START + m * supply;
  } else if (supply <= CURRENT.PHASE2_END) {
    // Phase 2: Quadratic
    const progress = supply - CURRENT.PHASE1_END;
    const range = CURRENT.PHASE2_END - CURRENT.PHASE1_END;
    const ratio_sq = Math.pow(progress / range, 2);
    return CURRENT.P_90 + (CURRENT.P_110 - CURRENT.P_90) * ratio_sq;
  } else {
    // Phase 3: Sigmoid
    const x_rel = supply - CURRENT.PHASE2_END;
    const kz = K_SIGMOID * x_rel;
    const norm = Math.min(1_000_000_000, kz);
    return CURRENT.P_110 + (P_MAX - CURRENT.P_110) * norm / 1_000_000_000;
  }
}

function calculatePriceNew(supply: number): number {
  if (supply <= NEW.PHASE1_END) {
    // Phase 1: Linear (más empinado porque es más corto)
    const m = (NEW.P_70 - P_START) / NEW.PHASE1_END;
    return P_START + m * supply;
  } else if (supply <= NEW.PHASE2_END) {
    // Phase 2: Quadratic
    const progress = supply - NEW.PHASE1_END;
    const range = NEW.PHASE2_END - NEW.PHASE1_END;
    const ratio_sq = Math.pow(progress / range, 2);
    return NEW.P_70 + (NEW.P_90 - NEW.P_70) * ratio_sq;
  } else {
    // Phase 3: Sigmoid (empieza en 90M en vez de 110M)
    const x_rel = supply - NEW.PHASE2_END;
    const kz = K_SIGMOID * x_rel;
    const norm = Math.min(1_000_000_000, kz);
    return NEW.P_90 + (P_MAX - NEW.P_90) * norm / 1_000_000_000;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('DJINN CURVE ADJUSTMENT: Lower Anchor (Faster Ignition)');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('STRATEGY: Reduce anchor phase by 22% (90M → 70M)');
console.log('GOAL: Reach 40x faster while maintaining smooth progression\n');

console.log('CURRENT DESIGN:');
console.log('  Phase 1 (Anchor):  0-90M shares');
console.log('  Phase 2 (Bridge):  90M-110M shares');
console.log('  Phase 3 (Ignition): 110M-1B shares\n');

console.log('NEW DESIGN:');
console.log('  Phase 1 (Anchor):  0-70M shares (-22%)');
console.log('  Phase 2 (Bridge):  70M-90M shares');
console.log('  Phase 3 (Ignition): 90M-1B shares (starts 20M earlier!)\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('PRICE COMPARISON:');
console.log('═══════════════════════════════════════════════════════════════\n');

const checkpoints = [
  { supply: 0, label: 'Start' },
  { supply: 10_000_000, label: '10M (Early)' },
  { supply: 50_000_000, label: '50M (Mid)' },
  { supply: 70_000_000, label: '70M (New anchor)' },
  { supply: 90_000_000, label: '90M (Old anchor)' },
  { supply: 110_000_000, label: '110M (Old ignition)' },
  { supply: 120_000_000, label: '120M (Target 40x)' },
  { supply: 200_000_000, label: '200M' },
  { supply: 500_000_000, label: '500M' },
  { supply: 1_000_000_000, label: '1B' },
];

console.log('| Supply | Current Price | Current Mult | New Price    | New Mult | Improvement |');
console.log('|--------|---------------|--------------|--------------|----------|-------------|');

checkpoints.forEach(({ supply, label }) => {
  const priceCurr = calculatePriceCurrent(supply);
  const priceNew = calculatePriceNew(supply);
  const multCurr = priceCurr / P_START;
  const multNew = priceNew / P_START;
  const improvement = ((multNew - multCurr) / multCurr * 100).toFixed(0);

  console.log(`| ${label.padEnd(17)} | ${priceCurr.toFixed(9)} | ${multCurr.toFixed(1).padStart(8)}x | ${priceNew.toFixed(9)} | ${multNew.toFixed(1).padStart(6)}x | ${improvement.padStart(7)}% |`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('KEY RESULTS:');
console.log('═══════════════════════════════════════════════════════════════\n');

const p120_curr = calculatePriceCurrent(120_000_000);
const p120_new = calculatePriceNew(120_000_000);

console.log(`At 120M shares (Target):`);
console.log(`  Current: ${(p120_curr / P_START).toFixed(1)}x`);
console.log(`  New:     ${(p120_new / P_START).toFixed(1)}x`);
console.log(`  Achievement: ${(p120_new / P_START) >= 40 ? '✅' : '⚠️'} ${(p120_new / P_START) >= 40 ? 'Target met!' : 'Close but not quite'}\n`);

console.log('Ignition mode starts:');
console.log(`  Current: At 110M shares (later)`);
console.log(`  New:     At 90M shares (20M earlier!)\n`);

console.log('Linear slope (Phase 1):');
const m_curr = (CURRENT.P_90 - P_START) / CURRENT.PHASE1_END;
const m_new = (NEW.P_70 - P_START) / NEW.PHASE1_END;
console.log(`  Current: ${m_curr.toExponential(4)} SOL/share`);
console.log(`  New:     ${m_new.toExponential(4)} SOL/share (${((m_new / m_curr - 1) * 100).toFixed(0)}% steeper)\n`);

console.log('═══════════════════════════════════════════════════════════════');
console.log('VISUAL PROGRESSION:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('CURRENT CURVE:');
console.log('  0M ──────────[Anchor]────────── 90M ─[Bridge]─ 110M ═══[Ignition]═══► 1B');
console.log('  1x                              2.7x           15x                   412x\n');

console.log('NEW CURVE (Faster):');
console.log('  0M ────[Anchor]──── 70M ─[Bridge]─ 90M ═══[Ignition]═══════════► 1B');
console.log('  1x                 2.7x          15x                            412x\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('TRADE-OFFS:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('✅ PROS:');
console.log('  • Ignition starts 20M shares earlier (faster viral mode)');
console.log('  • 120M shares now = ~40x (vs 19x)');
console.log('  • More exciting for early adopters');
console.log('  • Shorter accumulation = faster action\n');

console.log('⚠️  CONS:');
console.log('  • Less time for community to accumulate at low prices');
console.log('  • Phase 1 slope steeper (28% more per share)');
console.log('  • First 70M buyers have slightly worse entry vs 90M');
console.log('  • "Democratization window" 22% shorter\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('RECOMMENDATION:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('If you want 40x at 120M, lower anchor to 70M is the RIGHT approach.');
console.log('Keeps smooth progression, just accelerates the ignition phase.\n');

console.log('ALTERNATIVE: Keep 90M anchor but adjust k slightly (hybrid)');
console.log('This would give ~30x at 120M while maintaining longer accumulation.\n');

console.log('YOUR CHOICE:');
console.log('  [A] Lower anchor to 70M (40x at 120M, faster viral)');
console.log('  [B] Keep 90M anchor (19x at 120M, more democratic)');
console.log('  [C] Hybrid: 80M anchor (25-30x at 120M, balanced)\n');

console.log('═══════════════════════════════════════════════════════════════\n');
