# Century of the Game - Rebrand Implementation Plan

**Date:** 2026-01-24
**Scope:** Complete visual rebrand from APBA Baseball Web to Century of the Game
**Approach:** Professional, heritage-focused design following SRD specifications

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Checklist](#implementation-checklist)
3. [Color Palette Migration](#color-palette-migration)
4. [Typography Implementation](#typography-implementation)
5. [Logo Integration](#logo-integration)
6. [Component Updates](#component-updates)
7. [Testing Strategy](#testing-strategy)

---

## Overview

### Brand Transition

| From | To |
|------|-----|
| APBA Baseball Web | Century of the Game |
| Modern tech aesthetic | Vintage baseball heritage |
| Blue/neutral palette | Charcoal/Burgundy/Gold |
| Inter font | Playfair Display + Crimson Text + Source Sans 3 |
| Light theme default | Dark theme default |

### Key Design Principles

1. **Vintage / Heritage** - Evoke baseball's history (1901-2025)
2. **Serious / Authoritative** - Professional, not cartoonish
3. **Statistical / Analytical** - Respect the numbers
4. **Timeless** - Works across all eras

### Primary Tagline

> *"Every era. Every legend. Your lineup."*

---

## Implementation Checklist

### Phase 1: Foundation (Core Colors & Typography)
- [ ] Add Google Fonts (Playfair Display, Crimson Text, Source Sans 3)
- [ ] Update CSS variables with SRD color palette
- [ ] Set dark theme as default
- [ ] Update body font to Source Sans 3
- [ ] Update headings to Playfair Display
- [ ] Test typography rendering

### Phase 2: Logo & Branding
- [ ] Create SVG versions of logo (stacked, horizontal, monogram)
- [ ] Add logo to header (horizontal version)
- [ ] Create favicon set (16, 32, 180, 512) with CG monogram
- [ ] Update page title to "Century of the Game"
- [ ] Add tagline to appropriate locations
- [ ] Update meta tags

### Phase 3: Core UI Components
- [ ] Update header/navigation bar
- [ ] Update buttons (primary, secondary, dark, gold accent)
- [ ] Update cards (dark background, gold borders)
- [ ] Update form inputs
- [ ] Update navigation links
- [ ] Update footer

### Phase 4: Module-Specific Updates
- [ ] League Manager module
- [ ] Advanced Draft module
- [ ] Team Config module
- [ ] Stat Master module
- [ ] Broadcast Blast module

### Phase 5: Polish & Details
- [ ] Update loading screens
- [ ] Update empty states
- [ ] Update modals
- [ ] Update toast notifications
- [ ] Update error messages
- [ ] Add subtle textures/accents

### Phase 6: Testing & Documentation
- [ ] Test all functionality
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test accessibility (WCAG AA compliance maintained)
- [ ] Update README
- [ ] Update CHANGELOG
- [ ] Create rebrand completion report
- [ ] Commit to GitHub

---

## Color Palette Migration

### Current Colors → New Colors

| Current Use | Old Color | New Color | New Variable |
|-------------|-----------|-----------|--------------|
| Primary background | `#0f172a` | `#1C1B19` (Charcoal) | `--color-charcoal` |
| Secondary background | `#1e293b` | `#2A2926` (Charcoal Light) | `--color-charcoal-light` |
| Primary accent | `#3b82f6` | `#7A2C2C` (Burgundy) | `--color-burgundy` |
| Secondary accent | — | `#C9A45C` (Gold) | `--color-gold` |
| Text on dark | `#f8fafc` | `#F7F4EB` (Cream) | `--color-cream` |
| Text on light | `#0f172a` | `#1C1B19` (Charcoal) | `--color-charcoal` |
| Muted text | `#64748b` | `#7A756B` (Text Muted) | `--color-text-muted` |
| Borders | `#334155` | `#3A3733` (Border Subtle) | `--border-subtle` |

### CSS Variables to Add

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
  --border-gold: 2px solid var(--color-gold);
}
```

---

## Typography Implementation

### Font Stack

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| Display/Headlines | Playfair Display | 400, 600, 700, 800 | H1, H2, H3, logo text |
| Accents/Taglines | Crimson Text | 400, 400i, 600 | "of the" in logo, taglines |
| Body/UI | Source Sans 3 | 300, 400, 500, 600 | Body text, buttons, nav |

### Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### Type Scale

| Element | Size | Weight | Line Height | Font |
|---------|------|--------|-------------|------|
| Hero Title | 72px | 800 | 1.1 | Playfair Display |
| H1 | 48px | 700 | 1.2 | Playfair Display |
| H2 | 32px | 600 | 1.3 | Playfair Display |
| H3 | 24px | 600 | 1.4 | Playfair Display |
| Tagline | 22px | 400i | 1.4 | Crimson Text |
| Body | 16px | 400 | 1.6 | Source Sans 3 |
| Nav Links | 14px | 400 | 1.4 | Source Sans 3 |

---

## Logo Integration

### Logo Versions to Create

1. **Stacked Logo** (Hero sections, splash)
   ```
   CENTURY
   of the
   GAME
   1901 — 2025
   ```

2. **Horizontal Logo** (Header/Navigation)
   ```
   [Gold Line] | CENTURY
               | of the
               | GAME
   ```

3. **Monogram** (Favicon, icons)
   ```
   [Square frame with CG inside]
   ```

### Logo Placement

- **Header**: Horizontal logo, left side, 32px height
- **Footer**: Compact inline format
- **Favicon**: CG monogram, 32x32px
- **Loading Screen**: Stacked logo (optional)

---

## Component Updates

### Header/Navigation

```css
.app-header {
  background: var(--color-charcoal);
  border-bottom: 3px solid var(--color-gold);
  height: 70px;
  padding: 0 40px;
}

.logo {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  font-weight: 700;
  color: var(--color-cream);
}

.logo-accent {
  font-family: 'Crimson Text', serif;
  font-style: italic;
  font-size: 14px;
  color: var(--color-gold);
}

.nav-btn {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 14px;
  color: var(--color-cream);
  letter-spacing: 1px;
}
```

### Buttons

```css
.btn-primary {
  background: var(--color-burgundy);
  color: var(--color-cream);
  font-family: 'Source Sans 3', sans-serif;
  font-weight: 500;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 14px 30px;
}

.btn-primary:hover {
  background: var(--color-burgundy-dark);
}

.btn-secondary {
  background: transparent;
  color: var(--color-cream);
  border: 2px solid var(--color-gold);
}

.btn-gold {
  background: var(--color-gold);
  color: var(--color-charcoal);
}
```

### Cards

```css
.card {
  background: var(--color-charcoal-light);
  border: 1px solid var(--border-subtle);
  padding: 40px;
}

.card-header {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-cream);
  letter-spacing: 1px;
}
```

---

## Testing Strategy

### Visual Testing

- [ ] Desktop (1920x1080, 1440x900)
- [ ] Tablet (iPad, 1024x768)
- [ ] Mobile (iPhone, 375x667)
- [ ] Dark mode appearance
- [ ] Light sections appearance
- [ ] Logo rendering at all sizes

### Functional Testing

- [ ] All navigation works
- [ ] All buttons clickable
- [ ] Forms functional
- [ ] Draft system works
- [ ] Game simulation works
- [ ] Database connections work

### Accessibility Testing

- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Focus indicators visible
- [ ] Touch targets 44x44px minimum

### Browser Testing

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Safari
- [ ] Mobile Chrome

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Foundation | 6 tasks | 2 hours |
| Phase 2: Logo & Branding | 6 tasks | 2 hours |
| Phase 3: Core UI | 6 tasks | 2 hours |
| Phase 4: Modules | 5 tasks | 1.5 hours |
| Phase 5: Polish | 5 tasks | 1 hour |
| Phase 6: Testing & Docs | 6 tasks | 1.5 hours |

**Total Estimated Effort:** 10 hours

---

## Success Criteria

- [ ] App renamed to "Century of the Game"
- [ ] Dark theme is default
- [ ] SRD color palette fully implemented
- [ ] Typography matches SRD specifications
- [ ] Logo visible in header and favicon
- [ ] Tagline visible in appropriate location
- [ ] All existing functionality works
- [ ] WCAG AA accessibility maintained
- [ ] No console errors
- [ ] Professional, heritage aesthetic achieved

---

*Implementation begins: 2026-01-24*
