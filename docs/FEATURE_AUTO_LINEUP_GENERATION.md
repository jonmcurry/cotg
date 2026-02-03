# Feature: Auto-Generate Lineups, Rotation, and Bullpen After Draft

## Overview

When entering the Clubhouse after a draft, all teams automatically get optimal depth charts generated based on roster composition and player stats. Users can still manually edit everything after auto-generation.

## What Gets Auto-Generated

### Lineups (vs RHP and vs LHP)
- **Platoon optimization:** vs RHP lineups favor L/B batters; vs LHP lineups favor R/B batters
- **Position assignment:** Greedy best-fit in scarcity order (C, SS, 2B, 3B, 1B, OF, DH) - scarce positions filled first
- **Batting order heuristic:**
  1. Leadoff: highest OBP
  2. 2-hole: highest OBP remaining
  3. 3-hole: highest OPS
  4. Cleanup: most HRs
  5. 5-hole: highest OPS remaining
  6-9: remaining by APBA rating
- Bench players can start over drafted starters if they have better platoon matchups

### Starting Rotation
- All 4 drafted SPs assigned to SP1-SP4
- Sorted by APBA rating descending (best ace = SP1)
- SP5 slot left empty (roster only has 4 SPs)

### Bullpen
- CL-drafted player assigned as closer
- All 3 RP-drafted players assigned as setup men
- Setup men sorted by ERA ascending (best first)

## Implementation

### Algorithm Details
- **Platoon scoring:** base score (APBA rating) multiplied by handedness bonus (1.15x for advantaged hand, 1.10x for switch)
- **Position eligibility:** Uses existing `POSITION_ELIGIBILITY` mapping from draft types
- **Skips teams with existing depth charts** - only generates for teams without lineup data

## Files Created/Modified
- [x] `src/utils/autoLineup.ts` - Pure utility: `generateOptimalDepthChart(team, players) -> TeamDepthChart`
- [x] `src/components/clubhouse/Clubhouse.tsx` - Calls auto-generation after player data loads

## Verification
- `npm run build` compiles without errors
- Complete a draft and enter Clubhouse - all teams should have pre-filled lineups, rotation, and bullpen
- Manual editing still works after auto-generation
