# Fix: Bench Slots Filled With Pitchers Instead of Position Players

## Problem

Draft completes successfully, but reserve/bench (BN) slots are mostly filled with pitchers. Bench players should be position players only.

## Root Cause

Three factors combined to fill bench with pitchers:

1. **`POSITION_ELIGIBILITY['BN']`** included pitcher positions (`'P', 'SP', 'RP'`)
2. **`meetsPlayingTimeRequirements`** for BN accepted pitchers (`inningsPitchedOuts >= 90`)
3. **`getPositionTypeBonus`** gives pitchers a 1.15x bonus in rounds 11+ (when bench is typically filled)

Since bench is filled last (scarcity 0.5), it happens in late rounds where pitchers get the 1.15x bonus. Combined with pitchers being eligible for BN, the CPU preferentially drafted pitchers to bench.

## Fix

### Change 1: Remove pitcher positions from BN eligibility (`src/types/draft.types.ts`)
- Removed `'P'`, `'SP'`, `'RP'` from `POSITION_ELIGIBILITY['BN']`
- Bench slots can now only be filled by position players

### Change 2: Restrict BN playing time to position players (`src/utils/cpuDraftLogic.ts`)
- Changed `meetsPlayingTimeRequirements` for BN from `atBats >= 200 || inningsPitchedOuts >= 90` to `atBats >= 200` only
- Updated docstring to reflect the new rule

## Files Modified
- [x] `src/types/draft.types.ts` - Remove pitcher positions from `POSITION_ELIGIBILITY['BN']`
- [x] `src/utils/cpuDraftLogic.ts` - Restrict BN playing time to position players only

## Verification
- `npm run build` compiles without errors
- All bench slots should be filled with position players (not pitchers)
- Pitching slots (SP, RP, CL) should still fill correctly
