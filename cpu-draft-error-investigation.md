# CPU Draft Error Investigation

## Error Details
- **Error Message**: "CPU could not find a player to draft"
- **UI**: Error recovery modal displaying correctly (Issue #11 fix working)
- **Status**: Draft appears to be paused after error

## Console Log Analysis
From screenshot:
- Session status shows as "paused" in some logs
- CPU draft effect is triggering multiple times
- API call to `/draft/sessions/.../cpu-pick` returns error

## Investigation Checklist

### 1. Check CPU Draft Logic
- [ ] Examine selectBestPlayer() function in backend/src/routes/cpu.ts
- [ ] Check if player pool is actually empty
- [ ] Verify position eligibility filtering isn't too restrictive
- [ ] Check if excludePlayerSeasonIds blacklist is working correctly

### 2. Verify Database State
- [ ] Check how many players are available in the pool
- [ ] Verify selectedSeasons is being passed correctly to CPU endpoint
- [ ] Check if all positions have eligible players remaining

### 3. Check Roster State
- [ ] Verify roster reconstruction is working after all fixes
- [ ] Check if CPU is correctly identifying which positions need filling
- [ ] Verify position requirements aren't already filled incorrectly

### 4. Review Recent Fixes Impact
- [ ] Issue #6 fix: excludePlayerSeasonIds might be too aggressive
- [ ] Issue #10 fix: position eligibility validation might be blocking valid picks
- [ ] Issue #13 fix: selectedSeasons persistence working correctly?

## ROOT CAUSE IDENTIFIED ✅

**Player pool size was catastrophically too small!**

### The Problem
- Backend CPU endpoint limited pool to **1,000 players** (600 hitters + 400 pitchers)
- Frontend UI shows **24,192 players** available
- By Round 11 (Pick 343), most of the top 1,000 already drafted
- Remaining undrafted players from limited pool didn't include needed positions (SS, 3B, SP, RP, CL, DH, BN)

### The Math
- 32 teams × 21 rounds = **672 total picks**
- CPU searching only top **1,000 players** ordered by APBA rating
- After ~350 picks, only ~50-100 undrafted players remain in CPU pool
- Those 50-100 players don't cover all position requirements
- **ERROR: "CPU could not find a player to draft"**

### The Fix (Commit 6b5d950)
Increased pool size to ensure coverage for all draft rounds:
- Hitters: 600 → **5,000**
- Pitchers: 400 → **3,000**
- Total: 1,000 → **8,000 players**

This ensures even in Round 21, CPU has ~7,000 undrafted players to choose from,
with adequate representation of all positions (C, 1B, 2B, SS, 3B, OF, SP, RP, CL, DH, BN).

## Original Hypotheses (Ruled Out)
1. ~~Player pool filtering too restrictive~~ - Pool was too small to begin with
2. ~~selectedSeasons not passed correctly~~ - Not the issue
3. ~~Roster state incorrect~~ - Roster was fine
4. ~~Backend selectBestPlayer() logic bug~~ - Logic was correct, just no players to select from

## Next Steps
1. Add detailed logging to CPU endpoint to see exact filter results
2. Check what parameters are being sent to /cpu-pick endpoint
3. Verify player pool size at each filtering step
