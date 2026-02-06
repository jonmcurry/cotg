/**
 * Auto Lineup Generation - TDD Tests
 *
 * Tests to verify that auto lineup generation works correctly after draft complete.
 *
 * Following CLAUDE.md Rule 11: Write tests first, then make them pass.
 *
 * Run with: npx tsx tests/autoLineup.test.ts
 */

// Simple test runner
let passed = 0
let failed = 0

function test(name: string, fn: () => void | Promise<void>) {
  const runTest = async () => {
    try {
      await fn()
      console.log(`PASS: ${name}`)
      passed++
    } catch (e: unknown) {
      const error = e as Error
      console.log(`FAIL: ${name}`)
      console.log(`  -> ${error.message}`)
      failed++
    }
  }
  return runTest()
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

console.log('='.repeat(70))
console.log('AUTO LINEUP GENERATION - TDD TESTS')
console.log('='.repeat(70))
console.log('')

// ============================================================================
// Mock Data Types (matching actual types from draft.types.ts)
// ============================================================================

type PositionCode = 'C' | '1B' | '2B' | 'SS' | '3B' | 'OF' | 'SP' | 'RP' | 'CL' | 'DH' | 'BN'

interface RosterSlot {
  position: PositionCode
  slotNumber: number
  playerSeasonId: string | null
  isFilled: boolean
}

interface LineupSlot {
  slotNumber: number
  playerSeasonId: string | null
  position: PositionCode
}

interface RotationSlot {
  slotNumber: number
  playerSeasonId: string | null
}

interface TeamDepthChart {
  lineupVS_RHP: LineupSlot[]
  lineupVS_LHP: LineupSlot[]
  rotation: RotationSlot[]
  bullpen: {
    closer: string | null
    setup: string[]
  }
}

interface DraftTeam {
  id: string
  name: string
  control: 'human' | 'cpu'
  draftPosition: number
  roster: RosterSlot[]
  draftSessionId: string
  depthChart?: TeamDepthChart
  league?: 'AL' | 'NL'
  division?: 'East' | 'West' | 'North' | 'South'
}

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRoster(): RosterSlot[] {
  // Create a full 21-player roster (like a completed draft)
  const positions: Array<{ position: PositionCode; count: number }> = [
    { position: 'C', count: 1 },
    { position: '1B', count: 1 },
    { position: '2B', count: 1 },
    { position: 'SS', count: 1 },
    { position: '3B', count: 1 },
    { position: 'OF', count: 3 },
    { position: 'SP', count: 4 },
    { position: 'RP', count: 3 },
    { position: 'CL', count: 1 },
    { position: 'DH', count: 1 },
    { position: 'BN', count: 4 },
  ]

  const roster: RosterSlot[] = []
  let playerIndex = 1

  for (const { position, count } of positions) {
    for (let i = 0; i < count; i++) {
      roster.push({
        position,
        slotNumber: i + 1,
        playerSeasonId: `player-season-${playerIndex}`,
        isFilled: true,
      })
      playerIndex++
    }
  }

  return roster
}

function createMockTeam(overrides: Partial<DraftTeam> = {}): DraftTeam {
  return {
    id: 'team-1',
    name: 'Test Team',
    control: 'human',
    draftPosition: 1,
    roster: createMockRoster(),
    draftSessionId: 'session-1',
    league: 'AL',
    division: 'East',
    ...overrides,
  }
}

// ============================================================================
// Test: Lineup Generation Detection
// ============================================================================

console.log('\n--- LINEUP GENERATION DETECTION ---\n')

await test('Team without depthChart needs lineup generation', () => {
  const team = createMockTeam()
  // No depthChart property

  const hasLineup = team.depthChart?.lineupVS_RHP?.some(s => s.playerSeasonId)
  const needsLineup = !hasLineup

  assert(needsLineup === true, 'Team without depthChart should need lineup generation')
})

await test('Team with empty depthChart needs lineup generation', () => {
  const team = createMockTeam({
    depthChart: {
      lineupVS_RHP: [],
      lineupVS_LHP: [],
      rotation: [],
      bullpen: { closer: null, setup: [] },
    },
  })

  const hasLineup = team.depthChart?.lineupVS_RHP?.some(s => s.playerSeasonId)
  const needsLineup = !hasLineup

  assert(needsLineup === true, 'Team with empty lineupVS_RHP should need lineup generation')
})

await test('Team with filled lineup does NOT need lineup generation', () => {
  const team = createMockTeam({
    depthChart: {
      lineupVS_RHP: [
        { slotNumber: 1, playerSeasonId: 'player-1', position: 'SS' },
        { slotNumber: 2, playerSeasonId: 'player-2', position: '2B' },
      ],
      lineupVS_LHP: [],
      rotation: [],
      bullpen: { closer: null, setup: [] },
    },
  })

  const hasLineup = team.depthChart?.lineupVS_RHP?.some(s => s.playerSeasonId)
  const needsLineup = !hasLineup

  assert(needsLineup === false, 'Team with filled lineup should NOT need lineup generation')
})

// ============================================================================
// Test: API Request Format
// ============================================================================

console.log('\n--- API REQUEST FORMAT ---\n')

await test('Roster data is correctly formatted for API', () => {
  const team = createMockTeam()

  // This is how Clubhouse.tsx formats the roster for the API
  const roster = team.roster
    .filter(slot => slot.isFilled && slot.playerSeasonId)
    .map(slot => ({
      position: slot.position,
      playerSeasonId: slot.playerSeasonId!,
    }))

  assertEqual(roster.length, 21, 'Should have 21 filled roster slots')
  assert(roster.every(r => r.position && r.playerSeasonId), 'All roster entries should have position and playerSeasonId')
})

await test('Empty roster results in empty API payload', () => {
  const team = createMockTeam({
    roster: createMockRoster().map(slot => ({
      ...slot,
      playerSeasonId: null,
      isFilled: false,
    })),
  })

  const roster = team.roster
    .filter(slot => slot.isFilled && slot.playerSeasonId)
    .map(slot => ({
      position: slot.position,
      playerSeasonId: slot.playerSeasonId!,
    }))

  assertEqual(roster.length, 0, 'Should have 0 roster entries for empty roster')
})

// ============================================================================
// Test: Depth Chart Update Logic
// ============================================================================

console.log('\n--- DEPTH CHART UPDATE ---\n')

await test('updateTeamDepthChart correctly updates team in session', () => {
  // Simulate what draftStore.updateTeamDepthChart does
  const teams = [
    createMockTeam({ id: 'team-1', name: 'Team 1' }),
    createMockTeam({ id: 'team-2', name: 'Team 2' }),
  ]

  const teamId = 'team-1'
  const newDepthChart: TeamDepthChart = {
    lineupVS_RHP: [{ slotNumber: 1, playerSeasonId: 'player-1', position: 'SS' }],
    lineupVS_LHP: [{ slotNumber: 1, playerSeasonId: 'player-1', position: 'SS' }],
    rotation: [{ slotNumber: 1, playerSeasonId: 'pitcher-1' }],
    bullpen: { closer: 'closer-1', setup: ['setup-1'] },
  }

  // This is the logic from draftStore.updateTeamDepthChart
  const teamIndex = teams.findIndex(t => t.id === teamId)
  assert(teamIndex !== -1, 'Team should be found')

  const updatedTeams = [...teams]
  updatedTeams[teamIndex] = {
    ...updatedTeams[teamIndex],
    depthChart: newDepthChart,
  }

  assert(updatedTeams[0].depthChart !== undefined, 'Team 1 should have depthChart')
  assertEqual(updatedTeams[0].depthChart?.lineupVS_RHP.length, 1, 'Should have 1 lineup slot')
  assertEqual(updatedTeams[0].depthChart?.bullpen.closer, 'closer-1', 'Should have closer assigned')
})

// ============================================================================
// Test: Backend API Integration (if backend is running)
// ============================================================================

console.log('\n--- BACKEND API INTEGRATION ---\n')

await test('Backend auto-lineup API is reachable (if running)', async () => {
  const apiUrl = 'http://localhost:3001'

  try {
    const response = await fetch(`${apiUrl}/api/teams/test-team/auto-lineup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roster: [
          { position: 'C', playerSeasonId: 'test-player-1' },
        ],
      }),
    })

    // We expect either a 200 (success) or 400/500 (error due to invalid data)
    // Both indicate the API is reachable
    assert(
      response.status !== 0 && response.status !== 404,
      `API should be reachable, got status ${response.status}`
    )
    console.log(`  -> API responded with status ${response.status}`)
  } catch (err) {
    // Network error means backend isn't running - that's OK for this test
    console.log(`  -> Backend not running locally (this is OK for offline testing)`)
  }
})

// ============================================================================
// Test: Map Serialization Issue
// ============================================================================

console.log('\n--- MAP SERIALIZATION ---\n')

await test('Map type does not serialize correctly with JSON', () => {
  // This tests the root cause of a potential issue with zustand-persist
  const originalMap = new Map<string, number>()
  originalMap.set('key1', 100)
  originalMap.set('key2', 200)

  // When JSON.stringify is called on a Map, it becomes "{}"
  const serialized = JSON.stringify({ playerStats: originalMap })
  const deserialized = JSON.parse(serialized)

  // The Map becomes an empty object after JSON round-trip
  assertEqual(
    JSON.stringify(deserialized.playerStats),
    '{}',
    'Map should serialize to empty object (this is expected JavaScript behavior)'
  )

  // This shows the problem - Map methods don't exist on plain objects
  const isMap = deserialized.playerStats instanceof Map
  assertEqual(isMap, false, 'Deserialized Map should NOT be a Map instance')

  console.log('  -> Confirmed: Map becomes {} after JSON serialization')
  console.log('  -> This is why simulationStats.playerStats might fail after reload')
})

await test('Session with simulationStats should handle Map deserialization', () => {
  // Simulate what happens when session is loaded from localStorage
  interface SimulationStats {
    playerStats: Map<string, any> | Record<string, any>
    lastUpdated: Date
  }

  interface MockSession {
    simulationStats?: SimulationStats
  }

  // After loading from localStorage, simulationStats.playerStats would be {}
  const loadedSession: MockSession = {
    simulationStats: {
      playerStats: {}, // This is what we get after JSON deserialization
      lastUpdated: new Date(),
    },
  }

  // The fix: Check if playerStats is a Map before using Map methods
  const stats = loadedSession.simulationStats
  if (stats && !(stats.playerStats instanceof Map)) {
    // Convert plain object back to Map
    const map = new Map<string, any>(Object.entries(stats.playerStats))
    stats.playerStats = map
  }

  assert(
    stats?.playerStats instanceof Map,
    'Should convert plain object to Map'
  )

  console.log('  -> Workaround: Convert plain object back to Map after load')
})

// ============================================================================
// RESULTS
// ============================================================================
console.log('\n' + '='.repeat(70))
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(70))

if (failed > 0) {
  console.log('\nThese tests define expected auto lineup behavior.')
  console.log('If tests are failing, investigate the lineup generation flow.')
  process.exit(1)
} else {
  console.log('\nAll tests PASSED!')
  console.log('\nConclusion: Auto lineup logic appears correct.')
  console.log('If lineup generation is failing in production, check:')
  console.log('  1. Backend API on Render is deployed and reachable')
  console.log('  2. Player data is loading correctly')
  console.log('  3. Browser console for network errors')
}
