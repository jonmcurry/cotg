# APBA Rating System Implementation Plan

**Date**: 2026-01-27
**Status**: Ready for Implementation
**Estimated Time**: 2-3 hours

---

## Objective

Implement APBA-style player ratings to replace NULL WAR values, providing an authentic baseball game rating system optimized for draft gameplay.

---

## Background

- **Problem**: WAR values are NULL in database (all 1000+ records checked)
- **Root Cause**: WAR not calculated during data import
- **Options Evaluated**:
  1. ❌ Calculate WAR (too complex, requires league-wide data, weeks of work)
  2. ❌ Use APBA card ratings directly (proprietary, card-based not stat-based)
  3. ✅ **APBA-inspired rating from our statistics** (2-3 hours, game-appropriate)

- **Decision**: Use APBA methodology with Lahman database statistics
- **Reverse Engineering**: Analyzed C:\dosgames\shared\BBW\PLAYERS.DAT
- **Documentation**: [docs/analysis/apba-rating-system-reverse-engineered.md](../analysis/apba-rating-system-reverse-engineered.md)

---

## Implementation Steps

### ☐ Phase 1: Create Rating Utility (30 min)

**File**: `src/utils/apbaRating.ts`

**Tasks**:
- [ ] Create `calculateBatterRating()` function
- [ ] Create `calculatePitcherRating()` function
- [ ] Create `calculatePlayerRating()` wrapper
- [ ] Add TypeScript types for rating components
- [ ] Add position scarcity multipliers
- [ ] Add unit tests (optional but recommended)

**Formula - Position Players**:
```typescript
const battingRating = (
  OPS × 100 +
  runs_created_advanced / 5 +
  isolated_power × 100
) / 3

const fieldingEstimate = estimateDefensiveRating(fielding_pct, range_factor, position)
const fieldingRating = (10 - fieldingEstimate) × 10

const positionMultiplier = POSITION_SCARCITY[position]

const rating = (battingRating × 0.7 + fieldingRating × 0.3) × positionMultiplier
return Math.min(100, Math.max(0, rating))  // Clamp to 0-100
```

**Formula - Pitchers**:
```typescript
const gradePoints = mapERAtoGrade(era)  // 25-100
const controlPoints = Math.min(88, (k_bb_ratio / 4) × 88)  // 0-88
const starPoints = mapWARorWinsToStars(wins, saves)  // 5-50

const rating = (gradePoints × 0.5 + controlPoints × 0.3 + starPoints × 0.2)
return Math.min(100, Math.max(0, rating))  // Clamp to 0-100
```

**Helper Functions**:
```typescript
function mapERAtoGrade(era: number | null): number {
  if (!era) return 25
  if (era < 2.50) return 100  // Grade A
  if (era < 3.50) return 75   // Grade B
  if (era < 4.50) return 50   // Grade C
  return 25                   // Grade D
}

function estimateDefensiveRating(
  fielding_pct: number | null,
  range_factor: number | null,
  position: string
): number {
  // Estimate 1-9 defensive rating from fielding stats
  // 1 = elite, 9 = poor
  // Use position-specific benchmarks
}

function mapWARorWinsToStars(wins: number, saves: number): number {
  const total = wins + saves
  if (total >= 20) return 50  // Z star
  if (total >= 15) return 30  // Y star
  if (total >= 10) return 15  // X star
  if (total >= 5) return 5    // W star
  return 0
}
```

---

### ☐ Phase 2: Database Migration (15 min)

**File**: `supabase/migrations/YYYYMMDD_add_apba_rating.sql`

**Tasks**:
- [ ] Add `apba_rating` column to `player_seasons` table
- [ ] Add index on `apba_rating` for query performance
- [ ] Run migration on Supabase

**SQL**:
```sql
-- Add APBA rating column
ALTER TABLE player_seasons
ADD COLUMN apba_rating DECIMAL(5,2);

-- Add index for sorting/filtering
CREATE INDEX idx_player_seasons_apba_rating
ON player_seasons(apba_rating DESC);

-- Add comment
COMMENT ON COLUMN player_seasons.apba_rating IS
'APBA-style player rating (0-100 scale) calculated from stats. Used for draft rankings.';
```

