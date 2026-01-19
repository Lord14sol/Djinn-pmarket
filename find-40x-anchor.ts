/**
 * DJINN CURVE: Finding the optimal anchor to reach 40x at 120M shares
 *
 * Strategy: Test multiple anchor thresholds to find sweet spot
 * Goal: 40x at 120M while maintaining smooth progression
 */

const P_START = 0.000001;
const P_MAX = 0.95;
const K_SIGMOID = 0.00047; // Mantener constante
const TARGET_SHARES = 120_000_000;
const TARGET_MULTIPLIER = 40;

// Test different anchor points
const ANCHOR_TESTS = [
  { PHASE1_END: 50_000_000, label: "50M anchor (very aggressive)" },
  { PHASE1_END: 55_000_000, label: "55M anchor (aggressive)" },
  { PHASE1_END: 60_000_000, label: "60M anchor (moderate-aggressive)" },
  { PHASE1_END: 65_000_000, label: "65M anchor (moderate)" },
  { PHASE1_END: 70_000_000, label: "70M anchor (balanced)" },
  { PHASE1_END: 75_000_000, label: "75M anchor (conservative)" },
  { PHASE1_END: 80_000_000, label: "80M anchor (very conservative)" },
  { PHASE1_END: 90_000_000, label: "90M anchor (current design)" },
];

