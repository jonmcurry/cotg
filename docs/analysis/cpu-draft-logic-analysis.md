# CPU Draft Logic Analysis - Reverse Engineering APBA & Bill James

## Executive Summary

This document analyzes the current CPU draft logic in Century of the Game and compares it with mechanics found in APBA Baseball for Windows 3.0 (WINDRAFT.EXE) and Bill James Encyclopedia evaluation methodologies.

### Current Implementation Status: **GOOD** ✓

The existing CPU draft logic is well-designed and aligns with industry best practices from both APBA and Bill James methodologies. Minor enhancements are possible but not critical.

---

## Current CPU Draft Implementation

### Algorithm Overview
[Source: cpuDraftLogic.ts](../../src/utils/cpuDraftLogic.ts)

```
1. Identify unfilled required positions
2. Weight positions by scarcity (C, SS weighted higher)
3. Find top 3-5 players at needed positions by APBA Rating
4. Apply randomization factor (±10% rating weight)
5. Select highest weighted player
```

### Position Scarcity Weights
```typescript
const POSITION_SCARCITY: Record<PositionCode, number> = {
  'C': 1.5,   // Catchers are scarce
  'SS': 1.4,  // Premium shortstops are scarce
  '1B': 1.0,
  '2B': 1.1,
  '3B': 1.1,
  'OF': 0.9,  // Lots of outfielders
  'SP': 1.2,  // Starting pitchers are important
  'RP': 0.8,
  'CL': 1.3,  // Elite closers are scarce
  'DH': 0.7,  // Can be any position
  'BN': 0.5,  // Bench - least priority
}
```

### Scoring Formula
```typescript
score = apba_rating × position_scarcity_weight × randomization_factor
// where randomization_factor = 1 ± 10% random variance
```

### Selection Method
- Scores all candidates
- Sorts by score descending
- Takes top 5 candidates
- Randomly selects from top 5 (adds unpredictability)

---

## APBA Baseball for Windows 3.0 - Reverse Engineering

### Discovery Summary

**WINDRAFT.EXE** (June 13, 1995, 1.3 MB)
- Primary drafting application for APBA BBW
- Windows 3.0 protected mode executable
- Includes dedicated help documentation (WINDRAFT.HLP, 498 KB)

### AI Manager Decision Systems

Found **4 complete AI manager personalities** with decision-making logic:
1. Cap Spalding
2. Duke Robinson
3. Johnny McCoy
4. Larry Pepper

Each manager has 4 files totaling ~360-380 KB:
- **.DCT** (51-52 KB) - Dictionary/decision tables
- **.LIB** (242-243 KB) - Strategic rules and logic library
- **.MOB** (54-57 KB) - Behavioral patterns/mobilities
- **.MSY** (24-26 KB) - Manager strategy system

### Manager AI Logic Components

The .LIB and .DCT files contain extensive rules for:
- **Pitcher selection and substitution strategies**
- **Relief pitcher evaluation** (ratings, durability, pitcher vs. batter matchups)
- **Batting order optimization** and pinch-hitting decisions
- **Defensive substitutions** and player repositioning
- **Stealing and running strategies**
- **Game situation analysis** (pressure situations, leads, deficits)
- **Decision trees** for various game scenarios

### Key Insights for Drafting

**Position-Based Evaluation:**
- APBA uses position-specific needs assessment
- Considers platoon advantages (LH/RH splits)
- Evaluates bench strength for depth

**Player Attributes Considered:**
- Primary rating (offensive/pitching performance)
- Defensive capabilities by position
- Platoon splits (vs LH/RH pitchers)
- Durability and injury risk
- Game situation specialization (clutch, base-running)

**Strategic Priorities:**
- Balance between "best available" and "positional need"
- Depth chart considerations
- Complementary skills (power vs. contact, starters vs. relief)

### What APBA Does NOT Have

❌ **No explicit draft system** - WINDRAFT.EXE is for "Advanced Draft" which appears to be for setting up custom leagues/seasons, not an AI-driven draft opponent
❌ **No AI draft opponent logic files found** - The manager AI is for in-game decisions, not draft strategy
❌ **No position scarcity weighting system found** in accessible files

---

## Bill James Encyclopedia - Player Evaluation Methodologies

### Discovery Summary

**Bill James Encyclopedia for Windows v1.20**
- 14,000+ players (1876-1994 coverage)
- Comprehensive statistical database
- Formula documentation: [BILL_JAMES_FORMULAS.md](C:\dosgames\shared\BJEBEW\docs\BILL_JAMES_FORMULAS.md)

### Evaluation Metrics Hierarchy

