# Modern Vintage UI/UX Overhaul Plan

## Goal Description
Transform the current functional UI into a "Sleek, Sexy, Cool" Vintage Baseball experience. The goal is to marry the nostalgia of 1900s baseball with the UX patterns and visual fidelity of 2025.

## Proposed Changes

### 1. Design System Updates (tailwind.config.js & index.css)
#### [MODIFY] tailwind.config.js
-   **Colors**:
    -   `charcoal`: Deepen to `#121212` (Almost black) for higher contrast.
    -   `burgundy`: Shift to `#800020` (Classic Oxford Blue/Red mix) or a deep crimson.
    -   `gold`: `#D4AF37` is good, but maybe a slightly more muted metallic version `#C5A059`.
    -   `cream`: `#F0F0EB` (Newsprint) or `#F5F5F0`.
    -   *Add*: `leather`: `#8B4513` for accents?
-   **Typography**:
    -   Refine font stacks. Ensure high readability.
-   **Extend**:
    -   Add `backgroundImage` utilities for subtle grain/texture.

#### [MODIFY] src/index.css
-   **Global Styles**:
    -   Add a fixed entry animation.
    -   Implement a subtle CSS-based noise/grain overlay on the `body`.
    -   Use `::selection` styling (Gold background, Charcoal text).

### 2. Component Refactoring
#### [MODIFY] src/components (General)
-   **Buttons**:
    -   primary: Solid Burgundy, uppercase, wide tracking, sharp corners or very slight rounded (2px).
    -   hover: Slight lift (transform), shadow growth.
-   **Cards**:
    -   Remove default shadow-md. Use a thin border `border-charcoal/10` + a "paper" texture background or a very soft, large diffused shadow.
    -   "Glass" variant for modals or overlays.

### 3. Layout Overhaul
#### [MODIFY] src/App.tsx
-   **Hero Section**:
    -   Center massive typography. "CENTURY OF THE GAME".
    -   Use a mix of serif italics and bold sans-serifs.
-   **Navigation**:
    -   Minimalist.

## Verification Plan
### Manual Verification
-   Check the "Home" screen for the new aesthetic.
-   Ensure responsiveness is maintained.
-   Verify that the "Vintage" feel doesn't compromise readability (contrast check).

---

# UI/UX Modern Vintage Overhaul Tasks

- [x] Design System Refinement
    - [x] Update Color Palette (Richer tones, sleek dark mode options)
    - [x] Enhancing Typography (Scaling, spacing, weights)
    - [x] Global Effects (Subtle noise/grain, glassmorphism, shadows)
- [x] Component Modernization
    - [x] "Sleek" Buttons (Hover states, animations, premium feel)
    - [x] Premium Cards (Texture, borders, shadows)
    - [x] Form Elements (Inputs, Selects with custom styling)
- [x] Layout & Page Polish
    - [x] Hero Section (Impactful typography, modern layout)
    - [x] Header/Footer (Simple, elegant)
    - [ ] Draft Interface (If time permits/requested)
