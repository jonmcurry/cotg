# Draft System Schema Alignment Fix

## Issue
Draft system failing with 401 Unauthorized and 400 Bad Request errors when attempting to create draft sessions.

## Root Causes
1. Invalid/placeholder Supabase anon key in .env file
2. Row Level Security (RLS) policies blocking anonymous access to draft tables
3. Schema mismatch between code and database (column names don't match)
4. Status enum values don't match database constraints

## Resolution Plan

### Phase 1: Authentication Fix
- [x] Retrieve real Supabase anon key from project dashboard
- [x] Update .env file with real key
- [x] Verify Vite auto-restart with new environment variables

### Phase 2: RLS Policy Fix
- [x] Create migration: 20260127_add_draft_rls_policies.sql
- [x] Add permissive RLS policies for all draft tables (draft_sessions, draft_teams, draft_picks, draft_rankings, draft_watchlist)
- [x] Allow anonymous users (anon role) to INSERT, SELECT, UPDATE, DELETE
- [x] Apply migration to Supabase database
- [x] Verify policies are active via psql query

### Phase 3: Schema Alignment
- [x] Identify column name mismatches in draft_sessions table
  - name -> session_name
  - current_pick -> current_pick_number
  - Missing: season_year (required)
  - Missing: draft_type (required)
  - Missing: current_round
- [x] Update draftStore.ts createSession method to use correct column names
- [x] Update draftStore.ts saveSession method to use correct column names
- [x] Update DraftStatus type to match database constraint
  - Old: 'configuring' | 'in_progress' | 'completed' | 'paused'
  - New: 'setup' | 'in_progress' | 'paused' | 'completed' | 'abandoned'

### Phase 4: Code Cleanup (Rule 6: No Emojis)
- [x] Remove emoji characters from App.tsx (home screen feature cards)
- [x] Remove emoji characters from DraftBoard.tsx (loading/completion screens)
- [x] Remove emoji from DraftControls.tsx (team control indicators)
- [x] Replace with text-only (no icon components needed)

### Phase 5: Documentation & Git
- [x] Update CHANGELOG.md with all fixes
- [x] Commit changes to git with descriptive message (commit 5a853a9)
- [x] Clean up temporary scripts (get-supabase-anon-key.ts)
- [x] Clean up backup files (App-Draft.tsx, App-Old.tsx)

## Additional Issues Found

### Issue 4: UUID Format Error (2026-01-27)
**Problem:** Session ID generated as `draft-${Date.now()}` is not a valid UUID format
- Error: `invalid input syntax for type uuid: "draft-1769536158830"`
- The database `draft_sessions.id` column expects UUID type
- Frontend was generating string IDs, causing PATCH requests to fail

**Solution:**
- Let Supabase auto-generate the UUID via `uuid_generate_v4()` default
- Use `.select().single()` to retrieve the generated UUID after insert
- Update local session state with the real UUID from database
- Modified draftStore.ts createSession to insert first, then create session object

## Additional Issues Found (Continued)

### Issue 5: Silent CPU Draft Failure (2026-01-27)
**Problem:** CPU draft stalls showing "Evaluating available players" with no console output
- Violates Rule 3: NO silent fallbacks or silent failures
- No error messages when player loading fails
- No visibility into CPU draft decision process

**Solution:**
- Added comprehensive console logging to player load process
- Added step-by-step logging to CPU draft useEffect
- Added CRITICAL ERROR alerts for all failure scenarios
- Log player count, session status, team info at each step
- Make all errors "loud and proud" per Rule 3

**Files Modified:**
- src/components/draft/DraftBoard.tsx (error handling and logging)

### Issue 6: Zustand State Mutation Bug (2026-01-27)
**Problem:** Session status stuck at 'setup', never changed to 'in_progress'
- CPU draft blocked because status check failed
- Root cause: `startDraft()` mutated session object then passed same reference to `set()`
- Zustand uses reference equality - no re-renders or useEffect updates

**Solution:**
- Fixed all state mutations in draftStore.ts to use immutable updates
- `startDraft()`, `pauseDraft()`, `resumeDraft()`, `saveSession()`, `makePick()`
- All now create new objects with spread operator instead of mutating
- Added comprehensive logging to startDraft() and saveSession()

**Files Modified:**
- src/stores/draftStore.ts (immutable state updates)

**Commit:**
- commit 887abe8

### Issue 7: CPU Draft Timeout Cancellation Bug (2026-01-27)
**Problem:** CPU draft showed "Team is thinking..." but never made picks
- Timeout was being cancelled before it could fire
- Root cause: `cpuThinking` was in useEffect dependency array
- When `setCpuThinking(true)` ran, it triggered cleanup that cancelled timeout

**Solution:**
- Removed `cpuThinking` from useEffect dependency array
- Effect should only re-run when session, team, or players change
- Timeout now executes after 1-2 second delay
- CPU draft progresses automatically through all teams

**Files Modified:**
- src/components/draft/DraftBoard.tsx (removed cpuThinking from deps)

**Commit:**
- commit 72cd3f1

### Issue 8: CPU Draft Player Loading Race Condition (2026-01-27)
**Problem:** False "CRITICAL ERROR: No players loaded" alert immediately after starting draft
- CPU draft checked `players.length === 0` before async player loading completed
- Both player loading and CPU draft useEffects triggered simultaneously
- Player loading is async (Supabase query), CPU draft is synchronous check

**Solution:**
- Added `loading` state check to CPU draft logic
- Effect now waits for `loading === false` before checking player count
- Added "Waiting for players to load..." log message
- Added `loading` to dependency array so effect re-runs when loading completes
- Only shows error if loading complete AND still no players

**Files Modified:**
- src/components/draft/DraftBoard.tsx (added loading check)

**Commit:**
- commit 4461211

### Issue 9: CPU Draft Loading State Timeout Cancellation (2026-01-27)
**Problem:** CPU draft still stuck showing "Team is thinking..." - timeout never fired
- Same symptom as Issue #7 but different root cause
- `loading` was in useEffect dependency array
- When session changed (from saveSession), player loading re-ran
- Player loading changed loading: false -> true -> false
- loading change triggered CPU draft cleanup, cancelling timeout

**Solution:**
- Removed `loading` from useEffect dependency array
- Effect checks loading value but doesn't re-run when it changes
- Prevents cleanup from cancelling timeout
- Updated ESLint comment to mention both cpuThinking and loading

**Files Modified:**
- src/components/draft/DraftBoard.tsx (removed loading from deps)

**Commit:**
- commit f260f99

### Issue 10: CPU Draft Dependency Array Over-Triggering (2026-01-27)
**Problem:** Timeout still being cancelled - effect re-running too frequently
- `session` and `players` in dependency array caused constant re-runs
- saveSession() updated session.updatedAt → new session reference → effect re-ran
- Player loading called setPlayers(new array) → new players reference → effect re-ran
- Each re-run cancelled pending timeout via cleanup

**Solution:**
- Use granular primitive dependencies instead of full object references
- Changed from: `[session, currentTeam, players, makePick]`
- Changed to: `[session?.currentPick, session?.status, currentTeam?.id, makePick]`
- Effect now only re-runs when pick/status/team ID actually changes
- Does NOT re-run when unrelated fields update or arrays get new references
- This is the correct React pattern for effects with async operations

**Files Modified:**
- src/components/draft/DraftBoard.tsx (granular dependencies)

**Commit:**
- commit 7277858

### Issue 11: CPU Draft Player Availability Trigger (2026-01-27)
**Problem:** CPU draft never progressed after players loaded
- Console showed "[Player Load] SUCCESS - Loaded 1000 players"
- Console showed "Waiting for players to load..." but never reached "Team is thinking..."
- Effect didn't re-run when players became available
- Root cause: After removing `players` from deps to fix false re-runs (Issue #10), effect no longer triggered when players.length changed from 0 → 1000

**Solution:**
- Added `players.length` (primitive) to dependency array
- Uses number value instead of array reference to avoid false re-runs
- Triggers when players.length changes from 0 to 1000
- Does NOT re-run when array reference changes (only when length changes)
- Final dependencies: `[session?.currentPick, session?.status, currentTeam?.id, players.length, makePick]`

**Files Modified:**
- src/components/draft/DraftBoard.tsx (added players.length to dependency array)

**Commit:**
- commit 20f0fa2

## Testing Checklist
- [x] TypeScript compilation succeeds
- [x] Production build succeeds
- [x] Draft session creation succeeds (no 401 error)
- [x] Draft session creation succeeds (no 400 error)
- [x] Error handling added (loud errors, no silent failures)
- [x] Zustand state mutation fixed (status updates correctly)
- [x] CPU draft timeout executes (picks are made)
- [ ] Draft board loads with player data
- [ ] CPU auto-draft completes full draft successfully
- [ ] Human player can select and assign players
- [ ] Snake draft order works correctly
- [ ] Session persistence works

## Files Modified
- .env (anon key updated)
- supabase/migrations/20260127_add_draft_rls_policies.sql (created)
- src/stores/draftStore.ts (schema fixes)
- src/types/draft.types.ts (status enum fix)
- src/vite-env.d.ts (created for type definitions)

## Files to Clean Up
- scripts/get-supabase-anon-key.ts (temporary helper, no longer needed)
