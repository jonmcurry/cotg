# Loading Hang Fix Plan

## Problem
UI hangs on "Loading Players..." screen after cache warms. Console shows:
- "Cache warmed: 76560 players in 18884ms"
- Then nothing - no batch picks response

## Analysis

### Observed Behavior
1. Component mounts, two effects fire in parallel:
   - `loadPlayers()` effect -> calls `/players/pool-full`
   - CPU batch effect -> calls `/warmup` then `/cpu-picks-batch`
2. Warmup completes (19s) and logs "Cache warmed"
3. Batch picks endpoint called but no response logged
4. UI stuck on loading because `loading` state never becomes `false`

### Root Cause Hypothesis
The CPU batch effect runs BEFORE player loading completes:
- CPU batch effect guards: `session`, `currentTeam`, `control === 'cpu'`, `status === 'in_progress'`
- Missing guard: `!loading` - doesn't wait for player pool to load

This causes:
1. CPU batch calls warmup (loads backend cache in 19s)
2. CPU batch calls `/cpu-picks-batch`
3. Meanwhile, player loading is ALSO running the same query
4. Total timeout budget (55s) consumed by redundant parallel requests
5. Frontend stuck waiting for player loading to complete

### Why This Is Bad
- Two parallel requests to load 76,560 players
- First one to complete goes to cache, second is redundant
- Both consume timeout budget
- If batch endpoint is slow, it times out and UI hangs

## Solution Options

### Option 1: Add `loading` guard to CPU batch effect
Don't start CPU batch until players are loaded:
```typescript
if (loading) {
  console.log('[CPU Batch] BLOCKED: Still loading players')
  return
}
```

Pros: Simple, prevents race condition
Cons: Adds sequential delay

### Option 2: Share cache warming between effects
Make player loading use the same `/warmup` endpoint, then load from cache.

### Option 3: Combine effects
Single effect that loads players then runs CPU batch.

## Recommended: Option 1
Simplest fix - add `loading` guard to CPU batch effect. The player loading already takes 19s, so we're not losing time by waiting.

## Test Cases
1. Start draft with all CPU teams -> should not hang on loading
2. Start draft with mixed teams -> should load players then start CPU
3. Player loading failure -> should show error, not hang

## Files to Modify
- src/components/draft/DraftBoard.tsx (add loading guard)
