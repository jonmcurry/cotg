/**
 * Schedule Generation API Routes
 * Server-side schedule generation for fantasy seasons
 *
 * Uses circle method round-robin for daily matchups:
 * - All teams play every day
 * - No team plays same opponent on consecutive days
 * - Home/away games balanced
 */

import { Router, Request, Response } from 'express'
import { pool } from '../lib/db'

const router = Router()

// Types matching frontend schedule.types.ts
interface ScheduledGame {
  id: string
  gameNumber: number
  homeTeamId: string
  awayTeamId: string
  date: Date
  seriesId: string
  gameInSeries: number
  isAllStarGame?: boolean
  result?: {
    homeScore: number
    awayScore: number
    innings: number
  }
}

interface SeasonSchedule {
  id: string
  sessionId: string
  games: ScheduledGame[]
  allStarGameDate: Date
  seasonStartDate: Date
  seasonEndDate: Date
  totalGamesPerTeam: number
  currentGameIndex: number
}

interface TeamBasic {
  id: string
  name: string
}

// Database row type
interface DbTeamRow {
  id: string
  team_name: string
}

/**
 * Generate matchups for a single day using the circle method.
 * This algorithm naturally ensures no team plays the same opponent on consecutive days.
 *
 * Circle method: Fix one team at position 0, rotate all others around it.
 * Day 1: [0,1], [2,7], [3,6], [4,5]
 * Day 2: [0,2], [3,1], [4,7], [5,6]
 * etc.
 */
function generateDayMatchupsCircle(
  teamIds: string[],
  day: number
): Array<[string, string]> {
  const n = teamIds.length
  const matchups: Array<[string, string]> = []

  // Fixed team at position 0
  const fixed = teamIds[0]
  const rotating = teamIds.slice(1)

  // Rotate based on day (0-indexed rotation)
  const rotations = (day - 1) % rotating.length
  const rotated = [
    ...rotating.slice(rotations),
    ...rotating.slice(0, rotations)
  ]

  // First matchup: fixed team vs first rotated position
  matchups.push([fixed, rotated[0]])

  // Pair remaining teams from outside-in
  const half = (n - 1) / 2
  for (let i = 1; i <= Math.floor(half); i++) {
    const team1 = rotated[i]
    const team2 = rotated[rotating.length - i]
    matchups.push([team1, team2])
  }

  return matchups
}

/**
 * Generates a balanced schedule using daily format (circle method).
 * All teams play every day, different opponent each day.
 */
function generateSchedule(
  sessionId: string,
  teams: TeamBasic[],
  gamesPerTeam: number = 162,
  startDate: Date = new Date()
): SeasonSchedule {
  const numTeams = teams.length

  if (numTeams < 2) {
    throw new Error('Need at least 2 teams to generate a schedule')
  }

  if (numTeams % 2 !== 0) {
    throw new Error('Need an even number of teams for daily schedule')
  }

  const teamIds = teams.map(t => t.id)
  const totalDays = gamesPerTeam // Each team plays once per day

  // Track home games for balance
  const totalHomeGames = new Map<string, number>()
  const matchupHomeGames = new Map<string, number>() // "teamA-teamB" -> count

  for (const team of teams) {
    totalHomeGames.set(team.id, 0)
  }

  // Generate games
  const games: ScheduledGame[] = []
  const allStarDayNumber = Math.floor(gamesPerTeam / 2) // Midpoint
  let allStarDate: Date | null = null
  let gameNumber = 1

  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + day - 1)

    // Check for All-Star break insertion
    if (!allStarDate && day >= allStarDayNumber) {
      allStarDate = new Date(currentDate)

      // Insert All-Star Game
      const allStarGame: ScheduledGame = {
        id: 'all-star-game',
        gameNumber: 0,
        homeTeamId: 'all-star-home',
        awayTeamId: 'all-star-away',
        date: new Date(allStarDate),
        seriesId: 'all-star',
        gameInSeries: 1,
        isAllStarGame: true,
      }
      games.push(allStarGame)
    }

    // Generate matchups for this day using circle method
    const matchups = generateDayMatchupsCircle(teamIds, day)

    for (const [team1, team2] of matchups) {
      // Decide home/away based on balance
      const matchupKey1 = `${team1}-${team2}`
      const matchupKey2 = `${team2}-${team1}`
      const team1HostedTeam2 = matchupHomeGames.get(matchupKey1) || 0
      const team2HostedTeam1 = matchupHomeGames.get(matchupKey2) || 0

      const team1TotalHome = totalHomeGames.get(team1) || 0
      const team2TotalHome = totalHomeGames.get(team2) || 0

      let homeTeamId: string
      let awayTeamId: string

      // Primary: balance this specific matchup
      if (team1HostedTeam2 < team2HostedTeam1) {
        homeTeamId = team1
        awayTeamId = team2
      } else if (team2HostedTeam1 < team1HostedTeam2) {
        homeTeamId = team2
        awayTeamId = team1
      } else {
        // Matchup is balanced, use global home count to decide
        if (team1TotalHome <= team2TotalHome) {
          homeTeamId = team1
          awayTeamId = team2
        } else {
          homeTeamId = team2
          awayTeamId = team1
        }
      }

      const game: ScheduledGame = {
        id: `game-${gameNumber}`,
        gameNumber: gameNumber,
        homeTeamId,
        awayTeamId,
        date: new Date(currentDate),
        seriesId: `day-${day}`,
        gameInSeries: 1, // Each game is game 1 of its "series" (the day)
      }

      games.push(game)

      // Update tracking
      const homeMatchupKey = `${homeTeamId}-${awayTeamId}`
      matchupHomeGames.set(homeMatchupKey, (matchupHomeGames.get(homeMatchupKey) || 0) + 1)
      totalHomeGames.set(homeTeamId, (totalHomeGames.get(homeTeamId) || 0) + 1)
      gameNumber++
    }
  }

  // Calculate end date
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + gamesPerTeam)

  const schedule: SeasonSchedule = {
    id: `schedule-${sessionId}`,
    sessionId,
    games,
    allStarGameDate: allStarDate || new Date(startDate),
    seasonStartDate: new Date(startDate),
    seasonEndDate: endDate,
    totalGamesPerTeam: gamesPerTeam,
    currentGameIndex: 0
  }

  return schedule
}

/**
 * POST /api/draft/sessions/:sessionId/schedule
 * Generate a season schedule for a draft session
 *
 * Request body:
 *   - gamesPerTeam: number (optional, default 162)
 *   - startDate: string (optional, ISO date string)
 *
 * Returns:
 *   - schedule: SeasonSchedule
 */
router.post('/:sessionId/schedule', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { gamesPerTeam = 162, startDate } = req.body

    // Load session to verify it exists
    const sessionResult = await pool.query(
      'SELECT id FROM draft_sessions WHERE id = $1',
      [sessionId]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: `Session not found: ${sessionId}` })
    }

    // Load teams
    const teamsResult = await pool.query(
      'SELECT id, team_name FROM draft_teams WHERE draft_session_id = $1 ORDER BY draft_order',
      [sessionId]
    )

    if (teamsResult.rows.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 teams to generate a schedule' })
    }

    const teams: TeamBasic[] = teamsResult.rows.map((t: DbTeamRow) => ({
      id: t.id,
      name: t.team_name
    }))

    // Generate the schedule using circle method
    const scheduleStartDate = startDate ? new Date(startDate) : new Date()
    const schedule = generateSchedule(sessionId, teams, gamesPerTeam, scheduleStartDate)

    return res.status(201).json({ schedule })
  } catch (err) {
    console.error('[Schedule API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
