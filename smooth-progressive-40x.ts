/**
 * DJINN CURVE: Progresión suave hacia 40x
 *
 * PROBLEMA IDENTIFICADO: Salto de 2.7x → 15x en 20M shares es muy brusco
 * SOLUCIÓN: Bajar P_110 (bridge endpoint) para progresión más suave
 */

const P_START = 0.000001;
const P_MAX = 0.95;
const K_SIGMOID = 0.00047;

// DISEÑO ACTUAL (problema: salto brusco)
const CURRENT = {
  PHASE1_END: 90_000_000,
  PHASE2_END: 110_000_000,
  P_90: 0.0000027,   // 2.7x
  P_110: 0.000015,   // 15x ⚠️ SALTO MUY BRUSCO
};

// Test diferentes endpoints para Phase 2 (Bridge)
const PROGRESSIVE_DESIGNS = [
  {
    label: "Muy suave (5x bridge)",
    PHASE1_END: 70_000_000,
    PHASE2_END: 100_000_000,  // Bridge más largo
    P_ANCHOR_END: 0.0000027,   // 2.7x
    P_BRIDGE_END: 0.000005,    // 5x (en vez de 15x)
  },
  {
    label: "Suave (6x bridge)",
    PHASE1_END: 70_000_000,
    PHASE2_END: 100_000_000,
    P_ANCHOR_END: 0.0000027,   // 2.7x
    P_BRIDGE_END: 0.000006,    // 6x
  },
  {
    label: "Moderado (8x bridge)",
    PHASE1_END: 70_000_000,
    PHASE2_END: 100_000_000,
    P_ANCHOR_END: 0.0000027,   // 2.7x
    P_BRIDGE_END: 0.000008,    // 8x
  },
  {
    label: "Balanceado (10x bridge)",
    PHASE1_END: 70_000_000,
    PHASE2_END: 100_000_000,
    P_ANCHOR_END: 0.0000027,   // 2.7x
    P_BRIDGE_END: 0.000010,    // 10x
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
    const kz = K_SIGMOID * x_rel;
    const norm = Math.min(1_000_000_000, kz);
    return CURRENT.P_110 + (P_MAX - CURRENT.P_110) * norm / 1_000_000_000;
  }
}

