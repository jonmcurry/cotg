# Bug Fix: Pitchers with < 200 at_bats showing in Position Players Tab

## Problem
Pitchers with less than 200 at_bats are appearing in the position players list during the draft.

## Analysis

### Expected Behavior
- Position Players tab should ONLY show players with `at_bats >= 200`
- Pitchers tab should show players with `innings_pitched_outs >= 30`
- Two-way players (both `at_bats >= 200` AND `innings_pitched_outs >= 30`) should appear in BOTH tabs

### Current Code Review

1. **DraftBoard.tsx (lines 70, 127)**: Query correctly uses `.or('at_bats.gte.200,innings_pitched_outs.gte.30')`
2. **TabbedPlayerPool.tsx (line 31)**: `isPositionPlayer` correctly checks `(player.at_bats || 0) >= 200`
3. **PositionAssignmentModal.tsx (line 61)**: Also correctly checks `(player.at_bats || 0) >= 200`

### Potential Root Causes

1. **Type Coercion Issue**: `at_bats` field might be a string instead of number from Supabase
2. **Null Handling**: `at_bats` might be null/undefined and default logic failing
3. **Browser Cache**: User might have old JavaScript cached with 50 threshold
4. **Data Issue**: Database might have incorrect data (strings instead of numbers)
5. **Component Mix**: User might be looking at GroupedPlayerPool instead of TabbedPlayerPool (no position filtering)

## Investigation Steps

- [ ] Add console logging to see actual at_bats values and types for pitchers
- [ ] Verify TabbedPlayerPool is the active component being used
- [ ] Check if at_bats is being returned as correct type from Supabase
- [ ] Test with specific example pitcher (< 200 at_bats) to reproduce issue
- [ ] Check browser console for any errors during filtering

## Proposed Solution

Once root cause is identified:
1. Add explicit type conversion if needed: `Number(player.at_bats || 0) >= 200`
2. Add defensive checks to ensure data integrity
3. Add unit tests for position player filtering logic
4. Update CHANGELOG.md with fix

## Testing
- [ ] Verify pitchers with < 200 at_bats do NOT appear in Position Players tab
- [ ] Verify two-way players (>= 200 at_bats AND >= 30 IP) appear in BOTH tabs
- [ ] Verify position players with >= 200 at_bats appear in Position Players tab
- [ ] Test with edge cases (null at_bats, 0 at_bats, exactly 200 at_bats)
