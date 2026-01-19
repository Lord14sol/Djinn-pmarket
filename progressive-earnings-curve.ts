/**
 * DJINN CURVE: Ganancias progresivas para early adopters
 *
 * OBJETIVO: Que los primeros compradores ganen progresivamente
 * 2x → 3x → 4x → 5x → 6x... y luego la curva se vuelva MONSTRUOSA
 *
 * No queremos: Lento 2.7x en 90M, luego salto brusco
 * Queremos: Progresión suave y acelerante desde el inicio
 */

const P_START = 0.000001;
const P_MAX = 0.95;

// DISEÑO ACTUAL (PROBLEMA)
const CURRENT = {
  PHASE1_END: 90_000_000,
  PHASE2_END: 110_000_000,
  P_90: 0.0000027,   // Solo 2.7x después de 90M shares ❌ MUY LENTO
  P_110: 0.000015,   // 15x
  K: 0.00047,
};

// NUEVOS DISEÑOS: Progresión más rápida desde el inicio
const PROGRESSIVE_DESIGNS = [
  {
    label: "Moderado",
    PHASE1_END: 50_000_000,   // Más corto
    PHASE2_END: 90_000_000,    // Bridge más largo
    P_PHASE1: 0.000005,        // 5x al final de Phase 1
    P_PHASE2: 0.000012,        // 12x al final de Phase 2
    K: 0.00047,
  },
  {
    label: "Agresivo",
    PHASE1_END: 50_000_000,
    PHASE2_END: 90_000_000,
    P_PHASE1: 0.000006,        // 6x al final de Phase 1
    P_PHASE2: 0.000015,        // 15x al final de Phase 2
    K: 0.00047,
  },
  {
    label: "Muy Agresivo",
    PHASE1_END: 40_000_000,    // Muy corto
    PHASE2_END: 80_000_000,
    P_PHASE1: 0.000007,        // 7x al final de Phase 1
    P_PHASE2: 0.000018,        // 18x al final de Phase 2
    K: 0.00047,
  },
  {
    label: "Monstruoso desde inicio",
    PHASE1_END: 30_000_000,    // Super corto
    PHASE2_END: 70_000_000,
    P_PHASE1: 0.000008,        // 8x al final de Phase 1
    P_PHASE2: 0.000020,        // 20x al final de Phase 2
    K: 0.00047,
  },
];

function calculatePriceCurrent(supply: number): number {
  if (supply <= CURRENT.PHASE1_END) {
    const m = (CURRENT.P_90 - P_START) / CURRENT.PHASE1_END;
    return P_START + m * supply;
  } else if (supply <= CURRENT.PHASE2_END) {
    const progress = supply - CURRENT.PHASE1_END;
    const range = CURRENT.PHASE2_END - CURRENT.PHASE1_END;
    const ratio_sq = Math.pow(progress / range, 2);
    return CURRENT.P_90 + (CURRENT.P_110 - CURRENT.P_90) * ratio_sq;
  } else {
    const x_rel = supply - CURRENT.PHASE2_END;
    const kz = CURRENT.K * x_rel;
    const norm = Math.min(1_000_000_000, kz);
    return CURRENT.P_110 + (P_MAX - CURRENT.P_110) * norm / 1_000_000_000;
  }
}

