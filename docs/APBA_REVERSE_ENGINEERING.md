# APBA Baseball - Reverse Engineering Documentation

**Date:** January 27, 2026
**Status:** In Progress
**Source:** APBA Baseball v3 for Windows (C:\dosgames\shared\BBW)

---

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Player Record Format](#player-record-format)
4. [Position Codes](#position-codes)
5. [Fielding Grades](#fielding-grades)
6. [Batting Chart Structure](#batting-chart-structure)
7. [Game Mechanics](#game-mechanics)
8. [Sample Data](#sample-data)

---

## Overview

APBA Baseball uses a card-based simulation system where each player season is represented by a "card" containing:
- Player identification (name, position)
- Fielding grade (1-9 scale)
- Batting chart (dice roll outcomes)
- Additional ratings

The game uses two six-sided dice (2d6) for all outcomes, providing 36 possible results (rolls 2-12).

---

## File Structure

### Season Directories

Each season is stored in a directory named `YYYYS.WDD` (e.g., `1921S.WDD`):

```
1921S.WDD/
├── PLAYERS.DAT      # Binary file with all player cards (71,832 bytes)
├── NSTAT.DAT        # Team/league statistics
├── PSTAT.DAT        # Player statistics
├── ORG00001/        # Organization 1 (team data)
├── ORG00002/        # Organization 2
└── ...
```

### Organization Subdirectories

Each ORG directory contains:
- `ORG.DAT` - Team information
- `SCHEDULE.ORG` - Season schedule (162 games)
- `T00001LU.ORG` - Team 1 lineup
- `T00001RS.ORG` - Team 1 roster
- ... (repeated for each team)

---

## Player Record Format

### Binary Structure

Each player record is **146 bytes (0x92)** in length.

| Offset | Size | Type | Description |
|--------|------|------|-------------|
| 0x00 | 1 | uint8 | Last name length |
| 0x01-0x0F | 15 | char[] | Last name (space-padded) |
| 0x10 | 1 | uint8 | First name length |
| 0x11-0x1F | 15 | char[] | First name (space-padded) |
| 0x20-0x85 | 102 | bytes | Ratings and batting chart data |
| 0x86-0x91 | 12 | char[] | Position string (e.g., "OF  2 L 14") |

### Position String Format (offset 0x86-0x91)

Format: `POS  G H CN`

- **POS** (2-3 chars): Position code (C, 1B, 2B, SS, 3B, OF, P)
- **G** (1 digit): Fielding grade (1-9, where 1=best, 9=worst)
- **H** (1 char): Handedness (L=Left, R=Right, B=Both)
- **CN** (2 digits): Card number (01-99)

Example: `"OF  2 L 14"` = Outfielder, Grade 2 defense, Left-handed, Card #14

### Name Fields

Names are stored with a length prefix:
- Byte 0x00: Length of last name (typically 3-12)
- Bytes 0x01-0x0F: Last name in uppercase, space-padded to 15 bytes
- Byte 0x10: Length of first name
- Bytes 0x11-0x1F: First name, space-padded to 15 bytes

Example from hex dump:
```
00000000: 074c 4549 424f 4c44 2020 2020 2020 2020  .LEIBOLD
00000010: 044e 656d 6f20 2020 2020 2020 2020 2020  .Nemo
```

This represents: **LEIBOLD, Nemo** (last name 7 chars, first name 4 chars)

---

## Position Codes

| Code | Position |
|------|----------|
| C | Catcher |
| 1B | First Base |
| 2B | Second Base |
| SS | Shortstop |
| 3B | Third Base |
| OF | Outfield (LF, CF, RF) |
| P | Pitcher |
| DH | Designated Hitter (post-1973) |

---

## Fielding Grades

APBA uses a 1-9 fielding grade scale:

| Grade | Description |
|-------|-------------|
| 1 | Elite defender (Gold Glove caliber) |
| 2 | Excellent defender |
| 3 | Above average defender |
| 4 | Good defender |
| 5 | Average defender |
| 6 | Below average defender |
| 7 | Poor defender |
| 8 | Very poor defender |
| 9 | Liability (rarely used) |

**Note:** Lower numbers are better in APBA's fielding system.

---

## Batting Chart Structure

The batting chart is stored at offsets 0x20-0x85 (102 bytes).

### Dice Roll System

APBA uses 2d6 (two six-sided dice) for all at-bat outcomes:
- Possible rolls: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
- Total combinations: 36 (6 × 6)

### Outcome Distribution

The batting chart maps each dice roll to a specific outcome:

| Roll | Probability | Typical Outcomes |
|------|-------------|------------------|
| 2 | 1/36 (2.78%) | Home Run (power hitters) or Out |
| 3 | 2/36 (5.56%) | Triple or Extra Base Hit |
| 4 | 3/36 (8.33%) | Double or Out |
| 5 | 4/36 (11.11%) | Single or Out |
| 6 | 5/36 (13.89%) | Single or Out (most common) |
| 7 | 6/36 (16.67%) | Single or Out (peak) |
| 8 | 5/36 (13.89%) | Out or Walk |
| 9 | 4/36 (11.11%) | Strikeout or Out |
| 10 | 3/36 (8.33%) | Strikeout or Flyout |
| 11 | 2/36 (5.56%) | Strikeout |
| 12 | 1/36 (2.78%) | Strikeout (automatic for most players) |

### Outcome Codes (from bytes 0x20-0x85)

Each byte in the batting chart represents an outcome code:

| Code | Outcome | Description |
|------|---------|-------------|
| 0x00-0x0F | Out variations | Groundout, flyout, popout, etc. |
| 0x10-0x1F | Single variations | Single to left, center, right |
| 0x20-0x2F | Double variations | Double off wall, gap double, etc. |
| 0x30-0x3F | Triple | Rare, typically to gaps |
| 0x40-0x4F | Home Run | Over fence |
| 0x50-0x5F | Walk | Base on balls |
| 0x60-0x6F | Strikeout | K, swinging or looking |

*(These codes need further verification from outcome tables)*

---

## Game Mechanics

### At-Bat Resolution

1. **Roll 2d6** (2-12)
2. **Look up on batting chart** for that player
3. **Resolve outcome** based on game situation:
   - Runners on base
   - Number of outs
   - Defensive ratings
   - Ballpark factors

### Pitching System

Pitchers have two card types:
1. **Grade A-C Pitchers**: Use pitcher's card primarily
2. **Grade D-E Pitchers**: Use batter's card primarily

This simulates dominant pitchers vs. average/poor pitchers.

### Defense & Errors

Fielding plays are determined by:
- Fielding grade (1-9)
- Position
- Type of ball in play (grounder, liner, flyball)

---

## Sample Data

### Example Players from 1921 Season

#### Player 1: Nemo Leibold (OF)
```
Name: LEIBOLD, Nemo
Position: OF (Outfield)
Grade: 2 (Excellent defender)
Bats: L (Left-handed)
Card Number: 14
```

#### Player 3: Stuffy McInnis (1B)
```
Name: McINNIS, Stuffy
Position: 1B (First Base)
Grade: 5 (Average defender)
Bats: R (Right-handed)
Card Number: 11
```

#### Player 6: Everett Scott (SS)
```
Name: SCOTT, Everett
Position: SS (Shortstop)
Grade: 9 (Poor defender - unusual for SS)
Bats: R (Right-handed)
Card Number: 10
```

---

## Parsing Results

Successfully parsed three APBA seasons:

| Season | Players | File Size |
|--------|---------|-----------|
| 1921 | 491 | 71,832 bytes |
| 1943 | 518 | 75,628 bytes |
| 1971 | 827 | 120,742 bytes |

All player data exported to JSON format for analysis.

---

## Next Steps

1. Parse APBA outcome tables (TABLES directory)
2. Decode batting chart bytes to specific outcomes
3. Understand pitching card structure
4. Document advanced mechanics (base running, injuries, ballparks)
5. Create algorithm to generate APBA-style cards from Lahman stats

---

## References

- APBA Baseball v3 for Windows binary files
- Parsed data: `/data_files/apba_parsed/*.json`
- Parser script: `/scripts/parse_apba_binary.py`

---

**Last Updated:** January 27, 2026
**Status:** Phase 1.1 - Binary format documented, outcome tables pending
