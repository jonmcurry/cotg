# StatMaster Stats & MLB-Style Schedule Plan

## Problem Summary

### Issue 1: StatMaster Not Showing Stats
Current StatMaster only displays:
- Basic standings table
- Recent games list

Missing features:
- League leaders (top hitters by AVG, HR, RBI; top pitchers by ERA, W, K)
- Team detail view (click team → see roster stats)
- Individual player stats display

### Issue 2: Schedule Not Balanced
Current schedule generator:
- Uses simple round-robin approach
- Ignores divisions completely
- No series clustering
- No home/away balance consideration

MLB-style scheduling needs:
- Division-heavy games (~52 vs division rivals, ~13 per opponent)
- League games (~66 vs non-division same league)
- Interleague games (~46 spread across other league)
- Series clustering (3-4 game series)
- Home stands and road trips pattern

## Implementation Checklist

### Phase 1: StatMaster League Leaders
- [x] Create LeagueLeaders component
- [x] Add batting leaders section (AVG, HR, RBI, H, R)
- [x] Add pitching leaders section (ERA, W, K, SV, WHIP)
- [x] Display top 5 players per category
- [x] Integrate into StatMaster main view

### Phase 2: StatMaster Team Detail View
- [x] Create TeamStatsDetail component
- [x] Show team's full roster with stats
- [x] Split by position groups (IF, OF, P)
- [x] Add back navigation to main view
- [x] Make team names clickable in standings

### Phase 3: MLB-Style Schedule Generator
- [x] Refactor scheduleGenerator.ts to be division-aware
- [x] Implement division matchups (26 games per division rival for 2-team divisions)
- [x] Implement league matchups (72 games vs non-division same league)
- [x] Implement interleague matchups (64 games vs other league)
- [x] Add series clustering (2-4 game series based on matchup type)
- [x] Balance home/away games
- [x] Add home stand / road trip patterns

### Phase 4: Testing & Validation
- [x] Write tests for league leaders calculation
- [x] Write tests for schedule balance verification
- [x] Verify division game counts
- [x] Verify interleague balance
- [ ] Manual UI testing

## Technical Notes

### League Leaders Data Source
- Player stats stored in `RosterPlayer` type
- Stats available: avg, hr, rbi, runs, hits (batting), era, wins, strikeouts, saves (pitching)
- Need to aggregate across all teams in the session

### Schedule Distribution (162 games)
```
Division games:    52 (13 games × 4 division opponents)
League games:      66 (6-7 games × 10 non-division league opponents)
Interleague games: 44 (3-4 games × ~15 interleague opponents)
Total:            162
```

### Series Format
- Division series: 3-4 games
- League series: 3-4 games
- Interleague series: 3 games

## Test Cases (TDD)

### League Leaders Tests
1. Returns top 5 batters by AVG when more than 5 qualify
2. Returns all batters when fewer than 5 qualify
3. Correctly sorts by each stat category
4. Handles ties correctly
5. Excludes players with 0 at-bats from AVG leaders

### Schedule Balance Tests
1. Each team plays exactly 162 games
2. Each team plays 52 division games (13 per division rival)
3. Each team plays ~66 league games (non-division)
4. Each team plays ~44 interleague games
5. Home/away games are balanced (81 each)
6. No team plays themselves

## Files to Modify/Create

### New Files
- `src/components/statmaster/LeagueLeaders.tsx`
- `src/components/statmaster/TeamStatsDetail.tsx`
- `src/utils/__tests__/scheduleGenerator.test.ts`
- `src/utils/__tests__/leagueLeaders.test.ts`

### Modified Files
- `src/components/statmaster/StatMaster.tsx` - Add leaders and team detail views
- `src/utils/scheduleGenerator.ts` - MLB-style logic
- `src/types/schedule.types.ts` - Add series type if needed
