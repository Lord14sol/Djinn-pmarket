# Djinn Landing Page: Neo-Brutalist Architecture Report

## 🎨 Design Philosophy: Neo-Brutalism
The landing page follows a **Neo-Brutalist** aesthetic, characterized by:
- **High Contrast**: Pure black (#000000) and white backgrounds with vibrant neon accents (#00FF41, #F492B7).
- **Bold Borders**: Thick 3px/4px black borders on interactive elements.
- **Hard Shadows**: Non-blurred, offset shadows (`shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]`).
- **Geometric Grid**: A 16px dot-grid background for a technical, blueprint feel.
- **Eclectic Typography**: Mixing high-end serif (Adriane) with technical monospaced fonts.

## 🏗️ Technical Structure

### 1. Layout: Split-Screen Experience (`app/page.tsx`)
The page is divided into two primary sections using a flex-column (mobile) to flex-row (desktop) layout.
- **Left (Info & Conversion)**: Contains the brand identity, value proposition, and the Whitelist/Alpha registration flow.
- **Right (Playground)**: A dedicated interactive area for visual engagement.

### 2. The Physics Engine (`components/PhysicsCard.tsx`)
A high-fidelity interactive component built with `framer-motion`:
- **Dynamic Lanyard**: Uses a `motion.path` and a Bezier curve calculation to simulate a hanging card cord that Reacts to dragging.
- **Spring Physics**: `mouseX` and `mouseY` values are passed through spring settings (`stiffness: 300`, `damping: 30`) to create a "liquid" inertia effect.
- **3D Interaction**: `useTransform` maps mouse coordinates to `rotateX` and `rotateY` for depth simulation.
- **Visual Effects**: Includes a scanline animation, noise overlays, and a coordinate-mapped glare effect.

---

## 🚀 Full Context Prompt for Future Development

**Objective**: Maintain and evolve the Djinn "Intelligence Protocol" Landing Page.

**Core Stack**: Next.js (App Router), Tailwind CSS, Framer Motion, Lucide React.

**Component Overview**:
1. **`app/page.tsx`**: Main entry. Implements the split-screen layout. Features a `radial-gradient` dot grid. Uses `AnimatePresence` for state transitions between "Request Access" and "Secure Identity".
2. **`components/PhysicsCard.tsx`**: The hero interactive element. Handles dragging, 3D tilt, and the SVG lanyard path calculation.
3. **`lib/whitelist.ts`**: Handles the logic for wallet-based registration and status checking.

**Style Guide (Djinn Neo-Brutalism)**:
- **Core Identity**: High contrast, bold borders, hard shadows. No gradients.
- **Branding**: Brand name "Djinn" in **Title Case**, pure white, weight 700.
- **Colors**: **Pure Black (#000000)**, **Cyber Green (#00FF41)**, **Djinn Pink (#F492B7)**.
- **Rounding**: `rounded-2xl` for cards, `rounded-full` for buttons.
- **Borders**: Always use `border-black` with at least `border-[3px]`.
- **Shadows**: **Hard Non-Blurred Shadows**: `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`.
- **Transitions**: Use spring physics (`stiffness: 300`, `damping: 30`) for all movement; avoid linear eases.

**Key Code Snippet (Lanyard Logic)**:
```tsx
const pathD = useTransform([mouseX, mouseY], ([latestX, latestY]) => {
    const startX = containerSize.width / 2;
    const endX = (containerSize.width / 2) + latestX;
    const endY = (containerSize.height / 2) - 100 + latestY;
    const cp1Y = (0 + endY) / 2;
    return `M ${startX} 0 C ${startX} ${cp1Y}, ${endX} ${cp1Y}, ${endX} ${endY}`;
});
```
