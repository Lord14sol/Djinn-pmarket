// Simulación para encontrar el VIRTUAL_ANCHOR óptimo
// Objetivo: Compra inicial debe llevar probabilidad a ~66% sin explotar a 100%

const TOTAL_SUPPLY = 1_000_000_000; // 1B Shares
const PHASE1_END = 100_000_000;
const PHASE2_END = 200_000_000;
const PHASE3_START = 200_000_000;
const P_START = 0.000001;
const P_50 = 0.000005;
const P_90 = 0.000025;
const P_MAX = 0.95;

const LINEAR_SLOPE = (P_50 - P_START) / PHASE1_END;

function getSpotPrice(sharesSupply: number, virtualAnchor: number): number {
    const effectiveSupply = sharesSupply + virtualAnchor;

    if (effectiveSupply <= PHASE1_END) {
        return P_START + LINEAR_SLOPE * effectiveSupply;
    } else if (effectiveSupply <= PHASE2_END) {
        const progress = effectiveSupply - PHASE1_END;
        const range = PHASE2_END - PHASE1_END;
        const ratio = progress / range;
        const ratio_sq = ratio * ratio;
        const price_delta = (P_90 - P_50) * ratio_sq;
        return P_50 + price_delta;
    } else {
        const x_rel = effectiveSupply - PHASE3_START;
        const kz = 1.25 * x_rel;
        const norm_sig = Math.min(1_000_000_000, Math.max(0, kz));
        const price_delta = (P_MAX - P_90) * norm_sig / 1_000_000_000;
        return P_90 + price_delta;
    }
}

function getCostInContract(supplyOld: number, supplyNew: number, virtualAnchor: number): number {
    if (supplyNew <= supplyOld) return 0;
    const pOld = getSpotPrice(supplyOld, virtualAnchor);
    const pNew = getSpotPrice(supplyNew, virtualAnchor);
    const delta = supplyNew - supplyOld;
    return (pOld + pNew) / 2 * delta;
}

function solveForShares(currentSupply: number, netSolInvested: number, virtualAnchor: number): number {
    let low = currentSupply;
    let high = TOTAL_SUPPLY;

    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const cost = getCostInContract(currentSupply, mid, virtualAnchor);

        if (cost < netSolInvested) {
            low = mid;
        } else {
            high = mid;
        }

        if (high - low < 0.001) break;
    }
    return low - currentSupply;
}

function simulateBuy(amountSol: number, currentSupply: number, virtualAnchor: number) {
    const feeTotal = amountSol * 0.01; // 1% fee
    const netInvestedSol = amountSol - feeTotal;

    const rawShares = solveForShares(currentSupply, netInvestedSol, virtualAnchor);
    const sharesReceived = rawShares * 0.95; // 5% safety buffer

    const startPrice = getSpotPrice(currentSupply, virtualAnchor);
    const endPrice = getSpotPrice(currentSupply + sharesReceived, virtualAnchor);

    return {
        sharesReceived,
        startPrice,
        endPrice,
        finalSupply: currentSupply + sharesReceived
    };
}

function calculateImpliedProbability(yesSupply: number, noSupply: number): number {
    const VIRTUAL_FLOOR = 1_000_000; // 1M buffer

    const adjustedYes = yesSupply + VIRTUAL_FLOOR;
    const adjustedNo = noSupply + VIRTUAL_FLOOR;
    const totalSupply = adjustedYes + adjustedNo;

    return (adjustedYes / totalSupply) * 100;
}

console.log("🧪 SIMULACIÓN: Encontrando VIRTUAL_ANCHOR óptimo\n");
console.log("Objetivo: Compra inicial → Probabilidad ~66% (sin explotar a 100%)\n");
console.log("═".repeat(80));

// Probar diferentes valores de VIRTUAL_ANCHOR
const anchorsToTest = [
    1_000_000,    // 1M
    5_000_000,    // 5M
    8_000_000,    // 8M
    10_000_000,   // 10M
    20_000_000,   // 20M
    30_000_000,   // 30M
    50_000_000,   // 50M
    100_000_000,  // 100M
    280_000_000,  // 280M (Pump.fun gap)
];

const buyAmounts = [0.5, 1, 2, 5]; // SOL amounts to test

for (const anchor of anchorsToTest) {
    console.log(`\n📊 VIRTUAL_ANCHOR = ${(anchor / 1_000_000).toFixed(1)}M shares`);
    console.log("─".repeat(80));

    for (const buyAmount of buyAmounts) {
        // Simular: Market nuevo, alguien compra X SOL en YES
        const yesBuy = simulateBuy(buyAmount, 0, anchor);
        const yesSupply = yesBuy.finalSupply;
        const noSupply = 0; // Nadie compra NO

        // Calcular probabilidad
        const probability = calculateImpliedProbability(yesSupply, noSupply);

        // Precio inicial y final
        const priceChange = ((yesBuy.endPrice - yesBuy.startPrice) / yesBuy.startPrice) * 100;

        console.log(`  Compra ${buyAmount} SOL en YES:`);
        console.log(`    → Shares recibidas: ${(yesBuy.sharesReceived / 1_000_000).toFixed(2)}M`);
        console.log(`    → Precio: ${yesBuy.startPrice.toFixed(9)} → ${yesBuy.endPrice.toFixed(9)} SOL (+${priceChange.toFixed(1)}%)`);
        console.log(`    → Probabilidad YES: ${probability.toFixed(2)}% ${probability > 90 ? '⚠️ EXPLOTA' : probability >= 60 && probability <= 70 ? '✅ ÓPTIMO' : ''}`);
    }
}

console.log("\n" + "═".repeat(80));
console.log("\n🎯 RECOMENDACIÓN:");
console.log("Busca el VIRTUAL_ANCHOR donde:");
console.log("  • Compra de 1-2 SOL → Probabilidad ~66%");
console.log("  • NO explota a >90%");
console.log("  • Permite buen pump inicial (precio sube significativamente)");
