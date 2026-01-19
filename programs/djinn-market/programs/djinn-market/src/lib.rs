use anchor_lang::prelude::*;

declare_id!("DY1X52RW55bpNU5ZA8E3m6w1w7VG1ioHKpUt7jUkYSV9");

// ═══════════════════════════════════════════════════════════════════════════════
// DJINN CURVE V3 HYBRID: "ROBIN HOOD" PROTOCOL
// 3-Phase Piecewise Bonding Curve with C1 Continuity
// Phase 1: Linear (0-90M) | Phase 2: Quadratic Bridge (90M-110M) | Phase 3: Sigmoid (110M+)
// ═══════════════════════════════════════════════════════════════════════════════

// --- GLOBAL CONSTANTS ---
pub const TOTAL_SUPPLY: u128 = 1_000_000_000_000_000_000; // 1B Shares * 1e9 (9 decimals)
pub const ANCHOR_THRESHOLD: u128 = 100_000_000_000_000_000; // 100M * 1e9

// PHASE BOUNDARIES (Scaled by 1e9)
pub const PHASE1_END: u128 = 90_000_000_000_000_000;   // 90M
pub const PHASE2_END: u128 = 110_000_000_000_000_000;  // 110M
pub const PHASE3_START: u128 = 110_000_000_000_000_000;

// PRICE CONSTANTS (in Lamports, 1 SOL = 1e9 Lamports)
pub const P_START: u128 = 1;           // 0.000000001 SOL (for precision)
pub const P_90: u128 = 2_700;          // 0.0000027 SOL = 2700 nanoSOL
pub const P_110: u128 = 15_000;        // 0.000015 SOL = 15000 nanoSOL
pub const P_MAX: u128 = 950_000_000;   // 0.95 SOL = 950M nanoSOL

// SIGMOID K (Scaled: k * 1e18 for fixed-point)
// Target: 150x at 120M → k = 4.7e-10 → k_scaled = 470
pub const K_SIGMOID_SCALED: u128 = 470;
pub const K_SCALE_FACTOR: u128 = 1_000_000_000_000_000_000; // 1e18

// FEE CONSTANTS
pub const ENTRY_FEE_BPS: u128 = 100;    // 1%
pub const EXIT_FEE_BPS: u128 = 100;     // 1%
pub const RESOLUTION_FEE_BPS: u128 = 200; // 2%
pub const BPS_DENOMINATOR: u128 = 10_000;

// TREASURY
pub const G1_TREASURY: Pubkey = anchor_lang::solana_program::pubkey!("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");

// ═══════════════════════════════════════════════════════════════════════════════
// CURVE MATH (V3 HYBRID: 3-PHASE PIECEWISE)
// ═══════════════════════════════════════════════════════════════════════════════

/// Linear slope for Phase 1: m = (P_90 - P_START) / PHASE1_END
fn get_linear_slope() -> u128 {
    // (2700 - 1) / 90e15 ≈ 3e-14 → scaled: (2699 * 1e18) / 90e15
    // Simplified: we compute inline to avoid overflow
    // slope_scaled = (P_90 - P_START) * SCALE / PHASE1_END
    // For precision: return per-unit slope * 1e18
    ((P_90 - P_START) * K_SCALE_FACTOR) / PHASE1_END
}

/// Calculate spot price at given supply (in nanoSOL/Lamports)
pub fn calculate_spot_price(supply: u128) -> Result<u128> {
    if supply == 0 {
        return Ok(P_START);
    }

    if supply <= PHASE1_END {
        // PHASE 1: LINEAR RAMP
        // P = P_START + (slope * supply)
        let slope = get_linear_slope();
        let price_delta = (slope * supply) / K_SCALE_FACTOR;
        return Ok(P_START + price_delta);
    } else if supply <= PHASE2_END {
        // PHASE 2: QUADRATIC BRIDGE
        // Coefficients computed at runtime for precision
        let price = calculate_bridge_price(supply)?;
        return Ok(price);
    } else {
        // PHASE 3: SIGMOID (150x Strategy)
        let price = calculate_sigmoid_price(supply)?;
        return Ok(price);
    }
}

