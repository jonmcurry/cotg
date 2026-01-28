# Implementation Plan: Platoon Awareness & Draft Round Awareness

## Overview
Implement two enhancements to CPU draft logic based on reverse engineering analysis of APBA BBW and Bill James Encyclopedia.

### Enhancement 1: Platoon Awareness
Add consideration for batter handedness (L/R/S) to create balanced lineups.

### Enhancement 2: Draft Round Awareness
Adjust position scarcity weights based on draft phase (early/mid/late rounds).

---

## Implementation Checklist

### Phase 1: Data Model Updates
- [ ] Add `bats` field to PlayerSeason interface (L/R/S/null)
- [ ] Verify `bats` field exists in database player_seasons table
- [ ] Update DraftBoard query to include `bats` field
- [ ] Add `bats` field to roster slot tracking (for platoon bonus calculation)

### Phase 2: Platoon Awareness Implementation
- [ ] Modify `calculateWeightedScore()` to accept team parameter
- [ ] Add platoon bonus calculation logic:
  - Count existing lefties, righties, switch hitters in lineup
  - Apply 5% bonus for minority handedness
  - Apply 10% bonus for switch hitters
  - Only apply to position players (not pitchers)
- [ ] Update `selectBestPlayer()` to pass team to `calculateWeightedScore()`
- [ ] Store bats info in roster slots when pick is made

### Phase 3: Draft Round Awareness Implementation
- [ ] Create `adjustScarcityByRound()` function
- [ ] Logic:
  - Rounds 1-5: Increase scarcity weight by 20%
  - Rounds 6-15: Use base scarcity weight
  - Rounds 16+: Decrease scarcity weight by 20%
- [ ] Pass currentRound to `selectBestPlayer()`
- [ ] Apply adjusted weights in position selection

### Phase 4: Integration
- [ ] Update DraftBoard to pass currentRound to selectBestPlayer
- [ ] Ensure session.currentRound is available and correct
- [ ] Update type signatures and exports

### Phase 5: Documentation & Testing
- [ ] Update CHANGELOG.md with enhancement details
- [ ] Add inline code comments explaining logic
- [ ] Test with CPU draft to verify behavior
- [ ] Check console logs for platoon/round adjustments

### Phase 6: Commit
- [ ] Stage all changes
- [ ] Create comprehensive commit message
- [ ] Push to github

---

## Technical Specifications

### 1. PlayerSeason Interface Update

**File:** `src/utils/cpuDraftLogic.ts`

```typescript
export interface PlayerSeason {
  id: string
  player_id: string
  year: number
  team_id: string
  primary_position: string
  bats: 'L' | 'R' | 'S' | null  // ADD THIS

  // ... rest of interface
}
```

### 2. Platoon Bonus Calculation

**File:** `src/utils/cpuDraftLogic.ts`

```typescript
function calculateWeightedScore(
  player: PlayerSeason,
  position: PositionCode,
  team: DraftTeam,  // ADD team parameter
  randomizationFactor: number = 0.1
): number {
  const rating = player.apba_rating || 0
  const scarcityWeight = POSITION_SCARCITY[position] || 1.0

  // Platoon bonus: reward balanced lineup
  let platoonBonus = 1.0

  // Only apply to position players (not SP, RP, CL)
  if (position !== 'SP' && position !== 'RP' && position !== 'CL') {
    const filledRoster = team.roster.filter(s => s.isFilled)

    const existingLefties = filledRoster.filter(s => s.playerBats === 'L').length
    const existingRighties = filledRoster.filter(s => s.playerBats === 'R').length
    const existingSwitchHitters = filledRoster.filter(s => s.playerBats === 'S').length

    console.log(`[CPU Draft] Platoon check - Team has L:${existingLefties} R:${existingRighties} S:${existingSwitchHitters}`)

    // Prefer minority handedness for balance
    if (player.bats === 'L' && existingLefties < existingRighties) {
      platoonBonus = 1.05  // 5% bonus
      console.log(`[CPU Draft] Platoon bonus: +5% for lefty (minority)`)
    } else if (player.bats === 'R' && existingRighties < existingLefties) {
      platoonBonus = 1.05  // 5% bonus
      console.log(`[CPU Draft] Platoon bonus: +5% for righty (minority)`)
    } else if (player.bats === 'S') {
      platoonBonus = 1.10  // 10% bonus (switch hitters valuable)
      console.log(`[CPU Draft] Platoon bonus: +10% for switch hitter`)
    }
  }

  const randomness = 1 + (Math.random() * 2 - 1) * randomizationFactor

  const finalScore = rating * scarcityWeight * platoonBonus * randomness

  console.log(`[CPU Draft] Score calculation: rating=${rating} × scarcity=${scarcityWeight} × platoon=${platoonBonus} × random=${randomness.toFixed(3)} = ${finalScore.toFixed(2)}`)

  return finalScore
}
```

