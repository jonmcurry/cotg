# Technical Requirements Document: CPU Draft AI Algorithm

**Document Version:** 2.0
**Last Updated:** 2026-02-02
**Module:** `src/utils/cpuDraftLogic.ts`

---

## 1. Overview

The CPU Draft AI algorithm selects players for computer-controlled teams during the fantasy draft. It uses a **True Best Player Available (BPA)** approach that scores ALL eligible candidates across ALL unfilled positions simultaneously, with position scarcity applied as a score multiplier rather than a filter.

### 1.1 Design Philosophy

- **Early rounds (1-5):** True BPA - scarcity weights REDUCED (-20%) so raw APBA Rating dominates
- **Middle rounds (6-15):** Balanced - base scarcity weights applied
- **Late rounds (16+):** Position-first - scarcity weights INCREASED (+20%) to fill remaining roster gaps

### 1.2 Key Principle

The AI never locks onto a single target position. Instead, it evaluates every eligible player for every unfilled position and picks the highest overall score. A 99-rated Shortstop will beat a 50-rated Catcher in early rounds, even if Catcher is more scarce.

---

## 2. Algorithm Flow

```
CPU Pick Request
       |
       v
+------------------------+
| selectBestPlayer()     |
+------------------------+
       |
       v
+------------------------+
| Filter out already-    |
| drafted players        |
+------------------------+
       |
       v
+------------------------+
| Get ALL unfilled       |
| roster positions       |
| (deduplicated)         |
+------------------------+
       |
       v
+------------------------+
| For EACH unfilled      |
| position:              |
|  - Find eligible       |
|    players             |
|  - Score each:         |
|    Rating x Scarcity   |
|    x Platoon x Random  |
+------------------------+
       |
       v
+------------------------+
| Sort ALL candidates    |
| by score descending    |
+------------------------+
       |
       v
+------------------------+
| Randomly select from   |
| top 5 candidates       |
+------------------------+
```

---

## 3. Core Functions

### 3.1 selectBestPlayer(availablePlayers, team, draftedPlayerIds, currentRound)

**Purpose:** Selects the optimal player for a CPU-controlled team using True BPA.

**Input:**
- `availablePlayers` - Array of PlayerSeason objects (pre-sorted by APBA Rating DESC, limited to top 1000)
- `team` - DraftTeam with current roster state
- `draftedPlayerIds` - Set of player_id values to exclude (prevents same player drafted from multiple seasons)
- `currentRound` - Current draft round (affects scarcity scaling)

**Process:**
1. Filter out already-drafted players by `player_id`
2. Get all unfilled positions from roster requirements (deduplicated)
3. For EACH unfilled position, find all eligible candidates (position eligibility + playing time)
4. Score every candidate: `APBA Rating x Scarcity x Platoon x Randomness`
5. Sort all candidates across all positions by score descending
6. Randomly select from top 5 candidates

**Output:** `{ player, position, slotNumber }` or `null`

### 3.2 calculateWeightedScore(player, position, team, randomizationFactor, scarcityWeight)

**Purpose:** Calculates a numerical score for a player-position combination.

**Formula:**
```
Score = APBA Rating x Scarcity Weight x Platoon Bonus x Randomness
```

### 3.3 getCPUDraftRecommendation(availablePlayers, team, draftedPlayerIds, currentRound)

**Purpose:** Wrapper around selectBestPlayer that adds human-readable reasoning text.

---

## 4. Scoring Components

### 4.1 APBA Rating (Primary Metric)

The APBA Rating (0-100 scale) is the primary talent metric for drafting. This is a proprietary rating derived from the player's season statistics, designed for the APBA baseball game system.

**Examples:**
- A 95-rated player in Round 1 with Catcher scarcity (0.8 adjusted): `95 x 1.20 = 114`
- A 70-rated player in Round 1 with Catcher scarcity (0.8 adjusted): `70 x 1.20 = 84`

The higher-rated player wins regardless of position need in early rounds.

### 4.2 Position Scarcity Weights

Applied as a **multiplier** to the APBA Rating score, not as a filter:

| Position | Base Weight | Rationale |
|----------|-------------|-----------|
| C        | 1.5         | Catchers are scarce |
| SS       | 1.4         | Premium shortstops are scarce |
| CL       | 1.3         | Elite closers are scarce |
| SP       | 1.2         | Starting pitchers are important |
| 2B       | 1.1         | Moderate scarcity |
| 3B       | 1.1         | Moderate scarcity |
| 1B       | 1.0         | Baseline |
| OF       | 0.9         | Lots of outfielders available |
| RP       | 0.8         | Relief pitchers are abundant |
| DH       | 0.7         | Can be any position |
| BN       | 0.5         | Bench - least priority |

### 4.3 Round-Based Scarcity Adjustment

The scarcity weight is scaled by round to shift strategy:

| Round | Scarcity Multiplier | Effective C Weight | Strategy |
|-------|--------------------|--------------------|----------|
| 1-5   | 0.8x (reduced)     | 1.5 x 0.8 = 1.20  | True BPA - talent dominates |
| 6-15  | 1.0x (base)        | 1.5 x 1.0 = 1.50  | Balanced |
| 16+   | 1.2x (increased)   | 1.5 x 1.2 = 1.80  | Fill roster gaps |

**Rationale:** In early rounds, reducing scarcity impact means a 90-rated OF (score: ~81) still beats a 60-rated C (score: ~72). In late rounds, increasing scarcity ensures the team fills scarce positions like Catcher even if the available players are lower-rated.

