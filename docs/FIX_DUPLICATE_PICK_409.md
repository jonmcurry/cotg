# Fix: 409 Duplicate Pick Errors at Draft Start

## Problem

Starting a new draft produces 409 (duplicate key) errors on `draft_picks` table from the very first few picks. The unique constraint `draft_picks_draft_session_id_pick_number_key` is violated, meaning `makePick` is being called multiple times for the same pick number.

## Root Cause

**React 18 StrictMode double-execution of effects.**

The app wraps in `<React.StrictMode>` (`src/main.tsx:7`). In development mode, React 18 StrictMode simulates unmount/remount to expose side-effect bugs:

1. DraftBoard mounts -> CPU draft `useEffect` fires -> `draftInProgress.current = true` -> async IIFE starts
2. React unmounts DraftBoard (StrictMode simulation)
3. React remounts DraftBoard -> **NEW** `draftInProgress` ref (starts as `false`!) -> CPU effect fires **again**
4. Two concurrent async IIFEs both call `makePick` for the same pick number -> 409 conflict

The current code has a comment saying "No cleanup function - the ref guard prevents concurrent operations" but this is incorrect for StrictMode since refs are recreated on remount.

## Fix Plan

### Change 1: Add StrictMode-safe cleanup to CPU draft effect (`DraftBoard.tsx`)

Add a local `cancelled` boolean in the effect that gets set to `true` in the cleanup function. The async IIFE checks this flag before calling `makePick`, so the first mount's operation is aborted when React unmounts/remounts.

```typescript
useEffect(() => {
    let cancelled = false  // StrictMode cleanup flag

    // ... existing guard checks ...

    draftInProgress.current = true
    setCpuThinking(true)

    ;(async () => {
        try {
            // ... player selection logic ...

            if (cancelled) return  // Abort if component was unmounted (StrictMode)

            if (selection) {
                await makePick(...)
            }
        } finally {
            if (!cancelled) {
                draftInProgress.current = false
                setCpuThinking(false)
            }
        }
    })()

    return () => { cancelled = true }  // Cleanup: cancel on unmount
}, [...deps])
```

### Change 2: Use `upsert` for draft_picks as safety net (`draftStore.ts`)

Change the `insert` in `makePick` to `upsert` with `onConflict: 'draft_session_id,pick_number'`. This makes the operation idempotent - if a pick already exists for this session+number, it updates rather than failing. This is a defense-in-depth measure for any remaining race conditions (page refresh, slow network, etc.).

### Change 3: Add concurrency guard for human picks (`DraftBoard.tsx`)

Add a `pickInProgress` ref guard to `handleConfirmPick` to prevent double-clicks or rapid submissions from triggering two `makePick` calls for the same pick.

## Files to Modify

- [x] `src/components/draft/DraftBoard.tsx` - StrictMode cleanup + human pick guard
- [x] `src/stores/draftStore.ts` - upsert instead of insert

## Verification

- `npm run build` compiles without errors
- Start a new draft in dev mode (StrictMode active) - no 409 errors in console
- CPU picks proceed smoothly without duplicate warnings
- Human picks work correctly with no double-submission
