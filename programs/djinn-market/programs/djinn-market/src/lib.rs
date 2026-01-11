use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer};

declare_id!("DSsD8neGhs9Ae9gVuWjmUfVckEvw36GamNboxWQCNqKQ");

// Fee constants
const MARKET_CREATION_FEE: u64 = 30_000_000; // 0.03 SOL in lamports
const TRADING_FEE_BPS: u64 = 10; // 0.1% = 10 basis points
const RESOLUTION_FEE_BPS: u64 = 200; // 2% = 200 basis points
const BPS_DENOMINATOR: u64 = 10_000;

#[program]
pub mod djinn_market {
    use super::*;

    /// Initialize the protocol (one-time setup)
    pub fn initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol_state;
        protocol.authority = ctx.accounts.authority.key();
        protocol.treasury = ctx.accounts.treasury.key();
        protocol.total_markets = 0;
        protocol.total_volume = 0;
        protocol.total_fees_collected = 0;
        
        msg!("Protocol initialized. Authority: {}", protocol.authority);
        Ok(())
    }

    /// Create a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        title: String,
        description: String,
        resolution_time: i64,
    ) -> Result<()> {
        require!(title.len() <= 200, DjinnError::TitleTooLong);
        require!(description.len() <= 1000, DjinnError::DescriptionTooLong);
        require!(resolution_time > Clock::get()?.unix_timestamp, DjinnError::InvalidResolutionTime);

        // Transfer creation fee (0.03 SOL) to protocol treasury
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
        market.protocol_authority = ctx.accounts.protocol_state.authority;
        market.title = title;
        market.description = description;
        market.yes_pool = 0;
        market.no_pool = 0;
        market.total_yes_shares = 0;
        market.total_no_shares = 0;
        market.resolution_time = resolution_time;
        market.resolved = false;
        market.winning_outcome = None;
        market.creation_fee_paid = MARKET_CREATION_FEE;
        market.bump = ctx.bumps.market;

        // Update protocol stats
        let protocol = &mut ctx.accounts.protocol_state;
        protocol.total_markets += 1;
        protocol.total_fees_collected += MARKET_CREATION_FEE;

        msg!("Market created: {}", market.title);
        msg!("Creation fee paid: {} lamports", MARKET_CREATION_FEE);
        
        Ok(())
    }

    /// Place a trade (buy YES or NO shares)
    pub fn place_trade(
        ctx: Context<PlaceTrade>,
        outcome: bool, // true = YES, false = NO
        amount: u64,   // SOL amount in lamports
    ) -> Result<()> {
        // Get immutable references FIRST before mutable borrow
        let market_key = ctx.accounts.market.key();
        let market_account_info = ctx.accounts.market.to_account_info();
        
        let market = &mut ctx.accounts.market;
        
        require!(!market.resolved, DjinnError::MarketResolved);
        require!(amount > 0, DjinnError::InvalidAmount);
        require!(Clock::get()?.unix_timestamp < market.resolution_time, DjinnError::TradingClosed);

        // Calculate 0.1% trading fee
        let trading_fee = (amount * TRADING_FEE_BPS) / BPS_DENOMINATOR;
        let amount_after_fee = amount - trading_fee;

        // Split trading fee based on creator
        let (creator_fee, protocol_fee) = if ctx.accounts.trader.key() == market.creator {
            // Trader is creator: 100% to protocol (you)
            (0u64, trading_fee)
        } else {
            // 50% to creator, 50% to protocol
            let creator_share = trading_fee / 2;
            let protocol_share = trading_fee - creator_share;
            (creator_share, protocol_share)
        };

        // Transfer protocol fee to treasury
        if protocol_fee > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.trader.to_account_info(),
                        to: ctx.accounts.protocol_treasury.to_account_info(),
                    },
                ),
                protocol_fee,
            )?;
        }

        // Transfer creator fee if applicable
        if creator_fee > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.trader.to_account_info(),
                        to: ctx.accounts.market_creator.to_account_info(),
                    },
                ),
                creator_fee,
            )?;
        }

        // Calculate shares using simple CPMM (Constant Product Market Maker)
        // For MVP: simplified pricing where 1 SOL ≈ 1 share
        // TODO: Implement proper LMSR or CPMM in production
        let shares_to_mint = amount_after_fee;

        // Mint shares to trader
        let bump = market.bump;
        let seeds = &[
            b"market".as_ref(),
            market_key.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: if outcome {
                ctx.accounts.yes_token_mint.to_account_info()
            } else {
                ctx.accounts.no_token_mint.to_account_info()
            },
            to: if outcome {
                ctx.accounts.trader_yes_account.to_account_info()
            } else {
                ctx.accounts.trader_no_account.to_account_info()
            },
            authority: market_account_info,
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::mint_to(cpi_ctx, shares_to_mint)?;

        // Update market pools
        if outcome {
            market.yes_pool += amount_after_fee;
            market.total_yes_shares += shares_to_mint;
        } else {
            market.no_pool += amount_after_fee;
            market.total_no_shares += shares_to_mint;
        }

        // Update position
        let position = &mut ctx.accounts.position;
        if outcome {
            position.yes_shares += shares_to_mint;
        } else {
            position.no_shares += shares_to_mint;
        }

        // Update protocol stats
        ctx.accounts.protocol_state.total_volume += amount;
        ctx.accounts.protocol_state.total_fees_collected += protocol_fee;

        msg!("Trade placed: {} SOL for {} {} shares", amount, shares_to_mint, if outcome { "YES" } else { "NO" });
        msg!("Fees: protocol={}, creator={}", protocol_fee, creator_fee);
        
        Ok(())
    }

    /// Resolve market (only protocol authority)
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_outcome: bool, // true = YES won, false = NO won
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        require!(!market.resolved, DjinnError::AlreadyResolved);
        require!(
            ctx.accounts.authority.key() == market.protocol_authority,
            DjinnError::Unauthorized
        );
        require!(
            Clock::get()?.unix_timestamp >= market.resolution_time,
            DjinnError::TooEarly
        );

        // Calculate 2% resolution fee from total pool
        let total_pool = market.yes_pool + market.no_pool;
        let resolution_fee = (total_pool * RESOLUTION_FEE_BPS) / BPS_DENOMINATOR;

        // Transfer resolution fee to protocol treasury
        // Note: In production, this should come from an escrow account
        // For MVP, we'll handle this in the redeem function

        market.resolved = true;
        market.winning_outcome = Some(winning_outcome);

        // Update protocol stats
        ctx.accounts.protocol_state.total_fees_collected += resolution_fee;

        msg!("Market resolved! Winning outcome: {}", if winning_outcome { "YES" } else { "NO" });
        msg!("Resolution fee: {} lamports", resolution_fee);
        
        Ok(())
    }

    /// Redeem winnings (after market resolution)
    pub fn redeem(ctx: Context<Redeem>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.position;
        
        require!(market.resolved, DjinnError::NotResolved);
        
        let winning_outcome = market.winning_outcome.ok_or(DjinnError::NotResolved)?;
        
        // Calculate payout
        let (user_shares, total_shares, pool_amount) = if winning_outcome {
            (position.yes_shares, market.total_yes_shares, market.yes_pool)
        } else {
            (position.no_shares, market.total_no_shares, market.no_pool)
        };

        require!(user_shares > 0, DjinnError::NoWinningShares);

        // Calculate proportional payout
        let total_pool = market.yes_pool + market.no_pool;
        let resolution_fee = (total_pool * RESOLUTION_FEE_BPS) / BPS_DENOMINATOR;
        let pool_after_fee = total_pool - resolution_fee;
        
        let payout = (user_shares as u128 * pool_after_fee as u128 / total_shares as u128) as u64;

        // TODO: Transfer SOL from escrow to user
        // For MVP, this would need an escrow account holding all SOL

        // Clear position
        position.yes_shares = 0;
        position.no_shares = 0;

        msg!("Redeemed {} shares for {} lamports", user_shares, payout);
        
        Ok(())
    }
}

