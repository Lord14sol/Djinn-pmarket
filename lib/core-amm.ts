import { PublicKey } from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════════════════════
// DJINN CURVE V4 AGGRESSIVE: "EARLY BIRD REWARDS"
// ⚠️ SYNCHRONIZED WITH SMART CONTRACT (programs/djinn-market/src/lib.rs)
// 3-Phase Piecewise Bonding Curve with Progressive Gains
// Phase 1: Linear (0-50M → 6x) | Phase 2: Quadratic (50M-90M → 15x) | Phase 3: Sigmoid (90M+)
// Progressive: 10M=2x, 20M=3x, 30M=4x, 40M=5x, 50M=6x
// ═══════════════════════════════════════════════════════════════════════════════

// --- GLOBAL CONSTANTS (MUST MATCH lib.rs) ---
export const TOTAL_SUPPLY = 1_000_000_000; // 1B Shares
export const VIRTUAL_OFFSET = 20_000_000;   // 20M Shares "Virtual Support"

// PHASE BOUNDARIES (Shares)
export const PHASE1_END = 100_000_000;    // 100M
export const PHASE2_END = 200_000_000;    // 200M
export const PHASE3_START = 200_000_000;

// PRICE CONSTANTS (in SOL, matches Lamports conversion in lib.rs)
const P_START = 0.0000001;     // 100 lamports
const P_50 = 0.000005;         // 5000 lamports
const P_90 = 0.000025;         // 25000 lamports
const P_MAX = 0.95;            // 950M nanoSOL (0.95 SOL cap)


// SIGMOID CALIBRATION - ORIGINAL "GRADUAL GROWTH" DESIGN
// ⚠️ LINEAR APPROXIMATION: norm_sig = k * x (not full sigmoid!)
// Philosophy: Long accumulation phase, sustainable growth (~19x at 120M)
// Smart contract: k_scaled = 470 (with shares × 1e9)
// Frontend: k = 4.7e-4 (shares not scaled)
// Derivation: At 120M, kz should be 4700 → k = 4700 / 10M = 0.00047
const K_SIGMOID = 0.00047; // 4.7e-4 - Original gradual curve

// LEGACY/COMPATIBILITY
export const TOTAL_SUPPLY_CHAINHEAD = TOTAL_SUPPLY;
export const FEE_RESOLUTION_PCT = 0.02;
export const CURVE_CONSTANT = 375_000_000_000_000;


// --- TYPES ---
export interface MarketState {
    virtualSolReserves: number;
    virtualShareReserves: number;
    realSolReserves: number;
    totalSharesMinted: number;
}

export interface TradeSimulation {
    inputAmount: number;
    sharesReceived: number;
    priceImpact: number;
    feeTotal: number;
    feeProtocol: number;
    feeCreator: number;
    netInvested: number;
    averageEntryPrice: number;
    startPrice: number;
    endPrice: number;
    isEndgame: boolean;
    warningSlippage: boolean;
    currentMcap: number;
    ignitionProgress: number;
    isViralMode: boolean;
}

// --- IGNITION HELPER ---
export type IgnitionStatus = 'ACCUMULATION' | 'BREAKING' | 'VIRAL';

export function getIgnitionStatus(supply: number): IgnitionStatus {
    if (supply >= PHASE3_START) return 'VIRAL';
    if (supply >= PHASE1_END) return 'BREAKING'; // In the bridge zone
    return 'ACCUMULATION';
}

export function getIgnitionProgress(supply: number): number {
    // Returns 0-100 representing progress to VIRAL mode (110M threshold)
    return Math.min(100, (supply / PHASE3_START) * 100);
}

// --- LINEAR SLOPE (Phase 1: 0 → 50M, achieves 6x) ---
const LINEAR_SLOPE = (P_50 - P_START) / PHASE1_END;

// ═══════════════════════════════════════════════════════════════════════════════
// CURVE MATH (SYNCHRONIZED WITH lib.rs)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate spot price at given supply
 * ⚠️ MATCHES smart contract calculate_spot_price() exactly
 */
export function getSpotPrice(sharesSupply: number): number {
    // VIRTUAL ANCHOR: We add this to make the curve start at a stable point
    const effectiveSupply = sharesSupply + VIRTUAL_OFFSET;

    if (effectiveSupply <= PHASE1_END) {
        // PHASE 1: LINEAR RAMP
        return P_START + LINEAR_SLOPE * effectiveSupply;
    } else if (effectiveSupply <= PHASE2_END) {
        // PHASE 2: QUADRATIC BRIDGE
        const progress = effectiveSupply - PHASE1_END;
        const range = PHASE2_END - PHASE1_END;
        const ratio = progress / range;
        const ratio_sq = ratio * ratio;
        const price_delta = (P_90 - P_50) * ratio_sq;
        return P_50 + price_delta;
    } else {
        // PHASE 3: SIGMOID
        const x_rel = effectiveSupply - PHASE3_START;
        const kz = K_SIGMOID * x_rel;
        const norm_sig = Math.min(1_000_000_000, Math.max(0, kz));
        const price_delta = (P_MAX - P_90) * norm_sig / 1_000_000_000;
        return P_90 + price_delta;
    }
}


