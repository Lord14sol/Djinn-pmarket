// ═══════════════════════════════════════════════════════════════════════════════
// CHRONOS MARKET MODULE - Automated Time-Based Crypto Markets
// ═══════════════════════════════════════════════════════════════════════════════
//
// Chronos markets are automated prediction markets for BTC, ETH, SOL with:
// - Fixed time intervals (1 hour or 15 minutes)
// - Strike price set at market creation via Pyth
// - Trustless resolution using Pyth final price
// - Keeper bot automation for hourly creation
//
// ═══════════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;

// --- PYTH PRICE FEED IDS (Mainnet) ---
// These are the official Pyth price feed IDs for mainnet-beta
pub const PYTH_BTC_USD: &str = "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
pub const PYTH_ETH_USD: &str = "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";  
pub const PYTH_SOL_USD: &str = "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

// --- ASSET TYPES ---
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AssetType {
    BTC = 0,
    ETH = 1,
    SOL = 2,
}

impl AssetType {
    pub fn pyth_feed_id(&self) -> &'static str {
        match self {
            AssetType::BTC => PYTH_BTC_USD,
            AssetType::ETH => PYTH_ETH_USD,
            AssetType::SOL => PYTH_SOL_USD,
        }
    }
    
    pub fn symbol(&self) -> &'static str {
        match self {
            AssetType::BTC => "BTC",
            AssetType::ETH => "ETH",
            AssetType::SOL => "SOL",
        }
    }
}

// --- MARKET STATUS ---
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChronosStatus {
    Pending = 0,   // Created but not yet started (waiting for start_time)
    Active = 1,    // Trading is open
    Locked = 2,    // Last 60 seconds before end - no new trades
    Resolved = 3,  // Market resolved with final price
}

// --- MARKET INTERVAL ---
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketInterval {
    FifteenMinutes = 0,  // 15 min markets (high frequency)
    OneHour = 1,         // 1 hour markets (standard)
    Daily = 2,           // 24 hour markets (strategic)
    Weekly = 3,          // 7 day markets (jackpot)
}

impl MarketInterval {
    pub fn duration_seconds(&self) -> i64 {
        match self {
            MarketInterval::FifteenMinutes => 15 * 60,      // 900 secons
            MarketInterval::OneHour => 60 * 60,             // 3600 seconds
            MarketInterval::Daily => 24 * 60 * 60,          // 86,400 seconds
            MarketInterval::Weekly => 7 * 24 * 60 * 60,     // 604,800 seconds
        }
    }
    
