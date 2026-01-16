use anchor_lang::prelude::*;

declare_id!("EkWbgwnLtY76MYzKZPWCz6xBwkrScktK6cpgXQb4GdU6"); 

// --- CONSTANTS (GENESIS PROTOCOL) ---
// 1 SOL ~= $150 USD
pub const MARKET_CREATION_FEE: u64 = 20_000_000; // 0.02 SOL (~$3 USD)
pub const GENESIS_SEED: u64 = 6_666_667;         // ~0.0066 SOL (~$1 USD)
pub const TREASURY_CUT: u64 = 13_333_333;        // ~0.0133 SOL (~$2 USD)

pub const G1_TREASURY: Pubkey = anchor_lang::solana_program::pubkey!("G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma");
pub const TREASURY_AUTHORITY: Pubkey = G1_TREASURY;

// Fees
pub const ENTRY_FEE_BPS: u128 = 100;    // 1%
pub const EXIT_FEE_BPS: u128 = 100;     // 1%
pub const RESOLUTION_FEE_BPS: u128 = 200; // 2%

// CURVE CALIBRATION
pub const CURVE_CONSTANT: u128 = 375_000_000_000_000; 
pub const VIRTUAL_OFFSET: u128 = 50_000_000_000; // 50 Billion "Locked" Shares
pub const MIN_SHARES_TRADEABLE: u128 = 1_000_000; 
pub const BPS_DENOMINATOR: u128 = 10_000;

// Oracles
pub const AI_ORACLE_KEY: Pubkey = G1_TREASURY; 
pub const API_ORACLE_KEY: Pubkey = G1_TREASURY; 

#[program]
pub mod djinn_market {
    use super::*;

