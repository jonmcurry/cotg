# Roster Draft Bug Investigation

## Issue Description
- Draft is at Round 15 (Pick 467 of 672, Pick in Round 17 of 32)
- Roster only shows 5/21 players filled
- Console error: "[CPU draft] Error: CPU could not find a player to draft"
- Should have 15 players after 15 rounds, but only showing 5

## Screenshots Analysis
From the provided screenshot:
- Players showing in roster: Hundley (C), Pafko (OF), Prim (SP), Hernandez (CL), one more
- Player pool still has many available players
- Draft board shows it's progressing but roster not updating

## Investigation Checklist

### Phase 1: Understand Current State
- [ ] Check draft_picks table schema - verify position/slot_number columns exist
- [ ] Query actual picks in database - count picks for this session
- [ ] Review roster reconstruction logic in loadSession()
- [ ] Review CPU pick logic - why can't it find players?
- [ ] Check if picks are being saved to database at all
- [ ] Verify ROSTER_REQUIREMENTS alignment across codebase

### Phase 2: Identify Root Cause
- [ ] Are picks being saved to DB? (Check backend logs/DB directly)
- [ ] Are position/slot_number being saved correctly?
- [ ] Is loadSession() reconstructing rosters correctly?
- [ ] Is the UI displaying the roster correctly?
- [ ] Why does CPU think no players are available?

### Phase 3: Root Cause Analysis
- [x] Compare expected roster state vs actual DB state
- [x] Check for null/invalid position or slot_number values
- [x] Verify roster requirements logic
- [x] Check if roster slots are being marked as filled incorrectly

## ROOT CAUSE IDENTIFIED

**PRIMARY BUG**: Backend API doesn't return `position` and `slot_number` fields to frontend

**Location**: [backend/src/routes/draft.ts](backend/src/routes/draft.ts)
- Lines 46-54: `DraftPick` interface missing `position` and `slotNumber` fields
- Lines 227-232: Pick overlay logic doesn't include `position` and `slot_number` from database

**Impact Chain**:
1. Database stores position/slot_number correctly ✓
2. Backend API GET endpoint doesn't return these fields ✗
3. Frontend loadSession() requires these fields to reconstruct rosters
4. Without them, roster reconstruction fails completely
5. Roster shows 0/21 or 5/21 (only applyCpuPick updates work)
6. CPU roster rebuilding uses broken "first unfilled" logic
7. Eventually CPU can't find valid positions → "Could not find a player to draft"

**Secondary Issue**: CPU roster rebuilding logic (lines 415-436) uses "find first unfilled slot" instead of position/slot matching, causing incorrect roster state during CPU picks.

### Phase 4: Fix Implementation
- [x] Address identified root cause
  - Added `position` and `slotNumber` fields to `DraftPick` interface
  - Updated pick overlay logic to include position/slot_number from database
  - Fixed CPU roster rebuilding to use position/slot matching
- [x] Files modified:
  - [backend/src/routes/draft.ts](backend/src/routes/draft.ts) - API response fix
  - [backend/src/routes/cpu.ts](backend/src/routes/cpu.ts) - Roster rebuilding fix
- [ ] **USER ACTION REQUIRED**: Deploy backend changes to Render
- [ ] Test fix with full draft flow

### Phase 5: Verification
- [ ] Test draft from start with multiple rounds
- [ ] Verify roster updates after each pick
- [ ] Verify CPU can find players for all positions
- [ ] Test page refresh during draft

### Phase 6: Cleanup
- [ ] Update CHANGELOG.md
- [ ] Remove investigation file
- [ ] Commit to GitHub

## Notes
- Previous fixes added position/slot_number columns to draft_picks table
- This should have resolved roster corruption
- Need to verify the fix is actually working in production
- May be a different issue or incomplete fix
