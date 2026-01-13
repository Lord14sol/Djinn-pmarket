use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};

declare_id!("9xXGnGG4hxwC4XTHavmy5BWAdb8MC2VJtTDMW9FfkGbg"); 

const MARKET_CREATION_FEE: u64 = 50_000_000; // 0.05 SOL
const BPS_DENOMINATOR: u64 = 10_000;

// G1 Treasury Wallet (Blueprint)
// G1 Treasury Wallet (Blueprint)
pub const G1_TREASURY_STR: &str = "G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma";

// Fee Constants (Blueprint)
const FEE_STD_TOTAL: u16 = 100; // 1.0% (Total Trading Fee)
const FEE_STD_CREATOR: u16 = 50; // 0.5% (Half of Total)
// Protocol gets remaining 0.5% (FEE_STD_TOTAL - FEE_STD_CREATOR)

const FEE_ENDGAME_TOTAL: u16 = 10; // 0.1%
const FEE_ENDGAME_CREATOR: u16 = 0; // 0.0%

const FEE_RESOLUTION: u16 = 200; // 2.0% (Of Pot)
const FEE_ANTIBOT: u16 = 1500; // 15.0%

const VIRTUAL_SOL_INIT: u64 = 40_000_000_000; // 40 SOL
const ENDGAME_THRESHOLD_BPS: u64 = 9_500; // 0.95 SOL price

#[program]
pub mod djinn_market {
    use super::*;

