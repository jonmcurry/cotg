# Fix: 409 Infinite Loop - Duplicate player_season_id Constraint

## Problem

CPU draft gets stuck in an infinite 409 error loop around round 6 (picks 188-190). The error is:
```
duplicate key value violates unique constraint "draft_picks_draft_session_id_player_season_id_key"
```
The draft freezes and floods the console with repeated 409 errors.

## Root Causes

### 1. Deduplication fails when `player_id` is null
The CPU builds `draftedPlayerIds` from `pick.playerId`. If `player_id` is null on any player record:
- `pick.playerId` is stored as null
- `draftedPlayerIds.has(null)` is always false
- The player is never excluded from the pool
- CPU can select an already-drafted `player_season_id`

### 2. Upsert only handles one of two unique constraints
DB has two unique constraints on `draft_picks`:
- `UNIQUE(draft_session_id, pick_number)` - handled by `onConflict`
- `UNIQUE(draft_session_id, player_season_id)` - NOT handled

When the CPU tries to draft an already-drafted player_season at a different pick_number, PostgreSQL can't resolve the conflict on the second constraint and returns 409.

### 3. `makePick` failure causes infinite retry loop
When `makePick` fails:
- Returns early without updating local state
- `currentPick` never advances
- `draftInProgress.current` resets to false in `finally` block
- `cpuThinking` changes, re-triggering the useEffect
- Same player is selected again -> same 409 -> infinite loop

## Fix

### Change 1: Dual deduplication with `draftedSeasonIds` (`DraftBoard.tsx`)
- Added `draftedSeasonIds` set tracking exact `playerSeasonId` from completed picks
- CPU draft filters undrafted players by BOTH `player_id` (cross-season) AND season id (exact match fallback)
- Passed `draftedSeasonIds` to `TabbedPlayerPool` for consistent UI filtering

### Change 2: `makePick` returns success/failure (`draftStore.ts`)
- Changed return type from `Promise<void>` to `Promise<boolean>`
- Returns `true` on success, `false` on any error
- All early returns now return `false`

### Change 3: CPU draft handles failure (`DraftBoard.tsx`)
- Checks `makePick` return value
- On failure: pauses draft and shows error alert instead of infinite loop

### Change 4: Improved 409 diagnostics (`draftStore.ts`)
- Detects `23505` error code with `player_season_id` in message
- Logs specific "DUPLICATE PLAYER" warning for clear diagnosis

## Files Modified
- [x] `src/components/draft/DraftBoard.tsx` - Dual deduplication, handle makePick failure
- [x] `src/components/draft/TabbedPlayerPool.tsx` - Accept and use `draftedSeasonIds` prop
- [x] `src/stores/draftStore.ts` - Return boolean from makePick, improved 409 messaging

## Verification
- `npm run build` compiles without errors
- Draft should complete without 409 errors or infinite loops
- If a 409 does occur (edge case), draft pauses instead of looping
