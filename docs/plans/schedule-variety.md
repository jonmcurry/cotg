# Schedule Variety Fix

## Problem
Teams are playing each other in consecutive series (e.g., Charlotte Grizzlies vs Asheville Ospreys 3 games in a row, then another series immediately after).

Looking at the Recent Results screenshot:
- Charlotte Grizzlies vs Asheville Ospreys: 3 consecutive games (same matchup)
- Wichita Pioneers vs Savannah Bison: 3 consecutive games (same matchup)
- Providence Vipers vs Spokane Wildcats: 3 consecutive games (same matchup)

## Root Cause
In `scheduleGenerator.ts`, the `shuffleArray()` function randomly shuffles all series but doesn't prevent:
1. Back-to-back series between the same two teams
2. A team playing the same opponent too frequently in a short time window

## Requirements
1. No back-to-back series between the same two teams
2. Minimum spacing between series of the same matchup (at least 3 series gap)
3. A team should not face the same opponent more than once per "week" (7-day period)
4. Maintain league-appropriate scheduling (division games more frequent, interleague games spread out)

## Solution Approach
Replace simple `shuffleArray()` with a smarter scheduling algorithm:

### Algorithm: Constraint-Based Series Ordering
1. Start with all series in a pool
2. For each slot in the schedule:
   - Filter series that DON'T violate constraints:
     - Team A and Team B haven't played in the last N series (N=3)
     - Neither team has a game scheduled yet for this "day"
   - Pick one valid series randomly from filtered pool
   - If no valid series exists, pick least-bad option (longest gap since last matchup)
3. Repeat until all series are scheduled

## TDD Test Cases
1. **No back-to-back same matchup**: Two series between teams A and B should never be consecutive
2. **Minimum matchup gap**: At least 3 other series between repeat matchups of same teams
3. **Team variety**: A team's schedule should not have the same opponent appear more than 2 times in any 10-game window
4. **All series scheduled**: Algorithm should successfully schedule all series

## Files to Modify
- `src/utils/scheduleGenerator.ts` - Replace shuffle with constraint-based ordering

## Checklist
- [ ] Write TDD tests for schedule variety constraints
- [ ] Implement constraint-based series ordering
- [ ] Verify existing schedule tests still pass
- [ ] Test with 8, 12, and 16 team leagues
- [ ] Update CHANGELOG.md
- [ ] Commit to GitHub