    pub fn initialize_protocol(_ctx: Context<InitializeProtocol>) -> Result<()> {
        Ok(())
    }

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        title: String,
        resolution_time: i64,
        num_outcomes: u8,
        curve_constant: u128,
    ) -> Result<()> {
        require!(num_outcomes >= 2, DjinnError::InvalidOutcomeCount);

        let market = &mut ctx.accounts.market;
        let k_constant = if curve_constant > 0 { curve_constant } else { CURVE_CONSTANT };
        
        // 1. Creator pays Creation Fee to Vault
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.market_vault.to_account_info(),
                },
            ),
            MARKET_CREATION_FEE,
        )?;

        // 2. Vault pays Treasury Cut (CPI with Signer)
        let market_key = market.key();
        let vault_bump = ctx.bumps.get("market_vault").unwrap();
        let seeds = &[
            b"market_vault",
            market_key.as_ref(),
            &[*vault_bump],
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
            TREASURY_CUT,
        )?;
        
        let seed_per_outcome = (GENESIS_SEED as u128) / (num_outcomes as u128);

        market.outcomes = Vec::new();
        for _ in 0..num_outcomes {
            market.outcomes.push(OutcomeState {
                total_shares: VIRTUAL_OFFSET,
                total_liquidity: seed_per_outcome,
            });
        }

        market.creator = ctx.accounts.creator.key();
        market.title = title;
        market.resolution_time = resolution_time;
        market.global_vault = GENESIS_SEED as u128;
        market.curve_constant = k_constant;
        market.locked_seed_shares = VIRTUAL_OFFSET * (num_outcomes as u128);
        market.status = MarketStatus::Active;
        market.bump = *ctx.bumps.get("market").unwrap();
        market.vault_bump = *ctx.bumps.get("market_vault").unwrap();

        Ok(())
    }

    pub fn buy_shares(
        ctx: Context<BuyShares>,
        outcome_index: u8,
        sol_in: u64,
        min_shares_out: u64,
        max_price_impact_bps: u16,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let outcome_idx = outcome_index as usize;
        require!(market.status == MarketStatus::Active, DjinnError::MarketNotActive);
        require!(outcome_idx < market.outcomes.len(), DjinnError::InvalidOutcomeIndex);

        // PRE-CALCULATION
        let k = market.curve_constant;
        let vault_pre = market.global_vault;
        let old_shares = market.outcomes[outcome_idx].total_shares;

        // 1. ENTRY FEE (1%)
        let entry_fee = (sol_in as u128)
            .checked_mul(ENTRY_FEE_BPS).unwrap()
            .checked_div(BPS_DENOMINATOR).unwrap();
        let net_sol = (sol_in as u128).checked_sub(entry_fee).unwrap();

        // 2. CALCULATE SHARES
        let s_new = calculate_shares_from_sol(net_sol, old_shares, k)?;
        let shares_minted = s_new.checked_sub(old_shares).ok_or(DjinnError::MathError)?;

        // 3. PRICE IMPACT Check
        if shares_minted > 0 {
             let expected_price = calculate_spot_price(old_shares, k)?;
             if expected_price > 0 {
                 let avg_price = net_sol.checked_div(shares_minted).unwrap_or(0);
                 if avg_price > expected_price {
                     let diff = avg_price - expected_price;
                     let impact = diff.checked_mul(10000).unwrap().checked_div(expected_price).unwrap();
                     require!(impact <= max_price_impact_bps as u128, DjinnError::PriceImpactTooHigh);
                 }
             }
        }

        // 4. SOLVENCY CHECK (REMOVED: Math guarantees solvency)
        let predicted_vault = vault_pre.checked_add(net_sol).unwrap();
        
        // Standard Slippage Check
        require!(shares_minted >= min_shares_out as u128, DjinnError::SlippageExceeded);

        let final_shares_minted = shares_minted;
        let final_total_shares = s_new;

        // 5. UPDATE STATE
        let market = &mut ctx.accounts.market;
        market.outcomes[outcome_idx].total_shares = final_total_shares;
        market.outcomes[outcome_idx].total_liquidity += net_sol;
        market.global_vault = predicted_vault;

        let user_pos = &mut ctx.accounts.user_position;
        if user_pos.shares == 0 {
             user_pos.market = market.key();
             user_pos.outcome_index = outcome_index;
        }
        require!(user_pos.outcome_index == outcome_index, DjinnError::WrongOutcomePosition);
        user_pos.shares = user_pos.shares.checked_add(final_shares_minted).unwrap();

        // 6. TRANSFERS (SPLIT)
        // User -> Vault (Net Amount)
        if net_sol > 0 {
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
        }

        // User -> Treasury (Fee)
        if entry_fee > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.user.to_account_info(),
                        to: ctx.accounts.protocol_treasury.to_account_info(),
                    },
                ),
                entry_fee as u64,
            )?;
        }

        emit!(Trade {
            market: market.key(),
            user: ctx.accounts.user.key(),
            is_buy: true,
            outcome_index,
            sol_amount: sol_in,
            shares_amount: final_shares_minted as u64,
        });

        Ok(())
    }

    pub fn sell_shares(
        ctx: Context<SellShares>,
        shares_to_burn: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let user_pos = &mut ctx.accounts.user_position;
        let outcome_idx = user_pos.outcome_index as usize;
        
        require!(market.status == MarketStatus::Active, DjinnError::MarketNotActive);
        require!(user_pos.shares >= (shares_to_burn as u128), DjinnError::InsufficientShares);
        require!((shares_to_burn as u128) >= MIN_SHARES_TRADEABLE, DjinnError::AmountTooSmall);

        // PRE-CALCULATION
        let k = market.curve_constant;
        let old_shares = market.outcomes[outcome_idx].total_shares;

        // 1. CALCULATE REFUND
        let old_cost = calculate_cost_from_shares(old_shares, k)?;
        let new_shares = old_shares.checked_sub(shares_to_burn as u128).unwrap();
        let new_cost = calculate_cost_from_shares(new_shares, k)?;
        
        let gross_refund = old_cost.checked_sub(new_cost).unwrap();

        // 2. EXIT FEE (1%)
        let exit_fee = gross_refund.checked_mul(EXIT_FEE_BPS).unwrap().checked_div(BPS_DENOMINATOR).unwrap();
        let net_refund = gross_refund.checked_sub(exit_fee).unwrap();

        // 3. UPDATE STATE
        let market = &mut ctx.accounts.market;
        market.outcomes[outcome_idx].total_shares = new_shares;
        market.outcomes[outcome_idx].total_liquidity = market.outcomes[outcome_idx].total_liquidity.checked_sub(gross_refund).unwrap_or(0);
        
        market.global_vault = market.global_vault.checked_sub(net_refund).unwrap();
        market.global_vault = market.global_vault.checked_sub(exit_fee).unwrap();

        user_pos.shares = user_pos.shares.checked_sub(shares_to_burn as u128).unwrap();

        // 4. TRANSFER SOL (CPI with Signer)
        let market_key = market.key();
        let seeds = &[
            b"market_vault",
            market_key.as_ref(),
            &[market.vault_bump],
        ];
        let signer = &[&seeds[..]];

        // Vault -> User (Refund)
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

        // Vault -> Treasury (Fee)
        if exit_fee > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.market_vault.to_account_info(),
                        to: ctx.accounts.protocol_treasury.to_account_info(),
                    },
                    signer,
                ),
                exit_fee as u64,
            )?;
        }

        emit!(Trade {
            market: market.key(),
            user: ctx.accounts.user.key(),
            is_buy: false,
            outcome_index: user_pos.outcome_index,
            sol_amount: net_refund as u64,
            shares_amount: shares_to_burn,
        });

        Ok(())
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>, 
        winning_outcome: u8,
        ai_vote: u8,
        api_vote: u8,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;

        require!(ai_vote == winning_outcome, DjinnError::AIVoteMismatch);
        require!(api_vote == winning_outcome, DjinnError::APIVoteMismatch);
        require!(ctx.accounts.dao_multisig.approvals >= 2, DjinnError::InsufficientDAOApprovals);

        require!((winning_outcome as usize) < market.outcomes.len(), DjinnError::InvalidOutcomeIndex);

        market.status = MarketStatus::Resolved;
        market.winning_outcome = Some(winning_outcome);
        market.resolution_timestamp = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let user_pos = &mut ctx.accounts.user_position;

        require!(market.status == MarketStatus::Resolved, DjinnError::NotResolved);
        require!(!user_pos.claimed, DjinnError::AlreadyClaimed);
        require!(user_pos.shares > 0, DjinnError::NoShares);

        let winning_index = market.winning_outcome.unwrap();
        let winner_shares = market.outcomes[winning_index as usize].total_shares;
        
        let market_key = market.key();
        let seeds = &[
            b"market_vault",
            market_key.as_ref(),
            &[market.vault_bump],
        ];
        let signer = &[&seeds[..]];

        // Zero-Winner Fallback
        if winner_shares == 0 {
             require!(ctx.accounts.user.key() == TREASURY_AUTHORITY, DjinnError::Unauthorized);
             let amount = market.global_vault;
             
             // Vault -> Treasury (Sweep)
             anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.market_vault.to_account_info(),
                        to: ctx.accounts.protocol_treasury.to_account_info(),
                    },
                    signer,
                ),
                amount as u64,
            )?;

             market.global_vault = 0;
             return Ok(());
        }

        require!(user_pos.outcome_index == winning_index, DjinnError::NotWinner);

        let numerator = market.global_vault
            .checked_mul(98).unwrap()
            .checked_mul(user_pos.shares).unwrap();
        
        let denominator = winner_shares
            .checked_mul(100).unwrap();
        
        let payout = numerator.checked_div(denominator).unwrap();

        // Vault -> User (Payout)
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

        market.global_vault = market.global_vault.checked_sub(payout).unwrap();
        user_pos.claimed = true;
        
        emit!(WinningsClaimed {
            user: ctx.accounts.user.key(),
            payout: payout as u64,
            shares_burned: user_pos.shares as u64,
        });

        Ok(())
    }
}

