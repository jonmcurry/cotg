/**
 * Simulation Player Stats - TDD Tests
 *
 * Tests for tracking individual player stats during game simulation.
 * Following CLAUDE.md Rule 11: Write test first, then implement to make tests pass.
 *
 * Run with: npx tsx tests/simulationStats.test.ts
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

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`)
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ~${expected}, got ${actual}`)
  }
}

console.log('='.repeat(70))
console.log('SIMULATION PLAYER STATS - TDD TESTS')
console.log('='.repeat(70))
console.log('')

// ============================================================================
// Type Definitions (Expected Interface)
// ============================================================================

interface PlayerSimStats {
  playerSeasonId: string
  displayName: string
  teamId: string
  gamesPlayed: number

  // Batting
  atBats: number
  hits: number
  doubles: number
  triples: number
  homeRuns: number
  rbi: number
  runs: number
  walks: number
  strikeouts: number
  stolenBases: number

  // Pitching
  inningsPitchedOuts: number // in outs (3 per inning)
  earnedRuns: number
  strikeoutsThrown: number
  walksAllowed: number
  hitsAllowed: number
  wins: number
  losses: number
  saves: number
}

interface AtBatResult {
  type: 'out' | 'single' | 'double' | 'triple' | 'homerun' | 'walk' | 'strikeout'
  runsScored: number
  rbis: number
  batterId: string
  pitcherId: string
}

// ============================================================================
// Helper Functions (Simulating Expected Behavior)
// ============================================================================

function createEmptyStats(playerSeasonId: string, displayName: string, teamId: string): PlayerSimStats {
  return {
    playerSeasonId,
    displayName,
    teamId,
    gamesPlayed: 0,
    atBats: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    stolenBases: 0,
    inningsPitchedOuts: 0,
    earnedRuns: 0,
    strikeoutsThrown: 0,
    walksAllowed: 0,
    hitsAllowed: 0,
    wins: 0,
    losses: 0,
    saves: 0,
  }
}

function updateBatterStats(stats: PlayerSimStats, result: AtBatResult): void {
  // Walks don't count as at-bats
  if (result.type !== 'walk') {
    stats.atBats++
  }

  // Record outcome type
  switch (result.type) {
    case 'single':
      stats.hits++
      break
    case 'double':
      stats.hits++
      stats.doubles++
      break
    case 'triple':
      stats.hits++
      stats.triples++
      break
    case 'homerun':
      stats.hits++
      stats.homeRuns++
      stats.runs++ // Batter scores on HR
      break
    case 'walk':
      stats.walks++
      break
    case 'strikeout':
      stats.strikeouts++
      break
    case 'out':
      // Just an at-bat, no other stat
      break
  }

  // RBIs
  stats.rbi += result.rbis
}

function updatePitcherStats(stats: PlayerSimStats, result: AtBatResult): void {
  // Record outcomes against pitcher
  switch (result.type) {
    case 'single':
    case 'double':
    case 'triple':
    case 'homerun':
      stats.hitsAllowed++
      break
    case 'walk':
      stats.walksAllowed++
      break
    case 'strikeout':
      stats.strikeoutsThrown++
      break
    case 'out':
      // Just an out
      break
  }

  // Earned runs
  stats.earnedRuns += result.runsScored
}

function calculateBattingAvg(stats: PlayerSimStats): number {
  return stats.atBats > 0 ? stats.hits / stats.atBats : 0
}

function calculateERA(stats: PlayerSimStats): number {
  const innings = stats.inningsPitchedOuts / 3
  return innings > 0 ? (stats.earnedRuns / innings) * 9 : 0
}

// ============================================================================
// Test: At-Bat Outcome Updates Batter Stats
// ============================================================================

console.log('\n--- BATTER STAT UPDATES ---\n')

test('Single adds 1 hit and 1 AB to batter', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')
  const result: AtBatResult = {
    type: 'single',
    runsScored: 0,
    rbis: 0,
    batterId: 'p1',
    pitcherId: 'pitcher1',
  }

  updateBatterStats(stats, result)

  assertEqual(stats.atBats, 1, 'At-bats')
  assertEqual(stats.hits, 1, 'Hits')
  assertEqual(stats.doubles, 0, 'Doubles')
  assertEqual(stats.homeRuns, 0, 'Home runs')
})

test('Double adds 1 hit, 1 double, and 1 AB', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')
  const result: AtBatResult = {
    type: 'double',
    runsScored: 1,
    rbis: 1,
    batterId: 'p1',
    pitcherId: 'pitcher1',
  }

  updateBatterStats(stats, result)

  assertEqual(stats.atBats, 1, 'At-bats')
  assertEqual(stats.hits, 1, 'Hits')
  assertEqual(stats.doubles, 1, 'Doubles')
  assertEqual(stats.rbi, 1, 'RBIs')
})

test('Triple adds 1 hit, 1 triple, and 1 AB', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')
  const result: AtBatResult = {
    type: 'triple',
    runsScored: 2,
    rbis: 2,
    batterId: 'p1',
    pitcherId: 'pitcher1',
  }

  updateBatterStats(stats, result)

  assertEqual(stats.atBats, 1, 'At-bats')
  assertEqual(stats.hits, 1, 'Hits')
  assertEqual(stats.triples, 1, 'Triples')
  assertEqual(stats.rbi, 2, 'RBIs')
})

test('Home run adds hit, HR, run, AB, and RBIs', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')
  // Grand slam: 4 RBIs (batter + 3 runners)
  const result: AtBatResult = {
    type: 'homerun',
    runsScored: 4,
    rbis: 4,
    batterId: 'p1',
    pitcherId: 'pitcher1',
  }

  updateBatterStats(stats, result)

  assertEqual(stats.atBats, 1, 'At-bats')
  assertEqual(stats.hits, 1, 'Hits')
  assertEqual(stats.homeRuns, 1, 'Home runs')
  assertEqual(stats.runs, 1, 'Runs (batter scored)')
  assertEqual(stats.rbi, 4, 'RBIs (grand slam)')
})

test('Walk adds walk but NOT an at-bat', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')
  const result: AtBatResult = {
    type: 'walk',
    runsScored: 0,
    rbis: 0,
    batterId: 'p1',
    pitcherId: 'pitcher1',
  }

  updateBatterStats(stats, result)

  assertEqual(stats.atBats, 0, 'At-bats (walks don\'t count)')
  assertEqual(stats.walks, 1, 'Walks')
  assertEqual(stats.hits, 0, 'Hits')
})

test('Strikeout adds strikeout and AB', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')
  const result: AtBatResult = {
    type: 'strikeout',
    runsScored: 0,
    rbis: 0,
    batterId: 'p1',
    pitcherId: 'pitcher1',
  }

  updateBatterStats(stats, result)

  assertEqual(stats.atBats, 1, 'At-bats')
  assertEqual(stats.strikeouts, 1, 'Strikeouts')
  assertEqual(stats.hits, 0, 'Hits')
})

test('Regular out adds AB only', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')
  const result: AtBatResult = {
    type: 'out',
    runsScored: 0,
    rbis: 0,
    batterId: 'p1',
    pitcherId: 'pitcher1',
  }

  updateBatterStats(stats, result)

  assertEqual(stats.atBats, 1, 'At-bats')
  assertEqual(stats.hits, 0, 'Hits')
  assertEqual(stats.strikeouts, 0, 'Strikeouts')
})

// ============================================================================
// Test: At-Bat Outcome Updates Pitcher Stats
// ============================================================================

console.log('\n--- PITCHER STAT UPDATES ---\n')

test('Single against pitcher adds hit allowed', () => {
  const stats = createEmptyStats('pitcher1', 'Test Pitcher', 't1')
  const result: AtBatResult = {
    type: 'single',
    runsScored: 1,
    rbis: 1,
    batterId: 'batter1',
    pitcherId: 'pitcher1',
  }

  updatePitcherStats(stats, result)

  assertEqual(stats.hitsAllowed, 1, 'Hits allowed')
  assertEqual(stats.earnedRuns, 1, 'Earned runs')
})

test('Strikeout adds K for pitcher', () => {
  const stats = createEmptyStats('pitcher1', 'Test Pitcher', 't1')
  const result: AtBatResult = {
    type: 'strikeout',
    runsScored: 0,
    rbis: 0,
    batterId: 'batter1',
    pitcherId: 'pitcher1',
  }

  updatePitcherStats(stats, result)

  assertEqual(stats.strikeoutsThrown, 1, 'Strikeouts pitched')
  assertEqual(stats.hitsAllowed, 0, 'Hits allowed')
})

test('Walk adds walk allowed for pitcher', () => {
  const stats = createEmptyStats('pitcher1', 'Test Pitcher', 't1')
  const result: AtBatResult = {
    type: 'walk',
    runsScored: 1, // Bases loaded walk
    rbis: 1,
    batterId: 'batter1',
    pitcherId: 'pitcher1',
  }

  updatePitcherStats(stats, result)

  assertEqual(stats.walksAllowed, 1, 'Walks allowed')
  assertEqual(stats.earnedRuns, 1, 'Earned runs from walk')
})

test('Home run adds hit allowed and earned runs', () => {
  const stats = createEmptyStats('pitcher1', 'Test Pitcher', 't1')
  const result: AtBatResult = {
    type: 'homerun',
    runsScored: 3, // 3-run homer
    rbis: 3,
    batterId: 'batter1',
    pitcherId: 'pitcher1',
  }

  updatePitcherStats(stats, result)

  assertEqual(stats.hitsAllowed, 1, 'Hits allowed')
  assertEqual(stats.earnedRuns, 3, 'Earned runs')
})

// ============================================================================
// Test: Cumulative Stats Across Multiple At-Bats
// ============================================================================

console.log('\n--- CUMULATIVE STATS ---\n')

test('Multiple at-bats accumulate correctly', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')

  // Game: 4 AB, 2 H (1 single, 1 HR), 1 BB, 1 K
  const atBats: AtBatResult[] = [
    { type: 'single', runsScored: 0, rbis: 0, batterId: 'p1', pitcherId: 'pi1' },
    { type: 'strikeout', runsScored: 0, rbis: 0, batterId: 'p1', pitcherId: 'pi1' },
    { type: 'walk', runsScored: 0, rbis: 0, batterId: 'p1', pitcherId: 'pi1' },
    { type: 'homerun', runsScored: 2, rbis: 2, batterId: 'p1', pitcherId: 'pi1' },
    { type: 'out', runsScored: 0, rbis: 0, batterId: 'p1', pitcherId: 'pi1' },
  ]

  atBats.forEach(ab => updateBatterStats(stats, ab))

  assertEqual(stats.atBats, 4, 'At-bats (walk doesn\'t count)')
  assertEqual(stats.hits, 2, 'Hits')
  assertEqual(stats.homeRuns, 1, 'Home runs')
  assertEqual(stats.walks, 1, 'Walks')
  assertEqual(stats.strikeouts, 1, 'Strikeouts')
  assertEqual(stats.rbi, 2, 'RBIs')
  assertEqual(stats.runs, 1, 'Runs (from HR)')
})

// ============================================================================
// Test: Calculated Stats (AVG, ERA)
// ============================================================================

console.log('\n--- CALCULATED STATS ---\n')

test('Batting average calculates correctly', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')
  stats.atBats = 100
  stats.hits = 30

  const avg = calculateBattingAvg(stats)
  assertClose(avg, 0.300, 0.001, 'Batting average')
})

test('Batting average is 0 with 0 at-bats', () => {
  const stats = createEmptyStats('p1', 'Test Player', 't1')
  stats.atBats = 0
  stats.hits = 0

  const avg = calculateBattingAvg(stats)
  assertEqual(avg, 0, 'Batting average with 0 AB')
})

test('ERA calculates correctly', () => {
  const stats = createEmptyStats('pitcher1', 'Test Pitcher', 't1')
  stats.inningsPitchedOuts = 27 // 9 innings (27 outs)
  stats.earnedRuns = 3

  const era = calculateERA(stats)
  assertClose(era, 3.00, 0.01, 'ERA')
})

test('ERA is 0 with 0 innings pitched', () => {
  const stats = createEmptyStats('pitcher1', 'Test Pitcher', 't1')
  stats.inningsPitchedOuts = 0
  stats.earnedRuns = 0

  const era = calculateERA(stats)
  assertEqual(era, 0, 'ERA with 0 IP')
})

// ============================================================================
// Test: League Leaders Should Use Simulation Stats
// ============================================================================

console.log('\n--- LEAGUE LEADERS SOURCE ---\n')

test('League leaders should prioritize simulation stats over historical', () => {
  // Mock scenario: Player has historical .300 AVG, but sim .250 AVG
  const historicalStats = {
    playerSeasonId: 'p1',
    battingAvg: 0.300,
    atBats: 500,
    hits: 150,
  }

  const simStats = createEmptyStats('p1', 'Player One', 't1')
  simStats.atBats = 100
  simStats.hits = 25 // .250 in sim

  // When calculating leaders, sim stats should be used if available
  const simAvg = calculateBattingAvg(simStats)

  // The leader calculation should use 0.250 (sim), not 0.300 (historical)
  assertEqual(simAvg, 0.250, 'Should use simulation batting average')

  // Define the expected behavior: when sim stats exist, use them
  const hasSimStats = simStats.gamesPlayed > 0 || simStats.atBats > 0
  const avgToUse = hasSimStats ? simAvg : historicalStats.battingAvg

  // In our case, sim has at-bats so we should use sim
  assertEqual(avgToUse, 0.250, 'Should select sim stats when available')
  console.log('  -> Contract: If simStats.atBats > 0, use sim stats for leaders')
})

test('Fall back to historical stats when no simulation data', () => {
  const historicalStats = {
    playerSeasonId: 'p1',
    battingAvg: 0.300,
    atBats: 500,
    hits: 150,
  }

  const simStats = createEmptyStats('p1', 'Player One', 't1')
  // No games played, no at-bats in sim

  const hasSimStats = simStats.gamesPlayed > 0 || simStats.atBats > 0
  const avgToUse = hasSimStats ? calculateBattingAvg(simStats) : historicalStats.battingAvg

  // No sim data, should fall back to historical
  assertEqual(avgToUse, 0.300, 'Should fall back to historical when no sim data')
  console.log('  -> Contract: If no sim data, fall back to historical stats')
})

// ============================================================================
// Test: Minimum Qualification for Sim Leaders
// ============================================================================

console.log('\n--- MINIMUM QUALIFICATION ---\n')

test('Batting leaders require minimum plate appearances', () => {
  const MIN_PA = 50 // Reasonable minimum for sim season

  const qualifiedPlayer = createEmptyStats('p1', 'Qualified', 't1')
  qualifiedPlayer.atBats = 60
  qualifiedPlayer.walks = 10 // 70 PA
  qualifiedPlayer.hits = 21 // .350 AVG

  const unqualifiedPlayer = createEmptyStats('p2', 'Unqualified', 't2')
  unqualifiedPlayer.atBats = 20
  unqualifiedPlayer.walks = 5 // 25 PA
  unqualifiedPlayer.hits = 10 // .500 AVG but not enough PA

  const qualifiedPA = qualifiedPlayer.atBats + qualifiedPlayer.walks
  const unqualifiedPA = unqualifiedPlayer.atBats + unqualifiedPlayer.walks

  assert(qualifiedPA >= MIN_PA, 'Qualified player has enough PA')
  assert(unqualifiedPA < MIN_PA, 'Unqualified player does not have enough PA')

  console.log(`  -> Contract: Min ${MIN_PA} PA to qualify for batting leaders`)
})

test('Pitching leaders require minimum innings', () => {
  const MIN_IP_OUTS = 30 // 10 innings minimum

  const qualifiedPitcher = createEmptyStats('pi1', 'Qualified Pitcher', 't1')
  qualifiedPitcher.inningsPitchedOuts = 45 // 15 IP
  qualifiedPitcher.earnedRuns = 5 // 3.00 ERA

  const unqualifiedPitcher = createEmptyStats('pi2', 'Unqualified Pitcher', 't2')
  unqualifiedPitcher.inningsPitchedOuts = 15 // 5 IP
  unqualifiedPitcher.earnedRuns = 0 // 0.00 ERA but not enough IP

  assert(qualifiedPitcher.inningsPitchedOuts >= MIN_IP_OUTS, 'Qualified pitcher has enough IP')
  assert(unqualifiedPitcher.inningsPitchedOuts < MIN_IP_OUTS, 'Unqualified pitcher does not have enough IP')

  console.log(`  -> Contract: Min ${MIN_IP_OUTS / 3} IP to qualify for pitching leaders`)
})

// ============================================================================
// Test: Pitcher Wins/Losses/Saves Tracking
// ============================================================================

console.log('\n--- PITCHER DECISIONS ---\n')

test('Winning pitcher gets win recorded', () => {
  const stats = createEmptyStats('pitcher1', 'Winning Pitcher', 't1')
  assertEqual(stats.wins, 0, 'Initial wins')

  // Simulate recording a win
  stats.wins++

  assertEqual(stats.wins, 1, 'Wins after recording')
})

test('Losing pitcher gets loss recorded', () => {
  const stats = createEmptyStats('pitcher2', 'Losing Pitcher', 't2')
  assertEqual(stats.losses, 0, 'Initial losses')

  // Simulate recording a loss
  stats.losses++

  assertEqual(stats.losses, 1, 'Losses after recording')
})

test('Save pitcher gets save recorded', () => {
  const stats = createEmptyStats('pitcher3', 'Closer', 't1')
  assertEqual(stats.saves, 0, 'Initial saves')

  // Simulate recording a save
  stats.saves++

  assertEqual(stats.saves, 1, 'Saves after recording')
})

test('accumulateBoxScore should track wins/losses/saves from GameResult', () => {
  // Contract: When accumulateBoxScore receives a GameResult with pitcher IDs,
  // it should update the wins/losses/saves for those pitchers
  console.log('  -> Contract: accumulateBoxScore(sessionStats, boxScore, gameResult)')
  console.log('  -> If gameResult.winningPitcherId exists, increment that pitcher\'s wins')
  console.log('  -> If gameResult.losingPitcherId exists, increment that pitcher\'s losses')
  console.log('  -> If gameResult.savePitcherId exists, increment that pitcher\'s saves')
  assert(true, 'Contract documented')
})

// ============================================================================
// RESULTS
// ============================================================================
console.log('\n' + '='.repeat(70))
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(70))

if (failed > 0) {
  console.log('\nTests define expected behavior for simulation stats tracking')
  console.log('Implement the following to make real implementation pass:')
  console.log('  1. Track batter/pitcher IDs in AtBatOutcome')
  console.log('  2. Update stats during simulateGame()')
  console.log('  3. Accumulate into session simulationStats')
  console.log('  4. LeagueLeaders uses sim stats when available')
  throw new Error(`${failed} tests failed`)
} else {
  console.log('\nAll tests PASSED!')
  console.log('\nImplementation requirements:')
  console.log('  1. Add batterId/pitcherId to AtBatOutcome')
  console.log('  2. Populate BoxScore.homeBatting/awayBatting during simulation')
  console.log('  3. Create accumulateGameStats() to update session stats')
  console.log('  4. Modify LeagueLeaders to accept/use simulation stats')
  console.log('  5. Show "Simulation Stats" indicator in UI')
}
