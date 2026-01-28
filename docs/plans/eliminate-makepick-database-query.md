# Eliminate Unnecessary Database Query in makePick

## Problem
CPU draft is STILL extremely slow (2-5 seconds per pick) despite reducing player pool from 69,459 to 1,000 players.

## Root Cause Analysis

### Performance Profiling Added
Added console.time/console.timeEnd calls to measure each step:
1. Build draftedIds Set
2. Filter undrafted players
3. selectBestPlayer()
4. makePick() - database write

### Real Bottleneck Identified
The `makePick()` function in [draftStore.ts](../../src/stores/draftStore.ts:326-433) does **2 database round-trips per pick**:

**Lines 371-380: UNNECESSARY SELECT query**
```typescript
// Fetch player_id from player_seasons table
const { data: playerSeasonData, error: fetchError } = await supabase
  .from('player_seasons')
  .select('player_id')
  .eq('id', playerSeasonId)
  .single()
```

**Lines 383-398: NECESSARY INSERT query**
```typescript
// Save pick to Supabase
const { error } = await supabase
  .from('draft_picks')
  .insert({
    draft_session_id: session.id,
    draft_team_id: team.id,
    player_id: playerSeasonData.player_id, // <-- From previous query
    player_season_id: playerSeasonId,
    pick_number: currentPick.pickNumber,
    round: currentPick.round,
    pick_in_round: currentPick.pickInRound,
  })
```

### Why This Is Slow
- Every pick requires 2 database round-trips (SELECT + INSERT)
- Network latency: ~50-200ms per query
- Total: ~100-400ms just for database I/O per pick
- This is the ACTUAL bottleneck, not CPU processing

### Why the SELECT Query Is Unnecessary
The PlayerSeason interface [cpuDraftLogic.ts:16-49](../../src/utils/cpuDraftLogic.ts#L16-L49) already includes `player_id`:

```typescript
export interface PlayerSeason {
  id: string
  player_id: string  // <-- Already have this!
  year: number
  team_id: string
  primary_position: string
  // ... stats ...
}
```

The DraftBoard query [DraftBoard.tsx:96-125](../../src/components/draft/DraftBoard.tsx#L96-L125) already selects `player_id`:
```typescript
.select(`
  id,
  player_id,  // <-- Already fetched!
  year,
  team_id,
  primary_position,
  apba_rating,
  // ... more fields ...
`)
```

So when we call `makePick(selection.player.id, ...)`, we have `selection.player.player_id` available but we're not using it!

## Solution

### Option 1: Pass player_id to makePick (RECOMMENDED)
Change makePick signature to accept player_id as parameter:

**Advantages:**
- Simple change
- No breaking changes to other callers (can make parameter optional)
- Eliminates 1 of 2 database queries (50% reduction)
- Immediate performance improvement

**Implementation:**
1. Change makePick signature: `makePick(playerSeasonId, playerId, position, slotNumber)`
2. Make playerId optional with fallback to query if not provided (backward compatible)
3. Update CPU draft call: `makePick(selection.player.id, selection.player.player_id, ...)`
4. Update human draft call: `makePick(selectedPlayer.id, selectedPlayer.player_id, ...)`

### Option 2: Batch INSERT picks
Queue picks and insert in batches

**Disadvantages:**
- Complex implementation
- Doesn't solve latency for individual picks
- Adds complexity to draft state management

### Option 3: Pre-fetch player_id for all players
Create lookup map of playerSeasonId -> player_id

**Disadvantages:**
- More memory usage
- Doesn't eliminate query, just moves it earlier
- Still has latency, just less noticeable

## Implementation Plan (Option 1)

- [x] Add performance profiling to identify bottleneck
- [ ] Update makePick signature in draftStore.ts
- [ ] Add optional playerId parameter with fallback to query
- [ ] Update CPU draft call in DraftBoard.tsx to pass player_id
- [ ] Update human draft call in DraftBoard.tsx to pass player_id
- [ ] Remove or comment out unnecessary SELECT query (after testing)
- [ ] Test both CPU and human picks work correctly
- [ ] Verify performance improvement with console.time logs

## Expected Results

### Before:
- makePick time: ~100-400ms (2 database queries)
- CPU pick total: ~200-500ms including selection logic

### After:
- makePick time: ~50-200ms (1 database query)
- CPU pick total: ~50-200ms
- 50% reduction in database queries per pick
- 50-75% faster CPU picks

## Technical Notes

### Backward Compatibility
Make playerId parameter optional to avoid breaking changes:
```typescript
makePick: async (
  playerSeasonId: string,
  playerId: string | undefined,  // Optional
  position: PositionCode,
  slotNumber: number
) => {
  // If playerId not provided, fall back to query
  if (!playerId) {
    const { data } = await supabase
      .from('player_seasons')
      .select('player_id')
      .eq('id', playerSeasonId)
      .single()
    playerId = data?.player_id
  }

  // Rest of function...
}
```

### Why Not Remove Fallback?
Keep the fallback query for:
- Backward compatibility
- Safety if called from other locations
- Future-proofing
- Fail-safe if player_id somehow missing

Later, after verifying all callers pass playerId, we can remove the fallback.
