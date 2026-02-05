# CPU Draft Performance Optimization Plan

## Problem Statement
The CPU draft is extremely slow because it **reloads the entire 69,000+ player pool for EVERY PICK**. With 10 CPU teams x 21 rounds = 210 CPU picks, and each taking 30-60 seconds to load players, the draft takes **hours** instead of minutes.

## Root Cause Analysis
1. **No caching**: `cpu.ts` fetches all players from Supabase on every `/cpu-pick` call
2. **Supabase 1000 row limit**: Requires pagination (multiple API calls)
3. **Large dataset**: 125 years x ~500 players/year = 60,000+ player-seasons
4. **Parallel batches help but not enough**: Still 10-15 API calls per pick

## Performance Target
- **Current**: 30-60 seconds per CPU pick
- **Target**: <2 seconds per CPU pick
- **Improvement**: 15-30x faster

---

## Optimization Strategy: Server-Side Player Pool Cache

### Phase 1: In-Memory Cache (Highest Impact)
- [x] Create a module-level cache for player pools keyed by session ID
- [x] Load player pool ONCE on first CPU pick for a session
- [x] Reuse cached pool for all subsequent picks in that session
- [x] Clear cache when draft completes or after timeout (30 min)

### Phase 2: Drafted Player Tracking (Already Exists)
- [x] `draftedPlayerIds` Set is built from existing picks
- [x] This correctly filters out already-drafted players
- [x] Verify this works correctly with cached pool

### Phase 3: Remove Diagnostic Logging (Performance)
- [ ] Comment out verbose logging in selectBestPlayer
- [ ] Comment out 2B/SS diagnostic logging
- [ ] Keep only essential error logging

---

## Implementation Checklist

### Step 1: Create Player Pool Cache Module
- [x] Create `backend/src/lib/playerPoolCache.ts`
- [x] Export `getOrLoadPlayerPool(sessionId, yearList)` function
- [x] Store pools in Map with expiration timestamps
- [x] Add `clearCache(sessionId)` for cleanup

### Step 2: Modify CPU Pick Endpoint
- [x] Import cache module in `cpu.ts`
- [x] Replace inline pool loading with cache lookup
- [x] Pass sessionId and yearList to cache
- [x] Log cache hit/miss for debugging

### Step 3: Clear Cache on Draft Complete
- [x] Add cache clear when status changes to 'completed'
- [x] Add cache clear on session delete
- [x] Add TTL-based expiration (30 minutes)

### Step 4: Reduce Logging Overhead
- [ ] Move diagnostic logging behind a DEBUG flag
- [ ] Remove console.log from hot paths
- [ ] Keep timing logs for performance monitoring

### Step 5: Testing
- [ ] Test cache works across multiple picks
- [ ] Verify draft completes successfully
- [ ] Measure actual performance improvement
- [ ] Test cache expiration works

---

## Technical Design

### Cache Structure
```typescript
// backend/src/lib/playerPoolCache.ts

interface CachedPool {
  players: PlayerSeason[]
  loadedAt: number
  yearList: number[]
}

const poolCache = new Map<string, CachedPool>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function getOrLoadPlayerPool(
  sessionId: string,
  yearList: number[]
): Promise<PlayerSeason[]> {
  const cacheKey = sessionId
  const cached = poolCache.get(cacheKey)

  // Return cached if valid
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    console.log(`[Cache] HIT for session ${sessionId}: ${cached.players.length} players`)
    return cached.players
  }

  // Load from database
  console.log(`[Cache] MISS for session ${sessionId}, loading...`)
  const players = await loadPlayersFromSupabase(yearList)

  // Store in cache
  poolCache.set(cacheKey, {
    players,
    loadedAt: Date.now(),
    yearList
  })

  return players
}

export function clearCache(sessionId?: string): void {
  if (sessionId) {
    poolCache.delete(sessionId)
  } else {
    poolCache.clear()
  }
}
```

### Modified CPU Pick Flow
```typescript
// In cpu.ts /cpu-pick endpoint

// BEFORE (slow - loads every time):
const [hittersResult, pitchersResult] = await Promise.all([...])
const allPlayers = [...hittersResult.data, ...pitchersResult.data]

// AFTER (fast - uses cache):
const allPlayers = await getOrLoadPlayerPool(sessionId, yearList)
```

---

## Expected Performance Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| First CPU pick | 30-60s | 30-60s | Same (cache miss) |
| Subsequent picks | 30-60s | 0.5-2s | **30-60x faster** |
| Total draft (100 picks) | 50-100 min | 2-5 min | **20-50x faster** |

---

## Risk Assessment

### Low Risk
- Cache is per-session, isolated from other drafts
- TTL prevents stale data accumulation
- Fallback: If cache fails, loads fresh (current behavior)

### Mitigations
1. **Memory limits**: Clear cache after draft complete
2. **Stale data**: 30 min TTL ensures freshness
3. **Multiple servers**: Render uses single instance, cache works

---

## Alternative Approaches (Not Recommended)

### A. Redis Cache
- **Pro**: Shared across instances, persistent
- **Con**: Adds infrastructure complexity, cost
- **Verdict**: Overkill for single-server deployment

### B. Database Materialized View
- **Pro**: Faster queries
- **Con**: Requires Supabase admin access, schema changes
- **Verdict**: Not feasible without DB admin

### C. Frontend-Driven CPU Picks
- **Pro**: Uses already-loaded player pool
- **Con**: Security risk, complex state management
- **Verdict**: Architectural change too large

---

## Success Criteria

1. CPU draft pick completes in <2 seconds (after first pick)
2. Full draft (21 rounds x 32 teams) completes in <10 minutes
3. No errors or player selection failures
4. Memory usage stays under 512MB per session cache

---

## Timeline

- Phase 1 (Cache): 30 minutes
- Phase 2 (Logging cleanup): 15 minutes
- Phase 3 (Testing): 30 minutes
- **Total**: ~1.5 hours

## Files to Modify

1. `backend/src/lib/playerPoolCache.ts` (NEW)
2. `backend/src/routes/cpu.ts` (modify player loading)
3. `backend/src/routes/draft.ts` (clear cache on complete)
