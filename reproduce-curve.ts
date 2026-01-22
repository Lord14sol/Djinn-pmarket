
// INLINE CORE-AMM LOGIC for debugging
const VIRTUAL_OFFSET = 30_000_000;
const PHASE1_END = 100_000_000;
const PHASE2_END = 200_000_000;
const PHASE3_START = 200_000_000;
const P_START = 0.000001;
const P_50 = 0.000005;
const P_90 = 0.000025;
const P_MAX = 0.95;
const K_SIGMOID = 0.00047;
const TOTAL_SUPPLY = 1_000_000_000;
const LINEAR_SLOPE = (P_50 - P_START) / PHASE1_END;

function getSpotPrice(sharesSupply: number): number {
    const effectiveSupply = sharesSupply + VIRTUAL_OFFSET;
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
        const kz = K_SIGMOID * x_rel;
        const norm_sig = Math.min(1_000_000_000, Math.max(0, kz));
        const price_delta = (P_MAX - P_90) * norm_sig / 1_000_000_000;
        return P_90 + price_delta;
    }
}

function getCostInContract(supplyOld: number, supplyNew: number): number {
    if (supplyNew <= supplyOld) return 0;
    const pOld = getSpotPrice(supplyOld);
    const pNew = getSpotPrice(supplyNew);
    const delta = supplyNew - supplyOld;
    return (pOld + pNew) / 2 * delta;
}

function solveForShares(currentSupply: number, netSolInvested: number): number {
    let low = currentSupply;
    let high = TOTAL_SUPPLY;
    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const cost = getCostInContract(currentSupply, mid);
        if (cost < netSolInvested) {
            low = mid;
        } else {
            high = mid;
        }
        if (high - low < 0.001) break;
    }
    return low - currentSupply;
}

// SIMULATION
console.log("--- DEBUG: 1 SOL BUY ---");

const currentSupply = 0; // New Market
const amountSol = 1.0;
const fee = amountSol * 0.01;
const netSol = amountSol - fee;

const sharesReceived = solveForShares(currentSupply, netSol);
const endPrice = getSpotPrice(currentSupply + sharesReceived);
const mcap = endPrice * (currentSupply + sharesReceived);

console.log(`Supply Start: ${currentSupply}`);
console.log(`Shares Out: ${sharesReceived.toLocaleString()}`);
console.log(`End Price: ${endPrice.toFixed(9)} SOL`);
console.log(`Mcap (Shares * Price): ${mcap.toLocaleString()} SOL`);

// Check "395k SOL" anomaly
// If Mcap is 395,000, and Price is small?
// Or if Price is HIGH? 
console.log(`Check: If Mcap = 395,000 SOL...`);