/**
 * Integrated Cost Function - Total SOL to buy from 0 to x shares
 * ⚠️ MATCHES smart contract calculate_cost() logic
 * We use trapezoidal approximation (Contract Method) for exact match
 */
function getCostInContract(supplyOld: number, supplyNew: number): number {
    if (supplyNew <= supplyOld) return 0;
    const pOld = getSpotPrice(supplyOld);
    const pNew = getSpotPrice(supplyNew);
    const delta = supplyNew - supplyOld;
    return (pOld + pNew) / 2 * delta;
}


/**
 * Binary Search Solver for Shares from SOL (Matches Contract)
 */
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


// --- EXPORTED SIMULATION ---

export function simulateBuy(
    amountSol: number,
    marketState: MarketState
): TradeSimulation {
    const currentShareSupply = marketState.totalSharesMinted;

    // Fees (1% total)
    const feeRateTotal = 0.01;
    const feeTotal = amountSol * feeRateTotal;
    const netInvestedSol = amountSol - feeTotal;

    const sharesReceived = solveForShares(currentShareSupply, netInvestedSol);

    const startPrice = getSpotPrice(currentShareSupply);
    const endPrice = getSpotPrice(currentShareSupply + sharesReceived);
    const averageEntryPrice = sharesReceived > 0 ? amountSol / sharesReceived : 0;

    const finalSupply = currentShareSupply + sharesReceived;
    const currentMcap = endPrice * finalSupply;
    const priceImpact = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

    return {
        inputAmount: amountSol,
        sharesReceived,
        priceImpact,
        feeTotal,
        feeProtocol: feeTotal * 0.5,
        feeCreator: feeTotal * 0.5,
        netInvested: netInvestedSol,
        averageEntryPrice,
        startPrice,
        endPrice,
        isEndgame: finalSupply > (TOTAL_SUPPLY * 0.95),
        warningSlippage: priceImpact > 15.0,
        currentMcap,
        ignitionProgress: getIgnitionProgress(finalSupply),
        isViralMode: finalSupply >= PHASE3_START
    };
}

// --- UTILITY FUNCTIONS ---

export function calculateImpliedProbability(yesMcap: number, noMcap: number): number {
    const total = yesMcap + noMcap;
    if (total <= 0) return 50; // No bets yet, 50/50
    if (noMcap === 0) return 100; // All YES, 100% probability
    if (yesMcap === 0) return 0;  // All NO, 0% probability
    return (yesMcap / total) * 100;
}

/**
 * Inverse function: Given a price, return the supply
 * Used for UI price synchronization
 */
export function getSupplyFromPrice(priceSol: number): number {
    if (priceSol <= P_START) return 0;

    if (priceSol <= P_50) {
        // PHASE 1 INVERSE: P = P_START + m*x → x = (P - P_START) / m
        return (priceSol - P_START) / LINEAR_SLOPE;

    } else if (priceSol <= P_90) {
        // PHASE 2 INVERSE: P = P_50 + (P_90 - P_50) * t²
        // t² = (P - P_50) / (P_90 - P_50)
        // t = sqrt(...)
        // x = 50M + t * 40M
        const ratio_sq = (priceSol - P_50) / (P_90 - P_50);
        const ratio = Math.sqrt(Math.max(0, ratio_sq));
        const range = PHASE2_END - PHASE1_END;
        return PHASE1_END + ratio * range;

    } else {
        // PHASE 3 INVERSE: P = P_90 + (P_MAX - P_90) * k * x_rel / 1e9
        const price_delta = priceSol - P_90;
        if (price_delta >= (P_MAX - P_90)) return TOTAL_SUPPLY;
        if (price_delta <= 0) return PHASE3_START;

        // norm_sig = price_delta / (P_MAX - P_90)
        // x_rel = norm_sig * 1e9 / k
        const norm_sig = price_delta / (P_MAX - P_90);
        const x_rel = norm_sig * 1_000_000_000 / K_SIGMOID;
        return PHASE3_START + Math.min(x_rel, TOTAL_SUPPLY - PHASE3_START);
    }
}

export function estimatePayoutInternal(shares: number): number {
    return shares * (1 - FEE_RESOLUTION_PCT);
}

// --- DEBUG HELPERS ---
export function debugCurvePoints(): { supply: number; price: number; phase: string }[] {
    const points = [];
    const testSupplies = [
        0, 10_000_000, 50_000_000, 80_000_000, 89_000_000, 90_000_000, // Phase 1
        95_000_000, 100_000_000, 105_000_000, 110_000_000,              // Phase 2 Bridge
        120_000_000, 200_000_000, 500_000_000, 800_000_000, 1_000_000_000 // Phase 3
    ];

    for (const s of testSupplies) {
        let phase = 'LINEAR';
        if (s > PHASE1_END && s <= PHASE2_END) phase = 'BRIDGE';
        if (s > PHASE2_END) phase = 'SIGMOID';

        points.push({
            supply: s,
            price: getSpotPrice(s),
            phase
        });
    }
    return points;
}
