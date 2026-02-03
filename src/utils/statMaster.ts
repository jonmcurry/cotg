/**
 * StatMaster Engine
 * Simulates baseball games using player stats
 * 
 * Simulation Philosophy:
 * - Uses real player stats as probabilities
 * - Simplified but realistic outcomes
 * - Track cumulative season stats
 */

import type { DraftTeam } from '../types/draft.types'
import type { ScheduledGame, GameResult } from '../types/schedule.types'
import type { PlayerSeason } from '../types/player'

// Batting outcome probabilities
interface AtBatOutcome {
    type: 'out' | 'single' | 'double' | 'triple' | 'homerun' | 'walk' | 'strikeout'
    runsScored: number
    rbis: number
}

// Game state during simulation
interface GameState {
    inning: number
    outs: number
    bases: [boolean, boolean, boolean] // 1st, 2nd, 3rd
    homeScore: number
    awayScore: number
    isTopOfInning: boolean
}

// Cumulative season stats for a player
export interface PlayerSeasonStats {
    playerSeasonId: string
    playerId?: string
    playerName: string
    teamId: string

    // Batting
    gamesPlayed: number
    atBats: number
    hits: number
    doubles: number
    triples: number
    homeRuns: number
    rbis: number
    runs: number
    walks: number
    strikeouts: number
    stolenBases: number
    battingAvg: number
    onBasePct: number
    sluggingPct: number

    // Pitching
    gamesStarted: number
    gamesPitched: number
    inningsPitched: number
    wins: number
    losses: number
    saves: number
    earnedRuns: number
    strikeoutsPitched: number
    walksPitched: number
    hitsPitched: number
    era: number
    whip: number
}

/**
 * Simulates a single game between two teams
 */
export function simulateGame(
    homeTeam: DraftTeam,
    awayTeam: DraftTeam,
    homePlayers: PlayerSeason[],
    awayPlayers: PlayerSeason[],
    game: ScheduledGame
): { result: GameResult; boxScore: BoxScore } {
    const state: GameState = {
        inning: 1,
        outs: 0,
        bases: [false, false, false],
        homeScore: 0,
        awayScore: 0,
        isTopOfInning: true
    }

    const boxScore: BoxScore = {
        gameId: game.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeLineScore: [],
        awayLineScore: [],
        homeBatting: [],
        awayBatting: [],
        homePitching: [],
        awayPitching: []
    }

    // Get lineups
    const homeLineup = getLineupPlayers(homeTeam, homePlayers)
    const awayLineup = getLineupPlayers(awayTeam, awayPlayers)

    // Get starting pitchers
    const homeStarter = getStartingPitcher(homeTeam, homePlayers)
    const awayStarter = getStartingPitcher(awayTeam, awayPlayers)

    if (!homeStarter || !awayStarter) {
        console.warn('[StatMaster] Missing starting pitcher, using default stats')
    }

    let homeBatterIndex = 0
    let awayBatterIndex = 0
    let homeInningRuns = 0
    let awayInningRuns = 0

    // Simulate 9 innings (or more if tied)
    while (state.inning <= 9 || state.homeScore === state.awayScore) {
        // Top of inning (away team bats)
        state.isTopOfInning = true
        state.outs = 0
        state.bases = [false, false, false]
        awayInningRuns = 0

        while (state.outs < 3) {
            const batter = awayLineup[awayBatterIndex % awayLineup.length]
            const outcome = simulateAtBat(batter, homeStarter)

            const runs = processOutcome(outcome, state)
            awayInningRuns += runs
            state.awayScore += runs

            awayBatterIndex++
        }
        boxScore.awayLineScore.push(awayInningRuns)

        // Check for walk-off prevention (bottom 9+, home winning)
        if (state.inning >= 9 && state.homeScore > state.awayScore) {
            boxScore.homeLineScore.push(0) // No bottom half needed
            break
        }

        // Bottom of inning (home team bats)
        state.isTopOfInning = false
        state.outs = 0
        state.bases = [false, false, false]
        homeInningRuns = 0

        while (state.outs < 3) {
            const batter = homeLineup[homeBatterIndex % homeLineup.length]
            const outcome = simulateAtBat(batter, awayStarter)

            const runs = processOutcome(outcome, state)
            homeInningRuns += runs
            state.homeScore += runs

            // Walk-off detection
            if (state.inning >= 9 && state.homeScore > state.awayScore) {
                break
            }

            homeBatterIndex++
        }
        boxScore.homeLineScore.push(homeInningRuns)

        // Walk-off win
        if (state.inning >= 9 && state.homeScore > state.awayScore) {
            break
        }

        state.inning++

        // Safety: max 15 innings
        if (state.inning > 15) {
            // Tie-breaker: random winner
            if (Math.random() > 0.5) {
                state.homeScore++
            } else {
                state.awayScore++
            }
            break
        }
    }

    const result: GameResult = {
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        innings: state.inning,
        winningPitcherId: state.homeScore > state.awayScore ? homeStarter?.id : awayStarter?.id,
        losingPitcherId: state.homeScore > state.awayScore ? awayStarter?.id : homeStarter?.id
    }

    return { result, boxScore }
}

