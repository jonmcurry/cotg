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

// ============================================================================
// Hit Distribution - Uses actual player hit type data
// ============================================================================

export interface HitDistribution {
    singleRate: number
    doubleRate: number
    tripleRate: number
    homeRunRate: number
}

/**
 * Calculate hit type distribution from a player's actual stats.
 * Uses available stats (hits, home_runs, slugging) to estimate distribution.
 * Note: PlayerSeason doesn't have doubles/triples, so we estimate from ISO.
 */
export function calculateHitDistribution(player: PlayerSeason | null): HitDistribution {
    // Fallback defaults for missing data (typical league average)
    const DEFAULT_DISTRIBUTION: HitDistribution = {
        singleRate: 0.70,
        doubleRate: 0.20,
        tripleRate: 0.03,
        homeRunRate: 0.07,
    }

    if (!player) {
        return DEFAULT_DISTRIBUTION
    }

    const hits = player.hits ?? 0
    const homeRuns = player.home_runs ?? 0
    const battingAvg = player.batting_avg ?? 0.250
    const sluggingPct = player.slugging_pct ?? 0.400
    const atBats = player.at_bats ?? 0

    // Need at least some hits to calculate distribution
    if (hits <= 0 || atBats <= 0) {
        return DEFAULT_DISTRIBUTION
    }

    // Calculate home run rate from actual data
    const homeRunRate = Math.min(homeRuns / hits, 0.30) // Cap at 30%

    // Estimate extra base hit rate from ISO (Isolated Power = SLG - AVG)
    // ISO represents extra bases per at-bat
    const iso = Math.max(0, sluggingPct - battingAvg)

    // HR contributes 3 extra bases per HR
    const hrExtraBases = atBats > 0 ? (homeRuns * 3) / atBats : 0
    const nonHrIso = Math.max(0, iso - hrExtraBases)

    // Typical split: doubles are ~85% of non-HR XBH, triples ~15%
    // Scale by hits to get rate among hits
    const doubleRate = Math.min(0.30, (nonHrIso * atBats * 0.85) / Math.max(1, hits))
    const tripleRate = Math.min(0.08, (nonHrIso * atBats * 0.15) / Math.max(1, hits))

    // Singles are the remainder
    const singleRate = Math.max(0.40, 1 - homeRunRate - doubleRate - tripleRate)

    return {
        singleRate,
        doubleRate,
        tripleRate,
        homeRunRate,
    }
}

// ============================================================================
// Strikeout Rate - Uses player-specific K rates
// ============================================================================

/**
 * Calculate strikeout probability based on batter and pitcher tendencies.
 * Note: PlayerSeason doesn't have batter strikeout data, so we use pitcher K rate only.
 */
export function calculateStrikeoutRate(
    _batter: PlayerSeason | null,
    pitcher: PlayerSeason | null
): number {
    // Default strikeout rate (~15% of PA)
    const DEFAULT_K_RATE = 0.15
    const LEAGUE_AVG_K_PER_9 = 8.5 // Modern MLB average

    // Note: PlayerSeason type doesn't include batter strikeouts/walks
    // Use default batter K rate
    const batterKRate = DEFAULT_K_RATE

    // Pitcher's strikeout ability modifier
    // Calculate K/9 from strikeouts_pitched and innings_pitched_outs
    let pitcherModifier = 1.0
    if (pitcher) {
        const pitcherK = pitcher.strikeouts_pitched ?? 0
        const pitcherOuts = pitcher.innings_pitched_outs ?? 0

        if (pitcherOuts > 0) {
            // Convert outs to innings, then calculate K/9
            const innings = pitcherOuts / 3
            const kPer9 = (pitcherK / innings) * 9
            // Normalize: 8.5 K/9 = 1.0 modifier
            pitcherModifier = kPer9 / LEAGUE_AVG_K_PER_9
        }
    }

    // Combined rate: batter's tendency adjusted by pitcher's ability
    const combinedRate = batterKRate * pitcherModifier

    // Clamp to reasonable bounds (5% to 40%)
    return Math.min(0.40, Math.max(0.05, combinedRate))
}

// Batting outcome probabilities
interface AtBatOutcome {
    type: 'out' | 'single' | 'double' | 'triple' | 'homerun' | 'walk' | 'strikeout'
    runsScored: number
    rbis: number
    batterId?: string
    pitcherId?: string
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
 * Now tracks individual player stats in BoxScore
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

