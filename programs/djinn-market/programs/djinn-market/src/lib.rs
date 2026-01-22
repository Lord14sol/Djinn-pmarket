use anchor_lang::prelude::*;

declare_id!("ExdGFD3ucmvsNHFQnc7PQMkoNKZnQVcvrsQcYp1g2UHa");

// ═══════════════════════════════════════════════════════════════════════════════
// DJINN CURVE V4 AGGRESSIVE: "EARLY BIRD REWARDS"
// 3-Phase Piecewise Bonding Curve with Progressive Gains
// Phase 1: Linear (0-50M → 6x) | Phase 2: Quadratic (50M-90M → 15x) | Phase 3: Sigmoid (90M+)
// Progressive: 10M=2x, 20M=3x, 30M=4x, 40M=5x, 50M=6x
// ═══════════════════════════════════════════════════════════════════════════════

// --- GLOBAL CONSTANTS ---
pub const TOTAL_SUPPLY: u128 = 1_000_000_000_000_000_000; // 1B Shares * 1e9 (9 decimals)
pub const ANCHOR_THRESHOLD: u128 = 100_000_000_000_000_000; // 100M * 1e9

// PHASE BOUNDARIES (Scaled by 1e9) - AGGRESSIVE CURVE
pub const PHASE1_END: u128 = 100_000_000_000_000_000;  // 100M
pub const PHASE2_END: u128 = 200_000_000_000_000_000;  // 200M
pub const PHASE3_START: u128 = 200_000_000_000_000_000;

// PRICE CONSTANTS (in Lamports, 1 SOL = 1e9 Lamports)
pub const P_START: u128 = 1_000;       // 1000 lamports (0.000001 SOL) - Higher base for depth
pub const P_50: u128 = 5_000;          // Progressive gains
pub const P_90: u128 = 25_000;         // Acceleration
pub const P_MAX: u128 = 950_000_000;   // 0.95 SOL Max

// 🔥 MODIFICACIÓN DEGEN MODE: 30M Shares (~30 SOL Depth) - Igual que Pump.fun
pub const VIRTUAL_ANCHOR: u128 = 30_000_000_000_000_000; 


// SIGMOID K (Scaled: k * 1e18 for fixed-point)
// ⚠️ LINEAR APPROXIMATION: norm_sig = k * x (not exp-based sigmoid!)
// Philosophy: GRADUAL GROWTH for democratization
// k = 4.7e-10 → k_scaled = 470 (original design)
// This gives ~19x at 120M shares, allowing longer accumulation phase
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
// CURVE MATH (V4 AGGRESSIVE: 3-PHASE PIECEWISE)
// ═══════════════════════════════════════════════════════════════════════════════

/// Linear slope for Phase 1: m = (P_50 - P_START) / PHASE1_END
fn get_linear_slope() -> u128 {
    // (6000 - 1) / 50e15 → steeper slope for faster gains
    ((P_50 - P_START) * K_SCALE_FACTOR) / PHASE1_END
}

/// Calculate spot price at given supply (in nanoSOL/Lamports)
pub fn calculate_spot_price(supply: u128) -> Result<u128> {
    // VIRTUAL ANCHOR: We add this to make the curve start at a stable point (50/50 odds)
    let effective_supply = supply.checked_add(VIRTUAL_ANCHOR).unwrap();

    if effective_supply <= PHASE1_END {
        // PHASE 1: LINEAR RAMP
        let slope = get_linear_slope();
        let price_delta = (slope * effective_supply) / K_SCALE_FACTOR;
        return Ok(P_START + price_delta);
    } else if effective_supply <= PHASE2_END {
        // PHASE 2: QUADRATIC BRIDGE
        let price = calculate_bridge_price(effective_supply)?;
        return Ok(price);
    } else {
        // PHASE 3: SIGMOID
        let price = calculate_sigmoid_price(effective_supply)?;
        return Ok(price);
    }
}


/// Quadratic Bridge: P = P_50 + (P_90 - P_50) * t²
fn calculate_bridge_price(supply: u128) -> Result<u128> {
    let progress = supply.checked_sub(PHASE1_END).unwrap();
    let range = PHASE2_END - PHASE1_END; // 40M
    
    // Quadratic acceleration: P = P_50 + (P_90 - P_50) * (progress/range)²
    let ratio = (progress * 1_000_000) / range; // Scaled by 1e6
    let ratio_sq = (ratio * ratio) / 1_000_000; // (progress/range)² * 1e6
    
    let price_delta = ((P_90 - P_50) * ratio_sq) / 1_000_000;
    Ok(P_50 + price_delta)
}

