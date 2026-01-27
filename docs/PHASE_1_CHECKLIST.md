# Phase 1: Foundation & Data Pipeline - Checklist

**Phase Duration:** 3-4 weeks
**Status:** In Progress
**Started:** January 27, 2026

---

## 1.1 Reverse Engineer APBA Format

**Goal:** Understand and document APBA player card structure and game mechanics

### Tasks

- [x] Parse APBA PLAYERS.DAT binary structure
  - [x] Determine record size and layout (146 bytes)
  - [x] Extract player name fields
  - [x] Extract position and handedness
  - [x] Extract numerical ratings/grades
  - [x] Extract dice outcome arrays (raw bytes)
  - [x] Document all field offsets and data types
- [x] Analyze multiple season files for consistency
  - [x] 1921 season (1921S.WDD) - 491 players
  - [x] 1943 season (1943S.WDD) - 518 players
  - [x] 1971 season (1971S.WDD) - 827 players
- [x] Parse APBA outcome tables (TABLES directory)
  - [x] B3EHMSG.TBL - batting outcomes (127 outcomes)
  - [x] B3EHNUM.TBL - numeric codes (453 outcomes)
  - [x] Understand dice roll mappings
- [x] Document APBA game mechanics
  - [x] Dice roll system (2d6 = 36 outcomes)
  - [x] Outcome resolution with dynamic messages
  - [x] Fielding grades system (1-9)
  - [x] Pitcher grades system (A-E)
- [x] Create Python scripts to extract all APBA data
  - [x] Parse binary files
  - [x] Parse outcome tables
  - [x] Export to JSON for analysis
  - [x] Validate against known players
- [x] Document findings in APBA_REVERSE_ENGINEERING.md

**Deliverable:** ✅ **COMPLETE** - Full APBA reverse engineering done!

---

## 1.2 Reverse Engineer Bill James Format

**Goal:** Understand Bill James methodology and document formulas

### Tasks

- [x] Analyze BJSTRUCT directory structure
  - [x] Parse STRUCT.DAT (league structure)
  - [x] Parse LOCATION.DAT (city database)
  - [x] Understand file organization
- [x] Analyze BJ000001 directory (player database)
  - [x] BIO.DAT - biographical data structure
  - [x] OFFENSE.DAT - offensive stats (1.1MB!)
  - [x] DEFENSE.DAT - defensive metrics
  - [x] PITCHING.DAT - pitching statistics
  - [x] LCYCLE.DAT - career life cycle data
- [x] Document Bill James formulas
  - [x] Runs Created (basic and advanced)
  - [x] Range Factor
  - [x] Secondary Average
  - [x] Isolated Power
  - [x] Power/Speed Number
  - [x] Game Score
  - [x] Win Shares (reference only - very complex)
- [x] Create implementation strategy
  - [x] Easy formulas for Phase 1-2
  - [x] Medium formulas for Phase 4
  - [x] Complex features deferred
- [x] Create extraction script (`analyze_bill_james.py`)
- [x] Document findings in BILL_JAMES_FEATURES.md
- [x] Create formula reference (BILL_JAMES_FORMULAS.md)

**Deliverable:** ✅ **COMPLETE** - Formulas documented, ready for implementation!

**Key Decision:** Use Lahman for data, Bill James for methodology

---

## 1.3 Set Up Development Environment

**Goal:** Production-ready React + TypeScript project

### Tasks

- [x] Initialize Vite + React + TypeScript project
  - [x] Run `npm create vite@latest`
  - [x] Select React + TypeScript template
  - [x] Install dependencies
- [x] Install core dependencies
  - [x] `@supabase/supabase-js` - Database client
  - [x] `zustand` - State management
  - [x] `react-router-dom` - Routing
  - [x] `@tanstack/react-query` - Data fetching
  - [x] `react-window` - Virtualization
- [x] Install UI dependencies
  - [x] `tailwindcss` - Styling
  - [x] `@headlessui/react` - Accessible components
  - [x] `@heroicons/react` - Icons
  - [x] `clsx` - Conditional classes
- [x] Install dev dependencies
  - [x] `@types/node` - Node types
  - [x] `eslint` - Linting
  - [x] `prettier` - Formatting
  - [x] `vitest` - Testing
  - [x] `@testing-library/react` - Component testing
