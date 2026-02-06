# Simulation Player Stats Plan

## Problem
League Leaders and Team Stats in StatMaster show **historical** player stats (e.g., Ted Williams' 1941 season) instead of **simulated** stats from the current fantasy season.

## Root Cause
The simulation engine (`statMaster.ts`) only tracks team scores:
- `simulateAtBat()` determines outcomes but doesn't record who did what
- `BoxScore.homeBatting[]` and `awayBatting[]` arrays are defined but never populated
- `GameResult` only stores team scores, not player performance
- No cumulative stat tracking exists

## Solution
Track individual player stats during simulation and display those instead of historical stats.

## Implementation Checklist

### Phase 1: Data Structure for Simulation Stats
- [ ] Create `SimulationStats` type to hold cumulative player stats
- [ ] Add `simulationStats` Map to session/schedule storage
- [ ] Define per-game `PlayerGameStats` population during simulation

### Phase 2: Update Simulation Engine
- [ ] Modify `simulateAtBat()` to track batter and pitcher in outcome
- [ ] Update `simulateGame()` to populate BoxScore player arrays
- [ ] Create function to accumulate game stats into simulation totals
- [ ] Store simulation stats in session

### Phase 3: Update Display Components
- [ ] Modify `LeagueLeaders` to use simulation stats when available
- [ ] Modify `TeamStatsDetail` to show simulation stats
- [ ] Fall back to historical stats if no simulation data exists
- [ ] Show clear indicator of "Simulation Stats" vs "Historical Stats"

### Phase 4: Testing
- [ ] Write tests for stat accumulation logic
- [ ] Write tests for at-bat outcome recording
- [ ] Verify leaders calculation uses sim stats
- [ ] Manual testing of full simulation flow

## Data Structures

### Cumulative Simulation Stats (per player)
```typescript
interface PlayerSimulationStats {
  playerSeasonId: string
  displayName: string
  teamId: string
  gamesPlayed: number

  // Batting
  atBats: number
  hits: number
  doubles: number
  triples: number
  homeRuns: number
  rbi: number
  runs: number
  walks: number
  strikeouts: number
  stolenBases: number

  // Pitching
  inningsPitched: number  // in outs (3 per inning)
  earnedRuns: number
  strikeoutsThrown: number
  walksAllowed: number
  hitsAllowed: number
  wins: number
  losses: number
  saves: number
}

interface SessionSimulationStats {
  playerStats: Map<string, PlayerSimulationStats>
  lastUpdated: Date
}
```

### Storage Location
- Store in `DraftSession.simulationStats` (in-memory during session)
- Could persist to database later if needed

## Files to Modify

### Core Changes
- `src/types/schedule.types.ts` - Add SimulationStats types
- `src/utils/statMaster.ts` - Track player stats during simulation
- `src/stores/draftStore.ts` - Store simulation stats in session

### Display Changes
- `src/utils/leagueLeaders.ts` - Accept simulation stats as source
- `src/components/statmaster/LeagueLeaders.tsx` - Use sim stats
- `src/components/statmaster/TeamStatsDetail.tsx` - Use sim stats

### New Files
- `src/utils/simulationStats.ts` - Helper functions for accumulation
- `tests/simulationStats.test.ts` - TDD tests

## Test Cases (TDD)

1. **At-bat outcome records player stats**
   - Single adds 1 hit, 1 AB to batter
   - Strikeout adds 1 AB, 1 K to batter, 1 K to pitcher
   - Home run adds 1 HR, 1 RBI (+ runners), 1 AB, 1 Hit, 1 Run

2. **Game stats accumulate correctly**
   - Multiple at-bats sum correctly
   - Pitcher stats track opponent outcomes
   - Runs batted in count correctly with runners on base

3. **Season accumulation works**
   - Multiple games add to cumulative totals
   - Games played increments per game
   - Calculated stats (AVG, ERA) compute correctly

4. **League leaders use simulation stats**
   - With sim stats: shows sim leaders
   - Without sim stats: falls back to historical
   - Minimum qualification thresholds apply to sim stats
