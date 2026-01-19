# Djinn Protocol 🧞‍♂️

> **Prediction Markets Meet Memecoins: The First Viral Prediction Protocol on Solana**

Djinn combines the viral mechanics of pump.fun with the resolution certainty of Polymarket. Zero initial liquidity. Aggressive bonding curve. Early birds win.

---

## 🧠 The Psychology: Why Djinn Works

### The Problem with Traditional Markets

| Platform | Problem |
|----------|---------|
| **Polymarket** | Needs $10M+ liquidity injection. Institutional feel. Boring. |
| **Pump.fun** | First bot wins 1000x. No resolution. Pure PVP gambling. |

### Djinn's Solution: Democratization of the Pump

```
Traditional: Bot wins 1000x → Everyone else loses
Djinn:       First 1000 people win 2x-200x progressively
```

**Psychology:**
1. **FOMO is real** - Early buyers see gains, late buyers still have upside
2. **Resolution gives meaning** - Unlike memes, markets RESOLVE to truth
3. **Zero liquidity = Zero risk for creator** - Market lives or dies based on attention

---

## 📐 Mathematical Specification: V4 Aggressive Curve

### The 3-Phase Bonding Curve

```
P(x) = {
    Phase 1 (Linear):     P_start + m·x                        if x ∈ [0, 50M]
    Phase 2 (Quadratic):  P_50 + (P_90 - P_50)·(t)²            if x ∈ [50M, 90M]
    Phase 3 (Sigmoid):    P_90 + (P_max - P_90)·σ(x-90M)       if x ∈ [90M, 1B]
}

Where:
  t = (x - 50M) / 40M  (normalized progress in Phase 2)
  σ(z) = k·z           (linear sigmoid approximation)
  k = 4.7×10⁻⁴         (steepness factor)
```

### Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `P_START` | 0.000001 SOL | Entry price (1 nanoSOL) |
| `P_50` | 0.000006 SOL | Price at 50M shares (6x) |
| `P_90` | 0.000015 SOL | Price at 90M shares (15x) |
| `P_MAX` | 0.95 SOL | Maximum price cap |
| `PHASE1_END` | 50,000,000 | Phase 1 boundary |
| `PHASE2_END` | 90,000,000 | Phase 2 boundary |

### Progressive Gains Table

| Supply | Price (SOL) | Multiplier | Mcap (USD @ $200) |
|--------|-------------|------------|-------------------|
| 0 | 0.000001 | 1x | $0 |
| 5M | 0.0000015 | 1.5x | $3,000 |
| 10M | 0.000002 | **2x** | $8,000 |
| 20M | 0.000003 | **3x** | $24,000 |
| 30M | 0.000004 | **4x** | $48,000 |
| 40M | 0.000005 | **5x** | $80,000 |
| 50M | 0.000006 | **6x** ← Phase 1 End | $120,000 |
| 70M | 0.00001 | **10x** | $280,000 |
| 90M | 0.000015 | **15x** ← Phase 2 End | $540,000 |
| 120M | 0.00003 | **30x** | $1,440,000 |
| 200M | 0.0001 | **100x** | $8,000,000 |
| 500M | 0.0003 | **300x** | $60,000,000 |

### Curve Visualization

```
PRICE (SOL)
│
0.95│                                              ════════ (CAP)
    │                                         ╱
    │                                      ╱
    │                                   ╱  ← PHASE 3: MONSTRUOSO
    │                                ╱
0.015│                          ▲ (90M = 15x)
    │                       ╱╱╱
    │                    ╱╱   ← PHASE 2: Quadratic Acceleration
    │                 ╱╱
0.006│              ▲ (50M = 6x)
    │           ╱
    │        ╱  ← PHASE 1: Linear Growth
    │     ╱
0.001│▲ START
    └────────────────────────────────────────────── SUPPLY
     0   10M  30M  50M  70M  90M  120M  200M  500M  1B
```

---

## 💰 Early Bird Simulation

### If you invest 0.1 SOL (~$20 USD) at market creation:

| Market reaches... | Your value | Gain |
|-------------------|------------|------|
| 10M shares | $40 | **2x** |
| 30M shares | $120 | **6x** |
| 50M shares | $240 | **12x** |
| 90M shares | $900 | **45x** |
| 200M shares | $4,000 | **200x** 🚀 |

### If you invest 1 SOL (~$200 USD) at market creation:

| Market reaches... | Your value | Gain |
|-------------------|------------|------|
| 50M shares | $2,400 | **12x** |
| 90M shares | $9,000 | **45x** |
| 200M shares | $40,000 | **200x** 🚀 |

---

## 🏗️ Technical Architecture

### Frontend (Next.js 16 + TypeScript)
- `lib/core-amm.ts` — V4 Aggressive Curve implementation
- `app/market/[slug]/page.tsx` — Market detail with Mcap & Implied Probability
- Premium UI with Limitless-style aesthetics

### Smart Contract (Rust/Anchor)
- `programs/djinn-market/src/lib.rs` — On-chain curve logic (synchronized)
- Slippage protection via `min_shares_out`
- Binary search solver for gas-efficient calculations

### Contract Address
```
Program ID: HkjMQFag41pUutseBpXSXUuEwSKuc2CByRJjyiwAvGjL
```

---

## 📊 Fee Structure

| Fee Type | Amount | Recipient |
|----------|--------|-----------|
| Entry Fee | 1% | Protocol Treasury |
| Exit Fee | 1% | Protocol Treasury |
| Resolution Fee | 2% | Protocol + Creator split |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production
npm run build

# Deploy contract (requires Anchor CLI)
cd programs/djinn-market && anchor build && anchor deploy
```

---

## 🎯 The Djinn Thesis

> "Prediction markets are the next memecoins. But with meaning."

- **Zero liquidity model** = Zero upfront cost
- **Bonding curve** = Always liquid, always a price
- **Resolution** = Markets have endings, unlike pure speculation
- **Early bird rewards** = First believers win the most

---

## 📜 License

MIT

---

**Built for virality. Powered by mathematics. Resolved by truth.** 🧞‍♂️🚀
