# APBA for Windows v3.0 Reverse Engineering

## Goal
Understand how APBA calculates player stats for game simulations to improve our own simulation engine.

## Current Issues in Our Simulation
- [ ] Barry Bonds with 134 HRs (unrealistic)
- [ ] Pitchers showing 0 wins/saves (stats not tracking)
- [ ] Hit distribution formula was producing 85% XBH rate

## APBA File Analysis

### Directory Structure
```
C:\dosgames\shared\BBW\
├── TABLES/          - Outcome probability tables
│   ├── B3EHMSG.TBL  - Outcome messages (text descriptions)
│   ├── B3EHNUM.TBL  - Outcome numbers/probabilities
│   └── ...
├── 1971S.WDD/       - 1971 Season data
│   ├── PLAYERS.DAT  - Player card data
│   ├── NSTAT.DAT    - Batting statistics
│   ├── PSTAT.DAT    - Pitching statistics
│   └── ...
└── ...
```

### Key Findings

#### PLAYERS.DAT Structure
- Player records contain:
  - Player name (ASCII)
  - Position info (OF, 1B, 2B, SS, etc.)
  - Batting hand (R/L)
  - Outcome number arrays (bytes 0x40-0x60)

#### Outcome Table System
- APBA uses indexed outcome tables
- Player cards reference specific outcomes
- Dice rolls determine which outcome is triggered
- Different tables for different situations (runners on, outs, etc.)

## Tasks
- [x] Explore directory structure
- [x] Examine TABLES directory
- [x] Look at PLAYERS.DAT binary format
- [x] Decode player card number arrays
- [x] Map card numbers to outcome probabilities
- [x] Understand how batter vs pitcher matchups work
- [x] Document the complete simulation algorithm
- [x] Implement improvements to our statMaster.ts

## Key APBA Insights Applied

### Outcome Probability System
APBA calculates outcomes **per at-bat**, not per hit. This is critical because:
- HR rate should be `HRs / ABs`, not `HRs / hits`
- The old formula inflated HR rates by 50%+ for power hitters

### Pitcher Impact
APBA pitchers affect outcomes subtly, not dramatically:
- A pitcher with bad ERA doesn't give batters a 30% boost
- Real impact is more like 5% modifier at most

### Fixes Applied to statMaster.ts

1. **simulateAtBat**: Rewrote to use per-AB probabilities (APBA-style)
   - HR rate: `Math.min(0.10, homeRuns / atBats)` instead of `homeRuns / hits`
   - ERA modifier: +/- 5% max instead of +/- 30%
   - Outcome order: Walk -> Strikeout -> HR -> Triple -> Double -> Single -> Out

2. **GameResult pitcher IDs**: Fixed bug where pitcher IDs didn't match boxScore
   - Now uses `boxScore.homePitching[0]?.playerSeasonId` for consistency
   - This ensures accumulateBoxScore can find and update pitcher wins/losses

## Test Results
All hit distribution tests pass:
- Power hitter HR rate: 22.9% (was 34% with old bug)
- Power hitter single rate: 60.6% (was ~15% with old bug)
- All rates sum to ~1.0
- Strikeout rates respond to pitcher K/9
