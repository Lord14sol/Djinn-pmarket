/**
 * AJUSTE DE CURVA: 19x → 40x en 120M shares
 *
 * Objetivo: Hacer la curva un poco más empinada al inicio
 * Para dar mejor "arranque" sin perder control
 */

// Current values
const P_START = 0.000001;
const P_110 = 0.000015;
const P_MAX = 0.95;
const PHASE3_START = 110_000_000;

// Current k (gradual)
const K_CURRENT = 0.00047; // 4.7e-4

// Calculate current price at 120M
function calculatePrice120M(k: number): number {
  const x_rel = 120_000_000 - PHASE3_START; // 10M
  const kz = k * x_rel;
  const norm_sig = Math.min(1_000_000_000, Math.max(0, kz));
  const price_delta = (P_MAX - P_110) * norm_sig / 1_000_000_000;
  return P_110 + price_delta;
}

// Find k for 40x
function findKFor40x(): number {
  const targetPrice = P_START * 40; // 0.00004 SOL

  // Solve: P_110 + (P_MAX - P_110) * k * 10M / 1e9 = 0.00004
  // k * 10M / 1e9 = (0.00004 - P_110) / (P_MAX - P_110)
  // k = (0.00004 - P_110) * 1e9 / (10M * (P_MAX - P_110))

  const numerator = (targetPrice - P_110) * 1_000_000_000;
  const denominator = 10_000_000 * (P_MAX - P_110);
  return numerator / denominator;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('DJINN CURVE ADJUSTMENT: 19x → 40x');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('CURRENT CURVE (Gradual Growth):');
console.log(`  K_SIGMOID = ${K_CURRENT} (4.7e-4)`);
console.log(`  Price at 0M: ${P_START.toFixed(9)} SOL (1x)`);
console.log(`  Price at 120M: ${calculatePrice120M(K_CURRENT).toFixed(9)} SOL (${(calculatePrice120M(K_CURRENT) / P_START).toFixed(1)}x)`);

const K_NEW = findKFor40x();
console.log('\nNEW CURVE (Faster Start):');
console.log(`  K_SIGMOID = ${K_NEW.toFixed(6)} (${K_NEW.toExponential(2)})`);
console.log(`  Price at 0M: ${P_START.toFixed(9)} SOL (1x)`);
console.log(`  Price at 120M: ${calculatePrice120M(K_NEW).toFixed(9)} SOL (${(calculatePrice120M(K_NEW) / P_START).toFixed(1)}x)`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('VERIFICATION AT KEY POINTS:');
console.log('═══════════════════════════════════════════════════════════════\n');

const checkpoints = [0, 50_000_000, 90_000_000, 110_000_000, 120_000_000, 200_000_000, 500_000_000, 1_000_000_000];

console.log('| Supply    | Current Price | Current Mult | New Price    | New Mult |');
console.log('|-----------|---------------|--------------|--------------|----------|');

checkpoints.forEach(supply => {
  let priceOld, priceNew;

  if (supply <= 90_000_000) {
    // Phase 1: Linear (same for both)
    const m = (0.0000027 - P_START) / 90_000_000;
    priceOld = priceNew = P_START + m * supply;
  } else if (supply <= 110_000_000) {
    // Phase 2: Quadratic (same for both)
    const progress = supply - 90_000_000;
    const range = 20_000_000;
    const ratio = progress / range;
    const ratio_sq = ratio * ratio;
    priceOld = priceNew = 0.0000027 + (P_110 - 0.0000027) * ratio_sq;
  } else {
    // Phase 3: Different k values
    priceOld = calculatePrice120M(K_CURRENT) + (supply - 120_000_000) * K_CURRENT * (P_MAX - P_110) / 1_000_000_000;
    priceNew = calculatePrice120M(K_NEW) + (supply - 120_000_000) * K_NEW * (P_MAX - P_110) / 1_000_000_000;

    // Properly calculate with sigmoid
    const x_rel_old = supply - PHASE3_START;
    const kz_old = K_CURRENT * x_rel_old;
    const norm_old = Math.min(1_000_000_000, Math.max(0, kz_old));
    priceOld = P_110 + (P_MAX - P_110) * norm_old / 1_000_000_000;

    const x_rel_new = supply - PHASE3_START;
    const kz_new = K_NEW * x_rel_new;
    const norm_new = Math.min(1_000_000_000, Math.max(0, kz_new));
    priceNew = P_110 + (P_MAX - P_110) * norm_new / 1_000_000_000;
  }

  const multOld = priceOld / P_START;
  const multNew = priceNew / P_START;

  console.log(`| ${(supply / 1e6).toFixed(0).padStart(6)}M   | ${priceOld.toFixed(9)} | ${multOld.toFixed(1).padStart(8)}x | ${priceNew.toFixed(9)} | ${multNew.toFixed(1).padStart(6)}x |`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('COMPARISON:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('At 120M shares (Target):');
console.log(`  Current: ${(calculatePrice120M(K_CURRENT) / P_START).toFixed(1)}x`);
console.log(`  New:     ${(calculatePrice120M(K_NEW) / P_START).toFixed(1)}x`);
console.log(`  Improvement: ${((calculatePrice120M(K_NEW) / calculatePrice120M(K_CURRENT) - 1) * 100).toFixed(0)}% faster growth\n`);

console.log('At 200M shares:');
const p200_old = calculatePrice120M(K_CURRENT) + (200_000_000 - 120_000_000) * K_CURRENT * (P_MAX - P_110) / 1_000_000_000;
const x200 = 200_000_000 - PHASE3_START;
const kz200_old = K_CURRENT * x200;
const norm200_old = Math.min(1_000_000_000, Math.max(0, kz200_old));
const price200_old = P_110 + (P_MAX - P_110) * norm200_old / 1_000_000_000;

const kz200_new = K_NEW * x200;
const norm200_new = Math.min(1_000_000_000, Math.max(0, kz200_new));
const price200_new = P_110 + (P_MAX - P_110) * norm200_new / 1_000_000_000;

console.log(`  Current: ${(price200_old / P_START).toFixed(0)}x`);
console.log(`  New:     ${(price200_new / P_START).toFixed(0)}x`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('CODE CHANGES NEEDED:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('In lib/core-amm.ts:');
console.log(`  const K_SIGMOID = ${K_NEW.toFixed(6)}; // Was: 0.00047\n`);

console.log('In programs/djinn-market/src/lib.rs:');
const k_scaled_rust = Math.round(K_NEW * 1e18 / 1e9);
console.log(`  pub const K_SIGMOID_SCALED: u128 = ${k_scaled_rust}; // Was: 470\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
