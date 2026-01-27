# Changelog

All notable changes to the Century of the Game project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - 2026-01-27

- Created comprehensive implementation plan document (`docs/IMPLEMENTATION_PLAN.md`)
- Updated Baseball_Fantasy_Draft_SRD.md with project configuration decisions (Section 0)
- Documented 8 foundational project decisions:
  1. Scope: Both draft system + game simulation (phased approach)
  2. Directory: c:\users\jonmc\dev\cotg
  3. Data Architecture: Supabase for all data
  4. Source Data: Lahman database at `data_files/lahman_1871-2025_csv`
  5. APBA Cards: Full reverse engineering of mechanics
  6. Bill James: Extract all features
  7. Branding: Century of the Game (vintage heritage theme)
  8. Tech Stack: React + TypeScript (server-side hosted)
- Explored APBA binary data structure (PLAYERS.DAT format)
- Analyzed Lahman CSV files (28 files, 1871-2025 data)
- Created project roadmap with 5 phases:
  - Phase 1: Foundation & Data Pipeline (3-4 weeks)
  - Phase 2: Draft System (2-3 weeks)
  - Phase 3: Game Simulation Engine (4-5 weeks)
  - Phase 4: Bill James Features (1-2 weeks)
  - Phase 5: Polish & Production (2-3 weeks)
- Designed preliminary Supabase database schema
- Defined technology stack: React 18+, TypeScript, Vite, Tailwind CSS, Supabase
- Created CHANGELOG.md to track project changes

### Technical Details

- Identified APBA player record structure (~150-180 bytes per player)
- Located 3 sample APBA seasons: 1921, 1943, 1971
- Found APBA outcome tables in TABLES directory
- Located Bill James data structures in BJSTRUCT and BJOBJECT directories
- Confirmed Lahman data completeness: People.csv, Batting.csv, Pitching.csv, etc.

### Completed - 2026-01-27 (Later)

- Successfully parsed APBA PLAYERS.DAT binary format
- Created Python parser script (`scripts/parse_apba_binary.py`)
- Determined exact record structure: 146 bytes per player
- Parsed three APBA seasons:
  - 1921: 491 players
  - 1943: 518 players
  - 1971: 827 players
- Documented APBA file format in `docs/APBA_REVERSE_ENGINEERING.md`
- Extracted player data: name, position, fielding grade, bats, card number
- Exported all parsed data to JSON format

### Completed - 2026-01-27 (Evening)

- Parsed APBA outcome tables (TABLES directory)
- Created outcome parser script (`scripts/parse_apba_outcomes.py`)
- Extracted 127 main outcomes and 453 numeric outcomes
- Documented outcome message system with dynamic player/team insertion
- Documented pitcher grade system (A-E)
- Completed Phase 1.1: APBA Reverse Engineering ✅

### Phase 1.1 Summary

**APBA Reverse Engineering - COMPLETE**
- Player card format: 146 bytes, fully documented
- Seasons parsed: 1921 (491), 1943 (518), 1971 (827) = 1,836 total players
- Outcome tables: 127 gameplay messages decoded
- Game mechanics: 2d6 dice system, pitcher grades, outcome resolution
- All findings documented in `docs/APBA_REVERSE_ENGINEERING.md`

### In Progress - 2026-01-27 (Evening)

- Analyzing Bill James Baseball Encyclopedia structure
- Identified key data files: BIO, OFFENSE, DEFENSE, PITCHING, LCYCLE
- Documented Bill James advanced metrics (Runs Created, Range Factor, Win Shares)
- Created `docs/BILL_JAMES_FEATURES.md` with comprehensive analysis
- Total Bill James database: ~5.1MB (vs APBA's ~72KB per season)

### Decision Point

**Bill James Parsing Options:**
1. **Quick extraction** - Get enough data to understand structure, defer full parsing
2. **Complete parsing** - Parse all files now before moving to React setup
3. **Progressive** - Parse basics now, advanced features in Phase 4

### Next Steps

- Complete Phase 1.2 Bill James analysis (pending user direction)
- Phase 1.3: Set up React + TypeScript project
- Phase 1.4: Design Supabase database schema

---

## Version History

- **v0.1.0** (2026-01-27): Planning phase, documentation created
