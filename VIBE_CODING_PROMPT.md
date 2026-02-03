# Vibe Coding Master Init Prompt

Save this file. Whenever you start a **NEW** project, copy and paste the text below into your AI (Claude, Cursor, etc.) as your very first message.

---

### 📋 COPY THIS PROMPT:

> **MISSION: Initialize Vibe Coding System**
> 
> I want to start a new project using the "Vibe Coding" methodology. We will NOT write any code until the documentation foundation is solid.
> 
> **Phase 1: The Interrogation**
> Acting as a Senior Product Manager and Lead Architect, ask me critical questions to clarify my idea. Focus on:
> 1. **Core Problem:** What are we building and for whom?
> 2. **User Flow:** What is the "Happy Path" for the main user story?
> 3. **Data:** What are the key entities (Users, Posts, Payments, etc.)?
> 4. **Tech:** What are the non-negotiable technologies? (e.g., Next.js, Supabase)
> 5. **Vibe:** What is the visual aesthetic? (Colors, mood, inspiration)
> 
> *Do not generate any docs yet. Just ask the questions and wait for my answers.*
> 
> **Phase 2: The Canonical Stack (Trigger this after I answer)**
> Once I provide the answers, immediately generate the following 8 files in the project root to serve as our Source of Truth:
> 
> 1. **`CLAUDE.md`**: System instructions. Define the tech stack, code style (Functional React, TS), and strictly enforce reading these docs before coding.
> 2. **`PRD.md`**: Product Requirements. Scope, features, and specifically what is NOT in scope.
> 3. **`APP_FLOW.md`**: Detailed step-by-step user journeys and route definitions.
> 4. **`TECH_STACK.md`**: Exact versions of frameworks and libraries. No "or similar". Lock it down.
> 5. **`FRONTEND_GUIDELINES.md`**: Design system rules. Colors, fonts, spacing, and specific component styles (e.g., Glassmorphism).
> 6. **`BACKEND_STRUCTURE.md`**: Database schema (tables, columns) and any API/Contract signatures.
> 7. **`IMPLEMENTATION_PLAN.md`**: A step-by-step ordered checklist to build the app.
> 8. **`progress.txt`**: A session tracker file initialized with "STATUS: PLANNING COMPLETED".
> 
> **GOAL:** By the end of this process, I should be able to close this chat, open a new one, and you (the AI) should know exactly what to do just by reading these files.

---
