# Game Simulation Engine Analysis & APBA Comparison

## Current Simulation Problems

### Problem 1: Extra Base Hit Rate Formula is Mathematically Wrong

**Current Code (line 537):**
```typescript
const extraBaseRate = (sluggingPct - battingAvg) / battingAvg
```

**Example - Josh Gibson's Stats:**
- Batting Avg: .350
- Slugging: .648

**Calculation:**
- extraBaseRate = (0.648 - 0.350) / 0.350 = **0.851** (85%!)
- homeRunRate = 0.851 * 0.4 = 0.340 (34% of hits are HRs)
- doubleRate = 0.851 * 0.5 = 0.426 (43% of hits are doubles)
- tripleRate = 0.851 * 0.1 = 0.085 (9% of hits are triples)
- singleRate = 1 - (0.340 + 0.426 + 0.085) = **13% singles**

**Reality:**
Even for the best power hitters, the distribution should be:
- ~65-70% singles
- ~20-25% doubles
- ~5-8% triples
- ~8-12% home runs

**This is why Barry Bonds leads with 134 HRs** - the formula generates way too many home runs!

### Problem 2: No Individual Player Strikeout Rates

**Current Code (line 566):**
```typescript
if (Math.random() < 0.20) {
    return { type: 'strikeout', runsScored: 0, rbis: 0 }
}
```

This gives EVERY player a 20% strikeout rate on outs. In reality:
- Contact hitters: 5-10% of PA
- Average hitters: 15-20% of PA
- Power hitters: 25-35% of PA

### Problem 3: No Stolen Bases Simulation

The current engine never simulates stolen bases. They're always 0.

### Problem 4: Pitcher Stats Only Use ERA

The pitcher's effectiveness only modifies batting averages by ERA. It doesn't consider:
- Strikeout rate (K/9)
- Walk rate (BB/9)
- Home run rate (HR/9)

---

## How APBA Works (Reverse Engineered)

APBA Baseball uses a **card-based probability system**:

### 1. Player Cards with Outcome Tables

Each player has a "card" with 78 possible outcomes (6 dice faces x 13 columns):
- **Numbers 1-78** correspond to specific outcomes
- Better hitters have more favorable outcomes in the hit range
- Power hitters have more "3" (home run) results
- Contact hitters have more "1" (single) results

### 2. Grades System (A-E)

APBA converts real stats into grades:
- **Hitting Grade**: Based on OPS and run production
- **Power Grade**: Based on ISO (Isolated Power)
- **Speed Grade**: Based on stolen bases and triples
- **Fielding Grade**: Based on fielding percentage and range

### 3. Dice Roll Tables

When a batter faces a pitcher:
1. Roll 2 dice to get a number 2-12
2. Look up that number on the batter's card
3. If the result is an "X" (rare outcome), roll again on the pitcher's card
4. Apply situational modifiers (runners on, outs, etc.)

### 4. Pitcher Card Effects

Pitchers have their own cards that modify outcomes:
- Better pitchers have more "strikeout" and "out" results
- Wild pitchers have more "walk" results
- The batter vs. pitcher matchup creates realistic outcomes

---

## Recommended Fixes

### Fix 1: Calculate Hit Type Distribution from Real Stats

```typescript
function calculateHitDistribution(player: PlayerSeason): {
    singleRate: number
    doubleRate: number
    tripleRate: number
    homeRunRate: number
} {
    const atBats = player.at_bats || 1
    const hits = player.hits || 0
    const doubles = player.doubles || 0
    const triples = player.triples || 0
    const homeRuns = player.home_runs || 0

    // Use ACTUAL hit type distribution
    if (hits > 0) {
        const singles = hits - doubles - triples - homeRuns
        return {
            singleRate: singles / hits,
            doubleRate: doubles / hits,
            tripleRate: triples / hits,
            homeRunRate: homeRuns / hits
        }
    }

    // Fallback for missing data
    return {
        singleRate: 0.70,
        doubleRate: 0.20,
        tripleRate: 0.03,
        homeRunRate: 0.07
    }
}
```

### Fix 2: Use Player-Specific Strikeout Rate

```typescript
function calculateStrikeoutRate(batter: PlayerSeason | null, pitcher: PlayerSeason | null): number {
    // Batter's strikeout tendency (K/PA)
    const batterK = batter?.strikeouts || 0
    const batterPA = (batter?.at_bats || 0) + (batter?.walks || 0)
    const batterKRate = batterPA > 0 ? batterK / batterPA : 0.15

    // Pitcher's strikeout ability (K/9)
    const pitcherKRate = pitcher?.strikeouts_per_9 || 6.0
    const pitcherKModifier = pitcherKRate / 9.0 // Normalized

    // Combined: batter's tendency * pitcher's ability
    return Math.min(0.40, Math.max(0.05, batterKRate * (1 + (pitcherKModifier - 0.67))))
}
```

