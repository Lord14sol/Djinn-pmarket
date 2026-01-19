# Djinn Protocol 🧞‍♂️

> **The First Hybrid Prediction Market: Where Speculation Meets Reality**

Djinn is a new category of prediction market that fuses the viral mechanics of memecoins with the resolution certainty of prediction markets. Built on Solana, powered by the **Golden S Mutant Curve**.

---

## 🧠 The Philosophy: "Democratization of the Pump"

Traditional prediction markets (Polymarket, Kalshi) are boring. Traditional memecoins (Pump.fun) are predatory. 

**Djinn changes the rules:**

| Problem | Djinn Solution |
|---------|----------------|
| First bot wins 1000x | First **1,500 people** win 10x-19x together (gradual growth) |
| No resolution, pure PVP | Markets **resolve to reality** |
| Institutional UX | **Gamified UI** with Ignition Bar |

---

## 📐 The Golden S Mutant Curve

A novel 3-phase piecewise bonding curve designed for **fair distribution** and **explosive viral growth**.

### Mathematical Specification

```
P(x) = {
    Phase 1 (Linear):      P_start + m·x                           if x ∈ [0, 90M]
    Phase 2 (Quadratic):   a·x² + b·x + c                          if x ∈ [90M, 110M]
    Phase 3 (Sigmoid):     P_110 + (P_max - P_110)·σ_norm(x-110M)  if x ∈ [110M, 1B]
}
```

Where:
- `σ_norm(z) = k·z` — Linear approximation for gas efficiency
- `k = 4.7×10⁻⁴` — Steepness calibrated for ~19x at 120M shares (gradual growth)

### Phase Breakdown

| Phase | Range | Price | Purpose |
|-------|-------|-------|---------|
| **1. Anchor** | 0 → 90M | $0.000001 → $0.0000027 | Community accumulation. Fair entry. |
| **2. Bridge** | 90M → 110M | $0.0000027 → $0.000015 | Smooth C⁰ transition. No cliff. |
| **3. Ignition** | 110M → 1B | $0.000015 → $0.95 | Viral pump. God candle. |

### The 19x Gradual Growth Strategy (Democratization of the Pump)

The curve is calibrated for **sustainable community growth**:

```
Price at 120M shares ≈ $0.000019 SOL ≈ 19× entry price
```

This creates a **long accumulation phase** (0-110M shares) allowing more participants to enter fairly, followed by gradual appreciation. Unlike predatory pump-and-dump curves, this design prioritizes **community building over extraction**.

### C⁰ Continuity (No Cliff)

The quadratic bridge phase ensures smooth transitions:

```
P(90M) = P_90 = 0.0000027 SOL (2.7× entry)
P(110M) = P_110 = 0.000015 SOL (15× entry)
```

Simplified gas-optimized formula: `P = P_90 + (P_110 - P_90) · (progress/range)²`

This ensures **price continuity** at phase transitions (jumps < 1%).

---

## 🎮 Gamified UX: The Ignition Bar

The UI transforms market participation into a **collaborative game**:

| Progress | Status | Visual |
|----------|--------|--------|
| 0-80% | 🛡️ Accumulation Zone | Blue glow |
| 80-99% | ⚠️ ANCHOR BREAKING! | Red pulse + vibration |
| 100%+ | 🚀 VIRAL MODE ACTIVE | Green explosion |

---

## 🏗️ Technical Architecture

### Frontend (Next.js + TypeScript)
- `lib/core-amm.ts` — Golden S Mutant Curve implementation
- `components/market/IgnitionBar.tsx` — Gamified progress component
- `app/market/[slug]/page.tsx` — Market detail with Mcap & Implied Probability

### Smart Contract (Rust/Anchor)
- `programs/djinn-market/src/lib.rs` — On-chain curve logic
- Binary search solver for gas-efficient share calculation
- Piecewise approximation for Solana compute limits

---

## 📊 Token Economics

| Metric | Value |
|--------|-------|
| Total Supply | 1,000,000,000 (1B) per outcome |
| Anchor Threshold | 100,000,000 (10%) |
| Entry Fee | 1% |
| Exit Fee | 1% |
| Resolution Fee | 2% |

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

## 🔬 Curve Verification

```bash
# Run comprehensive curve verification (verify 19x calibration)
npx tsx verify-curve.ts

# Run full test suite (34 tests)
npx tsx test-complete.ts

# Run smart contract tests
cd programs/djinn-market && anchor test
```

Expected output at 120M shares: `price: 0.000019` (~19× from entry)

---

## 📜 License

MIT

---

## 🧞‍♂️ Credits

**Golden S Mutant Curve** — Original mathematical design by the Djinn Protocol team.

*"The curve that turns communities into armies, and predictions into prophecies."*

---

**Built for the 2026 Bull Market. Prediction is the new speculation.** 🚀
