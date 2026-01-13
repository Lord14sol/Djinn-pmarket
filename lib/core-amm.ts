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
export const INITIAL_VIRTUAL_SOL = 40;
export const INITIAL_PROBABILITY = 0.5;

// Fee Schedule
export const FEE_CREATION_SOL = 0.05;
export const FEE_RESOLUTION_PCT = 0.02; // 2% removed from WINNING pot

// Trading Fees
// Trading Fees
export const FEE_STANDARD_TOTAL = 0.010; // 1.0% (Blueprint)
export const FEE_STANDARD_PROTOCOL = 0.005; // 0.5%
export const FEE_STANDARD_CREATOR = 0.005; // 0.5%

export const FEE_ENDGAME_TOTAL = 0.001; // 0.1%
export const FEE_ENDGAME_PROTOCOL = 0.001;
export const FEE_ENDGAME_CREATOR = 0.000;

export const ENDGAME_PRICE_THRESHOLD = 0.95; // > 95 cents

// --- TYPES ---

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

// --- FUNCTIONS ---

/**
 * Calculates the output of a BUY trade (SOL -> Shares).
 */
export function simulateBuy(
    amountSol: number,
    marketState: MarketState
): TradeSimulation {
    const { virtualSolReserves, virtualShareReserves } = marketState;
    const k = virtualSolReserves * virtualShareReserves;
    const startPrice = virtualSolReserves / virtualShareReserves; // Approximate unit price

    // 1. Determine Fees based on current price
    // Note: Technically fees should be dynamic *during* the trade if it crosses threshold,
    // but for MVP we use the START price or AVERAGE price. 
    // Spec says: "IF Share Price < 0.95". Let's use Start Price for simplicity.
    const isEndgame = startPrice >= ENDGAME_PRICE_THRESHOLD;

    const feeRateTotal = isEndgame ? FEE_ENDGAME_TOTAL : FEE_STANDARD_TOTAL;
    const feeRateProtocol = isEndgame ? FEE_ENDGAME_PROTOCOL : FEE_STANDARD_PROTOCOL;
    const feeRateCreator = isEndgame ? FEE_ENDGAME_CREATOR : FEE_STANDARD_CREATOR;

    const feeTotal = amountSol * feeRateTotal;
    const feeProtocol = amountSol * feeRateProtocol;
    const feeCreator = amountSol * feeRateCreator;

    const netInvested = amountSol - feeTotal;

    // 2. Bonding Curve Math (x * y = k)
    // new_x = x + net_invested
    // new_y = k / new_x
    // shares_out = y - new_y

    const newVirtualSol = virtualSolReserves + netInvested;
    const newVirtualShares = k / newVirtualSol;
    const sharesReceived = virtualShareReserves - newVirtualShares;

    // 3. Derived Stats
    const endPrice = newVirtualSol / newVirtualShares; // Instantaneous price after trade
    const averageEntryPrice = amountSol / sharesReceived; // Actual cost per share including fees

    // Price Impact = (EndPrice - StartPrice) / StartPrice
    // Or closer to Uniswap: (MarketPrice - ExecutionPrice) / MarketPrice ? 
    // Let's use simple % movement.
    const priceImpact = ((endPrice - startPrice) / startPrice) * 100;

    return {
        inputAmount: amountSol,
        sharesReceived,
        priceImpact,
        feeTotal,
        feeProtocol,
        feeCreator,
        netInvested,
        averageEntryPrice,
        startPrice,
        endPrice,
        isEndgame,
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
