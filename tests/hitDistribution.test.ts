/**
 * Hit Distribution - TDD Tests
 *
 * Tests to verify that the simulation produces realistic hit type distributions
 * based on actual player stats.
 *
 * Following CLAUDE.md Rule 11: Write tests first, then make them pass.
 *
 * Run with: npx tsx tests/hitDistribution.test.ts
 */

// Simple test runner
let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (e: unknown) {
    const error = e as Error
    console.log(`FAIL: ${name}`)
    console.log(`  -> ${error.message}`)
    failed++
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertInRange(value: number, min: number, max: number, message: string) {
  if (value < min || value > max) {
    throw new Error(`${message}: ${value} not in range [${min}, ${max}]`)
  }
}

console.log('='.repeat(70))
console.log('HIT DISTRIBUTION - TDD TESTS')
console.log('='.repeat(70))
console.log('')

// ============================================================================
// Import the functions we need to test
// ============================================================================

import { calculateHitDistribution, calculateStrikeoutRate } from '../src/utils/statMaster'
import type { PlayerSeason } from '../src/types/player'

// ============================================================================
// Mock Player Data - matches actual PlayerSeason type
// ============================================================================

function createMockBatter(overrides: Partial<PlayerSeason>): PlayerSeason {
  return {
    id: 'test-batter',
    player_id: 'player-1',
    year: 2023,
    team_id: 'team-1',
    primary_position: 'RF',
    apba_rating: null,
    war: null,
    hits: 150,
    home_runs: 15,
    at_bats: 500,
    rbi: 60,
    stolen_bases: 10,
    batting_avg: 0.300,
    on_base_pct: 0.364,
    slugging_pct: 0.480,
    // Pitching stats (null for batters)
    innings_pitched_outs: null,
    wins: null,
    losses: null,
    era: null,
    strikeouts_pitched: null,
    saves: null,
    shutouts: null,
    whip: null,
    // Player info
    display_name: 'Test Player',
    first_name: 'Test',
    last_name: 'Player',
    bats: 'R',
    ...overrides,
  }
}

function createMockPitcher(overrides: Partial<PlayerSeason>): PlayerSeason {
  return {
    id: 'test-pitcher',
    player_id: 'pitcher-1',
    year: 2023,
    team_id: 'team-1',
    primary_position: 'SP',
    apba_rating: null,
    war: null,
    // Batting stats (null/minimal for pitchers)
    hits: null,
    home_runs: null,
    at_bats: null,
    rbi: null,
    stolen_bases: null,
    batting_avg: null,
    on_base_pct: null,
    slugging_pct: null,
    // Pitching stats
    innings_pitched_outs: 600, // 200 IP = 600 outs
    wins: 15,
    losses: 8,
    era: 3.50,
    strikeouts_pitched: 200,
    saves: 0,
    shutouts: 2,
    whip: 1.15,
    // Player info
    display_name: 'Test Pitcher',
    first_name: 'Test',
    last_name: 'Pitcher',
    bats: 'R',
    ...overrides,
  }
}

// ============================================================================
// Test: Hit Type Distribution from Real Stats
// ============================================================================

console.log('\n--- HIT TYPE DISTRIBUTION ---\n')

test('calculateHitDistribution returns realistic rates for average hitter', () => {
  // Average hitter: .280 AVG, .450 SLG, 20 HRs in 550 AB
  const player = createMockBatter({
    hits: 154,
    home_runs: 20,
    at_bats: 550,
    batting_avg: 0.280,
    slugging_pct: 0.450,
  })

  const dist = calculateHitDistribution(player)

  // HR rate should be about 20/154 = 0.13
  assertInRange(dist.homeRunRate, 0.10, 0.15, 'HR rate')
  // Singles should be majority of hits
  assertInRange(dist.singleRate, 0.50, 0.80, 'Single rate')
  // All rates should sum to ~1.0
  const total = dist.singleRate + dist.doubleRate + dist.tripleRate + dist.homeRunRate
  assertInRange(total, 0.95, 1.05, 'Total rate')
})

test('calculateHitDistribution for power hitter (Josh Gibson type)', () => {
  // Elite power hitter: .350 AVG, .648 SLG, 40 HRs
  const player = createMockBatter({
    hits: 175,
    home_runs: 40,
    at_bats: 500,
    batting_avg: 0.350,
    slugging_pct: 0.648,
  })

  const dist = calculateHitDistribution(player)

  // HR rate should be about 40/175 = 0.23
  assertInRange(dist.homeRunRate, 0.20, 0.30, 'HR rate')

  // CRITICAL: HR rate should NOT be 34% like the old formula produced
  assert(dist.homeRunRate < 0.31, `HR rate ${dist.homeRunRate} should be < 31%`)

  // Should have reasonable singles rate (not 15% like old formula)
  assert(dist.singleRate >= 0.40, `Single rate ${dist.singleRate} should be >= 40%`)
})

test('calculateHitDistribution for contact hitter', () => {
  // Contact hitter: .320 AVG, .400 SLG, only 5 HRs
  const player = createMockBatter({
    hits: 160,
    home_runs: 5,
    at_bats: 500,
    batting_avg: 0.320,
    slugging_pct: 0.400,
  })

  const dist = calculateHitDistribution(player)

  // Low HR rate: 5/160 = 0.03
  assertInRange(dist.homeRunRate, 0.02, 0.05, 'HR rate')
  // High singles rate for contact hitter
  assertInRange(dist.singleRate, 0.65, 0.90, 'Single rate')
})

test('calculateHitDistribution with zero/missing data uses fallback', () => {
  const player = createMockBatter({
    hits: 0,
    home_runs: 0,
    at_bats: 0,
    batting_avg: 0,
    slugging_pct: 0,
  })

  const dist = calculateHitDistribution(player)

  // Should use reasonable defaults, not crash or return NaN
  assert(!isNaN(dist.singleRate), 'Single rate should not be NaN')
  assert(!isNaN(dist.doubleRate), 'Double rate should not be NaN')
  assert(!isNaN(dist.tripleRate), 'Triple rate should not be NaN')
  assert(!isNaN(dist.homeRunRate), 'HR rate should not be NaN')

  // Default should be realistic (mostly singles)
  assert(dist.singleRate >= 0.60, 'Default single rate should be >= 60%')
  assert(dist.homeRunRate <= 0.15, 'Default HR rate should be <= 15%')
})

test('calculateHitDistribution rates sum to approximately 1.0', () => {
  const player = createMockBatter({
    hits: 150,
    home_runs: 15,
    at_bats: 500,
    batting_avg: 0.300,
    slugging_pct: 0.480,
  })

  const dist = calculateHitDistribution(player)
  const sum = dist.singleRate + dist.doubleRate + dist.tripleRate + dist.homeRunRate

  assertInRange(sum, 0.95, 1.05, 'Rates should sum to ~1.0')
})

// ============================================================================
// Test: Strikeout Rates - Pitcher Impact
// ============================================================================

console.log('\n--- STRIKEOUT RATES ---\n')

test('calculateStrikeoutRate returns default rate with no pitcher', () => {
  const rate = calculateStrikeoutRate(null, null)

  // Should use a reasonable default around 15%
  assertInRange(rate, 0.10, 0.20, 'Default K rate')
})

test('calculateStrikeoutRate increases with high-K pitcher', () => {
  const batter = createMockBatter({})

  // High K pitcher (10 K/9 = 200 K in 600 outs/200 IP)
  const highKPitcher = createMockPitcher({
    strikeouts_pitched: 200,
    innings_pitched_outs: 600, // 200 IP
  })

  // Low K pitcher (5 K/9 = 100 K in 600 outs/200 IP)
  const lowKPitcher = createMockPitcher({
    strikeouts_pitched: 100,
    innings_pitched_outs: 600,
  })

  const rateVsHighK = calculateStrikeoutRate(batter, highKPitcher)
  const rateVsLowK = calculateStrikeoutRate(batter, lowKPitcher)

  assert(rateVsHighK > rateVsLowK, `K rate vs high-K pitcher (${rateVsHighK.toFixed(3)}) should be > vs low-K pitcher (${rateVsLowK.toFixed(3)})`)
})

test('calculateStrikeoutRate is clamped to reasonable bounds', () => {
  // Even extreme pitchers shouldn't produce > 40% or < 5%
  const extremeHighK = createMockPitcher({
    strikeouts_pitched: 400, // 18 K/9
    innings_pitched_outs: 600,
  })

  const extremeLowK = createMockPitcher({
    strikeouts_pitched: 50, // 2.25 K/9
    innings_pitched_outs: 600,
  })

  const highRate = calculateStrikeoutRate(null, extremeHighK)
  const lowRate = calculateStrikeoutRate(null, extremeLowK)

  assert(highRate <= 0.40, `High K rate ${highRate} should be <= 40%`)
  assert(lowRate >= 0.05, `Low K rate ${lowRate} should be >= 5%`)
})

// ============================================================================
// Test: Overall Simulation Contract
// ============================================================================

console.log('\n--- SIMULATION CONTRACT ---\n')

test('Power hitter should not get 34% HR rate (old bug)', () => {
  // This test documents the bug that was fixed
  // Old formula: extraBaseRate = (SLG - AVG) / AVG
  // For .350/.648: (0.648 - 0.350) / 0.350 = 0.851 = 85% XBH rate
  // With 40% of XBH being HR: 0.851 * 0.4 = 34% HR rate - WAY TOO HIGH

  const powerHitter = createMockBatter({
    hits: 175,
    home_runs: 40,
    at_bats: 500,
    batting_avg: 0.350,
    slugging_pct: 0.648,
  })

  const dist = calculateHitDistribution(powerHitter)

  // Actual HR rate should be ~23% (40/175), not 34%
  assert(dist.homeRunRate < 0.30, `HR rate ${dist.homeRunRate} must be < 30% (old bug gave 34%)`)

  console.log(`  -> Power hitter HR rate: ${(dist.homeRunRate * 100).toFixed(1)}% (old bug: 34%)`)
  console.log(`  -> Power hitter single rate: ${(dist.singleRate * 100).toFixed(1)}% (old bug: ~15%)`)
})

// ============================================================================
// RESULTS
// ============================================================================
console.log('\n' + '='.repeat(70))
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(70))

if (failed > 0) {
  console.log('\nThese tests define expected hit distribution behavior.')
  console.log('Fix calculateHitDistribution in statMaster.ts to make tests pass.')
  process.exit(1)
} else {
  console.log('\nAll tests PASSED!')
}