#### **Tier 1: Core Offensive Metrics** (Already in Database)
1. **Runs Created (RC)** - Estimates runs a player contributed
   - Basic: RC = (H + BB) × TB / (AB + BB)
   - Advanced: More complex with HBP, CS, GIDP factors

2. **Isolated Power (ISO)** - Raw power measurement
   - ISO = SLG - AVG = (TB - H) / AB

3. **On-Base Plus Slugging (OPS)** - Combined offensive value
   - OPS = OBP + SLG

**Status:** ✓ All three are in database and used in APBA rating calculation

#### **Tier 2: Advanced Offensive Metrics** (Not Currently Used)
4. **Secondary Average (SecA)** - Offense beyond batting average
   - SecA = (BB + TB - H + SB - CS) / AB

5. **Power/Speed Number** - Identifies 5-tool players
   - P/S = 2 × (HR × SB) / (HR + SB)

**Status:** ❌ Not in database, but data available to calculate

#### **Tier 3: Defensive Metrics** (Not in Current System)
6. **Range Factor** - Defensive plays per 9 innings
   - RF = (PO + A) × 9 / Innings

**Status:** ❌ Not used in current rating system (per user requirement: "strictly offensive rating")

#### **Tier 4: Pitching Metrics** (Partially Used)
7. **Component ERA (CERA)** - Defense-independent pitching
   - Based on H, HR, BB allowed

8. **Game Score** - Per-game pitching performance
   - Start at 50, +1 per out, +2 per inning after 4th, +1 per K, -2 per hit, etc.

**Status:** ⚠️ Not explicitly used, but ERA and WHIP are in rating calculation

#### **Tier 5: Complex Career Analysis** (Not Applicable to Draft)
9. **Win Shares** - Multi-step value distribution algorithm
10. **Peak Years Identification** - Best consecutive periods
11. **Career Trajectory** - WAR/RC by age curves
12. **Similarity Scores** - Compare players across eras

**Status:** ❌ Not needed for draft (single-season focus)

### Team Building Principles from Bill James

From the documentation and README:

1. **Era Adjustment** - Stats must be normalized for historical context
   - Different offensive environments (dead-ball era vs. steroid era)
   - Park factors
   - League averages

2. **Position-Specific Evaluation** - Meaningful comparisons require position context
   - Shortstops expected to hit less than first basemen
   - Catchers valued for defense and game-calling

3. **Minimum Criteria** - Avoid meaningless outliers
   - Require minimum plate appearances
   - Require minimum innings pitched

4. **Balanced Team Construction**
   - Mix of power and contact hitters
   - Speed and defense
   - Starting pitching depth
   - Bullpen specialization

---

## Comparison: Current Implementation vs. Industry Standards

| Feature | Current CPU Draft | APBA BBW | Bill James | Assessment |
|---------|-------------------|----------|------------|------------|
| **Position Scarcity** | ✓ Weighted (C: 1.5, SS: 1.4, CL: 1.3) | Unknown (no draft AI found) | Implicit in evaluation | ✓ Good |
| **APBA Rating** | ✓ Primary metric (OPS, RC, ISO average) | ✓ Used in game | ✓ RC and ISO used | ✓ Excellent |
| **Randomization** | ✓ ±10% variance, top-5 selection | ✓ Manager personalities vary | N/A | ✓ Good (adds realism) |
| **Best Available vs. Need** | ✓ Position need prioritized, then BPA | ✓ Manager AI considers both | ✓ Team balance principle | ✓ Good |
| **Platoon Splits** | ❌ Not considered | ✓ LH/RH matchups in game | ✓ Acknowledged | ⚠️ Enhancement opportunity |
| **Depth Chart** | ✓ Roster requirements checked | ✓ Bench strength evaluated | ✓ Team balance | ✓ Good |
| **Player Type Balance** | ❌ Not explicitly tracked | ✓ Power/speed/contact mix | ✓ P/S Number, SecA | ⚠️ Enhancement opportunity |
| **Era Normalization** | ✓ Using single rating metric | N/A (single-season game) | ✓ Critical for career stats | ✓ Adequate (draft single-season) |

---

## Strengths of Current Implementation

### 1. **Solid Foundation** ✓
- Position scarcity weighting aligns with baseball reality
- APBA rating is a well-designed composite metric
- Randomization prevents predictable drafts

### 2. **Performance** ✓
- Fast execution after recent optimizations
- Efficient filtering and scoring

### 3. **Realistic Behavior** ✓
- CPUs fill positional needs first
- Then draft best available players
- Doesn't over-optimize (maintains unpredictability)

