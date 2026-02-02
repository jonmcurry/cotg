# Fix: Drafted Players Not Removed From Pool (Cross-Season Deduplication)

## Problem

Once a player is drafted (e.g., Babe Ruth 1927), their other seasons (e.g., Babe Ruth 1923) remain visible in the draft pool and can be drafted again. Players should be fully removed from the pool across ALL seasons once any season is drafted.

## Root Cause

The `draftedPlayerIds` computation relied on an indirect, fragile lookup chain:
1. Get `playerSeasonId` from completed picks
2. Find matching record in the `players` array by `id`
3. Extract `player_id` from that record
4. Add to the drafted set

If step 2 fails silently (player not found in array due to timing, data mismatch, or array not yet loaded), the `player_id` is never added to the set, and all seasons of that player remain "available."

Additionally, `PlayerPool.tsx` had a bug comparing `p.id` (season-specific UUID) against the `draftedPlayerIds` set which contains `player_id` values - these are different ID types and would never match.

## Fix

### Change 1: Add `playerId` to DraftPick type (`draft.types.ts`)
Store the persistent `player_id` directly on each pick so deduplication doesn't require a lookup.

### Change 2: Store `playerId` in makePick (`draftStore.ts`)
When a pick is made, resolve `playerId` (from parameter or database) BEFORE creating the pick object, ensuring it's always stored.

### Change 3: Direct deduplication from picks (`DraftBoard.tsx`)
Both the UI `draftedPlayerIds` useMemo and the CPU draft effect now read `pick.playerId` directly instead of doing an indirect lookup through the `players` array. Falls back to the old lookup for legacy drafts that don't have `playerId` on picks.

### Change 4: Fix PlayerPool.tsx (`PlayerPool.tsx`)
Changed `draftedPlayerIds.has(p.id)` to `draftedPlayerIds.has(p.player_id)` in both the filter and the isDrafted check.

## Files Modified
- [x] `src/types/draft.types.ts` - Added `playerId` field to `DraftPick`
- [x] `src/stores/draftStore.ts` - Store `playerId` on picks; initialize in `createSession`
- [x] `src/components/draft/DraftBoard.tsx` - Direct `pick.playerId` deduplication (UI + CPU)
- [x] `src/components/draft/PlayerPool.tsx` - Fix `p.id` -> `p.player_id`

## Verification
- `npm run build` compiles without errors
- Draft a multi-season player (e.g., from years 1920 + 1927) - after drafting their 1927 season, their 1920 season should disappear from the pool
- CPU should never draft the same player twice across different seasons
