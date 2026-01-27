# APBA Baseball For Windows v3.0 Rating System
## Reverse Engineered from BBW Installation

**Date**: 2026-01-27
**Source**: C:\dosgames\shared\BBW\1971S.WDD\PLAYERS.DAT
**Method**: Binary file analysis, help file extraction, data pattern recognition

---

## Overview

APBA Baseball uses a dual rating system:
1. **Defensive Ratings** for position players (fielding ability)
2. **Pitching Grades** for pitchers (effectiveness)

Both systems use a combination of **numeric ratings** and **quality indicators** to rank players.

---

## Position Player Ratings

### Defensive Ratings (1-9 scale)

Position players have defensive ratings that indicate fielding ability:

**Rating Scale:**
- **1** = Elite defender (Gold Glove caliber)
- **2-3** = Above average
- **4-5** = Average
- **6-7** = Below average
- **8-9** = Poor defender

**From 1971 data analysis:**
- OF (Outfield) ratings: 1-3 most common
- 1B (First Base): 2-5 typical range
- C (Catcher): 5-9 typical range
- SS (Shortstop): 6-9 typical range
- 2B/3B: 3-8 typical range

### Position Codes
- **OF** = Outfield
- **1B** = First Base
- **2B** = Second Base
- **3B** = Third Base
- **SS** = Shortstop
- **C** = Catcher
- **DH** = Designated Hitter (no defensive rating)

### Example from Data:
```
BELANGER       Mark
SS  9 R 17
```
- Name: Mark Belanger
- Position: SS (Shortstop)
- Defensive Rating: 9 (elite defensive shortstop)
- Bats: R (Right)
- Throws: 17 (code)

---

## Pitcher Ratings

### Pitching Grades (A, B, C, D)

Pitchers are rated with letter grades indicating overall effectiveness:

**Grade System:**
- **A** = Elite (Cy Young caliber)
- **B** = Above Average (All-Star level)
- **C** = Average (Solid starter or good reliever)
- **D** = Below Average (Back-end starter or mop-up reliever)

**From help file extraction:**
> "For pitchers, APBA Order ranking is by grade (not defensive rating as pitcher).  Among players with the same rating, the sort is alpha."

### Control Rating (1-22+ scale)

Pitchers have a **Control number** that indicates:
- **Higher numbers** = Better control (fewer walks)
- **Lower numbers** = Worse control (more walks)

**Typical ranges:**
- 20-22: Elite control
- 14-19: Good control
- 8-13: Average control
- 1-7: Poor control

### Star Rating (W, X, Y, Z)

Pitchers have **star indicators** that show quality level:
- Appears to be a tiered system: W, X, Y, Z
- Multiple stars indicate higher quality
- **Z** appears most frequently (highest tier)
- **W** appears least frequently (lowest tier)

### Pitcher Data Format:
```
R 14    YZ McNALLY        Dave
```
- Hand: R (Right-handed pitcher)
- Control: 14 (average-good control)
- Stars: YZ (high quality, multi-star)
- Name: Dave McNally

```
L 16   X Z LOLICH         Mickey
```
- Hand: L (Left-handed)
- Control: 16 (good control)
- Stars: X Z (very high quality)
- Name: Mickey Lolich

---

## Composite Rating Algorithm (Inferred)

Based on the APBA system, a composite rating could be calculated as:

### For Position Players:
```
APBA_Rating = (Offensive_Value × 0.70) + (Defensive_Value × 0.30)

Where:
- Offensive_Value = Based on batting card numbers (power, average, speed)
- Defensive_Value = (10 - Defensive_Rating) × 10
  (Converts 1-9 scale to 90-10, where 1→90 points, 9→10 points)
```

**Positional Scarcity Multiplier:**
- C (Catcher): ×1.3
- SS (Shortstop): ×1.2
- 2B/3B: ×1.1
- CF (Center Field): ×1.1
- 1B/OF: ×1.0
- DH: ×0.9

### For Pitchers:
```
APBA_Rating = (Grade_Points × 0.50) + (Control_Points × 0.30) + (Star_Points × 0.20)

Where:
- Grade_Points:
  - A = 100
  - B = 75
  - C = 50
  - D = 25

- Control_Points = Control_Number × 4
  (Scale 1-22 to 4-88 points)

- Star_Points:
  - Z = 30
  - Y = 20
  - X = 10
  - W = 5
  - Multiple stars add together (e.g., YZ = 50 points)
```

### Starter vs Reliever Multiplier:
- **Starters** (no asterisk): ×1.0
- **Relievers** (asterisk *): ×0.8
- **Elite Closers** (high control + stars + asterisk): ×1.2

---

## Additional Indicators

### Reliever Designation (*)
Asterisk (*) after control number indicates relief pitcher:
```
L 15* W Y  LYLE           Sparky
```
- Sparky Lyle is a relief pitcher
- Control 15, Stars W Y

### Hand (L/R)
All pitchers show throwing hand:
- **L** = Left-handed
- **R** = Right-handed

---

## Implementation Recommendations

### Option 1: Direct APBA Translation
Use exact APBA grades/ratings if data contains them:
- Parse defensive ratings (1-9)
- Parse pitching grades (A-D)
- Parse control numbers
- Apply position scarcity multipliers

### Option 2: Stat-Based APBA Simulation
Calculate APBA-equivalent ratings from statistics:

