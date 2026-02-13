# Djinn: The Autonomous Prediction Protocol

<div align="center">

**V4.5 "Final Form" | Self-Custodial | On-Chain Solvent | Agent Identity**

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
- Buying BRAZIL shares does NOT affect ARGENTINA's price.
- Each outcome has its own `outcome_supplies[index]` in the smart contract.
- Early buyers get more shares for less SOL (memecoin mechanics).
- Your position multiplies in value when others buy after you.

### 2. Account-Based Shares (NOT SPL Tokens)

Djinn uses **account-based shares** rather than SPL tokens for maximum capital efficiency and deterministic pricing:

```rust
#[account]
pub struct UserPosition {
    pub market: Pubkey,
    pub outcome: u8,      // 0 = YES, 1 = NO, etc.
    pub shares: u128,     // Shares stored in account, NOT transferable
    pub claimed: bool,
}
```

The "pair" is always: `SHARES ↔ BONDING CURVE ↔ SOL VAULT`. No external AMM or liquidity pools are required.

### 3. Probability Buffer (Anti-Explosion Mechanism)

To prevent probability from jumping to 100% on low liquidity, we use a **Virtual Floor** of 15M shares per side. This ensures that even on new markets, the price/probability doesn't react too violently to small trades.

---

## Agent Identity: The Agent Card

Djinn introduces the **Agent Identity System**, a 3D interactive physics-based card that serves as your on-chain resume.

- **3D Physics**: Built with `Three.js` and `React Three Fiber`.
- **Lanyard Tech**: Dynamic rope physics using `Verlet integration`.
- **Crystals & Chrome**: Hyper-realistic materials with glowing neon edges.
- **On-Chain Reputation**: Displays your wallet, ID, and tier status.

---

## Genesis Tier

The **Genesis Tier** is an exclusive status awarded to the earliest supporters of the protocol.

- **Qualification**: First 1000 users to qualify based on early activity.
- **Genesis Medal**: A unique visual badge displayed on the profile.
- **Exclusive Perks**: Priority access to new features and potential fee discounts.

---

## Chronos Markets: Automated Crypto Predictions

**Chronos** is a specialized module for automated, time-based crypto prediction markets (BTC, ETH, SOL).

- **Automated Rounds**: New rounds created every 15m or 1h.
- **Pyth Oracle Integration**: Settlement is handled automatically using Pyth Network's real-time price feeds.
- **Binary Outcomes**: "Will BTC be Above or Below $X at Time Y?"

---

## The Lifecycle Flow

### 1. Creation (Genesis)
- Protocols or users create markets.
- Sets **Virtual Anchor** (1M shares) for mapping 1 SOL buy to ~2x price movement.
- Creation fee: 0.01 SOL to Treasury.

### 2. Trading (Active Phase)
- **1% Fee**: (50% Creator, 50% Treasury).
- **Slippage Guard**: Integrated protection against front-running.

### 3. Resolution (Cerberus Oracle)
The **Cerberus 3-Dog System** handles verification:
1. **$34k MCAP Trigger**: When combined MCAP reaches ~340 SOL (~$34,000 USD), Cerberus activates.
2. **DOG 1 (Hunter)**: Fact-gathering via 10+ sources (DEXScreener, Twitter, Google, etc.).
3. **DOG 2 (Analyst)**: Reasoning through Gemini 2.0 Flash Lite.
4. **DOG 3 (Judge)**: Final verdict with confidence score.

---

## The Math: 3-Phase Piecewise Bonding Curve

### Constants (Synchronized: lib.rs ↔ core-amm.ts)

- **TOTAL_SUPPLY**: 1B Shares.
- **VIRTUAL_OFFSET**: 1M (Aggressive Pump Mode).
- **PHASE 1**: Linear Ramp (0 → 100M Shares).
- **PHASE 2**: Quadratic Bridge (100M → 200M Shares).
- **PHASE 3**: Sigmoid Asymptotic (200M+ Shares).

---

## Projects Structure

```
djinn-pmarket/
├── app/                          # Next.js 14 App Router
│   ├── market/[slug]/page.tsx    # Standard market trading
│   ├── crypto/[slug]/page.tsx    # Chronos automated markets
│   ├── markets/page.tsx          # Main market listing
│   ├── activity/page.tsx         # Global activity feed
│   ├── leaderboad/page.tsx       # Top performers
│   └── profile/page.tsx          # User profile & Agent Card
├── components/                   # React components
│   ├── PhysicsCardBubblegum.tsx  # 3D Agent Card
│   ├── Lanyard.tsx               # Lanyard physics
│   └── ProbabilityChart.tsx      # Real-time high-fidelity charts
├── lib/
│   ├── core-amm.ts              # Bonding curve (Synced with Rust)
│   ├── oracle/bot.ts            # Cerberus AI engine
│   └── supabase-db.ts           # Realtime database sync
└── programs/djinn-market/
    └── src/lib.rs               # Solana smart contract (V4.5)
```

---

## Contract Addresses

| Network | Program ID | Version |
|---------|------------|---------|
| **Devnet** | `76HyPe3NMY39BXYaYPTq3QUmvxriXNhfEBZBXBxwxghB` | V4.5 Final Form |

| Treasury | Address |
|----------|---------|
| **G1 Treasury** | `G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma` |

---

## Tech Stack

- **Blockchain**: Solana (Anchor/Rust)
- **Frontend**: Next.js 14, TailwindCSS, Framer Motion
- **3D Engine**: Three.js, React Three Fiber
- **Oracle**: Pyth Network (Chronos) + Cerberus AI (News)
- **Database**: Supabase (Realtime & Auth)

---

<div align="center">

**Built for Lord**

*Probability is the only truth.*

</div>
