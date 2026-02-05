# CPU Batch Empty Picks Bug Fix Plan

## Issue
Starting a draft causes the CPU to wait but never makes picks. The UI appears stuck.

## Root Cause Analysis
When the CPU batch endpoint returns with 0 picks (e.g., when the first team isn't CPU in the database), the frontend `applyCpuPicksBatch` function returns early without updating the session state:

```typescript
// draftStore.ts line 536
if (!session || picks.length === 0) {
  console.log('[applyCpuPicksBatch] EARLY RETURN...')
  return  // <-- Bug: session state not updated!
}
```

This causes:
1. The backend returns `{ result: 'success', picks: [], session: {...} }`
2. `applyCpuPicksBatch` is called with empty picks but valid sessionUpdate
3. Early return prevents session state from being updated
4. useEffect dependencies don't change (`session?.currentPick`, etc.)
5. useEffect doesn't re-run
6. Draft appears stuck

## Fix
Modify `applyCpuPicksBatch` to update session state even when picks array is empty. The session update from the backend should always be applied to ensure frontend/backend synchronization.

## Test Case
1. Call `applyCpuPicksBatch` with empty picks array but valid sessionUpdate
2. Verify session state IS updated (not ignored)
3. Verify useEffect can re-trigger based on state change

## Implementation Steps
- [x] Write test to reproduce bug
- [x] Fix `applyCpuPicksBatch` to not early-return when only picks is empty
- [x] Verify test passes
- [x] Update CHANGELOG.md
- [ ] Commit to GitHub