    pub fn lock_seconds(&self) -> i64 {
        // Lock trading in the last minute
        60
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHRONOS MARKET ACCOUNT
// ═══════════════════════════════════════════════════════════════════════════════

#[account]
pub struct ChronosMarket {
    // --- Identity ---
    pub asset: AssetType,              // BTC, ETH, or SOL
    pub interval: MarketInterval,       // 15min or 1hour
    pub round_number: u64,             // Sequential round number (e.g., round 1, 2, 3...)
    
    // --- Pricing ---
    pub target_price: u64,             // Strike price in USD cents (e.g., $98000.00 = 9800000)
    pub final_price: Option<u64>,      // Final price at resolution (None until resolved)
    pub pyth_price_feed: Pubkey,       // Pyth price account pubkey
    
    // --- Timing ---
    pub start_time: i64,               // Unix timestamp when market started
    pub end_time: i64,                 // Unix timestamp when market ends (start + interval)
    pub resolution_time: Option<i64>,  // When market was actually resolved
    
    // --- State ---
    pub status: ChronosStatus,
    pub winning_outcome: Option<u8>,   // 0 = YES (above target), 1 = NO (below target)
    
    // --- Bonding Curve State (per outcome) ---
    // Outcome 0 = YES (price above target)
    // Outcome 1 = NO (price below target)
    pub outcome_supplies: [u128; 2],   // Supply for YES and NO
    pub vault_balance: u128,           // Total SOL in vault (Lamports)
    pub total_pot_at_resolution: u64,  // Snapshot for fair claiming
    
    // --- PDA Bumps ---
    pub bump: u8,
    pub vault_bump: u8,
    
    // --- Keeper Info ---
    pub keeper: Pubkey,                // Keeper bot that created this market
}

impl ChronosMarket {
    // Space calculation for account initialization
    pub const LEN: usize = 8      // Discriminator
        + 1                        // asset (enum)
        + 1                        // interval (enum)  
        + 8                        // round_number
        + 8                        // target_price
        + (1 + 8)                  // final_price (Option<u64>)
        + 32                       // pyth_price_feed
        + 8                        // start_time
        + 8                        // end_time
        + (1 + 8)                  // resolution_time (Option<i64>)
        + 1                        // status (enum)
        + (1 + 1)                  // winning_outcome (Option<u8>)
        + (2 * 16)                 // outcome_supplies ([u128; 2])
        + 16                       // vault_balance
        + 8                        // total_pot_at_resolution
        + 1                        // bump
        + 1                        // vault_bump
        + 32;                      // keeper
    
    // Check if market is currently in trading phase
    pub fn is_trading_active(&self, now: i64) -> bool {
        self.status == ChronosStatus::Active 
            && now >= self.start_time 
            && now < (self.end_time - self.interval.lock_seconds())
    }
    
    // Check if market is in lock period (no new trades)
    pub fn is_locked(&self, now: i64) -> bool {
        now >= (self.end_time - self.interval.lock_seconds()) && now < self.end_time
    }
    
    // Check if market can be resolved
    pub fn can_resolve(&self, now: i64) -> bool {
        self.status != ChronosStatus::Resolved && now >= self.end_time
    }
    
    // Generate market title
    pub fn title(&self) -> String {
        let symbol = self.asset.symbol();
        let target_usd = self.target_price as f64 / 100.0;
        format!("{} above ${:.0} at end of round?", symbol, target_usd)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER POSITION FOR CHRONOS MARKETS
// ═══════════════════════════════════════════════════════════════════════════════

#[account]
pub struct ChronosPosition {
    pub owner: Pubkey,           // User wallet (for filtering)
    pub market: Pubkey,          // ChronosMarket pubkey
    pub outcome: u8,             // 0 = YES, 1 = NO
    pub shares: u128,            // Number of shares held
    pub claimed: bool,           // Whether winnings have been claimed
}

impl ChronosPosition {
    pub const LEN: usize = 8     // Discriminator
        + 32                     // owner
        + 32                     // market
        + 1                      // outcome
        + 16                     // shares
        + 1;                     // claimed
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHRONOS ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum ChronosError {
    #[msg("Market is not active for trading")]
    MarketNotActive,
    
    #[msg("Market is not resolved")]
    MarketNotResolved,
    
    #[msg("Market is in lock period - no new trades allowed")]
    MarketLocked,
    
    #[msg("Market has not ended yet")]
    MarketNotEnded,
    
    #[msg("Market is already resolved")]
    AlreadyResolved,
    
    #[msg("Invalid Pyth price data")]
    InvalidPythPrice,
    
    #[msg("Pyth price is stale")]
    StalePythPrice,
    
    #[msg("Invalid outcome (must be 0 or 1)")]
    InvalidOutcome,
    
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    
    #[msg("Insufficient shares")]
    InsufficientShares,
    
    #[msg("Already claimed winnings")]
    AlreadyClaimed,
    
    #[msg("No shares to claim")]
    NoShares,
    
    #[msg("Not a winning position")]
    NotWinner,
    
    #[msg("Unauthorized keeper")]
    UnauthorizedKeeper,
    
    #[msg("Invalid asset type")]
    InvalidAsset,
    
    #[msg("Invalid interval type")]
    InvalidInterval,
    
    #[msg("Round number mismatch")]
    RoundMismatch,
}

// ═══════════════════════════════════════════════════════════════════════════════
// PYTH PRICE PARSING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Parse Pyth price from account data
/// Returns price in USD cents (e.g., $98000.00 = 9800000)
pub fn parse_pyth_price(price_account_data: &[u8]) -> Result<u64> {
    // Pyth price account structure (simplified):
    // - price (i64) at offset 208
    // - expo (i32) at offset 216
    // - publish_time (i64) at offset 232
    
    if price_account_data.len() < 240 {
        return Err(ChronosError::InvalidPythPrice.into());
    }
    
    // Read price (i64 at offset 208)
    let price_bytes: [u8; 8] = price_account_data[208..216].try_into()
        .map_err(|_| ChronosError::InvalidPythPrice)?;
    let price = i64::from_le_bytes(price_bytes);
    
    // Read expo (i32 at offset 216)
    let expo_bytes: [u8; 4] = price_account_data[216..220].try_into()
        .map_err(|_| ChronosError::InvalidPythPrice)?;
    let expo = i32::from_le_bytes(expo_bytes);
    
    // Convert to USD cents
    // Pyth prices are price * 10^expo
    // We want cents, so we need price * 10^(expo + 2)
    let price_cents = if expo >= -2 {
        // Positive or small negative exponent
        (price as u64) * 10u64.pow((expo + 2) as u32)
    } else {
        // Large negative exponent (common case: expo = -8)
        let divisor = 10u64.pow((-expo - 2) as u32);
        (price as u64) / divisor
    };
    
    Ok(price_cents)
}

/// Check if Pyth price is fresh (within last 60 seconds)
pub fn is_pyth_price_fresh(price_account_data: &[u8], current_time: i64) -> Result<bool> {
    if price_account_data.len() < 240 {
        return Err(ChronosError::InvalidPythPrice.into());
    }
    
    // Read publish_time (i64 at offset 232)
    let time_bytes: [u8; 8] = price_account_data[232..240].try_into()
        .map_err(|_| ChronosError::InvalidPythPrice)?;
    let publish_time = i64::from_le_bytes(time_bytes);
    
    // Price is fresh if published within last 60 seconds
    Ok(current_time - publish_time <= 60)
}
