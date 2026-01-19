# Djinn Protocol 🧞‍♂️

> **The First Hybrid Prediction Market: Where Speculation Meets Reality**

Djinn is a new category of prediction market that fuses the viral mechanics of memecoins with the resolution certainty of prediction markets. Built on Solana, powered by the **Golden S Mutant Curve**.

---

## 🧠 The Philosophy: "Democratization of the Pump"

Traditional prediction markets (Polymarket, Kalshi) are boring. Traditional memecoins (Pump.fun) are predatory. 

**Djinn changes the rules:**

| Problem | Djinn Solution |
|---------|----------------|
| First bot wins 1000x | First **1,500 people** win 10x-150x together |
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
- `σ_norm(z) = 2·(sigmoid(k·z) - 0.5)` — Normalized sigmoid starting at 0
- `k = 4.7×10⁻¹⁰` — Steepness calibrated for 150x at 120M shares

### Phase Breakdown

| Phase | Range | Price | Purpose |
|-------|-------|-------|---------|
| **1. Anchor** | 0 → 90M | $0.000001 → $0.0000027 | Community accumulation. Fair entry. |
| **2. Bridge** | 90M → 110M | $0.0000027 → $0.000015 | Smooth C⁰ transition. No cliff. |
| **3. Ignition** | 110M → 1B | $0.000015 → $0.95 | Viral pump. God candle. |

### The 150x Strategy (Deep Liquidity Tank)

The curve is calibrated so that:

```
Price at 120M shares = $0.00225 SOL = 150× entry price
```

This creates **deep liquidity** that can absorb whale sells without collapsing, producing a sustainable upward trend rather than a pump-and-dump.

### C¹ Continuity (No Cliff)

The quadratic bridge phase is constructed by solving the system:

```
P(90M) = P_90 (end of linear)
P(110M) = P_110 (start of sigmoid)  
P'(90M) = m (derivative matches linear slope)
```

This ensures **zero price discontinuity** at phase transitions.

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
# Run curve debug (verify 150x calibration)
npx ts-node -e "const c = require('./lib/core-amm'); console.log(JSON.stringify(c.debugCurvePoints(), null, 2));"
```

Expected output at 120M shares: `price: 0.00225` (150× from entry)

---

## 📜 License

MIT

---

## 🧞‍♂️ Credits

**Golden S Mutant Curve** — Original mathematical design by the Djinn Protocol team.

*"The curve that turns communities into armies, and predictions into prophecies."*

---

**Built for the 2026 Bull Market. Prediction is the new speculation.** 🚀
