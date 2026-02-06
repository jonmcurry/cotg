/**
 * Schedule Generator
 * Generates a balanced 162-game MLB-style schedule
 *
 * Schedule Structure:
 * - 162 games per team
 * - Balanced home/away (81 home, 81 away)
 * - Division-heavy scheduling (more games vs division rivals)
 * - Series-based (2-4 game series)
 * - All-Star break roughly at midpoint
 *
 * For a 16-team league (2 leagues x 4 divisions x 2 teams):
 * - Division games: 26 (1 rival x 26 games) = 26
 * - League games: 72 (6 opponents x 12 games each) = 72
 * - Interleague: 64 (8 opponents x 8 games each) = 64
 * - Total: 162
 */

import type { DraftSession, DraftTeam } from '../types/draft.types'
import type { ScheduledGame, SeasonSchedule, TeamStanding } from '../types/schedule.types'

interface Series {
    homeTeamId: string
    awayTeamId: string
    gameCount: number
}

interface MatchupConfig {
    teamA: DraftTeam
    teamB: DraftTeam
    totalGames: number
    type: 'division' | 'league' | 'interleague'
}

/**
 * Check if two teams are in the same division
 */
function isSameDivision(a: DraftTeam, b: DraftTeam): boolean {
    return a.league === b.league && a.division === b.division
}

/**
 * Check if two teams are in the same league
 */
function isSameLeague(a: DraftTeam, b: DraftTeam): boolean {
    return a.league === b.league
}

/**
 * Calculate the optimal games per matchup based on team count and relationships
 */
