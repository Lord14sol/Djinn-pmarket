# IMPLEMENTATION_PLAN.md - Djinn Build Roadmap

## Phase 1: Vibe Coding Foundation (Current)
- [x] Analyze Repository & Architecture.
- [x] Create Canonical Docs (`PRD`, `APP_FLOW`, `TECH_STACK`).
- [x] Create Design System (`FRONTEND_GUIDELINES`).
- [x] Create Data Schema (`BACKEND_STRUCTURE`).
- [ ] **NEXT:** Sync existing code to match these new docs.

## Phase 2: Core Refactor (Alignment)
- [ ] **Refactor `lib/core-amm.ts`**: Ensure constants match `BACKEND_STRUCTURE.md`.
- [ ] **Refactor `CreateMarketModal`**: Ensure it handles N-Outcomes as defined in `PRD.md`.
- [ ] **Refactor `supabase-schema.sql`**: Ensure tables match `BACKEND_STRUCTURE.md`.

## Phase 3: Smart Contract Integration
- [ ] **Compile Anchor Program**: Verify Rust 1.92+ environment.
- [ ] **Deploy to Devnet**: Get new Program ID.
- [ ] **Update IDL**: Copy `target/idl/djinn_market.json` to frontend.
- [ ] **Hook Up `useDjinnProtocol`**: Connect React to new IDL.

## Phase 4: Verification & Polish
- [ ] **Mobile Audit**: Fix any layout issues on < 400px screens.
- [ ] **Cerberus Integration**: Connect Oracle bot to resolution endpoint.
- [ ] **Launch**: Production build & Vercel deployment.
