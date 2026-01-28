# Remove Excessive Debug Logging in TabbedPlayerPool

## Problem
CPU draft is STILL extremely slow despite two previous optimizations. Console shows thousands of log messages flooding the console during CPU draft.

## Root Cause Analysis

### Console Output Shows
```
[TabbedPlayerPool] Pitcher filtered from position players: ▶ {name: 'Julio Santana', ...}
[TabbedPlayerPool] Pitcher filtered from position players: ▶ {name: 'Eric Strickland', ...}
[TabbedPlayerPool] Pitcher filtered from position players: ▶ {name: 'Jordan Lyles', ...}
[TabbedPlayerPool] Pitcher filtered from position players: ▶ {name: 'Glen Moulder', ...}
... (repeated thousands of times)
```

### Code Analysis

**File:** [TabbedPlayerPool.tsx](../../src/components/draft/TabbedPlayerPool.tsx:30-47)

The `isPositionPlayer()` function logs EVERY pitcher that doesn't meet the 200 at-bats threshold:

```typescript
const isPositionPlayer = (player: PlayerSeason): boolean => {
  const atBats = Number(player.at_bats || 0)
  const qualifies = atBats >= 200

  // Debug logging for pitchers who might incorrectly appear as position players
  if (!qualifies && (player.innings_pitched_outs || 0) >= 30 && atBats > 0) {
    console.log('[TabbedPlayerPool] Pitcher filtered from position players:', {
      name: player.display_name || `${player.first_name} ${player.last_name}`,
      at_bats: player.at_bats,
      at_bats_type: typeof player.at_bats,
      at_bats_parsed: atBats,
      innings_pitched_outs: player.innings_pitched_outs,
      primary_position: player.primary_position
    })
  }

  return qualifies
}
```

This function is called from line 81:
```typescript
const positionPlayers = useMemo(() => {
  const filtered = availablePlayers.filter(p => isPositionPlayer(p))
  // ...
}, [availablePlayers])
```

### Why This Is Slow

**The Call Chain:**
1. CPU makes a pick → session updates
2. DraftBoard re-renders with updated draftedPlayerIds
3. TabbedPlayerPool receives updated draftedPlayerIds prop
4. `availablePlayers` useMemo re-runs (dependency changed)
5. `positionPlayers` useMemo re-runs (dependency changed)
6. Calls `isPositionPlayer()` for ALL 60,000+ available players
7. For each of ~55,000 pitchers, logs to console (lines 36-43)

**Performance Impact:**
- `console.log()` is synchronous and blocks the main thread
- Creating log objects with player data is expensive
- Browser console rendering is slow with thousands of messages
- This happens AFTER EVERY CPU PICK

### Why This Log Exists

This appears to be debug logging added during development to verify pitcher filtering logic works correctly. It was likely useful for:
- Debugging the "relief pitchers as starting pitchers" issue
- Verifying the 200 at-bats threshold works
- Ensuring pitchers don't appear in position player pool

However, it should have been removed before deployment because:
- It's debug-level logging, not error/warning
- It logs expected behavior (filtering pitchers is correct)
- It creates thousands of log messages per render
- It provides no value to users
- It causes severe performance degradation

## Solution

### Option 1: Remove Debug Logging Entirely (RECOMMENDED)

Remove lines 34-44 from `isPositionPlayer()` function:

**Advantages:**
- Eliminates performance bottleneck completely
- Clean code - no unnecessary logging
- Expected behavior doesn't need logging

**Implementation:**
```typescript
const isPositionPlayer = (player: PlayerSeason): boolean => {
  const atBats = Number(player.at_bats || 0)
  return atBats >= 200
}
```

### Option 2: Convert to Error-Only Logging

Only log if something unexpected happens (pitcher WITH 200+ at-bats):

**Disadvantages:**
- Still has logging overhead (though much less)
- More complex condition
- Unlikely to catch any bugs (filtering logic is correct)

### Option 3: Make Logging Conditional on Dev Mode

Only log in development environment:

**Disadvantages:**
- Still slow in development
- Adds complexity (checking environment)
- Vite doesn't expose NODE_ENV in browser by default

## Implementation Plan (Option 1)

- [ ] Remove debug logging from `isPositionPlayer()` function (lines 34-44)
- [ ] Simplify function to just return the qualification check
- [ ] Test CPU draft performance - should be fast now
- [ ] Verify position player pool still filters correctly
- [ ] Check if there's similar logging elsewhere in TabbedPlayerPool
- [ ] Remove any other excessive debug logging found

## Expected Results

### Before:
- CPU pick triggers 55,000+ console.log calls
- Each log creates object with player data
- Browser console renders thousands of messages
- Total time: ~500ms-2000ms just for logging

### After:
- No logging during position player filtering
- Filtering still works correctly (logic unchanged)
- Expected result: TabbedPlayerPool filtering <50ms

## Additional Logging to Review

The file has several other console.log statements:
- Line 73: Filter timing (acceptable - logs once per filter)
- Line 86-91: Error logging for bugs (acceptable - only if bug detected)
- Line 107: Filter timing (acceptable - logs once)
- Line 118: Search filter timing (acceptable - logs once)
- Line 126: Sort start (acceptable - logs once)

These are all acceptable because they log ONCE per operation, not once per player.

## Technical Notes

### Why useMemo Doesn't Help Here

Even though `positionPlayers` is wrapped in useMemo, it still re-runs when dependencies change. Since `availablePlayers` changes after every pick (draftedPlayerIds changes), the filtering runs repeatedly.

The solution is not to optimize when filtering happens, but to optimize WHAT happens during filtering (removing expensive logging).

### Rule Compliance

This fix follows CLAUDE.md rules:
- Rule 2: Not hiding the bug - the filtering logic is correct, we're removing debug logging
- Rule 3: Not a silent fallback - removing unnecessary noise
- Rule 5: Cleaning up the mess - removing debug code that should have been removed before
- Rule 8: Proper solution - removing the root cause (excessive logging), not adding workarounds