### 4.4 Platoon Bonus

Rewards balanced lineup composition (position players only, not SP/RP/CL):

| Condition | Bonus |
|-----------|-------|
| Left-handed batter when team has fewer lefties than righties | x1.05 (+5%) |
| Right-handed batter when team has fewer righties than lefties | x1.05 (+5%) |
| Switch hitter (always valuable) | x1.10 (+10%) |

### 4.5 Randomization Factor

A +/-10% random factor applied to every score to add unpredictability:

```
randomness = 1 + (Math.random() * 2 - 1) * 0.1
```

Range: 0.90 to 1.10 multiplier.

Additionally, the final selection is made randomly from the top 5 scored candidates, adding further variety.

---

## 5. Example Score Calculation

**Scenario:** Round 3, team needs C, SS, OF, SP

| Player | Position | APBA Rating | Scarcity (adj) | Platoon | Score (approx) |
|--------|----------|-------------|----------------|---------|----------------|
| Player A | SS | 95 | 1.4 x 0.8 = 1.12 | 1.0 | 95 x 1.12 = 106.4 |
| Player B | C | 60 | 1.5 x 0.8 = 1.20 | 1.0 | 60 x 1.20 = 72.0 |
| Player C | OF | 90 | 0.9 x 0.8 = 0.72 | 1.05 | 90 x 0.72 x 1.05 = 68.0 |
| Player D | SP | 85 | 1.2 x 0.8 = 0.96 | 1.0 | 85 x 0.96 = 81.6 |

**Result:** Player A (SS, 106.4) is selected - the highest-rated player wins in early rounds even though C is more scarce. This is True BPA behavior.

**Same scenario in Round 18:**

| Player | Position | APBA Rating | Scarcity (adj) | Score (approx) |
|--------|----------|-------------|----------------|----------------|
| Player A | SS | 95 | 1.4 x 1.2 = 1.68 | 95 x 1.68 = 159.6 |
| Player B | C | 60 | 1.5 x 1.2 = 1.80 | 60 x 1.80 = 108.0 |

**Result:** SS still wins on raw talent, but the gap narrows. A C-rated-80 would score 144.0 vs OF-rated-90 at 97.2, showing position scarcity pulling its weight in late rounds.

---

## 6. Position Eligibility

Players must match both position eligibility AND playing time requirements:

**Position Eligibility** (defined in `POSITION_ELIGIBILITY`):
- Each roster slot has a list of qualifying player positions
- DH can be filled by ANY position (including pitchers for two-way players)
- BN can be filled by any position player or pitcher

**Playing Time Requirements:**
- Position player slots (C, 1B, 2B, SS, 3B, OF, DH): 200+ at-bats
- Pitcher slots (SP, RP, CL): 30+ innings pitched (90+ outs)
- Bench (BN): Either qualification

---

## 7. Roster Requirements

Defined in `ROSTER_REQUIREMENTS` (from SRD 3.5):

| Position | Slots |
|----------|-------|
| C | 1 |
| 1B | 1 |
| 2B | 1 |
| SS | 1 |
| 3B | 1 |
| OF | 3 |
| SP | 4 |
| RP | 3 |
| CL | 1 |
| DH | 1 |
| BN | 4 |
| **Total** | **21** |

---

## 8. Performance Characteristics

| Metric | Value |
|--------|-------|
| Player pool per pick | Top 1000 by APBA Rating (pre-filtered in DraftBoard) |
| Positions evaluated per pick | All unfilled (up to 11 unique) |
| Candidates scored per pick | Varies (~100-2000 depending on eligible players per position) |
| Pick delay | ~50-200ms typical |

---

## 9. Known Limitations

1. **No look-ahead:** The AI doesn't predict what other teams will draft
2. **No trade value:** Doesn't consider trading picks
3. **Single season focus:** Each player-season is a separate candidate
4. **No career consistency weighting:** A single elite season ranks the same regardless of career arc

---

## 10. Configuration Constants

| Constant | Value | Location |
|----------|-------|----------|
| Early round threshold | Round 5 | `adjustScarcityByRound()` |
| Mid round threshold | Round 15 | `adjustScarcityByRound()` |
| Early scarcity multiplier | 0.8 | `adjustScarcityByRound()` |
| Late scarcity multiplier | 1.2 | `adjustScarcityByRound()` |
| Randomization factor | 0.1 (10%) | `selectBestPlayer()` |
| Top candidates pool | 5 | `selectBestPlayer()` |

---

## 11. Files

| File | Purpose |
|------|---------|
| `src/utils/cpuDraftLogic.ts` | Core AI algorithm (selectBestPlayer, calculateWeightedScore) |
| `src/types/draft.types.ts` | Type definitions, roster requirements, position eligibility |
| `src/components/draft/DraftBoard.tsx` | UI integration, calls selectBestPlayer during CPU turns |

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-23 | Initial implementation (WAR-based, position-first) |
| 1.1 | 2026-01-23 | Increased WAR multiplier (5 -> 15) |
| 1.2 | 2026-01-23 | Added round-based scaling |
| 1.3 | 2026-01-23 | Added must-have position boosts (closer, catcher) |
| 1.4 | 2026-01-23 | Fixed DH logic - any position player can fill DH slot |
| 2.0 | 2026-02-02 | Major refactor: True BPA - score all candidates across all positions simultaneously. Switched from WAR to APBA Rating. Inverted early round scarcity (now reduces position bias in rounds 1-5). Updated file paths from JS to TS. |
