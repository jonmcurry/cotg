# CPU Batch Performance Optimization Plan

## Current State (from logs)
- Warmup: 19.5 seconds (working)
- Cache HIT: yes (no reload during batch)
- Pick speed: 2-3 seconds per pick
- 32 teams × 21 rounds = 672 total picks
- At 2-3 sec/pick = 22-34 minutes for full draft!

## Problem
Each pick does 2 database operations:
1. INSERT INTO draft_picks - ~1 second (Neon network latency)
2. UPDATE draft_sessions - ~1 second (Neon network latency)

With 672 picks, that's 1344 database round-trips!

## Solution: Batch Database Writes

Instead of writing after every pick:
1. Make picks in memory (no DB writes)
2. Accumulate picks in array
3. Write all picks in ONE batch INSERT
4. Update session ONCE at the end

### Expected Improvement
- Current: 672 picks × 2 DB calls = 1344 round-trips
- Batch: 1 batch INSERT + 1 UPDATE = 2 round-trips
- Should be ~100x faster for DB operations

### Implementation Steps
- [ ] Modify batch endpoint to accumulate picks in memory
- [ ] Use single INSERT with multiple VALUES
- [ ] Update session once at end of batch
- [ ] Update cache once at end of batch
- [ ] Test with 32-team draft

## Alternative: Increase batch size without timeout
- Use streaming response
- Return partial results periodically
- Frontend shows progress as picks complete
