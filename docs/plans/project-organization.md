# Project Organization Plan

## Overview
Reorganize project folder structure and file names for better clarity and consistency.

## Changes Checklist

### 1. Rename `supabase/` to `database/`
- [x] Rename directory from `supabase/` to `database/`
- [x] Update references in scripts (deploy-migrations.sh, apply-apba-migration.ts)
- [x] Update migrations README.md

### 2. Remove Empty Directories
- [x] Remove empty `src/hooks/` directory

### 3. Clean Up Temporary Files
- [x] Remove `supabase/.temp/` leftover directory

### 4. Organize Test Files
- [x] Move `src/utils/apbaRating.test.ts` to `tests/utils/apbaRating.test.ts`
- [x] Update import path to `../../src/utils/apbaRating`

### 5. Organize Scripts by Purpose
Reorganized structure:
- `scripts/` (root - frequently used scripts)
  - `calculate-apba-ratings.ts`
  - `generate-apba-cards.ts`
- `scripts/analysis/` (Python analysis scripts)
  - `analyze_apba_structure.py`
  - `analyze_bill_james.py`
  - `parse_apba_binary.py`
  - `parse_apba_outcomes.py`
- `scripts/database/` (migration and import scripts)
  - `apply-apba-migration.ts`
  - `deploy-migrations.sh`
  - `deploy-migrations.ts`
  - `import-lahman.ts`
- `scripts/diagnostics/` (debugging scripts)
  - `check-draft-players.ts`
  - `check-ratings.ts`
  - `check-specific-players.ts`
  - `diagnose-all-seasons.ts`
  - `diagnose-player-loading.ts`

### 6. Migration Naming Convention
Kept current naming as changing would require re-running migrations.
- Sequential migrations (001-008) are core schema
- Dated migrations (20260XXX) are incremental changes

## Summary of Changes
1. Renamed `supabase/` -> `database/` (project uses Neon PostgreSQL, not Supabase)
2. Removed empty `src/hooks/` directory
3. Removed `supabase/.temp/` leftover directory
4. Moved test file to proper `tests/` directory
5. Organized scripts into `analysis/`, `database/`, and `diagnostics/` subdirectories
6. Updated file path references in affected scripts