- [x] Configure Tailwind CSS
  - [x] Run `npx tailwindcss init -p`
  - [x] Add Century of the Game color palette
  - [x] Configure typography plugin
- [x] Configure ESLint + Prettier
  - [x] Set up ESLint config
  - [x] Set up Prettier config
  - [ ] Add pre-commit hooks (optional - deferred)
- [x] Set up directory structure
  - [x] Create src/components
  - [x] Create src/hooks
  - [x] Create src/lib
  - [x] Create src/types
  - [x] Create src/utils
  - [x] Create scripts directory
  - [ ] Create supabase directory (Phase 1.4)
- [x] Configure TypeScript
  - [x] Strict mode enabled
  - [x] Path aliases (@/ for src/)
- [x] Initialize Git repository
  - [x] Create .gitignore
  - [x] Initial commit
- [x] Test dev server
  - [x] Run `npm run dev`
  - [x] Verify hot reload works

**Deliverable:** ✅ **COMPLETE** - Working development environment ready!

---

## 1.4 Design Supabase Schema

**Goal:** Database schema that supports all features

### Tasks

- [x] Review Lahman CSV structure
  - [x] Map People.csv fields
  - [x] Map Batting.csv fields
  - [x] Map Pitching.csv fields
  - [x] Map Fielding.csv fields
  - [x] Map other relevant CSVs (Teams, Allstar, Awards)
- [x] Design core tables
  - [x] players table (biographical data)
  - [x] player_seasons table (batting, pitching, fielding, Bill James)
  - [x] apba_cards table (dice outcomes, grades)
  - [x] teams_history table (MLB teams by year)
  - [x] apba_outcomes table (outcome lookup)
- [x] Design draft tables
  - [x] draft_sessions table
  - [x] draft_teams table
  - [x] draft_picks table
  - [x] draft_rankings table (TRD algorithm)
  - [x] draft_watchlist table
- [x] Design game simulation tables
  - [x] leagues table
  - [x] league_teams table
  - [x] league_rosters table
  - [x] games table
  - [x] game_events table (play-by-play APBA simulation)
  - [x] player_game_stats table (box scores)
- [x] Design indexes for performance
  - [x] Player lookups by ID and name (with full-text search)
  - [x] Season queries by year
  - [x] WAR sorting (with filtered index for qualified players)
  - [x] Draft history (pick_number, player_season_id)
  - [x] Game events by sequence (game_id, event_number)
  - [x] 50+ total indexes on common query patterns
- [x] Create migration files
  - [x] 001_create_players.sql
  - [x] 002_create_player_seasons.sql (+ teams_history)
  - [x] 003_create_apba_cards.sql (+ apba_outcomes)
  - [x] 004_create_draft_tables.sql (5 tables)
  - [x] 005_create_game_simulation_tables.sql (6 tables)
  - [x] 006_create_helper_views.sql (4 views + 3 functions)
  - [x] 007_create_rls_policies.sql
  - [x] 008_seed_apba_outcomes.sql
- [x] Create helper views and functions
  - [x] v_player_seasons_enriched (with player names)
  - [x] v_apba_cards_enriched (with stats)
  - [x] v_draft_board (available players)
  - [x] v_league_standings (calculated standings)
  - [x] get_player_career_stats() function
  - [x] get_draft_pick_order() function (snake draft logic)
  - [x] calculate_next_pick() function
- [x] Set up Row Level Security (RLS)
  - [x] Public read access for players
  - [x] Permissive policies for Phase 1-3 (all users can read/write)
  - [x] Commented future auth-based policies for Phase 5
- [x] Create comprehensive documentation
  - [x] docs/DATABASE_SCHEMA.md (1000+ lines with ER diagrams, examples)
  - [x] Updated src/types/database.types.ts (23 TypeScript interfaces)
- [ ] Deploy schema to Supabase (deferred until Phase 1.5)
  - [ ] Run migrations
  - [ ] Verify tables created
  - [ ] Test queries

**Deliverable:** ✅ **COMPLETE** - Production-ready database schema designed!

**Summary:**
- 17 tables created
- 4 views implemented
- 3 helper functions
- 8 migration files
- 50+ performance indexes
- Comprehensive TypeScript types
- Full documentation written

---

## 1.5 Build Lahman Import Pipeline

**Goal:** All Lahman data (1901-2025) in Supabase

