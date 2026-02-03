# TECH_STACK.md - Djinn Protocol

## 📦 Core Dependencies (Locked)

### Frontend Framework
- **Next.js:** 16.1.1 (App Router)
- **React:** 18.3.1
- **TypeScript:** 5.x

### Styling & UI
- **Tailwind CSS:** 3.4.16 / 4.x (PostCSS)
- **Framer Motion:** 11.0.0 (Animations)
- **Lucide React:** 0.562.0 (Icons)
- **Canvas Confetti:** 1.9.4
- **Recharts / Visx:** Charts & Data Visualization

### Blockchain (Solana)
- **Anchor:** 0.28.0 (Client) / 0.26.0 (Project Serum)
- **Solana Web3.js:** 1.98.4
- **Wallet Adapter:** 0.15.39 (React), 0.19.37 (Wallets)
- **SPL Token:** 0.4.14

### Backend & Data
- **Supabase JS:** 2.90.1 (PostgreSQL, Auth, Realtime)
- **Axios:** 1.13.2 (API Requests)
- **SWR:** 2.3.8 (Data Fetching)
- **Date-fns:** 4.1.0

### AI & Agents
- **OpenAI:** 6.16.0
- **Google Generative AI:** 0.24.1

## 🛠 Developer Tools
- **ESLint:** 9.x
- **Prettier:** (Standard Config)
- **Rust Toolchain:** 1.92+ (Required for Anchor Contracts)

## ⚠️ Constraint Rules
1. **Do NOT upgrade** Next.js or React without explicit user request (Breaking changes risk).
2. **Do NOT add** UI component libraries (e.g., ShadCN, MUI) unless requested. We build custom components.
3. **Use Supabase** for all off-chain data.
4. **Use Anchor** for all on-chain logic.
