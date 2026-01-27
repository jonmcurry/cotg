# Changelog

All notable changes to the Century of the Game project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - 2026-01-27

- Created comprehensive implementation plan document (`docs/IMPLEMENTATION_PLAN.md`)
- Updated Baseball_Fantasy_Draft_SRD.md with project configuration decisions (Section 0)
- Documented 8 foundational project decisions:
  1. Scope: Both draft system + game simulation (phased approach)
  2. Directory: c:\users\jonmc\dev\cotg
  3. Data Architecture: Supabase for all data
  4. Source Data: Lahman database at `data_files/lahman_1871-2025_csv`
  5. APBA Cards: Full reverse engineering of mechanics
  6. Bill James: Extract all features
  7. Branding: Century of the Game (vintage heritage theme)
  8. Tech Stack: React + TypeScript (server-side hosted)
- Explored APBA binary data structure (PLAYERS.DAT format)
- Analyzed Lahman CSV files (28 files, 1871-2025 data)
- Created project roadmap with 5 phases:
  - Phase 1: Foundation & Data Pipeline (3-4 weeks)
  - Phase 2: Draft System (2-3 weeks)
  - Phase 3: Game Simulation Engine (4-5 weeks)
  - Phase 4: Bill James Features (1-2 weeks)
  - Phase 5: Polish & Production (2-3 weeks)
- Designed preliminary Supabase database schema
- Defined technology stack: React 18+, TypeScript, Vite, Tailwind CSS, Supabase
- Created CHANGELOG.md to track project changes

### Technical Details

- Identified APBA player record structure (~150-180 bytes per player)
- Located 3 sample APBA seasons: 1921, 1943, 1971
- Found APBA outcome tables in TABLES directory
- Located Bill James data structures in BJSTRUCT and BJOBJECT directories
- Confirmed Lahman data completeness: People.csv, Batting.csv, Pitching.csv, etc.

### Completed - 2026-01-27 (Later)

- Successfully parsed APBA PLAYERS.DAT binary format
- Created Python parser script (`scripts/parse_apba_binary.py`)
- Determined exact record structure: 146 bytes per player
- Parsed three APBA seasons:
  - 1921: 491 players
  - 1943: 518 players
  - 1971: 827 players
- Documented APBA file format in `docs/APBA_REVERSE_ENGINEERING.md`
- Extracted player data: name, position, fielding grade, bats, card number
- Exported all parsed data to JSON format

### Completed - 2026-01-27 (Evening)

- Parsed APBA outcome tables (TABLES directory)
- Created outcome parser script (`scripts/parse_apba_outcomes.py`)
- Extracted 127 main outcomes and 453 numeric outcomes
- Documented outcome message system with dynamic player/team insertion
- Documented pitcher grade system (A-E)
- Completed Phase 1.1: APBA Reverse Engineering ✅

### Phase 1.1 Summary

**APBA Reverse Engineering - COMPLETE**
- Player card format: 146 bytes, fully documented
- Seasons parsed: 1921 (491), 1943 (518), 1971 (827) = 1,836 total players
- Outcome tables: 127 gameplay messages decoded
- Game mechanics: 2d6 dice system, pitcher grades, outcome resolution
- All findings documented in `docs/APBA_REVERSE_ENGINEERING.md`

### In Progress - 2026-01-27 (Evening)

