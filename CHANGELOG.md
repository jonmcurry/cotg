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

### Next Steps

- Await user approval on implementation plan
- Begin Phase 1.1: APBA reverse engineering
- Parse APBA binary files with Python/TypeScript
- Document APBA mechanics in detail

---

## Version History

- **v0.1.0** (2026-01-27): Planning phase, documentation created
