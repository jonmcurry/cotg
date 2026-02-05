# CPU Draft Performance Analysis & Fix Plan

## Problem
CPU draft picks take ~2 seconds each when they should be near-instant (sub-100ms).

## Root Cause Analysis

### Current Flow Per CPU Pick
The `/api/draft/sessions/:sessionId/cpu-pick` endpoint makes **5 database queries** per pick:

1. `SELECT * FROM draft_sessions WHERE id = $1` - Load session (line 274)
2. `SELECT * FROM draft_teams WHERE draft_session_id = $1` - Load teams (line 285)
3. `SELECT * FROM draft_picks WHERE draft_session_id = $1` - Load all picks (line 310)
4. `getOrLoadPlayerPool()` - **CACHED** (30-min TTL)
5. `INSERT INTO draft_picks ...` - Write pick (line 364)
6. `UPDATE draft_sessions ...` - Update session state (line 386)

### Latency Breakdown (estimated)
- Network: Vercel -> Render -> Neon = ~100-200ms round-trip
- Each query: ~20-50ms on Neon (serverless cold start can be higher)
- 5 queries x 50ms = 250ms minimum, often 500ms+
- Plus API overhead: JSON serialization, Express middleware

### Why 2 Seconds?
For a 4-team draft:
- Frontend calls API -> wait for response -> update state -> re-render -> trigger next pick
- Each round-trip is ~500ms-1s with all overhead
- React re-render + useEffect trigger adds 100-200ms

## Solution Options

### Option A: Server-Side Session Cache (Recommended)
Cache session/teams/picks in memory (like player pool) per session:
- [ ] Create `sessionCache` module similar to `playerPoolCache`
- [ ] Cache session, teams, and picks together
- [ ] Invalidate on writes (pick made, session update)
- [ ] Expected: 3 queries -> 0-1 queries per pick (cache hit)

**Pros**: Minimal frontend changes, big impact
**Cons**: Cache invalidation complexity

### Option B: Batch CPU Picks
Single API call to process all consecutive CPU picks:
- [ ] New endpoint: `POST /cpu-picks-batch`
- [ ] Server loops through CPU picks until human turn
- [ ] Return all picks at once

**Pros**: Eliminates frontend round-trips entirely
**Cons**: Larger API change, long-running request

### Option C: Frontend Optimistic Updates (Partial Fix)
- [ ] Don't wait for API response before triggering next CPU pick
- [ ] Use optimistic state updates

**Pros**: Feels faster
**Cons**: Complex error handling, doesn't fix backend latency

## Recommended Implementation

### Phase 1: Session Data Cache (Primary Fix)
Add session data caching to reduce 3 read queries to 0:

```typescript
// backend/src/lib/sessionCache.ts
interface CachedSession {
  session: DbSessionRow
  teams: DbTeamRow[]
  picks: DbPickRow[]
  loadedAt: number
}

const sessionCache = new Map<string, CachedSession>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getSessionData(sessionId: string) { ... }
export function invalidateSessionCache(sessionId: string) { ... }
```

### Phase 2: Batch CPU Picks (IMPLEMENTED)
Phase 1 alone wasn't enough due to frontend round-trip overhead. Implemented batch endpoint:

```typescript
// POST /api/draft/sessions/:sessionId/cpu-picks-batch
// Processes ALL consecutive CPU picks in one API call
router.post('/:sessionId/cpu-picks-batch', async (req, res) => {
  // Load session data from cache
  // Loop through picks until human turn or completion
  // Return all picks in single response
})

// Frontend applies all picks at once
applyCpuPicksBatch(picks, sessionUpdate)
```

## Checklist

### Phase 1: Session Cache
- [x] Create session cache module (`backend/src/lib/sessionCache.ts`)
- [x] Integrate cache into `/cpu-pick` endpoint
- [x] Add cache invalidation on pick write
- [x] Add cache invalidation on session update

### Phase 2: Batch CPU Picks
- [x] Create batch endpoint (`/cpu-picks-batch`)
- [x] Update frontend to use batch endpoint
- [x] Add `applyCpuPicksBatch` to draftStore
- [x] Test with timing logs
- [x] Update changelog

## Success Criteria
- [x] CPU picks complete in <200ms per pick on backend (after player pool warm)
- [x] All consecutive CPU picks complete in single API call
- [x] Full 84-pick draft with 4 CPU teams: ~5-10 seconds
- [x] No functional regressions
