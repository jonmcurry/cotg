# Technical Requirements Document: CPU Draft AI Algorithm

**Document Version:** 1.0
**Last Updated:** 2026-01-23
**Module:** `js/modules/AdvancedDraft.js`

---

## 1. Overview

The CPU Draft AI algorithm selects players for computer-controlled teams during the fantasy draft. It uses a scoring-based approach that balances player talent (WAR) against team roster needs, with the balance shifting based on the current draft round.

### 1.1 Design Philosophy

- **Early rounds (1-5):** Draft the best player available (BPA) regardless of position
- **Middle rounds (6-12):** Balance talent with roster needs
- **Late rounds (13+):** Focus on filling remaining roster positions

---

## 2. Algorithm Flow

```
CPU Pick Request
       |
       v
+------------------+
| getSmartPick()   |
+------------------+
       |
       v
+------------------+
| Get team's       |
| roster needs     |
+------------------+
       |
       v
+------------------+
| Filter available |
| players (not     |
| already drafted) |
+------------------+
       |
       v
+------------------+
| For each player: |
| - Find best      |
|   season (WAR)   |
| - Calculate      |
|   pick score     |
+------------------+
       |
       v
+------------------+
| Sort by score    |
| descending       |
+------------------+
       |
       v
+------------------+
| Return top       |
| scored player    |
+------------------+
```

---

## 3. Core Functions

### 3.1 getSmartPick(team)

**Purpose:** Selects the optimal player for a CPU-controlled team.

**Input:** Team object with roster needs

**Process:**
1. Get team's current roster needs via `team.getRosterNeeds()`
2. Retrieve all players from historical database (limit: 5000)
3. Filter out already-drafted players
4. For each available player:
   - Find their best season (highest WAR)
   - Calculate a pick score using `calculatePickScore()`
5. Sort players by score descending
6. Return the highest-scored player

**Output:** `{ player, season, score }` object or `null`

---

### 3.2 calculatePickScore(player, season, needs)

**Purpose:** Calculates a numerical score representing how valuable a player is for the current pick.

**Formula:**
```
Score = (WAR * warMultiplier)
      + (Overall Rating * 0.2)
      + (Position Need Bonus * needBonusScale)
      + (Positional Scarcity Bonus * needBonusScale)
      + Elite Stat Bonuses
      - Position Filled Penalty
      + Balance Bonus
      + Ace Pitcher Bonus
```

---

## 4. Scoring Components

### 4.1 Round-Based Scaling

The algorithm adjusts its priorities based on the current draft round:

| Round | WAR Multiplier | Need Bonus Scale | Strategy |
|-------|---------------|------------------|----------|
| 1-5   | 20            | 0.1              | Best Player Available |
| 6-12  | 12            | 0.5              | Balanced |
| 13+   | 8             | 1.0              | Fill Roster Gaps |

**Rationale:** In early rounds, a 10 WAR player should always be drafted over a 5 WAR player regardless of position. In late rounds, filling roster holes becomes more important than marginal WAR differences.

---

### 4.2 WAR Score

```javascript
score += war * warMultiplier;
```

WAR (Wins Above Replacement) is the primary talent metric. It's era-adjusted by design, making a 10 WAR season from 1920 comparable to a 10 WAR season from 2020.

**Example calculations:**
- Babe Ruth 1921 (12.9 WAR) in Round 1: `12.9 * 20 = 258 points`
- Derek Jeter 1999 (8.0 WAR) in Round 1: `8.0 * 20 = 160 points`
- Same players in Round 15: Ruth = `12.9 * 8 = 103`, Jeter = `8.0 * 8 = 64`

---

### 4.3 Overall Rating Bonus

```javascript
score += overall * 0.2;
```

A minor factor based on the player's overall rating (0-100 scale).

**Example:** 90 overall rating = `90 * 0.2 = 18 points`

---

### 4.4 Position Need Bonus

```javascript
const needBonus = getPositionNeedBonus(pos, needs);
score += needBonus * needBonusScale;
```

Awards points when the team needs a player at that position:

