# BACKEND_STRUCTURE.md - Data & Protocol Architecture

## 🏛️ Hybrid Architecture
Djinn uses a specialized hybrid model:
1.  **On-Chain (Solana/Anchor):** Value transfer, bonding curve math, share ownership, market resolution. **(The Source of Truth for Money)**
2.  **Off-Chain (Supabase):** Social graphics, comments, activity feeds, caching, and profile data. **(The Source of Truth for UX)**

---

## 🔗 On-Chain (Solana Program: `djinn-market`)

### Accounts

#### 1. `Market` (PDA)
Holds the state of a single prediction market.
- `creator`: Pubkey
- `outcome_supplies`: [u64; 6] (Shares per outcome)
- `total_liquidity`: u64 (Total SOL in vault)
- `status`: Enum (Active, Resolved, Void)
- `winning_outcome`: Option<u8>
- `resolution_time`: i64

#### 2. `UserPosition` (PDA)
Records a user's holdings in a specific market.
- `market`: Pubkey
- `user`: Pubkey
- `shares`: [u128; 6] (Shares held per outcome)
- `claimed`: bool

---

## 🗄️ Off-Chain (Supabase)

### Table: `profiles`
User identity and gamification stats.
- `wallet_address` (PK, Text): Solana public key.
- `username` (Text): Unique display name.
- `bio` (Text): User biography.
- `avatar_url` (Text): URL to image.
- `gems` (Int): Gamification currency (Off-chain points).
- `views` (Int): Profile views.

### Table: `markets` (Cache/Index)
Mirrors on-chain markets for fast querying/searching.
- `slug` (PK, Text): Unique URL-friendly ID.
- `market_pda` (Text): Solana PDA address.
- `title` (Text)
- `category` (Text)
- `end_date` (Timestamp)
- `total_yes_pool` (Float): Cached for sorting.
- `total_no_pool` (Float): Cached for sorting.
- `volume` (Float)

### Table: `activity`
Feeds the "Recent Activity" stream.
- `id` (PK, UUID)
- `wallet_address` (FK -> profiles)
- `market_slug` (FK -> markets)
- `action` (Enum: BUY, SELL, CLAIM)
- `amount` (Float): USD value.
- `shares` (Float)
- `side` (Text): "YES" / "NO" / "Outcome Name"

### Table: `comments`
Social layer for markets.
- `id` (PK, UUID)
- `market_slug` (FK)
- `wallet_address` (FK)
- `text` (Text)
- `parent_id` (UUID, Nullable): For threaded replies.

---

## 📐 Constants (Synchronization Required)
These values MUST MUST match between `lib.rs` (Rust) and `core-amm.ts` (TypeScript).

| Constant | Value | Purpose |
|----------|-------|---------|
| `TOTAL_SUPPLY` | 1,000,000,000 | Max Theoretical Shares |
| `VIRTUAL_OFFSET` | 1,000,000 | "Anchor" to prevent 0-liquidity volatility |
| `PHASE1_END` | 100,000,000 | End of Linear Phase |
| `PHASE2_END` | 200,000,000 | End of Quadratic Phase |
| `P_START` | 0.000001 SOL | Starting Price |
| `P_MAX` | 0.95 SOL | Max Solvency Price |
