# Djinn: The Autonomous Prediction Protocol

<div align="center">

**V4.0 "Aggressive" | Self-Custodial | On-Chain Solvent**

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## Core Philosophy

Djinn is a **Pure AMM (Automated Market Maker)** for binary and multi-outcome events. It eliminates the need for order books or matching counterparties by using a mathematical **Bonding Curve** to guarantee immediate liquidity for any trade size.

Unlike traditional models, **Liquidity is the Market**. Every share purchased increases the price for the next buyer, creating a deterministic, tamper-proof price discovery mechanism.

---

## Key Technical Concepts

### 1. Independent Outcomes (Memecoin-Style Trading)

Each outcome in a market (YES/NO, or multiple options like Brazil/Argentina/Germany) operates as an **independent bonding curve**:

```
Market: "Who will win World Cup 2026?"

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   BRAZIL        │  │   ARGENTINA     │  │   GERMANY       │
│   Supply: 50M   │  │   Supply: 30M   │  │   Supply: 10M   │
│   Price: 0.012  │  │   Price: 0.008  │  │   Price: 0.003  │
│   MCAP: 0.6 SOL │  │   MCAP: 0.24 SOL│  │   MCAP: 0.03 SOL│
└─────────────────┘  └─────────────────┘  └─────────────────┘
        ↓                    ↓                    ↓
   Independent          Independent          Independent
   Bonding Curve        Bonding Curve        Bonding Curve
```

**Key Points:**
- Buying BRAZIL shares does NOT affect ARGENTINA's price
- Each outcome has its own `outcome_supplies[index]` in the smart contract
- Early buyers get more shares for less SOL (memecoin mechanics)
- Your position multiplies in value when others buy after you

### 2. Account-Based Shares (NOT SPL Tokens)

Djinn uses **account-based shares** rather than SPL tokens:

```rust
#[account]
pub struct UserPosition {
    pub market: Pubkey,
    pub outcome: u8,      // 0 = YES, 1 = NO, etc.
    pub shares: u128,     // Shares stored in account, NOT transferable
    pub claimed: bool,
}
```

**Why NOT SPL Tokens?**

| Feature | Account-Based (Current) | SPL Token |
|---------|------------------------|-----------|
| Trading on Djinn | ✅ | ✅ |
| Deterministic pricing | ✅ | ❌ (arbitrage issues) |
| Simple resolution | ✅ | ❌ (tokens dispersed) |
| Trading on Jupiter/Raydium | ❌ | ⚠️ (breaks mechanics) |
| P2P transfers | ❌ | ✅ |
| DeFi composability | ❌ | ✅ |

**The trade flow:**
```
BUY:  User → SOL → Market Vault → Shares credited to UserPosition
SELL: User → Burns shares from UserPosition → SOL from Vault
```

The "pair" is always: `SHARES ↔ BONDING CURVE ↔ SOL VAULT`

No external AMM. No liquidity pools. It's a **closed system** where all liquidity is in the market vault.

### 3. Probability Buffer (Anti-Explosion Mechanism)

To prevent probability from jumping to 100% on low liquidity, we use a **Virtual Floor** of 15M shares per side:

```typescript
// lib/core-amm.ts
export const PROBABILITY_BUFFER = 15_000_000; // 15M shares

export function calculateImpliedProbability(yesSupply: number, noSupply: number): number {
    const VIRTUAL_FLOOR = PROBABILITY_BUFFER;

    const adjustedYes = yesSupply + VIRTUAL_FLOOR;
    const adjustedNo = noSupply + VIRTUAL_FLOOR;

    return (adjustedYes / (adjustedYes + adjustedNo)) * 100;
}
```

**Effect on probability:**

| Buy Amount | YES Supply | NO Supply | Probability |
|------------|------------|-----------|-------------|
| 0 SOL | 0 | 0 | **50%** |
| 1 SOL | ~10M | 0 | **62.5%** |
| 3 SOL | ~30M | 0 | **75%** |
| 5 SOL | ~50M | 0 | **76.9%** |
| 10 SOL | ~80M | 0 | **84.2%** |

**Without buffer:** 5 SOL buy would push to ~99.9% (broken)
**With buffer:** 5 SOL buy reaches ~77% (reasonable)

---

## The Lifecycle Flow

### 1. Creation (Genesis)
- User creates a new market (e.g., "Will BTC hit $100k?")
- Protocol initializes a **Market PDA** with `outcome_supplies: [0; 6]`
- Sets **Virtual Anchor** (1M shares) for price stability
- Creation fee: 0.01 SOL to Treasury
- Status: `Active`

### 2. Trading (Active Phase)

**Buying:**
```
User SOL → Vault
Contract calculates shares via Bonding Curve
UserPosition.shares += calculated_shares
outcome_supplies[index] += calculated_shares
Fee: 1% (50% Creator, 50% Treasury)
```

**Selling:**
```
User burns shares from UserPosition
Contract calculates SOL via Bonding Curve
Vault → User SOL
outcome_supplies[index] -= burned_shares
Fee: 1% (50% Creator, 50% Treasury)
```

### 3. Resolution (Cerberus Oracle)

The **Cerberus 3-Dog System** handles verification:

1. **$34k MCAP Trigger**: When combined MCAP reaches ~330 SOL (~$34,000 USD), Cerberus activates
2. **DOG 1**: Initial fact-gathering
3. **DOG 2**: Cross-verification
4. **DOG 3**: Final verdict (VERIFIED / UNCERTAIN / REJECTED)

