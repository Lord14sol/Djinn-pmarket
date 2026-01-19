import { PublicKey } from "@solana/web3.js";

// --- DJINN CURVE V3 HYBRID: "ROBIN HOOD" PROTOCOL ---
// Model: 3-Phase Piecewise Function with C1 Continuity
// Phase 1 (0-90M): Linear Ramp (Community Accumulation)
// Phase 2 (90M-110M): Quadratic Bridge (Accelerated Smoothing)
// Phase 3 (110M+): Aggressive Sigmoid (Viral Ignition)

// --- CONSTANTS ---
export const TOTAL_SUPPLY = 1_000_000_000; // 1 Billion Shares Cap
export const ANCHOR_THRESHOLD = 100_000_000; // 10% Supply (Conceptual Anchor)

// PHASE BOUNDARIES
const PHASE1_END = 90_000_000;    // End of Linear
const PHASE2_START = 90_000_000;  // Start of Quadratic Bridge
const PHASE2_END = 110_000_000;   // End of Quadratic Bridge / Start of Sigmoid
const PHASE3_START = 110_000_000; // Start of Aggressive Sigmoid

// PHASE 1 CONSTANTS (Linear Ramp: 0 -> 90M)
const P_START = 0.000001;   // 0.000001 SOL - Entry Floor
const P_90 = 0.0000027;     // Price at 90M (slightly below P_ANCHOR to leave room for bridge)

// PHASE 2 BRIDGE WILL REACH THIS:
const P_110 = 0.000015;     // Price at 110M (Start of Sigmoid)

// PHASE 3 CONSTANTS (Aggressive Sigmoid: 110M+)
const P_MAX = 0.95;         // Max Price (capped for prediction market sanity)
const K_SIGMOID = 0.00000000047; // Steepness: Calibrated for 150x at 120M ($0.00225)

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

// --- QUADRATIC BRIDGE COEFFICIENTS ---
// We solve for a, b, c such that:
// P(x) = a*x^2 + b*x + c
// Constraints:
// 1) P(PHASE2_START) = P_90
// 2) P(PHASE2_END) = P_110
// 3) P'(PHASE2_START) = m1 (slope of linear at end)
// Where m1 = (P_90 - P_START) / PHASE1_END

const LINEAR_SLOPE = (P_90 - P_START) / PHASE1_END; // m1

// From constraint 3: 2*a*x0 + b = m1, where x0 = PHASE2_START
// From constraint 1 & 2: We have two equations
// Solving the system:
// Let x0 = 90M, x1 = 110M, y0 = P_90, y1 = P_110

function calculateBridgeCoefficients() {
    const x0 = PHASE2_START;
    const x1 = PHASE2_END;
    const y0 = P_90;
    const y1 = P_110;
    const m1 = LINEAR_SLOPE;

    // Using constraints:
    // P(x0) = a*x0^2 + b*x0 + c = y0
    // P(x1) = a*x1^2 + b*x1 + c = y1
    // P'(x0) = 2*a*x0 + b = m1

    // From (3): b = m1 - 2*a*x0
    // Substitute into (1): a*x0^2 + (m1 - 2*a*x0)*x0 + c = y0
    // => a*x0^2 + m1*x0 - 2*a*x0^2 + c = y0
    // => -a*x0^2 + m1*x0 + c = y0
    // => c = y0 + a*x0^2 - m1*x0

    // Substitute b and c into (2):
    // a*x1^2 + (m1 - 2*a*x0)*x1 + (y0 + a*x0^2 - m1*x0) = y1
    // a*x1^2 + m1*x1 - 2*a*x0*x1 + y0 + a*x0^2 - m1*x0 = y1
    // a*(x1^2 - 2*x0*x1 + x0^2) + m1*(x1 - x0) + y0 = y1
    // a*(x1 - x0)^2 = y1 - y0 - m1*(x1 - x0)
    // a = (y1 - y0 - m1*(x1 - x0)) / (x1 - x0)^2

    const dx = x1 - x0;
    const a = (y1 - y0 - m1 * dx) / (dx * dx);
    const b = m1 - 2 * a * x0;
    const c = y0 + a * x0 * x0 - m1 * x0;

    return { a, b, c };
}

const BRIDGE_COEFFS = calculateBridgeCoefficients();

// --- MATH IMPLEMENTATION ---

/**
 * Price Function P(x) - 3-Phase with C1 Continuity
 */
export function getSpotPrice(sharesSupply: number): number {
    if (sharesSupply <= 0) return P_START;

    if (sharesSupply <= PHASE1_END) {
        // PHASE 1: LINEAR RAMP (0 -> 90M)
        return P_START + LINEAR_SLOPE * sharesSupply;
    } else if (sharesSupply <= PHASE2_END) {
        // PHASE 2: QUADRATIC BRIDGE (90M -> 110M)
        const { a, b, c } = BRIDGE_COEFFS;
        return a * sharesSupply * sharesSupply + b * sharesSupply + c;
    } else {
        // PHASE 3: AGGRESSIVE SIGMOID (110M+)
        // P = P_110 + (P_MAX - P_110) * NormalizedSigmoid(x - 110M)
        // NormalizedSigmoid(z) = 1 - 1/(1 + e^(k*z)) = 1 - 1/(1+e^kz)
        // At z=0: 1 - 1/2 = 0.5... that's still a jump!

        // CORRECT APPROACH: Use sigmoid that starts at 0
        // S(z) = 1 / (1 + e^(-k*z)) - 0.5  (shifted)
        // At z=0: 0.5 - 0.5 = 0 ✓
        // At z=inf: 1 - 0.5 = 0.5 (we need to scale by 2)
        // Final: S(z) = 2 * (1/(1 + e^(-k*z)) - 0.5) = (e^(k*z) - 1) / (e^(k*z) + 1) = tanh(k*z/2) for large ranges

        // Simpler: Logistic shifted and scaled
        // S(z) = (1 / (1 + e^(-k*z))) * 2 - 1 for range [-1, 1]
        // We want range [0, 1]: S(z) = 1 / (1 + e^(-k*z)) - 0.5, then *2

        const x_rel = sharesSupply - PHASE3_START;
        const rawSigmoid = 1 / (1 + Math.exp(-K_SIGMOID * x_rel));
        const normalizedSigmoid = (rawSigmoid - 0.5) * 2; // Now 0 at x_rel=0, 1 at x_rel=inf

        // Clamp for numerical stability
        const clampedSigmoid = Math.max(0, Math.min(1, normalizedSigmoid));

        return P_110 + (P_MAX - P_110) * clampedSigmoid;
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