/**
 * Simulates a single at-bat
 */
function simulateAtBat(batter: PlayerSeason | null, pitcher: PlayerSeason | null): AtBatOutcome {
    // Default stats if player not found
    const battingAvg = batter?.batting_avg ?? 0.250
    const onBasePct = batter?.on_base_pct ?? 0.320
    const sluggingPct = batter?.slugging_pct ?? 0.400
    const pitcherEra = pitcher?.era ?? 4.50

    // Calculate probabilities
    // Lower ERA = harder to hit
    const eraMod = Math.max(0.7, Math.min(1.3, (pitcherEra / 4.5)))
    const adjustedAvg = battingAvg * eraMod
    const adjustedObp = onBasePct * eraMod

    // Walk probability
    const walkChance = (adjustedObp - adjustedAvg) // OBP minus AVG ≈ walk rate

    // Hit probability
    const hitChance = adjustedAvg

    // Extra base hit distribution based on slugging
    const extraBaseRate = (sluggingPct - battingAvg) / battingAvg
    const homeRunRate = extraBaseRate * 0.4 // 40% of XBH are HR
    const tripleRate = extraBaseRate * 0.1  // 10% are triples
    const doubleRate = extraBaseRate * 0.5  // 50% are doubles

    const roll = Math.random()

    // Walk
    if (roll < walkChance) {
        return { type: 'walk', runsScored: 0, rbis: 0 }
    }

    // Hit
    if (roll < walkChance + hitChance) {
        const hitRoll = Math.random()

        if (hitRoll < homeRunRate) {
            return { type: 'homerun', runsScored: 0, rbis: 0 } // Runs calculated in processOutcome
        }
        if (hitRoll < homeRunRate + tripleRate) {
            return { type: 'triple', runsScored: 0, rbis: 0 }
        }
        if (hitRoll < homeRunRate + tripleRate + doubleRate) {
            return { type: 'double', runsScored: 0, rbis: 0 }
        }
        return { type: 'single', runsScored: 0, rbis: 0 }
    }

    // Strikeout (roughly 20% of outs)
    if (Math.random() < 0.20) {
        return { type: 'strikeout', runsScored: 0, rbis: 0 }
    }

    // Regular out
    return { type: 'out', runsScored: 0, rbis: 0 }
}

/**
 * Processes an at-bat outcome and updates game state
 */
function processOutcome(outcome: AtBatOutcome, state: GameState): number {
    let runsScored = 0

    switch (outcome.type) {
        case 'strikeout':
        case 'out':
            state.outs++
            break

        case 'walk':
            // Force runners if bases loaded
            if (state.bases[0] && state.bases[1] && state.bases[2]) {
                runsScored = 1
            }
            // Advance runners where forced
            if (state.bases[0] && state.bases[1]) {
                state.bases[2] = true
            }
            if (state.bases[0]) {
                state.bases[1] = true
            }
            state.bases[0] = true
            break

        case 'single':
            // Score from 3rd, sometimes 2nd
            if (state.bases[2]) {
                runsScored++
                state.bases[2] = false
            }
            if (state.bases[1] && Math.random() > 0.3) {
                runsScored++
                state.bases[1] = false
            } else if (state.bases[1]) {
                state.bases[2] = true
                state.bases[1] = false
            }
            if (state.bases[0]) {
                state.bases[1] = true
            }
            state.bases[0] = true
            break

        case 'double':
            // Score from 2nd and 3rd
            if (state.bases[2]) {
                runsScored++
                state.bases[2] = false
            }
            if (state.bases[1]) {
                runsScored++
                state.bases[1] = false
            }
            if (state.bases[0]) {
                state.bases[2] = true
                state.bases[0] = false
            }
            state.bases[1] = true
            break

        case 'triple':
            // Score all runners
            runsScored += state.bases.filter(b => b).length
            state.bases = [false, false, true]
            break

        case 'homerun':
            // Score all runners + batter
            runsScored = 1 + state.bases.filter(b => b).length
            state.bases = [false, false, false]
            break
    }

    return runsScored
}

