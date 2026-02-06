/**
 * Schedule Generator
 * Generates a balanced 162-game daily schedule
 *
 * Schedule Structure:
 * - 162 games per team
 * - All teams play every day (no days off)
 * - Different opponent each day
 * - Balanced home/away (roughly 81 home, 81 away)
 * - All-Star break roughly at midpoint
 */

import type { DraftSession, DraftTeam } from '../types/draft.types'
import type { ScheduledGame, SeasonSchedule, TeamStanding } from '../types/schedule.types'

/**
 * Generates a balanced schedule for all teams using daily format.
 * All teams play every day, facing a different opponent each day.
 *
 * @param session - The draft session containing teams
 * @param gamesPerTeam - Total games per team (default 162)
 * @param startDate - Season start date
 */
export function generateSchedule(
    session: DraftSession,
    gamesPerTeam: number = 162,
    startDate: Date = new Date()
): SeasonSchedule {
    const teams = session.teams
    const numTeams = teams.length

    if (numTeams < 2) {
        throw new Error('Need at least 2 teams to generate a schedule')
    }

    // Ensure even number of teams
    if (numTeams % 2 !== 0) {
        throw new Error('Need an even number of teams for daily schedule')
    }

    // Generate daily schedule games
    const dailyGames = generateDailySchedule(teams, gamesPerTeam, startDate)

    // Convert to ScheduledGame format and add All-Star break
    const games: ScheduledGame[] = []
    const allStarDayNumber = Math.floor(gamesPerTeam / 2) // Midpoint
    let allStarDate: Date | null = null
    let adjustedGameNumber = 1

    for (const dailyGame of dailyGames) {
        // Check for All-Star break insertion
        if (!allStarDate && dailyGame.dayNumber >= allStarDayNumber) {
            allStarDate = new Date(dailyGame.date)

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

        // Convert daily game to ScheduledGame format
        // Use day number as series ID (each day is its own "series")
        const scheduledGame: ScheduledGame = {
            id: dailyGame.id,
            gameNumber: adjustedGameNumber++,
            homeTeamId: dailyGame.homeTeamId,
            awayTeamId: dailyGame.awayTeamId,
            date: dailyGame.date,
            seriesId: `day-${dailyGame.dayNumber}`,
            gameInSeries: 1, // Each game is game 1 of its "series" (the day)
        }

        games.push(scheduledGame)
    }

    // Calculate end date
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + gamesPerTeam)

    const schedule: SeasonSchedule = {
        id: `schedule-${session.id}`,
        sessionId: session.id,
        games,
        allStarGameDate: allStarDate || new Date(startDate),
        seasonStartDate: new Date(startDate),
        seasonEndDate: endDate,
        totalGamesPerTeam: gamesPerTeam,
        currentGameIndex: 0,
    }

    return schedule
}

// ============================================================================
// Daily Schedule Generator - All Teams Play Every Day
// ============================================================================

/**
 * A single game in the daily schedule format
 */
export interface DailyScheduleGame {
    id: string
    dayNumber: number
    gameNumber: number
    homeTeamId: string
    awayTeamId: string
    date: Date
}

/**
 * Generate a round-robin schedule where all teams play every day.
 * Uses the "circle method" for round-robin tournament scheduling.
 *
 * Key constraints:
 * - All teams play every day (n/2 games per day for n teams)
 * - No team plays the same opponent on consecutive days
 * - Balanced home/away games (~81 home, ~81 away for 162 games)
 *
 * @param teams - Array of teams
 * @param gamesPerTeam - Total games each team should play (default 162)
 * @param startDate - Season start date
 */
export function generateDailySchedule(
    teams: DraftTeam[],
    gamesPerTeam: number = 162,
    startDate: Date = new Date()
): DailyScheduleGame[] {
    const numTeams = teams.length
    if (numTeams < 2 || numTeams % 2 !== 0) {
        throw new Error('Need an even number of teams (at least 2)')
    }

    const games: DailyScheduleGame[] = []
    const totalDays = gamesPerTeam // Each team plays once per day

    // Track total home games for each team (for global balance)
    const totalHomeGames = new Map<string, number>()
    // Track home games per matchup (for per-opponent balance)
    const matchupHomeGames = new Map<string, number>() // "teamA-teamB" -> count of times teamA hosted teamB

    // Initialize tracking
    for (const team of teams) {
        totalHomeGames.set(team.id, 0)
    }

    // Create team ID array for round-robin rotation
    const teamIds = teams.map(t => t.id)

    let gameNumber = 1

    for (let day = 1; day <= totalDays; day++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(currentDate.getDate() + day - 1)

        // Generate matchups for this day using circle method
        const matchups = generateDayMatchupsCircle(teamIds, day)

        for (const [team1, team2] of matchups) {
            // Decide home/away based on balance
            // First check per-matchup balance, then overall balance
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

            games.push({
                id: `game-${gameNumber}`,
                dayNumber: day,
                gameNumber: gameNumber,
                homeTeamId,
                awayTeamId,
                date: new Date(currentDate),
            })

            // Update tracking
            const homeMatchupKey = `${homeTeamId}-${awayTeamId}`
            matchupHomeGames.set(homeMatchupKey, (matchupHomeGames.get(homeMatchupKey) || 0) + 1)
            totalHomeGames.set(homeTeamId, (totalHomeGames.get(homeTeamId) || 0) + 1)
            gameNumber++
        }
    }

    return games
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
    // e.g., for 8 teams: rotating positions [1,2,3,4,5,6] pairs as [1,6], [2,5], [3,4]
    const half = (n - 1) / 2
    for (let i = 1; i <= Math.floor(half); i++) {
        const team1 = rotated[i]
        const team2 = rotated[rotating.length - i]
        matchups.push([team1, team2])
    }

    return matchups
}