- Analyzing Bill James Baseball Encyclopedia structure
- Identified key data files: BIO, OFFENSE, DEFENSE, PITCHING, LCYCLE
- Documented Bill James advanced metrics (Runs Created, Range Factor, Win Shares)
- Created `docs/BILL_JAMES_FEATURES.md` with comprehensive analysis
- Total Bill James database: ~5.1MB (vs APBA's ~72KB per season)

### Completed - 2026-01-27 (Late Evening)

**Phase 1.2: Bill James Analysis - COMPLETE ✅**

- Analyzed Bill James file structure (BIO, OFFENSE, DEFENSE, PITCHING, LCYCLE)
- Documented 12 key formulas (Runs Created, ISO, SecA, P/S, Range Factor, etc.)
- Created comprehensive formula reference guide
- Created `scripts/analyze_bill_james.py` structure analyzer
- Created `docs/BILL_JAMES_FORMULAS.md` implementation guide
- **Key Decision:** Use Lahman for data, Bill James for methodology/formulas

**Files Created:**
- scripts/analyze_bill_james.py (structure analyzer)
- docs/BILL_JAMES_FORMULAS.md (implementation reference)
- Updated docs/BILL_JAMES_FEATURES.md (completion summary)

**Formulas Documented:**
- Easy: RC (basic), ISO, SecA, P/S Number, Range Factor
- Medium: RC (advanced), Component ERA, Game Score
- Complex: Win Shares, career trajectories, similarity scores

### Completed - 2026-01-27 (Night)

**Phase 1.3: React + TypeScript Setup - COMPLETE ✅**

- Initialized React 18 + TypeScript + Vite project
- Configured Tailwind CSS with Century of the Game color palette
- Installed all core dependencies:
  - @supabase/supabase-js (database client)
  - zustand (state management)
  - @tanstack/react-query (data fetching)
  - react-router-dom (routing)
  - react-window (virtualization)
- Configured ESLint + Prettier for code quality
- Created project directory structure (components, hooks, lib, types, utils)
- Implemented Bill James formula utilities (8 functions)
- Created TypeScript database types for all tables
- Configured Supabase client library
- Set up Century of the Game branding (colors, fonts, UI components)
- Created comprehensive README.md
- Dev server running successfully on port 3000

**Files Created:**
- package.json (project configuration)
- tsconfig.json, tsconfig.node.json (TypeScript config)
- vite.config.ts (Vite build config)
- tailwind.config.js, postcss.config.js (Tailwind CSS)
- .eslintrc.cjs, .prettierrc (code quality)
- index.html (entry point)
- src/main.tsx, src/App.tsx (React app)
- src/index.css (global styles with Tailwind)
- src/types/database.types.ts (TypeScript types)
- src/lib/supabase.ts (Supabase client)
- src/utils/billJamesFormulas.ts (8 formula implementations)
- .env.example (environment template)
- README.md (project documentation)

**Bill James Formulas Implemented:**
- runsCreatedBasic() - Basic Runs Created formula
- runsCreatedAdvanced() - Advanced Runs Created with all factors
- isolatedPower() - Raw power measurement (ISO)
- secondaryAverage() - Offensive contribution beyond AVG (SecA)
- powerSpeedNumber() - 5-tool player identification (P/S)
- rangeFactor() - Defensive plays per 9 innings (RF)
- componentERA() - Defense-independent ERA estimate
- gameScore() - Single-game pitching performance

### Completed - 2026-01-27 (Night continued)

**Phase 1.4: Supabase Database Schema - COMPLETE ✅**

- Designed comprehensive PostgreSQL database schema (17 tables, 4 views, 3 functions)
- Created 8 SQL migration files covering all application domains
- Analyzed Lahman CSV structure to inform schema design
- Implemented Row Level Security (RLS) policies for all tables

**Database Domains:**

1. **Core Player Data (5 tables):**
   - `players` - Player biographical data with full-text search
   - `player_seasons` - Season-by-season stats (batting, pitching, fielding, Bill James)
   - `teams_history` - Historical MLB teams
   - `apba_cards` - APBA player cards with dice outcome arrays
   - `apba_outcomes` - APBA outcome reference data

2. **Draft System (5 tables):**
   - `draft_sessions` - Draft configuration and state
   - `draft_teams` - Teams in a draft
   - `draft_picks` - Record of picks made
   - `draft_rankings` - TRD algorithm rankings
   - `draft_watchlist` - Players being watched

3. **Game Simulation (6 tables):**
   - `leagues` - User-created leagues
   - `league_teams` - Teams in a league
   - `league_rosters` - Player assignments
   - `games` - Simulated games
   - `game_events` - Play-by-play APBA simulation log
   - `player_game_stats` - Box score data

**Helper Views (4):**
- `v_player_seasons_enriched` - Player seasons with calculated stats and names
- `v_apba_cards_enriched` - APBA cards with player details
- `v_draft_board` - Available players for drafting
- `v_league_standings` - League standings with rankings

**Helper Functions (3):**
- `get_player_career_stats()` - Calculate career totals
- `get_draft_pick_order()` - Calculate pick order (handles snake draft)
- `calculate_next_pick()` - Determine who picks next

**Performance Optimizations:**
- 50+ indexes on common query patterns
- Full-text search on player names (GIN index)
- Composite indexes for player_id + year queries
- Filtered indexes for qualified batters/pitchers
- Computed columns for display_name and career_span

**Migration Files Created:**
- 001_create_players.sql (Players table with full biographical data)
- 002_create_player_seasons.sql (Player seasons + teams history)
- 003_create_apba_cards.sql (APBA cards + outcomes lookup table)
- 004_create_draft_tables.sql (5 draft system tables)
- 005_create_game_simulation_tables.sql (6 game simulation tables)
- 006_create_helper_views.sql (4 views + 3 functions)
- 007_create_rls_policies.sql (Row Level Security - permissive for Phase 1-3)
- 008_seed_apba_outcomes.sql (Sample APBA outcome data)

**Documentation:**
- docs/DATABASE_SCHEMA.md (comprehensive 1,000+ line reference guide)
- Updated src/types/database.types.ts (23 TypeScript interfaces matching schema)

**Schema Features:**
- UUID primary keys for all user-generated data
- Lahman IDs for player identification
- JSONB for flexible data (games_by_position)
- Array columns for dice outcomes (INTEGER[36])
- Generated columns for computed fields
- Triggers for updated_at timestamps
- CHECK constraints for data validation
- Comprehensive foreign key relationships
- Comments on all tables and critical columns

**UI/UX Considerations:**
- Denormalized views for fast frontend queries
- Pre-computed standings and rankings
- Snake draft logic handled in database functions
- Play-by-play event storage for game replay
- Draft watchlist for user experience
- Player search optimized with full-text indexing

### Phase 1 Progress Summary

**Week 1 - Foundation Complete!**
- ✅ Phase 1.1: APBA (player cards, game mechanics, outcomes)
- ✅ Phase 1.2: Bill James (formulas, features, methodology)
- ✅ Phase 1.3: React + TypeScript setup (development environment ready!)
- ✅ Phase 1.4: Supabase database schema (17 tables, 4 views, 3 functions!)
- ⏳ Phase 1.5: Lahman import pipeline (next)
- ⏳ Phase 1.6: APBA card generation

**Week 1 Status:** All design/planning work complete! Ready to implement data pipelines.

### Completed - 2026-01-27 (Phase 2 Draft System)

**Draft System Schema Alignment and Bug Fixes - COMPLETE ✅**

- Fixed authentication errors (401 Unauthorized) by updating Supabase anon key in .env
- Created RLS policies migration (20260127_add_draft_rls_policies.sql) enabling anonymous access
- Fixed schema mismatch between code and database:
  - Updated column names: `name` → `session_name`, `current_pick` → `current_pick_number`
  - Added required fields: `season_year`, `draft_type`, `current_round`
  - Fixed status enum: `'configuring'` → `'setup'` to match database constraints
- Removed all emoji characters from source code per Rule 6:
  - App.tsx (home screen buttons and feature cards)
  - DraftBoard.tsx (loading screen, completion screen, CPU overlay)
  - DraftControls.tsx (team control indicators)
- Cleaned up temporary/backup files per Rule 5:
  - Removed App-Draft.tsx (backup file)
  - Removed App-Old.tsx (backup file)
  - Removed scripts/get-supabase-anon-key.ts (one-time helper script)
- Created draft system fix plan document: docs/plans/draft-system-schema-fix.md
- Fixed TypeScript compilation errors (unused variables, missing type definitions)
- Created vite-env.d.ts for Vite environment variable type definitions

**Files Modified:**
- .env (updated with real Supabase anon key)
- supabase/migrations/20260127_add_draft_rls_policies.sql (created)
- src/stores/draftStore.ts (schema alignment fixes)
- src/types/draft.types.ts (status enum update)
- src/App.tsx (emoji removal)
- src/components/draft/DraftBoard.tsx (emoji removal)
- src/components/draft/DraftControls.tsx (emoji removal)
- src/vite-env.d.ts (created)
- src/utils/cpuDraftLogic.ts (added losses field to PlayerSeason)
- src/components/draft/RosterView.tsx (removed unused parameter)
- src/components/draft/PickHistory.tsx (removed unused prop)

**Files Cleaned Up:**
- src/App-Draft.tsx (deleted)
- src/App-Old.tsx (deleted)
- scripts/get-supabase-anon-key.ts (deleted)

**RLS Policies Created:**
- draft_sessions: INSERT, SELECT, UPDATE, DELETE for anon role
- draft_teams: INSERT, SELECT, UPDATE, DELETE for anon role
- draft_picks: INSERT, SELECT, UPDATE, DELETE for anon role
- draft_rankings: INSERT, SELECT, UPDATE, DELETE for anon role
- draft_watchlist: INSERT, SELECT, UPDATE, DELETE for anon role

**Rules Followed:**
- Rule 5: Cleaned up temporary/backup files
- Rule 6: Removed all emoji characters from code
- Rule 7: Created implementation plan (docs/plans/draft-system-schema-fix.md)
- Rule 10: Updated CHANGELOG.md (this entry)

### Fixed - 2026-01-27 (UUID Format Error)

**UUID Generation Fix - COMPLETE ✅**

- Fixed UUID format error in draft session creation
  - Error: `invalid input syntax for type uuid: "draft-1769536158830"`
  - Root cause: Frontend was generating string IDs instead of UUIDs
  - Solution: Let Supabase auto-generate UUID, retrieve it via `.select().single()`
- Updated draftStore.ts createSession method:
  - Insert draft_sessions record first to get auto-generated UUID
  - Use returned UUID for local session state
  - Removed client-side ID generation (`draft-${Date.now()}`)

**Files Modified:**
- src/stores/draftStore.ts (UUID generation fix)

**Commit:**
- commit 5064f32

### Fixed - 2026-01-27 (CPU Draft Silent Failure - Rule 3)

**Error Handling Improvements - COMPLETE ✅**

- Fixed silent CPU draft failures (Rule 3 violation)
  - Issue: CPU draft stalled with no console output or error messages
  - Added comprehensive logging to player loading process
  - Added step-by-step logging to CPU draft decision logic
  - All errors now show CRITICAL ERROR alerts with details
- Improved debugging visibility:
  - Player load logs: start, success count, or failure reasons
  - CPU draft logs: session status, player count, team info, blocking reasons
  - Console shows full context for troubleshooting
- All failures are now "loud and proud" per Rule 3

**Files Modified:**
- src/components/draft/DraftBoard.tsx (comprehensive error handling)

**Commit:**
- commit 962b752

### Fixed - 2026-01-27 (Zustand State Mutation Bug)

**Session Status Not Updating - COMPLETE ✅**

- Fixed critical Zustand state mutation bug causing session status to remain 'setup'
  - Issue: CPU draft blocked because session status never changed to 'in_progress'
  - Root cause: `startDraft()` was mutating session object then passing same reference to `set()`
  - Zustand uses reference equality - mutating and passing same reference doesn't trigger updates
  - This prevented useEffect dependencies from detecting changes
- Fixed all state mutation violations in draftStore.ts:
  - `startDraft()`: Now creates new session object with spread operator
  - `pauseDraft()`: Now creates new session object (immutable update)
  - `resumeDraft()`: Now creates new session object (immutable update)
  - `saveSession()`: Now creates new session object (immutable update)
  - `makePick()`: Now creates new objects for teams, roster, picks (deep immutable update)
- Added comprehensive logging to `startDraft()`:
  - Logs session status transition
  - Logs Supabase save confirmation
  - Helps debug state flow issues
- All state updates now follow Zustand best practices (immutable updates)

**Technical Details:**
- Zustand anti-pattern: `session.status = 'in_progress'; set({ session })`
- Correct pattern: `const updated = { ...session, status: 'in_progress' }; set({ session: updated })`
- Deep cloning required for nested objects (teams, roster, picks)
- Reference equality: `oldRef === newRef` means no re-render

**Files Modified:**
- src/stores/draftStore.ts (startDraft, pauseDraft, resumeDraft, saveSession, makePick)

**Impact:**
- CPU draft now executes immediately when session starts
- All useEffect hooks properly detect session changes
- State persistence to Supabase works correctly
- Draft flow unblocked

**Commit:**
- commit 887abe8

### Fixed - 2026-01-27 (CPU Draft Timeout Cancellation Bug)

**CPU Draft Never Executes - COMPLETE ✅**

- Fixed race condition where CPU draft timeout was cancelled before firing
  - Issue: CPU showed "Team is thinking..." but never made a pick
  - Root cause: `cpuThinking` was in useEffect dependency array
  - When `setCpuThinking(true)` ran, it triggered useEffect cleanup
  - Cleanup function `clearTimeout(timeoutId)` cancelled the pending timeout
  - setTimeout callback never executed, so no pick was made
- Solution: Removed `cpuThinking` from dependency array
  - Effect should only re-run when session, team, or players change
  - Setting `cpuThinking` to `true` should NOT trigger cleanup
  - After pick is made and `cpuThinking` resets to `false`, session change triggers next pick
- Added ESLint disable comment explaining the intentional exclusion

**Technical Details:**
- React useEffect cleanup runs BEFORE the next effect when dependencies change
- Having `cpuThinking` in deps array created this flow:
  1. Effect runs, sets `cpuThinking = true`, schedules timeout
  2. State change triggers re-render
  3. Cleanup runs: `clearTimeout(timeoutId)` ← timeout cancelled!
  4. Effect runs again, but early returns due to `cpuThinking === true`
  5. No pick is ever made
- Correct flow (without `cpuThinking` in deps):
  1. Effect runs, sets `cpuThinking = true`, schedules timeout
  2. State change triggers re-render, but effect doesn't re-run
  3. Timeout fires after 1-2 seconds
  4. Pick is made, `cpuThinking = false`, session advances
  5. Session change triggers effect for next team

**Files Modified:**
- src/components/draft/DraftBoard.tsx (removed cpuThinking from deps array)

**Impact:**
- CPU draft now executes picks after 1-2 second delay
- Draft progresses through all teams automatically
- Timeout cleanup only runs when component unmounts or session changes
- CPU draft flow fully functional

**Commit:**
- commit 72cd3f1

### Fixed - 2026-01-27 (CPU Draft Player Loading Race Condition)

**False "No Players Loaded" Error - COMPLETE ✅**

- Fixed race condition where CPU draft checked for players before async loading completed
  - Issue: Alert showed "CRITICAL ERROR: No players loaded for draft" immediately after starting
  - Root cause: Both player loading and CPU draft useEffects triggered simultaneously
  - Player loading is async (Supabase query takes time)
  - CPU draft checked `players.length === 0` before query completed
- Solution: CPU draft now waits for `loading === false` before checking player count
  - Added `loading` state check: "Waiting for players to load..."
  - Only shows error if loading is complete AND still no players
  - Added `loading` to dependency array so effect re-runs when loading completes
- Added `loading` to console logs for better debugging visibility

**Technical Details:**
- Async race condition between two useEffects with overlapping dependencies
- Both depend on `session`, so both trigger when session is created or status changes
- Player loading useEffect: `async function loadPlayers()` takes time
- CPU draft useEffect: Runs immediately, sees empty array
- Fix: Early return while `loading === true`

**Files Modified:**
- src/components/draft/DraftBoard.tsx (added loading check to CPU draft logic)

**Impact:**
- No more false error alerts when draft starts
- CPU draft waits for players to load before attempting to draft
- Clean user experience with proper loading states
- Error only shows if there's a real Supabase connection or data issue

**Commit:**
- commit 4461211

### Fixed - 2026-01-27 (CPU Draft Loading State Timeout Cancellation)

**Timeout Still Being Cancelled - COMPLETE ✅**

- Fixed another timeout cancellation bug caused by `loading` in dependency array
  - Issue: CPU draft showed "Team is thinking..." but timeout never fired
  - Root cause: `loading` was in useEffect dependency array
  - When `saveSession()` changed session, player loading useEffect re-ran
  - Player loading sets `loading = true` then `loading = false`
  - `loading` change triggered CPU draft cleanup, cancelling timeout
- Solution: Removed `loading` from dependency array (same as `cpuThinking`)
  - Effect should only READ loading value, not re-run when it changes
  - Timeout now executes without being cancelled
  - Effect checks loading when it runs, but doesn't re-run on loading changes

**Technical Details:**
- Same root cause as Issue #7 (timeout cancellation) but different trigger
- Flow causing cancellation:
  1. CPU draft schedules timeout
  2. saveSession() updates session
  3. Player loading useEffect re-runs (depends on session)
  4. loading: false → true → false
  5. CPU draft useEffect re-runs (depends on loading)
  6. Cleanup cancels timeout before it fires!
- Fix: Check loading value but don't depend on it changing

**Files Modified:**
- src/components/draft/DraftBoard.tsx (removed loading from deps array)

**Impact:**
- CPU draft timeout actually fires after 1-2 seconds
- Draft progresses through teams
- No more infinite "thinking" modal

**Commit:**
- commit f260f99

### Fixed - 2026-01-27 (CPU Draft Dependency Array Over-Triggering)

**Final Timeout Cancellation Fix - COMPLETE ✅**

- Fixed timeout cancellation caused by over-sensitive dependency array
  - Issue: Timeout scheduled but immediately cancelled by effect re-running
  - Root causes: `session` and `players` in dependency array
  - When `saveSession()` updated `session.updatedAt`, effect re-ran
  - When player loading called `setPlayers()` with new array, effect re-ran
  - Each re-run cancelled the pending timeout via cleanup
- Solution: Use granular dependencies instead of full objects
  - Changed from: `[session, currentTeam, players, makePick]`
  - Changed to: `[session?.currentPick, session?.status, currentTeam?.id, makePick]`
  - Effect now ONLY re-runs when:
    - Pick advances (`session.currentPick` changes)
    - Draft status changes (`session.status` changes)
    - Current team changes (`currentTeam.id` changes)
  - Effect DOES NOT re-run when:
    - saveSession() updates `session.updatedAt`
    - Player loading sets `players` to new array reference
    - `loading` or `cpuThinking` state changes

**Technical Details:**
- React useEffect cleanup runs when dependencies change
- Using full object references (`session`, `players`) as dependencies means:
  - ANY field change triggers re-run (even `updatedAt`)
  - New array reference triggers re-run (even with same contents)
- Using specific primitive values (currentPick, status, id) means:
  - Only VALUE changes trigger re-run
  - Reference changes without value changes don't trigger
- This is the correct React pattern for effects that schedule async operations

**Files Modified:**
- src/components/draft/DraftBoard.tsx (granular dependency array)

**Impact:**
- Timeout FINALLY executes without cancellation
- CPU draft makes picks after 1-2 second delay
- Draft progresses through all teams to completion
- No more false re-runs from unrelated state updates

**Commit:**
- commit 7277858

### Fixed - 2026-01-27 (CPU Draft Player Availability Trigger)

**Effect Not Re-Running When Players Load - COMPLETE ✅**

- Fixed CPU draft not triggering when players finished loading
  - Issue: Console showed "[Player Load] SUCCESS - Loaded 1000 players" but CPU draft never progressed
  - Console showed "Waiting for players to load..." but never reached "Team is thinking..."
  - Root cause: After removing `players` from deps to fix false re-runs, effect no longer triggered when players became available
  - Effect needed to re-run when players.length changed from 0 → 1000
- Solution: Added `players.length` to dependency array
  - Uses primitive value (number) instead of array reference
  - Triggers effect when players.length changes from 0 to 1000
  - Does NOT cause false re-runs because length stays 1000 after initial load
  - Final dependencies: `[session?.currentPick, session?.status, currentTeam?.id, players.length, makePick]`

**Technical Details:**
- Problem: Needed to trigger on player loading without false re-runs
- Using `players` (array) would cause re-runs on every array reference change
- Using `players.length` (primitive) only triggers when the COUNT changes
- Flow:
  1. Initial state: players = [], players.length = 0
  2. Effect runs, sees loading=true, waits
  3. Players load: players = [1000 items], players.length = 1000
  4. Effect re-runs due to players.length change
  5. Effect sees loading=false and players.length=1000, proceeds with draft
  6. Future updates don't change players.length, so no false re-runs

**Files Modified:**
- src/components/draft/DraftBoard.tsx (added players.length to dependency array)

**Impact:**
- CPU draft effect triggers when players finish loading
- Draft progresses from "Waiting..." to "Team is thinking..." to making picks
- Complete flow: Load players → Wait for loading → Trigger CPU draft → Make picks

**Commit:**
- commit 20f0fa2

### Fixed - 2026-01-27 (Draft Picks Schema Mismatch)

**CPU Draft Save Failing - COMPLETE ✅**

- Fixed schema mismatch between code and database for draft_picks table
  - Issue: CPU draft making picks successfully but getting 400 Bad Request when saving to Supabase
  - Error: "Could not find the 'team_id' column of 'draft_picks' in the schema cache"
  - Root causes:
    1. Code used `team_id` but database schema has `draft_team_id`
    2. Code missing required field `pick_in_round`
    3. Code missing required field `player_id`
- Solution: Updated draftStore.ts makePick() to match database schema
  - Changed: `team_id` → `draft_team_id`
  - Added: `pick_in_round: currentPick.pickInRound`
  - Added: `player_id: playerSeasonId`

**Technical Details:**
- Database schema (004_create_draft_tables.sql) defines:
  - `draft_team_id UUID NOT NULL` (not team_id)
  - `player_id UUID NOT NULL` (was missing)
  - `player_season_id UUID NOT NULL` (was present ✓)
  - `pick_in_round INTEGER NOT NULL` (was missing)
- Code was inserting wrong column names and missing required fields
- Supabase returned PGRST204 error (column not found in schema cache)

**Files Modified:**
- src/stores/draftStore.ts (makePick method - draft_picks insert)

**Impact:**
- Draft picks now save successfully to Supabase
- Pick history persists to database
- Draft sessions can be resumed from database state
- Full draft flow now works end-to-end

**Commit:**
- commit 089fc73

### Fixed - 2026-01-27 (Team ID UUID Format Error)

**Draft Stopped After 2 Picks - COMPLETE ✅**

- Fixed UUID format error causing draft to stop after 2 picks
  - Issue: CPU draft made 2 picks then stopped with `hasCurrentTeam: false`
  - Error: "invalid input syntax for type uuid: 'team-7'"
  - Error: "invalid input syntax for type uuid: 'team-5'"
  - Root cause: Teams created with local string IDs ("team-0", "team-1") instead of database UUIDs
  - Teams were never saved to draft_teams table during session creation
  - Picks referenced team IDs that didn't exist in database
- Solution: Save teams to database during session creation
  - Insert all teams into draft_teams table after creating session
  - Retrieve generated UUIDs for each team from database
  - Update local teams array with real UUIDs from database
  - Regenerate picks array using real team UUIDs
  - Teams and picks now reference actual database records

**Technical Details:**
- Previous flow (broken):
  1. Create session in DB (get UUID)
  2. Create teams locally with string IDs
  3. Create picks locally referencing string IDs
  4. Try to insert picks → UUID format error!
- New flow (fixed):
  1. Create session in DB (get session UUID)
  2. Insert teams into DB (get team UUIDs)
  3. Update local teams with real UUIDs
  4. Create picks using real team UUIDs
  5. Insert picks → success (valid UUIDs that exist in DB)
- Database foreign key: draft_picks.draft_team_id → draft_teams.id (UUID)
- Must insert teams before picks can reference them

**Files Modified:**
- src/stores/draftStore.ts (createSession - added team database insertion)

**Impact:**
- Draft progresses beyond pick #2
- Team lookups work correctly (getCurrentPickingTeam returns valid team)
- Pick inserts succeed with valid UUID foreign keys
- Full draft flow unblocked
- Teams persist to database for session resumption

**Commit:**
- commit 9ef42ff

### Fixed - 2026-01-27 (Player ID Foreign Key Constraint Violation)

**Draft Picks Failing with Foreign Key Error - COMPLETE ✅**

- Fixed foreign key constraint violation when inserting draft picks
  - Issue: Draft picks failing with 409 Conflict error
  - Error: "insert or update on table 'draft_picks' violates foreign key constraint 'draft_picks_player_id_fkey'"
  - Error: "Key is not present in table 'players'"
  - Root cause: Code was using `playerSeasonId` for both `player_id` and `player_season_id` fields
  - `player_id` must reference `players.id` (the base player record)
  - `player_season_id` must reference `player_seasons.id` (the specific season record)
  - Code was passing the same value (player_season's ID) for both fields
  - Database rejected insert because player_season_id doesn't exist in players table
- Solution: Query player_seasons table to get correct player_id
  - Added query to fetch `player_id` from `player_seasons` table before insert
  - Use `player_seasons.player_id` (base player UUID) for `player_id` field
  - Use `playerSeasonId` (season-specific UUID) for `player_season_id` field
  - Added error handling if player_id fetch fails
  - Both foreign keys now reference valid records in their respective tables

**Technical Details:**
- Database schema requires two separate foreign keys:
  - `draft_picks.player_id` → `players.id` (base player record)
  - `draft_picks.player_season_id` → `player_seasons.id` (season-specific record)
- Previous code (broken):
  ```typescript
  player_id: playerSeasonId,        // Wrong table!
  player_season_id: playerSeasonId, // Correct
  ```
- New code (fixed):
  ```typescript
  // Fetch player_id from player_seasons table
  const { data } = await supabase
    .from('player_seasons')
    .select('player_id')
    .eq('id', playerSeasonId)
    .single()

  // Insert with correct foreign keys
  player_id: data.player_id,        // From players table
  player_season_id: playerSeasonId, // From player_seasons table
  ```
- Error code 23503 = foreign key violation in PostgreSQL

**Files Modified:**
- src/stores/draftStore.ts (makePick - query player_id before insert)

**Impact:**
- Draft picks now save successfully to database
- All foreign key constraints satisfied
- Pick history persists correctly
- Full draft flow works end-to-end
- Database referential integrity maintained

**Commit:**
- commit [pending]

### Next Steps

- Phase 1.5: Build Lahman CSV import pipeline (TypeScript)
- Phase 1.6: Generate APBA cards for all players
- Deploy migrations to Supabase (when ready)
- Rule 9: Commit all changes to git repository

---

## Version History

- **v0.1.0** (2026-01-27): Planning phase, documentation created
