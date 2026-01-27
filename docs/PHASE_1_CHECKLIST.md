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
- [ ] Parse APBA outcome tables (TABLES directory)
  - [ ] B3EHMSG.TBL - batting outcomes
  - [ ] B3EHNUM.TBL - numeric codes
  - [ ] Understand dice roll mappings
- [x] Document APBA game mechanics (initial)
  - [x] Dice roll system (2d6 = 36 outcomes)
  - [x] Outcome resolution (overview)
  - [x] Fielding grades system
  - [ ] Base running mechanics (pending)
- [x] Create Python script to extract all APBA data
  - [x] Parse binary files
  - [x] Export to JSON for analysis
  - [x] Validate against known players
- [x] Document findings in APBA_REVERSE_ENGINEERING.md

**Deliverable:** ✅ PARTIALLY COMPLETE - Player format documented, outcome tables pending

---

## 1.2 Reverse Engineer Bill James Format

**Goal:** Extract and document Bill James statistical features

### Tasks

- [ ] Analyze BJSTRUCT directory
  - [ ] Parse STRUCT.DAT
  - [ ] Parse LOCATION.DAT
  - [ ] Understand file relationships
- [ ] Analyze BJOBJECT directory
  - [ ] Identify object types
  - [ ] Extract calculation formulas
- [ ] Document Bill James features
  - [ ] Win Shares calculation
  - [ ] Runs Created formulas
  - [ ] Historical comparison methods
  - [ ] Era adjustment factors
- [ ] Create extraction script
- [ ] Document findings in BILL_JAMES_FEATURES.md

**Deliverable:** Bill James feature documentation

---

## 1.3 Set Up Development Environment

**Goal:** Production-ready React + TypeScript project

### Tasks

- [ ] Initialize Vite + React + TypeScript project
  - [ ] Run `npm create vite@latest`
  - [ ] Select React + TypeScript template
  - [ ] Install dependencies
- [ ] Install core dependencies
  - [ ] `@supabase/supabase-js` - Database client
  - [ ] `zustand` - State management
  - [ ] `react-router-dom` - Routing
  - [ ] `@tanstack/react-query` - Data fetching
  - [ ] `react-window` - Virtualization
- [ ] Install UI dependencies
  - [ ] `tailwindcss` - Styling
  - [ ] `@headlessui/react` - Accessible components
  - [ ] `@heroicons/react` - Icons
  - [ ] `clsx` - Conditional classes
- [ ] Install dev dependencies
  - [ ] `@types/node` - Node types
  - [ ] `eslint` - Linting
  - [ ] `prettier` - Formatting
  - [ ] `vitest` - Testing
  - [ ] `@testing-library/react` - Component testing
- [ ] Configure Tailwind CSS
  - [ ] Run `npx tailwindcss init -p`
  - [ ] Add Century of the Game color palette
  - [ ] Configure typography plugin
- [ ] Configure ESLint + Prettier
  - [ ] Set up ESLint config
  - [ ] Set up Prettier config
  - [ ] Add pre-commit hooks
- [ ] Set up directory structure
  - [ ] Create src/components
  - [ ] Create src/hooks
  - [ ] Create src/lib
  - [ ] Create src/types
  - [ ] Create src/utils
  - [ ] Create scripts directory
  - [ ] Create supabase directory
- [ ] Configure TypeScript
  - [ ] Strict mode enabled
  - [ ] Path aliases (@/ for src/)
- [ ] Initialize Git repository
  - [ ] Create .gitignore
  - [ ] Initial commit
- [ ] Test dev server
  - [ ] Run `npm run dev`
  - [ ] Verify hot reload works

**Deliverable:** Working development environment

---

## 1.4 Design Supabase Schema

**Goal:** Database schema that supports all features

### Tasks

- [ ] Review Lahman CSV structure
  - [ ] Map People.csv fields
  - [ ] Map Batting.csv fields
  - [ ] Map Pitching.csv fields
  - [ ] Map Fielding.csv fields
  - [ ] Map other relevant CSVs
- [ ] Design core tables
  - [ ] players table
  - [ ] player_seasons table
  - [ ] apba_cards table
- [ ] Design draft tables
  - [ ] draft_sessions table
  - [ ] teams table
  - [ ] draft_picks table
- [ ] Design game simulation tables
  - [ ] leagues table
  - [ ] games table
  - [ ] game_events table (play-by-play)
- [ ] Design indexes for performance
  - [ ] Player lookups by ID
  - [ ] Season queries by year
  - [ ] WAR sorting
  - [ ] Draft history
- [ ] Create migration files
  - [ ] 001_create_players.sql
  - [ ] 002_create_seasons.sql
  - [ ] 003_create_apba_cards.sql
  - [ ] 004_create_draft_tables.sql
  - [ ] 005_create_game_tables.sql
- [ ] Set up Row Level Security (RLS)
  - [ ] Public read access for players
  - [ ] User-specific write access for drafts
- [ ] Deploy schema to Supabase
  - [ ] Run migrations
  - [ ] Verify tables created
  - [ ] Test queries

**Deliverable:** Production database schema

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
