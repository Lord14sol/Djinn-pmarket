use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};

declare_id!("51TPDYh8oFCBCiCRFLvvtFpZvQd3Q4FyjLnDe9xxCsmv"); // Kept user's deployed ID

const MARKET_CREATION_FEE: u64 = 20_000_000; // 0.02 SOL
const BPS_DENOMINATOR: u64 = 10_000;

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
        fee_percentage: u16, // User requested dynamic fee
        resolution_time: i64,
    ) -> Result<()> {
        require!(fee_percentage <= 1000, DjinnError::FeeTooHigh); // Max 10%

        // Transfer creation fee
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
        market.total_liquidity = 0;
        market.total_shares_yes = 0;
        market.total_shares_no = 0;
        market.fee_percentage = fee_percentage;
        market.resolution_time = resolution_time;
        market.status = MarketStatus::Open;
        market.outcome = MarketOutcome::None;
        market.bump = ctx.bumps.market;

        msg!("Market created with {}bps fee", fee_percentage);
        Ok(())
    }

    /// Place a bet: User sends SOL, gets 1:1 Shares (Tokens)
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        side: MarketOutcome, 
        amount: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Open, DjinnError::MarketClosed);
        require!(Clock::get()?.unix_timestamp < market.resolution_time, DjinnError::MarketExpired);
        require!(amount > 0, DjinnError::InvalidAmount);
        
        // 1. Transfer SOL to Market PDA (Escrow)
        // Note: In a real app, you might send to a separate Vault account. 
        // For simplicity/MVP, we send to the Market PDA itself (it can hold SOL).
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: market.to_account_info(),
                },
            ),
            amount,
        )?;

        // 2. Mint Shares (Tokens) 1:1
        let seeds = &[
            b"market".as_ref(),
            market.creator.as_ref(),
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
            amount,
        )?;

        // 3. Update State
        market.total_liquidity += amount;
        match side {
            MarketOutcome::Yes => market.total_shares_yes += amount,
            MarketOutcome::No => market.total_shares_no += amount,
            _ => {},
        }

        msg!("Bet placed: {} lamports on {:?}", amount, side);
        Ok(())
    }

    /// Resolve Market: Admin sets winning outcome
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: MarketOutcome,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let protocol = &ctx.accounts.protocol_state;
        
        require!(ctx.accounts.authority.key() == protocol.authority, DjinnError::Unauthorized);
        require!(market.status == MarketStatus::Open, DjinnError::AlreadyResolved);
        require!(outcome != MarketOutcome::None, DjinnError::InvalidOutcome);

        market.outcome = outcome;
        market.status = MarketStatus::Resolved; // or Claiming

        msg!("Market resolved to {:?}", outcome);
        Ok(())
    }

    /// Claim Reward: Burn shares, calculating payout
    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Resolved, DjinnError::NotResolved);

        let user_shares_yes = ctx.accounts.user_yes_account.amount;
        let user_shares_no = ctx.accounts.user_no_account.amount;
        let total_shares_yes = market.total_shares_yes;
        let total_shares_no = market.total_shares_no;
        let total_pot = market.total_liquidity;

        let mut payout: u64 = 0;
        let mut burn_amount: u64 = 0;
        let mut burn_mint_is_yes = false;

        match market.outcome {
            MarketOutcome::Yes => {
                // EDGE CASE: If nobody bet YES, treating as VOID (Refund)
                if total_shares_yes == 0 {
                    // Start refund logic: User gets back their NO bets 1:1? 
                    // No, if YES wins but nobody has YES, the NO bettors lost. 
                    // But the money is stuck. 
                    // Logic: Refund everyone their original deposit.
                    // User holds NO shares -> gets 1:1 refund? No, they lost.
                    // User holds YES shares -> 0.
                    // If total_shares_yes is 0, then NO ONE can claim this block.
                    // The pot belongs to... the protocol? Or we enable VOID mode.
                    
                    // Let's implement Strict Refund for THIS user's holdings (1:1) basically treating it as VOID.
                    // If I hold YES, I get 1 SOL per share. (But I can't hold YES if total is 0).
                    // If I hold NO, I get 1 SOL per share.
                    burn_amount = user_shares_no; // Refund losing side too?
                    payout = user_shares_no;
                    burn_mint_is_yes = false;
                } else {
                    // Standard Win
                    if user_shares_yes > 0 {
                        burn_amount = user_shares_yes;
                        burn_mint_is_yes = true;

                        // Payout = (UserShares / TotalWinningShares) * (Pot - Fee)
                        let fee = (total_pot as u128 * market.fee_percentage as u128 / BPS_DENOMINATOR as u128) as u64;
                        let pot_after_fee = total_pot - fee;

                        // Use u128 to prevent overflow
                        payout = (user_shares_yes as u128 * pot_after_fee as u128 / total_shares_yes as u128) as u64;

                        // Transfer Fee to Treasury (Only done once ideally, but here done per claim implicitly by leaving dust)
                        // Actually, we should transfer the fee-share for THIS claim to treasury now.
                        let fee_share = (user_shares_yes as u128 * fee as u128 / total_shares_yes as u128) as u64;
                        **market.to_account_info().try_borrow_mut_lamports()? -= fee_share;
                        **ctx.accounts.protocol_treasury.try_borrow_mut_lamports()? += fee_share;
                    }
                }
            },
            MarketOutcome::No => {
                if total_shares_no == 0 {
                     // Void logic
                     burn_amount = user_shares_yes; 
                     payout = user_shares_yes;
                     burn_mint_is_yes = true;
                } else {
                    if user_shares_no > 0 {
                        burn_amount = user_shares_no;
                        burn_mint_is_yes = false;

                        let fee = (total_pot as u128 * market.fee_percentage as u128 / BPS_DENOMINATOR as u128) as u64;
                        let pot_after_fee = total_pot - fee;
                        payout = (user_shares_no as u128 * pot_after_fee as u128 / total_shares_no as u128) as u64;
                        
                        // Fee transfer
                        let fee_share = (user_shares_no as u128 * fee as u128 / total_shares_no as u128) as u64;
                        **market.to_account_info().try_borrow_mut_lamports()? -= fee_share;
                        **ctx.accounts.protocol_treasury.try_borrow_mut_lamports()? += fee_share;
                    }
                }
            },
            MarketOutcome::Void => {
                // Refund 1:1 for everyone
                if user_shares_yes > 0 {
                    burn_amount = user_shares_yes;
                    payout = user_shares_yes;
                    burn_mint_is_yes = true;
                } else if user_shares_no > 0 {
                    burn_amount = user_shares_no;
                    payout = user_shares_no;
                    burn_mint_is_yes = false;
                }
            },
            _ => return err!(DjinnError::InvalidOutcome),
        }

        require!(payout > 0, DjinnError::NothingToClaim);

        // 1. Burn Shares
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
                    authority: ctx.accounts.user.to_account_info(), // User signs burn
                },
            ),
            burn_amount,
        )?;

        // 2. Transfer SOL Payout
        **market.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;

        msg!("Claimed {} lamports, burned {} shares", payout, burn_amount);
        Ok(())
    }
}

// --- DATA STRUCTURES ---

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum MarketStatus {
    Open,
    Resolved,
    Voided
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum MarketOutcome {
    None,
    Yes,
    No,
    Void
}

#[account]
pub struct Market {
    pub creator: Pubkey,
    pub title: String,
    pub total_liquidity: u64,
    pub total_shares_yes: u64,
    pub total_shares_no: u64,
    pub fee_percentage: u16,   // e.g. 200 = 2.00%
    pub resolution_time: i64,
    pub status: MarketStatus,
    pub outcome: MarketOutcome,
    pub bump: u8,
}

impl Market {
    // 8 + 32 + 204 + 8 + 8 + 8 + 2 + 8 + 1 + 1 + 1 = ~281 bytes. 
    // Allowing extra space for safety.
    pub const LEN: usize = 300; 
}

#[account]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub treasury: Pubkey,
}

impl ProtocolState { pub const LEN: usize = 8 + 32 + 32; }

// --- ACCOUNTS ---

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
pub struct CreateMarket<'info> {
    #[account(init, payer = creator, space = Market::LEN, seeds = [b"market", creator.key().as_ref()], bump)]
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

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
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
}
