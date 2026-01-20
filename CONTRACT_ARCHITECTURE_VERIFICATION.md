# Contract Architecture Verification

## 🔍 Evidence: Internal Ledger vs SPL Tokens

**Date:** 2026-01-19
**Disputed Claim:** "The contract uses `token::mint_to` to mint SPL tokens"

---

## Evidence Collected:

### 1. Search for `mint_to` calls:
```bash
grep -n "mint_to" programs/djinn-market/programs/djinn-market/src/lib.rs
# Result: NO MATCHES
```

### 2. Search for any token operations:
```bash
grep -n "token::" programs/djinn-market/programs/djinn-market/src/lib.rs
# Result: Only line 2: use anchor_spl::token::{self, Mint, Token};
```

### 3. Line 317 Content:
```rust
// Line 317 is NOT a mint_to call, it's inside metadata creation:
317:    name: no_name,
```

### 4. BuyShares Context (lines 669-698):
```rust
pub struct BuyShares<'info> {
    pub market: Box<Account<'info, Market>>,
    pub market_vault: AccountInfo<'info>,
    pub user_position: Box<Account<'info, UserPosition>>, // ← PDA, not token account
    pub user: Signer<'info>,
    pub protocol_treasury: AccountInfo<'info>,
    pub market_creator: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
```

**NO token accounts present** (no `yes_token_account`, `no_token_account`, etc.)

### 5. Buy Logic (lines 333-430):
```rust
pub fn buy_shares(...) -> Result<()> {
    // ... fee calculation ...
    // ... shares calculation ...

    // Line 367: Updates PDA
    position.shares = position.shares.checked_add(shares).unwrap();

    // Lines 370-379: SOL transfer (NOT token mint)
    anchor_lang::system_program::transfer(
        CpiContext::new(...),
        net_sol as u64,
    )?;

    // NO token::mint_to call
}
```

---

## Conclusion:

The **current deployed contract** on Devnet (`DY1X52RW55bpNU5ZA8E3m6w1w7VG1ioHKpUt7jUkYSV9`) uses:

1. ✅ **YES/NO Mints** (created in `initialize_market`)
2. ✅ **Metaplex Metadata** (with names like `[YES] - Market Title`)
3. ✅ **UserPosition PDAs** (track share balances internally)
4. ❌ **NO SPL token minting** (no `mint_to` calls in buy/sell logic)

---

## Why Phantom Won't Show Tokens:

Because there are **zero tokens minted** to users:
- Token accounts exist but have **0 balance**
- Phantom only displays accounts with **>0 balance**
- Shares live in PDA (`UserPosition.shares` field)

---

## Possible Confusion Sources:

1. **Different contract version:** Perhaps an older/newer version had SPL minting?
2. **Documentation mismatch:** Comments in code may describe intended behavior, not current
3. **Planned feature:** Token minting might be a future upgrade?

---

## Recommendation:

If you WANT tokens to appear in Phantom, you need to:

1. Add token accounts to `BuyShares` context:
```rust
pub struct BuyShares<'info> {
    // ... existing accounts ...

    #[account(mut)]
    pub yes_mint: Account<'info, Mint>,

    #[account(mut)]
    pub no_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
```

2. Add minting logic to `buy_shares()`:
```rust
// After calculating shares...
token::mint_to(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::MintTo {
            mint: if outcome == 0 {
                ctx.accounts.yes_mint.to_account_info()
            } else {
                ctx.accounts.no_mint.to_account_info()
            },
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: market.to_account_info(),
        },
        signer_seeds,
    ),
    shares as u64,
)?;
```

3. Redeploy contract

---

**Current Status:** Contract uses internal ledger (PDA-based). Tokens won't appear in Phantom.
