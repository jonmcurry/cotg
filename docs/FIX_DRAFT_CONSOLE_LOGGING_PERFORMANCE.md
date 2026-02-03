# Fix: Draft Console Logging Performance

## Problem

Chrome runs extremely slowly during CPU drafting, causing the draft to crawl at a snail's pace.

## Root Cause

Excessive `console.log` calls in the draft hot paths. The CPU draft scoring functions (`calculateWeightedScore`, `calculateVolumeMultiplier`, `adjustScarcityByRound`) each contained multiple `console.log` calls that fired for every candidate player for every unfilled position.

With ~1000 candidates and ~10 unfilled positions, this produced **~60,000 console.log calls per CPU pick**. Over a full draft with 21 rounds and 8+ teams, this results in millions of synchronous console.log calls that block Chrome's main thread.

Chrome's `console.log` is synchronous - each call blocks the main thread while the message is serialized and sent to DevTools, causing the UI to freeze.

## Fix

### Change 1: Remove all info/debug logging from `cpuDraftLogic.ts`
- Removed `console.log` from `calculateVolumeMultiplier` (6 calls per candidate)
- Removed `console.log` from `calculateWeightedScore` (platoon + score breakdown)
- Removed `console.log` from `adjustScarcityByRound` (3 calls per position)
- Removed `console.log` from `selectBestPlayer` (candidate lists, selection result)
- Removed unused `existingSwitchHitters` variable (only consumed by logging)
- Kept `console.error` for missing slot errors

### Change 2: Remove all info/debug logging from `DraftBoard.tsx`
- Removed all `console.log`, `console.time`, `console.timeEnd` from CPU draft effect and UI handlers
- Kept `console.warn` and `console.error` calls

### Change 3: Remove all info/debug logging from `TabbedPlayerPool.tsx`
- Removed `performance.now()` timing and associated `console.log` calls from memo calculations
- Kept `console.error` for bug detection (pitchers in position players pool)

### Change 4: Remove all info/debug logging from `draftStore.ts`
- Removed `console.log` from `makePick`, `createSession`, `loadSession`, `saveSession`
- Prefixed `_sessionData`, `_teamsData`, `_picksData` (unused pending TODO completion)
- Kept all `console.error` and `console.warn` calls

### Change 5: Remove all info/debug logging from `Clubhouse.tsx`
- Removed 3 `console.log` calls (loading progress, batch count, schedule generation)
- Kept 2 `console.error` calls

## Files Modified
- [x] `src/utils/cpuDraftLogic.ts` - Remove hot-path logging
- [x] `src/components/draft/DraftBoard.tsx` - Remove draft logging
- [x] `src/components/draft/TabbedPlayerPool.tsx` - Remove timing logging
- [x] `src/stores/draftStore.ts` - Remove store logging
- [x] `src/components/clubhouse/Clubhouse.tsx` - Remove loading logging

## Verification
- `npm run build` compiles without errors
- Draft should run smoothly in Chrome without DevTools-induced slowdown
- Warnings and errors still appear in console for real problems