function calculateMatchupGames(
    team: DraftTeam,
    teams: DraftTeam[],
    gamesPerTeam: number = 162
): Map<string, number> {
    const gamesMap = new Map<string, number>()

    // Count opponents by type
    const divisionRivals = teams.filter(t => t.id !== team.id && isSameDivision(team, t))
    const leagueOpponents = teams.filter(t => t.id !== team.id && isSameLeague(team, t) && !isSameDivision(team, t))
    const interleagueOpponents = teams.filter(t => t.id !== team.id && !isSameLeague(team, t))

    const totalOpponents = divisionRivals.length + leagueOpponents.length + interleagueOpponents.length

    // If no divisions are set up, fall back to even distribution
    if (divisionRivals.length === 0 && leagueOpponents.length === 0) {
        const gamesPerOpponent = Math.floor(gamesPerTeam / totalOpponents)
        teams.forEach(t => {
            if (t.id !== team.id) {
                gamesMap.set(t.id, gamesPerOpponent)
            }
        })
        return gamesMap
    }

    // Calculate games per opponent type to reach 162
    // Priority: division > league > interleague
    let divisionGamesPerRival = 0
    let leagueGamesPerOpponent = 0
    let interleagueGamesPerOpponent = 0

    if (divisionRivals.length > 0) {
        // Target: division-heavy
        // For 2-team divisions: 26 games vs single rival
        // For 4-team divisions: ~17 games vs each (52 total / 3 rivals)
        divisionGamesPerRival = divisionRivals.length === 1 ? 26 : Math.floor(52 / divisionRivals.length)
    }

    const divisionGamesTotal = divisionGamesPerRival * divisionRivals.length
    const remainingAfterDivision = gamesPerTeam - divisionGamesTotal

    if (leagueOpponents.length > 0) {
        // Allocate ~60% of remaining to league, ~40% to interleague
        const leagueAllocation = interleagueOpponents.length > 0 ? 0.6 : 1.0
        leagueGamesPerOpponent = Math.floor((remainingAfterDivision * leagueAllocation) / leagueOpponents.length)
    }

    const leagueGamesTotal = leagueGamesPerOpponent * leagueOpponents.length

    if (interleagueOpponents.length > 0) {
        const remainingForInterleague = gamesPerTeam - divisionGamesTotal - leagueGamesTotal
        interleagueGamesPerOpponent = Math.floor(remainingForInterleague / interleagueOpponents.length)
    }

    // Assign games to each opponent
    divisionRivals.forEach(t => gamesMap.set(t.id, divisionGamesPerRival))
    leagueOpponents.forEach(t => gamesMap.set(t.id, leagueGamesPerOpponent))
    interleagueOpponents.forEach(t => gamesMap.set(t.id, interleagueGamesPerOpponent))

    return gamesMap
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

    // Build matchup configurations
    const matchups: MatchupConfig[] = []
    const processedPairs = new Set<string>()

    for (const team of teams) {
        const gamesMap = calculateMatchupGames(team, teams, gamesPerTeam)

        for (const opponent of teams) {
            if (team.id === opponent.id) continue

            // Create a consistent pair key to avoid duplicates
            const pairKey = [team.id, opponent.id].sort().join('-')
            if (processedPairs.has(pairKey)) continue
            processedPairs.add(pairKey)

            const totalGames = gamesMap.get(opponent.id) || Math.floor(gamesPerTeam / (numTeams - 1))

            let type: 'division' | 'league' | 'interleague'
            if (isSameDivision(team, opponent)) {
                type = 'division'
            } else if (isSameLeague(team, opponent)) {
                type = 'league'
            } else {
                type = 'interleague'
            }

            matchups.push({
                teamA: team,
                teamB: opponent,
                totalGames,
                type,
            })
        }
    }

    // Generate all series from matchups
    const allSeries: Series[] = []

    for (const matchup of matchups) {
        // Split games evenly between home/away
        const homeGamesForA = Math.ceil(matchup.totalGames / 2)
        const homeGamesForB = matchup.totalGames - homeGamesForA

        // Team A hosts Team B
        const seriesAtA = distributeIntoSeries(homeGamesForA, matchup.type)
        seriesAtA.forEach(count => {
            allSeries.push({
                homeTeamId: matchup.teamA.id,
                awayTeamId: matchup.teamB.id,
                gameCount: count,
            })
        })

        // Team B hosts Team A
        const seriesAtB = distributeIntoSeries(homeGamesForB, matchup.type)
        seriesAtB.forEach(count => {
            allSeries.push({
                homeTeamId: matchup.teamB.id,
                awayTeamId: matchup.teamA.id,
                gameCount: count,
            })
        })
    }

    // Shuffle series for variety, but try to cluster home stands
    shuffleArray(allSeries)

    // Convert series into individual games with dates
    const games: ScheduledGame[] = []
    let currentDate = new Date(startDate)
    let gameNumber = 1
    let seriesCounter = 0

    // Track games per team to balance the schedule
    const teamGameCounts: Record<string, number> = {}
    teams.forEach(t => (teamGameCounts[t.id] = 0))

    // Calculate actual games per team for All-Star timing
    const actualGamesPerTeam = allSeries.reduce((sum, s) => {
        // Each series counts for both teams
        return sum + s.gameCount
    }, 0) / numTeams

    // All-Star break at roughly 50%
    const allStarGameNumber = Math.floor((actualGamesPerTeam * numTeams) / 4) // Midpoint of total games
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
                gameInSeries: g + 1,
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
        totalGamesPerTeam: Math.floor(actualGamesPerTeam),
        currentGameIndex: 0,
    }

    return schedule
}

/**
 * Distributes games into realistic series lengths (2-4 games)
 * Division series tend to be longer (3-4 games)
 * Interleague series tend to be shorter (2-3 games)
 */
function distributeIntoSeries(totalGames: number, matchupType: 'division' | 'league' | 'interleague'): number[] {
    const series: number[] = []
    let remaining = totalGames

    // Preferred series length based on matchup type
    const preferredMin = matchupType === 'division' ? 3 : 2
    const preferredMax = matchupType === 'interleague' ? 3 : 4

    while (remaining > 0) {
        if (remaining <= preferredMax) {
            // Last series takes whatever is left
            series.push(remaining)
            remaining = 0
        } else {
            // Random series length within preferred range
            const range = preferredMax - preferredMin + 1
            const seriesLength = Math.min(remaining, preferredMin + Math.floor(Math.random() * range))
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
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
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