// ============================================================================
// Schedule Utilities
// ============================================================================

/**
 * Gets the schedule for a specific team
 */
export function getTeamSchedule(schedule: SeasonSchedule, teamId: string): ScheduledGame[] {
    return schedule.games.filter(g => g.homeTeamId === teamId || g.awayTeamId === teamId)
}

/**
 * Gets games for a specific date
 */
export function getGamesOnDate(schedule: SeasonSchedule, date: Date): ScheduledGame[] {
    const dateStr = date.toDateString()
    return schedule.games.filter(g => g.date.toDateString() === dateStr)
}

/**
 * Calculates team standings from schedule results
 * Includes division information and calculates games back per division
 */
export function calculateStandings(schedule: SeasonSchedule, teams: DraftTeam[]): TeamStanding[] {
    const standings: Map<string, TeamStanding> = new Map()

    // Initialize standings with division info
    teams.forEach(team => {
        standings.set(team.id, {
            teamId: team.id,
            teamName: team.name,
            wins: 0,
            losses: 0,
            winPct: 0,
            gamesBack: 0,
            runsScored: 0,
            runsAllowed: 0,
            runDifferential: 0,
            homeRecord: { wins: 0, losses: 0 },
            awayRecord: { wins: 0, losses: 0 },
            streak: 0,
            last10: { wins: 0, losses: 0 },
            league: team.league,
            division: team.division,
        })
    })

    // Process completed games (exclude All-Star Game from standings)
    const completedGames = schedule.games.filter(g => g.result && !g.isAllStarGame)

    for (const game of completedGames) {
        if (!game.result) continue

        const homeStanding = standings.get(game.homeTeamId)
        const awayStanding = standings.get(game.awayTeamId)

        if (!homeStanding || !awayStanding) continue

        const homeWon = game.result.homeScore > game.result.awayScore

        if (homeWon) {
            homeStanding.wins++
            homeStanding.homeRecord.wins++
            awayStanding.losses++
            awayStanding.awayRecord.losses++
        } else {
            awayStanding.wins++
            awayStanding.awayRecord.wins++
            homeStanding.losses++
            homeStanding.homeRecord.losses++
        }

        homeStanding.runsScored += game.result.homeScore
        homeStanding.runsAllowed += game.result.awayScore
        awayStanding.runsScored += game.result.awayScore
        awayStanding.runsAllowed += game.result.homeScore
    }

    // Calculate derived stats
    const standingsArray = Array.from(standings.values())

    // Calculate win percentage and run differential
    standingsArray.forEach(standing => {
        const totalGames = standing.wins + standing.losses
        standing.winPct = totalGames > 0 ? standing.wins / totalGames : 0
        standing.runDifferential = standing.runsScored - standing.runsAllowed
    })

    // Calculate games back per division (not global)
    // Group by division
    const divisions = new Map<string, TeamStanding[]>()
    standingsArray.forEach(standing => {
        const divKey =
            standing.league && standing.division ? `${standing.league}-${standing.division}` : 'none'
        if (!divisions.has(divKey)) {
            divisions.set(divKey, [])
        }
        divisions.get(divKey)!.push(standing)
    })

    // Sort each division and calculate GB within division
    divisions.forEach(divStandings => {
        divStandings.sort((a, b) => b.wins - a.wins || a.losses - b.losses)
        const divLeader = divStandings[0]
        divStandings.forEach(standing => {
            standing.gamesBack = (divLeader.wins - standing.wins + (standing.losses - divLeader.losses)) / 2
        })
    })

    // Sort overall by league, division, then wins
    standingsArray.sort((a, b) => {
        // First by league
        if (a.league !== b.league) {
            return (a.league || 'ZZ').localeCompare(b.league || 'ZZ')
        }
        // Then by division
        if (a.division !== b.division) {
            const divOrder = ['East', 'West', 'North', 'South']
            return divOrder.indexOf(a.division || '') - divOrder.indexOf(b.division || '')
        }
        // Then by wins
        return b.wins - a.wins || a.losses - b.losses
    })

    return standingsArray
}
