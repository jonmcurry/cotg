/**
 * Schedule Variety TDD Tests
 *
 * Tests to verify that the schedule generator produces varied schedules
 * without back-to-back series between the same teams.
 *
 * Following CLAUDE.md Rule 11: Write tests first, then make them pass.
 *
 * Run with: npx tsx tests/scheduleVariety.test.ts
 */

import { generateSchedule } from '../src/utils/scheduleGenerator'
import type { DraftSession, DraftTeam } from '../src/types/draft.types'
import type { ScheduledGame } from '../src/types/schedule.types'

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

console.log('='.repeat(70))
console.log('SCHEDULE VARIETY - TDD TESTS')
console.log('='.repeat(70))
console.log('')

// ============================================================================
// Mock Data
// ============================================================================

function createMockSession(numTeams: number): DraftSession {
  const teams: DraftTeam[] = []
  const leagues = ['AL', 'NL'] as const
  const divisions = ['East', 'West', 'North', 'South'] as const

  for (let i = 0; i < numTeams; i++) {
    const leagueIndex = i < numTeams / 2 ? 0 : 1
    const divisionIndex = Math.floor((i % (numTeams / 2)) / (numTeams / 8))

    teams.push({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      control: 'cpu',
      draftPosition: i + 1,
      roster: [],
      draftSessionId: 'test-session',
      league: leagues[leagueIndex],
      division: divisions[divisionIndex % 4],
    })
  }

  return {
    id: 'test-session',
    name: 'Test Session',
    status: 'clubhouse',
    numTeams,
    currentPick: 0,
    currentRound: 0,
    teams,
    picks: [],
    selectedSeasons: [2023],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Helper to get matchup key (consistent regardless of home/away)
function getMatchupKey(game: ScheduledGame): string {
  const ids = [game.homeTeamId, game.awayTeamId].sort()
  return `${ids[0]}-${ids[1]}`
}

// Helper to count series gaps between repeat matchups
function countSeriesGaps(games: ScheduledGame[]): {
  minGap: number
  avgGap: number
  backToBackCount: number
} {
  // Group games by series
  const seriesList: { seriesId: string; matchupKey: string }[] = []
  const seenSeries = new Set<string>()

  for (const game of games) {
    if (game.isAllStarGame || seenSeries.has(game.seriesId)) continue
    seenSeries.add(game.seriesId)
    seriesList.push({
      seriesId: game.seriesId,
      matchupKey: getMatchupKey(game),
    })
  }

  // Find gaps between same matchups
  const matchupLastIndex = new Map<string, number>()
  const gaps: number[] = []
  let backToBackCount = 0

  for (let i = 0; i < seriesList.length; i++) {
    const { matchupKey } = seriesList[i]
    const lastIndex = matchupLastIndex.get(matchupKey)

    if (lastIndex !== undefined) {
      const gap = i - lastIndex - 1
      gaps.push(gap)
      if (gap === 0) backToBackCount++
    }

    matchupLastIndex.set(matchupKey, i)
  }

  const minGap = gaps.length > 0 ? Math.min(...gaps) : Infinity
  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0

  return { minGap, avgGap, backToBackCount }
}

// Helper to analyze consecutive matchups in a team's schedule
function analyzeTeamSchedule(games: ScheduledGame[], teamId: string): {
  maxConsecutiveVsSameOpponent: number
  backToBackSeries: number
} {
  const teamGames = games
    .filter(g => !g.isAllStarGame && (g.homeTeamId === teamId || g.awayTeamId === teamId))
    .sort((a, b) => a.gameNumber - b.gameNumber)

  let maxConsecutive = 0
  let currentConsecutive = 1
  let backToBackSeries = 0
  let lastOpponent = ''
  let lastSeriesId = ''
  let lastSeriesOpponent = ''

  for (let i = 0; i < teamGames.length; i++) {
    const game = teamGames[i]
    const opponent = game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId

    // Track consecutive games vs same opponent
    if (opponent === lastOpponent) {
      currentConsecutive++
    } else {
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
      currentConsecutive = 1
    }

    // Track back-to-back series (when series changes, check if opponent is same as last series)
    if (game.seriesId !== lastSeriesId) {
      if (lastSeriesOpponent && opponent === lastSeriesOpponent) {
        backToBackSeries++
      }
      lastSeriesOpponent = opponent
      lastSeriesId = game.seriesId
    }

    lastOpponent = opponent
  }

  maxConsecutive = Math.max(maxConsecutive, currentConsecutive)

  return { maxConsecutiveVsSameOpponent: maxConsecutive, backToBackSeries }
}

// ============================================================================
// TESTS: Back-to-back series
// ============================================================================

console.log('\n--- NO BACK-TO-BACK SERIES ---\n')

test('should not have consecutive series between the same two teams (8 teams)', () => {
  const session = createMockSession(8)
  const schedule = generateSchedule(session, 162, new Date('2024-04-01'))

  const { backToBackCount } = countSeriesGaps(schedule.games)

  assert(
    backToBackCount === 0,
    `Found ${backToBackCount} back-to-back series between same matchups`
  )
})

test('should have at least 2 series gap between repeat matchups', () => {
  const session = createMockSession(8)
  const schedule = generateSchedule(session, 162, new Date('2024-04-01'))

  const { minGap } = countSeriesGaps(schedule.games)

  assert(
    minGap >= 2,
    `Minimum gap between repeat matchups is ${minGap}, expected >= 2`
  )
})

// ============================================================================
// TESTS: Team schedule variety
// ============================================================================

console.log('\n--- TEAM SCHEDULE VARIETY ---\n')

test('should not have a team play more than 4 consecutive games vs same opponent', () => {
  const session = createMockSession(8)
  const schedule = generateSchedule(session, 162, new Date('2024-04-01'))

  for (const team of session.teams) {
    const { maxConsecutiveVsSameOpponent } = analyzeTeamSchedule(schedule.games, team.id)

    assert(
      maxConsecutiveVsSameOpponent <= 4,
      `Team ${team.name} has ${maxConsecutiveVsSameOpponent} consecutive games vs same opponent (max should be 4, one series)`
    )
  }
})

test('should not have back-to-back series vs same opponent for any team', () => {
  const session = createMockSession(8)
  const schedule = generateSchedule(session, 162, new Date('2024-04-01'))

  for (const team of session.teams) {
    const { backToBackSeries } = analyzeTeamSchedule(schedule.games, team.id)

    assert(
      backToBackSeries === 0,
      `Team ${team.name} has ${backToBackSeries} back-to-back series vs same opponent`
    )
  }
})

// ============================================================================
// TESTS: Different league sizes
// ============================================================================

console.log('\n--- DIFFERENT LEAGUE SIZES ---\n')

test('should maintain variety with 16 teams', () => {
  const session = createMockSession(16)
  const schedule = generateSchedule(session, 162, new Date('2024-04-01'))

  const { backToBackCount, minGap } = countSeriesGaps(schedule.games)

  assert(
    backToBackCount === 0,
    `16-team league: Found ${backToBackCount} back-to-back series`
  )
  assert(
    minGap >= 2,
    `16-team league: Min gap is ${minGap}, expected >= 2`
  )
})

test('should maintain variety with 12 teams', () => {
  const session = createMockSession(12)
  const schedule = generateSchedule(session, 162, new Date('2024-04-01'))

  const { backToBackCount, minGap } = countSeriesGaps(schedule.games)

  assert(
    backToBackCount === 0,
    `12-team league: Found ${backToBackCount} back-to-back series`
  )
  assert(
    minGap >= 2,
    `12-team league: Min gap is ${minGap}, expected >= 2`
  )
})

// ============================================================================
// TESTS: All series scheduled
// ============================================================================

console.log('\n--- ALL SERIES SCHEDULED ---\n')

test('should schedule all generated series', () => {
  const session = createMockSession(8)
  const schedule = generateSchedule(session, 162, new Date('2024-04-01'))

  // Count unique series
  const seriesIds = new Set(schedule.games.filter(g => !g.isAllStarGame).map(g => g.seriesId))

  // Should have a reasonable number of series (at least 100 for 8 teams)
  assert(
    seriesIds.size > 100,
    `Only ${seriesIds.size} series scheduled, expected > 100`
  )
})

test('should have all games numbered correctly', () => {
  const session = createMockSession(8)
  const schedule = generateSchedule(session, 162, new Date('2024-04-01'))

  const regularGames = schedule.games.filter(g => !g.isAllStarGame)
  const gameNumbers = regularGames.map(g => g.gameNumber).sort((a, b) => a - b)

  // Check sequential numbering
  for (let i = 0; i < gameNumbers.length; i++) {
    assert(
      gameNumbers[i] === i + 1,
      `Game numbering broken: expected ${i + 1}, got ${gameNumbers[i]}`
    )
  }
})

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n' + '='.repeat(70))
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(70))

if (failed > 0) {
  console.log('\nThese tests define the expected schedule variety behavior.')
  console.log('Fix the scheduleGenerator.ts to make tests pass.')
  throw new Error(`${failed} tests failed`)
} else {
  console.log('\nAll tests PASSED!')
}
