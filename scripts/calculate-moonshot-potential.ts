// Calcular potencial de moonshot con VIRTUAL_ANCHOR = 1M

const VIRTUAL_ANCHOR = 1_000_000;
const PHASE1_END = 100_000_000;
const P_START = 0.000001;
const P_50 = 0.000005;
const LINEAR_SLOPE = (P_50 - P_START) / PHASE1_END;

function getSpotPrice(supply: number): number {
    const effectiveSupply = supply + VIRTUAL_ANCHOR;
    if (effectiveSupply <= PHASE1_END) {
        return P_START + LINEAR_SLOPE * effectiveSupply;
    }
    return P_50; // Simplificado
}

console.log("🚀 POTENCIAL DE MOONSHOT con VIRTUAL_ANCHOR = 1M\n");
console.log("═".repeat(80));

// Market inicial (0 liquidez)
const initialSupply = 0;
const initialPrice = getSpotPrice(initialSupply);
const initialMcap = initialPrice * (initialSupply + VIRTUAL_ANCHOR);

console.log("\n📊 MARKET INICIAL (0 liquidez):");
console.log(`  Supply efectiva: ${((initialSupply + VIRTUAL_ANCHOR) / 1_000_000).toFixed(2)}M shares`);
console.log(`  Precio: ${initialPrice.toFixed(9)} SOL/share`);
console.log(`  Market Cap: ${initialMcap.toFixed(4)} SOL ($${(initialMcap * 200).toFixed(2)} USD @ $200/SOL)`);

// Función para calcular shares recibidas (simplificada)
function calculateShares(solAmount: number, currentSupply: number): number {
    const fee = solAmount * 0.01;
    const netSol = solAmount - fee;

    // Aproximación lineal simple
    const avgPrice = getSpotPrice(currentSupply + netSol * 500_000);
    return (netSol / avgPrice) * 0.95; // 5% safety
}

// Alguien compra y recibe shares
const scenarios = [
    { name: "Early Bird (1 SOL)", buyAmount: 1 },
    { name: "Degen (5 SOL)", buyAmount: 5 },
    { name: "Whale (10 SOL)", buyAmount: 10 },
];

console.log("\n" + "─".repeat(80));

let cumulativeSupply = initialSupply;

for (const scenario of scenarios) {
    const { name, buyAmount } = scenario;
    const sharesReceived = calculateShares(buyAmount, cumulativeSupply);
    cumulativeSupply += sharesReceived; // Acumular supply

    const newPrice = getSpotPrice(cumulativeSupply);
    const newMcap = newPrice * (cumulativeSupply + VIRTUAL_ANCHOR);

    const priceMultiplier = newPrice / initialPrice;
    const mcapMultiplier = newMcap / initialMcap;

    console.log(`\n💰 ${name}:`);
    console.log(`  Invierte: ${buyAmount} SOL`);
    console.log(`  Recibe: ${(sharesReceived / 1_000_000).toFixed(2)}M shares`);
    console.log(`  Precio nuevo: ${newPrice.toFixed(9)} SOL/share (${priceMultiplier.toFixed(2)}x)`);
    console.log(`  Market Cap: ${newMcap.toFixed(4)} SOL ($${(newMcap * 200).toFixed(2)} @ $200/SOL)`);
    console.log(`  ${mcapMultiplier.toFixed(2)}x desde inicio`);

    // ¿Cuánto vale su inversión ahora?
    const currentValue = sharesReceived * newPrice;
    const profit = ((currentValue - buyAmount) / buyAmount) * 100;
    console.log(`  Valor actual: ${currentValue.toFixed(4)} SOL (${profit > 0 ? '+' : ''}${profit.toFixed(1)}% profit)`);
}

// ¿Cuánto se necesita invertir para 10x el mcap inicial?
console.log("\n" + "═".repeat(80));
console.log("\n🎯 PARA HACER 10X EL MARKET CAP INICIAL:");

const targetMcap = initialMcap * 10;
console.log(`  Target Market Cap: ${targetMcap.toFixed(4)} SOL ($${(targetMcap * 200).toFixed(2)} USD)`);

// Buscar supply necesario para ese mcap
let testSupply = 0;
let testPrice = 0;
let testMcap = 0;

for (let s = 0; s < 50_000_000; s += 100_000) {
    testPrice = getSpotPrice(s);
    testMcap = testPrice * (s + VIRTUAL_ANCHOR);

    if (testMcap >= targetMcap) {
        testSupply = s;
        break;
    }
}

console.log(`  Supply necesario: ${(testSupply / 1_000_000).toFixed(2)}M shares`);
console.log(`  Precio en ese punto: ${testPrice.toFixed(9)} SOL/share`);
console.log(`  Total SOL en vault: ~${(testSupply * testPrice / 2).toFixed(2)} SOL (aproximado)`);

// ¿Es fácil?
const solNeeded = testSupply * testPrice / 2;
if (solNeeded < 10) {
    console.log(`\n  ✅ MUY FÁCIL: Solo se necesitan ~${solNeeded.toFixed(1)} SOL para 10x`);
} else if (solNeeded < 50) {
    console.log(`\n  ⚡ FACTIBLE: Se necesitan ~${solNeeded.toFixed(1)} SOL para 10x`);
} else {
    console.log(`\n  ⚠️ DIFÍCIL: Se necesitan ~${solNeeded.toFixed(1)} SOL para 10x`);
}

console.log("\n" + "═".repeat(80));
console.log("\n📝 COMPARACIÓN CON PUMP.FUN:");
console.log("  Pump.fun:");
console.log("    • Market cap inicial: $3,000 USD");
console.log("    • 10x → $30,000 USD (requiere ~150 SOL @ $200/SOL)");
console.log("\n  Djinn Market:");
console.log(`    • Market cap inicial: $${(initialMcap * 200).toFixed(2)} USD`);
console.log(`    • 10x → $${(targetMcap * 200).toFixed(2)} USD (requiere ~${solNeeded.toFixed(1)} SOL)`);
