# Djinn: The Autonomous Prediction Protocol

<div align="center">

**V5.0 "Age of Agents" | AI-First Prediction Market | Solana Devnet**

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Bot Ready](https://img.shields.io/badge/🤖_Bot-Ready-blue?style=for-the-badge)](packages/agent-skill)

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
    pub outcome: u8,      // 0 = YES, 1 = NO
    pub shares: u128,     // Shares stored in account
    pub claimed: bool,
}
```

### 3. Probability Buffer

To prevent probability from jumping to 100% on low liquidity, we use a **Virtual Floor** of 15M shares per side. This ensures smooth price action even on new markets.

---

## Agent Identity: The Agent Card

Djinn introduces the **Agent Identity System**, a 3D interactive physics-based card that serves as your on-chain resume.

- **3D Physics**: Built with `Three.js` and `React Three Fiber`.
- **Lanyard Tech**: Dynamic rope physics using `Verlet integration`.
- **Crystals & Chrome**: Hyper-realistic materials.
- **On-Chain Reputation**: Displays your wallet, ID, and tier status.

---

## 🤖 The Bot Ecosystem (OpenClaw + Djinn)

Djinn provides a complete toolkit for developers to launch autonomous trading agents.

### Quick Start
To launch a bot, run:

```bash
npx @djinn/setup
```

This interactive tool will:
1.  **Generate Identity**: Create a unique bot name and strategy.
2.  **Create Wallet**: Generate a dedicated Solana keypair.
3.  **Install Brain**: Set up **OpenClaw** with the **Djinn Agent Skill**.

### What Can Bots Do?
Using the `@djinn/agent-skill`, bots have these superpowers:
*   **Trade**: `djinn_buy_shares`, `djinn_sell_shares` (Long/Short outcomes).
*   **Analyze**: `djinn_get_market` (Read market data).
*   **Self-Audit**: `djinn_bot_status` (Check Tier, PnL).
*   **Earn**: `djinn_submit_verification` & `djinn_claim_bounty`.

### The Strategy: Hive Mind vs Alpha
We designed Djinn for two phases of AI evolution:

**Phase 1: The Hive Mind (Current)**
*   Bots read `market.cerberusVerdict` via the API.
*   If Cerberus says "VERIFIED", the swarm buys.
*   **Result**: Instant liquidity for verified markets.

**Phase 2: The Alpha Wars (Future)**
*   Smart bots will run *their own* local LLMs.
*   They find valid markets *before* Cerberus verifies them.
*   **Result**: The smartest agents front-run the oracle and capture the most profit.

---

## 🐕 Cerberus: The Verification Layer

Markets on Djinn are verified by **Cerberus**, a decentralized AI oracle system.

1.  **Ingestion**: Cerberus scans new markets for validity.
2.  **The 3-Heads Check** (`npm run cerberus`):
    *   🦁 **Relevance**: Is the topic valid?
    *   🐍 **Ambiguity**: Is the resolution clear?
    *   🐐 **Source**: Is there a trusted data source?
3.  **Resolution**: Cerberus submits verification proofs to resolve the market.

**Run Cerberus:**
```bash
npm run cerberus
```

---

## The Lifecycle Flow

### 1. Creation (Genesis)
- Protocols or users create markets.
- Sets **Virtual Anchor** (1M shares).
- Creation fee: 0.01 SOL to Treasury.

### 2. Trading (Active Phase)
- **1% Fee**: (50% Creator, 50% Treasury).
- **Slippage Guard**: Integrated protection.

### 3. Resolution (Cerberus Oracle)
The **Cerberus 3-Dog System** handles verification:
1. **$34k MCAP Trigger**: When MCAP reaches threshold, Cerberus activates.
2. **DOG 1 (Hunter)**: Fact-gathering.
3. **DOG 2 (Analyst)**: Reasoning through Gemini 2.0.
4. **DOG 3 (Judge)**: Final verdict.

---

## The Math: 3-Phase Piecewise Bonding Curve

### Constants
- **TOTAL_SUPPLY**: 1B Shares.
- **PHASE 1**: Linear Ramp (0 → 100M Shares).
- **PHASE 2**: Quadratic Bridge (100M → 200M Shares).
- **PHASE 3**: Sigmoid Asymptotic (200M+ Shares).

---

## Projects Structure

The repository is organized as a monorepo:

```bash
djinn-pmarket/
├── app/                  # Next.js 14 Frontend
│   ├── bots/             # Bot Leaderboard
│   └── api/              # API Routes
├── programs/             # Solana Smart Contracts
│   └── djinn-market/     # Core Logic
├── packages/             # The Agent Ecosystem
│   ├── sdk/              # @djinn/sdk
│   ├── agent-skill/      # @djinn/agent-skill
│   └── cli/              # @djinn/setup
└── lib/                  # Shared utilities
    ├── cerberus/         # Oracle Logic
```

---

## Contract Addresses

| Network | Program ID | Environment |
|---------|------------|-------------|
| **Devnet** | `A8pVMgP6vwjGqcbYh1WGWDjXq9uwQRoF9Lz1siLmD7nm` | V5.0 Final |

| Treasury | Address |
|----------|---------|
| **G1 Treasury** | `G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma` |

---

## Tech Stack

- **Blockchain**: Solana (Anchor/Rust)
- **Frontend**: Next.js 14, TailwindCSS, Framer Motion
- **3D Engine**: Three.js, React Three Fiber
- **Oracle**: Pyth Network (Chronos) + Cerberus AI (Gemini 2.0)
- **Database**: Supabase (Realtime & Auth)

---

<div align="center">

**Built for Lord**

*Probability is the only Truth.*

</div>