### Tasks

- [ ] Create TypeScript import script
  - [ ] Set up script structure
  - [ ] Add Supabase client
  - [ ] Add CSV parser
- [ ] Import People.csv
  - [ ] Read and parse CSV
  - [ ] Transform to players table format
  - [ ] Batch insert (1000 at a time)
  - [ ] Handle duplicates
  - [ ] Log progress
  - [ ] Error handling
- [ ] Import Batting.csv
  - [ ] Parse batting stats
  - [ ] Join with players by lahmanID
  - [ ] Filter 1901-2025 only
  - [ ] Calculate derived stats (AVG, OBP, SLG, OPS)
  - [ ] Insert into player_seasons
- [ ] Import Pitching.csv
  - [ ] Parse pitching stats
  - [ ] Join with players
  - [ ] Calculate ERA, WHIP
  - [ ] Insert into player_seasons
- [ ] Import Fielding.csv
  - [ ] Parse fielding positions
  - [ ] Determine position eligibility
  - [ ] Update player_seasons
- [ ] Import other relevant data
  - [ ] Teams.csv - team information
  - [ ] Awards.csv - HOF status, MVPs
  - [ ] AllStars.csv - All-Star selections
- [ ] Validate data integrity
  - [ ] Check for missing players
  - [ ] Verify stat calculations
  - [ ] Check foreign key relationships
- [ ] Create import command
  - [ ] `npm run import:lahman`
  - [ ] Progress bar
  - [ ] Summary statistics
- [ ] Document import process
  - [ ] Add to README.md
  - [ ] Note any data gaps

**Deliverable:** Complete Lahman dataset in Supabase (1901-2025)

---

## 1.6 Generate APBA Player Cards

**Goal:** APBA-style cards for all players

### Tasks

- [ ] Design card generation algorithm
  - [ ] Map stats to APBA grades
  - [ ] Calculate fielding ratings
  - [ ] Calculate speed ratings
  - [ ] Generate dice outcome arrays
- [ ] Research APBA grading formulas
  - [ ] Batting outcomes distribution
  - [ ] Power rating calculations
  - [ ] Contact rating calculations
  - [ ] Pitching outcome formulas
- [ ] Implement hitter card generation
  - [ ] Single outcomes
  - [ ] Double outcomes
  - [ ] Triple outcomes
  - [ ] Home run outcomes
  - [ ] Walk outcomes
  - [ ] Strikeout outcomes
  - [ ] Groundout/flyout outcomes
- [ ] Implement pitcher card generation
  - [ ] Strikeout ratings
  - [ ] Walk ratings
  - [ ] Hit allowed ratings
  - [ ] Home run allowed ratings
- [ ] Validate card generation
  - [ ] Compare generated cards to original APBA
  - [ ] Test with known players (Ruth, Mays, Koufax)
  - [ ] Adjust formulas if needed
- [ ] Create card generation script
  - [ ] Read player_seasons from Supabase
  - [ ] Generate APBA cards
  - [ ] Insert into apba_cards table
  - [ ] Log progress
- [ ] Run card generation for all players
  - [ ] 1901-2025 seasons
  - [ ] Verify completion
  - [ ] Check for errors
- [ ] Create card viewer UI (optional for testing)
  - [ ] Display player card
  - [ ] Show dice outcomes
  - [ ] Show ratings

**Deliverable:** APBA cards for all 1901-2025 players in database

---

## Success Criteria for Phase 1

- [ ] APBA mechanics fully documented
- [ ] Bill James features documented
- [ ] React + TypeScript app running locally
- [ ] Supabase database deployed with schema
- [ ] All Lahman players (1901-2025) imported
- [ ] APBA cards generated for all players
- [ ] Data validated and tested
- [ ] All changes committed to Git
- [ ] CHANGELOG.md updated

---

## Phase 1 Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | APBA/Bill James reverse engineering | Documentation complete |
| Week 2 | Project setup + Supabase schema | Dev environment ready, DB deployed |
| Week 3 | Lahman import pipeline | All data in Supabase |
| Week 4 | APBA card generation + validation | Cards generated, Phase 1 complete |

---

## Notes & Blockers

**Current Status:** Starting Week 1 - APBA reverse engineering

**Blockers:** None

**Questions:** None

**Next Task:** Parse APBA PLAYERS.DAT binary structure