### Fix 3: Add Walk Rate from Player Data

```typescript
function calculateWalkRate(batter: PlayerSeason | null, pitcher: PlayerSeason | null): number {
    // Batter's walk tendency (BB/PA)
    const batterBB = batter?.walks || 0
    const batterPA = (batter?.at_bats || 0) + (batter?.walks || 0)
    const batterBBRate = batterPA > 0 ? batterBB / batterPA : 0.08

    // Pitcher's walk tendency (BB/9)
    const pitcherBBRate = pitcher?.walks_per_9 || 3.0
    const pitcherBBModifier = pitcherBBRate / 9.0

    // Combined
    return Math.min(0.20, Math.max(0.02, batterBBRate * (1 + (pitcherBBModifier - 0.33))))
}
```

### Fix 4: Better Pitcher Impact

Instead of just ERA modifier, use multiple pitcher stats:

```typescript
function getPitcherModifiers(pitcher: PlayerSeason | null): {
    hitModifier: number      // Affects hit probability
    powerModifier: number    // Affects extra base hit rate
    strikeoutModifier: number
    walkModifier: number
} {
    if (!pitcher) {
        return { hitModifier: 1.0, powerModifier: 1.0, strikeoutModifier: 1.0, walkModifier: 1.0 }
    }

    const era = pitcher.era || 4.50
    const whip = pitcher.whip || 1.30
    const k9 = pitcher.strikeouts_per_9 || 6.0
    const hr9 = pitcher.home_runs_per_9 || 1.0

    return {
        hitModifier: Math.max(0.7, Math.min(1.3, whip / 1.30)),
        powerModifier: Math.max(0.5, Math.min(1.5, hr9 / 1.0)),
        strikeoutModifier: Math.max(0.5, Math.min(2.0, k9 / 6.0)),
        walkModifier: Math.max(0.7, Math.min(1.5, (pitcher.walks_per_9 || 3.0) / 3.0))
    }
}
```

### Fix 5: Add Stolen Base Simulation

```typescript
function shouldAttemptSteal(
    runner: PlayerSeason | null,
    baseIndex: number, // 0 = first, 1 = second
    outs: number,
    pitcherHoldRating: number = 1.0
): boolean {
    if (!runner || baseIndex > 1) return false // Can't steal from third

    const sbAttemptRate = runner.stolen_base_attempts_per_game || 0.1
    const sbSuccessRate = runner.stolen_base_pct || 0.70

    // Only attempt if success rate > 67% (break-even point)
    if (sbSuccessRate < 0.67) return false

    // Attempt based on player's historical rate
    return Math.random() < (sbAttemptRate / 10) * pitcherHoldRating
}

function simulateSteal(runner: PlayerSeason, catcher: PlayerSeason | null): boolean {
    const runnerSpeed = runner.stolen_base_pct || 0.70
    const catcherArm = catcher?.caught_stealing_pct || 0.30

    const successChance = runnerSpeed * (1 - catcherArm * 0.3)
    return Math.random() < successChance
}
```

---

## Implementation Priority

1. **CRITICAL: Fix hit type distribution** - DONE (2026-02-06)
   - Implemented `calculateHitDistribution()` using actual player hit breakdown
   - TDD tests in tests/hitDistribution.test.ts
2. **HIGH: Add player-specific strikeout rates** - DONE (2026-02-06)
   - Implemented `calculateStrikeoutRate()` using batter K% and pitcher K/9
   - Replaces fixed 20% with player-specific rates (5% to 40%)
3. **MEDIUM: Improve pitcher impact** - Better matchup dynamics (TODO)
4. **MEDIUM: Add stolen bases** - Currently always 0 (TODO)
5. **LOW: Add platoon splits** - L/R matchup effects (TODO)

---

## Data Requirements

The current `PlayerSeason` type should have these fields (verify they exist):
- `doubles`, `triples`, `home_runs` - For hit distribution
- `strikeouts` - For K rate
- `walks` - For BB rate
- `stolen_bases`, `caught_stealing` - For SB simulation
- `strikeouts_pitched`, `walks_pitched`, `innings_pitched` - For pitcher rates

If any are missing from the database, we need to add them or calculate defaults.

---

## Expected Results After Fix

For a .350/.450/.648 hitter like Josh Gibson:
- **Current**: 134 HRs, .350 AVG (inflated)
- **Fixed**: ~40-50 HRs, .350 AVG (realistic)

The simulation should produce stats that roughly match the historical player's actual performance, not wildly inflated numbers.
