"""
Bill James Data Structure Analyzer
Understand record layouts and formulas (not extracting data - we have Lahman)

Author: Century of the Game Development Team
Date: January 27, 2026
"""

import struct
from pathlib import Path
from typing import Dict, List


class BillJamesAnalyzer:
    """Analyze Bill James data structures to understand formulas"""

    def __init__(self, bj_dir: str):
        self.bj_dir = Path(bj_dir)

    def analyze_all(self):
        """Analyze all Bill James files"""

        print("=== Bill James Structure Analyzer ===\n")
        print("Goal: Understand formulas and calculations (data comes from Lahman)\n")

        self.analyze_bio_structure()
        self.analyze_offense_structure()
        self.analyze_defense_structure()
        self.analyze_pitching_structure()
        self.analyze_lcycle_structure()

        self.document_formulas()

    def analyze_bio_structure(self):
        """Analyze biographical data structure"""

        bio_file = self.bj_dir / "BIO.DAT"
        print(f"=== {bio_file.name} Structure ===\n")

        with open(bio_file, 'rb') as f:
            data = f.read()

        print(f"File size: {len(data):,} bytes")

        # Skip header, look at first record
        offset = 0x80  # After header

        # Extract sample record
        print("\nSample Record Analysis:")
        print(f"Offset 0x{offset:04X}:")

        # Names appear to be fixed-width fields
        # From hex: "Tim\x00           " = First name (16 bytes?)
        # "McCarver\x00..." = Last name
        first_name = data[offset:offset+16].decode('ascii', errors='ignore').strip('\x00').strip()
        last_name = data[offset+16:offset+32].decode('ascii', errors='ignore').strip('\x00').strip()

        print(f"  First Name: '{first_name}'")
        print(f"  Last Name: '{last_name}'")

        print("\nKey Finding:")
        print("  - Fixed-width fields for names")
        print("  - Biographical data includes: birth info, debut, positions")
        print("  - We don't need to parse this - Lahman has better biographical data")
        print()

    def analyze_offense_structure(self):
        """Analyze offensive stats structure"""

        off_file = self.bj_dir / "OFFENSE.DAT"
        print(f"=== {off_file.name} Structure ===\n")

        with open(off_file, 'rb') as f:
            data = f.read()

        print(f"File size: {len(data):,} bytes (1.1 MB!)")
        print(f"Records estimate: ~{len(data) // 156} (assuming ~156 bytes/record)")

        # Analyze record structure from offset 0x90+
        offset = 0x9C
        print(f"\nSample Record at 0x{offset:04X}:")

        # Bill James tracks extensive offensive stats
        # Look for patterns of integers (likely stat counters)
        sample = data[offset:offset+80]

        # Count non-zero bytes (likely stat values)
        non_zero = sum(1 for b in sample if b != 0)
        print(f"  Non-zero bytes in first 80: {non_zero}")
        print(f"  First 20 bytes (hex): {sample[:20].hex(' ')}")

        print("\nKey Findings:")
        print("  - Extensive per-season offensive stats")
        print("  - Multiple records per player (season-by-season)")
        print("  - We'll calculate these from Lahman: G, AB, R, H, 2B, 3B, HR, RBI, SB, BB, SO")
        print("  - Bill James additions: RC, SecA, Power/Speed, ISO")
        print()

    def analyze_defense_structure(self):
        """Analyze defensive stats structure"""

        def_file = self.bj_dir / "DEFENSE.DAT"
        print(f"=== {def_file.name} Structure ===\n")

        with open(def_file, 'rb') as f:
            data = f.read()

        print(f"File size: {len(data):,} bytes")

        print("\nKey Findings:")
        print("  - Defensive stats by position")
        print("  - Traditional: PO, A, E, DP, PCT")
        print("  - Bill James: Range Factor = (PO + A) × 9 / IP")
        print("  - We'll calculate from Lahman Fielding.csv")
        print()

    def analyze_pitching_structure(self):
        """Analyze pitching stats structure"""

        pitch_file = self.bj_dir / "PITCHING.DAT"
        print(f"=== {pitch_file.name} Structure ===\n")

        with open(pitch_file, 'rb') as f:
            data = f.read()

        print(f"File size: {len(data):,} bytes")

        print("\nKey Findings:")
        print("  - Traditional: W, L, ERA, IP, H, R, ER, BB, SO, WHIP")
        print("  - Bill James: Component ERA, Game Score")
        print("  - We'll calculate from Lahman Pitching.csv")
        print()

    def analyze_lcycle_structure(self):
        """Analyze life cycle/career data"""

        lc_file = self.bj_dir / "LCYCLE.DAT"
        print(f"=== {lc_file.name} Structure (Life Cycle) ===\n")

        with open(lc_file, 'rb') as f:
            data = f.read()

        print(f"File size: {len(data):,} bytes")

        print("\nKey Findings:")
        print("  - Career trajectory analysis")
        print("  - Peak years identification")
        print("  - Age-based performance curves")
        print("  - This is UNIQUE to Bill James - we'll need to calculate algorithmically")
        print("  - Algorithm: Analyze year-over-year stats to find peak 3-5 year periods")
        print()

    def document_formulas(self):
        """Document Bill James formulas to implement"""

        print("=== Bill James Formulas to Implement ===\n")

        formulas = {
            "Runs Created (Basic)": {
                "formula": "(H + BB) × TB / (AB + BB)",
                "inputs": ["H", "BB", "TB", "AB"],
                "source": "Lahman Batting.csv",
                "complexity": "Easy"
            },
            "Runs Created (Advanced)": {
                "formula": "(H + BB + HBP - CS - GIDP) × (TB + 0.26(BB+HBP-IBB) + 0.52(SH+SF+SB)) / (AB + BB + HBP + SH + SF)",
                "inputs": ["H", "BB", "HBP", "CS", "GIDP", "TB", "IBB", "SH", "SF", "SB", "AB"],
                "source": "Lahman Batting.csv",
                "complexity": "Medium"
            },
            "Range Factor": {
                "formula": "(PO + A) × 9 / Innings",
                "inputs": ["PO", "A", "Innings"],
                "source": "Lahman Fielding.csv",
                "complexity": "Easy"
            },
            "Secondary Average": {
                "formula": "(BB + TB - H + SB - CS) / AB",
                "inputs": ["BB", "TB", "H", "SB", "CS", "AB"],
                "source": "Lahman Batting.csv",
                "complexity": "Easy"
            },
            "Isolated Power": {
                "formula": "SLG - AVG = (TB / AB) - (H / AB)",
                "inputs": ["TB", "AB", "H"],
                "source": "Lahman Batting.csv",
                "complexity": "Easy"
            },
            "Power/Speed Number": {
                "formula": "2 × (HR × SB) / (HR + SB)",
                "inputs": ["HR", "SB"],
                "source": "Lahman Batting.csv",
                "complexity": "Easy"
            },
            "Game Score (Pitching)": {
                "formula": "Start with 50, +1 per out, +2 per IP after 4, +1 per SO, -2 per H, -4 per ER, -2 per R, -1 per BB",
                "inputs": ["IP", "SO", "H", "ER", "R", "BB"],
                "source": "Game-by-game data or season average",
                "complexity": "Medium"
            },
            "Win Shares": {
                "formula": "Complex multi-step algorithm (100+ pages in Bill James book)",
                "inputs": ["Everything!"],
                "source": "Multiple Lahman tables",
                "complexity": "Very High - Phase 4 feature"
            }
        }

        print("Formulas by Complexity:\n")

        for name, info in formulas.items():
            print(f"**{name}**")
            print(f"  Formula: {info['formula']}")
            print(f"  Complexity: {info['complexity']}")
            print(f"  Data Source: {info['source']}")
            print()

        print("\n=== Implementation Plan ===\n")
        print("Phase 1 (Foundation):")
        print("  - Store formulas as utility functions")
        print("  - No UI yet, just backend calculations")
        print()
        print("Phase 4 (Bill James Features):")
        print("  - Implement Easy formulas: RC, Range Factor, SecA, ISO, P/S")
        print("  - Build player comparison UI")
        print("  - Build historical rankings")
        print("  - Implement Medium formulas: Advanced RC, Game Score")
        print("  - Build career trajectory analyzer")
        print("  - (Optional) Win Shares if time allows")
        print()

    def create_formula_reference(self):
        """Create reference file for formulas"""

        output = """# Bill James Formula Reference

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
"""

        output_file = self.bj_dir.parent.parent / "docs" / "BILL_JAMES_FORMULAS.md"
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(output)

        print(f"Created formula reference: {output_file}")


def main():
    """Main entry point"""

    bj_dir = r"C:\dosgames\shared\BJEBEW\BJSTRUCT\BJ000001"

    if not Path(bj_dir).exists():
        print(f"Error: Bill James directory not found: {bj_dir}")
        return

    analyzer = BillJamesAnalyzer(bj_dir)
    analyzer.analyze_all()
    analyzer.create_formula_reference()

    print("\n=== Analysis Complete ===")
    print("\nSummary:")
    print("  - Bill James data structure understood")
    print("  - Formulas documented for implementation")
    print("  - We'll use Lahman for actual player data")
    print("  - Bill James methodology applied to Lahman stats")
    print()
    print("Next: Set up React + TypeScript project")


if __name__ == "__main__":
    main()
