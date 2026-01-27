# Bill James Formula Reference

## Purpose
This file documents Bill James formulas to implement in Century of the Game.
All inputs come from Lahman database, NOT from Bill James files.

---

## Easy Formulas (Implement First)

### 1. Runs Created (Basic)
```
RC = (H + BB) × TB / (AB + BB)
```
**Inputs:** H, BB, TB, AB from Batting.csv
**Purpose:** Estimate runs a player contributed

### 2. Isolated Power (ISO)
```
ISO = SLG - AVG = (TB/AB) - (H/AB) = (TB - H) / AB
```
**Inputs:** TB, H, AB from Batting.csv
**Purpose:** Measure raw power (extra bases per at-bat)

### 3. Secondary Average (SecA)
```
SecA = (BB + TB - H + SB - CS) / AB
```
**Inputs:** BB, TB, H, SB, CS, AB from Batting.csv
**Purpose:** Offensive contribution beyond batting average

### 4. Power/Speed Number
```
P/S = 2 × (HR × SB) / (HR + SB)
```
**Inputs:** HR, SB from Batting.csv
**Purpose:** Identify rare 5-tool players (20/20, 30/30, 40/40 clubs)

### 5. Range Factor
```
RF = (PO + A) × 9 / Innings
```
**Inputs:** PO, A, G from Fielding.csv
**Purpose:** Defensive plays made per 9 innings

---

## Medium Formulas (Phase 4)

### 6. Runs Created (Advanced - "Technical" version)
```
RC = (H + BB + HBP - CS - GIDP) × (TB + 0.26(BB+HBP-IBB) + 0.52(SH+SF+SB))
     ────────────────────────────────────────────────────────────────────────
              (AB + BB + HBP + SH + SF)
```
**Inputs:** All from Batting.csv
**Purpose:** More accurate run estimation accounting for all offensive events

### 7. Component ERA
```
CERA = Based on H, HR, BB allowed (not actual runs)
Formula accounts for defense-independent pitching
```
**Inputs:** Pitching.csv
**Purpose:** ERA if pitcher had average defense

### 8. Game Score (Per Game)
```
Start with 50
+1 for each out recorded
+2 for each inning completed after 4th
+1 for each strikeout
-2 for each hit allowed
-4 for each earned run
-2 for each unearned run
-1 for each walk
```
**Inputs:** Game-by-game logs or season aggregates
**Purpose:** Single-game pitching performance metric

---

## Complex Formulas (Phase 4 - Optional)

### 9. Win Shares
Multi-step algorithm that:
1. Distributes team wins to players
2. Adjusts for position (offense/defense/pitching)
3. Adjusts for era and league
4. Produces comparable value metric across eras

**Complexity:** 100+ pages in Bill James Handbook
**Recommendation:** Phase 4 stretch goal if time allows

---

## Career Analysis Algorithms

### 10. Peak Years Identification
```
For each player:
  - Identify best consecutive 3-year period (by WAR or RC)
  - Identify best consecutive 5-year period
  - Calculate "peak value"
```
**Purpose:** Compare players by their peaks vs. longevity

### 11. Career Trajectory
```
For each player:
  - Plot WAR/RC by age
  - Identify ascent phase (improving)
  - Identify peak phase (sustained excellence)
  - Identify decline phase
  - Calculate area under curve (career value)
```
**Purpose:** Visualize and compare career arcs

### 12. Similarity Scores
```
For each pair of players:
  - Compare key stats (scaled by era)
  - Weight important categories
  - Calculate similarity score (0-1000)
  - Rank most similar players
```
**Purpose:** "Find similar players" feature

---

## Implementation Priority

**Phase 1 (Now):**
- Create `utils/billJamesFormulas.ts` with functions for all formulas
- Unit tests for each formula

**Phase 2-3:**
- Use formulas in backend calculations when importing Lahman data

**Phase 4:**
- Build UI features:
  - Player comparison tool
  - Historical rankings by metric
  - Career trajectory visualizer
  - Similar players finder

---

**Created:** January 27, 2026
**Source:** Bill James Baseball Encyclopedia analysis
**Data Source:** Lahman Database (1871-2025)