### 4. **Simplicity** ✓
- Easy to understand and debug
- Maintainable codebase
- Clear decision-making logic

---

## Potential Enhancements (Priority Order)

### Priority 1: **Platoon Awareness** (Medium Effort, High Value)

**Problem:** CPU doesn't consider batter handedness when evaluating position players

**Solution:** Add handedness consideration to position player selection

**Implementation:**
```typescript
// Add to PlayerSeason interface
bats: 'L' | 'R' | 'S' | null

// Enhance calculateWeightedScore
function calculateWeightedScore(
  player: PlayerSeason,
  position: PositionCode,
  team: DraftTeam,  // Add team param
  randomizationFactor: number = 0.1
): number {
  const rating = player.apba_rating || 0
  const scarcityWeight = POSITION_SCARCITY[position] || 1.0

  // Platoon bonus: reward balanced lineup
  let platoonBonus = 1.0
  if (position !== 'SP' && position !== 'RP' && position !== 'CL') {
    const existingLefties = team.roster.filter(s =>
      s.isFilled && s.playerBats === 'L'
    ).length
    const existingRighties = team.roster.filter(s =>
      s.isFilled && s.playerBats === 'R'
    ).length

    // Prefer minority handedness for balance
    if (player.bats === 'L' && existingLefties < existingRighties) {
      platoonBonus = 1.05  // 5% bonus
    } else if (player.bats === 'R' && existingRighties < existingLefties) {
      platoonBonus = 1.05  // 5% bonus
    } else if (player.bats === 'S') {
      platoonBonus = 1.10  // 10% bonus (switch hitters valuable)
    }
  }

  const randomness = 1 + (Math.random() * 2 - 1) * randomizationFactor

  return rating * scarcityWeight * platoonBonus * randomness
}
```

**Expected Impact:**
- CPU teams will have more balanced lineups (L/R/S mix)
- Switch hitters valued appropriately
- More realistic team construction

---

### Priority 2: **Player Type Diversity** (High Effort, Medium Value)

**Problem:** CPU doesn't track mix of power hitters vs. contact hitters, speedsters vs. sluggers

**Solution:** Add player archetype tracking and diversification bonus

**Implementation:**
```typescript
// Add helper to classify player type
function getPlayerArchetype(player: PlayerSeason): string {
  if (!player.at_bats || player.at_bats < 200) {
    return 'PITCHER'
  }

  const iso = player.isolated_power || 0
  const avg = player.batting_avg || 0
  const sb = player.stolen_bases || 0
  const ops = player.ops || 0

  // Power hitter: high ISO, high HR
  if (iso >= 0.200 && (player.home_runs || 0) >= 25) {
    return 'POWER'
  }

  // Speedster: high SB, low power
  if (sb >= 20 && iso < 0.150) {
    return 'SPEED'
  }

  // Contact hitter: high AVG, low K
  if (avg >= 0.300 && iso < 0.180) {
    return 'CONTACT'
  }

  // Balanced: good OPS, moderate power/speed
  if (ops >= 0.800) {
    return 'BALANCED'
  }

  return 'UTILITY'
}

// Add diversity bonus to scoring
function calculateWeightedScore(
  player: PlayerSeason,
  position: PositionCode,
  team: DraftTeam,
  randomizationFactor: number = 0.1
): number {
  const rating = player.apba_rating || 0
  const scarcityWeight = POSITION_SCARCITY[position] || 1.0

  // Diversity bonus: reward variety in lineup construction
  let diversityBonus = 1.0
  if (position !== 'SP' && position !== 'RP' && position !== 'CL') {
    const archetype = getPlayerArchetype(player)
    const existingArchetypes = team.roster
      .filter(s => s.isFilled && s.playerArchetype)
      .map(s => s.playerArchetype)

    const archetypeCount = existingArchetypes.filter(a => a === archetype).length

    // Prefer less-represented archetypes
    if (archetypeCount === 0) {
      diversityBonus = 1.08  // 8% bonus for new archetype
    } else if (archetypeCount === 1) {
      diversityBonus = 1.04  // 4% bonus
    }
    // else no bonus (already have 2+ of this type)
  }

  const randomness = 1 + (Math.random() * 2 - 1) * randomizationFactor

  return rating * scarcityWeight * diversityBonus * randomness
}
```

**Expected Impact:**
- CPU teams won't draft 9 power hitters with no speed
- More realistic lineup construction (leadoff speedster, cleanup slugger, etc.)
- Adds strategic depth to draft

**Caution:**
- Requires storing player archetype in roster slots
- More complex logic = more potential bugs
- May not be worth complexity for current use case