| Position | Bonus (if needed) |
|----------|-------------------|
| C        | 80                |
| SS       | 75                |
| 2B       | 70                |
| SP       | 70                |
| 3B       | 65                |
| 1B       | 60                |
| CF       | 60                |
| LF/RF    | 55                |
| CL       | 55                |
| RP       | 50                |
| DH       | 40                |
| Default  | 30                |

**Scaling by round:**
- Round 3: `80 * 0.1 = 8 points` for a catcher
- Round 8: `80 * 0.5 = 40 points` for a catcher
- Round 15: `80 * 1.0 = 80 points` for a catcher

---

### 4.5 Positional Scarcity Bonus

```javascript
const scarcityBonus = getPositionalScarcityBonus(pos);
score += scarcityBonus * needBonusScale;
```

Awards extra points for historically scarce positions:

| Position | Scarcity Bonus |
|----------|----------------|
| C        | 20             |
| SS       | 15             |
| CL       | 15             |
| 2B       | 10             |
| CF       | 10             |
| OF       | 5              |
| SP       | 5              |
| Others   | 0              |

**Rationale:** Elite offensive catchers (Johnny Bench, Mike Piazza) and elite shortstops are historically rare. This bonus helps the AI recognize their value.

---

### 4.6 Position Filled Penalty

```javascript
if (isPositionFilled(pos, needs)) {
    score -= 200;
}
```

Heavy penalty (-200 points) when the team already has enough players at that position. This prevents drafting a 5th outfielder when you already have 4.

---

### 4.7 Balance Bonus

```javascript
if (!isPitcher && posPlayersNeeded > pitchersNeeded) {
    score += 10 * needBonusScale;
}
```

Slight preference for position players when the team needs more position players than pitchers. Helps maintain roster balance.

---

### 4.8 Ace Pitcher Bonus

```javascript
if (isPitcher && pitchersNeeded > 0 && currentRound > 5) {
    if (season.ratings?.pitching?.grade === 'A') {
        score += 15;
    }
}
```

Awards 15 points to elite pitchers (grade A) in middle/late rounds when pitching is needed. Prevents the AI from completely ignoring aces.

---

### 4.9 Elite Stat Bonuses

Always applied, regardless of round:

| Stat Threshold | Bonus |
|----------------|-------|
| HR >= 40       | +10   |
| AVG >= .330    | +8    |
| SB >= 30       | +5    |

**Rationale:** Rewards exceptional individual seasons even if WAR doesn't fully capture the value.

---

### 4.10 Must-Have Position Boosts

Ensures teams fill critical positions by certain rounds:

**Closer Priority (if team has no closer):**

| Round   | Bonus |
|---------|-------|
| 8-11    | +30   |
| 12+     | +60   |

```javascript
if (pos === 'CL' && !needs.hasCloser) {
    if (currentRound >= 8 && currentRound < 12) {
        score += 30;
    } else if (currentRound >= 12) {
        score += 60;
    }
}
```

**Catcher Priority (if team has no catcher):**

| Round   | Bonus |
|---------|-------|
| 6-9     | +25   |
| 10+     | +50   |

```javascript
if (pos === 'C' && !needs.hasCatcher) {
    if (currentRound >= 6 && currentRound < 10) {
        score += 25;
    } else if (currentRound >= 10) {
        score += 50;
    }
}
```

**Rationale:** Elite catchers and closers are scarce in historical data. These boosts ensure every team gets at least one of each critical position before the draft ends.

---

### 4.11 DH Eligibility (Any Position Player)

The DH (Designated Hitter) slot is special: **any position player can fill it**. The algorithm recognizes this by:

1. **DH Eligibility Bonus:** When the team needs a DH, ALL non-pitchers get a bonus:

```javascript
if (!isPitcher && needs.DH > 0 && pos !== 'DH') {
    score += 30 * needBonusScale;
}
```

2. **No Position-Filled Penalty:** Position players whose primary position is filled are NOT penalized if DH is still needed:

```javascript
// Position players can fill DH if their position is full
if (pos === 'C') return needs.C === 0 && !dhStillNeeded;
if (pos === '1B') return needs['1B'] === 0 && !dhStillNeeded;
// ... etc for all position players
```

**Why this matters:**

