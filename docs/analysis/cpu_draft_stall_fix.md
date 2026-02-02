# CPU Draft Stall Fix - Only One Pick Executes

**Date:** 2026-02-02

## Problem

CPU draft makes exactly one pick, then stalls. Console shows:
```
[CPU Draft] useEffect triggered
[CPU Draft] Early return - CPU already thinking
```

The "CPU is drafting... Please wait." overlay remains indefinitely.

## Root Cause

Timing mismatch between optimistic state updates and React effect re-triggering:

1. The `makePick` store function updates `session.currentPick` **optimistically** (before DB write completes)
2. This triggers the CPU draft useEffect (dependency: `session.currentPick`)
3. But `cpuThinking` state is still `true` (the `finally` block hasn't run yet - still awaiting DB write)
4. Effect early returns at the `cpuThinking` guard
5. When `finally` runs and sets `setCpuThinking(false)`, no effect re-trigger occurs because `cpuThinking` is **intentionally excluded** from the dependency array

The `draftInProgress` ref has the same problem - it's also still `true` when the premature re-trigger happens.

## Fix

- [x] 1. Remove `setTimeout(fn, 0)` pattern - use async IIFE directly (eliminates cleanup-related race conditions)
- [x] 2. Remove `cpuThinking` STATE from effect guard checks (stale closure value, redundant with ref)
- [x] 3. Keep `draftInProgress.current` REF as sole concurrency guard
- [x] 4. Add `cpuThinking` to dependency array so effect re-runs when it transitions false (picks up next team)
- [x] 5. Remove cleanup function that was setting `setCpuThinking(false)` (was part of original race condition)

## Why This Is Safe

- `draftInProgress.current` is a ref - synchronous, not subject to React batching
- Without `setTimeout`, there's no cleanup that can prematurely cancel or reset anything
- Adding `cpuThinking` to deps causes a re-run when it goes true (harmless, ref blocks it) and when it goes false (desired - triggers next pick)
- The ref guard prevents duplicate picks regardless of how many times the effect runs
