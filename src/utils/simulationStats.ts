/**
 * Simulation Stats Utility
 *
 * Functions for tracking and accumulating player stats from simulated games.
 * Stats are tracked per simulation session and displayed in StatMaster.
 */

import type { PlayerSimulationStats, SessionSimulationStats, GameResult } from '../types/schedule.types'
import type { BoxScore } from './statMaster'

/**
 * Create empty stats for a player
 */
export function createEmptyPlayerStats(
  playerSeasonId: string,
  displayName: string,
  teamId: string
): PlayerSimulationStats {
  return {
    playerSeasonId,
    displayName,
    teamId,
    gamesPlayed: 0,

    // Batting
    atBats: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    stolenBases: 0,

    // Pitching
    inningsPitchedOuts: 0,
    earnedRuns: 0,
    strikeoutsThrown: 0,
    walksAllowed: 0,
    hitsAllowed: 0,
    wins: 0,
    losses: 0,
    saves: 0,
  }
}

/**
 * Create empty session simulation stats
 */
export function createEmptySessionStats(): SessionSimulationStats {
  return {
    playerStats: new Map(),
    lastUpdated: new Date(),
  }
}

/**
 * Get or create player stats in session
 */
export function getOrCreatePlayerStats(
  sessionStats: SessionSimulationStats,
  playerSeasonId: string,
  displayName: string,
  teamId: string
): PlayerSimulationStats {
  let stats = sessionStats.playerStats.get(playerSeasonId)
  if (!stats) {
    stats = createEmptyPlayerStats(playerSeasonId, displayName, teamId)
    sessionStats.playerStats.set(playerSeasonId, stats)
  }
  return stats
}

/**
 * Update batter stats from a single at-bat result
 */
export function updateBatterStats(
  stats: PlayerSimulationStats,
  outcome: {
    type: 'out' | 'single' | 'double' | 'triple' | 'homerun' | 'walk' | 'strikeout'
    runsScored: number
    rbis: number
  }
): void {
  // Walks don't count as at-bats
  if (outcome.type !== 'walk') {
    stats.atBats++
  }

  // Record outcome type
  switch (outcome.type) {
    case 'single':
      stats.hits++
      break
    case 'double':
      stats.hits++
      stats.doubles++
      break
    case 'triple':
      stats.hits++
      stats.triples++
      break
    case 'homerun':
      stats.hits++
      stats.homeRuns++
      stats.runs++ // Batter scores on HR
      break
    case 'walk':
      stats.walks++
      break
    case 'strikeout':
      stats.strikeouts++
      break
    case 'out':
      // Just an at-bat, no other stat
      break
  }

  // RBIs
  stats.rbi += outcome.rbis
}

/**
 * Update pitcher stats from a single at-bat result
 */
export function updatePitcherStats(
  stats: PlayerSimulationStats,
  outcome: {
    type: 'out' | 'single' | 'double' | 'triple' | 'homerun' | 'walk' | 'strikeout'
    runsScored: number
  }
): void {
  // Record outcomes against pitcher
  switch (outcome.type) {
    case 'single':
    case 'double':
    case 'triple':
    case 'homerun':
      stats.hitsAllowed++
      break
    case 'walk':
      stats.walksAllowed++
      break
    case 'strikeout':
      stats.strikeoutsThrown++
      break
    case 'out':
      // Just an out
      break
  }

  // Earned runs
  stats.earnedRuns += outcome.runsScored
}

/**
 * Add runs scored by a runner
 */
export function addRunScored(stats: PlayerSimulationStats): void {
  stats.runs++
}

/**
 * Record innings pitched for a pitcher (in outs)
 */
export function addInningsPitched(stats: PlayerSimulationStats, outs: number): void {
  stats.inningsPitchedOuts += outs
}

/**
 * Record win for a pitcher
 */
export function recordWin(stats: PlayerSimulationStats): void {
  stats.wins++
}

/**
 * Record loss for a pitcher
 */
export function recordLoss(stats: PlayerSimulationStats): void {
  stats.losses++
}

/**
 * Record save for a pitcher
 */
export function recordSave(stats: PlayerSimulationStats): void {
  stats.saves++
}

/**
 * Mark player as having played in a game
 */
export function recordGamePlayed(stats: PlayerSimulationStats): void {
  stats.gamesPlayed++
}

/**
 * Calculate batting average
 */
export function calculateBattingAvg(stats: PlayerSimulationStats): number {
  return stats.atBats > 0 ? stats.hits / stats.atBats : 0
}

/**
 * Calculate on-base percentage
 */
export function calculateOBP(stats: PlayerSimulationStats): number {
  const pa = stats.atBats + stats.walks
  if (pa === 0) return 0
  return (stats.hits + stats.walks) / pa
}

/**
 * Calculate slugging percentage
 */
export function calculateSLG(stats: PlayerSimulationStats): number {
  if (stats.atBats === 0) return 0
  const singles = stats.hits - stats.doubles - stats.triples - stats.homeRuns
  const totalBases = singles + stats.doubles * 2 + stats.triples * 3 + stats.homeRuns * 4
  return totalBases / stats.atBats
}

/**
 * Calculate ERA
 */
export function calculateERA(stats: PlayerSimulationStats): number {
  const innings = stats.inningsPitchedOuts / 3
  return innings > 0 ? (stats.earnedRuns / innings) * 9 : 0
}

/**
 * Calculate WHIP
 */
export function calculateWHIP(stats: PlayerSimulationStats): number {
  const innings = stats.inningsPitchedOuts / 3
  return innings > 0 ? (stats.walksAllowed + stats.hitsAllowed) / innings : 0
}

/**
 * Update all calculated stats on a player
 */
