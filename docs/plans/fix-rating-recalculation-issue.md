# Fix Rating Recalculation Issue

## Problem Discovered
Mike Lieberthal (C, 1999 PHI) has rating 64.8 despite having much worse stats than:
- Lou Gehrig (1B, 1930 NYA): Rating 64.8, OPS 1.194
- Babe Ruth (OF, 1928 NYA): Rating 64.6, OPS 1.172
- Lieberthal OPS: 0.914 (significantly lower)

## Investigation

Checked database values for these three players:

```
Player                 OPS      ISO      RC     Rating(DB)  Rating(Calc)
--------------------------------------------------------------------------------
Lieberthal 1999       0.914  0.251  100.3        64.8          45.5   ⚠️ MISMATCH!
Gehrig 1930           1.194  0.343  203.6        64.8          64.8   ✓ Correct
Ruth 1928             1.172  0.386  190.3        64.6          64.6   ✓ Correct
```

### Root Cause
Mike Lieberthal still has his OLD rating (64.8) calculated with the buggy position multiplier formula:
- Old formula: `(offensive_rating × 0.7 + defensive_rating × 0.3) × position_multiplier`
- Catcher multiplier: 1.3x
- This inflated his rating from ~50 to 64.8

The first rating recalculation (task b1f2617) either:
1. Ran before the formula fix was fully saved
2. Had a race condition where some players weren't updated
3. Had cached module imports using the old formula

Gehrig and Ruth have CORRECT ratings because they don't get position boosts (1B=1.0x, OF=1.0x).

## Correct Formula (Already Implemented)

```typescript
export function calculateBatterRating(player: PlayerSeasonStats): number {
  const components: number[] = []

  if (player.ops !== null) components.push(player.ops * 100)
  if (player.runs_created_advanced !== null) components.push(player.runs_created_advanced / 5)
  if (player.isolated_power !== null) components.push(player.isolated_power * 100)

  if (components.length === 0) return 0

  return components.reduce((sum, val) => sum + val, 0) / components.length
}
```

## Solution
Re-run rating recalculation script (task bb48e0b) to ensure ALL players get updated with correct formula.

### Expected Results After Fix
```
Mike Lieberthal 1999:
  Current (Wrong): 64.8
  Correct: 45.5
  Change: -19.3 points

Lou Gehrig 1930:
  Current: 64.8
  Correct: 64.8
  Change: 0 (already correct)

Babe Ruth 1928:
  Current: 64.6
  Correct: 64.6
  Change: 0 (already correct)
```

## Impact
- All catchers, shortstops, and other scarce positions will have ratings reduced
- Offensive stats will be the ONLY factor (as required by user)
- Historical greats like Ruth/Gehrig will properly rank above modern catchers with worse stats

## Timeline
1. **2026-01-28 07:00**: Discovered issue via user screenshot
2. **2026-01-28 08:30**: Identified root cause (stale ratings in database)
3. **2026-01-28 08:35**: Started re-recalculation (task bb48e0b)
4. **2026-01-28 08:45** (estimated): Recalculation complete
