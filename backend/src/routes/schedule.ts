/**
 * Schedule Generation API Routes
 * Server-side schedule generation for fantasy seasons
 */

import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

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

interface Series {
  homeTeamId: string
  awayTeamId: string
  gameCount: number
}

interface TeamBasic {
  id: string
  name: string
}

/**
 * Distributes games into realistic series lengths (2-4 games)
 */
function distributeIntoSeries(totalGames: number): number[] {
  const series: number[] = []
  let remaining = totalGames

  while (remaining > 0) {
    if (remaining <= 4) {
      series.push(remaining)
      remaining = 0
    } else {
      const seriesLength = Math.min(remaining, Math.floor(Math.random() * 3) + 2)
      series.push(seriesLength)
      remaining -= seriesLength
    }
  }

  return series
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}

/**
 * Generates a balanced 162-game MLB-style schedule
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

  // Calculate games needed per matchup
  const gamesPerMatchup = Math.floor(gamesPerTeam / (numTeams - 1))
  const actualGamesPerTeam = gamesPerMatchup * (numTeams - 1)

  console.log(`[ScheduleGen] Generating ${actualGamesPerTeam} games per team`)
  console.log(`[ScheduleGen] Each team plays each opponent ${gamesPerMatchup} times`)

  // Generate all series
  const allSeries: Series[] = []

  for (let i = 0; i < numTeams; i++) {
    for (let j = i + 1; j < numTeams; j++) {
      const teamA = teams[i]
      const teamB = teams[j]
      const gamesEach = gamesPerMatchup / 2

      // Team A hosts Team B
      distributeIntoSeries(gamesEach).forEach(count => {
        allSeries.push({
          homeTeamId: teamA.id,
          awayTeamId: teamB.id,
          gameCount: count
        })
      })

      // Team B hosts Team A
      distributeIntoSeries(gamesEach).forEach(count => {
        allSeries.push({
          homeTeamId: teamB.id,
          awayTeamId: teamA.id,
          gameCount: count
        })
      })
    }
  }

  // Shuffle for variety
  shuffleArray(allSeries)

  // Convert to individual games with dates
  const games: ScheduledGame[] = []
  let currentDate = new Date(startDate)
  let gameNumber = 1
  let seriesCounter = 0

  // Track games per team
  const teamGameCounts: Record<string, number> = {}
  teams.forEach(t => teamGameCounts[t.id] = 0)

  // All-Star break at roughly 50%
  const allStarGameNumber = Math.floor(actualGamesPerTeam * numTeams / 4)
  let allStarDate: Date | null = null

  for (const series of allSeries) {
    const seriesId = `series-${seriesCounter++}`

    for (let g = 0; g < series.gameCount; g++) {
      // Check for All-Star break
      if (!allStarDate && gameNumber >= allStarGameNumber) {
        allStarDate = new Date(currentDate)
        currentDate.setDate(currentDate.getDate() + 1)

        // All-Star Game
        const allStarGame: ScheduledGame = {
          id: 'all-star-game',
          gameNumber: 0,
          homeTeamId: 'all-star-home',
          awayTeamId: 'all-star-away',
          date: new Date(currentDate),
          seriesId: 'all-star',
          gameInSeries: 1,
          isAllStarGame: true,
        }
        games.push(allStarGame)
        currentDate.setDate(currentDate.getDate() + 1)
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const game: ScheduledGame = {
        id: `game-${gameNumber}`,
        gameNumber,
        homeTeamId: series.homeTeamId,
        awayTeamId: series.awayTeamId,
        date: new Date(currentDate),
        seriesId,
        gameInSeries: g + 1
      }

      games.push(game)
      teamGameCounts[series.homeTeamId]++
      teamGameCounts[series.awayTeamId]++
      gameNumber++

      currentDate.setDate(currentDate.getDate() + 1)

      // Random off day
      if (Math.random() < 0.1) {
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    // Day off between series
    currentDate.setDate(currentDate.getDate() + 1)
  }

  const schedule: SeasonSchedule = {
    id: `schedule-${sessionId}`,
    sessionId,
    games,
    allStarGameDate: allStarDate || new Date(startDate),
    seasonStartDate: new Date(startDate),
    seasonEndDate: new Date(currentDate),
    totalGamesPerTeam: actualGamesPerTeam,
    currentGameIndex: 0
  }

  console.log(`[ScheduleGen] Generated ${games.length} total games`)
  console.log(`[ScheduleGen] Season: ${schedule.seasonStartDate.toLocaleDateString()} to ${schedule.seasonEndDate.toLocaleDateString()}`)

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
    const { data: session, error: sessionError } = await supabase
      .from('draft_sessions')
      .select('id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return res.status(404).json({ error: `Session not found: ${sessionId}` })
    }

    // Load teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('draft_teams')
      .select('id, team_name')
      .eq('draft_session_id', sessionId)
      .order('draft_order')

    if (teamsError || !teamsData || teamsData.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 teams to generate a schedule' })
    }

    const teams: TeamBasic[] = teamsData.map(t => ({
      id: t.id,
      name: t.team_name
    }))

    // Generate the schedule
    const scheduleStartDate = startDate ? new Date(startDate) : new Date()
    const schedule = generateSchedule(sessionId, teams, gamesPerTeam, scheduleStartDate)

    console.log('[Schedule API] Generated schedule for session:', sessionId, {
      teams: teams.length,
      games: schedule.games.length,
      gamesPerTeam: schedule.totalGamesPerTeam
    })

    return res.status(201).json({ schedule })
  } catch (err) {
    console.error('[Schedule API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