/// Sigmoid Phase: P = P_90 + (P_MAX - P_90) * normalized_sigmoid(x - 90M)
fn calculate_sigmoid_price(supply: u128) -> Result<u128> {
    let x_rel = supply.checked_sub(PHASE3_START).unwrap();
    
    // Linear approximation: norm_sig = k * x
    let kz = (K_SIGMOID_SCALED * x_rel) / K_SCALE_FACTOR;
    
    // Clamp to [0, 1e9]
    let norm_sig = if kz > 1_000_000_000 { 1_000_000_000 } else { kz };
    
    // P = P_90 + (P_MAX - P_90) * norm_sig / 1e9
    let price_delta = ((P_MAX - P_90) * norm_sig) / 1_000_000_000;
    Ok(P_90 + price_delta)
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
    
    // OPTIMIZATION (Point 7): Reduced from 50 to 30 to save gas
    for _ in 0..30 {
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
    pub nonce: i64,              // Unique nonce for duplicate titles
    pub num_outcomes: u8,        // Number of outcomes (2-6)
    pub outcome_supplies: [u128; 6], // Supply for each outcome (max 6)
    pub vault_balance: u128,   // Total SOL in vault (Lamports)
    pub total_pot_at_resolution: u64, // (Point 2) Snapshot of pot for fair distribution
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

    /// Create a new prediction market with multiple outcomes (2-6)
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        title: String,
        resolution_time: i64,
        nonce: i64,
        num_outcomes: u8, // 2-6
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;

        // Validate outcome count
        require!(num_outcomes >= 2 && num_outcomes <= 6, DjinnError::InvalidOutcomeCount);

        market.creator = ctx.accounts.creator.key();
        market.title = title;
        market.nonce = nonce;
        market.num_outcomes = num_outcomes;
        market.outcome_supplies = [0; 6]; // Initialize all to 0
        market.vault_balance = 0;
        market.total_pot_at_resolution = 0; // (Point 2) Initialize snapshot
        market.status = MarketStatus::Active;
        market.resolution_time = resolution_time;
        market.winning_outcome = None;
        market.bump = *ctx.bumps.get("market").unwrap();
        
        // Calculate vault bump
        let (_, vault_bump) = Pubkey::find_program_address(
            &[b"market_vault", market.key().as_ref()],
            ctx.program_id
        );
        market.vault_bump = vault_bump;
        
        // CREATION FEE: ~$2 USD → ~0.01 SOL → 10_000_000 Lamports
        // Transfer from creator to G1 treasury
        let creation_fee: u64 = 10_000_000; // 0.01 SOL
        
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.protocol_treasury.to_account_info(),
                },
            ),
            creation_fee,
        )?;
        
        Ok(())
    }

    pub fn buy_shares(
        ctx: Context<BuyShares>,
        outcome_index: u8, // 0, 1, 2, ... (up to num_outcomes - 1)
        sol_in: u64,
        min_shares_out: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Active, DjinnError::MarketNotActive);
        require!(outcome_index < market.num_outcomes, DjinnError::InvalidOutcome);
        
        // (Point 5) Check Expiry
        let now = Clock::get()?.unix_timestamp;
        require!(now < market.resolution_time, DjinnError::MarketExpired);

        let sol_in_u128 = sol_in as u128;

        // 1. Calculate Entry Fee (1%)
        let fee = (sol_in_u128 * ENTRY_FEE_BPS) / BPS_DENOMINATOR;
        let net_sol = sol_in_u128 - fee;

        // 2. Get current supply for outcome
        let current_supply = market.outcome_supplies[outcome_index as usize];

        // 3. Calculate shares
        let shares = calculate_shares_from_sol(net_sol, current_supply)?;
        require!(shares >= min_shares_out as u128, DjinnError::SlippageExceeded);

        // 4. Update state
        market.outcome_supplies[outcome_index as usize] = current_supply.checked_add(shares).unwrap();
        market.vault_balance = market.vault_balance.checked_add(net_sol).unwrap();
        
        // 5. Update user position
        let position = &mut ctx.accounts.user_position;
        position.market = market.key();
        position.outcome = outcome_index;
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
        
        // 7. Transfer fee (SPLIT LOGIC)
        if fee > 0 {
            let creator = market.creator;
            let treasury = ctx.accounts.protocol_treasury.key();
            
            if creator == treasury {
                // G1 created market: 100% to treasury
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
            } else {
                // User created market: 50/50 split
                let creator_cut = fee / 2;
                let treasury_cut = fee - creator_cut;
                
                // To Treasury
                anchor_lang::system_program::transfer(
                    CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.user.to_account_info(),
                            to: ctx.accounts.protocol_treasury.to_account_info(),
                        },
                    ),
                    treasury_cut as u64,
                )?;
                
                // To Creator
                anchor_lang::system_program::transfer(
                    CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.user.to_account_info(),
                            to: ctx.accounts.market_creator.to_account_info(),
                        },
                    ),
                    creator_cut as u64,
                )?;
            }
        }
        
        Ok(())
    }

    pub fn sell_shares(
        ctx: Context<SellShares>,
        outcome_index: u8,
        shares_to_sell: u64,
        min_sol_out: u64, // (Point 3) Slippage argument
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;

        require!(market.status == MarketStatus::Active, DjinnError::MarketNotActive);
        require!(outcome_index < market.num_outcomes, DjinnError::InvalidOutcome);
        require!(position.shares >= shares_to_sell as u128, DjinnError::InsufficientShares);

        // (Point 5) Check Expiry
        let now = Clock::get()?.unix_timestamp;
        require!(now < market.resolution_time, DjinnError::MarketExpired);

        let shares_u128 = shares_to_sell as u128;
        let current_supply = market.outcome_supplies[outcome_index as usize];

        // 1. Calculate SOL value of shares (Bonding Curve Value)
        let new_supply = current_supply.checked_sub(shares_u128).unwrap();
        let refund_gross = calculate_cost(new_supply, current_supply)?;

        // 2. SAFETY CLAMP: Ensure we don't try to refund more than what's in the vault
        let actual_refund = if refund_gross > market.vault_balance {
            market.vault_balance
        } else {
            refund_gross
        };

        // 3. Exit fee (1%)
        let fee = (actual_refund * EXIT_FEE_BPS) / BPS_DENOMINATOR;
        let net_refund = actual_refund - fee;

        // (Point 3) Slippage Check
        require!(net_refund >= min_sol_out as u128, DjinnError::SlippageExceeded);

        // 4. Update state
        market.outcome_supplies[outcome_index as usize] = new_supply;
        market.vault_balance = market.vault_balance.checked_sub(actual_refund).unwrap();
        position.shares = position.shares.checked_sub(shares_u128).unwrap();
        
        // 5. Transfer SOL to User
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

        // 6. Transfer Fee (SPLIT LOGIC: 50/50 between Creator and Treasury)
        if fee > 0 {
            let creator = market.creator;
            let treasury = ctx.accounts.protocol_treasury.key();
            
            if creator == treasury {
                // G1 created market: 100% to treasury
                anchor_lang::system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.market_vault.to_account_info(),
                            to: ctx.accounts.protocol_treasury.to_account_info(),
                        },
                        signer,
                    ),
                    fee as u64,
                )?;
            } else {
                // User created market: 50/50 split
                let creator_cut = fee / 2;
                let treasury_cut = fee - creator_cut;
                
                // To Treasury
                anchor_lang::system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.market_vault.to_account_info(),
                            to: ctx.accounts.protocol_treasury.to_account_info(),
                        },
                        signer,
                    ),
                     treasury_cut as u64,
                )?;
                
                // To Creator
                anchor_lang::system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.market_vault.to_account_info(),
                            to: ctx.accounts.market_creator.to_account_info(),
                        },
                        signer,
                    ),
                    creator_cut as u64,
                )?;
            }
        }

        
        Ok(())
    }

    /// Resolve market - declares the winning outcome
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_outcome: u8, // 0 = YES, 1 = NO
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(market.status == MarketStatus::Active, DjinnError::MarketNotActive);
        
        // (Point 4) Fixed Outcome Check
        require!(winning_outcome < market.num_outcomes, DjinnError::InvalidOutcome);
        
        // Check resolution time
        let now = Clock::get()?.unix_timestamp;
        require!(now >= market.resolution_time, DjinnError::MarketNotExpired);
        
        // Extract resolution fee (2%)
        let resolution_fee = (market.vault_balance * RESOLUTION_FEE_BPS) / BPS_DENOMINATOR;
        
        if resolution_fee > 0 {
            let market_key = market.key();
            let seeds = &[
                b"market_vault",
                market_key.as_ref(),
                &[market.vault_bump],
            ];
            let signer = &[&seeds[..]];
            
            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.market_vault.to_account_info(),
                        to: ctx.accounts.protocol_treasury.to_account_info(),
                    },
                    signer,
                ),
                resolution_fee as u64,
            )?;
            
            market.vault_balance = market.vault_balance.checked_sub(resolution_fee).unwrap();
        }
        
        // (Point 2) Snapshot the Pot Balance for fair Claiming
        market.total_pot_at_resolution = market.vault_balance as u64;

        market.status = MarketStatus::Resolved;
        market.winning_outcome = Some(winning_outcome);
        
        Ok(())
    }

    /// Claim winnings after market resolution
    pub fn claim_winnings(
        ctx: Context<ClaimWinnings>,
        outcome_index: u8,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;
        
        require!(market.status == MarketStatus::Resolved, DjinnError::MarketNotResolved);
        require!(!position.claimed, DjinnError::AlreadyClaimed);
        require!(position.shares > 0, DjinnError::NoShares);
        
        let winning_outcome = market.winning_outcome.unwrap();
        require!(outcome_index == winning_outcome, DjinnError::NotWinner);
        
        // (Point 2) Use total_pot_at_resolution instead of shrinking vault_balance
        // Calculate payout: user_shares / total_winning_shares * SNAPSHOT_BALANCE
        let total_winning_shares = market.outcome_supplies[winning_outcome as usize];
        
        if total_winning_shares == 0 {
            return Ok(());
        }
        
        let snapshot_pot = market.total_pot_at_resolution as u128;
        let payout = (snapshot_pot * position.shares) / total_winning_shares;
        
        // Transfer payout
        let market_key = market.key();
        let seeds = &[
            b"market_vault",
            market_key.as_ref(),
            &[market.vault_bump],
        ];
        let signer = &[&seeds[..]];
        
        if payout > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.market_vault.to_account_info(),
                        to: ctx.accounts.user.to_account_info(),
                    },
                    signer,
                ),
                payout as u64,
            )?;
            
            // We still decrease vault balance to track remaining funds, but it doesn't affect payout calculation
            market.vault_balance = market.vault_balance.checked_sub(payout).unwrap();
        }
        
        position.claimed = true;
        
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════════

