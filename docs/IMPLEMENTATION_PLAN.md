# Century of the Game - Implementation Plan

**Version:** 1.0
**Date:** January 27, 2026
**Status:** Planning
**Project Directory:** `c:\users\jonmc\dev\cotg`

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

- [ ] All Lahman players (1901-2025) imported to Supabase with APBA-style ratings
- [ ] Draft system supports 2-30 teams with intelligent CPU drafting
- [ ] Game simulation produces realistic outcomes based on APBA mechanics
- [ ] 162-game seasons with proper scheduling (4-pitcher rotation, no doubleheaders)
- [ ] Application meets WCAG AA accessibility standards
- [ ] Application passes performance benchmarks (see SRD section 4.1)

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

## Phase 1: Foundation & Data Pipeline

**Goal:** Set up project infrastructure and import all player data

### 1.1 Reverse Engineer APBA Format

**Tasks:**
- [ ] Parse APBA PLAYERS.DAT binary files to understand structure
- [ ] Document player card format (ratings, grades, dice outcomes)
- [ ] Understand APBA game mechanics (dice rolls, outcome tables)
- [ ] Create Python script to extract data from all season .DAT files
- [ ] Document findings in `docs/APBA_REVERSE_ENGINEERING.md`

**Files to analyze:**
- `C:\dosgames\shared\BBW\1921S.WDD\PLAYERS.DAT`
- `C:\dosgames\shared\BBW\1943S.WDD\PLAYERS.DAT`
- `C:\dosgames\shared\BBW\1971S.WDD\PLAYERS.DAT`
- TABLES directory for outcome tables

**Deliverable:** Complete understanding of APBA mechanics and data format

### 1.2 Reverse Engineer Bill James Format

**Tasks:**
- [ ] Analyze Bill James BJEBEW file structure
- [ ] Parse BJSTRUCT data files
- [ ] Understand statistical calculations and comparisons
- [ ] Document all extractable features
- [ ] Create documentation in `docs/BILL_JAMES_FEATURES.md`

**Files to analyze:**
- `C:\dosgames\shared\BJEBEW\BJSTRUCT\*`
- `C:\dosgames\shared\BJEBEW\BJOBJECT\*`

**Deliverable:** List of Bill James features to implement

### 1.3 Set Up Development Environment

**Tasks:**
- [ ] Initialize React + TypeScript project with Vite
- [ ] Configure Tailwind CSS
- [ ] Set up Supabase project and get credentials
- [ ] Install dependencies (Supabase client, Zustand/Redux, etc.)
- [ ] Configure ESLint + Prettier
- [ ] Set up Git repository
- [ ] Create initial directory structure

**Commands:**
```bash
cd c:\Users\jonmc\dev\cotg
npm create vite@latest . -- --template react-ts
npm install @supabase/supabase-js zustand tailwindcss
npm install -D @types/node eslint prettier
```

**Deliverable:** Working dev environment with hot reload

### 1.4 Design Supabase Schema

**Tasks:**
- [ ] Finalize database schema based on Lahman + APBA needs
- [ ] Create migration files
- [ ] Set up RLS (Row Level Security) policies
- [ ] Deploy schema to Supabase

**Deliverable:** Empty database with correct schema

### 1.5 Build Lahman Import Pipeline

**Tasks:**
- [ ] Create TypeScript script to read Lahman CSVs
- [ ] Parse and validate all CSV files
- [ ] Transform data to match Supabase schema
- [ ] Batch insert players into Supabase
- [ ] Batch insert player_seasons with stats
- [ ] Handle errors and log progress

**Files to import:**
- People.csv → players table
- Batting.csv → player_seasons (batting stats)
- Pitching.csv → player_seasons (pitching stats)
- Fielding.csv → player_seasons (fielding data)

**Deliverable:** All Lahman players 1901-2025 in Supabase

### 1.6 Generate APBA Player Cards

**Tasks:**
- [ ] Create algorithm to generate APBA-style cards from stats
- [ ] Calculate ratings/grades based on reverse-engineered formulas
- [ ] Generate dice outcome distributions
- [ ] Insert APBA cards into database
- [ ] Validate card generation against original APBA data

**Deliverable:** APBA cards for all players 1901-2025

---

## Phase 2: Draft System

**Goal:** Complete fantasy draft application per SRD requirements

### 2.1 Core Draft UI

**Tasks:**
- [ ] Build draft configuration screen
- [ ] Build team setup interface
- [ ] Implement draft order randomization
- [ ] Build main draft board UI
- [ ] Build player pool list with virtualization
- [ ] Build roster view per team
- [ ] Build position assignment modal

**Components:**
```typescript
- DraftConfig.tsx
- TeamSetup.tsx
- DraftBoard.tsx
- PlayerPool.tsx
- PlayerCard.tsx
- RosterView.tsx
- PositionAssignment.tsx
```

**Deliverable:** Complete draft UI matching SRD mockups

### 2.2 Draft State Management

**Tasks:**
- [ ] Design Zustand/Redux store for draft state
- [ ] Implement draft configuration state
- [ ] Implement player pool state
- [ ] Implement team roster state
- [ ] Implement draft history state
- [ ] Add persistence to Supabase

**Deliverable:** Robust state management for draft flow

### 2.3 CPU Draft AI

**Tasks:**
- [ ] Implement `getSmartPick()` algorithm from TRD
- [ ] Implement `calculatePickScore()` with round-based scaling
- [ ] Implement position need logic
- [ ] Implement positional scarcity bonuses
- [ ] Add randomization factor
- [ ] Test AI drafting across multiple rounds

**Reference:** `docs/trd-ai-draft-algorithm.md`

**Deliverable:** Intelligent CPU drafting that fills rosters properly

### 2.4 Draft Features

**Tasks:**
- [ ] Implement player filtering (position, year, availability)
- [ ] Implement player sorting (WAR, name, position)
- [ ] Implement search functionality
- [ ] Add draft pause/resume
- [ ] Add save/load draft state
- [ ] Add export draft results (CSV/JSON)

**Deliverable:** All SRD draft requirements met

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

### Estimated Timeline

| Phase | Duration | Key Milestone |
|-------|----------|---------------|
| Phase 1: Foundation | 3-4 weeks | All player data in Supabase with APBA cards |
| Phase 2: Draft System | 2-3 weeks | Complete draft application working |
| Phase 3: Game Simulation | 4-5 weeks | 162-game seasons simulating correctly |
| Phase 4: Bill James | 1-2 weeks | Statistical analysis features live |
| Phase 5: Polish | 2-3 weeks | Production deployment |

**Total Estimated Duration:** 12-17 weeks (3-4 months)

### Phase 1 Detailed Milestones

- **Week 1:** APBA reverse engineering complete, BJEBEW analysis complete
- **Week 2:** React project set up, Supabase schema deployed
- **Week 3:** Lahman import pipeline working, all data imported
- **Week 4:** APBA card generation complete, validated against originals

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
