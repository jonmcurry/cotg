/**
 * Schedule Issues - TDD Tests
 *
 * Tests to reproduce and verify fixes for:
 * 1. Sim Season stops at All-Star game
 * 2. Teams playing same opponent 3 times in a row
 *
 * Following CLAUDE.md Rule 11: Write tests first, then make them pass.
 *
 * Run with: npx tsx tests/scheduleIssues.test.ts
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

console.log('='.repeat(70))
console.log('SCHEDULE ISSUES - TDD TESTS')
console.log('='.repeat(70))
console.log('')

// ============================================================================
// Import the functions we need to test
// ============================================================================

import { generateDailySchedule, type DailyScheduleGame } from '../src/utils/scheduleGenerator'
import type { DraftTeam } from '../src/types/draft.types'

// ============================================================================
// Mock Team Data
// ============================================================================

function createMockTeams(count: number): DraftTeam[] {
  const teams: DraftTeam[] = []
  for (let i = 0; i < count; i++) {
    teams.push({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      abbrev: `T${i + 1}`,
      draftOrder: i + 1,
      isUserTeam: i === 0,
      roster: [],
      league: i < count / 2 ? 'AL' : 'NL',
      division: i % 2 === 0 ? 'East' : 'West',
    } as DraftTeam)
  }
  return teams
}

// ============================================================================
// Issue 2: Teams Playing Same Opponent on Consecutive Days
// ============================================================================

console.log('\n--- ISSUE 2: CONSECUTIVE SAME-OPPONENT GAMES ---\n')

test('Circle method should NOT have same matchup on day 7 and day 8', () => {
  const teams = createMockTeams(8)
  const games = generateDailySchedule(teams, 162)

  // Build a map of opponent by team and day
  const teamOpponentByDay = new Map<string, Map<number, string>>()
  for (const team of teams) {
    teamOpponentByDay.set(team.id, new Map())
  }

  for (const game of games) {
    teamOpponentByDay.get(game.homeTeamId)!.set(game.dayNumber, game.awayTeamId)
    teamOpponentByDay.get(game.awayTeamId)!.set(game.dayNumber, game.homeTeamId)
  }

  // Check days 7 and 8 specifically - this is where the bug might occur
  let day7Day8Violations = 0
  for (const [teamId, opponentsByDay] of teamOpponentByDay) {
    const day7Opp = opponentsByDay.get(7)
    const day8Opp = opponentsByDay.get(8)
    if (day7Opp && day8Opp && day7Opp === day8Opp) {
      console.log(`  -> BUG: ${teamId} plays ${day7Opp} on BOTH day 7 and day 8`)
      day7Day8Violations++
    }
  }

  assertEqual(day7Day8Violations, 0, `Should have no day 7/8 same-opponent violations`)
})

test('No team plays same opponent on ANY consecutive days', () => {
  const teams = createMockTeams(8)
  const games = generateDailySchedule(teams, 162)

  // Build opponent map by team and day
  const teamOpponentByDay = new Map<string, Map<number, string>>()
  for (const team of teams) {
    teamOpponentByDay.set(team.id, new Map())
  }

  for (const game of games) {
    teamOpponentByDay.get(game.homeTeamId)!.set(game.dayNumber, game.awayTeamId)
    teamOpponentByDay.get(game.awayTeamId)!.set(game.dayNumber, game.homeTeamId)
  }

  // Check ALL consecutive day pairs
  let violations = 0
  const violationDetails: string[] = []

  for (const [teamId, opponentsByDay] of teamOpponentByDay) {
    const days = Array.from(opponentsByDay.keys()).sort((a, b) => a - b)
    for (let i = 1; i < days.length; i++) {
      const prevDay = days[i - 1]
      const currDay = days[i]
      if (currDay - prevDay === 1) {
        const prevOpp = opponentsByDay.get(prevDay)
        const currOpp = opponentsByDay.get(currDay)
        if (prevOpp === currOpp) {
          violations++
          if (violationDetails.length < 5) {
            violationDetails.push(`${teamId}: day ${prevDay} & ${currDay} both vs ${prevOpp}`)
          }
        }
      }
    }
  }

  if (violations > 0) {
    console.log(`  -> Found ${violations} violations. Examples:`)
    violationDetails.forEach(d => console.log(`     ${d}`))
  }

  assertEqual(violations, 0, `Should have no consecutive same-opponent games`)
})

test('16-team league also has no consecutive same-opponent games', () => {
  const teams = createMockTeams(16)
  const games = generateDailySchedule(teams, 162)

  const teamOpponentByDay = new Map<string, Map<number, string>>()
  for (const team of teams) {
    teamOpponentByDay.set(team.id, new Map())
  }

  for (const game of games) {
    teamOpponentByDay.get(game.homeTeamId)!.set(game.dayNumber, game.awayTeamId)
    teamOpponentByDay.get(game.awayTeamId)!.set(game.dayNumber, game.homeTeamId)
  }

  let violations = 0
  for (const [teamId, opponentsByDay] of teamOpponentByDay) {
    const days = Array.from(opponentsByDay.keys()).sort((a, b) => a - b)
    for (let i = 1; i < days.length; i++) {
      const prevDay = days[i - 1]
      const currDay = days[i]
      if (currDay - prevDay === 1) {
        const prevOpp = opponentsByDay.get(prevDay)
        const currOpp = opponentsByDay.get(currDay)
        if (prevOpp === currOpp) violations++
      }
    }
  }

  assertEqual(violations, 0, `16-team league should have no consecutive same-opponent games`)
})

// ============================================================================
// RESULTS
// ============================================================================
console.log('\n' + '='.repeat(70))
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(70))

if (failed > 0) {
  console.log('\nThese tests reproduce the reported bugs.')
  console.log('Fix the schedule generator and simulation to make tests pass.')
  process.exit(1)
} else {
  console.log('\nAll tests PASSED!')
}
