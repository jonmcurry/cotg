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
- Pending commit with UUID fix

### Next Steps

- Phase 1.5: Build Lahman CSV import pipeline (TypeScript)
- Phase 1.6: Generate APBA cards for all players
- Deploy migrations to Supabase (when ready)
- Rule 9: Commit all changes to git repository

---

## Version History

- **v0.1.0** (2026-01-27): Planning phase, documentation created
