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
- **Problem:** Markets verify outcome manually or never resolve.
- **Solution:** Integrate Pyth Network feeds for crypto markets (BTC, SOL). Use Switchboard for sports/custom events.

### 4. Wallet Layer (Read-Only ➡️ Write)
- **Current:** Wallet adapter connects and gets public key.
- **Problem:** User cannot sign transactions or pay fees.
- **Solution:** Implement `sendTransaction` flow for:
  - Market Creation (0.03 SOL fee)
  - Placing Bets (SOL transfer)
  - Claiming Winnings