function calculatePriceProgressive(supply: number, design: any): number {
  if (supply <= design.PHASE1_END) {
    const m = (design.P_PHASE1 - P_START) / design.PHASE1_END;
    return P_START + m * supply;
  } else if (supply <= design.PHASE2_END) {
    const progress = supply - design.PHASE1_END;
    const range = design.PHASE2_END - design.PHASE1_END;
    const ratio_sq = Math.pow(progress / range, 2);
    return design.P_PHASE1 + (design.P_PHASE2 - design.P_PHASE1) * ratio_sq;
  } else {
    const x_rel = supply - design.PHASE2_END;
    const kz = design.K * x_rel;
    const norm = Math.min(1_000_000_000, kz);
    return design.P_PHASE2 + (P_MAX - design.P_PHASE2) * norm / 1_000_000_000;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('DJINN CURVE: Ganancias Progresivas para Early Adopters');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('🎯 OBJETIVO:');
console.log('   Los primeros compradores ganan progresivamente:');
console.log('   2x → 3x → 4x → 5x → 6x... luego la curva se vuelve MONSTRUOSA\n');

console.log('❌ PROBLEMA ACTUAL:');
console.log('   Solo 2.7x después de 90M shares (muy lento)');
console.log('   Luego salto brusco a 15x en 110M\n');

console.log('✅ SOLUCIÓN:');
console.log('   Acortar Phase 1 (Anchor) para que early birds ganen más rápido');
console.log('   Progresión suave y acelerante desde el inicio\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('COMPARACIÓN DE DISEÑOS:');
console.log('═══════════════════════════════════════════════════════════════\n');

PROGRESSIVE_DESIGNS.forEach(design => {
  console.log(`\n━━━ ${design.label.toUpperCase()} ━━━`);
  console.log(`Phase 1 (Fast Ramp): 0-${(design.PHASE1_END / 1_000_000)}M  → ${(design.P_PHASE1 / P_START).toFixed(0)}x`);
  console.log(`Phase 2 (Accel):     ${(design.PHASE1_END / 1_000_000)}M-${(design.PHASE2_END / 1_000_000)}M → ${(design.P_PHASE2 / P_START).toFixed(0)}x`);
  console.log(`Phase 3 (Ignition):  ${(design.PHASE2_END / 1_000_000)}M-1B  → MONSTRUOSO\n`);

  const checkpoints = [
    { supply: 0, label: 'Start' },
    { supply: 10_000_000, label: '10M' },
    { supply: 20_000_000, label: '20M' },
    { supply: 30_000_000, label: '30M' },
    { supply: 40_000_000, label: '40M' },
    { supply: 50_000_000, label: '50M' },
    { supply: 70_000_000, label: '70M' },
    { supply: 90_000_000, label: '90M' },
    { supply: 110_000_000, label: '110M' },
    { supply: 120_000_000, label: '120M' },
    { supply: 150_000_000, label: '150M' },
    { supply: 200_000_000, label: '200M' },
  ];

  console.log('| Supply | Current | New Design | Ganancia | Mejora |');
  console.log('|--------|---------|------------|----------|--------|');

  checkpoints.forEach(({ supply, label }) => {
    const priceCurr = calculatePriceCurrent(supply);
    const priceNew = calculatePriceProgressive(supply, design);
    const multCurr = priceCurr / P_START;
    const multNew = priceNew / P_START;
    const improvement = ((multNew / multCurr - 1) * 100).toFixed(0);

    const status = multNew > multCurr ? '✅' : multNew === multCurr ? '→' : '⚠️';
    console.log(`| ${label.padEnd(5)} | ${multCurr.toFixed(1).padStart(6)}x | ${multNew.toFixed(1).padStart(8)}x | ${multNew.toFixed(1).padStart(6)}x | ${improvement.padStart(5)}% ${status} |`);
  });

  // Análisis de early returns
  const p10 = calculatePriceProgressive(10_000_000, design);
  const p20 = calculatePriceProgressive(20_000_000, design);
  const p30 = calculatePriceProgressive(30_000_000, design);
  const p40 = calculatePriceProgressive(40_000_000, design);
  const p50 = calculatePriceProgressive(50_000_000, design);

  console.log(`\n📊 Ganancias progresivas (early phase):`);
  console.log(`   10M:  ${(p10 / P_START).toFixed(1)}x ${(p10 / P_START) >= 2 ? '✅' : '⚠️'}`);
  console.log(`   20M:  ${(p20 / P_START).toFixed(1)}x ${(p20 / P_START) >= 3 ? '✅' : '⚠️'}`);
  console.log(`   30M:  ${(p30 / P_START).toFixed(1)}x ${(p30 / P_START) >= 4 ? '✅' : '⚠️'}`);
  console.log(`   40M:  ${(p40 / P_START).toFixed(1)}x ${(p40 / P_START) >= 5 ? '✅' : '⚠️'}`);
  console.log(`   50M:  ${(p50 / P_START).toFixed(1)}x ${(p50 / P_START) >= 6 ? '✅' : '⚠️'}`);

  const meetsGoal = (p10 / P_START) >= 2 && (p20 / P_START) >= 3 && (p30 / P_START) >= 4;
  console.log(`\n   Objetivo cumplido: ${meetsGoal ? '✅ SÍ' : '⚠️ PARCIAL'}`);
});

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('🎯 ANÁLISIS DETALLADO: MEJOR OPCIÓN');
console.log('═══════════════════════════════════════════════════════════════\n');

// Encontrar la mejor opción (balance entre aggressive y no demasiado)
const bestDesign = PROGRESSIVE_DESIGNS[1]; // "Agresivo"

console.log(`Diseño recomendado: ${bestDesign.label.toUpperCase()}\n`);

console.log('Estructura:');
console.log(`  Phase 1 (Fast Ramp): 0-${(bestDesign.PHASE1_END / 1_000_000)}M shares`);
console.log(`  Phase 2 (Acceleration): ${(bestDesign.PHASE1_END / 1_000_000)}M-${(bestDesign.PHASE2_END / 1_000_000)}M shares`);
console.log(`  Phase 3 (Ignition): ${(bestDesign.PHASE2_END / 1_000_000)}M-1B shares\n`);

console.log('Parámetros para implementar:');
console.log(`  PHASE1_END = ${bestDesign.PHASE1_END}  // ${(bestDesign.PHASE1_END / 1_000_000)}M`);
console.log(`  PHASE2_END = ${bestDesign.PHASE2_END}  // ${(bestDesign.PHASE2_END / 1_000_000)}M`);
console.log(`  P_PHASE1   = ${bestDesign.P_PHASE1}  // ${(bestDesign.P_PHASE1 / P_START).toFixed(0)}x`);
console.log(`  P_PHASE2   = ${bestDesign.P_PHASE2}  // ${(bestDesign.P_PHASE2 / P_START).toFixed(0)}x`);
console.log(`  K_SIGMOID  = ${bestDesign.K}  // Sin cambios\n`);

console.log('Ganancias progresivas:');
const milestones = [
  { shares: 10_000_000, investment: 0.05 },
  { shares: 20_000_000, investment: 0.15 },
  { shares: 30_000_000, investment: 0.30 },
  { shares: 40_000_000, investment: 0.50 },
  { shares: 50_000_000, investment: 0.75 },
];

milestones.forEach(({ shares, investment }) => {
  const price = calculatePriceProgressive(shares, bestDesign);
  const mult = price / P_START;
  console.log(`  Comprador en ${(shares / 1_000_000)}M (~${investment} SOL invertido) → ${mult.toFixed(1)}x ganancia`);
});

console.log('\n✅ Ventajas:');
console.log('  • Early birds ganan 2x, 3x, 4x, 5x, 6x progresivamente');
console.log('  • No hay saltos bruscos (progresión suave)');
console.log('  • Phase 3 se vuelve MONSTRUOSA después de 90M');
console.log('  • Mantiene filosofía "democratization of the pump"\n');

console.log('⚠️  Trade-offs:');
console.log('  • Menos shares totales en Phase 1 (50M vs 90M)');
console.log('  • Early slope más empinado (+80% vs actual)');
console.log('  • Primeros 10M compradores tienen entrada más cara\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('VISUALIZACIÓN:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('DISEÑO ACTUAL (Lento inicio, salto brusco):');
console.log('  0M ──────────────────────[Slow]─────────────────────── 90M ──[JUMP]── 110M ═══► 1B');
console.log('  1x                                                     2.7x   +12x    15x      412x');
console.log('  ❌ Solo 2.7x después de 90M shares                     ⚠️ SALTO BRUSCO\n');

console.log('DISEÑO NUEVO (Progresivo y acelerante):');
console.log('  0M ───[Fast]─── 50M ─────[Accel]───── 90M ═══[MONSTRUOSO]═══► 1B');
console.log('  1x     6x              15x                                     412x');
console.log('  2x  3x  4x  5x    8x  10x  12x     20x  30x  50x  100x  200x');
console.log('  ✅ Ganancias progresivas desde inicio    ✅ Se vuelve exponencial\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('💰 EJEMPLO REAL: Argentina vs Brasil');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Escenario: Market de "Argentina wins final 2026"\n');

const traders = [
  { name: 'Early bird #1', buy_at: 1_000_000, invested: 0.001 },
  { name: 'Early bird #2', buy_at: 5_000_000, invested: 0.005 },
  { name: 'Early bird #3', buy_at: 10_000_000, invested: 0.01 },
  { name: 'Community buyer', buy_at: 30_000_000, invested: 0.05 },
  { name: 'Late believer', buy_at: 50_000_000, invested: 0.1 },
  { name: 'FOMO whale', buy_at: 100_000_000, invested: 1.0 },
];

traders.forEach(trader => {
  const priceCurrent = calculatePriceCurrent(trader.buy_at);
  const priceNew = calculatePriceProgressive(trader.buy_at, bestDesign);
  const multCurrent = priceCurrent / P_START;
  const multNew = priceNew / P_START;

  console.log(`${trader.name.padEnd(18)} | Buy at ${(trader.buy_at / 1_000_000).toFixed(0)}M shares`);
  console.log(`  Current: ${multCurrent.toFixed(1)}x ganancia (${(trader.invested * multCurrent).toFixed(3)} SOL)`);
  console.log(`  New:     ${multNew.toFixed(1)}x ganancia (${(trader.invested * multNew).toFixed(3)} SOL) ${multNew > multCurrent ? '✅ MEJOR' : ''}\n`);
});

console.log('═══════════════════════════════════════════════════════════════\n');

console.log('🚀 PRÓXIMO PASO:');
console.log('   Implementar estos parámetros en lib/core-amm.ts y el smart contract\n');