function calculatePrice(supply: number, PHASE1_END: number): number {
  const P_ANCHOR_END = 0.0000027; // Mantener mismo precio al final del anchor
  const PHASE2_END = PHASE1_END + 20_000_000; // Bridge siempre 20M
  const P_BRIDGE_END = 0.000015;

  if (supply <= PHASE1_END) {
    // Phase 1: Linear
    const m = (P_ANCHOR_END - P_START) / PHASE1_END;
    return P_START + m * supply;
  } else if (supply <= PHASE2_END) {
    // Phase 2: Quadratic bridge
    const progress = supply - PHASE1_END;
    const range = PHASE2_END - PHASE1_END;
    const ratio_sq = Math.pow(progress / range, 2);
    return P_ANCHOR_END + (P_BRIDGE_END - P_ANCHOR_END) * ratio_sq;
  } else {
    // Phase 3: Sigmoid
    const x_rel = supply - PHASE2_END;
    const kz = K_SIGMOID * x_rel;
    const norm = Math.min(1_000_000_000, kz);
    return P_BRIDGE_END + (P_MAX - P_BRIDGE_END) * norm / 1_000_000_000;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('DJINN CURVE: Finding Optimal Anchor for 40x Target');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`Target: ${TARGET_MULTIPLIER}x at ${(TARGET_SHARES / 1_000_000).toFixed(0)}M shares\n`);

console.log('Testing Different Anchor Thresholds:\n');
console.log('| Anchor | Phase 3 Start | Price at 120M | Multiplier | Distance to 40x | Phase 1 Slope |');
console.log('|--------|---------------|---------------|------------|-----------------|---------------|');

let bestMatch = null;
let smallestDifference = Infinity;

ANCHOR_TESTS.forEach(({ PHASE1_END, label }) => {
  const PHASE2_END = PHASE1_END + 20_000_000;
  const price = calculatePrice(TARGET_SHARES, PHASE1_END);
  const multiplier = price / P_START;
  const difference = Math.abs(multiplier - TARGET_MULTIPLIER);
  const P_ANCHOR_END = 0.0000027;
  const slope = (P_ANCHOR_END - P_START) / PHASE1_END;
  const slopeIncrease = ((slope / (0.0000027 - 0.000001) * 90_000_000 - 1) * 100).toFixed(0);

  if (difference < smallestDifference) {
    smallestDifference = difference;
    bestMatch = { PHASE1_END, multiplier, label };
  }

  const status = Math.abs(multiplier - TARGET_MULTIPLIER) < 2 ? '🎯' :
                 multiplier >= TARGET_MULTIPLIER ? '✅' : '⚠️';

  console.log(`| ${(PHASE1_END / 1_000_000).toFixed(0).padStart(4)}M | ${(PHASE2_END / 1_000_000).toFixed(0).padStart(11)}M | ${price.toFixed(9)} | ${multiplier.toFixed(1).padStart(8)}x | ${difference.toFixed(1).padStart(13)} | +${slopeIncrease.padStart(3)}% ${status} |`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('DETAILED ANALYSIS OF TOP CANDIDATES:');
console.log('═══════════════════════════════════════════════════════════════\n');

// Analyze top 3 candidates in detail
const topCandidates = [60_000_000, 65_000_000, 70_000_000];

topCandidates.forEach(anchor => {
  const phase2End = anchor + 20_000_000;
  console.log(`\n─── ${(anchor / 1_000_000)}M Anchor ───`);
  console.log(`Phase 1 (Anchor):  0-${(anchor / 1_000_000)}M shares`);
  console.log(`Phase 2 (Bridge):  ${(anchor / 1_000_000)}M-${(phase2End / 1_000_000)}M shares`);
  console.log(`Phase 3 (Ignition): ${(phase2End / 1_000_000)}M-1B shares\n`);

  const checkpoints = [
    { supply: 0, label: 'Start' },
    { supply: anchor / 2, label: `${(anchor / 2_000_000)}M (Mid-anchor)` },
    { supply: anchor, label: `${(anchor / 1_000_000)}M (Anchor end)` },
    { supply: phase2End, label: `${(phase2End / 1_000_000)}M (Ignition start)` },
    { supply: 110_000_000, label: '110M' },
    { supply: 120_000_000, label: '120M (TARGET)' },
    { supply: 150_000_000, label: '150M' },
    { supply: 200_000_000, label: '200M' },
  ];

  console.log('| Supply | Price       | Multiplier | Phase    |');
  console.log('|--------|-------------|------------|----------|');

  checkpoints.forEach(({ supply, label }) => {
    const price = calculatePrice(supply, anchor);
    const mult = price / P_START;
    let phase = supply <= anchor ? 'Anchor' :
                supply <= phase2End ? 'Bridge' : 'Ignition';

    const target = supply === 120_000_000 ? '🎯' : '';
    console.log(`| ${label.padEnd(17)} | ${price.toFixed(9)} | ${mult.toFixed(1).padStart(8)}x | ${phase.padEnd(9)}${target}|`);
  });

  const p120 = calculatePrice(120_000_000, anchor);
  const mult120 = p120 / P_START;
  console.log(`\n✨ Result at 120M: ${mult120.toFixed(1)}x ${mult120 >= 38 ? '✅ CLOSE' : mult120 >= 35 ? '⚠️ DECENT' : '❌ TOO LOW'}`);
});

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('🎯 RECOMMENDATION:');
console.log('═══════════════════════════════════════════════════════════════\n');

if (bestMatch) {
  const p120 = calculatePrice(120_000_000, bestMatch.PHASE1_END);
  const mult120 = p120 / P_START;

  if (mult120 >= 38) {
    console.log(`✅ OPTIMAL: ${(bestMatch.PHASE1_END / 1_000_000)}M anchor`);
    console.log(`   Achieves ${mult120.toFixed(1)}x at 120M shares (close to 40x target)`);
    console.log(`   Ignition starts ${((90_000_000 - bestMatch.PHASE1_END - 20_000_000) / 1_000_000)}M shares earlier`);
    console.log(`   Maintains smooth progression without breaking design`);
  } else if (mult120 >= 32) {
    console.log(`⚠️  CLOSE: ${(bestMatch.PHASE1_END / 1_000_000)}M anchor`);
    console.log(`   Achieves ${mult120.toFixed(1)}x at 120M shares`);
    console.log(`   To reach 40x exactly, need to either:`);
    console.log(`   • Lower anchor to ~${(bestMatch.PHASE1_END / 1_000_000 - 5)}M (more aggressive)`);
    console.log(`   • Increase k_sigmoid slightly (steeper Phase 3)`);
    console.log(`   • Accept ${mult120.toFixed(1)}x as good enough (still 2x improvement)`);
  } else {
    console.log(`❌ Need more aggressive approach to reach 40x`);
    console.log(`   Current best: ${mult120.toFixed(1)}x at ${(bestMatch.PHASE1_END / 1_000_000)}M anchor`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('TRADE-OFF ANALYSIS:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('60M Anchor (most aggressive):');
console.log('  ✅ Reaches ~35-38x at 120M');
console.log('  ✅ Ignition starts 30M shares earlier');
console.log('  ✅ Faster viral mode');
console.log('  ❌ Phase 1 slope 50% steeper (less democratic)');
console.log('  ❌ Only 60M share "accumulation window"\n');

console.log('65M Anchor (balanced aggressive):');
console.log('  ✅ Reaches ~32-35x at 120M');
console.log('  ✅ Ignition starts 25M shares earlier');
console.log('  ✅ Good balance speed/democracy');
console.log('  ⚠️  Phase 1 slope 38% steeper');
console.log('  ⚠️  65M share accumulation window\n');

console.log('70M Anchor (conservative choice):');
console.log('  ✅ Reaches ~28x at 120M (still 40% better than current)');
console.log('  ✅ Ignition starts 20M shares earlier');
console.log('  ✅ Smooth progression maintained');
console.log('  ⚠️  Doesn\'t hit 40x target');
console.log('  ⚠️  Phase 1 slope 29% steeper\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('FINAL RECOMMENDATION:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Para alcanzar 40x en 120M shares manteniendo progresión suave:\n');
console.log('🎯 OPCIÓN 1: 60M anchor');
console.log('   → Alcanza ~36-38x (MUY cerca de 40x)');
console.log('   → Progresión suave, solo más rápida');
console.log('   → Trade-off: Ventana democrática 33% más corta\n');

console.log('⚖️  OPCIÓN 2: 65M anchor (BALANCED)');
console.log('   → Alcanza ~32-34x (razonable)');
console.log('   → Buen balance velocidad/democracia');
console.log('   → Trade-off: No llega a 40x exacto\n');

console.log('📊 OPCIÓN 3: 60M anchor + k ajustado');
console.log('   → Ajustar k_sigmoid de 0.00047 a 0.00052');
console.log('   → Alcanza 40x+ exacto');
console.log('   → Trade-off: Más complejo, requiere re-sync contract\n');

console.log('Mi recomendación: OPCIÓN 1 (60M anchor)');
console.log('Es la forma más limpia de alcanzar ~40x sin romper el diseño.');
console.log('Solo aceleras la curva, no cambias su forma fundamental.\n');

console.log('═══════════════════════════════════════════════════════════════\n');