    pub fn initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol_state;
        protocol.authority = ctx.accounts.authority.key();
        protocol.treasury = ctx.accounts.treasury.key();
        msg!("Protocol initialized");
        Ok(())
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        title: String,
        resolution_time: i64,
    ) -> Result<()> {
        // Transfer creation fee (0.05 SOL)
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.protocol_treasury.to_account_info(),
                },
            ),
            MARKET_CREATION_FEE,
        )?;

        let market = &mut ctx.accounts.market;
        market.creator = ctx.accounts.creator.key();
        market.title = title;
        market.resolution_time = resolution_time;
        market.status = MarketStatus::Open;
        market.outcome = MarketOutcome::None;
        market.bump = ctx.bumps.market;
        
        // V2 State Init
        market.creator_fees_claimable = 0;
        market.total_volume = 0;
        market.resolution_timestamp = 0;

        // VIRTUAL AMM INIT (x * y = k)
        // x = 40 SOL. Price = 0.5. y = 80 Shares.
        market.virtual_sol_reserves = VIRTUAL_SOL_INIT;
        market.virtual_share_reserves = VIRTUAL_SOL_INIT * 2; 

        msg!("Market created V2. Virtual Liquidity: {} SOL", VIRTUAL_SOL_INIT);
        Ok(())
    }

    /// Place a bet V2 (Bonding Curve Swap)
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        side: MarketOutcome, 
        amount_in: u64, // SOL input
        min_shares_out: u64, // Slippage Protection
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Open, DjinnError::MarketClosed);
        require!(Clock::get()?.unix_timestamp < market.resolution_time, DjinnError::MarketExpired);
        require!(amount_in > 0, DjinnError::InvalidAmount);
        require!(side == MarketOutcome::Yes || side == MarketOutcome::No, DjinnError::InvalidOutcome);

        // 1. Anti-Bot Check
        let clock = Clock::get()?;
        let current_slot = clock.slot;
        
        let mut fee_rate = FEE_STD_TOTAL;
        let mut creator_rate = FEE_STD_CREATOR;
        let mut is_bot = false;

        if market.last_trade_slot == current_slot && market.last_trader == ctx.accounts.user.key() {
            // Same block, same trader -> Bot Penalty
            fee_rate = FEE_ANTIBOT; // 15%
            creator_rate = 0; // No creator fee for bots
            is_bot = true;
            msg!("Anti-Bot Penalty Applied!");
        }

        // 2. Determine Dynamic Fees (If not bot) by current price
        // Price = x / y
        // We use 1e9 precision for price to compare with bps
        if !is_bot {
            let current_price_e9 = (market.virtual_sol_reserves as u128 * 1_000_000_000) / market.virtual_share_reserves as u128; // gives price in lamports basically? No.
            // 40 / 80 = 0.5. * 1e9 = 500_000_000.
            // Threshold 0.95 = 950_000_000.
            
            if current_price_e9 >= ENDGAME_THRESHOLD_BPS as u128 * 100_000 { // 9500 * 100,000 = 950M
                // Endgame Zone
                fee_rate = FEE_ENDGAME_TOTAL;
                creator_rate = FEE_ENDGAME_CREATOR;
                msg!("Endgame Fee Activated");
            }
        }

        // 3. Fee Split
        let fee_total = (amount_in as u128 * fee_rate as u128 / BPS_DENOMINATOR as u128) as u64;
        let mut fee_creator = (amount_in as u128 * creator_rate as u128 / BPS_DENOMINATOR as u128) as u64;
        
        // Blueprint: If Creator == G1, 100% to G1 (No Claimable)
        if market.creator.to_string() == G1_TREASURY_STR {
            fee_creator = 0;
        }

        let fee_protocol = fee_total - fee_creator; // If G1, this is 100%. If other, 50%.
        let net_invested = amount_in - fee_total;

        // 4. Bonding Curve Swap (Buy Shares)
        // k = x * y
        // new_x = x + net_invested
        // new_y = k / new_x
        // shares_out = y - new_y
        
        let x = market.virtual_sol_reserves as u128;
        let y = market.virtual_share_reserves as u128;
        let k = x * y;

        let new_x = x + net_invested as u128;
        let new_y = k / new_x;
        
        // Safety check to prevent depleting y to 0 (unlikely with this math but good practice)
        require!(new_y > 0, DjinnError::MathError);

        let shares_out = (y - new_y) as u64;
        require!(shares_out >= min_shares_out, DjinnError::SlippageExceeded);

        // 5. Update State
        market.virtual_sol_reserves = new_x as u64;
        market.virtual_share_reserves = new_y as u64;
        market.creator_fees_claimable += fee_creator;
        market.total_volume += amount_in;
        market.last_trade_slot = current_slot;
        market.last_trader = ctx.accounts.user.key();

        // 6. Transfer SOL
        // User -> Market (Net Invested + Creator Fee pending)
        // User -> Treasury (Protocol Fee) - Optimization: Send Protocol Fee directly now
        
        // Transfer Net + Creator Fee to Market PDA
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: market.to_account_info(),
                },
            ),
            net_invested + fee_creator,
        )?;

        // Transfer Protocol Fee to Treasury
        if fee_protocol > 0 {
             anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.user.to_account_info(),
                        to: ctx.accounts.protocol_treasury.to_account_info(),
                    },
                ),
                fee_protocol,
            )?;
        }

        // 7. Mint Shares
        let seeds = &[
            b"market".as_ref(),
            market.creator.as_ref(),
            market.title.as_bytes(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let (mint_account, to_account) = match side {
            MarketOutcome::Yes => (&ctx.accounts.yes_token_mint, &ctx.accounts.user_yes_account),
            MarketOutcome::No => (&ctx.accounts.no_token_mint, &ctx.accounts.user_no_account),
            _ => return err!(DjinnError::InvalidOutcome),
        };

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: mint_account.to_account_info(),
                    to: to_account.to_account_info(),
                    authority: market.to_account_info(),
                },
                signer,
            ),
            shares_out,
        )?;

        msg!("Swap V2: {} SOL In -> {} Shares Out. Fees: {} ({} Creator)", amount_in, shares_out, fee_total, fee_creator);
        Ok(())
    }

    /// Claim Creator Fees
    pub fn claim_creator_fees(ctx: Context<ClaimCreatorFees>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(ctx.accounts.creator.key() == market.creator, DjinnError::Unauthorized);
        
        let amount = market.creator_fees_claimable;
        require!(amount > 0, DjinnError::NothingToClaim);

        market.creator_fees_claimable = 0;

        **market.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += amount;
        
        msg!("Creator claimed {} lamports", amount);
        Ok(())
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: MarketOutcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let protocol = &ctx.accounts.protocol_state;
        
        require!(ctx.accounts.authority.key() == protocol.authority, DjinnError::Unauthorized);
        require!(market.status == MarketStatus::Open, DjinnError::AlreadyResolved);
        require!(outcome != MarketOutcome::None, DjinnError::InvalidOutcome);

        market.outcome = outcome.clone(); // Now works because Copy
        market.status = MarketStatus::Resolved; 
        market.resolution_timestamp = Clock::get()?.unix_timestamp; // Set timelock start

        msg!("Market resolved to {:?}. Timelock started.", outcome);
        Ok(())
    }

    /// Claim Reward V2 (Timelock + 2% Fee)
    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Resolved, DjinnError::NotResolved);

        // Timelock Check (2 Hours = 7200 seconds)
        let now = Clock::get()?.unix_timestamp;
        require!(now >= market.resolution_timestamp + 7200, DjinnError::TimelockActive);

        // let user_shares_yes = ctx.accounts.user_yes_account.amount; // Optimized out
        // let user_shares_no = ctx.accounts.user_no_account.amount;

        // Simplified Payout for this MVP: 
        // We will stick to PROPORTIONAL PAYOUT based on REAL POT.
        // Payout = (MyShares / TotalWinningShares) * (RealPot).
        
        let total_lamports = market.to_account_info().lamports();
        let rent = Rent::get()?.minimum_balance(Market::LEN);
        let fees_pending = market.creator_fees_claimable;
        
        // Available Pot for Winners
        let available_pot = total_lamports.saturating_sub(rent).saturating_sub(fees_pending);

        let (user_shares, total_winning_shares, burn_mint_is_yes) = match market.outcome {
             MarketOutcome::Yes => (
                 ctx.accounts.user_yes_account.amount,
                 ctx.accounts.yes_token_mint.supply,
                 true,
             ),
             MarketOutcome::No => (
                 ctx.accounts.user_no_account.amount,
                 ctx.accounts.no_token_mint.supply,
                 false,
             ),
             _ => return err!(DjinnError::InvalidOutcome),
        };

        require!(user_shares > 0, DjinnError::NothingToClaim);
        require!(total_winning_shares > 0, DjinnError::MathError);

        // Calculate Gross Payout
        // (User / Total) * Pot
        let gross_payout = (user_shares as u128 * available_pot as u128 / total_winning_shares as u128) as u64;

        // Apply 2% Resolution Fee
        let fee_resolution = (gross_payout as u128 * FEE_RESOLUTION as u128 / BPS_DENOMINATOR as u128) as u64;
        let net_payout = gross_payout - fee_resolution;

        // Burn Shares
        let (mint_account, burn_from) = if burn_mint_is_yes {
             (&ctx.accounts.yes_token_mint, &ctx.accounts.user_yes_account)
        } else {
             (&ctx.accounts.no_token_mint, &ctx.accounts.user_no_account)
        };

        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: mint_account.to_account_info(),
                    from: burn_from.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            user_shares,
        )?;

        // Transfer Checks
        **market.to_account_info().try_borrow_mut_lamports()? -= net_payout + fee_resolution;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += net_payout;
        **ctx.accounts.protocol_treasury.try_borrow_mut_lamports()? += fee_resolution;

        msg!("Claimed {} (Fee {}). Burned {}", net_payout, fee_resolution, user_shares);
        Ok(())
    }

    /// Sell Shares V2 (Bonding Curve Sell)
    /// Inverse of Place Bet.
    /// Input: Shares to burn.
    /// Output: SOL returned.
    pub fn sell_shares(
        ctx: Context<SellShares>,
        side: MarketOutcome,
        shares_amount: u64,
        min_sol_out: u64, // Slippage Protection
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Open, DjinnError::MarketClosed);
        require!(shares_amount > 0, DjinnError::InvalidAmount);
        
        // 1. Calculate Bonding Curve Swap (Sell Shares -> SOL)
        // k = x * y
        // y_current = market.virtual_share_reserves
        // y_new = y_current + shares_amount (Wait, selling shares means we give shares BACK to curve? 
        // NO. Minting = Curve CREATES shares. Selling = Curve DESTROYS shares?
        // Let's look at Buy:
        // Buy: User gives SOL (x increases). Curve gives Shares (y decreases).
        // Sell: User gives Shares (y increases). Curve gives SOL (x decreases).
        
        let x = market.virtual_sol_reserves as u128;
        let y = market.virtual_share_reserves as u128;
        let k = x * y; // constant product

        let new_y = y + shares_amount as u128;
        let new_x = k / new_y;

        // SOL to release = Current SOL (x) - New SOL (x_new)
        let amount_sol_out_gross = (x - new_x) as u64;

        // 1.5 Anti-Bot Check
        let clock = Clock::get()?;
        let current_slot = clock.slot;
        
        // 2. Fees (Standard 1.0%)
        let mut fee_rate = FEE_STD_TOTAL; 
        let mut fee_creator_rate = FEE_STD_CREATOR;

        // Check if trading in same slot as last action (Buy or Sell)
        if market.last_trade_slot == current_slot && market.last_trader == ctx.accounts.user.key() {
             fee_rate = FEE_ANTIBOT; // 15%
             fee_creator_rate = 0; // No creator fee for bots
             msg!("Anti-Bot Penalty Applied on Sell!");
        } else {
            // Check for Endgame Mode
            let current_price_e9 = (market.virtual_sol_reserves as u128 * 1_000_000_000) / market.virtual_share_reserves as u128;
            if current_price_e9 >= ENDGAME_THRESHOLD_BPS as u128 * 100_000 {
                fee_rate = FEE_ENDGAME_TOTAL;
                fee_creator_rate = FEE_ENDGAME_CREATOR;
                msg!("Endgame Fee Activated on Sell");
            }
        }

        let fee_total = (amount_sol_out_gross as u128 * fee_rate as u128 / BPS_DENOMINATOR as u128) as u64;
        let mut fee_creator = (amount_sol_out_gross as u128 * fee_creator_rate as u128 / BPS_DENOMINATOR as u128) as u64;
        
        // Blueprint: If Creator == G1, 100% to G1 (No Claimable)
        if market.creator.to_string() == G1_TREASURY_STR {
            fee_creator = 0;
        }

        let fee_protocol = fee_total - fee_creator;
        
        let amount_sol_net = amount_sol_out_gross - fee_total;
        require!(amount_sol_net >= min_sol_out, DjinnError::SlippageExceeded);

        // 3. Update State
        market.virtual_sol_reserves = new_x as u64;
        market.virtual_share_reserves = new_y as u64;
        market.total_volume += amount_sol_out_gross; 
        market.creator_fees_claimable += fee_creator; // Creator fee stays in market until claimed
        market.last_trade_slot = current_slot;
        market.last_trader = ctx.accounts.user.key();

        // 4. Burn User Shares
        let (mint_account, from_account) = match side {
            MarketOutcome::Yes => (&ctx.accounts.yes_token_mint, &ctx.accounts.user_yes_account),
            MarketOutcome::No => (&ctx.accounts.no_token_mint, &ctx.accounts.user_no_account),
            _ => return err!(DjinnError::InvalidOutcome),
        };

        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: mint_account.to_account_info(),
                    from: from_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            shares_amount,
        )?;

        // 5. Transfer SOL
        // A. Market -> User (Net Amount)
        **market.to_account_info().try_borrow_mut_lamports()? -= amount_sol_net;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount_sol_net;

        // B. Market -> Treasury (Protocol Fee) - Direct Transfer
        if fee_protocol > 0 {
             **market.to_account_info().try_borrow_mut_lamports()? -= fee_protocol;
             **ctx.accounts.protocol_treasury.try_borrow_mut_lamports()? += fee_protocol;
        }

        msg!("Sold {} shares for {} SOL (Fee: {} - Proto: {}, Creator: {})", 
            shares_amount, amount_sol_net, fee_total, fee_protocol, fee_creator);
        Ok(())
    }
}

