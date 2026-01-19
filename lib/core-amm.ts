import { PublicKey } from "@solana/web3.js";

// ═══════════════════════════════════════════════════════════════════════════════
// DJINN CURVE V3 HYBRID: "ROBIN HOOD" PROTOCOL
// ⚠️ SYNCHRONIZED WITH SMART CONTRACT (programs/djinn-market/src/lib.rs)
// 3-Phase Piecewise Bonding Curve with Gas-Optimized Approximations
// Phase 1: Linear (0-90M) | Phase 2: Quadratic Bridge (90M-110M) | Phase 3: Sigmoid (110M+)
// ═══════════════════════════════════════════════════════════════════════════════

// --- GLOBAL CONSTANTS (MUST MATCH lib.rs) ---
export const TOTAL_SUPPLY = 1_000_000_000; // 1B Shares
export const ANCHOR_THRESHOLD = 100_000_000; // 100M (10%)

// PHASE BOUNDARIES (Scaled to match Rust: shares * 1e9 on-chain)
export const PHASE1_END = 90_000_000;    // 90M
const PHASE2_START = 90_000_000;  // 90M (internal only)
export const PHASE2_END = 110_000_000;   // 110M
export const PHASE3_START = 110_000_000; // 110M

// PRICE CONSTANTS (in SOL, matches Lamports conversion in lib.rs)
const P_START = 0.000001;   // 1 nanoSOL (1 Lamport / 1e9)
const P_90 = 0.0000027;     // 2700 nanoSOL
const P_110 = 0.000015;     // 15000 nanoSOL
const P_MAX = 0.95;         // 950M nanoSOL (0.95 SOL cap)

// SIGMOID CALIBRATION - ORIGINAL "GRADUAL GROWTH" DESIGN
// ⚠️ LINEAR APPROXIMATION: norm_sig = k * x (not full sigmoid!)
// Philosophy: Long accumulation phase, sustainable growth (~19x at 120M)
// Smart contract: k_scaled = 470 (with shares × 1e9)
// Frontend: k = 4.7e-4 (shares not scaled)
// Derivation: At 120M, kz should be 4700 → k = 4700 / 10M = 0.00047
const K_SIGMOID = 0.00047; // 4.7e-4 - Original gradual curve

// LEGACY/COMPATIBILITY
export const TOTAL_SUPPLY_CHAINHEAD = TOTAL_SUPPLY;
export const VIRTUAL_OFFSET = 0;
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

// --- LINEAR SLOPE (Phase 1) ---
const LINEAR_SLOPE = (P_90 - P_START) / PHASE1_END;

// ═══════════════════════════════════════════════════════════════════════════════
// CURVE MATH (SYNCHRONIZED WITH lib.rs)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate spot price at given supply
 * ⚠️ MATCHES smart contract calculate_spot_price() exactly
 */
export function getSpotPrice(sharesSupply: number): number {
    if (sharesSupply <= 0) return P_START;

    if (sharesSupply <= PHASE1_END) {
        // PHASE 1: LINEAR RAMP (lib.rs line 60-64)
        // P = P_START + (slope * supply)
        return P_START + LINEAR_SLOPE * sharesSupply;

    } else if (sharesSupply <= PHASE2_END) {
        // PHASE 2: SIMPLIFIED QUADRATIC BRIDGE (lib.rs line 77-92)
        // Gas-optimized approximation: P = P_90 + (P_110 - P_90) * t²
        // where t = progress / range
        const progress = sharesSupply - PHASE1_END;
        const range = PHASE2_END - PHASE1_END; // 20M

        // Quadratic acceleration: faster near the end
        const ratio = progress / range; // 0 to 1
        const ratio_sq = ratio * ratio;

        const price_delta = (P_110 - P_90) * ratio_sq;
        return P_90 + price_delta;

    } else {
        // PHASE 3: LINEAR SIGMOID APPROXIMATION (lib.rs line 98-117)
        // EXACT MATCH with smart contract scaling
        const x_rel = sharesSupply - PHASE3_START;

        // k * x_rel (scaled)
        // In contract: kz = (K_SIGMOID_SCALED * x_rel_scaled) / K_SCALE_FACTOR
        // Here: x_rel is in shares (not scaled), so we compute kz directly
        const kz = K_SIGMOID * x_rel;

        // Clamp to [0, 1e9] (contract line 112)
        const norm_sig = Math.min(1_000_000_000, Math.max(0, kz));

        // P = P_110 + (P_MAX - P_110) * norm_sig / 1e9 (contract line 115)
        const price_delta = (P_MAX - P_110) * norm_sig / 1_000_000_000;
        return P_110 + price_delta;
    }
}