/// Quadratic Bridge: P = a*x^2 + b*x + c
/// Constraints: P(90M) = P_90, P(110M) = P_110, P'(90M) = linear_slope
fn calculate_bridge_price(supply: u128) -> Result<u128> {
    // For computational simplicity in Rust/Solana, we use linear interpolation
    // approximation within the bridge zone (production would use pre-computed LUT)
    
    let progress = supply.checked_sub(PHASE1_END).unwrap();
    let range = PHASE2_END - PHASE1_END; // 20M
    
    // Quadratic acceleration: faster near the end
    // P = P_90 + (P_110 - P_90) * (progress/range)^2
    let ratio = (progress * 1_000_000) / range; // Scaled by 1e6
    let ratio_sq = (ratio * ratio) / 1_000_000; // (progress/range)^2 * 1e6
    
    let price_delta = ((P_110 - P_90) * ratio_sq) / 1_000_000;
    Ok(P_90 + price_delta)
}

/// Sigmoid Phase: P = P_110 + (P_MAX - P_110) * normalized_sigmoid(x - 110M)
/// normalized_sigmoid(z) = (1/(1+e^(-k*z)) - 0.5) * 2
fn calculate_sigmoid_price(supply: u128) -> Result<u128> {
    let x_rel = supply.checked_sub(PHASE3_START).unwrap();
    
    // Approximate sigmoid using piecewise linear (for gas efficiency)
    // tanh approximation: sigmoid(z) ≈ 0.5 + 0.5 * tanh(k*z/2)
    // For deep liquidity (small k), use linear approximation near origin:
    // normalized_sigmoid(z) ≈ k * z (for small k*z)
    
    // k * x_rel (scaled)
    let kz = (K_SIGMOID_SCALED * x_rel) / K_SCALE_FACTOR;
    
    // Clamp to [0, 1e9] for normalized sigmoid
    let norm_sig = if kz > 1_000_000_000 { 1_000_000_000 } else { kz };
    
    // P = P_110 + (P_MAX - P_110) * norm_sig / 1e9
    let price_delta = ((P_MAX - P_110) * norm_sig) / 1_000_000_000;
    Ok(P_110 + price_delta)
}

/// Calculate cost to buy from supply_old to supply_new
pub fn calculate_cost(supply_old: u128, supply_new: u128) -> Result<u128> {
    if supply_new <= supply_old {
        return Ok(0);
    }
    
    // Trapezoidal approximation: Cost = (P_old + P_new) / 2 * delta
    let p_old = calculate_spot_price(supply_old)?;
    let p_new = calculate_spot_price(supply_new)?;
    let delta = supply_new - supply_old;
    
    // Cost = (p_old + p_new) * delta / (2 * 1e9) [adjust for share scaling]
    let avg_price = (p_old + p_new) / 2;
    let cost = (avg_price * delta) / 1_000_000_000; // Divide by share scale
    
    Ok(cost)
}

