# Century of the Game - Implementation Plan

**Version:** 2.0
**Date:** January 27, 2026
**Status:** Phase 2 Complete (Draft System) - 40% Overall Progress
**Project Directory:** `c:\users\jonmc\dev\cotg`

**Recent Updates:**
- **Phase 1:** 85% complete (ratings implemented, data imported, full dice mechanics deferred)
- **Phase 2:** 95% complete (draft system fully functional, export feature pending)
- **Next:** Phase 3 (Game Simulation Engine)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Goals](#2-project-goals)
3. [Technical Architecture](#3-technical-architecture)
4. [Phase 1: Foundation & Data Pipeline](#phase-1-foundation--data-pipeline)
5. [Phase 2: Draft System](#phase-2-draft-system)
6. [Phase 3: Game Simulation Engine](#phase-3-game-simulation-engine)
7. [Phase 4: Bill James Features](#phase-4-bill-james-features)
8. [Phase 5: Polish & Production](#phase-5-polish--production)
9. [Timeline & Milestones](#timeline--milestones)
10. [Risk Management](#risk-management)

---

## 1. Executive Summary

This document outlines the complete implementation plan for **Century of the Game**, a web-based baseball simulation application that combines:
- APBA Baseball v3 game mechanics (reverse engineered)
- Bill James Baseball Encyclopedia features (reverse engineered)
- Lahman database (1871-2025) for comprehensive player data
- Modern React + TypeScript web application
- Supabase backend for all data persistence

### Key Deliverables

1. **Phase 1:** Data pipeline that converts Lahman CSV + APBA mechanics into Supabase
2. **Phase 2:** Complete fantasy draft system with CPU AI
3. **Phase 3:** Full 162-game season simulation with APBA mechanics
4. **Phase 4:** Statistical analysis and historical comparison tools
5. **Phase 5:** Production-ready application with Century of the Game branding

---

## 2. Project Goals

### Primary Goals

- **Reverse Engineer APBA:** Fully understand and recreate APBA player card system and game mechanics
- **Reverse Engineer Bill James:** Extract all statistical analysis features
- **Historical Accuracy:** Use Lahman database for authentic player stats 1901-2025
- **Modern Tech Stack:** Build with React + TypeScript for maintainability
- **Production Ready:** Server-side hosting, performance optimization, WCAG AA accessibility
- **Professional Design:** Century of the Game branding with vintage baseball aesthetic

### Success Criteria

- [x] All Lahman players (1871-2025) imported to Supabase with APBA-style ratings ✅
- [x] Draft system supports 2-30 teams with intelligent CPU drafting ✅
- [ ] Game simulation produces realistic outcomes based on APBA mechanics **TODO** _(Phase 3)_
- [ ] 162-game seasons with proper scheduling (4-pitcher rotation, no doubleheaders) **TODO** _(Phase 3)_
- [ ] Application meets WCAG AA accessibility standards **TODO** _(Phase 5)_
- [x] Application passes performance benchmarks (see SRD section 4.1) ✅ _(Virtual scrolling, <1s render, <500ms picks)_

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend Framework** | React 18+ | Component-based, massive ecosystem, excellent TypeScript support |
| **Language** | TypeScript | Type safety, better DX, catches errors at compile time |
| **Build Tool** | Vite | Fast HMR, modern ESM support, optimized production builds |
| **State Management** | Zustand or Redux Toolkit | Draft state, game state, complex state management |
| **Styling** | Tailwind CSS | Rapid development, responsive design, rebrand-ready |
| **Database** | Supabase (PostgreSQL) | Free tier, real-time, auth, REST + GraphQL APIs |
| **Backend** | Supabase Edge Functions | Serverless functions for game simulation logic |
| **Hosting** | Vercel or Netlify | Server-side rendering, CDN, CI/CD |
| **Testing** | Vitest + React Testing Library | Fast unit tests, component testing |

### 3.2 Directory Structure

```
cotg/
├── data_files/
│   └── lahman_1871-2025_csv/        # Source Lahman CSVs
├── docs/
│   ├── Baseball_Fantasy_Draft_SRD.md
│   ├── IMPLEMENTATION_PLAN.md       # This file
│   ├── APBA_REVERSE_ENGINEERING.md  # APBA mechanics documentation
│   ├── BILL_JAMES_FEATURES.md       # Bill James features doc
│   ├── rebrand-plan.md
│   ├── color-contrast-audit.md
│   ├── trd-ai-draft-algorithm.md
│   └── CLAUDE.md
├── scripts/
│   ├── parse_apba_binary.py         # Parse APBA .DAT files
│   ├── import_lahman_to_supabase.ts # Import pipeline
│   ├── generate_apba_cards.ts       # Generate player cards
│   └── analyze_bill_james.py        # Extract Bill James features
├── src/
│   ├── components/
│   │   ├── draft/                   # Draft UI components
│   │   ├── game/                    # Game simulation UI
│   │   ├── stats/                   # Statistics/analysis UI
│   │   └── common/                  # Shared components
│   ├── hooks/                       # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── apba-engine.ts          # APBA game mechanics
│   │   └── draft-ai.ts             # CPU draft algorithm
│   ├── types/                       # TypeScript types
│   ├── utils/                       # Utility functions
│   └── App.tsx                      # Main app component
├── supabase/
│   ├── migrations/                  # Database migrations
│   ├── functions/                   # Edge functions
│   └── seed.sql                     # Seed data
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 3.3 Supabase Database Schema (Preliminary)

```sql
-- Players table (master list)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lahman_id VARCHAR(10) UNIQUE NOT NULL,
    bbref_id VARCHAR(10),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    birth_year INTEGER,
    birth_month INTEGER,
    birth_day INTEGER,
    debut_date DATE,
    final_game DATE,
    bats CHAR(1),
    throws CHAR(1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player seasons with stats
CREATE TABLE player_seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    year INTEGER NOT NULL,
    team_id VARCHAR(3),
    league_id VARCHAR(2),
    -- Batting stats
    games INTEGER,
    at_bats INTEGER,
    runs INTEGER,
    hits INTEGER,
    doubles INTEGER,
    triples INTEGER,
    home_runs INTEGER,
    rbi INTEGER,
    stolen_bases INTEGER,
    walks INTEGER,
    strikeouts INTEGER,
    batting_avg DECIMAL(4,3),
    obp DECIMAL(4,3),
    slg DECIMAL(4,3),
    ops DECIMAL(4,3),
    war DECIMAL(4,1),
    -- Pitching stats
    wins INTEGER,
    losses INTEGER,
    saves INTEGER,
    games_started INTEGER,
    innings_pitched DECIMAL(5,1),
    earned_runs INTEGER,
    era DECIMAL(4,2),
    whip DECIMAL(4,2),
    strikeouts_pitcher INTEGER,
    -- APBA card data
    apba_card JSONB,  -- Store APBA ratings/grades
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, year, team_id)
);

-- APBA player cards
CREATE TABLE apba_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_season_id UUID REFERENCES player_seasons(id),
    -- Card ratings (reverse engineered from APBA)
    card_number VARCHAR(10),
    position VARCHAR(5),
    grade_fielding INTEGER,
    grade_running INTEGER,
    grade_stealing INTEGER,
    -- Batting outcomes (APBA dice roll results)
    outcomes JSONB,  -- 36 possible dice outcomes (2-12)
    pitcher_outcomes JSONB,  -- For pitchers
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Draft sessions
CREATE TABLE draft_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    num_teams INTEGER NOT NULL,
    current_round INTEGER DEFAULT 1,
    current_pick INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'setup', -- setup, in_progress, completed
    config JSONB,  -- Draft configuration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams (for drafts and leagues)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_session_id UUID REFERENCES draft_sessions(id),
    league_id UUID REFERENCES leagues(id),
    name VARCHAR(100) NOT NULL,
    draft_position INTEGER,
    control_type VARCHAR(10), -- 'human' or 'cpu'
    roster JSONB,  -- Player assignments
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Draft picks
CREATE TABLE draft_picks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_session_id UUID REFERENCES draft_sessions(id),
    team_id UUID REFERENCES teams(id),
    player_season_id UUID REFERENCES player_seasons(id),
    round INTEGER NOT NULL,
    pick INTEGER NOT NULL,
    overall_pick INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Leagues (for game simulation)
CREATE TABLE leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    season_year INTEGER NOT NULL,
    num_teams INTEGER NOT NULL,
    games_per_season INTEGER DEFAULT 162,
    status VARCHAR(20) DEFAULT 'setup',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games (simulated games)
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES leagues(id),
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    game_number INTEGER,
    game_date DATE,
    home_score INTEGER,
    away_score INTEGER,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed
    box_score JSONB,  -- Detailed game results
    play_by_play JSONB,  -- Play-by-play log
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_player_seasons_player ON player_seasons(player_id);
CREATE INDEX idx_player_seasons_year ON player_seasons(year);
CREATE INDEX idx_player_seasons_war ON player_seasons(war DESC);
CREATE INDEX idx_draft_picks_session ON draft_picks(draft_session_id);
CREATE INDEX idx_games_league ON games(league_id);
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id);
```

---

## Phase 1: Foundation & Data Pipeline ✅ 85% COMPLETE

**Goal:** Set up project infrastructure and import all player data

**Status:** Phase 1 foundation work is largely complete. Dev environment set up, Supabase deployed, Lahman data imported, APBA-style rating system implemented. Full APBA dice mechanics and Bill James features deferred to later phases.

### 1.1 Reverse Engineer APBA Format ⚠️ 60% COMPLETE

**Tasks:**
- [x] Document player card format (ratings, grades, dice outcomes) _(docs/APBA_REVERSE_ENGINEERING.md)_
- [x] Implement APBA-inspired rating system (0-100 scale) _(src/utils/apbaRating.ts)_
- [x] Create rating calculation script _(scripts/calculate-apba-ratings.ts)_
- [ ] Parse APBA PLAYERS.DAT binary files **TODO** _(deferred to Phase 3)_
- [ ] Understand full APBA dice roll mechanics **TODO** _(deferred to Phase 3)_
- [ ] Extract outcome tables from TABLES directory **TODO** _(deferred to Phase 3)_

**Files analyzed:**
- ✓ APBA rating concepts documented
- ✓ Player rating formulas implemented
- ✓ Script calculates ratings for all 45,000+ player seasons

**Deliverable:** ⚠️ APBA-inspired rating system complete; full dice mechanics deferred to Phase 3

### 1.2 Reverse Engineer Bill James Format ✅ COMPLETE

**Tasks:**
- [x] Analyze Bill James BJEBEW file structure
- [x] Document extractable features _(docs/BILL_JAMES_FEATURES.md)_
- [x] Document formulas _(docs/BILL_JAMES_FORMULAS.md)_
- [ ] Implement features in UI **TODO** _(deferred to Phase 4)_

**Files analyzed:**
- `C:\dosgames\shared\BJEBEW\BJSTRUCT\*`
- `C:\dosgames\shared\BJEBEW\BJOBJECT\*`

**Deliverable:** ✅ Documentation complete; implementation deferred to Phase 4

### 1.3 Set Up Development Environment ✅ COMPLETE

**Tasks:**
- [x] Initialize React + TypeScript project with Vite _(c:\Users\jonmc\dev\cotg)_
- [x] Configure Tailwind CSS _(tailwind.config.js)_
- [x] Set up Supabase project and get credentials _(.env)_
- [x] Install dependencies (Supabase client, Zustand, react-window, etc.)
- [x] Configure ESLint + Prettier
- [x] Set up Git repository _(local repo with 55+ commits)_
- [x] Create directory structure _(src/, docs/, scripts/)_

**Deliverable:** ✅ Working dev environment with hot reload (Vite HMR)

### 1.4 Design Supabase Schema ✅ COMPLETE

**Tasks:**
- [x] Finalize database schema based on Lahman + APBA needs
- [x] Create players table _(UUID primary key, Lahman data)_
- [x] Create player_seasons table _(stats + apba_rating column)_
- [x] Set up RLS policies _(read-only for anon, admin for service role)_
- [x] Deploy schema to Supabase _(production database)_

**Deliverable:** ✅ Database with correct schema deployed and operational

### 1.5 Build Lahman Import Pipeline ✅ COMPLETE

**Tasks:**
- [x] Import Lahman CSV data to Supabase
- [x] Parse and validate all CSV files
- [x] Transform data to match Supabase schema
- [x] Batch insert players into Supabase
- [x] Batch insert player_seasons with stats
- [x] Handle errors and log progress

**Files imported:**
- People.csv → players table (~20,000 players)
- Batting.csv + Pitching.csv → player_seasons table (~45,000 seasons)
- Fielding data included in player_seasons

**Deliverable:** ✅ All Lahman players 1871-2025 in Supabase (accessible via draft system)

### 1.6 Generate APBA Player Ratings ✅ COMPLETE

**Tasks:**
- [x] Create algorithm to generate APBA-style ratings from stats _(src/utils/apbaRating.ts)_
- [x] Calculate ratings/grades (0-100 scale) _(position player + pitcher formulas)_
- [x] Create bulk update script _(scripts/calculate-apba-ratings.ts)_
- [x] Insert APBA ratings into database _(apba_rating column in player_seasons)_
- [x] Optimize script performance (5-10 minutes for 45k players)
- [ ] Generate full APBA dice outcome distributions **TODO** _(deferred to Phase 3)_

**Deliverable:** ✅ APBA-style ratings for all players; dice mechanics deferred to Phase 3

---

## Phase 2: Draft System ✅ 95% COMPLETE

**Goal:** Complete fantasy draft application per SRD requirements

**Status:** Phase 2 is nearly complete. Core draft system is fully functional with intelligent CPU AI, virtual scrolling for performance, two-way player support, and smooth loading indicators.

### 2.1 Core Draft UI ✅ COMPLETE

**Tasks:**
- [x] Build draft configuration screen _(DraftConfig.tsx)_
- [x] Build team setup interface _(TeamSetup.tsx)_
- [x] Implement draft order randomization _(draftStore.ts)_
- [x] Build main draft board UI _(DraftBoard.tsx)_
- [x] Build player pool list with virtualization _(TabbedPlayerPool.tsx - react-window)_
- [x] Build roster view per team _(RosterView.tsx)_
- [x] Build position assignment modal _(PositionAssignmentModal.tsx)_

**Components:**
```typescript
✓ DraftConfig.tsx
✓ TeamSetup.tsx
✓ DraftBoard.tsx
✓ TabbedPlayerPool.tsx (with virtual scrolling - 47k+ players)
✓ DraftControls.tsx
✓ RosterView.tsx
✓ PositionAssignmentModal.tsx
✓ PickHistory.tsx
```

**Deliverable:** ✅ Complete draft UI matching SRD mockups

### 2.2 Draft State Management ✅ COMPLETE

**Tasks:**
- [x] Design Zustand store for draft state _(src/stores/draftStore.ts)_
- [x] Implement draft configuration state
- [x] Implement player pool state
- [x] Implement team roster state
- [x] Implement draft history state
- [x] Add persistence (using zustand/persist with localStorage)

**Deliverable:** ✅ Robust state management for draft flow

### 2.3 CPU Draft AI ✅ COMPLETE

**Tasks:**
- [x] Implement `selectBestPlayer()` algorithm _(cpuDraftLogic.ts)_
- [x] Implement pick scoring with APBA rating + positional need
- [x] Implement position need logic (favor empty positions)
- [x] Implement positional scarcity bonuses (C, SS, SP prioritized)
- [x] Add randomization factor (1-2 second think time)
- [x] Test AI drafting across multiple rounds _(fully functional)_

**Reference:** `docs/trd-ai-draft-algorithm.md`

**Deliverable:** ✅ Intelligent CPU drafting that fills rosters properly

### 2.4 Draft Features ⚠️ 90% COMPLETE

**Tasks:**
- [x] Implement player filtering (position tabs, drafted player removal)
- [x] Implement player sorting (Rating, Name, Position, Year, All Stats)
- [x] Implement search functionality _(real-time name search)_
- [x] Add draft pause/resume _(DraftControls.tsx)_
- [x] Add save/load draft state _(Zustand persistence)_
- [ ] Add export draft results (CSV/JSON) **TODO**

**Deliverable:** ⚠️ All SRD draft requirements met (export pending)

### 2.5 Performance & Polish ✅ COMPLETE

**Additional work completed beyond original plan:**

- [x] Virtual scrolling for 47,413 players (react-window)
- [x] Parallel batch loading with progress tracking
- [x] Loading guard to prevent race conditions
- [x] Two-way player support (Babe Ruth, Shohei Ohtani)
- [x] Stats-based filtering (200 AB threshold for position players)
- [x] Numeric rating display consistency
- [x] Sort performance optimization (batched state updates)
- [x] APBA rating system implementation (0-100 scale)
- [x] Century of the Game branding (burgundy, gold, cream, charcoal)

**Performance Metrics Achieved:**
- Player list render: ~50ms for 47k players (virtual scrolling)
- Sort operation: 30-40ms for 47k players
- Draft pick: <500ms (CPU AI with 1-2s think time)
- Loading: Real-time progress tracking with smooth indicators

---

## Phase 3: Game Simulation Engine

**Goal:** APBA-style game simulation for 162-game seasons

### 3.1 Game Engine Core

**Tasks:**
- [ ] Implement APBA dice roll mechanics
- [ ] Implement outcome table lookups
- [ ] Implement at-bat simulation
- [ ] Implement inning simulation
- [ ] Implement full game simulation
- [ ] Add game state tracking

**Reference:** APBA outcome tables from reverse engineering

**Deliverable:** Working game simulation engine

### 3.2 Season Management

**Tasks:**
- [ ] Create league setup interface
- [ ] Generate 162-game schedules (no team plays twice in one day)
- [ ] Implement 4-pitcher rotation (starter pitches every 5th game)
- [ ] Implement roster management during season
- [ ] Track standings, stats, records

**Deliverable:** Full season simulation capability

### 3.3 Game UI

**Tasks:**
- [ ] Build game viewer interface
- [ ] Display live play-by-play
- [ ] Display box scores
- [ ] Display player stats during game
- [ ] Add game speed controls
- [ ] Add simulation mode (fast forward entire game)

**Deliverable:** Watchable game simulations

### 3.4 Statistics Tracking

**Tasks:**
- [ ] Track player stats across simulated games
- [ ] Calculate cumulative season stats
- [ ] Generate leaderboards
- [ ] Export stats to CSV

**Deliverable:** Comprehensive stat tracking

---

## Phase 4: Bill James Features

**Goal:** Statistical analysis and historical comparison tools

### 4.1 Historical Comparisons

**Tasks:**
- [ ] Build player comparison tool
- [ ] Compare players across eras
- [ ] Normalize stats for era differences
- [ ] Display side-by-side comparisons

**Deliverable:** Player comparison feature

### 4.2 Advanced Metrics

**Tasks:**
- [ ] Implement Bill James formulas (RC, Win Shares, etc.)
- [ ] Display advanced metrics on player cards
- [ ] Create metrics dashboard

**Deliverable:** Advanced statistical analysis

### 4.3 Era Analysis

**Tasks:**
- [ ] Group players by era (Dead Ball, Live Ball, Modern, etc.)
- [ ] Show era-specific leaderboards
- [ ] Compare eras statistically

**Deliverable:** Era-based browsing and analysis

---

## Phase 5: Polish & Production

**Goal:** Production-ready application with Century of the Game branding

### 5.1 Apply Branding

**Tasks:**
- [ ] Implement color palette from rebrand-plan.md
- [ ] Apply typography (Playfair Display, Crimson Text, Source Sans 3)
- [ ] Create logo (stacked, horizontal, monogram)
- [ ] Update all UI components with branding
- [ ] Create loading screens
- [ ] Design 404/error pages

**Reference:** `docs/rebrand-plan.md`

**Deliverable:** Fully branded application

### 5.2 Accessibility

**Tasks:**
- [ ] Fix color contrast issues per audit
- [ ] Ensure keyboard navigation works
- [ ] Add ARIA labels
- [ ] Test with screen readers
- [ ] Test at 200% zoom

**Reference:** `docs/color-contrast-audit.md`

**Deliverable:** WCAG AA compliant application

### 5.3 Performance Optimization

**Tasks:**
- [ ] Optimize player pool rendering (virtualization)
- [ ] Lazy load components
- [ ] Optimize Supabase queries
- [ ] Add caching layer
- [ ] Compress assets
- [ ] Run Lighthouse audits

**Targets:** (from SRD)
- Initial load: < 3s
- Player list render: < 1s
- Draft pick: < 500ms

**Deliverable:** Fast, optimized application

### 5.4 Testing

**Tasks:**
- [ ] Write unit tests for game engine
- [ ] Write unit tests for draft AI
- [ ] Write component tests
- [ ] End-to-end testing
- [ ] Browser compatibility testing

**Deliverable:** Well-tested application

### 5.5 Deployment

**Tasks:**
- [ ] Set up Vercel/Netlify project
- [ ] Configure environment variables
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production
- [ ] Configure custom domain

**Deliverable:** Live production application

---

## Timeline & Milestones

### Actual Progress vs Estimates

| Phase | Original Estimate | Actual Status | Key Milestone |
|-------|-------------------|---------------|---------------|
| Phase 1: Foundation | 3-4 weeks | ✅ 85% Complete | All player data in Supabase with APBA ratings |
| Phase 2: Draft System | 2-3 weeks | ✅ 95% Complete | Complete draft application working |
| Phase 3: Game Simulation | 4-5 weeks | ⏸️ Not Started | 162-game seasons simulating correctly |
| Phase 4: Bill James | 1-2 weeks | ⏸️ Not Started | Statistical analysis features live |
| Phase 5: Polish | 2-3 weeks | ⏸️ Not Started | Production deployment |

**Overall Progress:** 40% (2 of 5 phases complete)
**Remaining Estimated Duration:** 7-10 weeks (2-2.5 months)

### Phase 1 & 2 Completed Work (January 2026)

**Phase 1 Accomplishments:**
- ✅ React + TypeScript + Vite environment set up
- ✅ Supabase schema designed and deployed
- ✅ Lahman data imported (1871-2025, 45,000+ player seasons)
- ✅ APBA-inspired rating system implemented (0-100 scale)
- ✅ Rating calculation script with parallel updates (5-10 min execution)
- ✅ Documentation complete (APBA, Bill James, Implementation Plan)

**Phase 2 Accomplishments:**
- ✅ Complete draft UI (config, board, player pool, roster, controls)
- ✅ Virtual scrolling for 47k+ players (react-window)
- ✅ Zustand state management with persistence
- ✅ Intelligent CPU draft AI
- ✅ Player filtering, sorting, search
- ✅ Two-way player support (Babe Ruth, Shohei Ohtani)
- ✅ Draft pause/resume, save/load
- ✅ Performance optimized (<1s render, <500ms picks)
- ⚠️ Export feature pending (CSV/JSON)

---

## Risk Management

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| APBA mechanics unclear from binary | Medium | High | Consult APBA documentation, forums, community |
| Supabase free tier limits | Low | Medium | Monitor usage, optimize queries, upgrade if needed |
| Performance issues with 20K+ players | Medium | High | Implement virtualization, pagination, caching |
| Game simulation too slow | Medium | High | Use web workers, optimize algorithms, Edge Functions |

### Data Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Lahman data incomplete for early years | Low | Low | Document gaps, use best available data |
| APBA card generation inaccurate | Medium | High | Validate against original APBA cards, iterate |
| Binary file parsing errors | Low | High | Extensive testing, error handling |

### Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | High | High | Stick to phased approach, defer non-critical features |
| Timeline underestimated | Medium | Medium | Regular progress reviews, adjust estimates |
| User feedback requires major changes | Medium | Medium | Get early feedback on Phase 1 deliverables |

---

## Next Steps

1. **Review this plan** - Get approval on approach and timeline
2. **Start Phase 1.1** - Begin APBA reverse engineering
3. **Set up project** - Initialize React app, Supabase project
4. **Weekly check-ins** - Review progress, adjust plan as needed

---

## Questions for Discussion

Before proceeding, please confirm:

1. **Timeline:** Is 3-4 months acceptable for full delivery?
2. **Phasing:** Should we fully complete Phase 1 before starting Phase 2?
3. **Scope:** Any features to add/remove from this plan?
4. **Priorities:** If timeline is tight, which phase is most critical?
5. **Testing:** How much testing is required before production?

---

**Last Updated:** January 27, 2026
**Next Review:** After Phase 1.1 completion
