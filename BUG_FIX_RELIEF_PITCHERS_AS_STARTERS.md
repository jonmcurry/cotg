# Bug Fix: Relief Pitchers Being Drafted as Starting Pitchers

## Problem
Relief pitchers are being drafted into Starting Pitcher (SP) roster slots. This is incorrect - relief pitchers should only be eligible for RP (Relief Pitcher) or CL (Closer) slots.

## Root Cause Analysis

### Current Position Eligibility (draft.types.ts:102-104)
```typescript
'SP': ['P', 'SP'],      // SP slots accept 'P' or 'SP'
'RP': ['P', 'RP'],      // RP slots accept 'P' or 'RP'
'CL': ['P', 'RP', 'CL'] // CL slots accept 'P', 'RP', or 'CL'
```

### Import Script Issue (import-lahman.ts:376)
ALL pitcher-only seasons are assigned `primary_position: 'P'` (generic pitcher):
```typescript
primary_position: 'P',  // Line 376 - NO DIFFERENTIATION
```

### The Problem
1. Relief pitchers get `primary_position = 'P'` in database
2. SP slots accept players with position 'P'
3. Therefore, relief pitchers are eligible for SP slots
4. CPU draft logic and manual assignment modal both allow this

## Solution Strategy

We need to intelligently assign pitcher positions based on their actual role:

### Classification Algorithm
Use games started vs games pitched ratio:
- **SP (Starting Pitcher)**: `games_started / games_pitched >= 0.5` (50%+ starts)
- **CL (Closer)**: `saves >= 10` AND `games_started / games_pitched < 0.5`
- **RP (Relief Pitcher)**: Everything else (pure relievers)

### Implementation Steps

- [x] Update import-lahman.ts to classify pitchers correctly
- [x] Add logic after pitching stats calculation (line 551)
- [x] Use games_started_pitcher and games_pitched to determine role
- [x] Set primary_position to 'SP', 'RP', or 'CL' accordingly
- [ ] Re-import data or run migration script (**USER ACTION: npm run import:lahman**)
- [ ] Test draft to verify relief pitchers cannot go to SP slots (pending data migration)
- [x] Update CHANGELOG.md
- [x] Commit to GitHub

## Testing Checklist

- [ ] Starting pitchers (e.g., Greg Maddux) have primary_position = 'SP'
- [ ] Relief pitchers (e.g., middle relievers) have primary_position = 'RP'
- [ ] Closers (e.g., Mariano Rivera) have primary_position = 'CL'
- [ ] Relief pitchers CANNOT be drafted to SP slots
- [ ] Starting pitchers CAN be drafted to SP slots
- [ ] Closers CAN be drafted to CL or RP slots
- [ ] Relief pitchers CAN be drafted to RP or CL slots

## Example Expected Results

| Pitcher Type | Games | GS | SV | Expected Position |
|--------------|-------|----|----|-------------------|
| Starting Pitcher | 35 | 35 | 0 | SP |
| Swingman | 40 | 15 | 0 | RP (37.5% GS) |
| Elite Closer | 70 | 0 | 45 | CL |
| Setup Man | 65 | 0 | 5 | RP |
| Generic Reliever | 50 | 0 | 2 | RP |

## Files to Modify

1. scripts/import-lahman.ts - Add pitcher classification logic
2. CHANGELOG.md - Document the fix
