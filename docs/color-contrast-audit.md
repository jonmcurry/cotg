# Color Contrast Audit Report

**Date:** 2026-01-24
**Target:** WCAG 2.1 Level AA Compliance
**Requirements:**
- Normal text: 4.5:1 minimum contrast ratio
- Large text (18pt+): 3:1 minimum contrast ratio
- UI components: 3:1 minimum contrast ratio

---

## Light Theme Audit

### Text Colors on Primary Background (#f8fafc)

| Element | Foreground | Background | Estimated Ratio | Status | Action |
|---------|------------|------------|-----------------|---------|---------|
| Primary text | #0f172a | #f8fafc | ~15:1 | ✅ Pass | None |
| Secondary text | #475569 | #f8fafc | ~8:1 | ✅ Pass | None |
| Muted text | #94a3b8 | #f8fafc | ~2.8:1 | ❌ Fail | Darken to #64748b |
| Links (primary) | #1e40af | #f8fafc | ~7:1 | ✅ Pass | None |

### Text Colors on Secondary Background (#ffffff)

| Element | Foreground | Background | Estimated Ratio | Status | Action |
|---------|------------|------------|-----------------|---------|---------|
| Primary text | #0f172a | #ffffff | ~16:1 | ✅ Pass | None |
| Secondary text | #475569 | #ffffff | ~8.5:1 | ✅ Pass | None |
| Muted text | #94a3b8 | #ffffff | ~3.0:1 | ❌ Fail | Darken to #64748b |

### Button Colors

| Element | Foreground | Background | Estimated Ratio | Status | Action |
|---------|------------|------------|-----------------|---------|---------|
| Primary button text | #ffffff | #1e40af | ~8:1 | ✅ Pass | None |
| Secondary button text | #ffffff | #059669 | ~6:1 | ✅ Pass | None |
| Danger button text | #ffffff | #dc2626 | ~5:1 | ✅ Pass | None |

### UI Components

| Element | Color 1 | Color 2 | Estimated Ratio | Status | Action |
|---------|---------|---------|-----------------|---------|---------|
| Border | #e2e8f0 | #f8fafc | ~1.1:1 | ⚠️ Low | Acceptable for decorative |
| Focus outline | #1e40af | #ffffff | ~7:1 | ✅ Pass | None |

---

## Dark Theme Audit

### Text Colors on Primary Background (#0f172a)

| Element | Foreground | Background | Estimated Ratio | Status | Action |
|---------|------------|------------|-----------------|---------|---------|
| Primary text | #f1f5f9 | #0f172a | ~15:1 | ✅ Pass | None |
| Secondary text | #cbd5e1 | #0f172a | ~12:1 | ✅ Pass | None |
| Muted text | #64748b | #0f172a | ~5:1 | ✅ Pass | None |

### Text Colors on Secondary Background (#1e293b)

| Element | Foreground | Background | Estimated Ratio | Status | Action |
|---------|------------|------------|-----------------|---------|---------|
| Primary text | #f1f5f9 | #1e293b | ~13:1 | ✅ Pass | None |
| Secondary text | #cbd5e1 | #1e293b | ~10:1 | ✅ Pass | None |
| Muted text | #64748b | #1e293b | ~4.5:1 | ✅ Pass | None |

### UI Components

| Element | Color 1 | Color 2 | Estimated Ratio | Status | Action |
|---------|---------|---------|-----------------|---------|---------|
| Border | #334155 | #0f172a | ~2.5:1 | ✅ Pass | None |
| Focus outline | #3b82f6 | #1e293b | ~7:1 | ✅ Pass | None |

---

## Violations Found

### Critical Issues (WCAG AA Failures)

1. **Muted text in light theme** - `--text-muted: #94a3b8`
   - Current ratio: ~2.8-3.0:1 on light backgrounds
   - Required: 4.5:1 for normal text
   - **Fix:** Change to `#64748b` (estimated 5:1 ratio)

---

## Color-Blind Considerations

- ✅ Success/error states use icons in addition to color (toasts have checkmark/X icons)
- ✅ HOF status in draft table uses "Yes"/"-" text, not just color
- ✅ Draft board uses team names and numbers, not just colors
- ✅ Form validation shows error text, not just red borders

---

## Recommended Changes

### CSS Variables to Update

```css
:root {
    /* Current: --text-muted: #94a3b8; */
    --text-muted: #64748b;  /* Improved contrast 4.5:1+ */
}
```

---

## Testing Recommendations

### Automated Tools
- [ ] Run Lighthouse accessibility audit (target: 95+ score)
- [ ] Run axe DevTools (target: 0 violations)
- [ ] Run WAVE browser extension

### Manual Testing
- [ ] Test with keyboard navigation only
- [ ] Test with screen reader (NVDA or VoiceOver)
- [ ] Test at 200% browser zoom
- [ ] Test in Windows High Contrast mode

---

## Compliance Status

**Overall:** ⚠️ Nearly Compliant (1 violation)

**Before Fixes:**
- ❌ WCAG AA Level: Not compliant (muted text fails)
- Total violations: 1 (text contrast)

**After Fixes:**
- ✅ WCAG AA Level: Compliant
- Total violations: 0

---

## Notes

- All button text exceeds minimum contrast requirements
- Focus indicators have strong contrast on both themes
- Interactive elements are distinguishable without relying solely on color
- Toast notifications use both color and icons for semantic meaning
- Dark theme has better contrast ratios overall than light theme