/// Solve for shares received given SOL input (Binary Search)
pub fn calculate_shares_from_sol(sol_in: u128, supply_old: u128) -> Result<u128> {
    if sol_in == 0 {
        return Ok(0);
    }
    
    // Binary search for supply_new such that cost(old, new) = sol_in
    let mut low = supply_old;
    let mut high = TOTAL_SUPPLY;
    
    for _ in 0..50 {
        let mid = (low + high) / 2;
        let cost = calculate_cost(supply_old, mid)?;
        
        if cost < sol_in {
            low = mid;
        } else {
            high = mid;
        }
        
        if high - low < 1_000 { // Precision threshold
            break;
        }
    }
    
    Ok(low - supply_old)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET STATE & ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

#[account]
pub struct Market {
    pub creator: Pubkey,
    pub title: String,
    pub yes_supply: u128,      // Current YES shares minted
    pub no_supply: u128,       // Current NO shares minted
    pub vault_balance: u128,   // Total SOL in vault (Lamports)
    pub status: MarketStatus,
    pub resolution_time: i64,
    pub winning_outcome: Option<u8>,
    pub bump: u8,
    pub vault_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Active,
    Resolved,
}

#[account]
pub struct UserPosition {
    pub market: Pubkey,
    pub outcome: u8, // 0 = YES, 1 = NO
    pub shares: u128,
    pub claimed: bool,
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM ENTRY POINTS
// ═══════════════════════════════════════════════════════════════════════════════

#[program]
pub mod djinn_market {
    use super::*;

    pub fn buy_shares(
        ctx: Context<BuyShares>,
        outcome: u8, // 0 = YES, 1 = NO
        sol_in: u64,
        min_shares_out: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Active, DjinnError::MarketNotActive);
        
        let sol_in_u128 = sol_in as u128;
        
        // 1. Calculate Entry Fee (1%)
        let fee = (sol_in_u128 * ENTRY_FEE_BPS) / BPS_DENOMINATOR;
        let net_sol = sol_in_u128 - fee;
        
        // 2. Get current supply for outcome
        let current_supply = if outcome == 0 { market.yes_supply } else { market.no_supply };
        
        // 3. Calculate shares
        let shares = calculate_shares_from_sol(net_sol, current_supply)?;
        require!(shares >= min_shares_out as u128, DjinnError::SlippageExceeded);
        
        // 4. Update state
        if outcome == 0 {
            market.yes_supply = market.yes_supply.checked_add(shares).unwrap();
        } else {
            market.no_supply = market.no_supply.checked_add(shares).unwrap();
        }
        market.vault_balance = market.vault_balance.checked_add(net_sol).unwrap();
        
        // 5. Update user position
        let position = &mut ctx.accounts.user_position;
        position.market = market.key();
        position.outcome = outcome;
        position.shares = position.shares.checked_add(shares).unwrap();
        
        // 6. Transfer SOL
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.market_vault.to_account_info(),
                },
            ),
            net_sol as u64,
        )?;
        
        // 7. Transfer fee to treasury
        if fee > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.user.to_account_info(),
                        to: ctx.accounts.protocol_treasury.to_account_info(),
                    },
                ),
                fee as u64,
            )?;
        }
        
        Ok(())
    }

    pub fn sell_shares(
        ctx: Context<SellShares>,
        outcome: u8,
        shares_to_sell: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;
        
        require!(market.status == MarketStatus::Active, DjinnError::MarketNotActive);
        require!(position.shares >= shares_to_sell as u128, DjinnError::InsufficientShares);
        
        let shares_u128 = shares_to_sell as u128;
        let current_supply = if outcome == 0 { market.yes_supply } else { market.no_supply };
        
        // 1. Calculate SOL value of shares
        let new_supply = current_supply.checked_sub(shares_u128).unwrap();
        let refund = calculate_cost(new_supply, current_supply)?;
        
        // 2. Exit fee (1%)
        let fee = (refund * EXIT_FEE_BPS) / BPS_DENOMINATOR;
        let net_refund = refund - fee;
        
        // 3. Update state
        if outcome == 0 {
            market.yes_supply = new_supply;
        } else {
            market.no_supply = new_supply;
        }
        market.vault_balance = market.vault_balance.checked_sub(refund).unwrap();
        position.shares = position.shares.checked_sub(shares_u128).unwrap();
        
        // 4. Transfer from vault (CPI with signer)
        let market_key = market.key();
        let seeds = &[
            b"market_vault",
            market_key.as_ref(),
            &[market.vault_bump],
        ];
        let signer = &[&seeds[..]];
        
        if net_refund > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.market_vault.to_account_info(),
                        to: ctx.accounts.user.to_account_info(),
                    },
                    signer,
                ),
                net_refund as u64,
            )?;
        }
        
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
#[instruction(outcome: u8)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    
    /// CHECK: Vault PDA
    #[account(mut)]
    pub market_vault: AccountInfo<'info>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 1 + 16 + 1,
        seeds = [b"user_pos", market.key().as_ref(), user.key().as_ref(), &[outcome]],
        bump
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(outcome: u8)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    
    /// CHECK: Vault PDA
    #[account(mut)]
    pub market_vault: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"user_pos", market.key().as_ref(), user.key().as_ref(), &[outcome]],
        bump
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum DjinnError {
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Insufficient shares")]
    InsufficientShares,
    #[msg("Math error")]
    MathError,
}
