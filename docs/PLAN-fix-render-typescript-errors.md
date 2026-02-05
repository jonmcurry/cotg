# Plan: Fix Render TypeScript Errors

## Problem
Render deployment failing with TypeScript errors after Neon migration.

## Errors to Fix
- [x] `@types/pg` missing - moved from devDependencies to dependencies
- [x] `db.ts:26` - `err` parameter needs type -> `Error`
- [x] `draft.ts:128,179,190,207,301` - Added `DbSessionRow`, `DbTeamRow`, `DbPickRow` interfaces
- [x] `picks.ts:62` - Added `DbPickRow` interface
- [x] `schedule.ts:254` - Added `DbTeamRow` interface

## Solution
1. Moved @types/pg from devDependencies to dependencies (Render doesn't install devDeps in production)
2. Added explicit database row interfaces for type safety
3. Build tested successfully locally
4. Committed and pushed

## Status: COMPLETE
