/**
 * CPU Draft Bug Reproduction Test
 *
 * Bug: "CPU could not find a player to draft" in Round 20
 *
 * Scenario from screenshot:
 * - Round 20 of 21
 * - Pick 623 of 672
 * - Team has 19/21 positions filled
 * - Missing: C (Catcher) and SS (Shortstop)
 * - Error: CPU can't find a player
 *
 * Root cause: By late rounds, all C and SS players with 200+ ABs
 * are already drafted. The strict 200 AB requirement means no
 * eligible players remain for these positions.
 */

// Mock supabase before importing cpu
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}))

// Import the functions we need to test
// Note: These need to be exported from cpu.ts for testing
import {
  selectBestPlayer,
  PlayerSeason,
  DraftTeam,
  PositionCode,
  RosterSlot,
  ROSTER_REQUIREMENTS,
} from './cpu'

// Helper to create a roster with specific positions filled
function createRosterWithMissingPositions(missingPositions: PositionCode[]): RosterSlot[] {
  const roster: RosterSlot[] = []
  const requirements: Record<PositionCode, number> = {
    'C': 1, '1B': 1, '2B': 1, 'SS': 1, '3B': 1,
    'OF': 3, 'SP': 4, 'RP': 3, 'CL': 1, 'DH': 1, 'BN': 4,
  }

  for (const [position, count] of Object.entries(requirements)) {
    for (let i = 0; i < count; i++) {
      const isFilled = !missingPositions.includes(position as PositionCode)
      roster.push({
        position: position as PositionCode,
        slotNumber: i + 1,
        playerSeasonId: isFilled ? `mock-${position}-${i}` : null,
        isFilled,
      })
    }
  }
  return roster
}

// Helper to create a mock player
function createMockPlayer(
  id: string,
  primaryPosition: string,
  atBats: number,
  playerId: string = `player-${id}`
): PlayerSeason {
  return {
    id,
    player_id: playerId,
    year: 2020,
    team_id: 'TST',
    primary_position: primaryPosition,
    apba_rating: 50,
    war: 2.0,
    at_bats: atBats,
    batting_avg: 0.280,
    hits: Math.floor(atBats * 0.28),
    home_runs: 15,
    rbi: 60,
    stolen_bases: 5,
    on_base_pct: 0.350,
    slugging_pct: 0.450,
    innings_pitched_outs: 0,
    wins: 0,
    losses: 0,
    era: null,
    strikeouts_pitched: 0,
    saves: 0,
    shutouts: 0,
    whip: null,
    display_name: `Player ${id}`,
    first_name: 'Test',
    last_name: id,
    bats: 'R',
  }
}

describe('CPU Draft - Late Round Bug Reproduction', () => {
  /**
   * TEST 1: Reproduce the bug
   *
   * This test should FAIL initially, proving the bug exists.
   * After fixing, it should PASS.
   */
  test('should find a player when C and SS positions need filling but no 200+ AB players available', () => {
    // Setup: Team needs C and SS filled
    const team: DraftTeam = {
      id: 'team-1',
      name: 'Savannah Pioneers',
      control: 'cpu',
      draftPosition: 1,
      roster: createRosterWithMissingPositions(['C', 'SS']),
      draftSessionId: 'session-1',
    }

    // Setup: Player pool with NO C or SS players with 200+ ABs
    // This simulates Round 20 when all high-AB catchers/shortstops are drafted
    const availablePlayers: PlayerSeason[] = [
      // Catchers with LOW at-bats (< 200) - currently excluded by meetsPlayingTimeRequirements
      createMockPlayer('c1', 'C', 150),  // 150 ABs - NOT eligible
      createMockPlayer('c2', 'C', 180),  // 180 ABs - NOT eligible
      createMockPlayer('c3', 'C', 100),  // 100 ABs - NOT eligible

      // Shortstops with LOW at-bats (< 200) - currently excluded
      createMockPlayer('ss1', 'SS', 175), // 175 ABs - NOT eligible
      createMockPlayer('ss2', 'SS', 190), // 190 ABs - NOT eligible
      createMockPlayer('ss3', 'SS', 120), // 120 ABs - NOT eligible

      // Other position players with 200+ ABs (already drafted or not needed)
      createMockPlayer('of1', 'OF', 500),
      createMockPlayer('1b1', '1B', 450),
      createMockPlayer('3b1', '3B', 400),
    ]

    // All the high-AB players are already drafted
    const draftedPlayerIds = new Set<string>([
      'player-of1', 'player-1b1', 'player-3b1'
    ])

    // Act: Try to select a player
    const result = selectBestPlayer(
      availablePlayers,
      team,
      draftedPlayerIds,
      new Set(),
      20 // Round 20
    )

    // Assert: Should find a player (the low-AB catcher or shortstop)
    // Currently this FAILS because meetsPlayingTimeRequirements requires 200 ABs
    expect(result).not.toBeNull()
    expect(result?.player).toBeDefined()
    expect(['C', 'SS']).toContain(result?.position)
  })

  /**
   * TEST 2: Verify normal behavior still works
   *
   * When 200+ AB players ARE available, draft should work normally.
   */
  test('should find a player when 200+ AB players are available for needed positions', () => {
    const team: DraftTeam = {
      id: 'team-1',
      name: 'Test Team',
      control: 'cpu',
      draftPosition: 1,
      roster: createRosterWithMissingPositions(['C', 'SS']),
      draftSessionId: 'session-1',
    }

    const availablePlayers: PlayerSeason[] = [
      createMockPlayer('c1', 'C', 350),   // 350 ABs - eligible
      createMockPlayer('ss1', 'SS', 400), // 400 ABs - eligible
      createMockPlayer('of1', 'OF', 500),
    ]

    const draftedPlayerIds = new Set<string>()

    const result = selectBestPlayer(
      availablePlayers,
      team,
      draftedPlayerIds,
      new Set(),
      10 // Round 10
    )

    expect(result).not.toBeNull()
    expect(['C', 'SS']).toContain(result?.position)
  })

  /**
   * TEST 3: Bench fallback when positions can't be filled
   *
   * If C/SS can't be filled, should we fall back to bench?
   * Currently this doesn't work because BN also requires 200 ABs.
   */
  test('should fall back to bench position when specific position cannot be filled', () => {
    // Team only needs C position filled, and bench is available
    const team: DraftTeam = {
      id: 'team-1',
      name: 'Test Team',
      control: 'cpu',
      draftPosition: 1,
      roster: createRosterWithMissingPositions(['C', 'BN']),
      draftSessionId: 'session-1',
    }

    const availablePlayers: PlayerSeason[] = [
      // No catchers available, but outfielder is
      createMockPlayer('of1', 'OF', 300), // 300 ABs - eligible for BN
    ]

    const draftedPlayerIds = new Set<string>()

    const result = selectBestPlayer(
      availablePlayers,
      team,
      draftedPlayerIds,
      new Set(),
      20
    )

    // Should pick the outfielder for the bench
    expect(result).not.toBeNull()
    expect(result?.position).toBe('BN')
  })
})
