# FRONTEND_GUIDELINES.md - Djinn Design System

## 🎨 Visual Identity
Djinn uses a **Dark, Sci-Fi, Neon-Glassmorphism** aesthetic. The UI should feel "alive" with constant subtle motion (stars, glows, fire).

### Core Principles
1.  **Glassmorphism:** Translucent panels, backdrop blur, white borders with low opacity.
2.  **Neon Accents:** Bright pinks, cyans, and purples against deep black backgrounds.
3.  **Motion:** Everything breathes. Buttons glow, backgrounds twinkle, numbers count up.
4.  **Premium:** No default browser inputs. Custom scrollbars, custom spinners.

## 🎨 Color Palette

### Backgrounds
- **Deep Void:** `bg-black` (Primary background)
- **Glass Panel:** `bg-white/5` with `backdrop-blur-md`
- **Glass Border:** `border-white/10` to `border-white/20`

### Typography
- **Primary Text:** `text-white` (100% opacity)
- **Secondary Text:** `text-gray-400`
- **Accents:**
    - **Neon Pink:** `text-[#F492B7]` (Often used for "NO" or special highlights)
    - **Neon Cyan:** `text-cyan-400` (Often used for "YES" or tech elements)
    - **Gold:** `text-yellow-400` (Winners, Rewards)

## 🧩 Component Styles

### Cards (Glass)
```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
```

### Buttons
- **Primary:** Neon gradient background, white text, glow effect on hover.
- **Secondary:** Transparent background, white border, white text.
- **Interactions:** Use `active:scale-95` and `hover:scale-105` for tactile feel.

### Animations (Standardized)
- `animate-twinkle`: For background stars.
- `animate-fire-glow`: For "Hot" markets.
- `animate-slide-up`: For toasts and entering elements.
- `animate-pulse-slow`: For loading states.

## 📱 Responsive Rules (Mobile First)
- **Base:** Design for 375px width (iPhone SE/Mini).
- **md (768px):** Tablets - expand grids to 2 columns.
- **lg (1024px):** Desktop - expand grids to 3/4 columns, show full sidebars.
- **Touch Targets:** All interactive elements must be at least 44px height on mobile.

## 🚫 Forbidden
- **Light Mode:** Djinn is strictly Dark Mode.
- **Default Scrollbars:** Use `.custom-scrollbar` utility.
- **Input Spinners:** Use `.no-spinner` class for number inputs.
- **Generic Fonts:** Use the project's configured font stack (likely Inter or custom sans).