// InitializeMarket context with nonce in PDA seeds
#[derive(Accounts)]
#[instruction(title: String, resolution_time: i64, nonce: i64, num_outcomes: u8)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = creator,
        // (Point 2) Added +8 bytes for total_pot_at_resolution
        space = 8 + 32 + (4 + 64) + 8 + 1 + (6 * 16) + 16 + 8 + 1 + 8 + 2 + 1 + 1,
        // 8 (discriminator) + 32 (creator) + (4 + 64) (title) + 8 (nonce) + 1 (num_outcomes)
        // + (6 * 16) (outcome_supplies array) + 16 (vault_balance) + 8 (total_pot) + 1 (status)
        // + 8 (resolution_time) + 2 (winning_outcome) + 1 (bump) + 1 (vault_bump)
        seeds = [b"market", creator.key().as_ref(), title.as_bytes(), &nonce.to_le_bytes()],
        bump
    )]
    pub market: Box<Account<'info, Market>>,
    
    /// CHECK: Vault PDA (will be created on first buy)
    #[account(
        mut,
        seeds = [b"market_vault", market.key().as_ref()],
        bump
    )]
    pub market_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// CHECK: Protocol treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(outcome_index: u8)]
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
        seeds = [b"user_pos", market.key().as_ref(), user.key().as_ref(), &[outcome_index]],
        bump
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
    
    /// CHECK: Market Creator (for fee split)
    #[account(
        mut, 
        address = market.creator // (Point 1) Anti-Spoofing Fix
    )]
    pub market_creator: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(outcome_index: u8)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    
    /// CHECK: Vault PDA
    #[account(mut)]
    pub market_vault: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"user_pos", market.key().as_ref(), user.key().as_ref(), &[outcome_index]],
        bump
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,

    /// CHECK: Market Creator for fee split
    #[account(
        mut, 
        address = market.creator // (Point 1) Anti-Spoofing Fix
    )]
    pub market_creator: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    
    /// CHECK: Vault PDA
    #[account(mut)]
    pub market_vault: AccountInfo<'info>,
    
    /// CHECK: Only treasury/oracle can resolve
    #[account(address = G1_TREASURY)]
    pub authority: Signer<'info>,
    
    /// CHECK: Treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(outcome_index: u8)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    
    /// CHECK: Vault PDA
    #[account(mut)]
    pub market_vault: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"user_pos", market.key().as_ref(), user.key().as_ref(), &[outcome_index]],
        bump,
        close = user // (Point 6) Rent Refund Optimization
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum DjinnError {
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Market is not resolved")]
    MarketNotResolved,
    #[msg("Market has not expired yet")]
    MarketNotExpired,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Insufficient shares")]
    InsufficientShares,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("No shares to claim")]
    NoShares,
    #[msg("Not a winner")]
    NotWinner,
    #[msg("Invalid outcome")]
    InvalidOutcome,
    #[msg("Invalid outcome count (must be 2-6)")]
    InvalidOutcomeCount,
    #[msg("Math error")]
    MathError,
    
    // (Point 5) New Error
    #[msg("Market has expired")]
    MarketExpired,
}