### 3. Draft Round Awareness

**File:** `src/utils/cpuDraftLogic.ts`

```typescript
/**
 * Adjust position scarcity weight based on draft round
 * Early rounds: Emphasize scarcity (+20%)
 * Mid rounds: Use base weights
 * Late rounds: De-emphasize scarcity (-20%), focus on BPA
 */
function adjustScarcityByRound(
  baseWeight: number,
  currentRound: number
): number {
  // Early rounds (1-5): Emphasize scarcity more
  if (currentRound <= 5) {
    const adjusted = baseWeight * 1.2
    console.log(`[CPU Draft] Round ${currentRound} (early): Scarcity ${baseWeight} → ${adjusted.toFixed(2)} (+20%)`)
    return adjusted
  }

  // Mid rounds (6-15): Use base weights
  if (currentRound <= 15) {
    console.log(`[CPU Draft] Round ${currentRound} (mid): Scarcity ${baseWeight} (base)`)
    return baseWeight
  }

  // Late rounds (16+): Reduce scarcity emphasis, focus on BPA
  const adjusted = baseWeight * 0.8
  console.log(`[CPU Draft] Round ${currentRound} (late): Scarcity ${baseWeight} → ${adjusted.toFixed(2)} (-20%)`)
  return adjusted
}
```

### 4. Update selectBestPlayer Signature

**File:** `src/utils/cpuDraftLogic.ts`

```typescript
export function selectBestPlayer(
  availablePlayers: PlayerSeason[],
  team: DraftTeam,
  draftedPlayerIds: Set<string>,
  currentRound: number = 1  // ADD currentRound parameter with default
): {
  player: PlayerSeason
  position: PositionCode
  slotNumber: number
} | null {
  // ... existing logic ...

  if (unfilledPositions.length > 0) {
    // Step 2: Weight positions by scarcity WITH round adjustment
    const positionWeights = unfilledPositions.map(pos => {
      const baseWeight = POSITION_SCARCITY[pos] || 1.0
      const adjustedWeight = adjustScarcityByRound(baseWeight, currentRound)

      return {
        position: pos,
        weight: adjustedWeight,
      }
    })

    // ... rest of logic ...
  }

  // Step 5: Calculate weighted scores with team parameter
  const scoredCandidates = candidates.map(player => ({
    player,
    score: calculateWeightedScore(player, targetPosition, team),  // Pass team
  }))

  // ... rest of logic ...
}
```

### 5. RosterSlot Type Extension

**File:** `src/types/draft.types.ts`

Need to add `playerBats` field to RosterSlot:

```typescript
export interface RosterSlot {
  position: PositionCode
  slotNumber: number
  playerSeasonId: string | null
  isFilled: boolean
  playerBats?: 'L' | 'R' | 'S' | null  // ADD THIS for platoon tracking
}
```

### 6. Update makePick to Store Bats

**File:** `src/stores/draftStore.ts`

```typescript
// When filling roster slot, store playerBats
updatedRoster[rosterSlotIndex] = {
  ...updatedRoster[rosterSlotIndex],
  playerSeasonId,
  isFilled: true,
  playerBats: playerBats,  // ADD THIS - pass from DraftBoard
}
```

### 7. Update DraftBoard CPU Draft Call

**File:** `src/components/draft/DraftBoard.tsx`

```typescript
// In CPU draft timeout callback
const selection = selectBestPlayer(
  topUndrafted,
  currentTeam,
  draftedIds,
  session.currentRound  // ADD currentRound
)

if (selection) {
  console.log(`[CPU Draft] ${currentTeam.name} drafts: ${selection.player.display_name} (${selection.position}), bats: ${selection.player.bats}`)
  makePick(
    selection.player.id,
    selection.player.player_id,
    selection.position,
    selection.slotNumber,
    selection.player.bats  // ADD bats parameter
  )
}
```

### 8. Update Database Query

**File:** `src/components/draft/DraftBoard.tsx`

Add `bats` to the select query around line 96-125:

```typescript
.select(`
  id,
  player_id,
  year,
  team_id,
  primary_position,
  apba_rating,
  war,
  at_bats,
  batting_avg,
  hits,
  home_runs,
  rbi,
  stolen_bases,
  on_base_pct,
  slugging_pct,
  bats,  // ADD THIS LINE
  innings_pitched_outs,
  wins,
  losses,
  era,
  strikeouts_pitched,
  saves,
  shutouts,
  whip,
  players!inner (
    display_name,
    first_name,
    last_name
  )