---

### ☐ Phase 3: Calculate Ratings for Existing Data (30 min)

**File**: `scripts/calculate-apba-ratings.ts`

**Tasks**:
- [ ] Create script to calculate ratings for all players
- [ ] Batch update database (500-1000 records at a time)
- [ ] Log progress and any errors
- [ ] Verify ratings look reasonable (spot check top/bottom players)

**Script**:
```typescript
import { supabase } from '../src/lib/supabaseClient'
import { calculatePlayerRating } from '../src/utils/apbaRating'

async function calculateAndUpdateRatings() {
  console.log('Fetching all player_seasons...')

  let offset = 0
  const batchSize = 500
  let processed = 0

  while (true) {
    const { data: players, error } = await supabase
      .from('player_seasons')
      .select('*')
      .range(offset, offset + batchSize - 1)

    if (error || !players || players.length === 0) break

    const updates = players.map(player => ({
      id: player.id,
      apba_rating: calculatePlayerRating(player)
    }))

    // Batch update
    for (const update of updates) {
      await supabase
        .from('player_seasons')
        .update({ apba_rating: update.apba_rating })
        .eq('id', update.id)
    }

    processed += players.length
    console.log(`Processed ${processed} players...`)

    if (players.length < batchSize) break
    offset += batchSize
  }

  console.log(`Complete! Updated ${processed} player ratings.`)
}

calculateAndUpdateRatings()
```

---

### ☐ Phase 4: Update Draft Logic (20 min)

**Files**:
- `src/utils/cpuDraftLogic.ts`
- `src/types/draft.types.ts`

**Tasks**:
- [ ] Update `PlayerSeason` interface to include `apba_rating`
- [ ] Change `calculateWeightedScore()` to use `apba_rating` instead of `war`
- [ ] Update position scarcity weights (may need adjustment)
- [ ] Test CPU draft picks look reasonable

**Changes**:
```typescript
// src/utils/cpuDraftLogic.ts

export interface PlayerSeason {
  id: string
  player_id: string
  year: number
  team_id: string
  primary_position: string

  // Stats
  apba_rating: number | null  // ← ADD THIS
  war: number | null  // Keep for reference, but don't use

  // ... rest of interface
}

function calculateWeightedScore(
  player: PlayerSeason,
  position: PositionCode,
  randomizationFactor: number = 0.1
): number {
  const rating = player.apba_rating || 0  // ← CHANGE FROM war
  const scarcityWeight = POSITION_SCARCITY[position] || 1.0

  // Apply randomization (±10% by default)
  const randomness = 1 + (Math.random() * 2 - 1) * randomizationFactor

  return rating * scarcityWeight * randomness
}
```

---

### ☐ Phase 5: Update UI (30 min)

**Files**:
- `src/components/draft/GroupedPlayerPool.tsx`
- `src/components/draft/DraftBoard.tsx`

**Tasks**:
- [ ] Change "WAR" label to "Rating" or "APBA"
- [ ] Update query to select `apba_rating` instead of `war`
- [ ] Update sort/filter logic to use `apba_rating`
- [ ] Add tooltip explaining APBA rating system
- [ ] Test UI displays ratings correctly

**Changes**:
```typescript
// src/components/draft/DraftBoard.tsx

const { data, error } = await supabase
  .from('player_seasons')
  .select(`
    id,
    player_id,
    year,
    team_id,
    primary_position,
    apba_rating,  // ← CHANGE FROM war
    batting_avg,
    home_runs,
    // ... rest of fields
  `)
  .in('year', session.selectedSeasons)
  .or('at_bats.gte.100,innings_pitched_outs.gte.60')
  .order('apba_rating', { ascending: false, nullsFirst: false })  // ← CHANGE
```

```typescript
// src/components/draft/GroupedPlayerPool.tsx

// Update display
<span className="text-sm font-medium text-burgundy">
  Rating {group.bestRating.toFixed(1)}  {/* ← CHANGE from WAR */}
</span>

// Update tooltip
<div className="tooltip">
  APBA Rating: 0-100 scale based on offensive and defensive value.
  Higher is better. Elite players: 85+, Stars: 70+, Average: 50+
</div>
```

