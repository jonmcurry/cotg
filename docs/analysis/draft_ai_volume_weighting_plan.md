# Draft AI - Volume Weighting & Scarcity Rebalance

**Date:** 2026-02-02
**Based on:** docs/fix-draft-ai-logic.md

## Problem

Aroldis Chapman (Closer, ~60 IP) was drafted #1 overall over workhorse aces and elite position players. CL scarcity weight (1.3) was higher than SP (1.2), and no volume weighting existed.

## Changes

- [x] 1. **Rebalance POSITION_SCARCITY weights** in `src/utils/cpuDraftLogic.ts`
  - Boost premium defense: OF 0.9 -> 1.3, 2B 1.1 -> 1.2, 3B 1.1 -> 1.2, 1B 1.0 -> 1.1
  - Reduce pitching: SP 1.2 -> 1.15, CL 1.3 -> 0.8, RP 0.8 -> 0.6

- [x] 2. **Add `calculateVolumeMultiplier` function**
  - Pitchers: >200 IP (600 outs) = 1.2x, >150 IP (450 outs) = 1.1x, <60 IP (180 outs) = 0.8x
  - Position players: >450 AB = 1.1x

- [x] 3. **Integrate volume into `calculateWeightedScore`**
  - New formula: `Rating x Scarcity x Platoon x Volume x Randomness`

- [x] 4. **Update docs/trd-ai-draft-algorithm.md**

- [x] 5. **Update changelog.md** (Rule 10)

- [x] 6. **Commit** (Rule 9)

## Expected Impact

| Player | Rating | Scarcity | Volume | Approx Score |
|--------|--------|----------|--------|-------------|
| Chapman (CL, 60 IP) | 100 | 0.8 | 0.8 | ~64 |
| Walter Johnson (SP, 300 IP) | 95 | 1.15 | 1.2 | ~131 |
| Babe Ruth (OF, 500 AB) | 95 | 1.3 | 1.1 | ~136 |

Closers drop to mid/late rounds. Workhorse aces and elite everyday players dominate early rounds.
