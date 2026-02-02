# SRD: StatMaster Season Workflow

## Overview
StatMaster is the end-to-end season management and simulation suite for Century of the Game. It enables users to take their drafted rosters through a full 162-game season, managing depth charts, generating schedules, and simulating games based on realistic player performance probabilities.

## 1. Clubhouse Workflow (The Transition)
After the draft is completed, teams enter the **Clubhouse**. The user must finalize their team setup before the season can begin.

### Requirements:
- **Depth Chart Management**: Users must set lineups vs RHP and vs LHP (9 slots including DH).
- **Pitching Staff Management**: Users must set a 5-man rotation, closer, and setup men.
- **Schedule Generation**: A "Generate Schedule" action that produces a balanced 162-game MLB-style schedule.
- **Hand-off**: Once the schedule exists, a "Start Season" action navigates the user to the StatMaster Dashboard.

## 2. Schedule Generator
**File**: `src/utils/scheduleGenerator.ts`

### Logic:
- **Balanced Matchups**: Every team plays every other team an equal number of times.
- **Series-Based**: Games are grouped into 2-4 game series.
- **Home/Away**: Each team plays 81 home and 81 away games.
- **All-Star Break**: A 3-day gap at the season midpoint (around game 81).
- **Date Calculation**: Sequence of dates starting from an arbitrary season start, including travel days and off days.

## 3. StatMaster Simulation Engine
**File**: `src/utils/statMaster.ts`

### Simulation Logic:
- **Probability-Based**: Uses player metrics (AVG, OBP, SLG, ERA) to determine at-bat outcomes.
- **At-Bat Scale**: Simulates pitch-by-pitch or at-bat by at-bat to arrive at a line score.
- **Outcome Types**: Single, Double, Triple, HR, Walk, Strikeout, Ground-out/Fly-out.
- **Runner Advancement**: Logical base-running (force outs, tagging up, advancing on hits).
- **Pitching Influence**: Pitcher ERA acts as a multiplier on batting success probabilities.

### Input Requirements:
- `DraftTeam` data (Rosters & Depth Charts).
- `PlayerSeason` data (Core stats from the 1900-2023 database).
- `ScheduledGame` data (Who is home/away).

## 4. StatMaster UI (The Dashboard)
**File**: `src/components/statmaster/StatMaster.tsx`

### Interface Components:
- **Standings Table**: W/L, PCT, Games Back, Run Diff.
- **Next Game Preview**: Matchup details and records.
- **Recent Results**: Line scores from previous simulations.
- **Control Panel**: 
  - "Sim Next Game": Execute a single game simulation.
  - "Sim Week": Batch simulation of 6-7 games.
  - "Sim to End": (Optional) Fast-forward to season completion.

## 5. Persistence & Data Storage
Currently, season progress is stored in the `DraftState` store (Zustand) and persisted to `localStorage`.

### Future Requirements (Supabase Integration):
- **Table: `season_games`**: Store results, scores, and winning/losing pitchers.
- **Table: `season_player_stats`**: Aggregate hits, HRs, RBIs, Wins, Losses, etc., for every player across the season.
- **Table: `season_standings`**: Snapshots of W/L for faster league leaderboards.

## 6. Implementation Checklist
- [x] **Store Extensions**: Added `updateTeamDepthChart` and `generateSeasonSchedule`.
- [x] **Clubhouse UI**: Implemented Lineup and Rotation editors.
- [x] **Schedule Engine**: Created the 162-game generation logic.
- [x] **Simulation Core**: Created `simulateGame` and `simulateGames`.
- [x] **StatMaster Dashboard**: Initial UI for simulating and viewing results.
- [ ] **Box Score Detail**: Expand `BoxScore` to track individual player hitting/pitching stats per game.
- [ ] **Cumulative Stats**: Implement the `PlayerSeasonStats` accumulator to show league leaders.
- [ ] **StatMaster Polish**: Better animations for simming (e.g., ticker tape or flashing results).
- [ ] **Season Persistence**: Hook up `saveSession` to ensure schedule results are saved to Supabase.
