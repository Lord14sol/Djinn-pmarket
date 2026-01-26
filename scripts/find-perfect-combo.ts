// Encontrar combinación perfecta de VIRTUAL_ANCHOR + VIRTUAL_FLOOR

const PHASE1_END = 100_000_000;
const P_START = 0.000001;
const P_50 = 0.000005;
const LINEAR_SLOPE = (P_50 - P_START) / PHASE1_END;

function getSpotPrice(supply: number, anchor: number): number {
    const effectiveSupply = supply + anchor;
    return P_START + LINEAR_SLOPE * effectiveSupply;
}

function calculateShares(solAmount: number, currentSupply: number, anchor: number): number {
    const fee = solAmount * 0.01;
    const netSol = solAmount - fee;
    const avgPrice = getSpotPrice(currentSupply + netSol * 500_000, anchor);
    return (netSol / avgPrice) * 0.95;
}

function calculateProbability(yesSupply: number, noSupply: number, virtualFloor: number): number {
    const adjustedYes = yesSupply + virtualFloor;
    const adjustedNo = noSupply + virtualFloor;
    return (adjustedYes / (adjustedYes + adjustedNo)) * 100;
}

console.log("🎯 COMBINACIÓN PERFECTA: Mcap $3.4K + Probabilidad 66%\n");

const targetMcap = 17; // SOL ($3,400 USD @ $200/SOL)
const targetProb = 66;

// Anchors que dan mcap cercano a $3.4K
const candidates = [
    { anchor: 11_000_000, name: "11M" },
    { anchor: 12_000_000, name: "12M" },
];

// Virtual floors a probar
const floors = [500_000, 550_000, 600_000, 650_000, 700_000];

for (const { anchor, name } of candidates) {
    const initialPrice = getSpotPrice(0, anchor);
    const initialMcap = initialPrice * anchor;
    const sharesReceived = calculateShares(1, 0, anchor);

    console.log(`\n${"═".repeat(60)}`);
    console.log(`ANCHOR: ${name} → Mcap: ${initialMcap.toFixed(2)} SOL ($${(initialMcap * 200).toFixed(0)} USD)`);
    console.log(`Shares con 1 SOL: ${(sharesReceived / 1_000_000).toFixed(2)}M`);
    console.log(`${"─".repeat(60)}`);

    for (const floor of floors) {
        const prob = calculateProbability(sharesReceived, 0, floor);
        const perfectProb = Math.abs(prob - targetProb) < 2;

        console.log(`  VIRTUAL_FLOOR: ${(floor / 1_000_000).toFixed(2)}M → Probabilidad: ${prob.toFixed(1)}% ${perfectProb ? "✅" : ""}`);
    }
}

console.log("\n" + "═".repeat(60));
