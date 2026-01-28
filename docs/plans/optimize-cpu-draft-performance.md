# Optimize CPU Draft Performance

## Problem
CPU draft is extremely slow when selecting players. The draft pauses for several seconds each time a CPU team needs to make a pick.

## Root Cause Analysis

### Current Implementation
The `selectBestPlayer()` function in [cpuDraftLogic.ts](../../src/utils/cpuDraftLogic.ts:122-211) processes ALL 69,459 players for every single pick:

1. **Line 132-134**: Filter all 69,459 players to find undrafted ones
   ```typescript
   const undraftedPlayers = availablePlayers.filter(
     p => !draftedPlayerIds.has(p.id)
   )
   ```

2. **Lines 158-167**: Filter undrafted players by position eligibility
   ```typescript
   candidates = undraftedPlayers.filter(player =>
     playerQualifiesForPosition(player.primary_position, targetPosition)
   )
   ```

3. **Lines 178-181**: Calculate weighted scores for ALL candidates
   ```typescript
   const scoredCandidates = candidates.map(player => ({
     player,
     score: calculateWeightedScore(player, targetPosition),
   }))
   ```

4. **Line 184**: Sort ALL scored candidates
   ```typescript
   scoredCandidates.sort((a, b) => b.score - a.score)
   ```

5. **Lines 187-190**: Only THEN take top 5 and randomly select one

### Performance Impact
- **69,459 players** processed every pick
- Multiple array operations (filter, filter, map, sort)
- Happens for EVERY CPU pick (potentially hundreds of picks per draft)
- JavaScript single-threaded execution blocks UI

### Why This Is Slow
The algorithm does unnecessary work:
- Scores ALL candidates even though we only need top 5
- Processes all 69k players when only top ~500 by rating matter
- Players array is already sorted by `apba_rating DESC` (from DraftBoard query)
- No need to re-sort entire candidate pool

## Solution

### Approach 1: Pre-Filter Player Pool (RECOMMENDED)
Only pass top N undrafted players to `selectBestPlayer()`:

**Advantages:**
- Minimal code changes
- Maintains existing CPU logic
- Easy to tune performance (adjust N)
- Players already sorted by rating

**Implementation:**
1. In DraftBoard.tsx line 317, filter players before passing to selectBestPlayer
2. Only include top 1000-2000 undrafted players by rating
3. Since players are already sorted DESC by rating, just take first N undrafted

### Approach 2: Early Exit on Score Calculation
Calculate scores only until we have enough high-scoring candidates:

**Advantages:**
- More sophisticated algorithm
- Dynamic optimization

**Disadvantages:**
- More complex code changes
- Harder to reason about
- May miss good players if early candidates are poor

### Approach 3: Use Web Worker
Move CPU draft logic to background thread:

**Disadvantages:**
- Complex implementation
- Requires serialization of player data
- Overkill for this problem

## Implementation Plan (Approach 1)

- [ ] Modify DraftBoard.tsx CPU draft logic (line 309-317)
- [ ] Filter `draftedIds` from `players` array
- [ ] Take only first 1000 undrafted players (already sorted by rating DESC)
- [ ] Pass filtered array to `selectBestPlayer()`
- [ ] Add performance logging to verify improvement
- [ ] Test with full 69k player pool to ensure CPU still makes good picks
- [ ] Document the optimization in code comments

## Expected Results

### Before:
- CPU pick delay: 2-5 seconds (user report: "extremely slow")
- Processing: 69,459 players per pick

### After:
- CPU pick delay: <100ms + 1-2s artificial delay for realism
- Processing: ~1000 top-rated undrafted players per pick
- 98.5% reduction in data processed

### Why This Is Safe:
- Players are pre-sorted by `apba_rating DESC` in SQL query
- Top 1000 players include all star players worth drafting
- Lower-rated players (rating <10) not competitive anyway
- CPU still uses same selection algorithm, just on smaller pool

## Validation
- [ ] CPU completes picks quickly (<100ms compute time)
- [ ] CPU still drafts appropriate players for positions
- [ ] No regression in draft quality
- [ ] UI remains responsive during CPU picks
- [ ] Test with 8 CPU teams drafting back-to-back

## Technical Notes

The SQL query in DraftBoard.tsx line 127-128 already sorts by rating:
```typescript
.order('apba_rating', { ascending: false, nullsFirst: false })
```

This means `players[0]` = highest rated player, `players[69458]` = lowest rated.

Taking first N undrafted players = top N by rating still available.
