# 🗺️ Djinn Markets - Architecture Roadmap

## 🎯 Current vs. Target State
Detailed comparison of our MVP status versus the production goal.

| Componente | Estado Actual (MVP) | Objetivo Final (Production) |
|------------|---------------------|-----------------------------|
| **Data** | LocalStorage (Browser) | Supabase (PostgreSQL Cloud) |
| **Lógica** | Frontend (Demo/Simulation) | Smart Contract (Anchor/Rust) |
| **Precios** | Estáticos (Hardcoded) | Oráculos (Pyth/Switchboard) |
| **Wallets** | Connect Button Only | Transaction Signing & Management |

---

## 🏛️ Core Architecture & Tokenomics (The Djinn Protocol)

### 1. Unit Scaling (Strategy A: Mega-Shares)
*   **Base Unit:** 1 Share.
*   **UI Unit:** 1 Mega-Share (MS) = 1,000,000 Shares.
*   **Initial Price:** $0.000000001 per Share ($0.001 per MS).
*   **Supply:** Elastic Minting. Shares are minted upon purchase through the Bonding Curve and burned upon sale back to the pool.

### 2. The S-Curve (Sigmoid) Bonding Curve
We implement a sigmoid-based power function for price discovery $P(s)$.

**Price Function:** $P(s) = \int P(s) ds$

**The "Golden S" Phases:**
1.  **Accumulation (Flat):** Low $k$ factor to allow Snipers (800x potential).
2.  **FOMO (Aggressive):** Exponential growth phase for high-volume trading.
3.  **Asymptotic Stability:** The price $P(s)$ must be capped at $P_{max}$, where $P_{max} = \frac{Vault\_Balance \times 0.98}{Total\_Shares\_Circulating}$. This ensures 100% solvency (The Alfred Adjustment).

### 3. N-Outcome Support & Settlement
*   **Multi-Outcome:** Markets are not limited to Binary results. Each outcome ($R_1, R_2, ... R_n$) triggers its own independent S-Curve state (Supply, Price, Minting).
*   **Unified Liquidity Vault:** All capital from all outcomes flows into a single **Global Vault** PDA.
*   **The Jackpot Settlement:** Upon resolution of outcome $R_x$, all other outcomes $[R_{!x}]$ are devalued to 0. 
    *   **Payout:** The Total Global Vault (minus 2% fee) is distributed proportionally **only** among holders of $R_x$ shares.
    *   This logic allows for **Payouts > $1.00** if the winning outcome was an underdog with low supply relative to the total pot.

---

## 💰 Fee Structure & Treasury

### Market Creation Fee
*   **$3.00 USD** equivalent in SOL.
*   $2.00 to DJINN Treasury.
*   $1.00 injected as Initial Liquidity (Genesis Seed) to the Pool.

### Trading Fee (1%)
*   If Market Creator == Lord: 100% to DJINN Treasury.
*   If Market Creator == 3rd Party: 50% to DJINN, 50% to Creator.

### Resolution Fee (2%)
*   Deducted from the Total Vault Balance before distribution to winning shareholders.

---

## 🏗️ Technical Migration Plan

### 1. Data Layer (LocalStorage ➡️ Supabase)
- **Current:** Markets and bets are saved in the user's browser `localStorage`.
- **Problem:** Data is not shared between users; clearing cache deletes bets.
- **Solution:** Connect the `supabase-db.ts` client to the real Supabase backend.
  - Users table
  - Markets table
  - Bets/Positions table

### 2. Execution Layer (Component State ➡️ Smart Contract)
- **Current:** "Betting" just updates a React state and shows a toast.
- **Problem:** No funds actually move. No trustlessness.
- **Solution:** Integrate the Anchor program from `programs/djinn-market`.
  - Use `useAnchorWallet` to sign transactions.
  - Escrow accounts for holding SOL.

### 3. Pricing Layer (Static ➡️ Oracle)
- **Current:** Odds (e.g., 45% vs 55%) are set manually in `page.tsx`.
- **Solution:** Integrate Pyth Network feeds for crypto markets (BTC, SOL). Use Switchboard for sports/custom events.

### 4. Wallet Layer (Read-Only ➡️ Write)
- **Current:** Wallet adapter connects and gets public key.
- **Solution:** Implement `sendTransaction` flow for:
  - Market Creation (0.03 SOL fee)
  - Placing Bets (SOL transfer)
  - Claiming Winnings
