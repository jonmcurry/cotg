# Plan: Fix Clubhouse Screen Flickering

## Problem
After draft completion, the Clubhouse screen (Official Roster, Lineups, Rotation tabs) constantly flickers/refreshes in an infinite loop.

## Root Cause Analysis

### The Infinite Loop Chain

1. **First useEffect (Clubhouse.tsx:83-117)** loads drafted players
   - Dependencies: `[seasonIdsCacheKey, session.teams]`
   - **BUG**: `session.teams` is redundant - `seasonIdsCacheKey` already derives from it
   - When triggered, calls `setLoading(true)` then `setLoading(false)` after fetch

2. **Second useEffect (Clubhouse.tsx:121-155)** auto-generates depth charts
   - Dependencies: `[loading, players.length, session.teams, updateTeamDepthChart]`
   - When `loading` becomes `false`, runs and calls `updateTeamDepthChart()`

3. **updateTeamDepthChart (draftStore.ts:309-330)**
   - Calls `set({ session: updatedSession })` which creates new `session.teams` reference

4. **Loop**: New `session.teams` reference triggers Step 1 → back to Step 2 → repeat forever

### Secondary Issues
- LineupEditor.tsx:42 and RotationEditor.tsx:39 have `team.depthChart` in dependencies
- When depthChart updates, these effects could also retrigger unnecessarily

## Fix Checklist

- [x] **Fix 1**: Remove `session.teams` from first useEffect deps (line 117)
  - `seasonIdsCacheKey` is already derived from teams, this is redundant

- [x] **Fix 2**: Add `useRef` guard in second useEffect to prevent re-runs
  - Track which teams have had lineups generated this session
  - Only generate once per mount, not on every teams change

- [x] **Fix 3**: Review LineupEditor/RotationEditor init effects
  - These are fine - they check if depthChart is missing before initializing

## TDD Approach

1. Write test that reproduces the infinite re-render scenario
2. Verify test fails (proves bug exists)
3. Apply fixes
4. Verify test passes

## Files to Modify
- `src/components/clubhouse/Clubhouse.tsx`
- `src/components/clubhouse/LineupEditor.tsx` (if needed)
- `src/components/clubhouse/RotationEditor.tsx` (if needed)