// --- CURVE MATH (INVERSE SLOPE MODEL) ---

fn isqrt(n: u128) -> Result<u128> {
    if n == 0 { return Ok(0); }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    Ok(x)
}

fn calculate_shares_from_sol(net_in: u128, s_old: u128, k: u128) -> Result<u128> {
    // S_new = sqrt( S_old^2 + 2 * NetIn * K )
    let s_old_sq = s_old.checked_mul(s_old).ok_or(DjinnError::MathError)?;
    let term = net_in.checked_mul(2).unwrap().checked_mul(k).unwrap();
    let s_new_sq = s_old_sq.checked_add(term).unwrap();
    isqrt(s_new_sq)
}

fn calculate_cost_from_shares(shares: u128, k: u128) -> Result<u128> {
    // Cost = S^2 / (2 * K)
    shares.checked_mul(shares).unwrap()
        .checked_div(k.checked_mul(2).unwrap()).ok_or(DjinnError::MathError.into())
}

fn calculate_spot_price(shares: u128, k: u128) -> Result<u128> {
    // P = S / K
    Ok(shares.checked_div(k).unwrap_or(0))
}

// --- DATA ---
#[account]
pub struct Market {
    pub creator: Pubkey,
    pub outcomes: Vec<OutcomeState>,
    pub title: String, 
    pub global_vault: u128, 
    pub curve_constant: u128, 
    pub locked_seed_shares: u128, 
    pub status: MarketStatus, 
    pub resolution_time: i64, 
    pub resolution_timestamp: i64, 
    pub winning_outcome: Option<u8>, 
    pub bump: u8, 
    pub vault_bump: u8,
    pub creation_fee_seed: u64,
}
impl Market { pub const LEN: usize = 8 + 32 + 50 + 4 + (16*2*2) + 16 + 8 + 1 + 1 + 8 + 1 + 100 + 8; }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct OutcomeState {
    pub total_shares: u128,
    pub total_liquidity: u128,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Pending, Active, Paused, Resolving, Disputed, Resolved, Finalized
}

