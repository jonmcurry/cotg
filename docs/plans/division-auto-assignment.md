# Auto Division Assignment Plan

## Problem
Teams are displayed as a flat list in StatMaster standings without division organization.

## Requirements
- AL: East, West, North, South
- NL: East, West, North, South
- 8 divisions total (4 per league)
- Auto-assign teams evenly when creating the draft

## Current State
- `DraftTeam` type: No division/league field
- `TeamStanding` type: No division field
- `StatMaster`: Single flat standings table
- Database `league_teams`: Already has division/conference columns

## Implementation Plan

### Phase 1: Add Division Fields to Types
- [x] Add `division` and `league` to `DraftTeam` interface
- [x] Add `division` and `league` to `TeamStanding` interface

### Phase 2: Auto-Assign Divisions on Draft Creation
- [x] Create utility function `assignDivisions(numTeams: number): { league: string, division: string }[]`
- [x] Call during `createSession` in draftStore
- [x] Division assignment rules:
  - Teams 1 to N/2 = AL
  - Teams N/2+1 to N = NL
  - Within each league, divide into 4 divisions (East, West, North, South)

### Phase 3: Update StatMaster Standings Display
- [x] Group standings by league (AL/NL tabs or sections)
- [x] Within each league, show 4 division tables
- [x] Calculate Games Back per division (not global)

### Phase 4: Update Schedule Generator (optional)
- [ ] Division games weighted more heavily
- [ ] Interleague play for AL vs NL

## Division Assignment Algorithm
```
For N teams:
  AL teams = first N/2 teams (by draft position)
  NL teams = remaining N/2 teams

  Each league has 4 divisions:
    teamsPerDivision = (N/2) / 4

  AL East = AL teams 1 to teamsPerDivision
  AL West = AL teams teamsPerDivision+1 to 2*teamsPerDivision
  AL North = AL teams 2*teamsPerDivision+1 to 3*teamsPerDivision
  AL South = AL teams 3*teamsPerDivision+1 to 4*teamsPerDivision

  (Same pattern for NL)
```

## Example: 32 Teams
- 16 AL, 16 NL
- 4 teams per division
- AL East: Teams 1-4, AL West: 5-8, AL North: 9-12, AL South: 13-16
- NL East: Teams 17-20, NL West: 21-24, NL North: 25-28, NL South: 29-32

## Test Cases
1. 32 teams -> 8 divisions, 4 teams each
2. 16 teams -> 8 divisions, 2 teams each
3. 8 teams -> 8 divisions, 1 team each
4. Odd number teams -> distribute as evenly as possible
