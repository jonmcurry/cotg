# League System, All-Star Game, and Persistent Leagues

## Status: Implemented

## Overview

Added a "Create League" screen as the entry point to the full workflow, persistent leagues via Supabase, and an All-Star Game during the mid-season break.

## Changes

### New Files
- `src/types/league.types.ts` - League type definitions (LeagueConfig, League, LeagueStatus, PlayoffFormat)
- `src/stores/leagueStore.ts` - Zustand store with Supabase persistence (createLeague, loadAllLeagues, loadLeague, deleteLeague, updateLeagueStatus, linkDraftSession)
- `src/components/league/LeagueSetup.tsx` - League creation form (name, games/season, playoff format)
- `src/components/league/LeagueList.tsx` - Browse/resume/delete saved leagues
- `src/utils/allStarGame.ts` - All-Star roster selection and game simulation
- `supabase/migrations/20260202_add_league_columns.sql` - Adds `draft_session_id` column to leagues table

### Modified Files
- `src/App.tsx` - New workflow: Home -> LeagueSetup -> DraftConfig -> Draft -> Clubhouse -> StatMaster
- `src/components/draft/DraftConfig.tsx` - Accepts league context (pre-fills team count, shows league name)
- `src/components/statmaster/StatMaster.tsx` - All-Star Game detection, UI, and simulation; uses shared transformPlayerSeasonData
- `src/types/schedule.types.ts` - Added `isAllStarGame` field to ScheduledGame
- `src/utils/scheduleGenerator.ts` - Inserts All-Star Game during break; excludes ASG from standings
- `src/utils/statMaster.ts` - simulateGames skips All-Star Game entries

## Workflow

1. Home screen: "Create New League" or "Load League"
2. League Setup: Configure name, games per season, playoff format
3. Draft Config: Configure teams, seasons, draft order (pre-filled from league)
4. Draft: Snake draft with CPU AI
5. Clubhouse: Set lineups, rotation, bullpen
6. StatMaster: Simulate season with All-Star Game at midpoint

## All-Star Game

- Appears at ~50% of the season schedule
- Teams split into "Stars" vs "Legends" (odd/even draft position)
- Hitters selected by OPS, pitchers by ERA
- Simulated with squad-level probabilities
- Result does NOT affect standings
- Special gradient UI in StatMaster

## Database Migration

The `leagues` table already existed. Migration adds:
- `draft_session_id UUID REFERENCES draft_sessions(id)`
- Updated `season_year` constraint to include 2026
