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
const PHASE1_END = 90_000_000;    // 90M
const PHASE2_START = 90_000_000;  // 90M
const PHASE2_END = 110_000_000;   // 110M
const PHASE3_START = 110_000_000; // 110M

// PRICE CONSTANTS (in SOL, matches Lamports conversion in lib.rs)
const P_START = 0.000001;   // 1 nanoSOL (1 Lamport / 1e9)
const P_90 = 0.0000027;     // 2700 nanoSOL
const P_110 = 0.000015;     // 15000 nanoSOL
const P_MAX = 0.95;         // 950M nanoSOL (0.95 SOL cap)

// SIGMOID CALIBRATION: 150x at 120M shares
// Derivation: At x=120M, P(x) = 0.00015 SOL (150x from P_START)
// Solving: 0.00015 = P_110 + (P_MAX - P_110) * sigmoid_norm(k * 10M)
// Result: k = 2.84229e-8 (was 4.7e-10, now 60x STRONGER for true 150x)
const K_SIGMOID = 0.0000000284229; // ← RECALIBRATED FOR 150X

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
        // PHASE 3: LINEAR SIGMOID APPROXIMATION (lib.rs line 95-113)
        // Avoids exp() for gas efficiency: normalized_sigmoid(z) ≈ k * z
        const x_rel = sharesSupply - PHASE3_START;

        // k * x_rel, clamped to [0, 1]
        const kz = K_SIGMOID * x_rel;
        const norm_sig = Math.min(1, Math.max(0, kz));

        // P = P_110 + (P_MAX - P_110) * norm_sig
        const price_delta = (P_MAX - P_110) * norm_sig;
        return P_110 + price_delta;
    }
}

/**
 * Integrated Cost Function - For calculating total SOL spent from 0 to x
 */
function getIntegratedCost(x: number): number {
    if (x <= 0) return 0;

    if (x <= PHASE1_END) {
        // PHASE 1: Linear Integral = P_START*x + (slope/2)*x^2
        return (P_START * x) + (LINEAR_SLOPE * x * x / 2);
    } else if (x <= PHASE2_END) {
        // PHASE 1 full cost + PHASE 2 partial
        const phase1Cost = (P_START * PHASE1_END) + (LINEAR_SLOPE * PHASE1_END * PHASE1_END / 2);

        // Quadratic Integral: ∫(ax^2 + bx + c)dx = (a/3)x^3 + (b/2)x^2 + cx
        const { a, b, c } = BRIDGE_COEFFS;
        const F = (t: number) => (a / 3) * t * t * t + (b / 2) * t * t + c * t;
        const phase2Cost = F(x) - F(PHASE2_START);

        return phase1Cost + phase2Cost;
    } else {
        // PHASE 1 + PHASE 2 full + PHASE 3 partial
        const phase1Cost = (P_START * PHASE1_END) + (LINEAR_SLOPE * PHASE1_END * PHASE1_END / 2);

        const { a, b, c } = BRIDGE_COEFFS;
        const F = (t: number) => (a / 3) * t * t * t + (b / 2) * t * t + c * t;
        const phase2Cost = F(PHASE2_END) - F(PHASE2_START);

        // Phase 3: Numerical approximation (trapezoidal) for sigmoid integral
        const x_rel = x - PHASE3_START;
        const steps = 100;
        const dx = x_rel / steps;
        let phase3Cost = 0;
        for (let i = 0; i < steps; i++) {
            const xLocal = PHASE3_START + i * dx;
            const xNext = PHASE3_START + (i + 1) * dx;
            const pLocal = getSpotPrice(xLocal);
            const pNext = getSpotPrice(xNext);
            phase3Cost += ((pLocal + pNext) / 2) * dx;
        }

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
    if (total <= 0) return 50;
    return (yesMcap / total) * 100;
}

export function getSupplyFromPrice(priceSol: number): number {
    // Inverse of getSpotPrice for UI synchronization
    if (priceSol <= P_START) return 0;

    if (priceSol <= P_90) {
        // PHASE 1: Inverse Linear
        return (priceSol - P_START) / LINEAR_SLOPE;
    } else if (priceSol <= P_110) {
        // PHASE 2: Inverse Quadratic (use Newton-Raphson)
        const { a, b, c } = BRIDGE_COEFFS;
        // Solve ax^2 + bx + (c - price) = 0
        const c_adj = c - priceSol;
        const discriminant = b * b - 4 * a * c_adj;
        if (discriminant < 0) return PHASE2_START;
        const x = (-b + Math.sqrt(discriminant)) / (2 * a);
        return Math.max(PHASE2_START, Math.min(PHASE2_END, x));
    } else {
        // PHASE 3: Inverse Sigmoid
        // P = P_110 + (P_MAX - P_110) * normalized_sigmoid
        // normalized_sigmoid = (P - P_110) / (P_MAX - P_110)
        const norm = (priceSol - P_110) / (P_MAX - P_110);
        if (norm >= 1) return TOTAL_SUPPLY;
        if (norm <= 0) return PHASE3_START;

        // normalized_sigmoid = (rawSig - 0.5) * 2
        // rawSig = norm/2 + 0.5
        const rawSig = norm / 2 + 0.5;
        // rawSig = 1 / (1 + e^(-k*x_rel))
        // 1 + e^(-k*x_rel) = 1/rawSig
        // e^(-k*x_rel) = 1/rawSig - 1
        // -k*x_rel = ln(1/rawSig - 1)
        // x_rel = -ln(1/rawSig - 1) / k

        const term = (1 / rawSig) - 1;
        if (term <= 0) return TOTAL_SUPPLY;
        const x_rel = -Math.log(term) / K_SIGMOID;
        return PHASE3_START + Math.max(0, x_rel);
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