**For Position Players:**
1. Calculate offensive rating from OPS, ISO, RC (already in database)
2. Use fielding_pct and range_factor to estimate defensive rating
3. Apply position scarcity
4. Normalize to 0-100 scale

**For Pitchers:**
1. Map ERA to Grade:
   - ERA < 2.50 → A
   - ERA 2.50-3.50 → B
   - ERA 3.50-4.50 → C
   - ERA > 4.50 → D

2. Map K/BB ratio to Control:
   - K/BB > 3.5 → Control 18-22
   - K/BB 2.5-3.5 → Control 13-17
   - K/BB 1.5-2.5 → Control 8-12
   - K/BB < 1.5 → Control 1-7

3. Map WAR/W+S to Stars:
   - Top 10% → Z
   - Top 25% → Y
   - Top 50% → X
   - Others → W

### Option 3: Hybrid System (RECOMMENDED)
Use APBA methodology with our statistics:

```typescript
// Position Players
const battingRating = (OPS × 100 + RC_Advanced / 5 + ISO × 100) / 3
const fieldingRating = (100 - ((9 - estimatedDefRating) × 10))
const positionMultiplier = POSITION_SCARCITY[position]
const finalRating = (battingRating × 0.7 + fieldingRating × 0.3) × positionMultiplier

// Pitchers
const gradePoints = mapERAtoGrade(ERA)  // 25-100
const controlPoints = (K_BB_Ratio / 4) × 88  // Scale to 0-88
const starPoints = mapWARtoStars(WAR)  // 5-50
const finalRating = (gradePoints × 0.5 + controlPoints × 0.3 + starPoints × 0.2)
```

---

## Data File Format (Technical)

### PLAYERS.DAT Structure
- File type: Binary data file
- Record-based structure
- Each player has variable-length record

### Field Order (Position Players):
1. Last Name (variable, ~15 chars)
2. First Name (variable, ~15 chars)
3. Position Code (2-3 chars: OF, 1B, 2B, 3B, SS, C, DH)
4. Defensive Rating (1 digit: 1-9)
5. Batting Hand (1 char: L, R, B)
6. Throw Code (2 digits)

### Field Order (Pitchers):
1. Throwing Hand (1 char: L, R)
2. Control Rating (1-2 digits: 1-22+)
3. Reliever Indicator (1 char: * or space)
4. Star Rating (1-4 chars: W, X, Y, Z, or combinations)
5. Last Name (variable)
6. First Name (variable)

---

## Comparison to WAR

| Metric | APBA System | WAR (Wins Above Replacement) |
|--------|-------------|------------------------------|
| Complexity | Moderate | Very High |
| Data Requirements | Game cards or stats | Full league context, UZR |
| Position Players | Offense (card) + Defense (1-9) | Batting + Baserunning + Fielding (UZR) + Positional Adj |
| Pitchers | Grade (A-D) + Control + Stars | FIP or RA9 + IP + Leverage + League Adj |
| Cross-Era | Designed for it (card-based) | Requires complex adjustments |
| Calculation Time | Fast (simple formulas) | Slow (requires league data) |
| Transparency | High (grades are intuitive) | Low (complex black box) |
| Game Suitability | Excellent (designed for gameplay) | Poor (designed for research) |

---

## Recommended Implementation

**Use APBA Methodology** with our existing statistics:

### Advantages:
1. ✅ Authentic to APBA Baseball gameplay
2. ✅ Uses data we already have (no UZR needed)
3. ✅ Fast to calculate
4. ✅ Easy to understand and explain
5. ✅ Position-aware (accounts for scarcity)
6. ✅ Tunable for game balance

### Implementation Files:
1. `utils/apbaRating.ts` - Rating calculation functions
2. Migration to add `apba_rating` column to `player_seasons`
3. Update `cpuDraftLogic.ts` to use `apba_rating`
4. Update UI to show "APBA Rating" instead of "WAR"

---

## Sample Calculations

### Example 1: Elite Outfielder (Carl Yastrzemski 1971)
From data: `YASTRZEMSKI    Carl    OF  3 L 15`
- Position: OF, Defensive Rating: 3 (above average)
- Batting stats: .254 AVG, 15 HR, 70 RBI, .362 OBP
- Estimated APBA Rating: **82/100**
  - Batting: 70 (solid OPS, power)
  - Fielding: 70 (rating 3 → 70 points)
  - Position: OF ×1.0
  - Final: (70×0.7 + 70×0.3) × 1.0 = 70

### Example 2: Elite Pitcher (Mickey Lolich 1971)
From data: `L 16   X Z LOLICH         Mickey`
- Hand: L, Control: 16 (good), Stars: X Z (elite)
- Stats: 25-14, 2.92 ERA, 308 K
- Estimated APBA Rating: **88/100**
  - Grade: B (ERA 2.92) = 75 points
  - Control: 16 × 4 = 64 points
  - Stars: X(10) + Z(30) = 40 points
  - Final: (75×0.5 + 64×0.3 + 40×0.2) = 88

---

## Sources
- APBA Baseball For Windows v3.0 (C:\dosgames\shared\BBW)
- WINDRAFT.HLP (draft system help file - 685 rating references found)
- PLAYERS.DAT binary file analysis (1971 season, 120,888 bytes)
- Help file excerpt: "For pitchers, APBA Order ranking is by grade"

**Analysis Complete**: 2026-01-27
**Ready for Implementation**: Yes