/**
 * Integrated Cost Function - Total SOL to buy from 0 to x shares
 * ⚠️ MATCHES smart contract calculate_cost() logic
 */
function getIntegratedCost(x: number): number {
    if (x <= 0) return 0;

    if (x <= PHASE1_END) {
        // PHASE 1: ∫(P_START + m*s)ds = P_START*x + (m/2)*x²
        return P_START * x + (LINEAR_SLOPE / 2) * x * x;

    } else if (x <= PHASE2_END) {
        // PHASE 1 full cost
        const phase1Cost = P_START * PHASE1_END + (LINEAR_SLOPE / 2) * PHASE1_END * PHASE1_END;

        // PHASE 2: ∫[P_90 + (P_110 - P_90) * ((s - 90M) / 20M)²]ds
        // Let u = s - 90M, range = 20M
        // = P_90 * u + (P_110 - P_90) * u³ / (3 * range²)
        const progress = x - PHASE1_END;
        const range = PHASE2_END - PHASE1_END;
        const phase2Cost = P_90 * progress + (P_110 - P_90) * (progress ** 3) / (3 * range * range);

        return phase1Cost + phase2Cost;

    } else {
        // PHASE 1 + PHASE 2 full
        const phase1Cost = P_START * PHASE1_END + (LINEAR_SLOPE / 2) * PHASE1_END * PHASE1_END;

        const fullRange = PHASE2_END - PHASE1_END;
        const phase2Cost = P_90 * fullRange + (P_110 - P_90) * (fullRange ** 3) / (3 * fullRange * fullRange);

        // PHASE 3: ∫[P_110 + (P_MAX - P_110) * k * (s - 110M) / 1e9]ds
        // = P_110 * u + (P_MAX - P_110) * k * u² / (2 * 1e9)
        const x_rel = x - PHASE3_START;
        const phase3Cost = P_110 * x_rel + (P_MAX - P_110) * K_SIGMOID * (x_rel ** 2) / (2 * 1_000_000_000);

        return phase1Cost + phase2Cost + phase3Cost;
    }
}

/**
 * Newton-Raphson Solver for Shares from SOL
 */
function solveForShares(currentSupply: number, netSolInvested: number): number {
    const startCost = getIntegratedCost(currentSupply);
    const targetCostTotal = startCost + netSolInvested;

    const pCurrent = getSpotPrice(currentSupply);
    let guessShares = netSolInvested / Math.max(pCurrent, P_START * 10);

    const remaining = TOTAL_SUPPLY - currentSupply;
    if (guessShares > remaining) guessShares = remaining;

    let x = currentSupply + guessShares;
    if (x > TOTAL_SUPPLY) x = TOTAL_SUPPLY;

    for (let i = 0; i < 25; i++) {
        const costAtX = getIntegratedCost(x);
        const error = costAtX - targetCostTotal;
        if (Math.abs(error) < 0.00000001) break;

        const priceAtX = getSpotPrice(x);
        if (priceAtX <= 0) break;
        x = x - (error / priceAtX);

        if (x < currentSupply) x = currentSupply;
        if (x > TOTAL_SUPPLY) x = TOTAL_SUPPLY;
    }
    return x - currentSupply;
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

    if (priceSol <= P_90) {
        // PHASE 1 INVERSE: P = P_START + m*x → x = (P - P_START) / m
        return (priceSol - P_START) / LINEAR_SLOPE;

    } else if (priceSol <= P_110) {
        // PHASE 2 INVERSE: P = P_90 + (P_110 - P_90) * t²
        // t² = (P - P_90) / (P_110 - P_90)
        // t = sqrt(...)
        // x = 90M + t * 20M
        const ratio_sq = (priceSol - P_90) / (P_110 - P_90);
        const ratio = Math.sqrt(Math.max(0, ratio_sq));
        const range = PHASE2_END - PHASE1_END;
        return PHASE1_END + ratio * range;

    } else {
        // PHASE 3 INVERSE: P = P_110 + (P_MAX - P_110) * k * x_rel / 1e9
        // x_rel = (P - P_110) * 1e9 / ((P_MAX - P_110) * k)
        const price_delta = priceSol - P_110;
        if (price_delta >= (P_MAX - P_110)) return TOTAL_SUPPLY;
        if (price_delta <= 0) return PHASE3_START;

        // norm_sig = price_delta / (P_MAX - P_110)
        // x_rel = norm_sig * 1e9 / k
        const norm_sig = price_delta / (P_MAX - P_110);
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