---

### Priority 3: **Draft Round Awareness** (Low Effort, Low Value)

**Problem:** CPU uses same strategy in round 1 as round 25

**Solution:** Adjust position scarcity weights by draft phase

**Implementation:**
```typescript
function adjustedScarcityWeight(
  position: PositionCode,
  currentRound: number,
  totalRounds: number
): number {
  const baseWeight = POSITION_SCARCITY[position]

  // Early rounds (1-5): Emphasize scarcity more (+20%)
  if (currentRound <= 5) {
    return baseWeight * 1.2
  }

  // Mid rounds (6-15): Use base weights
  if (currentRound <= 15) {
    return baseWeight
  }

  // Late rounds (16+): Reduce scarcity emphasis (-20%), focus on BPA
  return baseWeight * 0.8
}
```

**Expected Impact:**
- Early rounds: CPU aggressively targets scarce positions (C, SS, CL)
- Late rounds: CPU takes best available regardless of position
- More realistic draft behavior

---

### Priority 4: **Advanced Pitcher Evaluation** (High Effort, Low Value)

**Problem:** Current system treats all pitchers within position equally

**Solution:** Add pitcher role specialization scoring

**Implementation:**
```typescript
function getPitcherRole(player: PlayerSeason): 'ACE' | 'STARTER' | 'SWINGMAN' | 'SETUP' | 'CLOSER' {
  if (!player.innings_pitched_outs || player.innings_pitched_outs < 30) {
    return 'SWINGMAN'
  }

  const ip = player.innings_pitched_outs / 3  // Convert outs to innings
  const saves = player.saves || 0
  const era = player.era || 5.00

  // Closer: High saves, moderate IP
  if (saves >= 20 && ip < 100) {
    return 'CLOSER'
  }

  // Ace: High IP, excellent ERA
  if (ip >= 200 && era < 3.50) {
    return 'ACE'
  }

  // Starter: Moderate IP, decent ERA
  if (ip >= 150) {
    return 'STARTER'
  }

  // Setup: Moderate saves/holds, low IP
  if (saves >= 5 && saves < 20 && ip < 100) {
    return 'SETUP'
  }

  return 'SWINGMAN'
}
```

**Expected Impact:**
- CPU won't draft 5 closers or 10 swingmen
- More realistic bullpen construction
- Better pitcher role distribution

**Caution:**
- Single-season stats may not indicate true role
- Historical eras had different pitcher usage patterns
- May not improve draft quality significantly

---

## Recommendations

### **Tier 1: Implement Now** (High Value, Reasonable Effort)
1. ✅ **None currently** - Existing system is solid

### **Tier 2: Consider for Future Enhancement** (Medium Value)
1. **Platoon Awareness** - Adds lineup balance, moderate complexity
2. **Draft Round Awareness** - Simple implementation, minor impact

### **Tier 3: Low Priority / Optional** (Low Value or High Complexity)
1. Player Type Diversity - Complex, marginal benefit
2. Advanced Pitcher Role Evaluation - May not improve results

---

## Conclusion

**Current Assessment: The CPU draft logic is well-designed and effective.**

### What Works Well:
- ✓ Position scarcity weighting is realistic
- ✓ APBA rating is a solid composite metric
- ✓ Randomization adds unpredictability
- ✓ Best available vs. positional need balance
- ✓ Performance is excellent after optimizations

### What Could Be Enhanced:
- Platoon awareness (L/R/S batting mix)
- Draft round strategy adjustment
- Player archetype diversity

### Industry Comparison:
- APBA BBW: No AI draft opponent found (WINDRAFT is for setup, not AI drafting)
- Bill James: Evaluation metrics already incorporated (OPS, RC, ISO)
- Current system matches or exceeds industry standards for this era

### Recommendation:
**Keep current system as-is unless user requests specific enhancements.**

The existing CPU draft logic is well-thought-out and produces realistic drafts. Any enhancements would be incremental improvements rather than fixing fundamental issues.

---

## References

1. **APBA Baseball for Windows 3.0**
   - WINDRAFT.EXE (June 13, 1995)
   - Manager AI files: MGRCAPTS.*, MGRDUKER.*, MGRJMCOY.*, MGRLPEPR.*
   - Location: C:\dosgames\shared\BBW

2. **Bill James Encyclopedia for Windows v1.20**
   - BILL_JAMES_FORMULAS.md
   - BJREADM2.WRI (README documentation)
   - Location: C:\dosgames\shared\BJEBEW

3. **Current Implementation**
   - cpuDraftLogic.ts
   - Location: src/utils/cpuDraftLogic.ts
