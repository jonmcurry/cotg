# Next Steps - CPU Draft Error Diagnosis

## Current Status
- ✅ Added comprehensive diagnostic logging (commits e079c90, 49da8ea, 1041be4)
- ✅ Added automatic retry with exponential backoff (commit 9e5b192)
- Frontend now automatically retries CPU draft errors up to 3 times before showing error modal

## Automatic Retry Behavior (Commit 9e5b192)
CPU draft now automatically retries on errors:
- **1st error**: Wait 1s, auto-retry
- **2nd error**: Wait 2s, auto-retry
- **3rd error**: Wait 4s, auto-retry
- **4th error**: Show error modal, pause draft (manual intervention required)

This means most transient errors will resolve automatically without user seeing the error modal.

## What Was Added (Commit 1041be4)
Enhanced logging in `backend/src/routes/cpu.ts`:

### Entry Point Logging
- Request parameters (seasons array, excludePlayerSeasonIds)
- Session state (season_year, selected_seasons from database)

### Selection Process Logging
- Total player pool size
- Drafted players count
- Excluded players count
- Available players after filtering
- Unfilled positions list
- Eligible players per position
- Final candidate count
- Roster state when selection fails

### Warning Detection
- Warns if `seasons` array is empty/undefined
- Indicates potential database persistence issue with selectedSeasons

## Deployment Required
**Deploy backend to Render** to activate diagnostic logging:
1. Go to https://dashboard.render.com
2. Find your backend service
3. Click "Manual Deploy"
4. Wait for deployment

## How to Diagnose

### Step 1: Reproduce the Error
1. Start a draft or use existing paused draft
2. If error modal appears, note: CPU already tried 4 times automatically
3. Check browser console for retry logs: `[CPU Draft] RETRY Attempt X/3`
4. Check server logs (Render dashboard) for detailed diagnostics

### Step 2: Analyze the Logs
Look for these key log messages in **server logs** (Render dashboard → Logs):

```
[CPU API] Received request: { sessionId, seasons, seasonsType, seasonsLength, excludedCount }
```
**Check**: Is `seasons` array empty or undefined?

```
[CPU API] Loading player pool: { requestSeasons, sessionSeasonYear, sessionSelectedSeasons, finalYearList }
```
**Check**: What's in `sessionSelectedSeasons`? Is it empty?

```
[CPU API] WARNING: No seasons provided in request
```
**If you see this**: Frontend is sending empty seasons array

```
[selectBestPlayer] Starting selection: { totalPlayers, draftedCount, excludedCount }
```
**Check**: Is `totalPlayers` too small? Should be ~1000 for multiple seasons

```
[selectBestPlayer] After filtering: { undraftedCount }
```
**Check**: Are all players being filtered out?

```
[selectBestPlayer] Unfilled positions: { positions, count }
```
**Check**: What positions need to be filled?

```
[selectBestPlayer] Position <POS>: { eligibleCount, weight }
```
**Check**: For each position, how many eligible players exist?

```
[selectBestPlayer] FAIL: <reason>
```
**This shows exactly why selection failed**

## Likely Root Causes

### Scenario 1: Empty selectedSeasons (Most Likely)
**Symptoms**:
- `seasons` array is empty or undefined
- `sessionSelectedSeasons` is `[]` or `null`
- `totalPlayers` is small (< 100)
- Falling back to single season

**Cause**: Session created before migration, has empty `selected_seasons` in database

**Fix**:
1. If existing session: Manually set selectedSeasons
2. For new sessions: Verify frontend sends selectedSeasons during creation
3. Check backend GET endpoint returns selected_seasons

### Scenario 2: Too Much Filtering
**Symptoms**:
- `totalPlayers` is large (> 500)
- `draftedCount` is large
- `undraftedCount` after filtering is 0

**Cause**: All players already drafted or excluded

**Fix**: Verify draft isn't already complete, check excludePlayerSeasonIds logic

### Scenario 3: No Eligible Players for Position
**Symptoms**:
- `undraftedCount` is positive
- Each position shows `eligibleCount: 0`
- Position eligibility too restrictive

**Cause**: Position eligibility validation (Issue #10) blocking all players

**Fix**: Check POSITION_ELIGIBILITY mapping, verify player primary_positions

### Scenario 4: Roster State Incorrect
**Symptoms**:
- `uniqueUnfilledPositions` shows `count: 0`
- But draft not complete (round < 21)
- Roster shows all positions filled incorrectly

**Cause**: Roster reconstruction bug

**Fix**: Check roster building logic in loadSession

## After Diagnosing
Once you identify the root cause from logs, update:
- `cpu-draft-error-investigation.md` with findings
- Create fix following CLAUDE.md rules
- Test with fresh draft session

## Questions to Answer
1. What is in the `seasons` array sent to CPU endpoint?
2. What is `session.selected_seasons` in the database?
3. How many players in the pool after loading?
4. How many players after filtering (drafted + excluded)?
5. What positions are unfilled?
6. For each unfilled position, how many eligible players?
7. Why did `selectBestPlayer()` return null?
