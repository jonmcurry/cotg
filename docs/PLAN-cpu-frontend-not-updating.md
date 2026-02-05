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

### Likely Causes
1. **API response format mismatch** - Frontend expects different structure than backend returns
2. **applyCpuPicksBatch state update issue** - State not being set correctly
3. **React re-render not triggered** - Zustand store update not causing re-render
4. **UI not reflecting current state** - Picks made but UI showing stale data

## Investigation Steps

### Step 1: Verify API Response Format
Check backend response matches frontend type definition:
- Backend returns: `{ result, picks, picksCount, session: { currentPick, currentRound, status } }`
- Frontend expects: Same structure with specific types

### Step 2: Add Detailed Logging
Add console.log to trace:
1. API response received
2. Before applyCpuPicksBatch called
3. Inside applyCpuPicksBatch - picks being processed
4. After state update - verify session.currentPick updated

### Step 3: Verify State Updates
Check if Zustand store is correctly updating:
- `session.currentPick` should increment
- `session.picks` array should have playerSeasonId filled in
- `session.teams` roster should show filled slots

## Fix Approach
Based on investigation, likely fixes:
1. Ensure API response is properly parsed
2. Verify applyCpuPicksBatch updates state correctly
3. Check if React component re-renders on state change

## Status
- [ ] Add detailed logging
- [ ] Test and capture browser console output
- [ ] Identify exact failure point
- [ ] Implement fix
- [ ] Remove debug logging after fix confirmed