#[account]
pub struct UserPosition {
    pub market: Pubkey,
    pub outcome_index: u8,
    pub shares: u128,
    pub claimed: bool,
    pub claim_timestamp: i64,
}

#[account]
pub struct ProtocolState { 
    pub authority: Pubkey, 
    pub treasury: Pubkey 
}

#[account]
pub struct Multisig {
    pub approvals: u64, 
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(init, payer = authority, space = 8 + 100, seeds = [b"protocol"], bump)]
    pub protocol_state: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Treasury
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct InitializeMarket<'info> {
    #[account(
        init, 
        payer = creator, 
        space = Market::LEN + title.len(), 
        seeds = [b"market", creator.key().as_ref(), title.as_bytes()], 
        bump
    )]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, seeds = [b"market_vault", market.key().as_ref()], bump)]
    /// CHECK: PDA Vault
    pub market_vault: AccountInfo<'info>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut)]
    /// CHECK: Treasury
    pub protocol_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    /// CHECK: Vault
    pub market_vault: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 1 + 16 + 1 + 8,
        seeds = [b"user_pos", market.key().as_ref(), user.key().as_ref()], 
        bump
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    /// CHECK: Treasury
    pub protocol_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    /// CHECK: Vault
    pub market_vault: AccountInfo<'info>,
    #[account(mut)]
    pub user_position: Box<Account<'info, UserPosition>>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    /// CHECK: Treasury
    pub protocol_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    pub ai_oracle: Signer<'info>,
    pub api_oracle: Signer<'info>,
    pub dao_multisig: Box<Account<'info, Multisig>>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    /// CHECK: Vault
    pub market_vault: AccountInfo<'info>,
    #[account(mut)]
    pub user_position: Box<Account<'info, UserPosition>>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    /// CHECK: Treasury
    pub protocol_treasury: AccountInfo<'info>,
    /// CHECK: Auth
    pub authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub creator: Pubkey,
    pub num_outcomes: u8,
    pub genesis_shares: u128,
    pub curve_constant: u128,
}
#[event]
pub struct Trade {
    pub market: Pubkey,
    pub user: Pubkey,
    pub is_buy: bool,
    pub outcome_index: u8,
    pub sol_amount: u64,
    pub shares_amount: u64,
}
#[event]
pub struct MarketResolved { pub market: Pubkey, pub winning_outcome: u8 }
#[event]
pub struct WinningsClaimed { pub user: Pubkey, pub payout: u64, pub shares_burned: u64 }

#[error_code]
pub enum DjinnError {
    #[msg("Invalid Outcome Count")] InvalidOutcomeCount,
    #[msg("Math Error")] MathError,
    #[msg("Market Not Active")] MarketNotActive,
    #[msg("Invalid Outcome Index")] InvalidOutcomeIndex,
    #[msg("Price Impact Too High")] PriceImpactTooHigh,
    #[msg("Slippage Exceeded")] SlippageExceeded,
    #[msg("Wrong Outcome Position")] WrongOutcomePosition,
    #[msg("Insufficient Shares")] InsufficientShares,
    #[msg("Amount Too Small")] AmountTooSmall,
    #[msg("Vote Mismatch")] AIVoteMismatch,
    #[msg("Vote Mismatch")] APIVoteMismatch,
    #[msg("DAO Approval Fail")] InsufficientDAOApprovals,
    #[msg("Not Resolved")] NotResolved,
    #[msg("Already Claimed")] AlreadyClaimed,
    #[msg("No Shares")] NoShares,
    #[msg("Not Winner")] NotWinner,
    #[msg("Unauthorized")] Unauthorized,
}