function calculatePriceProgressive(supply: number, design: any): number {
  if (supply <= design.PHASE1_END) {
    const m = (design.P_ANCHOR_END - P_START) / design.PHASE1_END;
    return P_START + m * supply;
  } else if (supply <= design.PHASE2_END) {
    const progress = supply - design.PHASE1_END;
    const range = design.PHASE2_END - design.PHASE1_END;
    const ratio_sq = Math.pow(progress / range, 2);
    return design.P_ANCHOR_END + (design.P_BRIDGE_END - design.P_ANCHOR_END) * ratio_sq;
  } else {
    const x_rel = supply - design.PHASE2_END;
    const kz = K_SIGMOID * x_rel;
    const norm = Math.min(1_000_000_000, kz);
    return design.P_BRIDGE_END + (P_MAX - design.P_BRIDGE_END) * norm / 1_000_000_000;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('DJINN CURVE: Progresión Suave hacia 40x');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('🔍 PROBLEMA ACTUAL:');
console.log('   Salto de 2.7x → 15x en solo 20M shares (90M-110M)');
console.log('   Incremento: 5.6x en 20M shares ⚠️ MUY BRUSCO\n');

console.log('💡 SOLUCIÓN:');
console.log('   1. Bajar bridge endpoint (P_110) de 15x a 5-10x');
console.log('   2. Alargar bridge de 20M a 30M shares');
console.log('   3. Dejar que Phase 3 (sigmoid) haga el trabajo pesado\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('COMPARACIÓN DE DISEÑOS:');
console.log('═══════════════════════════════════════════════════════════════\n');

// Diseño actual
console.log('DISEÑO ACTUAL (PROBLEMA):');
console.log('  Phase 1 (Anchor):  0-90M   | 1x → 2.7x');
console.log('  Phase 2 (Bridge):  90M-110M | 2.7x → 15x  ⚠️ SALTO BRUSCO');
console.log('  Phase 3 (Ignition): 110M-1B | 15x → 412x\n');

const checkpoints = [
  { supply: 0, label: 'Start' },
  { supply: 50_000_000, label: '50M' },
  { supply: 70_000_000, label: '70M (Anchor end)' },
  { supply: 90_000_000, label: '90M' },
  { supply: 100_000_000, label: '100M (Bridge end)' },
  { supply: 110_000_000, label: '110M' },
  { supply: 120_000_000, label: '120M ★ TARGET' },
  { supply: 150_000_000, label: '150M' },
  { supply: 200_000_000, label: '200M' },
];

console.log('| Supply | Current | New Design | Multiplier | Progression |');
console.log('|--------|---------|------------|------------|-------------|');

PROGRESSIVE_DESIGNS.forEach((design, idx) => {
  if (idx === 0) {
    console.log(`\n─── ${design.label} ───\n`);
    console.log(`  Phase 1 (Anchor):  0-70M    | 1x → 2.7x`);
    console.log(`  Phase 2 (Bridge):  70M-100M | 2.7x → ${(design.P_BRIDGE_END / P_START).toFixed(1)}x  ✅ Suave`);
    console.log(`  Phase 3 (Ignition): 100M-1B | ${(design.P_BRIDGE_END / P_START).toFixed(1)}x → 412x\n`);

    checkpoints.forEach(({ supply, label }) => {
      const priceCurr = calculatePriceCurrent(supply);
      const priceNew = calculatePriceProgressive(supply, design);
      const multCurr = priceCurr / P_START;
      const multNew = priceNew / P_START;

      const target = supply === 120_000_000 ? '🎯' : '';
      const diff = multNew - multCurr;
      const diffStr = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);

      console.log(`| ${label.padEnd(17)} | ${multCurr.toFixed(1).padStart(5)}x | ${multNew.toFixed(1).padStart(8)}x | ${multNew.toFixed(1).padStart(8)}x | ${diffStr.padStart(9)} ${target}|`);
    });
  }
});

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('ANÁLISIS DETALLADO DE TODAS LAS OPCIONES:');
console.log('═══════════════════════════════════════════════════════════════\n');

PROGRESSIVE_DESIGNS.forEach(design => {
  console.log(`\n─── ${design.label.toUpperCase()} ───`);
  console.log(`Phase 1: 0-70M     | 1.0x → 2.7x   (slope: +0.024/M shares)`);
  console.log(`Phase 2: 70M-100M  | 2.7x → ${(design.P_BRIDGE_END / P_START).toFixed(1)}x   (jump: +${((design.P_BRIDGE_END / P_START) - 2.7).toFixed(1)}x en 30M shares)`);
  console.log(`Phase 3: 100M-1B   | ${(design.P_BRIDGE_END / P_START).toFixed(1)}x → 412x\n`);

  const p70 = calculatePriceProgressive(70_000_000, design);
  const p100 = calculatePriceProgressive(100_000_000, design);
  const p120 = calculatePriceProgressive(120_000_000, design);
  const p150 = calculatePriceProgressive(150_000_000, design);

  const bridgeJump = (p100 / p70);
  const phase3Growth = (p120 / p100);

  console.log(`Bridge Phase (70M-100M):`);
  console.log(`  Jump: ${bridgeJump.toFixed(1)}x en 30M shares`);
  console.log(`  Rate: ${((bridgeJump - 1) / 30).toFixed(3)}x per million shares`);
  console.log(`  Verdict: ${bridgeJump < 2.5 ? '✅ Suave' : bridgeJump < 4 ? '⚠️ Moderado' : '❌ Brusco'}\n`);

  console.log(`Early Ignition (100M-120M):`);
  console.log(`  Growth: ${phase3Growth.toFixed(2)}x en 20M shares`);
  console.log(`  At 120M: ${(p120 / P_START).toFixed(1)}x ${(p120 / P_START) >= 40 ? '✅ TARGET MET' : (p120 / P_START) >= 35 ? '⚠️ CLOSE' : '❌ TOO LOW'}\n`);

  console.log(`Key Milestones:`);
  console.log(`  70M:  ${(p70 / P_START).toFixed(1)}x`);
  console.log(`  100M: ${(p100 / P_START).toFixed(1)}x`);
  console.log(`  120M: ${(p120 / P_START).toFixed(1)}x 🎯`);
  console.log(`  150M: ${(p150 / P_START).toFixed(1)}x`);
});

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('🎯 RECOMENDACIÓN FINAL:');
console.log('═══════════════════════════════════════════════════════════════\n');

// Find best design that reaches 40x at 120M
let bestDesign = null;
let closestTo40x = Infinity;

PROGRESSIVE_DESIGNS.forEach(design => {
  const p120 = calculatePriceProgressive(120_000_000, design);
  const mult120 = p120 / P_START;
  const distance = Math.abs(mult120 - 40);

  if (distance < closestTo40x) {
    closestTo40x = distance;
    bestDesign = { ...design, mult120 };
  }
});

if (bestDesign && bestDesign.mult120 >= 38) {
  console.log(`✅ OPCIÓN RECOMENDADA: ${bestDesign.label}`);
  console.log(`\nNuevos parámetros:`);
  console.log(`  PHASE1_END = ${(bestDesign.PHASE1_END / 1_000_000)}M`);
  console.log(`  PHASE2_END = ${(bestDesign.PHASE2_END / 1_000_000)}M`);
  console.log(`  P_ANCHOR_END = ${bestDesign.P_ANCHOR_END} (2.7x)`);
  console.log(`  P_BRIDGE_END = ${bestDesign.P_BRIDGE_END} (${(bestDesign.P_BRIDGE_END / P_START).toFixed(1)}x)`);
  console.log(`  K_SIGMOID = 0.00047 (sin cambios)\n`);

  console.log(`Resultado:`);
  console.log(`  ✅ Progresión suave (no más saltos bruscos)`);
  console.log(`  ✅ Alcanza ${bestDesign.mult120.toFixed(1)}x en 120M shares`);
  console.log(`  ✅ Bridge solo sube ${((bestDesign.P_BRIDGE_END / bestDesign.P_ANCHOR_END) - 1) * 100 | 0}% (vs 455% anterior)`);
  console.log(`  ✅ Phase 3 (Ignition) hace el trabajo pesado\n`);
} else {
  console.log(`⚠️  NINGUNA OPCIÓN ALCANZA 40x con estos parámetros\n`);
  console.log(`Para llegar a 40x necesitas:`);
  console.log(`  OPCIÓN A: Aumentar k_sigmoid de 0.00047 a ~0.00055`);
  console.log(`  OPCIÓN B: Alargar Phase 3 start (bridge end) hasta 110M`);
  console.log(`  OPCIÓN C: Aceptar ~${bestDesign?.mult120.toFixed(0)}x como suficiente\n`);
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('VISUALIZACIÓN:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('DISEÑO ACTUAL (Brusco):');
console.log('  0M ──────[Anchor]────────── 90M ──[SALTO]── 110M ═══[Ignition]═══► 1B');
console.log('  1x                         2.7x    +12.3x   15x                   412x');
console.log('                                      ⚠️ BRUSCO\n');

console.log('DISEÑO NUEVO (Suave):');
console.log('  0M ────[Anchor]──── 70M ─────[Suave Bridge]───── 100M ═══[Ignition]═══► 1B');
console.log('  1x                2.7x                           5-10x              412x');
console.log('                            ✅ PROGRESIVO\n');

console.log('═══════════════════════════════════════════════════════════════\n');
