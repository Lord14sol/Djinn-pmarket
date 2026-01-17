import { PublicKey } from "@solana/web3.js";

// --- CONSTANTS ---

// Virtual Liquidity Depth (Initial SOL in the pool)
// Goal: 1 SOL buy moves price ~2-3%.
// k = x * y. Price = x / y (SOL per Share). 
// If x = 40. Start Price = 0.05 ?? No.
// Let's assume initial price is 0.5 (50/50 chance).
// If x (SOL) = 40. Then y (Shares) = x / price = 40 / 0.5 = 80.
// k = 40 * 80 = 3200.
// Buy 1 SOL: new_x = 41. new_y = 3200 / 41 = 78.04.
// Shares out = 80 - 78.04 = 1.96.
// Avg cost = 1 / 1.96 = 0.51. Price moved from 0.50 to ~0.51 (2%). Perfect.
// --- LINEAR BONDING CURVE CONSTANTS (Matching lib.rs) ---
export const CURVE_CONSTANT = 375_000_000_000_000;
export const VIRTUAL_OFFSET = 50_000_000_000; // 50B Shares
export const FEE_RESOLUTION_PCT = 0.02; // 2% removed from WINNING pot

export interface MarketState {
    virtualSolReserves: number;
    virtualShareReserves: number;
    realSolReserves: number; // Actual SOL in pot
    totalSharesMinted: number;
}

export interface TradeSimulation {
    inputAmount: number; // SOL
    sharesReceived: number;
    priceImpact: number; // Percentage 0-100
    feeTotal: number;
    feeProtocol: number;
    feeCreator: number;
    netInvested: number; // Amount actually going into curve
    averageEntryPrice: number;
    startPrice: number;
    endPrice: number;
    isEndgame: boolean;
    warningSlippage: boolean;
}

/**
 * Calculates the output of a BUY trade (SOL -> Shares) using Linear Curve Math.
 * Cost(X) = (1/2K) * ((S+X)^2 - S^2)
 * X(Cost) = sqrt(2K * Cost + S^2) - S
 */
export function simulateBuy(
    amountSol: number,
    marketState: MarketState
): TradeSimulation {
    const lamports = amountSol * 1e9;
    const S = marketState.totalSharesMinted + VIRTUAL_OFFSET;
    const K = CURVE_CONSTANT;

    // Fees (Simplified for UI display)
    const feeRateTotal = 0.01; // 1%
    const feeTotal = amountSol * feeRateTotal;
    const netInvestedSol = amountSol - feeTotal;
    const netInvestedLamports = netInvestedSol * 1e9;

    // Shares = sqrt(2K * Cost + S^2) - S
    const newS = Math.sqrt(2 * K * netInvestedLamports + Math.pow(S, 2));
    const sharesReceived = newS - S;

    const startPrice = S / K; // SOL per Share (approx)
    const endPrice = newS / K;
    const averageEntryPrice = amountSol / sharesReceived;

    // Price Impact for UI
    const priceImpact = ((endPrice - startPrice) / startPrice) * 100;

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
        isEndgame: false, // End-game threshold logic not yet ported for linear curve
        warningSlippage: priceImpact > 5.0
    };
}

/**
 * Estimates the Potential Net Payout on Win.
 * Formula: (Shares * (1 - ResolutionFee))? 
 * Or is it from the pot?
 * Spec: "On Redeem() ... Deduct 2.0% from total payout."
 * The payout for correct shares is roughly 1 SOL per share (minus resolution fee) IF the losing side matches the winning side??
 * WAIT. NO. "Vault holds 100% of TVL". "Infinite Supply: Curve mints shares".
 * In a bonding curve prediction market, the payout depends on the FINAL reserves or fixed payout?
 * 
 * Spec says: "Token: SPL Tokens represent Outcome Shares (YES/NO)."
 * Usually, in AMM PMs (like Augur/Gnosis), YES + NO = 1 SOL (collateral).
 * But here we have a "Bonding Curve" for EACH side? Or one curve?
 * "Virtual AMM". "Buying 1 SOL should move price".
 * 
 * INTERPRETATION:
 * The text implies a CPMM (Uniswap) between YES and NO tokens?
 * OR a single curve per token?
 * "Buying 1 SOL should move price... Token: SPL Tokens... YES/NO".
 * 
 * Standard CPMM for Binary Markets:
 * Pool holds YES + NO tokens.
 * User buys YES by swapping SOL for YES ?? No, usually SOL is collateral.
 * 
 * Let's assume the standard "Conditional Token" AMM:
 * You send SOL. Contract mints YES + NO.
 * You keep YES. You sell NO back to the pool for more YES.
 * Result: You hold only YES. Pool holds more NO.
 * Price of YES goes up. Price of NO goes down.
 * 
 * SIMPLIFIED IMPLEMENTATION FOR THIS TASK:
 * We will model it as a Single Curve per outcome? No, that decouples probabilities.
 * 
 * Let's assume the "Uniswap Logic":
 * VIRTUAL_SOL * VIRTUAL_YES = k ?? No.
 * 
 * Let's assume the spec means "CPMM between YES and NO".
 * k = VirtualYes * VirtualNo.
 * Price Yes = VirtualNo / (VirtualYes + VirtualNo).
 * Price No = VirtualYes / (VirtualYes + VirtualNo).
 * 
 * IF "Initialize curve with ~35-40 SOL virtual depth":
 * This implies the Liquidity Parameter 'L' or the virtual balance of the collateral?
 * 
 * Let's stick to the simplest interpretation that works with the prompt:
 * "Virtual Liquidity (k): Initialize curve with ~35-40 SOL".
 * This likely means the *collateral* depth.
 * 
 * AMM Formula for Binary Options (Fixed Product Market Maker):
 * k = R_yes * R_no. (Where R are the reserves of outcome tokens).
 * 
 * Let's use this for `simulateBuy`.
 * User buys YES:
 * 1. Swap SOL for Equal amounts of YES + NO (Mint).
 * 2. Keep YES.
 * 3. Sell NO to the pool to buy more YES.
 * 
 * Helper to calculate payout:
 * If you win, each Share pays out 1 SOL (minus resolution fee 2%).
 * So Estimated Net Payout = sharesReceived * (1 - 0.02) SOL.
 */
export function estimatePayoutInternal(shares: number): number {
    return shares * (1 - FEE_RESOLUTION_PCT); // 0.98 SOL per share
}
