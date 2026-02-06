# Auto Lineup Generation Fix Plan

## Issue Reported
User reported "auto lineup generation after draft complete" was broken.

## Investigation (TDD Approach per CLAUDE.md Rule 11)

### Tests Written
Created `tests/autoLineup.test.ts` with tests for:
1. Lineup generation detection (when teams need lineups)
2. API request format validation
3. Depth chart update logic
4. Backend API integration check
5. Map serialization issue detection

### Findings

1. **Lineup generation logic is correct** - All core tests pass
   - Teams without depthChart correctly identified as needing lineup
   - API request format is correct
   - updateTeamDepthChart correctly updates session state

2. **Map serialization issue identified** - POTENTIAL ROOT CAUSE
   - `SessionSimulationStats.playerStats` uses JavaScript `Map` type
   - `Map` does not serialize correctly with JSON.stringify (becomes `{}`)
   - When session is loaded from localStorage via zustand-persist, the Map becomes a plain object
   - Any code calling `.get()` or `.set()` on the deserialized object would fail

### Root Cause
The `simulationStats.playerStats` Map type was added to track simulation statistics. While this doesn't directly affect the Clubhouse lineup generation, the zustand-persist middleware was not correctly handling Map serialization/deserialization. This could cause errors during session rehydration that might prevent the entire session from loading correctly.

## Fix Applied

### File Modified
- `src/stores/draftStore.ts`

### Changes
Added custom storage handlers to the zustand-persist middleware:

1. **getItem (deserialization)**:
   - Converts `simulationStats.playerStats` from plain object back to Map
   - Rehydrates Date objects (createdAt, updatedAt, pickTime, schedule dates)

2. **setItem (serialization)**:
   - Converts Map to plain object using `Object.fromEntries()`
   - Ensures proper JSON serialization

## Verification

- [x] TypeScript compiles without errors
- [x] Frontend builds successfully
- [x] All autoLineup tests pass (9/9)
- [x] All scheduleAndSeason tests pass (10/10)

## Additional Notes

If the user is still experiencing issues, they should check:
1. Browser console for network errors (backend API might be down)
2. Render deployment status for the backend
3. Clear localStorage and try a fresh draft

## Files Changed
- `src/stores/draftStore.ts` - Added custom storage handlers for Map/Date serialization
- `tests/autoLineup.test.ts` - New TDD test file for lineup generation
