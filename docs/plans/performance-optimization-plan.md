# Performance Optimization Plan

## Issues Reported
1. Players take a while to load before drafting begins
2. Rosters/lineup/starting pitchers take a while to load after drafting

## Root Cause Analysis

### Issue 1: Player Loading (DraftBoard)
- **Current State**: First cache miss = 2-5 seconds (DB query + 6-21MB JSON transfer)
- **Cache Hit**: <10ms (excellent)
- **Problem**: No pre-warming - cache loads only when draft starts, blocking UX

### Issue 2: Clubhouse Loading
- **CRITICAL BOTTLENECK**: Sequential auto-lineup generation
- **Current Code** (Clubhouse.tsx:136-162):
  ```typescript
  for (const team of session.teams) {
    await api.post(`/teams/${team.id}/auto-lineup`, { roster })
    // ...
  }
  ```
- **Impact**: 8 teams x 150ms = 1200ms total (sequential)
- **Fix**: Use Promise.all() = max(150ms) = 150ms (parallel)
- **Expected improvement**: 4-8x faster

## Implementation Plan

### Phase 1: Parallelize Auto-Lineup Generation (HIGH IMPACT) - COMPLETED
- [x] Write test for parallel lineup generation
- [x] Convert sequential for-await to Promise.allSettled()
- [x] Test with 8-team league
- [x] Measure improvement (4x speedup confirmed in tests)

### Phase 2: Pre-warm Player Cache (MEDIUM IMPACT)
- [ ] Add cache warming endpoint or trigger
- [ ] Warm cache when draft session starts (before UI needs it)
- [ ] Consider warming on session creation

### Phase 3: Loading UX Improvements
- [ ] Add progress indicators during initial load
- [ ] Show partial results as they complete (streaming UI)

## Success Metrics
- Player pool load: <2 seconds (or feels instant due to pre-warming)
- Clubhouse load: <500ms for 8-team league (down from 1200ms+)
