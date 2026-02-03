# CLAUDE.md - Djinn Protocol Rules

## 🧠 Memory & Context
- **Review First:** `progress.txt` (Session State), `PRD.md` (Scope), `TECH_STACK.md` (Tools).
- **Update Last:** Always update `progress.txt` after a significant task.

## 🛠 Tech Stack
- **Frontend:** Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS 4.
- **Backend:** Supabase (PostgreSQL, Auth, Realtime).
- **Blockchain:** Solana (Anchor Framework), Rust 1.92+.
- **State Management:** React Hooks + Supabase Realtime (No Redux/Zustand unless specified).

## 💎 Code Style Guidelines
- **Functional Components:** Use implementation that emphasizes readability.
- **Strict Typing:** No `any`. Define interfaces in `types/` or co-located with components.
- **Styling:** Tailwind CSS utility classes. Avoid inline styles.
- **Components:** Modular, single-responsibility. `src/components/{ComponentName}.tsx`.
- **Naming:** PascalCase for components, camelCase for functions/vars, snake_case for DB/Rust.

## 🚨 Critical Rules
1. **No Hallucinations:** Use ONLY the libraries listed in `TECH_STACK.md`.
2. **Design System:** Follow `FRONTEND_GUIDELINES.md` for colors (Glassmorphism, Neon).
3. **Data Integrity:** Follow `BACKEND_STRUCTURE.md` for Supabase/Anchor schemas.
4. **Mobile First:** Ensure responsive design for all UI components.
5. **No File Deletion:** Do not delete code without explicit confirmation.

## 🔄 Workflow
1. **Plan:** Read `IMPLEMENTATION_PLAN.md` to see where we are.
2. **Execute:** Write code in small, testable chunks.
3. **Verify:** Check against `APP_FLOW.md` to ensure UX consistency.
4. **Document:** Update `progress.txt` with "DONE", "IN PROGRESS", "NEXT".
