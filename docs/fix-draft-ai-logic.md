# Plan: Fix Draft AI Player Selection Logic

## Problem
The Draft AI recently selected Aroldis Chapman (a Closer) with the first overall pick. This is strategically unsound for a baseball draft, where high-volume Starting Pitchers and elite Position Players are significantly more valuable than Relievers.

## Analysis
The current algorithm selects "Best Player Available" based on `apba_rating` * `scarcity_weight`.
- **Issue 1**: `CL` (Closing Pitcher) has a high scarcity weight (1.3), higher than `SP` (1.2).
- **Issue 2**: There is no "Volume" weighting. A 99-rated Closer (60 innings) scores higher than a 95-rated Ace (220 innings).
- **Issue 3**: In Rounds 1-5, scarcity is damped (0.8x), but `CL` (1.04) still outranks `SP` (0.96).

## User Draft Strategy
- **Early Rounds (1-5)**: Focus on acquiring high-quality hitters.
- **Positional Need**: Target premium defensive positions (C, SS, CF) early to avoid weak replacements.
- **Pitching Depth**: Build a deep pitching staff with high-upside players in the middle-to-late rounds.

## Solution Plan

### 1. Adjust Position Scarcity Weights
Reflect the strategy by boosting premium defensive positions and slightly lowering Pitchers relative to Hitters to ensure Hitters go first.

**New Weights:**
- **Catchers (C)**: 1.5 (Highest Priority - Premium Defense)
- **Shortstops (SS)**: 1.4 (Premium Defense)
- **Center Field/OF**: 1.3
- **2B / 3B**: 1.2
- **First Base (1B)**: 1.1
- **Starters (SP)**: 1.15 (Balanced - Aces will still rise due to volume bonus, but avg SPs wait)
- **Relievers (RP)**: 0.6 (Devalued)
- **Closers (CL)**: 0.8 (Devalued)

### 2. Implement "Volume" Weighting
Add a multiplier based on playing time. A high rating is only valuable if the player is on the field.

- **Pitchers**:
    - **Workhorse Bonus**: > 200 innings = **1.2x** multiplier (Pushes Aces back into Round 1 contention)
    - **Solid Starter**: > 150 innings = **1.1x** multiplier
    - **Low Volume Penalty**: < 60 innings = **0.8x** multiplier
- **Position Players**:
    - **Everyday Bonus**: > 450 AB = **1.1x** multiplier



### 3. Expected Result
- **Aroldis Chapman (CL)**: Rating 95 * Scarcity 0.8 * Volume 0.85 ≈ **64.6 Score**
- **Walter Johnson (SP)**: Rating 95 * Scarcity 1.6 * Volume 1.2 ≈ **182.4 Score**

This ensures Workhorse Aces are drafted first, while Closers drop to the middle/late rounds where they belong.
