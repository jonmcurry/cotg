/**
 * League Leaders Calculation Utility
 *
 * Calculates top players by various statistical categories
 * for display in the StatMaster component.
 */

import type { PlayerSeason } from '../types/player'

// Minimum at-bats to qualify for batting average leaders
const MIN_AT_BATS = 100

// Minimum innings pitched (outs) to qualify for ERA leaders
// ~50 IP = 150 outs
const MIN_INNINGS_OUTS = 150

export type BattingStatCategory = 'avg' | 'hr' | 'rbi' | 'hits' | 'sb' | 'obp' | 'slg'
export type PitchingStatCategory = 'era' | 'wins' | 'strikeouts' | 'saves' | 'whip'

export interface LeaderEntry {
  player: PlayerSeason
  value: number
  rank: number
}

export interface LeagueLeadersResult {
  batting: {
    avg: LeaderEntry[]
    hr: LeaderEntry[]
    rbi: LeaderEntry[]
    hits: LeaderEntry[]
    sb: LeaderEntry[]
  }
  pitching: {
    era: LeaderEntry[]
    wins: LeaderEntry[]
    strikeouts: LeaderEntry[]
    saves: LeaderEntry[]
  }
}

/**
 * Filter players to only batters (non-pitchers)
 */
function isBatter(player: PlayerSeason): boolean {
  const pitcherPositions = ['SP', 'RP', 'P', 'CL']
  return !pitcherPositions.includes(player.primary_position)
}

/**
 * Filter players to only pitchers
 */
function isPitcher(player: PlayerSeason): boolean {
  const pitcherPositions = ['SP', 'RP', 'P', 'CL']
  return pitcherPositions.includes(player.primary_position)
}

/**
 * Get top N batters for a specific stat category
 */
export function getBattingLeaders(
  players: PlayerSeason[],
  category: BattingStatCategory,
  limit: number = 5
): LeaderEntry[] {
  const batters = players.filter(isBatter)

  let qualifying: PlayerSeason[]
  let getValue: (p: PlayerSeason) => number
  let sortAscending = false

  switch (category) {
    case 'avg':
      // AVG requires minimum at-bats
      qualifying = batters.filter(p => (p.at_bats || 0) >= MIN_AT_BATS)
      getValue = (p) => p.batting_avg || 0
      break
    case 'hr':
      qualifying = batters
      getValue = (p) => p.home_runs || 0
      break
    case 'rbi':
      qualifying = batters
      getValue = (p) => p.rbi || 0
      break
    case 'hits':
      qualifying = batters
      getValue = (p) => p.hits || 0
      break
    case 'sb':
      qualifying = batters
      getValue = (p) => p.stolen_bases || 0
      break
    case 'obp':
      qualifying = batters.filter(p => (p.at_bats || 0) >= MIN_AT_BATS)
      getValue = (p) => p.on_base_pct || 0
      break
    case 'slg':
      qualifying = batters.filter(p => (p.at_bats || 0) >= MIN_AT_BATS)
      getValue = (p) => p.slugging_pct || 0
      break
    default:
      return []
  }

  // Sort (descending for all batting stats - higher is better)
  const sorted = qualifying.sort((a, b) => {
    const aVal = getValue(a)
    const bVal = getValue(b)
    return sortAscending ? aVal - bVal : bVal - aVal
  })

  // Take top N and add ranks
  return sorted.slice(0, limit).map((player, index) => ({
    player,
    value: getValue(player),
    rank: index + 1,
  }))
}

/**
 * Get top N pitchers for a specific stat category
 */
export function getPitchingLeaders(
  players: PlayerSeason[],
  category: PitchingStatCategory,
  limit: number = 5
): LeaderEntry[] {
  const pitchers = players.filter(isPitcher)

  let qualifying: PlayerSeason[]
  let getValue: (p: PlayerSeason) => number
  let sortAscending = false

  switch (category) {
    case 'era':
      // ERA requires minimum innings
      qualifying = pitchers.filter(p => (p.innings_pitched_outs || 0) >= MIN_INNINGS_OUTS)
      getValue = (p) => p.era || 999
      sortAscending = true // Lower ERA is better
      break
    case 'wins':
      qualifying = pitchers
      getValue = (p) => p.wins || 0
      break
    case 'strikeouts':
      qualifying = pitchers
      getValue = (p) => p.strikeouts_pitched || 0
      break
    case 'saves':
      qualifying = pitchers
      getValue = (p) => p.saves || 0
      break
    case 'whip':
      qualifying = pitchers.filter(p => (p.innings_pitched_outs || 0) >= MIN_INNINGS_OUTS)
      getValue = (p) => p.whip || 999
      sortAscending = true // Lower WHIP is better
      break
    default:
      return []
  }

  // Sort
  const sorted = qualifying.sort((a, b) => {
    const aVal = getValue(a)
    const bVal = getValue(b)
    return sortAscending ? aVal - bVal : bVal - aVal
  })

  // Take top N and add ranks
  return sorted.slice(0, limit).map((player, index) => ({
    player,
    value: getValue(player),
    rank: index + 1,
  }))
}

/**
 * Get all league leaders for all categories
 */
export function calculateLeagueLeaders(
  players: PlayerSeason[],
  limit: number = 5
): LeagueLeadersResult {
  return {
    batting: {
      avg: getBattingLeaders(players, 'avg', limit),
      hr: getBattingLeaders(players, 'hr', limit),
      rbi: getBattingLeaders(players, 'rbi', limit),
      hits: getBattingLeaders(players, 'hits', limit),
      sb: getBattingLeaders(players, 'sb', limit),
    },
    pitching: {
      era: getPitchingLeaders(players, 'era', limit),
      wins: getPitchingLeaders(players, 'wins', limit),
      strikeouts: getPitchingLeaders(players, 'strikeouts', limit),
      saves: getPitchingLeaders(players, 'saves', limit),
    },
  }
}

/**
 * Format a stat value for display
 */
export function formatStatValue(value: number, category: BattingStatCategory | PitchingStatCategory): string {
  switch (category) {
    case 'avg':
    case 'obp':
    case 'slg':
      // Display as .XXX (no leading zero)
      return value.toFixed(3).replace(/^0/, '')
    case 'era':
    case 'whip':
      return value.toFixed(2)
    default:
      return value.toString()
  }
}
