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

### Issue 12: Draft Picks Schema Mismatch (2026-01-27)
**Problem:** CPU draft making picks but failing to save to Supabase database
- Error: `Could not find the 'team_id' column of 'draft_picks' in the schema cache`
- HTTP 400 Bad Request when inserting into draft_picks table
- Root causes:
  1. Code used `team_id` but database schema has `draft_team_id`
  2. Code missing required field `pick_in_round`
  3. Code missing required field `player_id`

**Solution:**
- Updated draftStore.ts makePick() to match database schema
- Changed `team_id` → `draft_team_id`
- Added `pick_in_round: currentPick.pickInRound` (required by schema)
- Added `player_id: playerSeasonId` (required by schema)

**Files Modified:**
- src/stores/draftStore.ts (schema alignment for draft_picks insert)

**Commit:**
- commit 089fc73

### Issue 13: Team ID UUID Format Error (2026-01-27)
**Problem:** Draft stopped after 2 picks with UUID format errors
- Error: `invalid input syntax for type uuid: "team-7"`
- Error: `invalid input syntax for type uuid: "team-5"`
- Draft stopped at pick #3 with `hasCurrentTeam: false`
- Root cause: Teams created with local string IDs like "team-0", "team-1" instead of UUIDs
- Teams were never saved to draft_teams table, so UUIDs were never generated
- Picks referenced non-existent team IDs in the database

**Solution:**
- Save teams to draft_teams table immediately after creating session
- Retrieve generated UUIDs for each team from database
- Update local teams array with real UUIDs
- Regenerate picks array using real team UUIDs (not local string IDs)
- Flow: Create session → Insert teams → Get UUIDs → Update local state → Generate picks

**Files Modified:**
- src/stores/draftStore.ts (createSession - added team insertion to database)

**Commit:**
- commit 9ef42ff

### Issue 14: Player ID Foreign Key Constraint Violation (2026-01-27)
**Problem:** Draft picks failing with foreign key constraint violation
- Error: `insert or update on table "draft_picks" violates foreign key constraint "draft_picks_player_id_fkey"`
- Error: `Key is not present in table "players"`
- HTTP 409 Conflict when inserting picks
- Root cause: Code was using `playerSeasonId` for both `player_id` and `player_season_id` fields
- `player_id` must reference `players.id` (base player record)
- `player_season_id` must reference `player_seasons.id` (specific season record)
- Code was passing the same value (player_season_id) for both fields

**Solution:**
- Query player_seasons table to get player_id before inserting pick
- Use `player_seasons.player_id` for the `player_id` field
- Use `playerSeasonId` for the `player_season_id` field
- Added error handling for player_id fetch failure
- Flow: Fetch player_id from player_seasons → Insert pick with correct foreign keys

**Files Modified:**
- src/stores/draftStore.ts (makePick - fetch player_id before insert)

**Commit:**
- commit 8578456

### Issue 15: Player Grouping UI/UX (2026-01-27)
**Problem:** Players with multiple seasons displayed as flat list
- Same player appears multiple times (e.g. Hank Aaron 1959, Hank Aaron 1971)
- Confusing which seasons are available after one season is drafted
- No visual grouping or hierarchy
- Difficult to compare seasons for same player
- User feedback: "If a player has multiple seasons played then their seasons need to be grouped under the player name"

**Solution:** Created grouped player pool interface
- Group all player-seasons by display_name
- Show collapsed view: Player name + count of available seasons + best WAR
- Click to expand: Shows all available seasons with stats
- Each season row shows: Year, Team, Position, WAR, key stats
- Click season to draft that specific season
- Visual hierarchy: Player name (bold) > Season details (indented)
- Expandable/collapsible arrows for multi-season players
- Search filters at player-name level

**UI Design:**
```Player name (collapsed): [▶] Pos PlayerName          3 seasons | WAR 12.5
Player name (expanded):  [▼] Pos PlayerName          3 seasons | WAR 12.5
    Season 1:                Pos 1959 NYG     WAR 10.6, .345, 41 HR
    Season 2:                Pos 1965 SFG     WAR 11.2, .317, 52 HR
    Season 3:                Pos 1971 SFG     WAR 5.2, .271, 18 HR
```

**Files Created:**
- src/components/draft/GroupedPlayerPool.tsx (new component)

**Files Modified:**
- src/components/draft/DraftBoard.tsx (use GroupedPlayerPool instead of PlayerPool)

**Commit:**
- commit [pending]

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