export function updateCalculatedStats(stats: PlayerSimulationStats): void {
  stats.battingAvg = calculateBattingAvg(stats)
  stats.onBasePct = calculateOBP(stats)
  stats.sluggingPct = calculateSLG(stats)
  stats.era = calculateERA(stats)
  stats.whip = calculateWHIP(stats)
}

/**
 * Accumulate box score stats into session stats
 * Now also tracks wins/losses/saves from GameResult
 */
export function accumulateBoxScore(
  sessionStats: SessionSimulationStats,
  boxScore: BoxScore,
  gameResult?: GameResult
): void {
  // Process home batting
  for (const playerStats of boxScore.homeBatting) {
    const stats = getOrCreatePlayerStats(
      sessionStats,
      playerStats.playerSeasonId,
      playerStats.displayName || 'Unknown',
      boxScore.homeTeamId
    )
    recordGamePlayed(stats)

    if (playerStats.atBats) stats.atBats += playerStats.atBats
    if (playerStats.hits) stats.hits += playerStats.hits
    if (playerStats.doubles) stats.doubles += playerStats.doubles
    if (playerStats.triples) stats.triples += playerStats.triples
    if (playerStats.homeRuns) stats.homeRuns += playerStats.homeRuns
    if (playerStats.rbis) stats.rbi += playerStats.rbis
    if (playerStats.runs) stats.runs += playerStats.runs
    if (playerStats.walks) stats.walks += playerStats.walks
    if (playerStats.strikeouts) stats.strikeouts += playerStats.strikeouts
  }

  // Process away batting
  for (const playerStats of boxScore.awayBatting) {
    const stats = getOrCreatePlayerStats(
      sessionStats,
      playerStats.playerSeasonId,
      playerStats.displayName || 'Unknown',
      boxScore.awayTeamId
    )
    recordGamePlayed(stats)

    if (playerStats.atBats) stats.atBats += playerStats.atBats
    if (playerStats.hits) stats.hits += playerStats.hits
    if (playerStats.doubles) stats.doubles += playerStats.doubles
    if (playerStats.triples) stats.triples += playerStats.triples
    if (playerStats.homeRuns) stats.homeRuns += playerStats.homeRuns
    if (playerStats.rbis) stats.rbi += playerStats.rbis
    if (playerStats.runs) stats.runs += playerStats.runs
    if (playerStats.walks) stats.walks += playerStats.walks
    if (playerStats.strikeouts) stats.strikeouts += playerStats.strikeouts
  }

  // Process home pitching
  for (const playerStats of boxScore.homePitching) {
    const stats = getOrCreatePlayerStats(
      sessionStats,
      playerStats.playerSeasonId,
      playerStats.displayName || 'Unknown',
      boxScore.homeTeamId
    )

    if (playerStats.inningsPitched) stats.inningsPitchedOuts += playerStats.inningsPitched
    if (playerStats.earnedRuns) stats.earnedRuns += playerStats.earnedRuns
    if (playerStats.strikeoutsPitched) stats.strikeoutsThrown += playerStats.strikeoutsPitched
    if (playerStats.walksPitched) stats.walksAllowed += playerStats.walksPitched
    if (playerStats.hitsAllowed) stats.hitsAllowed += playerStats.hitsAllowed
  }

  // Process away pitching
  for (const playerStats of boxScore.awayPitching) {
    const stats = getOrCreatePlayerStats(
      sessionStats,
      playerStats.playerSeasonId,
      playerStats.displayName || 'Unknown',
      boxScore.awayTeamId
    )

    if (playerStats.inningsPitched) stats.inningsPitchedOuts += playerStats.inningsPitched
    if (playerStats.earnedRuns) stats.earnedRuns += playerStats.earnedRuns
    if (playerStats.strikeoutsPitched) stats.strikeoutsThrown += playerStats.strikeoutsPitched
    if (playerStats.walksPitched) stats.walksAllowed += playerStats.walksPitched
    if (playerStats.hitsAllowed) stats.hitsAllowed += playerStats.hitsAllowed
  }

  // Process pitcher decisions (wins/losses/saves) from GameResult
  if (gameResult) {
    // Find and update winning pitcher
    if (gameResult.winningPitcherId) {
      const winningPitcherStats = sessionStats.playerStats.get(gameResult.winningPitcherId)
      if (winningPitcherStats) {
        recordWin(winningPitcherStats)
      }
    }

    // Find and update losing pitcher
    if (gameResult.losingPitcherId) {
      const losingPitcherStats = sessionStats.playerStats.get(gameResult.losingPitcherId)
      if (losingPitcherStats) {
        recordLoss(losingPitcherStats)
      }
    }

    // Find and update save pitcher
    if (gameResult.savePitcherId) {
      const savePitcherStats = sessionStats.playerStats.get(gameResult.savePitcherId)
      if (savePitcherStats) {
        recordSave(savePitcherStats)
      }
    }
  }

  // Update calculated stats for all affected players
  sessionStats.playerStats.forEach(stats => updateCalculatedStats(stats))
  sessionStats.lastUpdated = new Date()
}

/**
 * Get all player stats as an array (for iteration)
 */
export function getAllPlayerStats(sessionStats: SessionSimulationStats): PlayerSimulationStats[] {
  return Array.from(sessionStats.playerStats.values())
}

/**
 * Check if session has any simulation stats
 */
export function hasSimulationStats(sessionStats: SessionSimulationStats | undefined): boolean {
  if (!sessionStats) return false
  return sessionStats.playerStats.size > 0
}

// Minimum qualification thresholds for simulation leaders
export const SIM_MIN_PLATE_APPEARANCES = 50
export const SIM_MIN_INNINGS_PITCHED_OUTS = 30 // 10 innings
