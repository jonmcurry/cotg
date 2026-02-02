# Draft AI - True BPA Refactor Plan

**Date:** 2026-02-02
**Based on:** docs/analysis/draft_ai_review.md

## Problem

The current CPU draft AI claims to use "Best Player Available" (BPA) but actually uses "Best Player at Most Scarce Position". It picks a target position first, then finds the best player at that position - never comparing players across positions.

Additionally, early round scarcity weights are inverted: rounds 1-5 INCREASE scarcity impact (+20%) when they should DECREASE it to let raw talent dominate.

## Changes

- [x] 1. **Refactor `selectBestPlayer` flow** in `src/utils/cpuDraftLogic.ts`
  - OLD: Pick target position -> Find candidates at that position -> Score them
  - NEW: Find candidates across ALL unfilled positions -> Score all with position-weighted rating -> Pick top score
  - New flow: `All Unfilled Positions -> All Eligible Candidates -> Score = (Rating * Scarcity * Platoon * Random) -> Pick Top`

- [x] 2. **Invert early round scarcity** in `adjustScarcityByRound`
  - OLD: Rounds 1-5 multiply scarcity by 1.2 (MORE position-driven)
  - NEW: Rounds 1-5 multiply scarcity by 0.8 (LESS position-driven, raw talent dominates)
  - Late rounds stay at 1.2 (MORE position-driven to fill gaps)

- [x] 3. **Fix `getCPUDraftRecommendation`** - pass `currentRound` parameter through to `selectBestPlayer` (currently defaults to 1)

- [x] 4. **Update `docs/trd-ai-draft-algorithm.md`** to align documentation with actual APBA Rating-based implementation

- [x] 5. **Update `changelog.md`** (Rule 10)

- [x] 6. **Commit** (Rule 9)

## Risk Assessment

- **Low risk**: The scoring formula itself (`calculateWeightedScore`) is unchanged
- **Low risk**: Position eligibility and playing time checks are unchanged
- **Medium risk**: Draft outcomes will differ - CPU teams may draft differently than before (intentional improvement)
- The top-5 randomization already exists and provides unpredictability