/**
 * Gets lineup players for a team
 */
function getLineupPlayers(team: DraftTeam, players: PlayerSeason[]): (PlayerSeason | null)[] {
    const lineup: (PlayerSeason | null)[] = []

    if (team.depthChart?.lineupVS_RHP) {
        for (const slot of team.depthChart.lineupVS_RHP) {
            if (slot.playerSeasonId) {
                const player = players.find(p => p.id === slot.playerSeasonId)
                lineup.push(player || null)
            } else {
                lineup.push(null)
            }
        }
    }

    // Fallback: use roster if no lineup set
    if (lineup.length === 0 || lineup.every(p => p === null)) {
        const batters = team.roster
            .filter(s => s.isFilled && !['SP', 'RP', 'CL'].includes(s.position))
            .map(s => players.find(p => p.id === s.playerSeasonId))
            .filter((p): p is PlayerSeason => !!p)
        return batters.slice(0, 9)
    }

    return lineup
}

/**
 * Gets the starting pitcher for a team
 */
function getStartingPitcher(team: DraftTeam, players: PlayerSeason[]): PlayerSeason | null {
    // Use rotation if set
    if (team.depthChart?.rotation && team.depthChart.rotation.length > 0) {
        const firstStarter = team.depthChart.rotation.find(s => s.playerSeasonId)
        if (firstStarter) {
            return players.find(p => p.id === firstStarter.playerSeasonId) || null
        }
    }

    // Fallback: first SP on roster
    const spSlot = team.roster.find(s => s.position === 'SP' && s.isFilled)
    if (spSlot) {
        return players.find(p => p.id === spSlot.playerSeasonId) || null
    }

    return null
}

/**
 * Box score data for a game
 */
export interface BoxScore {
    gameId: string
    homeTeamId: string
    awayTeamId: string
    homeLineScore: number[]
    awayLineScore: number[]
    homeBatting: PlayerGameStats[]
    awayBatting: PlayerGameStats[]
    homePitching: PlayerGameStats[]
    awayPitching: PlayerGameStats[]
}

export interface PlayerGameStats {
    playerSeasonId: string
    atBats?: number
    hits?: number
    runs?: number
    rbis?: number
    homeRuns?: number
    strikeouts?: number
    walks?: number
    inningsPitched?: number
    earnedRuns?: number
    strikeoutsPitched?: number
    walksPitched?: number
}

/**
 * Simulates multiple games and updates the schedule
 */
export function simulateGames(
    games: ScheduledGame[],
    teams: DraftTeam[],
    allPlayers: PlayerSeason[],
    count: number = 1
): ScheduledGame[] {
    const updatedGames = [...games]
    let simulated = 0

    for (let i = 0; i < updatedGames.length && simulated < count; i++) {
        const game = updatedGames[i]

        // Skip already-played games and All-Star Game (simulated separately)
        if (game.result) continue
        if (game.isAllStarGame) continue

        const homeTeam = teams.find(t => t.id === game.homeTeamId)
        const awayTeam = teams.find(t => t.id === game.awayTeamId)

        if (!homeTeam || !awayTeam) {
            console.warn(`[StatMaster] Teams not found for game ${game.id}`)
            continue
        }

        // Get players for each team
        const homePlayers = allPlayers.filter(p =>
            homeTeam.roster.some(s => s.playerSeasonId === p.id)
        )
        const awayPlayers = allPlayers.filter(p =>
            awayTeam.roster.some(s => s.playerSeasonId === p.id)
        )

        const { result } = simulateGame(homeTeam, awayTeam, homePlayers, awayPlayers, game)

        updatedGames[i] = { ...game, result }
        simulated++

        console.log(`[StatMaster] ${awayTeam.name} ${result.awayScore} @ ${homeTeam.name} ${result.homeScore}`)
    }

    return updatedGames
}

/**
 * Gets the next unplayed game
 */
export function getNextGame(games: ScheduledGame[]): ScheduledGame | null {
    return games.find(g => !g.result) || null
}

/**
 * Gets record for a team
 */
export function getTeamRecord(games: ScheduledGame[], teamId: string): { wins: number; losses: number } {
    let wins = 0
    let losses = 0

    for (const game of games) {
        if (!game.result) continue

        const isHome = game.homeTeamId === teamId
        const isAway = game.awayTeamId === teamId

        if (!isHome && !isAway) continue

        const homeWon = game.result.homeScore > game.result.awayScore

        if (isHome && homeWon) wins++
        else if (isHome && !homeWon) losses++
        else if (isAway && !homeWon) wins++
        else if (isAway && homeWon) losses++
    }

    return { wins, losses }
}
