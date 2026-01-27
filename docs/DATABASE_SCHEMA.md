### Database Schema Documentation

**Century of the Game - Supabase PostgreSQL Database**

**Date:** 2026-01-27
**Database:** PostgreSQL 15+ (Supabase)
**Total Tables:** 17
**Total Views:** 4
**Total Functions:** 3

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
4. [Draft System Tables](#draft-system-tables)
5. [Game Simulation Tables](#game-simulation-tables)
6. [Views and Functions](#views-and-functions)
7. [Indexes and Performance](#indexes-and-performance)
8. [Row Level Security](#row-level-security)
9. [Common Queries](#common-queries)

---

## Schema Overview

The database is organized into three logical domains:

### 1. Core Player Data (Historical MLB Data)
- `players` - Player biographical information
- `player_seasons` - Season-by-season statistics
- `teams_history` - Historical MLB teams
- `apba_cards` - Generated APBA player cards
- `apba_outcomes` - APBA outcome reference data

### 2. Draft System (Fantasy Draft)
- `draft_sessions` - Draft session configuration
- `draft_teams` - Teams in a draft
- `draft_picks` - Record of picks made
- `draft_rankings` - TRD algorithm rankings
- `draft_watchlist` - Players being watched

### 3. Game Simulation (APBA Simulation)
- `leagues` - User-created leagues
- `league_teams` - Teams in a league
- `league_rosters` - Player assignments
- `games` - Simulated games
- `game_events` - Play-by-play events
- `player_game_stats` - Box score data

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   CORE PLAYER DATA                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐       ┌──────────────────┐       ┌───────────────┐
│   players   │───┬───│ player_seasons   │───┬───│ apba_cards    │
│             │   │   │                  │   │   │               │
│ lahman_id   │   │   │ batting stats    │   │   │ dice_outcomes │
│ first_name  │   │   │ pitching stats   │   │   │ fielding_grade│
│ last_name   │   │   │ fielding stats   │   │   │ pitcher_grade │
│ birth_year  │   │   │ Bill James stats │   │   │               │
└─────────────┘   │   └──────────────────┘   │   └───────────────┘
                  │            │              │
                  │            ├──────────────┘
                  │            │
                  │   ┌──────────────────┐
                  │   │  teams_history   │
                  └───│                  │
                      │  team_id, year   │
                      └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   DRAFT SYSTEM                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐       ┌─────────────────┐
│ draft_sessions  │───┬───│  draft_teams    │
│                 │   │   │                 │
│ season_year     │   │   │  team_name      │
│ num_teams       │   │   │  draft_order    │
│ draft_type      │   │   │  owner_name     │
│ status          │   │   └─────────────────┘
└─────────────────┘   │            │
         │            │            │
         │            │            ├───┬───┐
         │            │            │   │   │
         │            │   ┌────────────────┐  ┌─────────────────┐
         │            └───│  draft_picks   │  │draft_watchlist  │
         │                │                │  │                 │
         │                │  pick_number   │  │  priority       │
         │                │  player_id ────┼──│  notes          │
         │                └────────────────┘  └─────────────────┘
         │
         │                ┌─────────────────┐
         └────────────────│draft_rankings   │
                          │                 │
                          │  rank           │
                          │  ranking_type   │
                          │  (TRD algorithm)│
                          └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                GAME SIMULATION                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐       ┌─────────────────┐       ┌──────────────┐
│   leagues   │───┬───│  league_teams   │───┬───│league_rosters│
│             │   │   │                 │   │   │              │
│season_year  │   │   │  team_name      │   │   │  player_id   │
│num_teams    │   │   │  wins/losses    │   │   │  position    │
│status       │   │   └─────────────────┘   │   └──────────────┘
└─────────────┘   │            │             │
                  │            │             │
                  │   ┌────────────────┐    │
                  └───│     games      │────┘
                      │                │
                      │  home_team_id  │
                      │  away_team_id  │
                      │  status        │
                      │  home_score    │
                      │  away_score    │
                      └────────────────┘
                               │
                      ┌────────┴────────┐
                      │                 │
            ┌─────────────────┐  ┌───────────────────┐
            │  game_events    │  │player_game_stats  │
            │                 │  │                   │
            │  inning         │  │  at_bats          │
            │  batter_id      │  │  hits             │
            │  pitcher_id     │  │  innings_pitched  │
            │  dice_roll_1    │  │  putouts          │
            │  dice_roll_2    │  │                   │
            │  outcome_code   │  └───────────────────┘
            │  runs_scored    │
            └─────────────────┘
```

---

## Core Tables

### players

**Purpose:** Biographical data for all MLB players (Lahman People.csv)

**Key Fields:**
- `id` (UUID) - Primary key
- `lahman_id` (VARCHAR) - Unique Lahman identifier (e.g., 'aaronha01')
- `first_name`, `last_name` - Player names
- `display_name` - Computed: "First Last"
- `birth_year`, `birth_month`, `birth_day` - Birth date
- `bats`, `throws` - Handedness (L/R/B)
- `debut_date`, `final_game_date` - Career span
- `career_span` - Computed: "1954-1976"

**Indexes:**
- `lahman_id` (unique)
- `last_name`
- `debut_year`, `final_year`
- Full-text search on names

**Sample Row:**
```sql
id: uuid-1234
lahman_id: 'aaronha01'
first_name: 'Hank'
last_name: 'Aaron'
display_name: 'Hank Aaron'
birth_year: 1934
bats: 'R'
throws: 'R'
debut_date: 1954-04-13
career_span: '1954-1976'
```

---

### player_seasons

**Purpose:** Season-by-season statistics combining Batting, Pitching, and Fielding data

**Key Fields:**

**Identifiers:**
- `id` (UUID) - Primary key
- `player_id` (UUID FK) - References players
- `year` (INTEGER) - Season year
- `stint` (INTEGER) - 1, 2, 3 for players traded mid-season
- `team_id` (VARCHAR) - Team abbreviation (e.g., 'NYA')
- `primary_position` (VARCHAR) - 1B, 2B, SS, 3B, OF, C, P, DH

**Batting Stats:**
- `at_bats`, `runs`, `hits`, `doubles`, `triples`, `home_runs`, `rbi`
- `stolen_bases`, `caught_stealing`, `walks`, `strikeouts`
- `batting_avg`, `on_base_pct`, `slugging_pct`, `ops`

**Pitching Stats:**
- `wins`, `losses`, `era`, `innings_pitched_outs`
- `hits_allowed`, `runs_allowed`, `earned_runs`
- `strikeouts_pitched`, `walks_allowed`
- `whip`, `k_per_9`, `bb_per_9`

**Fielding Stats:**
- `putouts`, `assists`, `errors`
- `fielding_pct`, `range_factor`

**Bill James Stats:**
- `runs_created_basic`, `runs_created_advanced`
- `isolated_power`, `secondary_avg`, `power_speed_number`
- `component_era`, `game_score`

**Advanced:**
- `war` - Wins Above Replacement

**Indexes:**
- `player_id, year` (composite unique)
- `year` (season queries)
- `batting_avg DESC` (WHERE at_bats >= 300)
- `home_runs DESC` (WHERE at_bats >= 300)
- `era ASC` (WHERE innings_pitched_outs >= 450)
- `war DESC`

**Sample Row:**
```sql
id: uuid-5678
player_id: uuid-1234 (Hank Aaron)
year: 1957
team_id: 'ML1' (Milwaukee Braves)
primary_position: 'OF'
games: 151
at_bats: 615
hits: 198
home_runs: 44
rbi: 132
batting_avg: 0.322
ops: 1.045
war: 9.6
```

---

### apba_cards

**Purpose:** APBA-style player cards with dice outcome arrays

**Key Fields:**
- `id` (UUID) - Primary key
- `player_id`, `player_season_id` (UUID FKs)
- `season` (INTEGER)
- `card_type` - 'batter' or 'pitcher'

**Batting Card:**
- `dice_outcomes` (INTEGER[36]) - Array of outcome codes for 2d6 rolls
- `fielding_grade` (1-9) - Lower is better
- `speed_rating` (1-20)
- `advancement_rating` - 'A', 'B', 'C'

**Pitching Card:**
- `pitcher_grade` - 'A' (ace) to 'E' (batting practice)
- `pitcher_dice_outcomes` (INTEGER[36]) - Grade A pitchers use this
- `control_rating` (1-10)
- `endurance` (1-10)

**Generation Metadata:**
- `generation_algorithm_version` - '1.0', '1.1', etc.
- `validated_against_original` (BOOLEAN) - Compared to real APBA card?
- `validation_similarity_score` (0.00-1.00)

**Indexes:**
- `player_id, season` (composite)
- `fielding_grade`
- `pitcher_grade`
- `validated_against_original` (WHERE true)

**Sample Row:**
```sql
id: uuid-9999
player_season_id: uuid-5678 (Aaron 1957)
season: 1957
card_type: 'batter'
dice_outcomes: [10, 1, 1, 2, 7, 13, ...] (36 values)
fielding_grade: 2 (excellent)
speed_rating: 14
pitcher_grade: NULL
validated_against_original: false
```

---

## Draft System Tables

### draft_sessions

**Purpose:** Configuration and state for fantasy draft sessions

**Key Fields:**
- `id` (UUID) - Primary key
- `session_name` - "1957 All-Time Draft"
- `season_year` (1901-2025)
- `num_teams` (2-30)
- `num_rounds` (1-50)
- `draft_type` - 'snake' or 'linear'
- `status` - 'setup', 'in_progress', 'paused', 'completed', 'abandoned'
- `current_pick_number` - Overall pick (1, 2, 3, ...)
- `current_round` - Current round
- `current_team_picking` (UUID FK) - References draft_teams

**Player Pool Filters:**
- `min_at_bats` - Minimum ABs for batters
- `min_innings_pitched` - Minimum IP for pitchers
- `eligible_positions` (TEXT[]) - Filter by positions

**Timer:**
- `pick_time_limit_seconds` - NULL = no limit
- `time_limit_enabled` (BOOLEAN)

**Metadata:**
- `started_at`, `completed_at`

**Sample Row:**
```sql
id: uuid-draft-1
session_name: '1957 All-Time Draft'
season_year: 1957
num_teams: 8
num_rounds: 25
draft_type: 'snake'
status: 'in_progress'
current_pick_number: 17
current_round: 3
min_at_bats: 300
pick_time_limit_seconds: 90
```

---

### draft_teams

**Purpose:** Teams participating in a draft

**Key Fields:**
- `id` (UUID) - Primary key
- `draft_session_id` (UUID FK)
- `team_name` - "Vintage Bombers"
- `draft_order` (1, 2, 3, ...) - Pick order in round 1
- `owner_name` - Human owner name
- `primary_color`, `secondary_color` - Hex colors for UI

**Roster Limits:**
- `max_batters`, `max_pitchers`, `max_bench`
- `current_batters`, `current_pitchers` - Updated on picks

**Sample Row:**
```sql
id: uuid-team-1
draft_session_id: uuid-draft-1
team_name: 'Vintage Bombers'
draft_order: 1
owner_name: 'John'
primary_color: '#003366'
secondary_color: '#C8102E'
max_batters: 15
current_batters: 3
```

---

### draft_picks

**Purpose:** Record of all picks made during a draft

**Key Fields:**
- `id` (UUID) - Primary key
- `draft_session_id`, `draft_team_id` (UUID FKs)
- `player_id`, `player_season_id` (UUID FKs)
- `pick_number` (1, 2, 3, ...) - Overall pick
- `round`, `pick_in_round` - Position in draft
- `picked_at` (TIMESTAMPTZ) - When picked
- `time_taken_seconds` - How long to decide
- `was_autopick` (BOOLEAN) - Auto-selected?
- `autopick_reason` - 'time_expired', 'best_available'

**Constraints:**
- UNIQUE(draft_session_id, pick_number)
- UNIQUE(draft_session_id, player_season_id) - No duplicates

**Sample Row:**
```sql
id: uuid-pick-1
draft_session_id: uuid-draft-1
draft_team_id: uuid-team-1
player_season_id: uuid-5678 (Aaron 1957)
pick_number: 1
round: 1
pick_in_round: 1
picked_at: '2026-01-27 20:30:15'
time_taken_seconds: 45
was_autopick: false
```

---

### draft_rankings

**Purpose:** Player rankings (TRD algorithm or custom)

**Key Fields:**
- `draft_session_id` (UUID FK)
- `draft_team_id` (UUID FK) - NULL for global rankings
- `player_season_id` (UUID FK)
- `rank` (1, 2, 3, ...)
- `ranking_score` - Calculated TRD score
- `ranking_type` - 'trd_global', 'trd_position', 'user_custom'
- `position_filter` - 'P', '1B', 'OF', etc. (for trd_position)

**Use Cases:**
1. **TRD Global:** Overall best available players
2. **TRD Position:** Best players by position (best P, best 1B, etc.)
3. **User Custom:** User overrides/manual rankings

**Sample Row:**
```sql
draft_session_id: uuid-draft-1
draft_team_id: NULL (global)
player_season_id: uuid-5678 (Aaron 1957)
rank: 1
ranking_score: 9.6 (WAR)
ranking_type: 'trd_global'
```

---

### draft_watchlist

**Purpose:** Players a team is watching during draft

**Key Fields:**
- `draft_team_id` (UUID FK)
- `player_season_id` (UUID FK)
- `notes` - "Target for round 5"
- `priority` (1-5) - 1 = highest
- `added_at` (TIMESTAMPTZ)

**Sample Row:**
```sql
draft_team_id: uuid-team-1
player_season_id: uuid-koufax-1963
notes: 'Best SP available'
priority: 1
```

---

## Game Simulation Tables

### leagues

**Purpose:** User-created fantasy leagues

**Key Fields:**
- `id` (UUID) - Primary key
- `league_name` - "1957 Classic League"
- `season_year` (1901-2025)
- `num_teams` (2-30)
- `games_per_season` (1-200) - Default 162
- `playoff_format` - 'none', 'wild_card', 'division', 'expanded'

**Simulation Settings:**
- `use_apba_rules` (BOOLEAN) - Default true
- `injury_enabled` (BOOLEAN)
- `weather_effects` (BOOLEAN)

**State:**
- `status` - 'draft', 'in_season', 'playoffs', 'completed'
- `current_game_date` (DATE)

---

### league_teams

**Purpose:** Teams within a league

**Key Fields:**
- `league_id` (UUID FK)
- `draft_team_id` (UUID FK) - Link to draft if came from draft
- `team_name`, `team_abbreviation`
- `wins`, `losses`, `ties`
- `runs_scored`, `runs_allowed`
- `win_pct` - Calculated
- `games_back` - Games behind division leader
- `streak` - 'W5', 'L3'

---

### games

**Purpose:** Simulated games

**Key Fields:**
- `league_id` (UUID FK)
- `home_team_id`, `away_team_id` (UUID FKs)
- `game_number` - Sequential in season
- `game_date`, `game_time`
- `status` - 'scheduled', 'in_progress', 'completed'
- `home_score`, `away_score`
- `innings_played` - 9 or more
- `is_extra_innings` (BOOLEAN)

**Simulation:**
- `simulation_speed` - 'fast', 'normal', 'detailed'
- `simulation_seed` - For reproducibility

**Game Conditions:**
- `weather` - 'clear', 'rain', 'dome'
- `temperature` (INTEGER)

---

### game_events

**Purpose:** Play-by-play simulation log (APBA)

**Key Fields:**
- `game_id` (UUID FK)
- `event_number` - Sequential (1, 2, 3, ...)
- `inning`, `is_top_inning` - Inning state
- `balls`, `strikes`, `outs_before`, `outs_after`

**Players:**
- `batter_id`, `pitcher_id`, `fielder_id` (UUID FKs)

**APBA Dice:**
- `dice_roll_1` (1-6)
- `dice_roll_2` (1-6)
- `dice_total` (2-12)

**Outcome:**
- `outcome_code` - References apba_outcomes
- `outcome_type` - 'single', 'double', 'home_run', 'out', etc.
- `outcome_description` - "Single to left field"

**Base Runners (before):**
- `runner_on_first`, `runner_on_second`, `runner_on_third` (UUID FKs)

**Base Runner Advancement (after):**
- `runner_first_to` - 'home', 'second', 'third', 'out'
- `runner_second_to`, `runner_third_to`, `batter_to`

**Scoring:**
- `runs_scored`, `rbi`
- `home_score_after`, `away_score_after`

**Errors:**
- `is_error` (BOOLEAN)
- `error_position` - '3B', 'SS', etc.

---

## Views and Functions

### v_player_seasons_enriched

**Purpose:** Player seasons with calculated stats and names

**Adds:**
- Player names (first_name, last_name, display_name)
- Team names
- Calculated AVG, OBP, SLG (if missing)
- Calculated K/9, BB/9 for pitchers
- `is_qualified_batter` (AB >= 300)
- `is_qualified_pitcher` (IP >= 150)

**Usage:**
```sql
SELECT * FROM v_player_seasons_enriched
WHERE year = 1957
  AND is_qualified_batter = true
ORDER BY batting_avg DESC
LIMIT 10;
```

---

### v_apba_cards_enriched

**Purpose:** APBA cards with player names and stats

**Adds:**
- Player names
- Season stats (AVG, HR, ERA, etc.)

**Usage:**
```sql
SELECT * FROM v_apba_cards_enriched
WHERE season = 1957
  AND fielding_grade <= 3
ORDER BY batting_avg DESC;
```

---

### v_draft_board

**Purpose:** Available players for drafting with key stats

**Includes:**
- Player names and positions
- Batting: AVG, HR, RBI, SB, OPS
- Pitching: W, L, ERA, IP, K
- Bill James: RC, ISO, WAR
- Qualified flags
- `has_apba_card` (BOOLEAN)

**Usage:**
```sql
SELECT * FROM v_draft_board
WHERE year = 1957
  AND is_qualified_batter = true
  AND primary_position = 'OF'
ORDER BY war DESC;
```

---

### v_league_standings

**Purpose:** League standings with calculated stats

**Adds:**
- `calculated_win_pct`
- `run_differential`
- `division_rank` - Ranking within league

**Usage:**
```sql
SELECT * FROM v_league_standings
WHERE league_id = 'uuid-league-1'
ORDER BY wins DESC;
```

---

### get_player_career_stats(player_id UUID)

**Purpose:** Calculate career totals for a player

**Returns:**
- `total_seasons` - Number of seasons played
- `career_games`, `career_at_bats`, `career_hits`
- `career_home_runs`, `career_rbi`
- `career_avg`, `career_ops`, `career_war`
- `best_season_year`, `best_season_war`

**Usage:**
```sql
SELECT * FROM get_player_career_stats('uuid-hank-aaron');
```

---

### get_draft_pick_order(draft_session_id UUID, round INTEGER)

**Purpose:** Calculate pick order for a given round (handles snake draft)

**Returns:**
- `pick_number` - Overall pick number
- `team_id`, `team_name`, `draft_order`

**Usage:**
```sql
-- Get pick order for round 3
SELECT * FROM get_draft_pick_order('uuid-draft-1', 3);
```

---

### calculate_next_pick(draft_session_id UUID)

**Purpose:** Determine who picks next

**Returns:**
- `next_pick_number`, `next_round`
- `next_team_id`, `next_team_name`

**Usage:**
```sql
SELECT * FROM calculate_next_pick('uuid-draft-1');
```

---

## Indexes and Performance

### High-Traffic Queries

1. **Player Search by Name**
   - Index: `idx_players_name_search` (GIN full-text)
   - Usage: "Find players named 'Aaron'"

2. **Season Leaders**
   - Index: `idx_player_seasons_batting_avg` (DESC, WHERE AB >= 300)
   - Index: `idx_player_seasons_home_runs` (DESC, WHERE AB >= 300)
   - Index: `idx_player_seasons_era` (ASC, WHERE IP >= 150)
   - Index: `idx_player_seasons_war` (DESC)

3. **Draft Board Filtering**
   - Index: `idx_player_seasons_year` (for season queries)
   - Index: `idx_player_seasons_position` (for position filters)

4. **Game Event Lookups**
   - Index: `idx_game_events_sequence` (game_id, event_number)
   - Usage: Play-by-play retrieval

### Query Optimization Tips

1. **Use Views:** Pre-computed joins and calculations
2. **Filter Early:** Use WHERE clauses on indexed columns
3. **Qualified Players:** Always filter by AB >= 300 or IP >= 150 for leaders
4. **Composite Indexes:** (player_id, year) for player history

---

## Row Level Security

**Phase 1-3: Permissive (Public Access)**

All tables have `SELECT` access for everyone.
Draft and game tables have `INSERT/UPDATE` access for everyone.

**Reason:** Simplifies development during Phases 1-3.

**Phase 5: Authentication Required**

Future policies will restrict:
- Draft sessions: Only creator can update
- Draft teams: Only owner can update
- Leagues: Only creator can update
- Watchlist: Only team owner can view/edit

**See:** `007_create_rls_policies.sql` for commented future policies

---

## Common Queries

### 1. Get Top 10 Hitters in 1957

```sql
SELECT
  display_name,
  team_id,
  batting_avg,
  home_runs,
  rbi,
  ops,
  war
FROM v_player_seasons_enriched
WHERE year = 1957
  AND is_qualified_batter = true
ORDER BY war DESC
LIMIT 10;
```

### 2. Find All Pitchers with ERA < 2.00 (min 150 IP)

```sql
SELECT
  display_name,
  year,
  team_id,
  wins,
  losses,
  era,
  innings_pitched,
  strikeouts_pitched
FROM v_player_seasons_enriched
WHERE is_qualified_pitcher = true
  AND era < 2.00
ORDER BY era ASC;
```

### 3. Get Player Career Stats

```sql
SELECT * FROM get_player_career_stats(
  (SELECT id FROM players WHERE lahman_id = 'aaronha01')
);
```

### 4. Get Draft Board for 1957 Outfielders

```sql
SELECT
  display_name,
  batting_avg,
  home_runs,
  rbi,
  stolen_bases,
  war,
  has_apba_card
FROM v_draft_board
WHERE year = 1957
  AND primary_position = 'OF'
  AND is_qualified_batter = true
ORDER BY war DESC;
```

### 5. Get All Picks in a Draft

```sql
SELECT
  dp.pick_number,
  dp.round,
  dp.pick_in_round,
  dt.team_name,
  p.display_name,
  ps.primary_position,
  ps.war,
  dp.picked_at,
  dp.time_taken_seconds
FROM draft_picks dp
JOIN draft_teams dt ON dp.draft_team_id = dt.id
JOIN players p ON dp.player_id = p.id
JOIN player_seasons ps ON dp.player_season_id = ps.id
WHERE dp.draft_session_id = 'uuid-draft-1'
ORDER BY dp.pick_number;
```

### 6. Get Current Draft Pick Order (Next 5 Picks)

```sql
SELECT
  pick_number,
  team_name,
  draft_order
FROM get_draft_pick_order('uuid-draft-1', 3)
ORDER BY pick_number
LIMIT 5;
```

### 7. Get Play-by-Play for a Game

```sql
SELECT
  event_number,
  inning,
  CASE WHEN is_top_inning THEN 'Top' ELSE 'Bottom' END AS inning_half,
  pb.display_name AS batter,
  pp.display_name AS pitcher,
  dice_total,
  outcome_description,
  runs_scored,
  home_score_after,
  away_score_after
FROM game_events ge
JOIN players pb ON ge.batter_id = pb.id
JOIN players pp ON ge.pitcher_id = pp.id
WHERE ge.game_id = 'uuid-game-1'
ORDER BY event_number;
```

### 8. Get League Standings

```sql
SELECT
  team_name,
  wins,
  losses,
  calculated_win_pct,
  games_back,
  run_differential,
  streak,
  division_rank
FROM v_league_standings
WHERE league_id = 'uuid-league-1'
ORDER BY division_rank;
```

---

## Migration Files

All migrations are in `supabase/migrations/`:

1. `001_create_players.sql` - Players table
2. `002_create_player_seasons.sql` - Player seasons + teams history
3. `003_create_apba_cards.sql` - APBA cards + outcomes
4. `004_create_draft_tables.sql` - Draft system (5 tables)
5. `005_create_game_simulation_tables.sql` - Game simulation (6 tables)
6. `006_create_helper_views.sql` - Views and functions
7. `007_create_rls_policies.sql` - Row Level Security
8. `008_seed_apba_outcomes.sql` - Sample APBA outcome data

**Total:** 8 migration files, 17 tables, 4 views, 3 functions

---

**Last Updated:** 2026-01-27
**Schema Version:** 1.0
**Next Review:** Phase 1.5 (after Lahman import)