    // Initialize player stats tracking
    const homeBattingStats = new Map<string, PlayerGameStats>()
    const awayBattingStats = new Map<string, PlayerGameStats>()
    const homePitchingStats = new Map<string, PlayerGameStats>()
    const awayPitchingStats = new Map<string, PlayerGameStats>()

    // Helper to get or create player stats
    const getOrCreateBattingStats = (map: Map<string, PlayerGameStats>, player: PlayerSeason | null, teamId: string): PlayerGameStats => {
        if (!player) {
            // Default player stats for null players
            const defaultId = `unknown-${teamId}-${map.size}`
            if (!map.has(defaultId)) {
                map.set(defaultId, {
                    playerSeasonId: defaultId,
                    displayName: 'Unknown Player',
                    atBats: 0,
                    hits: 0,
                    doubles: 0,
                    triples: 0,
                    runs: 0,
                    rbis: 0,
                    homeRuns: 0,
                    strikeouts: 0,
                    walks: 0,
                })
            }
            return map.get(defaultId)!
        }

        if (!map.has(player.id)) {
            map.set(player.id, {
                playerSeasonId: player.id,
                displayName: player.display_name || `${player.first_name} ${player.last_name}`,
                atBats: 0,
                hits: 0,
                doubles: 0,
                triples: 0,
                runs: 0,
                rbis: 0,
                homeRuns: 0,
                strikeouts: 0,
                walks: 0,
            })
        }
        return map.get(player.id)!
    }

    const getOrCreatePitchingStats = (map: Map<string, PlayerGameStats>, player: PlayerSeason | null, teamId: string): PlayerGameStats => {
        if (!player) {
            const defaultId = `unknown-pitcher-${teamId}`
            if (!map.has(defaultId)) {
                map.set(defaultId, {
                    playerSeasonId: defaultId,
                    displayName: 'Unknown Pitcher',
                    inningsPitched: 0,
                    earnedRuns: 0,
                    strikeoutsPitched: 0,
                    walksPitched: 0,
                    hitsAllowed: 0,
                })
            }
            return map.get(defaultId)!
        }

        if (!map.has(player.id)) {
            map.set(player.id, {
                playerSeasonId: player.id,
                displayName: player.display_name || `${player.first_name} ${player.last_name}`,
                inningsPitched: 0,
                earnedRuns: 0,
                strikeoutsPitched: 0,
                walksPitched: 0,
                hitsAllowed: 0,
            })
        }
        return map.get(player.id)!
    }

    // Track runners on base for run scoring
    const baseRunners: (PlayerSeason | null)[] = [null, null, null]

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
    let homeOuts = 0
    let awayOuts = 0

