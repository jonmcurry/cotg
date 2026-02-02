# UI Modernization Implementation Plan

**Date:** 2026-02-02
**Based on:** docs/UI_MODERNIZATION_PLAN.md

## Summary

Transform the functional UI into a "Modern Vintage" baseball experience - 1900s nostalgia meets 2025 visual fidelity.

## Changes

- [x] 1. **tailwind.config.js** - Design system updates
  - Deepen charcoal to #121212 (near-black) for higher contrast
  - Shift burgundy to #800020 (deeper crimson)
  - Mute gold to #C5A059 (metallic)
  - Adjust cream to #F5F5F0 (newsprint)
  - Add `leather` accent color (#8B4513)
  - Add `backgroundImage` utility for subtle grain texture
  - Add custom box-shadow for premium cards

- [x] 2. **src/index.css** - Global styles overhaul
  - Remove duplicate .btn-primary, .btn-secondary, .card definitions
  - Add CSS noise/grain overlay on body via ::after pseudo-element
  - Add ::selection styling (gold bg, charcoal text)
  - Add page entry fade-in animation
  - Modernize buttons: uppercase, wide tracking, slight rounded (2px), lift + shadow on hover
  - Modernize cards: thin border, no shadow-md, soft diffused shadow, paper-like bg
  - Glass variant for modals/overlays
  - Refined input styling with transitions

- [x] 3. **App.tsx** - Layout polish
  - Hero section: massive centered "CENTURY OF THE GAME" with mixed serif/sans typography
  - Minimalist header
  - Refined footer with leather accent border
  - Updated feature cards styling

- [x] 4. **index.html** - Add italic weight for Playfair Display

- [x] 5. **changelog.md** - Rule 10

- [x] 6. **Commit** - Rule 9
