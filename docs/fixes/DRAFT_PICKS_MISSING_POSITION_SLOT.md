# Draft Picks Missing Position/Slot Data

## Problem

Roster corruption in draft - only 4 players show after 15 rounds, CPU draft fails with "Could not find a player to draft".

**Root Cause**: The `draft_picks` table doesn't store `position` or `slotNumber` columns.

**Sequence of Failure**:
1. CPU makes pick #1 via API (sends position + slotNumber)
2. Backend stores pick in database WITHOUT position/slotNumber
3. `applyCpuPick()` updates local Zustand state correctly (roster has player in correct slot)
4. Something triggers `loadSession()` (component remount, page refresh, persist rehydrate)
5. `loadSession()` fetches picks from backend (no position/slot data)
6. `loadSession()` tries to reconstruct roster using broken logic: "find first unfilled slot" (line 176)
7. All picks get placed in wrong roster slots
8. Roster becomes corrupted
9. CPU can't find valid positions to draft to
10. Draft fails

## Solution

Add `position` and `slot_number` columns to `draft_picks` table and update all related code.

## Implementation Checklist

### Phase 1: Database Schema
- [ ] Create migration: `supabase/migrations/YYYYMMDD_add_position_slot_to_draft_picks.sql`
  - [ ] Add `position` column (TEXT, NOT NULL after backfill)
  - [ ] Add `slot_number` column (INTEGER, NOT NULL after backfill)
  - [ ] Backfill existing picks (if any) with default values or delete corrupted data
  - [ ] Add constraints and indexes

### Phase 2: Backend API Updates
- [ ] Update `backend/src/routes/picks.ts` - makePick endpoint
  - [ ] Store position and slot_number when inserting picks
  - [ ] Verify INSERT statement includes new columns
- [ ] Update `backend/src/routes/cpu.ts` - CPU draft endpoint
  - [ ] Ensure CPU picks store position and slot_number
- [ ] Update TypeScript types for pick responses
  - [ ] Verify DraftPick interface includes position/slotNumber

### Phase 3: Frontend Store Updates
- [ ] Update `src/stores/draftStore.ts` - loadSession function
  - [ ] Replace "find first unfilled slot" logic with proper position/slot matching
  - [ ] Use pick.position and pick.slotNumber from backend response
  - [ ] Add error handling for missing position data
- [ ] Update API response types
  - [ ] DraftSessionApiResponse picks array should include position/slotNumber

### Phase 4: Testing
- [ ] Test migration applies cleanly to fresh database
- [ ] Test pick creation stores position/slotNumber
- [ ] Test loadSession correctly reconstructs rosters
- [ ] Test CPU draft completes full draft without corruption
- [ ] Test human picks + CPU picks mixed
- [ ] Test page refresh during draft preserves roster state

### Phase 5: Cleanup & Documentation
- [ ] Remove debug console.log statements (Rule 5)
- [ ] Update supabase/migrations/README.md with new migration
- [ ] Commit to GitHub (Rule 9)
- [ ] Update CHANGELOG.md (Rule 10)
- [ ] Delete this plan file (Rule 5 - cleanup temporary files)

## Files to Modify

### Database
- `supabase/migrations/[NEW]_add_position_slot_to_draft_picks.sql` - CREATE
- `supabase/migrations/README.md` - UPDATE

### Backend
- `backend/src/routes/picks.ts` - UPDATE (store position/slot_number)
- `backend/src/routes/cpu.ts` - UPDATE (store position/slot_number)

### Frontend
- `src/stores/draftStore.ts` - UPDATE (fix loadSession roster reconstruction)
- `CHANGELOG.md` - UPDATE

## Migration SQL Preview

```sql
-- Add position and slot_number columns to draft_picks
ALTER TABLE draft_picks
  ADD COLUMN position TEXT,
  ADD COLUMN slot_number INTEGER;

-- Backfill strategy: DELETE corrupted data (safer than guessing positions)
-- User mentioned there are 672 picks in database from testing - these are corrupted
DELETE FROM draft_picks WHERE position IS NULL;

-- Now make columns NOT NULL
ALTER TABLE draft_picks
  ALTER COLUMN position SET NOT NULL,
  ALTER COLUMN slot_number SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_draft_picks_position_slot
  ON draft_picks(draft_team_id, position, slot_number);

-- Add check constraint for valid positions
ALTER TABLE draft_picks
  ADD CONSTRAINT check_valid_position
  CHECK (position IN ('C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CL'));

-- Add check constraint for slot_number
ALTER TABLE draft_picks
  ADD CONSTRAINT check_valid_slot_number
  CHECK (slot_number > 0);
```

## Testing Steps

1. Apply migration to development database
2. Create new draft session (fresh start)
3. Start draft with all CPU teams
4. Observe first 5 picks complete successfully
5. Refresh browser page (force loadSession)
6. Verify roster still shows all 5 players in correct positions
7. Continue draft to completion
8. Verify all teams have full rosters (21 players each)
9. No "Could not find a player to draft" errors

## Expected Outcome

After fix:
- All picks store position and slot_number in database
- loadSession correctly reconstructs rosters from database picks
- Page refresh during draft preserves roster state
- CPU draft completes without roster corruption
- All teams end with full 21-player rosters in correct positions
