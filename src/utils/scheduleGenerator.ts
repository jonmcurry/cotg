/**
 * Schedule Generator
 * Generates a balanced 162-game MLB-style schedule
 * 
 * Schedule Structure:
 * - 162 games per team
 * - Balanced home/away (81 home, 81 away)
 * - Series-based (2-4 game series)
 * - All-Star break roughly at midpoint
 */

import type { DraftSession, DraftTeam } from '../types/draft.types'
import type { ScheduledGame, SeasonSchedule, TeamStanding } from '../types/schedule.types'

interface Series {
    homeTeamId: string
    awayTeamId: string
    gameCount: number
}

/**
 * Generates a balanced schedule for all teams
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

    // Calculate games needed per matchup
    // Each team plays every other team an equal number of times (home + away)
    const gamesPerMatchup = Math.floor(gamesPerTeam / (numTeams - 1))
    const actualGamesPerTeam = gamesPerMatchup * (numTeams - 1)

    // console.log(`[ScheduleGen] Generating ${actualGamesPerTeam} games per team`)
    // console.log(`[ScheduleGen] Each team plays each opponent ${gamesPerMatchup} times`)

    // Generate all series (each matchup produces 2 series: home and away)
    const allSeries: Series[] = []

    for (let i = 0; i < numTeams; i++) {
        for (let j = i + 1; j < numTeams; j++) {
            const teamA = teams[i]
            const teamB = teams[j]

            // Split games between home/away for each team
            const gamesEach = gamesPerMatchup / 2

            // Team A hosts Team B
            const seriesAtA = distributeIntoSeries(gamesEach)
            seriesAtA.forEach(count => {
                allSeries.push({
                    homeTeamId: teamA.id,
                    awayTeamId: teamB.id,
                    gameCount: count
                })
            })

            // Team B hosts Team A
            const seriesAtB = distributeIntoSeries(gamesEach)
            seriesAtB.forEach(count => {
                allSeries.push({
                    homeTeamId: teamB.id,
                    awayTeamId: teamA.id,
                    gameCount: count
                })
            })
        }
    }

    // Shuffle series for variety
    shuffleArray(allSeries)

    // Convert series into individual games with dates
    const games: ScheduledGame[] = []
    let currentDate = new Date(startDate)
    let gameNumber = 1
    let seriesCounter = 0

    // Track games per team to balance the schedule
    const teamGameCounts: Record<string, number> = {}
    teams.forEach(t => teamGameCounts[t.id] = 0)

    // All-Star break at roughly 50%
    const allStarGameNumber = Math.floor(actualGamesPerTeam * numTeams / 4) // Midpoint of total games
    let allStarDate: Date | null = null

    for (const series of allSeries) {
        const seriesId = `series-${seriesCounter++}`

        for (let g = 0; g < series.gameCount; g++) {
            // Check for All-Star break
            if (!allStarDate && gameNumber >= allStarGameNumber) {
                allStarDate = new Date(currentDate)
                // Day 1: Off day before All-Star Game
                currentDate.setDate(currentDate.getDate() + 1)

                // Day 2: All-Star Game
                const allStarGame: ScheduledGame = {
                    id: 'all-star-game',
                    gameNumber: 0, // Does not count in regular season
                    homeTeamId: 'all-star-home',
                    awayTeamId: 'all-star-away',
                    date: new Date(currentDate),
                    seriesId: 'all-star',
                    gameInSeries: 1,
                    isAllStarGame: true,
                }
                games.push(allStarGame)
                currentDate.setDate(currentDate.getDate() + 1)

                // Day 3: Off day after All-Star Game
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

            // Advance date (most games are daily, some off days)
            currentDate.setDate(currentDate.getDate() + 1)

            // Random off day (roughly 1 in 10)
            if (Math.random() < 0.1) {
                currentDate.setDate(currentDate.getDate() + 1)
            }
        }

        // Day off between series
        currentDate.setDate(currentDate.getDate() + 1)
    }

    const schedule: SeasonSchedule = {
        id: `schedule-${session.id}`,
        sessionId: session.id,
        games,
        allStarGameDate: allStarDate || new Date(startDate),
        seasonStartDate: new Date(startDate),
        seasonEndDate: new Date(currentDate),
        totalGamesPerTeam: actualGamesPerTeam,
        currentGameIndex: 0
    }

    // console.log(`[ScheduleGen] Generated ${games.length} total games`)
    // console.log(`[ScheduleGen] Season runs from ${schedule.seasonStartDate.toLocaleDateString()} to ${schedule.seasonEndDate.toLocaleDateString()}`)

    // Log team game counts
    // teams.forEach(t => {
    //     const homeGames = games.filter(g => g.homeTeamId === t.id).length
    //     const awayGames = games.filter(g => g.awayTeamId === t.id).length
    //     console.log(`[ScheduleGen] ${t.name}: ${homeGames} home, ${awayGames} away, ${homeGames + awayGames} total`)
    // })

    return schedule
}

/**
 * Distributes games into realistic series lengths (2-4 games)
 */
function distributeIntoSeries(totalGames: number): number[] {
    const series: number[] = []
    let remaining = totalGames

    while (remaining > 0) {
        if (remaining <= 4) {
            // Last series takes whatever is left
            series.push(remaining)
            remaining = 0
        } else {
            // Random series length 2-4
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

        const homeStanding = standings.get(game.homeTeamId)!
        const awayStanding = standings.get(game.awayTeamId)!

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
        const divKey = standing.league && standing.division
            ? `${standing.league}-${standing.division}`
            : 'none'
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
            standing.gamesBack = ((divLeader.wins - standing.wins) + (standing.losses - divLeader.losses)) / 2
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
