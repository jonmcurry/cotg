# MLB Draft AI SRD Evaluation

**Date:** February 5, 2026
**Purpose:** Evaluate feasibility of the proposed MLB_Draft_AI_SRD approach for the APBA Baseball Web project

---

## Executive Summary

The SRD proposes a sophisticated era-normalized, peak-focused rating system using Lahman data. While academically sound, **it is fundamentally misaligned with the current project's single-season draft model**. The SRD appears designed for a different use case: career-based player rankings (like an all-time draft), not season-specific drafts.

**Recommendation:** Do NOT implement the SRD as-is. Instead, fix the specific issues with the current rating system.

---

## Analysis

### 1. Fundamental Mismatch: Peak vs Season

**SRD Approach:**
- Extracts 5 best consecutive seasons (peak)
- Combines peak (65%) with career average (35%)
- Produces a single "TalentScore" per player

**Current Project:**
- Drafts specific player-seasons (e.g., "Ted Williams 1941")
- Each season is independently rated
- Player can appear multiple times (1941 Williams vs 1947 Williams)

**Problem:** The SRD's peak extraction is irrelevant for single-season drafts. You're not drafting "Ted Williams' career" - you're drafting a specific year.

### 2. Era Normalization: Complexity vs Value

**SRD Proposes:**
```
OffenseZ = (PlayerWOBA - LeagueMean) / LeagueStd
```

**Requirements:**
- Calculate league mean and standard deviation per season
- Store or compute ~124 years of league averages
- Handle rule changes (DH introduction, integration, steroid era, etc.)

**Current Reality:**
- Database has no league averages stored
- Would need to aggregate all ~69,000+ player-seasons per year
- Adds significant complexity for marginal benefit in a game context

**Question:** Is a 1927 player with .350 OPS+ really comparable to a 2020 player with .350 OPS+? Era normalization assumes yes, but baseball contexts differ radically (dead ball, integration, expansion, PEDs, etc.).

### 3. wOBA-lite vs OPS: Marginal Improvement

**SRD wOBA-lite:**
```
wOBA = (0.69*BB + 0.72*HBP + 0.89*1B + 1.27*2B + 1.62*3B + 2.10*HR) / (AB + BB + SF + HBP)
```

**Current OPS:**
```
OPS = OBP + SLG = (H + BB + HBP) / (AB + BB + SF + HBP) + TB / AB
```

**Analysis:** wOBA has slightly better correlation with run scoring than OPS, but both are strong offensive measures. For a game simulation context (not salary arbitration), OPS is "good enough" and already stored in the database.

### 4. Defensive Proxy: Already Exists (Unused)

**SRD Proposes:**
```
DefScore = (Putouts + Assists - Errors) / Games
```

**Current System Already Has:**
```typescript
// src/utils/apbaRating.ts:78-119
export function estimateDefensiveRating(fielding_pct, range_factor, position): number
```

**Problem:** The defensive rating function exists but is NOT USED in the actual rating calculation. This is a gap in the current system that could be addressed independently.

---

## Current Rating System Issues - VERIFIED WITH DATA

Database queried on February 5, 2026. Total records: **115,243 player-seasons**.

### Issue 1: Batter Formula Scaling Imbalance (CRITICAL)

```typescript
// Current formula: Average(OPS * 100, RC/5, ISO * 100)
```

**Actual Data from Database (Elite Batters):**

| Player | Year | OPS | RC | ISO | OPS*100 | RC/5 | ISO*100 | Rating |
|--------|------|-----|-----|-----|---------|------|---------|--------|
| Babe Ruth | 1921 | 1.359 | 249 | 0.469 | 135.9 | 49.8 | 46.9 | **77.5** |
| Babe Ruth | 1920 | 1.382 | 221 | 0.473 | 138.2 | 44.2 | 47.3 | **76.6** |
| Babe Ruth | 1927 | 1.258 | 217 | 0.417 | 125.8 | 43.4 | 41.7 | **70.3** |
| Lou Gehrig | 1930 | 1.194 | 204 | 0.343 | 119.4 | 40.7 | 34.3 | **64.8** |
| Mike Lieberthal | 1999 | 0.914 | 100 | 0.251 | 91.4 | 20.1 | 25.1 | **45.5** |

**Problem:** OPS dominates (60-140 range) while RC/5 (10-50) and ISO*100 (10-50) contribute far less.

**Result:** Babe Ruth's 1921 season (arguably the greatest offensive season ever with 1.359 OPS, 249 RC) only rates **77.5** - barely "All-Star" level, not "Legendary".

### Issue 2: Small Sample Size Inflation (CRITICAL)

**Players with 100 ratings (should be impossible for mortals):**

| Player | Year | AB | OPS | Rating |
|--------|------|-----|------|--------|
| Don Bennett | 1930 | 1 | 4.000 | **100** |
| Rob Belloir | 1978 | 1 | 3.000 | **100** |
| Jerry Moses | 1975 | 2 | 2.000 | **100** |
| Wladimir Balentien | 2007 | 3 | 2.500 | **100** |

**Problem:** Players with 1-7 AB and lucky hits get absurd OPS values (2.0-4.0), which translate to 100 ratings after clamping. Meanwhile, Babe Ruth's best season is 77.5.

**Root Cause:** No minimum at-bat threshold for batter rating calculation.

### Issue 3: Pitcher ERA Discretization (MODERATE)

```typescript
if (era < 2.50) return 100  // Grade A
if (era < 3.50) return 75   // Grade B
```