`)
```

---

## Expected Behavior After Implementation

### Platoon Awareness

**Scenario 1: Team has 5 righties, 1 lefty**
- CPU considers a right-handed hitter: No bonus (already have majority)
- CPU considers a left-handed hitter: +5% bonus (minority handedness)
- CPU considers a switch hitter: +10% bonus (always valuable)

**Scenario 2: Balanced lineup (3L, 3R)**
- No platoon bonuses applied (already balanced)
- Switch hitters still get +10% bonus

**Scenario 3: Pitchers**
- No platoon bonus applied (SP, RP, CL positions don't use platoon logic)

### Draft Round Awareness

**Round 1-5 (Early):**
- Position scarcity weights increased by 20%
- Example: C (1.5) → 1.8, SS (1.4) → 1.68, CL (1.3) → 1.56
- CPU aggressively targets scarce positions

**Round 6-15 (Mid):**
- Base position scarcity weights used
- Example: C (1.5), SS (1.4), CL (1.3)
- Normal behavior

**Round 16+ (Late):**
- Position scarcity weights decreased by 20%
- Example: C (1.5) → 1.2, SS (1.4) → 1.12, CL (1.3) → 1.04
- CPU focuses more on best available player

---

## Testing Plan

1. **Verify Database Field**
   ```sql
   SELECT bats FROM player_seasons LIMIT 10;
   ```
   Confirm `bats` column exists and has L/R/S values

2. **Check Query Success**
   - Start draft
   - Check console for any query errors
   - Verify players load successfully

3. **Observe Platoon Logic**
   - Watch CPU draft several position players
   - Check console logs for platoon bonus messages
   - Verify balanced lineup construction (mix of L/R/S)

4. **Observe Round Logic**
   - Watch early rounds (1-5) - should prioritize scarce positions
   - Watch late rounds (16+) - should take more BPA
   - Check console logs for round adjustment messages

5. **Verify No Regressions**
   - CPU should still fill positional needs
   - Draft should complete without errors
   - Performance should remain fast

---

## Potential Issues & Solutions

### Issue 1: `bats` field doesn't exist in database

**Symptom:** Query error when loading players

**Solution:** Check database schema. If missing, add column:
```sql
ALTER TABLE player_seasons ADD COLUMN bats VARCHAR(1);
```

Or modify query to not select `bats` and use null as fallback.

### Issue 2: `session.currentRound` is undefined

**Symptom:** Round adjustment doesn't work, defaults to round 1

**Solution:** Check DraftSession type and ensure currentRound is populated. May need to calculate from currentPick:
```typescript
const currentRound = Math.ceil(session.currentPick / session.teams.length)
```

### Issue 3: Type errors with RosterSlot

**Symptom:** TypeScript errors about playerBats not existing on RosterSlot

**Solution:** Add playerBats to RosterSlot interface in draft.types.ts

### Issue 4: makePick signature mismatch

**Symptom:** TypeScript error when calling makePick with bats parameter

**Solution:** Update makePick signature in draftStore to accept optional bats parameter

---

## Success Criteria

- [ ] No TypeScript compilation errors
- [ ] No runtime errors during draft
- [ ] Players load successfully with bats field
- [ ] Console logs show platoon bonus calculations
- [ ] Console logs show round-based scarcity adjustments
- [ ] CPU teams have balanced lineups (mix of L/R/S hitters)
- [ ] CPU prioritizes scarce positions in early rounds
- [ ] CPU takes BPA in late rounds regardless of position
- [ ] Draft completes successfully with all roster spots filled
- [ ] Performance remains fast (no slowdown)

---

## Rollback Plan

If implementation causes issues:

1. **Revert commit:**
   ```bash
   git revert HEAD
   ```

2. **Remove bats from query** if causing errors

3. **Remove team parameter** from calculateWeightedScore if causing type issues

4. **Remove currentRound parameter** from selectBestPlayer if undefined

All changes are additive and have fallbacks, so partial rollback is possible without breaking existing functionality.

---

## References

- Analysis Document: [docs/analysis/cpu-draft-logic-analysis.md](../analysis/cpu-draft-logic-analysis.md)
- Current CPU Logic: [src/utils/cpuDraftLogic.ts](../../src/utils/cpuDraftLogic.ts)
- Draft Store: [src/stores/draftStore.ts](../../src/stores/draftStore.ts)
- Draft Board: [src/components/draft/DraftBoard.tsx](../../src/components/draft/DraftBoard.tsx)
- Draft Types: [src/types/draft.types.ts](../../src/types/draft.types.ts)
