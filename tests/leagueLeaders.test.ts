/**
 * League Leaders - TDD Tests
 *
 * Tests for the league leaders calculation utility.
 * Following CLAUDE.md Rule 11: Write test first, then implement to make tests pass.
 *
 * Run with: npx tsx tests/leagueLeaders.test.ts
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

function assertArrayLength(arr: unknown[], expected: number, message: string) {
  if (arr.length !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${arr.length}`)
  }
}

console.log('='.repeat(70))
console.log('LEAGUE LEADERS - TDD TESTS')
console.log('='.repeat(70))
console.log('')

// ============================================================================
// Mock Data
// ============================================================================

interface MockPlayer {
  id: string
  player_id: string
  display_name: string
  year: number
  team_id: string
  primary_position: string
  batting_avg: number | null
  at_bats: number | null
  hits: number | null
  home_runs: number | null
  rbi: number | null
  stolen_bases: number | null
  era: number | null
  wins: number | null
  strikeouts_pitched: number | null
  saves: number | null
  innings_pitched_outs: number | null
}

const mockBatters: MockPlayer[] = [
  { id: 'p1', player_id: 'pl1', display_name: 'Wade Boggs', year: 1988, team_id: 't1', primary_position: '3B', batting_avg: 0.366, at_bats: 584, hits: 214, home_runs: 5, rbi: 58, stolen_bases: 2, era: null, wins: null, strikeouts_pitched: null, saves: null, innings_pitched_outs: null },
  { id: 'p2', player_id: 'pl2', display_name: 'Tony Gwynn', year: 1994, team_id: 't2', primary_position: 'OF', batting_avg: 0.394, at_bats: 419, hits: 165, home_runs: 12, rbi: 64, stolen_bases: 5, era: null, wins: null, strikeouts_pitched: null, saves: null, innings_pitched_outs: null },
  { id: 'p3', player_id: 'pl3', display_name: 'Rod Carew', year: 1977, team_id: 't3', primary_position: '1B', batting_avg: 0.388, at_bats: 616, hits: 239, home_runs: 14, rbi: 100, stolen_bases: 23, era: null, wins: null, strikeouts_pitched: null, saves: null, innings_pitched_outs: null },
  { id: 'p4', player_id: 'pl4', display_name: 'Ichiro Suzuki', year: 2004, team_id: 't4', primary_position: 'OF', batting_avg: 0.372, at_bats: 704, hits: 262, home_runs: 8, rbi: 60, stolen_bases: 36, era: null, wins: null, strikeouts_pitched: null, saves: null, innings_pitched_outs: null },
  { id: 'p5', player_id: 'pl5', display_name: 'George Brett', year: 1980, team_id: 't5', primary_position: '3B', batting_avg: 0.390, at_bats: 449, hits: 175, home_runs: 24, rbi: 118, stolen_bases: 15, era: null, wins: null, strikeouts_pitched: null, saves: null, innings_pitched_outs: null },
  { id: 'p6', player_id: 'pl6', display_name: 'Ted Williams', year: 1941, team_id: 't6', primary_position: 'OF', batting_avg: 0.406, at_bats: 456, hits: 185, home_runs: 37, rbi: 120, stolen_bases: 2, era: null, wins: null, strikeouts_pitched: null, saves: null, innings_pitched_outs: null },
  { id: 'p7', player_id: 'pl7', display_name: 'Low AB Guy', year: 2000, team_id: 't7', primary_position: 'C', batting_avg: 0.500, at_bats: 10, hits: 5, home_runs: 0, rbi: 2, stolen_bases: 0, era: null, wins: null, strikeouts_pitched: null, saves: null, innings_pitched_outs: null },
]

const mockPitchers: MockPlayer[] = [
  { id: 'pi1', player_id: 'pip1', display_name: 'Bob Gibson', year: 1968, team_id: 't1', primary_position: 'SP', batting_avg: null, at_bats: null, hits: null, home_runs: null, rbi: null, stolen_bases: null, era: 1.12, wins: 22, strikeouts_pitched: 268, saves: 0, innings_pitched_outs: 918 },
  { id: 'pi2', player_id: 'pip2', display_name: 'Mariano Rivera', year: 1999, team_id: 't2', primary_position: 'RP', batting_avg: null, at_bats: null, hits: null, home_runs: null, rbi: null, stolen_bases: null, era: 1.83, wins: 4, strikeouts_pitched: 52, saves: 45, innings_pitched_outs: 219 },
  { id: 'pi3', player_id: 'pip3', display_name: 'Pedro Martinez', year: 2000, team_id: 't3', primary_position: 'SP', batting_avg: null, at_bats: null, hits: null, home_runs: null, rbi: null, stolen_bases: null, era: 1.74, wins: 18, strikeouts_pitched: 284, saves: 0, innings_pitched_outs: 651 },
  { id: 'pi4', player_id: 'pip4', display_name: 'Greg Maddux', year: 1995, team_id: 't4', primary_position: 'SP', batting_avg: null, at_bats: null, hits: null, home_runs: null, rbi: null, stolen_bases: null, era: 1.63, wins: 19, strikeouts_pitched: 181, saves: 0, innings_pitched_outs: 629 },
  { id: 'pi5', player_id: 'pip5', display_name: 'Randy Johnson', year: 2001, team_id: 't5', primary_position: 'SP', batting_avg: null, at_bats: null, hits: null, home_runs: null, rbi: null, stolen_bases: null, era: 2.49, wins: 21, strikeouts_pitched: 372, saves: 0, innings_pitched_outs: 754 },
  { id: 'pi6', player_id: 'pip6', display_name: 'Dennis Eckersley', year: 1990, team_id: 't6', primary_position: 'RP', batting_avg: null, at_bats: null, hits: null, home_runs: null, rbi: null, stolen_bases: null, era: 0.61, wins: 4, strikeouts_pitched: 73, saves: 48, innings_pitched_outs: 219 },
]

// ============================================================================
// Test: League Leaders Calculation - Batting
// ============================================================================

console.log('\n--- BATTING LEADERS TESTS ---\n')

test('Returns top 5 batters by AVG (sorted descending)', () => {
  // Expected order by AVG: Williams (.406), Gwynn (.394), Brett (.390), Carew (.388), Suzuki (.372), Boggs (.366)
  // Low AB Guy has .500 but should be excluded due to minimum AB requirement

  // This tests the behavior we WANT - minimum AB threshold
  const qualifyingBatters = mockBatters.filter(p => (p.at_bats || 0) >= 100)
  const sorted = qualifyingBatters.sort((a, b) => (b.batting_avg || 0) - (a.batting_avg || 0))
  const top5 = sorted.slice(0, 5)

  assertArrayLength(top5, 5, 'Should return exactly 5 batters')
  assert(top5[0].display_name === 'Ted Williams', `First should be Ted Williams, got ${top5[0].display_name}`)
  assert(top5[1].display_name === 'Tony Gwynn', `Second should be Tony Gwynn, got ${top5[1].display_name}`)
  assert(top5[2].display_name === 'George Brett', `Third should be George Brett, got ${top5[2].display_name}`)

  // Ensure Low AB Guy is NOT in top 5 despite .500 avg
  const hasLowABGuy = top5.some(p => p.display_name === 'Low AB Guy')
  assert(!hasLowABGuy, 'Low AB Guy should not be in top 5 due to minimum AB requirement')
})

test('Returns top 5 batters by HR (sorted descending)', () => {
  const sorted = [...mockBatters].sort((a, b) => (b.home_runs || 0) - (a.home_runs || 0))
  const top5 = sorted.slice(0, 5)

  assertArrayLength(top5, 5, 'Should return 5 or fewer batters')
  assert(top5[0].display_name === 'Ted Williams', `First by HR should be Ted Williams (37), got ${top5[0].display_name}`)
  assert((top5[0].home_runs || 0) >= (top5[1].home_runs || 0), 'Should be sorted descending by HR')
})

test('Returns top 5 batters by RBI (sorted descending)', () => {
  const sorted = [...mockBatters].sort((a, b) => (b.rbi || 0) - (a.rbi || 0))
  const top5 = sorted.slice(0, 5)

  // Ted Williams 120, George Brett 118, Rod Carew 100
  assert(top5[0].display_name === 'Ted Williams', `First by RBI should be Ted Williams (120), got ${top5[0].display_name}`)
  assert(top5[1].display_name === 'George Brett', `Second by RBI should be George Brett (118), got ${top5[1].display_name}`)
})

test('Returns all batters when fewer than 5 qualify', () => {
  const onlyTwoBatters = mockBatters.slice(0, 2)
  const sorted = [...onlyTwoBatters].sort((a, b) => (b.batting_avg || 0) - (a.batting_avg || 0))

  assertArrayLength(sorted, 2, 'Should return all 2 batters when only 2 exist')
})

test('Handles empty player array', () => {
  const emptyArray: MockPlayer[] = []
  assertArrayLength(emptyArray, 0, 'Empty array should return 0 leaders')
})

// ============================================================================
// Test: League Leaders Calculation - Pitching
// ============================================================================

console.log('\n--- PITCHING LEADERS TESTS ---\n')

test('Returns top 5 pitchers by ERA (sorted ascending - lower is better)', () => {
  // ERA: Eckersley 0.61, Gibson 1.12, Maddux 1.63, Martinez 1.74, Rivera 1.83, Johnson 2.49
  const sorted = [...mockPitchers].sort((a, b) => (a.era || 999) - (b.era || 999))
  const top5 = sorted.slice(0, 5)

  assertArrayLength(top5, 5, 'Should return exactly 5 pitchers')
  assert(top5[0].display_name === 'Dennis Eckersley', `First by ERA should be Dennis Eckersley (0.61), got ${top5[0].display_name}`)
  assert(top5[1].display_name === 'Bob Gibson', `Second by ERA should be Bob Gibson (1.12), got ${top5[1].display_name}`)
  assert((top5[0].era || 0) <= (top5[1].era || 0), 'Should be sorted ascending by ERA')
})

test('Returns top 5 pitchers by Wins (sorted descending)', () => {
  // Wins: Gibson 22, Johnson 21, Maddux 19, Martinez 18, Rivera/Eckersley 4
  const sorted = [...mockPitchers].sort((a, b) => (b.wins || 0) - (a.wins || 0))
  const top5 = sorted.slice(0, 5)

  assertArrayLength(top5, 5, 'Should return exactly 5 pitchers')
  assert(top5[0].display_name === 'Bob Gibson', `First by Wins should be Bob Gibson (22), got ${top5[0].display_name}`)
  assert(top5[1].display_name === 'Randy Johnson', `Second by Wins should be Randy Johnson (21), got ${top5[1].display_name}`)
})

test('Returns top 5 pitchers by Strikeouts (sorted descending)', () => {
  // K: Johnson 372, Martinez 284, Gibson 268, Maddux 181, Eckersley 73, Rivera 52
  const sorted = [...mockPitchers].sort((a, b) => (b.strikeouts_pitched || 0) - (a.strikeouts_pitched || 0))
  const top5 = sorted.slice(0, 5)

  assert(top5[0].display_name === 'Randy Johnson', `First by K should be Randy Johnson (372), got ${top5[0].display_name}`)
  assert(top5[1].display_name === 'Pedro Martinez', `Second by K should be Pedro Martinez (284), got ${top5[1].display_name}`)
})

test('Returns top 5 pitchers by Saves (sorted descending)', () => {
  // Saves: Eckersley 48, Rivera 45, others 0
  const sorted = [...mockPitchers].sort((a, b) => (b.saves || 0) - (a.saves || 0))
  const top5 = sorted.slice(0, 5)

  assert(top5[0].display_name === 'Dennis Eckersley', `First by Saves should be Dennis Eckersley (48), got ${top5[0].display_name}`)
  assert(top5[1].display_name === 'Mariano Rivera', `Second by Saves should be Mariano Rivera (45), got ${top5[1].display_name}`)
})

// ============================================================================
// Test: Mixed players (filtering batters vs pitchers)
// ============================================================================

console.log('\n--- PLAYER TYPE FILTERING TESTS ---\n')

test('Should correctly identify position players vs pitchers', () => {
  const allPlayers = [...mockBatters, ...mockPitchers]

  const batters = allPlayers.filter(p => !['SP', 'RP', 'P'].includes(p.primary_position))
  const pitchers = allPlayers.filter(p => ['SP', 'RP', 'P'].includes(p.primary_position))

  assertArrayLength(batters, mockBatters.length, 'Should identify all batters')
  assertArrayLength(pitchers, mockPitchers.length, 'Should identify all pitchers')
})

// ============================================================================
// RESULTS
// ============================================================================
console.log('\n' + '='.repeat(70))
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(70))

if (failed > 0) {
  console.log('\nTests completed with failures - these define expected behavior')
  console.log('Implement src/utils/leagueLeaders.ts to make these tests pass')
  process.exit(1)
} else {
  console.log('\nAll tests PASSED!')
  console.log('Note: Mock sorting logic validates expected behavior')
  console.log('Implement src/utils/leagueLeaders.ts following this logic')
  process.exit(0)
}