| Player | Position | WAR | Old Logic | New Logic |
|--------|----------|-----|-----------|-----------|
| Barry Bonds | OF | 11.9 | Would be penalized (-200) if OF full | Can fill DH slot |
| Charley Lau | DH | 0.4 | Only DH option | Competes on WAR like everyone else |

**Rationale:** In real baseball, the DH is typically filled by the best available hitter who isn't needed in the field. A 10 WAR outfielder is far more valuable as a DH than a 0.4 WAR DH-only player.

---

## 5. Example Score Calculation

**Scenario:** Round 3, team needs a catcher

**Player:** Johnny Bench 1972
- WAR: 7.7
- Overall Rating: 85
- Position: C
- Stats: 40 HR, .270 AVG

**Calculation:**
```
WAR Score:           7.7 * 20 = 154.0
Overall Bonus:       85 * 0.2 = 17.0
Position Need:       80 * 0.1 = 8.0
Scarcity Bonus:      20 * 0.1 = 2.0
40+ HR Bonus:        +10.0
Position Filled:     0 (not filled)

TOTAL SCORE:         191.0 points
```

**Comparison Player:** Barry Bonds 2001 (OF, 11.9 WAR)
```
WAR Score:           11.9 * 20 = 238.0
Overall Bonus:       95 * 0.2 = 19.0
Position Need:       55 * 0.1 = 5.5
Scarcity Bonus:      5 * 0.1 = 0.5
40+ HR Bonus:        +10.0 (73 HR)

TOTAL SCORE:         273.0 points
```

**Result:** Bonds (273) beats Bench (191) in Round 3. The BPA strategy works correctly.

---

## 6. Best Season Selection

```javascript
const bestSeason = seasons.reduce((best, s) =>
    (!best || (s.stats.WAR || 0) > (best.stats.WAR || 0)) ? s : best
, null);
```

For each player, the algorithm selects their **single best season** by WAR. This means:
- Babe Ruth is drafted based on his 1921 season (12.9 WAR)
- A player with one great season ranks higher than a consistent but unspectacular player

---

## 7. Roster Needs Integration

The `team.getRosterNeeds()` method returns an object like:

```javascript
{
    C: 2,    // Need 2 catchers
    '1B': 1, // Need 1 first baseman
    '2B': 1,
    SS: 1,
    '3B': 1,
    OF: 5,   // Need 5 outfielders
    DH: 1,
    SP: 5,   // Need 5 starting pitchers
    RP: 4    // Need 4 relief pitchers
}
```

As players are drafted, these counts decrease. When a count reaches 0, the position is considered "filled" and the -200 penalty applies.

---

## 8. Performance Characteristics

| Metric | Value |
|--------|-------|
| Players evaluated per pick | Up to 5,000 |
| Seasons checked per player | All available |
| Time complexity | O(n * m) where n=players, m=seasons |
| Pick delay | ~50-200ms typical |

---

## 9. Known Limitations

1. **No look-ahead:** The AI doesn't predict what other teams will draft
2. **No trade value:** Doesn't consider trading picks
3. **Single season focus:** Uses best season only, not career consistency
4. **No platoon awareness:** Doesn't draft complementary L/R hitters

---

## 10. Configuration Constants

| Constant | Value | Location |
|----------|-------|----------|
| Early round threshold | Round 5 | `calculatePickScore()` |
| Middle round threshold | Round 12 | `calculatePickScore()` |
| Position filled penalty | -200 | `calculatePickScore()` |
| Player pool limit | 5000 | `getSmartPick()` |

---

## 11. Files

| File | Purpose |
|------|---------|
| `js/modules/AdvancedDraft.js` | Main algorithm implementation |
| `js/engine/Team.js` | `getRosterNeeds()` method |
| `js/data/HistoricalPlayers.js` | Player database access |

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-23 | Initial implementation |
| 1.1 | 2026-01-23 | Increased WAR multiplier (5 -> 15) |
| 1.2 | 2026-01-23 | Added round-based scaling |
| 1.3 | 2026-01-23 | Added must-have position boosts (closer, catcher) |
| 1.4 | 2026-01-23 | Fixed DH logic - any position player can fill DH slot |
