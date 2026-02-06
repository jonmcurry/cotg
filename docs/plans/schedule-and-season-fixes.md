# Schedule and Season Fixes Plan

## Issues to Fix

### Issue 1: Schedule - All Teams Must Play Daily
- **Problem**: Only 7 teams play per week, teams play same opponent 3 games in a row
- **Expected**: All teams play every day, play different opponent next day
- **Current**: 3-game series format where teams play same opponent for 3 consecutive games

### Issue 2: Add "Sim Season" Button
- **Problem**: Only "Sim Day" and "Sim Week" options exist
- **Expected**: Add "Sim Season" that simulates the entire remaining season

### Issue 3: Season Reset Functionality
- **Problem**: No way to restart season after completion
- **Expected**: Reset stats, standings, schedule without redrafting

## Tasks

### Issue 1: Schedule Fix - COMPLETED
- [x] Write tests for daily matchup requirements
- [x] Modify schedule generator to ensure all teams play daily
- [x] Ensure no team plays same opponent on consecutive days
- [x] Verify 8-team league = 4 games per day (all teams playing)

**Solution**: Implemented `generateDailySchedule()` using the "circle method" round-robin algorithm:
- All teams play every day (n/2 games per day for n teams)
- Circle rotation naturally prevents consecutive same-opponent games
- Home/away balance tracked per matchup and globally

### Issue 2: Sim Season - COMPLETED
- [x] Write tests for sim season functionality
- [x] Add "Sim Season" button to StatMaster UI
- [x] Implement simulateSeason function
- [x] Show progress during simulation (updates every 50 games)

### Issue 3: Season Reset - COMPLETED
- [x] Write tests for season reset
- [x] Add "Reset Season" button (visible after season complete)
- [x] Implement resetSeason function (clear stats, regenerate schedule)
- [x] Preserve teams and rosters

## Files Modified
- `src/utils/scheduleGenerator.ts` - Complete rewrite to daily format
- `src/components/statmaster/StatMaster.tsx` - Added Sim Season and Reset Season buttons
- `tests/scheduleAndSeason.test.ts` - TDD tests for all features
