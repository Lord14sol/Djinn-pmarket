# PRD.md - Djinn Protocol Product Requirements

## 1. Executive Summary
Djinn is a **Pure AMM (Automated Market Maker)** prediction market protocol on Solana. It eliminates order books by using **independent bonding curves** for each outcome. Liquidity is the market itself—every share purchased increases the price for the next buyer. The goal is to create a deterministic, solvent, and highly liquid prediction market for any event.

## 2. Core Philosophy
- **Pure AMM:** No counterparties needed. You trade against the contract.
- **Liquidity is the Market:** Price discovery is mathematical, not matching-based.
- **Solvency:** The bonding curve math guarantees 100% solvency at all times.
- **Memecoin Mechanics:** Early buyers are rewarded with better prices. 

## 3. Product Scope

### 3.1. In Scope
- **Multi-Outcome Markets:** Support for 2-6 outcomes per market (e.g., "Yes/No" or "Brazil/Argentina/France").
- **Bonding Curve Trading:** Sigmoid-based pricing curve that starts cheap to encourage early entry and stabilizes as liquidity grows.
- **Market Creation:** Users can create markets with a title, outcomes, and resolution date (Fee: ~0.01 SOL).
- **Cerberus Oracle:** a 3-stage AI verification system for resolving markets trustlessly.
- **Resolution:** Admin/Oracle triggers resolution; winning shares claim the pot, losing shares become worthless.
- **Social Features:** Profiles, gems (gamification), comments on markets.

### 3.2. Out of Scope (MVP)
- **SPL Token Integration:** Shares are currently account-based (internal ledger), not transferable SPL tokens.
- **DAO Governance:** Protocol parameters are currently admin-controlled.
- **Mobile Native App:** Web-only responsive design for now.

## 4. User Stories

### 4.1. The Trader (Degenerate)
- "As a trader, I want to spot a new market early so I can buy shares at the floor price (0.000001 SOL)."
- "As a trader, I want to see the real-time probability of an outcome so I can trust the price."
- "As a trader, I want to sell my shares instantly without waiting for a buyer."

### 4.2. The Creator
- "As a creator, I want to launch a market about a trending topic instantly."
- "As a creator, I want to earn trading fees (0.5%) from the volume my market generates."

### 4.3. The Oracle (Cerberus)
- "As the oracle system, I need to verify real-world events using multiple data sources (Dogs) to ensure fair resolution."

## 5. Key Metrics
- **TVL (Total Value Locked):** Total SOL held in market vaults.
- **Volume:** Total SOL traded (Buy + Sell).
- **User Growth:** Number of unique wallet addresses connected.
- **Market Resolution Time:** Avg time between event end and payout.

## 6. Mathematical Model (The "Golden S")
The bonding curve follows a 3-phase progression:
1.  **Accumulation (Linear):** Low price, high multiplier potential (0 - 100M shares).
2.  **FOMO (Quadratic):** Rapid price increase (100M - 200M shares).
3.  **Stability (Sigmoid):** Asymptotic approach to max price (200M+ shares).

## 7. Fees
- **Market Creation:** 0.01 SOL (100% Treasury).
- **Trading Fee:** 1% on Buy/Sell (50% Creator, 50% Treasury).
- **Resolution Fee:** 2% of Final Pot (100% Treasury).
