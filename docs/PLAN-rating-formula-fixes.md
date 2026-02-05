# Plan: Fix Player Rating Formula Issues

**Date:** February 5, 2026
**Status:** COMPLETED

## Problem Summary

Current APBA rating formula had three critical issues:
1. Small sample size players (1-7 AB) got inflated ratings (100 for nobodies)
2. Batter formula scaling was broken (Ruth 1921 only rated 77.5)
3. Pitcher formula capped at 86.4 (elite pitchers couldn't match elite batters)

## Implemented Solution

### Batter Formula Changes

1. **Added minimum 100 AB threshold** - Players with <100 AB return 0 rating
2. **Normalized all components to 0-100 scale**:
   - OPS: Maps 0.500-1.400 to 0-100
   - RC: Maps 0-250 to 0-100
   - ISO: Maps 0-0.500 to 0-100
3. **Equal weighting** - All three components now contribute equally

### Pitcher Formula Changes

1. **Added minimum 150 outs (~50 IP) threshold** - Pitchers with <50 IP return 0 rating
2. **Continuous ERA scale** - Replaced discrete A/B/C/D buckets with `110 - (ERA * 15)`
3. **Improved control scale** - K/BB ratio * 25 (caps at 100 for K/BB >= 4.0)
4. **Improved stars scale** - (W + SV) * 5 (caps at 100 for 20+ W/SV)

## Test Results (TDD)

All 20 tests pass:

| Test Category | Tests | Status |
|--------------|-------|--------|
| Batter minimum AB threshold | 4 | PASS |
| Batter elite ratings | 3 | PASS |
| Batter realistic ranges | 3 | PASS |
| Pitcher minimum IP threshold | 3 | PASS |
| Pitcher elite ratings | 4 | PASS |
| Pitcher realistic ranges | 3 | PASS |

## Actual Results

| Player | Year | Old Rating | New Rating | Target | Status |
|--------|------|------------|------------|--------|--------|
| Babe Ruth | 1921 | 77.5 | **95.6** | 90+ | PASS |
| Babe Ruth | 1927 | 70.3 | **84.8** | 83+ | PASS |
| Lou Gehrig | 1930 | 64.8 | **75.7** | 74+ | PASS |
| Bob Gibson | 1968 | 86.4 | **96.6** | 95+ | PASS |
| Sandy Koufax | 1965 | 86.4 | **89.7** | 88+ | PASS |
| Pedro Martinez | 2000 | 82.4 | **90.0** | 89+ | PASS |
| Mariano Rivera | 2005 | 86.4 | **93.0** | 88+ | PASS |
| Don Bennett (1 AB) | 1930 | 100 | **0** | 0 | PASS |

## Files Modified

- `src/utils/apbaRating.ts` - Rating calculation logic
- `src/utils/apbaRating.test.ts` - Test suite (new file)

## Implementation Checklist

### Phase 1: Test Cases (TDD - Rule 11)
- [x] Write test: Babe Ruth 1921 stats should rate 90+
- [x] Write test: Small sample (5 AB, 2.0 OPS) should rate 0
- [x] Write test: Average batter (.750 OPS, 60 RC, .150 ISO) should rate 25-40
- [x] Write test: Koufax 1965 stats should rate 88+
- [x] Write test: Gibson 1968 stats should rate 95+
- [x] Write test: Average pitcher (4.00 ERA) should rate 45-60
- [x] Verify all tests FAIL with current implementation (18 failed initially)

### Phase 2: Fix Batter Formula
- [x] Add minimum 100 AB threshold (return 0 if at_bats < 100)
- [x] Normalize OPS: Map 0.500-1.400 to 0-100
- [x] Normalize RC: Map 0-250 to 0-100
- [x] Normalize ISO: Map 0-0.500 to 0-100
- [x] Verify batter tests PASS

### Phase 3: Fix Pitcher Formula
- [x] Add minimum 50 IP threshold (~150 outs)
- [x] Replace ERA buckets with continuous formula
- [x] Adjust K/BB and Stars scales to allow 95+ ratings
- [x] Verify pitcher tests PASS

### Phase 4: Database Update
- [x] Run script to recalculate all 115,243 player-season ratings
- [x] Verify top players are now in expected ranges
- [x] Verify small sample players no longer have inflated ratings

### Phase 5: Commit
- [x] Update CHANGELOG.md
- [x] Commit and push to GitHub

