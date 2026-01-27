# Century of the Game
## Style Reference Document (SRD)
### Brand Identity & Implementation Guide

**Version:** 1.0  
**Date:** January 2025

---

## Table of Contents

1. [Brand Overview](#1-brand-overview)
2. [Logo Specifications](#2-logo-specifications)
3. [Color Palette](#3-color-palette)
4. [Typography](#4-typography)
5. [Taglines & Copy](#5-taglines--copy)
6. [UI Components](#6-ui-components)
7. [Spacing & Layout](#7-spacing--layout)
8. [Implementation Notes](#8-implementation-notes)

---

## 1. Brand Overview

**Century of the Game** is a historical fantasy baseball simulator covering 124 years of professional baseball (1901–2025).

### Brand Attributes

| Attribute | Description |
|-----------|-------------|
| Vintage / Heritage | Evokes the history and tradition of baseball |
| Serious / Authoritative | Professional, not cartoonish |
| Statistical / Analytical | Respects the numbers side of the game |
| Timeless | Works across all eras represented in the product |

### Primary Tagline

> *"Every era. Every legend. Your lineup."*

---

## 2. Logo Specifications

### 2.1 Primary Logo (Stacked)

The primary logo is a vertically stacked wordmark. Use on hero sections, splash screens, and marketing materials with ample whitespace.

**Structure:**

```
CENTURY          ← Playfair Display, 800 weight, all caps
of the           ← Crimson Text, 400 italic, lowercase
GAME             ← Playfair Display, 800 weight, all caps
1901 — 2025      ← Source Sans 3, 300 weight (optional)
```

**Sizing Ratios:**

| Element | Ratio | Example at 72px base |
|---------|-------|---------------------|
| CENTURY / GAME | 1.0x | 72px |
| "of the" | 0.39x | 28px |
| Year range | 0.18x | 13px |

**Letter Spacing:**

- CENTURY / GAME: `letter-spacing: 4px` at 72px
- "of the": `letter-spacing: 6px` at 28px
- Year range: `letter-spacing: 8px`

---

### 2.2 Horizontal Logo

For navigation bars, headers, and horizontal layouts.

**Structure:**

```
[Gold Divider] | CENTURY
               | of the
               | GAME
```

**Specifications:**

| Element | Value |
|---------|-------|
| Divider bar | 2px × 50px, Gold (#C9A45C) |
| Gap (divider to text) | 20px |
| Text alignment | Left-aligned stack |
| Typical nav size | 32px (CENTURY/GAME), 14px ("of the") |

---

### 2.3 Badge Logo

Framed version for merchandise, formal contexts, and contained marks.

**Specifications:**

| Element | Value |
|---------|-------|
| Border | 3px solid, matches text color |
| Padding | 25px vertical, 35px horizontal |
| Diamond ornament (◆) | Centered top, 8px, Gold |
| Line 1 | "CENTURY" |
| Line 2 | "of the Game" (italic) |

---

### 2.4 Compact / Inline Logo

Single-line format for tight spaces.

**Format:** `Century of the Game`

| Element | Style |
|---------|-------|
| "Century" / "Game" | Playfair Display, 700 weight |
| "of the" | Crimson Text, 400 italic |
| "of the" color | Burgundy on light, Gold on dark |

---

### 2.5 Monogram (CG)

Square mark for favicons, app icons, and small-format uses.

**Specifications:**

| Element | Value |
|---------|-------|
| Container | Square, 2px border (matches text color) |
| Letters | "CG" — Playfair Display, 700 weight, centered |
| Corner accents | 8px × 8px L-shapes, Gold, all four corners |
| Minimum size | 32px × 32px |

---

### 2.6 Icon Mark

Diamond shape with centered "C" for social avatars and loading states.

**Specifications:**

| Element | Value |
|---------|-------|
| Diamond | 60px × 60px square rotated 45°, 3px Gold border |
| Letter "C" | Playfair Display, 700 weight, 32px, centered |

---

### 2.7 Clear Space & Minimum Sizes

| Logo Version | Minimum Width | Clear Space |
|--------------|---------------|-------------|
| Primary Stacked | 200px | Height of "C" on all sides |
| Horizontal | 180px | Height of divider bar |
| Badge | 120px | 20px minimum |
| Monogram | 32px | 8px minimum |
| Icon Mark | 40px | 10px minimum |

---

## 3. Color Palette

### 3.1 Primary Colors

| Name | Hex | RGB | CSS Variable | Usage |
|------|-----|-----|--------------|-------|
| Charcoal | `#1C1B19` | 28, 27, 25 | `--color-charcoal` | Primary background, text on light |
| Burgundy | `#7A2C2C` | 122, 44, 44 | `--color-burgundy` | Primary accent, CTAs, "of the" on light |
| Gold | `#C9A45C` | 201, 164, 92 | `--color-gold` | Highlights, "of the" on dark, dividers |
| Cream | `#F7F4EB` | 247, 244, 235 | `--color-cream` | Light background, text on dark |

### 3.2 Secondary Colors

| Name | Hex | RGB | CSS Variable | Usage |
|------|-----|-----|--------------|-------|
| Charcoal Light | `#2A2926` | 42, 41, 38 | `--color-charcoal-light` | Cards, elevated surfaces on dark |
| Burgundy Dark | `#5C2020` | 92, 32, 32 | `--color-burgundy-dark` | Hover state for burgundy buttons |
| Gold Light | `#D4B876` | 212, 184, 118 | `--color-gold-light` | Hover/active gold elements |
| Cream Dark | `#EBE7DB` | 235, 231, 219 | `--color-cream-dark` | Gradient end, subtle depth on light |
| Navy | `#1E2A3A` | 30, 42, 58 | `--color-navy` | Alternative dark, team themes |
| Sepia | `#8B7355` | 139, 115, 85 | `--color-sepia` | Vintage accents, secondary text on light |
| Text Muted | `#7A756B` | 122, 117, 107 | `--color-text-muted` | Secondary text, captions, metadata |

### 3.3 CSS Variables

```css
:root {
  /* Primary */
  --color-charcoal: #1C1B19;
  --color-burgundy: #7A2C2C;
  --color-gold: #C9A45C;
  --color-cream: #F7F4EB;
  
  /* Secondary */
  --color-charcoal-light: #2A2926;
  --color-burgundy-dark: #5C2020;
  --color-gold-light: #D4B876;
  --color-cream-dark: #EBE7DB;
  --color-navy: #1E2A3A;
  --color-sepia: #8B7355;
  --color-text-muted: #7A756B;
  
  /* Borders */
  --border-subtle: #3A3733;
}
```

---

## 4. Typography

### 4.1 Font Stack

| Role | Font Family | Weights | Source |
|------|-------------|---------|--------|
| Display / Headlines | Playfair Display | 400, 600, 700, 800 | Google Fonts |
| Accents / Taglines | Crimson Text | 400, 400i, 600 | Google Fonts |
| Body / UI | Source Sans 3 | 300, 400, 500, 600 | Google Fonts |
| Labels / All-caps | Bebas Neue | 400 | Google Fonts (optional) |

### 4.2 Google Fonts Import

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@300;400;500;600&family=Bebas+Neue&display=swap');
```

### 4.3 Type Scale

| Element | Size | Weight | Line Height | Letter Spacing | Font |
|---------|------|--------|-------------|----------------|------|
| Hero Title | 64–72px | 800 | 1.1 | 3–4px | Playfair Display |
| H1 | 42–48px | 700 | 1.2 | 2px | Playfair Display |
| H2 | 28–32px | 600 | 1.3 | 1px | Playfair Display |
| H3 | 22–24px | 600 | 1.4 | 0.5px | Playfair Display |
| Tagline | 22–28px | 400i | 1.4 | 2px | Crimson Text |
| Body Large | 18px | 400 | 1.6 | normal | Source Sans 3 |
| Body | 16px | 400 | 1.6 | normal | Source Sans 3 |
| Caption/Label | 12–14px | 500 | 1.4 | 2–4px (uppercase) | Source Sans 3 |
| Nav Links | 14px | 400 | 1.4 | 1px | Source Sans 3 |

### 4.4 CSS Font Definitions

```css
/* Headlines */
.heading-hero {
  font-family: 'Playfair Display', serif;
  font-size: 72px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 3px;
}

.heading-1 {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 2px;
}

.heading-2 {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 1px;
}

/* Taglines / Accents */
.tagline {
  font-family: 'Crimson Text', serif;
  font-style: italic;
  font-size: 22px;
  line-height: 1.4;
  letter-spacing: 2px;
}

/* Body */
.body-text {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.6;
}

/* Labels */
.label {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
}
```

---

## 5. Taglines & Copy

### 5.1 Tagline Hierarchy

| Type | Tagline | Usage Context |
|------|---------|---------------|
| **PRIMARY** | *"Every era. Every legend. Your lineup."* | Hero sections, marketing, brand statements |
| Historical | *"124 years. One diamond."* | Emphasizing scope/history |
| Engagement | *"Where history takes the field."* | Promotional, social media |
| Concise | *"Manage the ages."* | Buttons, headers, ads |
| Descriptive | *"From the deadball to today."* | Product descriptions, about pages |
| Minimal | *"History plays here."* | Footer, loading screens, favicon alt |
| Action | *"Build your legacy."* | Call-to-action contexts |

### 5.2 Tone Guidelines

- Evoke nostalgia without being corny
- Respect the statistical/analytical nature of the product
- Use "diamond" as a recurring motif (baseball diamond + gem quality)
- Avoid exclamation points — let the history speak for itself
- Prefer active constructions: "Build" over "You can build"
- Use em-dashes (—) for year ranges, not hyphens

---

## 6. UI Components

### 6.1 Buttons

| Type | Background | Text/Border | Hover State |
|------|------------|-------------|-------------|
| Primary | Burgundy `#7A2C2C` | Cream `#F7F4EB` | Burgundy Dark `#5C2020` |
| Secondary | Transparent | Gold `#C9A45C` (2px border) | Gold fill @ 10% opacity |
| Dark | Charcoal `#1C1B19` | Cream `#F7F4EB` | Charcoal Light `#2A2926` |
| Gold Accent | Gold `#C9A45C` | Charcoal `#1C1B19` | Gold Light `#D4B876` |

**Button Specifications:**

```css
.btn {
  font-family: 'Source Sans 3', sans-serif;
  font-weight: 500;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 14px 30px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--color-burgundy);
  color: var(--color-cream);
}

.btn-primary:hover {
  background: var(--color-burgundy-dark);
}

.btn-secondary {
  background: transparent;
  color: var(--color-cream);
  border: 2px solid var(--color-gold);
}

.btn-secondary:hover {
  background: rgba(201, 164, 92, 0.1);
}
```

### 6.2 Cards

```css
.card {
  background: var(--color-charcoal-light);
  border: 1px solid var(--border-subtle);
  padding: 40px;
}

.card-light {
  background: var(--color-cream);
  border: 1px solid var(--color-cream-dark);
}
```

### 6.3 Navigation Bar

**Specifications:**

| Element | Value |
|---------|-------|
| Height | 70–80px |
| Background | Charcoal `#1C1B19` |
| Border bottom | 3px solid Gold `#C9A45C` |
| Logo placement | Left, with 40px padding |
| Nav links | Right-aligned, 30px gap |
| Link style | Source Sans 3, 14px, Cream, 1px letter-spacing |

### 6.4 Footer

**Specifications:**

| Element | Value |
|---------|-------|
| Background | Charcoal `#1C1B19` |
| Border top | 1px solid `#3A3733` |
| Padding | 50px 60px |
| Logo | Compact/inline format, 18px |
| Tagline | Crimson Text italic, 14px, Gold |

---

## 7. Spacing & Layout

### 7.1 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 8px | Tight gaps, icon margins |
| `--space-sm` | 16px | Component internal padding |
| `--space-md` | 24px | Section gaps |
| `--space-lg` | 40px | Card padding, major gaps |
| `--space-xl` | 60px | Section padding |
| `--space-2xl` | 80px | Page section margins |
| `--space-3xl` | 100px | Hero vertical padding |

### 7.2 Container Widths

| Container | Max Width | Padding |
|-----------|-----------|---------|
| Full | 1400px | 40px (mobile: 20px) |
| Content | 900px | 40px |
| Narrow | 600px | 40px |

### 7.3 Breakpoints

| Name | Value | Usage |
|------|-------|-------|
| Mobile | < 600px | Single column, reduced spacing |
| Tablet | 600–900px | 2-column grids |
| Desktop | 900–1200px | Full layouts |
| Wide | > 1200px | Max-width containers |

---

## 8. Implementation Notes

### 8.1 Dark Mode (Default)

The primary theme is dark. Light sections should be used sparingly for contrast (hero areas, featured content).

**Dark Theme:**
- Background: Charcoal `#1C1B19`
- Cards: Charcoal Light `#2A2926`
- Text: Cream `#F7F4EB`
- Accent text: Gold `#C9A45C`

**Light Sections:**
- Background: Cream `#F7F4EB`
- Text: Charcoal `#1C1B19`
- Accent text: Burgundy `#7A2C2C`

### 8.2 Background Textures

For hero sections and featured areas, consider subtle texture overlays:

```css
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,..."); /* crosshatch or grid pattern */
  opacity: 0.03;
  pointer-events: none;
}
```

### 8.3 Transitions

Standard transition for interactive elements:

```css
transition: all 0.3s ease;
```

### 8.4 Border Styles

| Use Case | Style |
|----------|-------|
| Subtle dividers (dark bg) | 1px solid `#3A3733` |
| Accent dividers | 2–3px solid Gold `#C9A45C` |
| Card borders | 1px solid `#3A3733` |
| Badge/framed elements | 3px solid (matches text color) |

### 8.5 Favicon Specifications

| Size | Format | Content |
|------|--------|---------|
| 16×16 | ICO/PNG | Monogram "CG" simplified |
| 32×32 | PNG | Monogram "CG" with corner accents |
| 180×180 | PNG | Full monogram (Apple Touch) |
| 512×512 | PNG | Full monogram (PWA) |

### 8.6 Meta / SEO

```html
<meta name="theme-color" content="#1C1B19">
<meta name="description" content="Century of the Game — Historical fantasy baseball simulation covering 124 years (1901–2025). Every era. Every legend. Your lineup.">
```

---

## Asset Checklist

- [ ] Primary logo (SVG, PNG @1x, @2x)
- [ ] Horizontal logo (SVG, PNG @1x, @2x)
- [ ] Badge logo (SVG, PNG @1x, @2x)
- [ ] Monogram (SVG, PNG @1x, @2x, ICO)
- [ ] Icon mark (SVG, PNG @1x, @2x)
- [ ] Favicon set (16, 32, 180, 512)
- [ ] Social share images (1200×630 for OG, 1200×1200 for square)
- [ ] Color palette file (ASE, Figma, or CSS variables)
- [ ] Font files (self-hosted backup) or Google Fonts link

---

*End of Style Reference Document*