---

### ☐ Phase 6: Testing & Validation (30 min)

**Tasks**:
- [ ] Run TypeScript compilation: `npm run build`
- [ ] Test draft session creation
- [ ] Verify player pool shows ratings (not 0.0)
- [ ] Verify CPU draft picks make sense (elite players go first)
- [ ] Spot check ratings vs known great players
- [ ] Test sorting by rating works correctly
- [ ] Verify groupedplayers shows correct best rating

**Validation Queries**:
```typescript
// Check top rated players
const { data } = await supabase
  .from('player_seasons')
  .select('year, apba_rating, players!inner(display_name)')
  .order('apba_rating', { ascending: false })
  .limit(20)

// Should see legendary seasons at top:
// - Babe Ruth 1927
// - Ted Williams 1941
// - Barry Bonds 2001
// - etc.
```

---

### ☐ Phase 7: Documentation & Cleanup (15 min)

**Tasks**:
- [ ] Update CHANGELOG.md with APBA rating implementation
- [ ] Update draft-system-schema-fix.md (or create new doc)
- [ ] Clean up temporary scripts (Rule 5)
- [ ] Commit changes to git (Rule 9)

**Files to Clean Up**:
- `scripts/check-war-data.ts` (temporary analysis script)
- `scripts/check-available-stats.ts` (temporary analysis script)
- `scripts/extract-apba-help.py` (temporary reverse engineering)
- `scripts/examine-apba-data.py` (temporary reverse engineering)
- `scripts/read-players-dat.py` (temporary reverse engineering)
- `scripts/apba-help-extract.txt` (temporary output)
- `scripts/players-dat-decoded.txt` (temporary output)
- `scripts/apba-*.txt` (temporary output files)

**Keep**:
- `docs/analysis/apba-rating-system-reverse-engineered.md` (permanent documentation)
- `docs/analysis/war-vs-apba-rating-analysis.md` (permanent analysis)
- `src/utils/apbaRating.ts` (production code)
- `scripts/calculate-apba-ratings.ts` (may need to re-run for new data)

---

## Testing Checklist

- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] Draft session creation works
- [ ] Player pool displays ratings (non-zero)
- [ ] CPU draft selects good players first
- [ ] Ratings appear reasonable (spot check known players)
- [ ] Grouped players show correct best rating
- [ ] Search/filter works with new rating
- [ ] Position scarcity affects draft order correctly
- [ ] No console errors
- [ ] Database migration applied successfully

---

## Expected Outcomes

**Before**:
- All players show "WAR 0.0"
- CPU draft cannot effectively rank players
- User confused about player quality

**After**:
- Players show "Rating 45.2", "Rating 87.3", etc.
- CPU draft selects elite players (85+) early
- Ratings reflect APBA baseball methodology
- Draft feels authentic to APBA gameplay
- User can compare players meaningfully

---

## Rollback Plan

If implementation fails:
1. Remove `apba_rating` column: `ALTER TABLE player_seasons DROP COLUMN apba_rating;`
2. Revert code changes: `git revert HEAD`
3. Return to WAR calculation research

---

## Success Criteria

✅ Implementation complete when:
1. All players have non-null `apba_rating` values
2. CPU draft selects players in reasonable order (elite first)
3. UI displays ratings instead of WAR
4. Ratings correlate with player quality (spot-checked)
5. No TypeScript errors
6. No runtime errors
7. CHANGELOG.md updated
8. Temporary files cleaned up
9. Changes committed to git

---

## Future Enhancements (Optional)

- Add "Show Rating Breakdown" modal (batting vs fielding components)
- Export rating calculation as CSV for analysis
- Add rating history chart (track how rating changes across seasons)
- Compare APBA rating vs actual APBA card grades (if we get card data)
- Add filtering by rating range in player pool
- Show rating percentile (e.g., "Top 5% of all players")

---

**Created**: 2026-01-27
**Status**: ☐ Not Started
**Blocked By**: None
**Dependencies**: None
**Assignee**: Claude Code
**Next Step**: Create `src/utils/apbaRating.ts`