    // Simulate 9 innings (or more if tied)
    while (state.inning <= 9 || state.homeScore === state.awayScore) {
        // Top of inning (away team bats)
        state.isTopOfInning = true
        state.outs = 0
        state.bases = [false, false, false]
        baseRunners[0] = baseRunners[1] = baseRunners[2] = null
        awayInningRuns = 0
        const inningStartOuts = homeOuts

        while (state.outs < 3) {
            const batter = awayLineup[awayBatterIndex % awayLineup.length]
            const outcome = simulateAtBat(batter, homeStarter)
            outcome.batterId = batter?.id
            outcome.pitcherId = homeStarter?.id

            // Update batter stats
            const batterStats = getOrCreateBattingStats(awayBattingStats, batter, awayTeam.id)
            const pitcherStats = getOrCreatePitchingStats(homePitchingStats, homeStarter, homeTeam.id)

            updateBatterStatsFromOutcome(batterStats, outcome)
            updatePitcherStatsFromOutcome(pitcherStats, outcome)

            const runs = processOutcomeWithRunners(outcome, state, baseRunners, batter, awayBattingStats, awayTeam.id, getOrCreateBattingStats)
            outcome.runsScored = runs
            outcome.rbis = runs
            batterStats.rbis = (batterStats.rbis || 0) + runs // Update RBIs

            awayInningRuns += runs
            state.awayScore += runs

            // Update earned runs for pitcher
            pitcherStats.earnedRuns = (pitcherStats.earnedRuns || 0) + runs

            if (outcome.type === 'out' || outcome.type === 'strikeout') {
                homeOuts++
            }

            awayBatterIndex++
        }
        boxScore.awayLineScore.push(awayInningRuns)

        // Update pitcher innings (outs recorded this half inning)
        const homePitcherStats = getOrCreatePitchingStats(homePitchingStats, homeStarter, homeTeam.id)
        homePitcherStats.inningsPitched = (homePitcherStats.inningsPitched || 0) + (homeOuts - inningStartOuts)

        // Check for walk-off prevention (bottom 9+, home winning)
        if (state.inning >= 9 && state.homeScore > state.awayScore) {
            boxScore.homeLineScore.push(0) // No bottom half needed
            break
        }

        // Bottom of inning (home team bats)
        state.isTopOfInning = false
        state.outs = 0
        state.bases = [false, false, false]
        baseRunners[0] = baseRunners[1] = baseRunners[2] = null
        homeInningRuns = 0
        const bottomInningStartOuts = awayOuts

        while (state.outs < 3) {
            const batter = homeLineup[homeBatterIndex % homeLineup.length]
            const outcome = simulateAtBat(batter, awayStarter)
            outcome.batterId = batter?.id
            outcome.pitcherId = awayStarter?.id

            // Update batter stats
            const batterStats = getOrCreateBattingStats(homeBattingStats, batter, homeTeam.id)
            const pitcherStats = getOrCreatePitchingStats(awayPitchingStats, awayStarter, awayTeam.id)

            updateBatterStatsFromOutcome(batterStats, outcome)
            updatePitcherStatsFromOutcome(pitcherStats, outcome)

            const runs = processOutcomeWithRunners(outcome, state, baseRunners, batter, homeBattingStats, homeTeam.id, getOrCreateBattingStats)
            outcome.runsScored = runs
            outcome.rbis = runs
            batterStats.rbis = (batterStats.rbis || 0) + runs

            homeInningRuns += runs
            state.homeScore += runs

            // Update earned runs for pitcher
            pitcherStats.earnedRuns = (pitcherStats.earnedRuns || 0) + runs

            if (outcome.type === 'out' || outcome.type === 'strikeout') {
                awayOuts++
            }

            // Walk-off detection
            if (state.inning >= 9 && state.homeScore > state.awayScore) {
                break
            }

            homeBatterIndex++
        }
        boxScore.homeLineScore.push(homeInningRuns)

        // Update pitcher innings
        const awayPitcherStats = getOrCreatePitchingStats(awayPitchingStats, awayStarter, awayTeam.id)
        awayPitcherStats.inningsPitched = (awayPitcherStats.inningsPitched || 0) + (awayOuts - bottomInningStartOuts)

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

    // Populate boxScore arrays from maps
    boxScore.homeBatting = Array.from(homeBattingStats.values())
    boxScore.awayBatting = Array.from(awayBattingStats.values())
    boxScore.homePitching = Array.from(homePitchingStats.values())
    boxScore.awayPitching = Array.from(awayPitchingStats.values())

    // FIXED: Get pitcher IDs from the actual pitching stats, not the player objects
    // This ensures consistency when the pitcher is null (uses default ID)
    const homePitcherId = boxScore.homePitching[0]?.playerSeasonId
    const awayPitcherId = boxScore.awayPitching[0]?.playerSeasonId

    const result: GameResult = {
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        innings: state.inning,
        winningPitcherId: state.homeScore > state.awayScore ? homePitcherId : awayPitcherId,
        losingPitcherId: state.homeScore > state.awayScore ? awayPitcherId : homePitcherId
    }

    return { result, boxScore }
}

/**
 * Update batter stats from at-bat outcome
 */
function updateBatterStatsFromOutcome(stats: PlayerGameStats, outcome: AtBatOutcome): void {
    // Walks don't count as at-bats
    if (outcome.type !== 'walk') {
        stats.atBats = (stats.atBats || 0) + 1
    }

    switch (outcome.type) {
        case 'single':
            stats.hits = (stats.hits || 0) + 1
            break
        case 'double':
            stats.hits = (stats.hits || 0) + 1
            stats.doubles = (stats.doubles || 0) + 1
            break
        case 'triple':
            stats.hits = (stats.hits || 0) + 1
            stats.triples = (stats.triples || 0) + 1
            break
        case 'homerun':
            stats.hits = (stats.hits || 0) + 1
            stats.homeRuns = (stats.homeRuns || 0) + 1
            stats.runs = (stats.runs || 0) + 1 // Batter scores
            break
        case 'walk':
            stats.walks = (stats.walks || 0) + 1
            break
        case 'strikeout':
            stats.strikeouts = (stats.strikeouts || 0) + 1
            break
    }
}

/**
 * Update pitcher stats from at-bat outcome
 */
function updatePitcherStatsFromOutcome(stats: PlayerGameStats, outcome: AtBatOutcome): void {
    switch (outcome.type) {
        case 'single':
        case 'double':
        case 'triple':
        case 'homerun':
            stats.hitsAllowed = (stats.hitsAllowed || 0) + 1
            break
        case 'walk':
            stats.walksPitched = (stats.walksPitched || 0) + 1
            break
        case 'strikeout':
            stats.strikeoutsPitched = (stats.strikeoutsPitched || 0) + 1
            break
    }
}

/**
 * Process outcome and track runner scoring
 */
function processOutcomeWithRunners(
    outcome: AtBatOutcome,
    state: GameState,
    baseRunners: (PlayerSeason | null)[],
    batter: PlayerSeason | null,
    battingStatsMap: Map<string, PlayerGameStats>,
    teamId: string,
    getOrCreateFn: (map: Map<string, PlayerGameStats>, player: PlayerSeason | null, teamId: string) => PlayerGameStats
): number {
    let runsScored = 0

    const scoreRunner = (baseIndex: number) => {
        const runner = baseRunners[baseIndex]
        if (runner) {
            const runnerStats = getOrCreateFn(battingStatsMap, runner, teamId)
            runnerStats.runs = (runnerStats.runs || 0) + 1
        }
        baseRunners[baseIndex] = null
        runsScored++
    }

    switch (outcome.type) {
        case 'strikeout':
        case 'out':
            state.outs++
            break

        case 'walk':
            // Force runners if bases loaded
            if (state.bases[0] && state.bases[1] && state.bases[2]) {
                scoreRunner(2)
            }
            // Advance runners where forced
            if (state.bases[0] && state.bases[1]) {
                baseRunners[2] = baseRunners[1]
                state.bases[2] = true
            }
            if (state.bases[0]) {
                baseRunners[1] = baseRunners[0]
                state.bases[1] = true
            }
            baseRunners[0] = batter
            state.bases[0] = true
            break

        case 'single':
            // Score from 3rd, sometimes 2nd
            if (state.bases[2]) {
                scoreRunner(2)
                state.bases[2] = false
            }
            if (state.bases[1] && Math.random() > 0.3) {
                scoreRunner(1)
                state.bases[1] = false
            } else if (state.bases[1]) {
                baseRunners[2] = baseRunners[1]
                state.bases[2] = true
                state.bases[1] = false
            }
            if (state.bases[0]) {
                baseRunners[1] = baseRunners[0]
                state.bases[1] = true
            }
            baseRunners[0] = batter
            state.bases[0] = true
            break

        case 'double':
            // Score from 2nd and 3rd
            if (state.bases[2]) {
                scoreRunner(2)
                state.bases[2] = false
            }
            if (state.bases[1]) {
                scoreRunner(1)
                state.bases[1] = false
            }
            if (state.bases[0]) {
                baseRunners[2] = baseRunners[0]
                state.bases[2] = true
                state.bases[0] = false
            }
            baseRunners[1] = batter
            state.bases[1] = true
            break

        case 'triple':
            // Score all runners
            for (let i = 0; i < 3; i++) {
                if (state.bases[i]) {
                    scoreRunner(i)
                    state.bases[i] = false
                }
            }
            baseRunners[2] = batter
            state.bases[2] = true
            break

        case 'homerun':
            // Score all runners + batter
            for (let i = 0; i < 3; i++) {
                if (state.bases[i]) {
                    scoreRunner(i)
                    state.bases[i] = false
                }
            }
            // Batter run is tracked in updateBatterStatsFromOutcome
            runsScored++ // Batter scores
            state.bases = [false, false, false]
            break
    }

    return runsScored
}

/**
 * Simulates a single at-bat
 * Uses actual player stats for realistic outcomes
 *
 * APBA-inspired approach:
 * - Uses actual batting averages directly (not inflated by pitcher ERA)
 * - Pitcher quality affects outcome type, not hit probability
 * - HR probability is based on HRs per AB, not HRs per hit
 */
function simulateAtBat(batter: PlayerSeason | null, pitcher: PlayerSeason | null): AtBatOutcome {
    // Default stats if player not found
    const battingAvg = batter?.batting_avg ?? 0.250
    const onBasePct = batter?.on_base_pct ?? 0.320
    const sluggingPct = batter?.slugging_pct ?? 0.400
    const atBats = batter?.at_bats ?? 500
    const homeRuns = batter?.home_runs ?? 15

    // APBA-style: Use actual stats directly, minimal adjustment for pitcher quality
    // Pitcher ERA modifier is subtle (+/- 5% max, not +/- 30%)
    const pitcherEra = pitcher?.era ?? 4.50
    const LEAGUE_AVG_ERA = 4.50
    // A pitcher with 6.0 ERA gives batter a ~3% boost, not 30%
    const eraMod = 1 + Math.max(-0.05, Math.min(0.05, (pitcherEra - LEAGUE_AVG_ERA) / 50))

    const adjustedAvg = Math.min(0.400, battingAvg * eraMod) // Cap at .400
    const adjustedObp = Math.min(0.500, onBasePct * eraMod) // Cap at .500

    // Walk probability = OBP - AVG (roughly)
    const walkChance = Math.max(0, adjustedObp - adjustedAvg)

    // APBA-style: Calculate HR rate directly from AB, not from hits
    // This prevents inflated HR rates when players get extra hits
    const hrPerAB = atBats > 0 ? Math.min(0.10, homeRuns / atBats) : 0.03

    // Calculate XBH rate from ISO
    const iso = Math.max(0, sluggingPct - battingAvg)
    const hrExtraBases = homeRuns * 3 / Math.max(1, atBats)
    const nonHrIso = Math.max(0, iso - hrExtraBases)

    // Doubles and triples as rate per AB (not per hit)
    const doublesPerAB = Math.min(0.06, (nonHrIso * 0.85))
    const triplesPerAB = Math.min(0.01, (nonHrIso * 0.15))
    const singlesPerAB = Math.max(0, adjustedAvg - hrPerAB - doublesPerAB - triplesPerAB)

    const roll = Math.random()

    // Outcome probability order (APBA-style, per AB not per hit):
    // 1. Walk
    // 2. Strikeout
    // 3. Home Run
    // 4. Triple
    // 5. Double
    // 6. Single
    // 7. Out

    let cumulative = 0

    // Walk
    cumulative += walkChance
    if (roll < cumulative) {
        return { type: 'walk', runsScored: 0, rbis: 0 }
    }

    // Strikeout (before hits, like APBA)
    const strikeoutRate = calculateStrikeoutRate(batter, pitcher)
    cumulative += strikeoutRate * (1 - walkChance) // Apply to non-walks
    if (roll < cumulative) {
        return { type: 'strikeout', runsScored: 0, rbis: 0 }
    }

    // Home Run (direct rate per AB)
    cumulative += hrPerAB * eraMod
    if (roll < cumulative) {
        return { type: 'homerun', runsScored: 0, rbis: 0 }
    }

    // Triple
    cumulative += triplesPerAB * eraMod
    if (roll < cumulative) {
        return { type: 'triple', runsScored: 0, rbis: 0 }
    }

    // Double
    cumulative += doublesPerAB * eraMod
    if (roll < cumulative) {
        return { type: 'double', runsScored: 0, rbis: 0 }
    }

    // Single
    cumulative += singlesPerAB * eraMod
    if (roll < cumulative) {
        return { type: 'single', runsScored: 0, rbis: 0 }
    }

    // Regular out
    return { type: 'out', runsScored: 0, rbis: 0 }
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
    displayName?: string
    atBats?: number
    hits?: number
    doubles?: number
    triples?: number
    runs?: number
    rbis?: number
    homeRuns?: number
    strikeouts?: number
    walks?: number
    inningsPitched?: number  // in outs (3 per inning)
    earnedRuns?: number
    strikeoutsPitched?: number
    walksPitched?: number
    hitsAllowed?: number
}

/**
 * Result of simulating multiple games
 */
export interface SimulationResult {
    games: ScheduledGame[]
    boxScores: BoxScore[]
}

/**
 * Simulates multiple games and updates the schedule
 * Returns both updated games and box scores for stat accumulation
 */
export function simulateGames(
    games: ScheduledGame[],
    teams: DraftTeam[],
    allPlayers: PlayerSeason[],
    count: number = 1
): SimulationResult {
    const updatedGames = [...games]
    const boxScores: BoxScore[] = []
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

        const { result, boxScore } = simulateGame(homeTeam, awayTeam, homePlayers, awayPlayers, game)

        updatedGames[i] = { ...game, result }
        boxScores.push(boxScore)
        simulated++

        // console.log(`[StatMaster] ${awayTeam.name} ${result.awayScore} @ ${homeTeam.name} ${result.homeScore}`)
    }

    return { games: updatedGames, boxScores }
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
