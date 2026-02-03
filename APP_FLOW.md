# APP_FLOW.md - User Journeys

## 1. Site Navigation (Routes)
- **Home (`/`)**: Landing page with "Trending Markets" and "Create Market" CTA.
- **Market Grid (`/markets`)**: Filterable list of all active markets.
- **Market Detail (`/market/[slug]`)**: Trading interface, chart, order form, comments.
- **Profile (`/profile/[wallet]`)**: User stats, held positions, gems.
- **Admin (`/admin`)**: DRACO verification panel (Restricted).

## 2. Core User Flows

### Flow 1: Connect Wallet (Onboarding)
1.  **Trigger:** User clicks "Connect Wallet" (Top Right).
2.  **System:**
    - Opens Solana Wallet Adapter modal.
    - User selects wallet (Phantom/Solflare).
    - App checks `profiles` table in Supabase.
    - **IF New User:** Creates profile entry with default avatar/username.
    - **IF Returning:** Loads profile data (Gems, Username).
3.  **Success:** Button shows Avatar + Username + SOL Balance.
4.  **Error:** "Connection Failed" toast.

### Flow 2: Create Market
1.  **Pre-requisite:** Wallet Connected.
2.  **Step 1:** User clicks "Create Market".
3.  **Step 2:** User fills form:
    - Title: "Will BTC hit $100k by Dec 31?"
    - Category: "Crypto" (Auto-detected).
    - Resolution Date.
    - Outcomes: "Yes", "No" (or custom).
4.  **Step 3:** User clicks "Launch Market" (Cost: 0.01 SOL).
5.  **System:**
    - Checks User Balance > 0.01 SOL.
    - Calls `create_market` instruction on Anchor program.
    - Waits for Transaction Confirmation.
    - Indexes new market in Supabase `markets` table.
6.  **Success:** Redirects to `/market/[new-slug]` with confetti.

### Flow 3: Trade (Buy/Sell)
1.  **Location:** Market Detail Page (`/market/[slug]`).
2.  **Step 1:** User selects Outcome (e.g., "YES").
3.  **Step 2:** User enters SOL amount (Buy) or Shares amount (Sell).
4.  **System:**
    - Calculates estimated output using Bonding Curve formula.
    - Shows "Slippage" and "Price Impact".
5.  **Step 3:** User confirms transaction.
6.  **System:**
    - Calls `place_bet` (Buy) or `sell_shares` (Sell) on Anchor.
    - Updates `UserPosition` account.
    - Updates local `activity` list via Supabase Realtime.
7.  **Success:**
    - Toast: "Trade Confirmed".
    - User's "My Position" card updates.
    - Chart pulse animation triggers.

### Flow 4: Claim Winnings (Resolution)
1.  **Pre-requisite:** Market Status = `Resolved`.
2.  **Trigger:** "Claim Winnings" button appears on Market Page.
3.  **Step 1:** User clicks Claim.
4.  **System:**
    - Verifies user holds winning shares.
    - Calculates Payout share.
    - Calls `claim_reward` instruction.
5.  **Success:** SOL transferred to wallet. Toast "You won X SOL!". Shares burned.
