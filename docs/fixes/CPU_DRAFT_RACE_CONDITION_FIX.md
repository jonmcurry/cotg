# CPU Draft Race Condition Fix

## Problem
CPU draft attempts to run before backend session status is updated from 'setup' to 'in_progress'.

**Root Cause**: `startDraft()` in draftStore.ts updates local state immediately but saves to backend asynchronously without waiting.

**Sequence of Failure**:
1. Frontend calls `startDraft()`
2. Local state changes to `status: 'in_progress'` immediately
3. `saveSession()` called async (doesn't wait)
4. CPU draft useEffect triggers (sees local 'in_progress')
5. CPU draft API call hits backend
6. Backend still has `status: 'setup'` (saveSession not complete)
7. Backend rejects: "Draft is not in progress (status: setup)"

## Solution
Make `startDraft()` async and wait for backend update before updating local state.

## Checklist

- [ ] Read draftStore.ts to understand current implementation
- [ ] Make `startDraft()` async (change return type)
- [ ] Update `saveSession()` to properly update session status in backend
- [ ] Call `await saveSession()` before updating local state
- [ ] Update DraftControls.tsx to handle async startDraft()
- [ ] Test: Backend status updates before CPU draft runs
- [ ] Clean up debug console.log statements (Rule 5)
- [ ] Commit changes to GitHub (Rule 9)
- [ ] Update CHANGELOG.md (Rule 10)

## Files to Modify
- `src/stores/draftStore.ts` - Fix startDraft() race condition
- `src/components/draft/DraftControls.tsx` - Handle async startDraft()
- `src/components/draft/DraftBoard.tsx` - Remove debug logging
- `CHANGELOG.md` - Document fix

## Testing
1. Create new draft session
2. Click "Start Draft" button
3. Verify backend status updates to 'in_progress' BEFORE CPU draft runs
4. Verify CPU draft proceeds smoothly without "setup" errors
5. Verify continuous CPU drafting until completion
