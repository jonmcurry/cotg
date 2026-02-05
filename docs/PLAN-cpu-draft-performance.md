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

### Phase 2: Batch CPU Picks (Optional Enhancement)
If Phase 1 isn't enough, add batch endpoint.

## Checklist

- [x] Create session cache module (`backend/src/lib/sessionCache.ts`)
- [x] Integrate cache into `/cpu-pick` endpoint
- [x] Add cache invalidation on pick write
- [x] Add cache invalidation on session update
- [x] Test with timing logs
- [x] Verify sub-200ms CPU picks
- [x] Update changelog

## Success Criteria
- CPU picks complete in <200ms (after player pool warm)
- No functional regressions
- Draft of 84 picks (4 teams x 21 rounds) completes in <30 seconds total for CPU picks
