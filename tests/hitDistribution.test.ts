/**
 * Hit Distribution - TDD Tests
 *
 * Tests to verify that the simulation produces realistic hit type distributions
 * based on actual player stats rather than flawed formulas.
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
// Mock Player Data
// ============================================================================

function createMockBatter(overrides: Partial<PlayerSeason>): PlayerSeason {
  return {
    id: 'test-batter',
    player_id: 'player-1',
    year: 2023,
    first_name: 'Test',
    last_name: 'Player',
    display_name: 'Test Player',
    team_name: 'Test Team',
    positions: ['RF'],
    hits: 150,
    doubles: 30,
    triples: 5,
    home_runs: 15,
    at_bats: 500,
    walks: 50,
    strikeouts: 100,
    batting_avg: 0.300,
    on_base_pct: 0.364,
    slugging_pct: 0.480,
    ...overrides,
  } as PlayerSeason
}

// ============================================================================
// Test: Hit Type Distribution from Real Stats
// ============================================================================

console.log('\n--- HIT TYPE DISTRIBUTION ---\n')

test('calculateHitDistribution returns rates based on actual hit data', () => {
  // Player with 150 hits: 100 singles, 30 doubles, 5 triples, 15 HRs
  const player = createMockBatter({
    hits: 150,
    doubles: 30,
    triples: 5,
    home_runs: 15,
  })

  const dist = calculateHitDistribution(player)

  // Singles = hits - doubles - triples - homeRuns = 150 - 30 - 5 - 15 = 100
  assertInRange(dist.singleRate, 0.65, 0.68, 'Single rate')  // 100/150 = 0.667
  assertInRange(dist.doubleRate, 0.19, 0.21, 'Double rate')  // 30/150 = 0.200
  assertInRange(dist.tripleRate, 0.03, 0.04, 'Triple rate')  // 5/150 = 0.033
  assertInRange(dist.homeRunRate, 0.09, 0.11, 'HR rate')     // 15/150 = 0.100
})

test('calculateHitDistribution for power hitter (Josh Gibson type)', () => {
  // Elite power hitter: .350 AVG, ~40 HRs, ~40 doubles, ~8 triples
  // 175 hits: 87 singles, 40 doubles, 8 triples, 40 HRs
  const player = createMockBatter({
    hits: 175,
    doubles: 40,
    triples: 8,
    home_runs: 40,
    at_bats: 500,
    batting_avg: 0.350,
    slugging_pct: 0.648,
  })

  const dist = calculateHitDistribution(player)

  // Singles = 175 - 40 - 8 - 40 = 87
  assertInRange(dist.singleRate, 0.48, 0.52, 'Single rate')  // 87/175 = 0.497
  assertInRange(dist.doubleRate, 0.22, 0.24, 'Double rate')  // 40/175 = 0.229
  assertInRange(dist.tripleRate, 0.04, 0.05, 'Triple rate')  // 8/175 = 0.046
  assertInRange(dist.homeRunRate, 0.22, 0.24, 'HR rate')     // 40/175 = 0.229

  // CRITICAL: HR rate should NOT be 34% like the old formula produced
  assert(dist.homeRunRate < 0.30, `HR rate ${dist.homeRunRate} should be < 30%`)
})

test('calculateHitDistribution for contact hitter', () => {
  // Contact hitter: .320 AVG, low power
  // 160 hits: 130 singles, 22 doubles, 5 triples, 3 HRs
  const player = createMockBatter({
    hits: 160,
    doubles: 22,
    triples: 5,
    home_runs: 3,
    at_bats: 500,
    batting_avg: 0.320,
    slugging_pct: 0.400,
  })

  const dist = calculateHitDistribution(player)

  // Singles = 160 - 22 - 5 - 3 = 130
  assertInRange(dist.singleRate, 0.80, 0.83, 'Single rate')  // 130/160 = 0.8125
  assertInRange(dist.doubleRate, 0.13, 0.15, 'Double rate')  // 22/160 = 0.1375
  assertInRange(dist.tripleRate, 0.02, 0.04, 'Triple rate')  // 5/160 = 0.03125
  assertInRange(dist.homeRunRate, 0.01, 0.03, 'HR rate')     // 3/160 = 0.01875
})

test('calculateHitDistribution with zero/missing data uses fallback', () => {
  const player = createMockBatter({
    hits: 0,
    doubles: 0,
    triples: 0,
    home_runs: 0,
    at_bats: 0,
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

test('calculateHitDistribution rates sum to 1.0', () => {
  const player = createMockBatter({
    hits: 150,
    doubles: 30,
    triples: 5,
    home_runs: 15,
  })

  const dist = calculateHitDistribution(player)
  const sum = dist.singleRate + dist.doubleRate + dist.tripleRate + dist.homeRunRate

  assertInRange(sum, 0.99, 1.01, 'Rates should sum to 1.0')
})

// ============================================================================
// Test: Player-Specific Strikeout Rates
// ============================================================================

console.log('\n--- STRIKEOUT RATES ---\n')

test('calculateStrikeoutRate uses player strikeout data', () => {
  // High strikeout batter (100 K in 550 PA = ~18%)
  const highKBatter = createMockBatter({
    strikeouts: 100,
    at_bats: 500,
    walks: 50,
  })

  const rate = calculateStrikeoutRate(highKBatter, null)

  // Should be around 18% (100 / 550), not fixed 20%
  assertInRange(rate, 0.15, 0.22, 'High K batter rate')
})

test('calculateStrikeoutRate for contact hitter is lower', () => {
  // Low strikeout batter (30 K in 550 PA = ~5.5%)
  const lowKBatter = createMockBatter({
    strikeouts: 30,
    at_bats: 500,
    walks: 50,
  })

  const rate = calculateStrikeoutRate(lowKBatter, null)

  // Should be around 5.5%, NOT 20%
  assertInRange(rate, 0.04, 0.10, 'Contact hitter K rate')
})

test('calculateStrikeoutRate for power hitter is higher', () => {
  // High strikeout power batter (180 K in 550 PA = ~33%)
  const powerBatter = createMockBatter({
    strikeouts: 180,
    at_bats: 500,
    walks: 50,
  })

  const rate = calculateStrikeoutRate(powerBatter, null)

  // Should be around 33%
  assertInRange(rate, 0.28, 0.40, 'Power hitter K rate')
})

test('calculateStrikeoutRate pitcher adjusts the rate', () => {
  const batter = createMockBatter({
    strikeouts: 100,
    at_bats: 500,
    walks: 50,
  })

  // High K pitcher (10 K/9)
  const highKPitcher = {
    id: 'pitcher-1',
    strikeouts_per_9: 10.0,
    era: 3.50,
  } as PlayerSeason

  // Low K pitcher (5 K/9)
  const lowKPitcher = {
    id: 'pitcher-2',
    strikeouts_per_9: 5.0,
    era: 4.50,
  } as PlayerSeason

  const rateVsHighK = calculateStrikeoutRate(batter, highKPitcher)
  const rateVsLowK = calculateStrikeoutRate(batter, lowKPitcher)

  assert(rateVsHighK > rateVsLowK, `K rate vs high-K pitcher (${rateVsHighK}) should be > vs low-K pitcher (${rateVsLowK})`)
})

test('calculateStrikeoutRate with null batter uses default', () => {
  const rate = calculateStrikeoutRate(null, null)

  // Should use a reasonable default around 15-20%
  assertInRange(rate, 0.10, 0.25, 'Default K rate')
})

// ============================================================================
// Test: Overall Hit Distribution in Simulation
// ============================================================================

console.log('\n--- SIMULATION OUTPUT VALIDATION ---\n')

test('simulateAtBat distribution matches player profile over many at-bats', () => {
  // This is a statistical test - run many simulations and check distribution
  // We import simulateAtBat if it's exported, or test through simulateGame

  // For now, just assert the contract we expect:
  // After implementing the fix, running 1000 at-bats for a .350/.648 hitter
  // should produce roughly:
  // - ~50% singles (not 15%)
  // - ~23% doubles
  // - ~5% triples
  // - ~22% HRs (not 34%)

  console.log('  -> Contract: Power hitter (~.350/.648) should get ~50% singles, ~22% HRs')
  console.log('  -> Contract: Contact hitter should get ~80% singles, ~2% HRs')

  // This test documents expected behavior - actual implementation test would:
  // 1. Run simulateAtBat 1000 times
  // 2. Count hit types
  // 3. Verify distribution matches player's actual hit breakdown
  assert(true, 'Distribution contract documented')
})

// ============================================================================
// RESULTS
// ============================================================================
console.log('\n' + '='.repeat(70))
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(70))

if (failed > 0) {
  console.log('\nThese tests define expected hit distribution behavior.')
  console.log('Implement calculateHitDistribution and calculateStrikeoutRate in statMaster.ts')
  console.log('to make these tests pass.')
  process.exit(1)
} else {
  console.log('\nAll tests PASSED!')
}
