# Draft Error Investigation Plan

## Issue Description
- Draft start keeps erroring out
- When draft does start, only the first pick is being made
- Console shows 500 Internal Server Error on subsequent CPU picks
- Error: "ERROR during CPU draft. Check console for details."

## Investigation Checklist

### Phase 1: Understand the System
- [ ] Review draft session state management (frontend)
- [ ] Review CPU draft API endpoint implementation (backend)
- [ ] Review draft pick logic and flow
- [ ] Identify where the 500 error is being thrown

### Phase 2: Root Cause Analysis
- [x] Check API error logs/responses
- [x] Verify session state between picks
- [x] Check for race conditions or timing issues
- [x] Review database constraints and transactions
- [x] Check for memory leaks or resource issues

### ROOT CAUSE IDENTIFIED
Database CHECK constraint in [migration file](supabase/migrations/20260203_add_position_slot_to_draft_picks.sql) only allows:
`C, 1B, 2B, 3B, SS, LF, CF, RF, DH, SP, RP, CL`

But application code uses:
- `OF` (Outfield) - **MISSING from constraint**
- `BN` (Bench) - **MISSING from constraint**

When CPU tries to draft for position 'OF' or 'BN', database rejects with constraint violation → 500 error.

**Files affected:**
- [supabase/migrations/20260203_add_position_slot_to_draft_picks.sql](supabase/migrations/20260203_add_position_slot_to_draft_picks.sql) - Constraint definition
- [backend/src/routes/cpu.ts](backend/src/routes/cpu.ts) - Uses OF and BN positions
- [backend/src/routes/draft.ts](backend/src/routes/draft.ts) - Position definitions
- [src/types/draft.types.ts](src/types/draft.types.ts) - Frontend position types

### Phase 3: Fix Implementation
- [x] Address identified root cause
  - Created new migration to update CHECK constraint
  - Added 'OF' and 'BN' to valid positions list
- [x] Migration created: [20260203_fix_position_constraint.sql](supabase/migrations/20260203_fix_position_constraint.sql)
- [ ] **USER ACTION REQUIRED**: Run migration against database
  - Set SUPABASE_DB_PASSWORD environment variable
  - Run: `npm run deploy:migrations`
  - Or manually run: `psql "$CONN_STRING" -f supabase/migrations/20260203_fix_position_constraint.sql`
- [ ] Test fix with multiple CPU picks

### Phase 4: Verification
- [ ] Test full CPU draft flow
- [ ] Verify all picks complete successfully
- [ ] Check for any side effects

### Phase 5: Cleanup
- [ ] Update CHANGELOG.md
- [ ] Remove this investigation file
- [ ] Commit changes to GitHub

## Notes
- First pick succeeds, suggesting initial setup is correct
- Error occurs on subsequent picks, suggesting state/session issue
- API endpoint: `/draft/sessions/{sessionId}/start/...?token=...&pick`