```typescript
// lib/core-amm.ts
export const GRADUATION_MCAP_SOL = 330; // ~$34k USD at $100/SOL

export function getIgnitionProgressMcap(totalMcapSol: number): number {
    return Math.min(100, (totalMcapSol / GRADUATION_MCAP_SOL) * 100);
}
```

**Resolution Mechanics:**
- Snapshot: `total_pot_at_resolution` freezes the pot
- Resolution Fee: 2% deducted
- Status: `Resolved`
- Winner declared: `winning_outcome = Some(index)`

### 4. Settlement (Claiming)

Winners call `claim_winnings`:
```
Payout = (My Shares / Total Winning Shares) * Final Pot
```

Auto-close refunds rent SOL (~0.002) alongside winnings.

---

## The Math: 3-Phase Piecewise Bonding Curve

### Constants (Synchronized: lib.rs ↔ core-amm.ts)

```typescript
// Frontend (core-amm.ts)
TOTAL_SUPPLY = 1_000_000_000    // 1B Shares
VIRTUAL_OFFSET = 1_000_000      // 1M Virtual Anchor
PHASE1_END = 100_000_000        // 100M
PHASE2_END = 200_000_000        // 200M
P_START = 0.000001              // 1000 lamports
P_50 = 0.000025                 // 25000 lamports
P_90 = 0.00025                  // 250000 lamports
P_MAX = 0.95                    // 0.95 SOL
```

```rust
// Smart Contract (lib.rs)
TOTAL_SUPPLY: u128 = 1_000_000_000_000_000_000  // 1B * 1e9
VIRTUAL_ANCHOR: u128 = 1_000_000_000_000_000    // 1M * 1e9
P_START: u128 = 1_000                            // 1000 lamports
P_50: u128 = 25_000                              // 25k lamports
P_90: u128 = 250_000                             // 250k lamports
P_MAX: u128 = 950_000_000                        // 0.95 SOL
```

### Phase 1: Linear (0 → 100M Shares)
```
P(x) = P_START + slope * (x + VIRTUAL_ANCHOR)
slope = (P_50 - P_START) / PHASE1_END
```
Price: 0.000001 → 0.000025 SOL (~25x)

### Phase 2: Quadratic Bridge (100M → 200M Shares)
```
P(x) = P_50 + (P_90 - P_50) * ratio²
ratio = (x - PHASE1_END) / (PHASE2_END - PHASE1_END)
```
Price: 0.000025 → 0.00025 SOL (~10x)

### Phase 3: Sigmoid Asymptotic (200M+ Shares)
```
P(x) = P_90 + (P_MAX - P_90) * normalized_sigmoid
```
Price: 0.00025 → 0.95 SOL (gradual approach)

---

## Security Architecture

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **Anti-Spoofing** | `address = market.creator` | Prevents fee redirection attacks |
| **Slippage Guard** | `require!(net >= min_sol_out)` | Auto-reverts if price crashes mid-tx |
| **Snapshot Pot** | `total_pot_at_resolution` | Guarantees fair payout ratios |
| **Rent Refund** | `close = user` | Returns storage rent after claim |
| **Time Lock** | `clock < resolution_time` | Hard-stops trading at expiry |
| **Outcome Validation** | `outcome_index < num_outcomes` | Prevents invalid outcome attacks |

---

## Fee Structure

| Event | Fee | Distribution |
|-------|-----|--------------|
| **Market Creation** | 0.01 SOL | 100% Treasury |
| **Buy** | 1% | 50% Creator, 50% Treasury |
| **Sell** | 1% | 50% Creator, 50% Treasury |
| **Resolution** | 2% | 100% Treasury |

*If Creator = Treasury (G1 markets), 100% goes to Treasury*

---

## Contract Addresses

| Network | Program ID | Version |
|---------|------------|---------|
| **Devnet** | `Fdbhx4cN5mPWzXneDm9XjaRgjYVjyXtpsJLGeQLPr7hg` | V4.0 Aggressive |

| Treasury | Address |
|----------|---------|
| **G1 Treasury** | `G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma` |

---

## Project Structure

```
djinn-pmarket/
├── app/                          # Next.js 14 App Router
│   ├── market/[slug]/page.tsx    # Individual market trading page
│   ├── markets/page.tsx          # Market listing grid
│   ├── admin/page.tsx            # DRACO admin panel
│   └── api/                      # API routes
│       ├── markets/route.ts      # In-memory market registry
│       └── oracle/               # Cerberus endpoints
├── components/                   # React components
│   ├── Navbar.tsx               # Main navigation
│   ├── MarketCard.tsx           # Market grid cards
│   └── ProbabilityChart.tsx     # Real-time probability chart
├── hooks/
│   └── useDjinnProtocol.ts      # Anchor program hook
├── lib/
│   ├── core-amm.ts              # Bonding curve math (MUST MATCH lib.rs)
│   ├── supabase-db.ts           # Database operations
│   └── oracle/bot.ts            # Cerberus AI engine
└── programs/djinn-market/
    └── programs/djinn-market/
        └── src/lib.rs           # Solana smart contract
```

---

## Development

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build for production
yarn build

# Run smart contract tests
cd programs/djinn-market && anchor test
```

---

## Technical Debt & Future Improvements

- [ ] SPL Token support for transferable shares
- [ ] Multi-sig resolution for high-value markets
- [ ] Mainnet deployment
- [ ] Mobile-responsive trading interface
- [ ] Advanced charting (candlesticks, volume)

---

<div align="center">

**Built for Lord**

*Probability is the only truth.*

</div>
