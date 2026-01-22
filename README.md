# Djinn: Redefining Price Discovery on Solana

<div align="center">

**The First Autonomous Liquidity Protocol for Prediction Markets**

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 🎯 Executive Summary

DJINN represents a paradigm shift in on-chain prediction markets. By leveraging a proprietary **Golden S Mutant Curve (V4 Aggressive)**, we eliminate the fundamental liquidity constraints that plague traditional order-book architectures. The result: **instantaneous, autonomous price discovery from the first transaction**.

> *"Where others require market makers, DJINN requires only believers."*

---

## ✨ **V4.0 Architecture: PDA-Based Derivatives** (Active)

DJINN operates on a **high-efficiency internal ledger system** using Solana Program Derived Addresses (PDAs). Unlike standard AMMs that rely on token swaps, Djinn uses direct state management for maximum speed and solvency.

### Key Features:
- ✅ **PDA-Based Positions**: User shares are tracked in `UserPosition` accounts with u128 precision.
- ✅ **Zero-Rent Drift**: Optimized account structure minimizes rent costs compared to ATAs.
- ✅ **Atomic Settlement**: Buys, sells, and merging positions happen in single atomic transactions.
- ✅ **Flash-Liquidity**: Markets are instantly liquid from moment zero.

### Cost Structure:
| Action | Network Cost | Protocol Fee |
|--------|--------------|--------------|
| Create Market | ~0.012 SOL | 0.01 SOL (Anti-Spam) |
| Buy Shares | ~0.000005 SOL | 1.0% |
| Sell Shares | ~0.000005 SOL | 1.0% |

---

## 📜 Technical Manifesto: The End of Traditional Liquidity

### I. The Innovation: Autonomous Liquidity Engineering

The **Golden S Mutant Curve** is an **Autonomous Liquidity Engine**—a self-sustaining mathematical construct that generates guaranteed liquidity from the first transaction.

#### The Three-Phase Transformation Engine (V4 Aggressive)

```
┌───────────────────────────────────────────────────────────────────────┐
│        PHASE 1              PHASE 2              PHASE 3              │
│        IGNITION             BRIDGE               SIGMOID              │
│      (0 - 100M)          (100M - 200M)           (200M+)              │
│                                                                       │
│   ╔═══════════════╗    ╔═══════════════╗    ╔═══════════════╗        │
│   ║  UNCERTAINTY  ║ →  ║  TRANSITION   ║ →  ║   CERTAINTY   ║        │
│   ║  (Linear)     ║    ║  (Quadratic)  ║    ║  (Sigmoid)    ║        │
│   ╚═══════════════╝    ╚═══════════════╝    ╚═══════════════╝        │
│                                                                       │
│   Price: 100 lamports  Accel: High          Cap: 0.95 SOL        │
│   Target: 5k lamports  Target: 25k lamps                          │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

**Phase 1 (Ignition):** The curve begins at ~0 (100 lamports), rewarding early participants with extreme asymmetric upside. This is the **conviction premium**.

**Phase 2 (Bridge):** A quadratic acceleration zone that scales rewards with market momentum between 100M and 200M shares.

**Phase 3 (Sigmoid):** Asymptotic convergence toward the 0.95 SOL logic-cap. Late participants purchase stability rather than asymmetry.

### II. Architectural Backbone: C³ Continuity

The curve guarantees smooth transitions across all phases to ensure solvency and prevent arbitrage gaps.

---

## 🧬 Core Innovation: The Golden S Mutant Curve (Math Specs)

DJINN employs a **3-Phase Piecewise Bonding Curve** (`V4 AGGRESSIVE`).

### Constants (Verified in `lib.rs`)

```rust
// Supply Boundaries ( 9 decimals )
PHASE1_END   = 100,000,000    // 100M Shares
PHASE2_END   = 200,000,000    // 200M Shares (Bridge End)
PHASE3_START = 200,000,000    // Sigmoid Start

// Price Points (Lamports)
P_START = 100             // 0.0000001 SOL (Genesis)
P_50    = 5,000           // 0.000005  SOL (Target at 100M)
P_90    = 25,000          // 0.000025  SOL (Target at 200M)
P_MAX   = 950,000,000     // 0.95      SOL (Hard Cap)

// Virtual Support
VIRTUAL_ANCHOR = 20,000,000 // 20M Shares phantom liquidity
```

### Phase Formulas

#### 1. Ignition Phase (Linear) `Supply <= 100M`
A steep linear ramp designed to reward early adopters.
`P(x) = P_START + m · x`
- **Slope (m)**: `(P_50 - P_START) / PHASE1_END`
- **Behavior**: Price grows linearly from **100 lamports** to **5,000 lamports**.

#### 2. Acceleration Bridge (Quadratic) `100M < Supply <= 200M`
A quadratic bridge to accelerate price discovery.
`P(x) = P_50 + (P_90 - P_50) · (progress / 100M)²`
- **Behavior**: fast acceleration from **5,000** to **25,000 lamports**.

#### 3. Stability Sigmoid `Supply > 200M`
Linear approximation of a sigmoid function for stability.
`P(x) = P_90 + (P_MAX - P_90) · NormalizedSigmoid(x - 200M)`
- **Behavior**: Asymptotically approaches **0.95 SOL** but slows down as it gets there.

---

## 💰 Economics & Fee Structure

### Protocol Fees
| Parameter | Value | Destination | Rationale |
|-----------|-------|-------------|-----------|
| Entry Fee | 1% | 50% Treasury / 50% Creator | Sustainable revenue & Creator Reward |
| Exit Fee | 1% | 50% Treasury / 50% Creator | Discourages wash trading |
| Resolution Fee | 2% | Protocol Treasury | Oracle incentivization |

### Solvency Model
DJINN is **100% On-Chain Solvent**. The vault always holds enough SOL to pay out the winning side.
`Vault_Balance >= (Winning_Shares * Payout_Per_Share)`

Unlike pump.fun or others, there is no "migration". The liquidity is the bonding curve itself until resolution. Upon resolution, the **losing side's collateral** subsidizes the **winning side's payout**.

---

## 🚀 Quick Start (Devnet)

```bash
# Clone and install
git clone https://github.com/Lord14sol/Djinn-pmarket.git
cd Djinn-pmarket && npm install

# Development
npm run dev

# Smart Contract Deployment
cd programs/djinn-market
anchor build && anchor deploy
```

### Contract Addresses

| Network | Program ID | Version |
|---------|------------|---------|
| **Devnet** | `HkjMQFag41pUutseBpXSXUuEwSKuc2CByRJjyiwAvGjL` | V4.0 (PDA/Aggressive) |

---

## 🔬 Verification

```bash
# Verify curve mathematics
npx tsx verify-curve.ts
```

### Debug Mode
Console logs will show specific execution paths:
```typescript
console.log("On-Chain Shares (fetched via Anchor):", "405000000000"); // 405 shares
```

---

<div align="center">

**Lord**

*Prediction is the new speculation* 🧞‍♂️

</div>
