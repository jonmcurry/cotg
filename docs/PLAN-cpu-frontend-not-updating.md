# Plan: CPU Picks Frontend Not Updating

## Problem Statement
- Render logs show picks ARE being processed (217, 218, 219, 220, 221)
- Frontend UI is NOT updating to show the picks
- Backend is working correctly; this is a frontend state synchronization issue

## Root Cause Analysis

### Evidence
1. `[SessionCache] Updated cache after pick 217-221` - Backend processing picks
2. User reports "cpu isn't picking" - Frontend UI not reflecting changes
3. No errors in console or Render - Silent failure

### Root Cause Found: useEffect Cleanup Re-entry Bug
The useEffect cleanup function was resetting `cpuDraftInProgressRef.current = false`:

```javascript
return () => {
  cancelled = true
  cpuDraftInProgressRef.current = false  // <-- BUG: This allows re-entry!
}
```

When `applyCpuPicksBatch` updates the session state:
1. Zustand state updates synchronously
2. React schedules re-render with new dependencies
3. Cleanup runs, setting `cpuDraftInProgressRef.current = false`
4. New effect instance runs with guard disabled
5. ANOTHER batch API call is made

This caused multiple simultaneous batch calls, explaining the rapid pick progression.

## Fix Applied

Changed cleanup to only set `cancelled = true`, letting the `finally` block handle the guard:

```javascript
return () => {
  cancelled = true
  // NOTE: Do NOT set cpuDraftInProgressRef.current = false here!
  // That causes multiple batch calls when state updates trigger useEffect re-run
}
```

The `finally` block already properly resets the guard when the async operation completes:

```javascript
} finally {
  cpuDraftInProgressRef.current = false
  setCpuThinking(false)
}
```

## Status
- [x] Add detailed logging (commit cb89138)
- [x] Identify root cause - useEffect cleanup re-entry bug
- [x] Implement fix (commit 09e6eb5)
- [ ] Test and verify fix works
- [ ] Remove debug logging after fix confirmed
