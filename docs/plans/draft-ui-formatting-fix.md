# Draft Player Pool UI Formatting Fix

**Date**: 2026-01-27
**Issue**: Player rows not displaying year/team and rating information

---

## Problem Analysis

### Current State (From Screenshot)
```
▶ P  Paul Abbott
  P  Mick Abel
```

### Expected State
```
▶ P  Paul Abbott           10 seasons | Grade C
  P  Mick Abel             2025 PHI   | Grade D
```

### Issues Identified

1. **Missing right-side content**: Year/seasons and rating not visible
2. **Layout problem**: Flex justify-between not working in table context
3. **No visual separation**: Position, name, info all run together
4. **Poor information density**: Critical draft info (rating) not visible

---

## Root Cause

The table structure with `<td colSpan={3}>` containing a flex div is causing layout issues:

```tsx
<td colSpan={3} className="p-0">
  <div className="flex items-center justify-between"> // This may not span full width
    <div>Left side</div>
    <div>Right side</div>  // Not visible!
  </div>
</td>
```

**Issue**: The flex container inside the `<td>` may not be expanding to full width, or the table is constraining the layout.

---

## Solution: Restructure Table Layout

### Option 1: Use Full-Width Flex with Explicit Widths
Add `w-full` class to ensure flex container spans full table width

### Option 2: Use Table Cells Properly
Split into actual table cells instead of colSpan

### Option 3: Improve Visual Hierarchy
Make the layout more compact and information-dense

**Recommended**: Option 1 + 3 (full-width flex + better visual design)

---

## Implementation Plan

### Phase 1: Fix Flex Container Width
```tsx
<div className="flex items-center justify-between w-full px-2 py-2">
  {/* Ensures flex spans full table width */}
</div>
```

### Phase 2: Improve Visual Layout
```tsx
<div className="flex items-center justify-between w-full px-4 py-2.5">
  {/* Left: Position + Name */}
  <div className="flex items-center gap-3 min-w-0 flex-1">
    {hasMultipleSeasons && <span>▶</span>}
    <span className="text-xs text-burgundy font-display w-10">{pos}</span>
    <span className="font-medium text-charcoal truncate">{name}</span>
  </div>

  {/* Right: Info + Rating */}
  <div className="flex items-center gap-4 flex-shrink-0">
    <span className="text-xs text-charcoal/60 min-w-[100px]">
      {hasMultipleSeasons ? "10 seasons" : "2025 PHI"}
    </span>
    <span className="text-sm font-medium text-burgundy min-w-[80px] text-right">
      Grade A
    </span>
  </div>
</div>
```

### Phase 3: Fix Table Structure
```tsx
<table className="w-full text-sm table-fixed">
  {/* Ensure table uses full width and fixed layout */}
  <colgroup>
    <col className="w-full" /> {/* Single column, content handles layout */}
  </colgroup>
  <thead className="sticky top-0 bg-cream border-b border-charcoal/20">
    <tr>
      <th className="py-2 px-4 font-display text-charcoal/80 text-left">
        Players Available
      </th>
    </tr>
  </thead>
  <tbody>
    {/* Each row contains full-width flex layout */}
  </tbody>
</table>
```

---

## Visual Design Improvements

### Spacing
- Increase horizontal padding: `px-2` → `px-4`
- Increase vertical padding: `py-2` → `py-2.5`
- Add gap between elements: `gap-2` → `gap-3`

### Width Management
- Add `min-w-0` to left container (allows text truncation)
- Add `flex-1` to left container (takes available space)
- Add `flex-shrink-0` to right container (prevents squashing)
- Add `min-w-[100px]` to year/season info (ensures visibility)
- Add `min-w-[80px]` to rating (ensures visibility)

### Text Truncation
- Add `truncate` to player name (prevents overflow)
- Add `text-right` to rating (right-align for visual balance)

### Table Headers
Simplify to single column header since content is self-organizing

---

## Expected Result

### Multi-Season Player
```
▶ P  Nolan Ryan                    7 seasons       Grade A
```

### Single-Season Player
```
  P  Sandy Koufax                  1965 LAD        Grade A
```

### Expanded View
```
▼ P  Nolan Ryan                    7 seasons       Grade A
     P  1973 CAL                   Grade A         2.87 ERA  383K  16W
     P  1974 CAL                   Grade B         2.89 ERA  367K  22W
```

---

## Files to Modify

1. `src/components/draft/GroupedPlayerPool.tsx`
   - Fix flex container width
   - Improve spacing and sizing
   - Add min-width constraints
   - Simplify table structure

---

**Priority**: HIGH (blocks user from seeing critical draft information)
**Estimated Time**: 30 minutes
