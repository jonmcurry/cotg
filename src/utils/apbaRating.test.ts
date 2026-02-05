/**
 * Test cases for APBA Rating System
 *
 * TDD Approach: These tests define the EXPECTED behavior.
 * Initially, they should FAIL with the current implementation.
 * After fixes, they should PASS.
 *
 * Run with: npx ts-node src/utils/apbaRating.test.ts
 */

import {
  calculateBatterRating,
  calculatePitcherRating,
  calculatePlayerRating,
  PlayerSeasonStats
} from './apbaRating';

// Simple test runner
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`FAIL: ${name}`);
    console.log(`  -> ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertRange(value: number, min: number, max: number, message: string) {
  if (value < min || value > max) {
    throw new Error(`${message}: expected ${min}-${max}, got ${value.toFixed(1)}`);
  }
}

// Helper to create mock player data
function createBatter(overrides: Partial<PlayerSeasonStats>): PlayerSeasonStats {
  return {
    primary_position: 'OF',
    at_bats: 500,
    batting_avg: 0.280,
    on_base_pct: 0.350,
    slugging_pct: 0.450,
    ops: 0.800,
    home_runs: 20,
    stolen_bases: 10,
    runs_created_advanced: 80,
    isolated_power: 0.170,
    secondary_avg: 0.250,
    fielding_pct: 0.980,
    range_factor: 2.0,
    errors: 5,
    wins: null,
    losses: null,
    saves: null,
    era: null,
    whip: null,
    k_bb_ratio: null,
    strikeouts_pitched: null,
    walks_allowed: null,
    innings_pitched_outs: null,
    ...overrides
  };
}

function createPitcher(overrides: Partial<PlayerSeasonStats>): PlayerSeasonStats {
  return {
    primary_position: 'SP',
    at_bats: null,
    batting_avg: null,
    on_base_pct: null,
    slugging_pct: null,
    ops: null,
    home_runs: null,
    stolen_bases: null,
    runs_created_advanced: null,
    isolated_power: null,
    secondary_avg: null,
    fielding_pct: null,
    range_factor: null,
    errors: null,
    wins: 15,
    losses: 10,
    saves: 0,
    era: 3.50,
    whip: 1.20,
    k_bb_ratio: 2.5,
    strikeouts_pitched: 180,
    walks_allowed: 72,
    innings_pitched_outs: 600, // 200 IP
    ...overrides
  };
}

console.log('='.repeat(70));
console.log('APBA RATING SYSTEM TESTS');
console.log('='.repeat(70));
console.log('');

// ============================================================================
// BATTER TESTS - Minimum Threshold
// ============================================================================
console.log('\n--- BATTER: Minimum AB Threshold Tests ---\n');

test('Small sample batter (1 AB) should rate 0', () => {
  const player = createBatter({ at_bats: 1, ops: 4.000, runs_created_advanced: 1, isolated_power: 1.0 });
  const rating = calculateBatterRating(player);
  assert(rating === 0, `Expected 0, got ${rating}`);
});

test('Small sample batter (50 AB) should rate 0', () => {
  const player = createBatter({ at_bats: 50, ops: 1.200, runs_created_advanced: 30, isolated_power: 0.400 });
  const rating = calculateBatterRating(player);
  assert(rating === 0, `Expected 0, got ${rating}`);
});

test('Small sample batter (99 AB) should rate 0', () => {
  const player = createBatter({ at_bats: 99, ops: 1.000, runs_created_advanced: 50, isolated_power: 0.300 });
  const rating = calculateBatterRating(player);
  assert(rating === 0, `Expected 0, got ${rating}`);
});

test('Batter with exactly 100 AB should get rated', () => {
  const player = createBatter({ at_bats: 100, ops: 0.800, runs_created_advanced: 40, isolated_power: 0.170 });
  const rating = calculateBatterRating(player);
  assert(rating > 0, `Expected > 0, got ${rating}`);
});

// ============================================================================
// BATTER TESTS - Elite Players Should Rate High
// ============================================================================
console.log('\n--- BATTER: Elite Player Rating Tests ---\n');

test('Babe Ruth 1921 (1.359 OPS, 249 RC, .469 ISO) should rate 90+', () => {
  // Greatest offensive season ever
  const player = createBatter({
    at_bats: 540,
    ops: 1.359,
    runs_created_advanced: 249,
    isolated_power: 0.469
  });
  const rating = calculateBatterRating(player);
  assertRange(rating, 90, 100, 'Ruth 1921');
});

test('Babe Ruth 1927 (1.258 OPS, 217 RC, .417 ISO) should rate 83+ (Elite)', () => {
  const player = createBatter({
    at_bats: 540,
    ops: 1.258,
    runs_created_advanced: 217,
    isolated_power: 0.417
  });
  const rating = calculateBatterRating(player);
  assertRange(rating, 83, 100, 'Ruth 1927');
});

test('Lou Gehrig 1930 (1.194 OPS, 204 RC, .343 ISO) should rate 74+ (All-Star)', () => {
  const player = createBatter({
    at_bats: 581,
    ops: 1.194,
    runs_created_advanced: 203.6,
    isolated_power: 0.343
  });
  const rating = calculateBatterRating(player);
  assertRange(rating, 74, 100, 'Gehrig 1930');
});

// ============================================================================
// BATTER TESTS - Realistic Rating Ranges
// ============================================================================
console.log('\n--- BATTER: Realistic Rating Tests ---\n');

// NOTE: These ranges reflect that "average" MLB players aren't at 50th percentile
// of all-time. The scale is 0-100 with Ruth/Bonds peak at ~95-100.
// Average qualified starters = 25-40, Good = 35-50, All-Star = 55-75, Elite = 80-90

test('Average batter (.750 OPS, 60 RC, .150 ISO) should rate 25-40', () => {
  const player = createBatter({
    at_bats: 500,
    ops: 0.750,
    runs_created_advanced: 60,
    isolated_power: 0.150
  });
  const rating = calculateBatterRating(player);
  assertRange(rating, 25, 40, 'Average batter');
});

test('Good batter (.850 OPS, 90 RC, .200 ISO) should rate 35-50', () => {
  const player = createBatter({
    at_bats: 500,
    ops: 0.850,
    runs_created_advanced: 90,
    isolated_power: 0.200
  });
  const rating = calculateBatterRating(player);
  assertRange(rating, 35, 50, 'Good batter');
});

test('Below average batter (.650 OPS, 40 RC, .100 ISO) should rate 15-30', () => {
  const player = createBatter({
    at_bats: 400,
    ops: 0.650,
    runs_created_advanced: 40,
    isolated_power: 0.100
  });
  const rating = calculateBatterRating(player);
  assertRange(rating, 15, 30, 'Below average batter');
});

// ============================================================================
// PITCHER TESTS - Minimum Threshold
// ============================================================================
console.log('\n--- PITCHER: Minimum IP Threshold Tests ---\n');

test('Small sample pitcher (10 IP = 30 outs) should rate 0', () => {
  const player = createPitcher({ innings_pitched_outs: 30, era: 1.00, k_bb_ratio: 10.0, wins: 1, saves: 0 });
  const rating = calculatePitcherRating(player);
  assert(rating === 0, `Expected 0, got ${rating}`);
});

test('Small sample pitcher (49 IP = 147 outs) should rate 0', () => {
  const player = createPitcher({ innings_pitched_outs: 147, era: 2.00, k_bb_ratio: 5.0, wins: 5, saves: 0 });
  const rating = calculatePitcherRating(player);
  assert(rating === 0, `Expected 0, got ${rating}`);
});

test('Pitcher with exactly 50 IP (150 outs) should get rated', () => {
  const player = createPitcher({ innings_pitched_outs: 150, era: 3.50, k_bb_ratio: 2.5, wins: 5, saves: 0 });
  const rating = calculatePitcherRating(player);
  assert(rating > 0, `Expected > 0, got ${rating}`);
});

// ============================================================================
// PITCHER TESTS - Elite Pitchers Should Rate High
// ============================================================================
console.log('\n--- PITCHER: Elite Player Rating Tests ---\n');

test('Bob Gibson 1968 (1.12 ERA, 4.32 K/BB, 22 W) should rate 95+', () => {
  // One of the greatest pitching seasons ever
  const player = createPitcher({
    innings_pitched_outs: 900, // 300+ IP
    era: 1.12,
    k_bb_ratio: 4.32,
    wins: 22,
    saves: 0
  });
  const rating = calculatePitcherRating(player);
  assertRange(rating, 95, 100, 'Gibson 1968');
});

test('Sandy Koufax 1965 (2.04 ERA, 5.38 K/BB, 26 W) should rate 88+ (Elite)', () => {
  const player = createPitcher({
    innings_pitched_outs: 900,
    era: 2.04,
    k_bb_ratio: 5.38,
    wins: 26,
    saves: 2
  });
  const rating = calculatePitcherRating(player);
  assertRange(rating, 88, 100, 'Koufax 1965');
});

test('Pedro Martinez 2000 (1.74 ERA, 8.88 K/BB, 18 W) should rate 89+ (Elite)', () => {
  const player = createPitcher({
    innings_pitched_outs: 650,
    era: 1.74,
    k_bb_ratio: 8.88,
    wins: 18,
    saves: 0
  });
  const rating = calculatePitcherRating(player);
  assertRange(rating, 89, 100, 'Pedro 2000');
});

test('Mariano Rivera 2005 (1.38 ERA, 4.44 K/BB, 7W/43SV) should rate 88+', () => {
  const player = createPitcher({
    primary_position: 'CL',
    innings_pitched_outs: 335,
    era: 1.38,
    k_bb_ratio: 4.44,
    wins: 7,
    saves: 43
  });
  const rating = calculatePitcherRating(player);
  assertRange(rating, 88, 100, 'Rivera 2005');
});

// ============================================================================
// PITCHER TESTS - Realistic Rating Ranges
// ============================================================================
console.log('\n--- PITCHER: Realistic Rating Tests ---\n');

// NOTE: These ranges reflect that pitchers scale from 0-100 with Gibson 1968 at ~95-97

test('Average pitcher (4.00 ERA, 2.0 K/BB, 10 W) should rate 45-60', () => {
  const player = createPitcher({
    innings_pitched_outs: 600,
    era: 4.00,
    k_bb_ratio: 2.0,
    wins: 10,
    saves: 0
  });
  const rating = calculatePitcherRating(player);
  assertRange(rating, 45, 60, 'Average pitcher');
});

test('Good pitcher (3.00 ERA, 3.0 K/BB, 15 W) should rate 65-80', () => {
  const player = createPitcher({
    innings_pitched_outs: 600,
    era: 3.00,
    k_bb_ratio: 3.0,
    wins: 15,
    saves: 0
  });
  const rating = calculatePitcherRating(player);
  assertRange(rating, 65, 80, 'Good pitcher');
});

test('Below average pitcher (5.00 ERA, 1.5 K/BB, 6 W) should rate 20-40', () => {
  const player = createPitcher({
    innings_pitched_outs: 450,
    era: 5.00,
    k_bb_ratio: 1.5,
    wins: 6,
    saves: 0
  });
  const rating = calculatePitcherRating(player);
  assertRange(rating, 20, 40, 'Below average pitcher');
});

// ============================================================================
// RESULTS
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

if (failed > 0) {
  console.log('\nTests FAILED - this is EXPECTED before fixing the formula.');
  console.log('After implementing fixes, all tests should PASS.');
  process.exit(1);
} else {
  console.log('\nAll tests PASSED!');
  process.exit(0);
}