**Problem:** A 2.49 ERA gets 100 points, but a 2.51 ERA gets only 75 points. That's a 25-point swing for a 0.02 ERA difference.

### Issue 4: Pitcher Max Rating Cap (CRITICAL)

**Formula:** `(Grade * 0.5) + (Control * 0.3) + (Star * 0.2)`

**Maximum theoretical:** (100 * 0.5) + (88 * 0.3) + (50 * 0.2) = 50 + 26.4 + 10 = **86.4**

**Actual Elite Pitcher Ratings from Database:**

| Pitcher | Year | ERA | K/BB | W | SV | Rating |
|---------|------|-----|------|---|-----|--------|
| Sandy Koufax | 1965 | 2.04 | 5.38 | 26 | 2 | **86.4** |
| Sandy Koufax | 1966 | 1.73 | 4.12 | 27 | 0 | **86.4** |
| Bob Gibson | 1968 | 1.12 | 4.32 | 22 | 0 | **86.4** |
| Mariano Rivera | 2005 | 1.38 | 4.44 | 7 | 43 | **86.4** |
| Pedro Martinez | 2000 | 1.74 | 8.88 | 18 | 0 | **82.4** |
| Greg Maddux | 1995 | 1.63 | 7.87 | 19 | 0 | **82.4** |

**Problem:** The best pitching seasons in baseball history (Gibson 1968: 1.12 ERA) max out at 86.4 because the formula has a structural ceiling. Batters can reach 100 (via small sample size bug), but pitchers cannot.

**Note:** Pedro Martinez and Greg Maddux (arguably two of the best pitchers ever) rate 82.4 because they had 18-19 wins, not 20+, losing 4 "Star" points.

### Issue 5: Defense Not Contributing

The `estimateDefensiveRating()` function exists in code but is NOT USED in ratings. Gold Glove defenders get no credit.

---

## Recommendations

### From SRD: Do NOT Implement

- [ ] Peak extraction (wrong use case - we draft seasons, not careers)
- [ ] Career average calculation (wrong use case)
- [ ] Full era normalization (complexity not worth it for game context)

### Priority 1: Critical Fixes Needed

- [ ] **Add minimum AB/IP threshold** - Exclude players with <100 AB or <50 IP from ratings
- [ ] **Fix batter formula scaling** - Normalize all 3 components to same 0-100 scale:
  - OPS: Map 0.500-1.400 to 0-100
  - RC: Map 0-250 to 0-100
  - ISO: Map 0-0.500 to 0-100
- [ ] **Fix pitcher max rating** - Change formula so elite pitchers can reach 95+:
  - Option A: Change weights (Grade 0.4, Control 0.35, Star 0.25)
  - Option B: Use continuous ERA scale instead of buckets
  - Option C: Add a "dominance" factor for exceptional seasons

### Priority 2: Formula Improvements

- [ ] **Fix pitcher ERA discretization** - Use continuous formula:
  ```
  ERA_Score = 100 - (ERA * 20)  // 2.00 ERA = 60, 3.00 ERA = 40
  Clamped to 0-100
  ```
- [ ] **Add defensive component** - Weight at 10% for position players:
  ```
  Rating = (Offense * 0.90) + (Defense * 0.10)
  ```

### Priority 3: Nice-to-Have

- [ ] **Simple era multipliers** (optional, not from SRD):
  - Dead Ball (1901-1919): Offense x1.10
  - Steroid Era (1995-2006): Offense x0.95
- [ ] **Position bonus to rating** - SRD's positional values could be incorporated

---

## SRD Feasibility Checklist

| SRD Feature | Feasible? | Worth It? | Notes |
|-------------|-----------|-----------|-------|
| wOBA-lite calculation | Yes | No | OPS works, switching adds complexity |
| Per-season Z-scores | Yes | No | High complexity, marginal game value |
| Defensive proxy | Yes | **Yes** | Already have function, just unused |
| Position value bonus | Yes | Maybe | Already applied at draft time |
| Peak extraction | Yes | **No** | Wrong use case entirely |
| Career average | Yes | **No** | Wrong use case entirely |

---

## Conclusion

**The SRD is NOT the right solution for this project.**

It's designed for career-based all-time rankings, not single-season drafts. The proposal's era normalization and peak extraction are irrelevant to drafting "Babe Ruth 1927" as a specific player-season.

**The real problems are bugs in the current rating formula:**

1. **Small sample size players (1-7 AB) get 100 ratings** while Babe Ruth's best season is 77
2. **Pitcher ratings capped at 86.4** - structural ceiling prevents elite pitchers from matching batters
3. **Batter formula scaling is broken** - OPS dominates, other components contribute little

**Action Plan:**

1. Add minimum AB/IP thresholds (100 AB, 50 IP) to exclude small sample size anomalies
2. Normalize batter formula components to equal 0-100 scales
3. Adjust pitcher formula to allow ratings up to 95+
4. Consider adding the already-implemented defensive rating function
5. **Do NOT pursue SRD's era normalization or peak extraction**

---

## Next Steps

- [x] Query database for sample player ratings - COMPLETED
- [x] Identify specific players whose ratings "don't make sense" - COMPLETED
- [ ] Create test cases for current formula (TDD per CLAUDE.md)
- [ ] Implement minimum AB/IP thresholds
- [ ] Fix batter formula component scaling
- [ ] Fix pitcher formula rating cap
- [ ] Recalculate all ratings with new formula
- [ ] Validate: Ruth 1921 should be 90+, Koufax 1965 should be 90+