// --- DATA STRUCTURES (UPDATED V2) ---

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MarketStatus { Open, Resolved, Voided }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MarketOutcome { None, Yes, No, Void }

#[account]
pub struct Market {
    pub creator: Pubkey,
    pub title: String,
    
    // V2 AMM State
    pub virtual_sol_reserves: u64,
    pub virtual_share_reserves: u64,
    pub creator_fees_claimable: u64,
    pub total_volume: u64,

    // Anti-Bot
    pub last_trade_slot: u64,
    pub last_trader: Pubkey,

    pub resolution_time: i64,
    pub resolution_timestamp: i64, // Settlement start
    pub status: MarketStatus,
    pub outcome: MarketOutcome,
    pub bump: u8,
}

impl Market {
    // Increased size for new fields approx
    pub const LEN: usize = 400; 
}

#[account]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub treasury: Pubkey,
}

impl ProtocolState { pub const LEN: usize = 8 + 32 + 32; }

// --- ACCOUNTS (UPDATED) ---

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(init, payer = authority, space = ProtocolState::LEN, seeds = [b"protocol"], bump)]
    pub protocol_state: Account<'info, ProtocolState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Safe
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateMarket<'info> {
    #[account(init, payer = creator, space = Market::LEN, seeds = [b"market", creator.key().as_ref(), title.as_bytes()], bump)]
    pub market: Account<'info, Market>,
    
    #[account(init, payer = creator, seeds = [b"yes_mint", market.key().as_ref()], bump, mint::decimals = 9, mint::authority = market)]
    pub yes_token_mint: Account<'info, Mint>,
    
    #[account(init, payer = creator, seeds = [b"no_mint", market.key().as_ref()], bump, mint::decimals = 9, mint::authority = market)]
    pub no_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut)]
    pub protocol_state: Account<'info, ProtocolState>,
    /// CHECK: Treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub yes_token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub no_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_yes_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_no_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>, // Needed for direct protocol fee transfer

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimCreatorFees<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub protocol_state: Account<'info, ProtocolState>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub yes_token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub no_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_yes_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_no_account: Account<'info, TokenAccount>,
    
    /// CHECK: Treasury for fees
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub yes_token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub no_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_yes_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_no_account: Account<'info, TokenAccount>,
    
    /// CHECK: Treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum DjinnError {
    #[msg("Fee too high")] FeeTooHigh,
    #[msg("Market closed")] MarketClosed,
    #[msg("Market expired")] MarketExpired,
    #[msg("Invalid amount")] InvalidAmount,
    #[msg("Invalid outcome")] InvalidOutcome,
    #[msg("Unauthorized")] Unauthorized,
    #[msg("Already resolved")] AlreadyResolved,
    #[msg("Not resolved")] NotResolved,
    #[msg("Nothing to claim")] NothingToClaim,
    #[msg("Math Error")] MathError,
    #[msg("Timelock Active: Wait 2 Hours")] TimelockActive,
    #[msg("Slippage Exceeded")] SlippageExceeded,
}
