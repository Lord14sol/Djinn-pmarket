// Encontrar VIRTUAL_ANCHOR que dé mcap inicial ~$3,400 USD (17 SOL @ $200/SOL)

const PHASE1_END = 100_000_000;
const P_START = 0.000001;
const P_50 = 0.000005;
const LINEAR_SLOPE = (P_50 - P_START) / PHASE1_END;

function getSpotPrice(supply: number, anchor: number): number {
    const effectiveSupply = supply + anchor;
    if (effectiveSupply <= PHASE1_END) {
        return P_START + LINEAR_SLOPE * effectiveSupply;
    }
    return P_50;
}

function calculateShares(solAmount: number, currentSupply: number, anchor: number): number {
    const fee = solAmount * 0.01;
    const netSol = solAmount - fee;
    const avgPrice = getSpotPrice(currentSupply + netSol * 500_000, anchor);
    return (netSol / avgPrice) * 0.95;
}

function calculateProbability(yesSupply: number, noSupply: number): number {
    const VIRTUAL_FLOOR = 1_000_000;
    const adjustedYes = yesSupply + VIRTUAL_FLOOR;
    const adjustedNo = noSupply + VIRTUAL_FLOOR;
    return (adjustedYes / (adjustedYes + adjustedNo)) * 100;
}

console.log("🎯 Buscando VIRTUAL_ANCHOR para mcap inicial ~$3,400 USD (17 SOL)\n");

const targetMcap = 17; // SOL
const anchorsToTest = [
    8_000_000,    // 8M
    9_000_000,    // 9M
    10_000_000,   // 10M
    11_000_000,   // 11M
    12_000_000,   // 12M
    13_000_000,   // 13M
    14_000_000,   // 14M
];

for (const anchor of anchorsToTest) {
    const initialPrice = getSpotPrice(0, anchor);
    const initialMcap = initialPrice * anchor;

    // Simular compra de 1 SOL
    const sharesReceived = calculateShares(1, 0, anchor);
    const probability = calculateProbability(sharesReceived, 0);

    const matchMcap = Math.abs(initialMcap - targetMcap) < 2;
    const goodProb = probability >= 63 && probability <= 70;

    console.log(`Anchor: ${(anchor / 1_000_000).toFixed(0)}M`);
    console.log(`  Mcap inicial: ${initialMcap.toFixed(2)} SOL ($${(initialMcap * 200).toFixed(0)} USD) ${matchMcap ? '✅' : ''}`);
    console.log(`  1 SOL → Probabilidad: ${probability.toFixed(1)}% ${goodProb ? '✅' : '❌'}`);
    console.log(`  ${matchMcap && goodProb ? '🎯 PERFECTO!' : ''}\n`);
}