// ============================================
// Account Structures
// ============================================

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolState::LEN,
        seeds = [b"protocol"],
        bump
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Protocol treasury wallet
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Market::LEN,
        seeds = [b"market", creator.key().as_ref(), &protocol_state.total_markets.to_le_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub protocol_state: Account<'info, ProtocolState>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// CHECK: Protocol treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceTrade<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        init_if_needed,
        payer = trader,
        space = 8 + Position::LEN,
        seeds = [b"position", market.key().as_ref(), trader.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    
    #[account(mut)]
    pub protocol_state: Account<'info, ProtocolState>,
    
    #[account(mut)]
    pub trader: Signer<'info>,
    
    /// CHECK: Market creator for fee split
    #[account(mut)]
    pub market_creator: AccountInfo<'info>,
    
    /// CHECK: Protocol treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
    
    #[account(mut)]
    pub yes_token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub no_token_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub trader_yes_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub trader_no_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub protocol_state: Account<'info, ProtocolState>,
    
    pub authority: Signer<'info>,
    
    /// CHECK: Protocol treasury
    #[account(mut)]
    pub protocol_treasury: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub position: Account<'info, Position>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

// ============================================
// State Accounts
// ============================================

#[account]
pub struct ProtocolState {
    pub authority: Pubkey,        // Protocol owner (you)
    pub treasury: Pubkey,          // Treasury wallet
    pub total_markets: u64,        // Total markets created
    pub total_volume: u64,         // Total trading volume
    pub total_fees_collected: u64, // Total fees earned
}

impl ProtocolState {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8;
}

#[account]
pub struct Market {
    pub creator: Pubkey,              // Who created this market
    pub protocol_authority: Pubkey,   // Protocol owner
    pub title: String,                // Market question (max 200 chars)
    pub description: String,          // Market description (max 1000 chars)
    pub yes_pool: u64,                // SOL in YES pool
    pub no_pool: u64,                 // SOL in NO pool
    pub total_yes_shares: u64,        // Total YES tokens minted
    pub total_no_shares: u64,         // Total NO tokens minted
    pub resolution_time: i64,         // Unix timestamp
    pub resolved: bool,               // Is market resolved?
    pub winning_outcome: Option<bool>, // true = YES, false = NO, None = unresolved
    pub creation_fee_paid: u64,       // Fee paid at creation
    pub bump: u8,                     // PDA bump
}

impl Market {
    pub const LEN: usize = 32 + 32 + 204 + 1004 + 8 + 8 + 8 + 8 + 8 + 1 + 2 + 8 + 1;
}

#[account]
pub struct Position {
    pub user: Pubkey,
    pub market: Pubkey,
    pub yes_shares: u64,
    pub no_shares: u64,
}

impl Position {
    pub const LEN: usize = 32 + 32 + 8 + 8;
}

// ============================================
// Errors
// ============================================

#[error_code]
pub enum DjinnError {
    #[msg("Title too long (max 200 characters)")]
    TitleTooLong,
    
    #[msg("Description too long (max 1000 characters)")]
    DescriptionTooLong,
    
    #[msg("Invalid resolution time")]
    InvalidResolutionTime,
    
    #[msg("Market already resolved")]
    MarketResolved,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Trading is closed")]
    TradingClosed,
    
    #[msg("Market already resolved")]
    AlreadyResolved,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Too early to resolve")]
    TooEarly,
    
    #[msg("Market not resolved yet")]
    NotResolved,
    
    #[msg("No winning shares to redeem")]
    NoWinningShares,
}
