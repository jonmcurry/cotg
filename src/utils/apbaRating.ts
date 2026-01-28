/**
 * APBA-Style Player Rating System
 *
 * Based on reverse engineering of APBA Baseball For Windows v3.0
 * See: docs/analysis/apba-rating-system-reverse-engineered.md
 *
 * Calculates 0-100 player ratings using APBA methodology:
 * - Position players: Offensive value + Defensive rating + Position scarcity
 * - Pitchers: Grade (ERA-based) + Control (K/BB) + Stars (Wins/Saves)
 */

/**
 * Position scarcity multipliers (from APBA methodology)
 * Higher values = scarcer positions that should be drafted earlier
 */
export const POSITION_SCARCITY: Record<string, number> = {
  'C': 1.3,   // Catchers are very scarce
  'SS': 1.2,  // Premium shortstops are scarce
  '2B': 1.1,
  '3B': 1.1,
  'CF': 1.1,  // Center fielders (if we can detect them)
  '1B': 1.0,
  'OF': 1.0,  // Generic outfielders
  'LF': 1.0,
  'RF': 1.0,
  'DH': 0.9,  // Designated hitters (no defense)
  'P': 1.0,   // Pitchers (use pitcher rating, not position player)
  'SP': 1.2,  // Starting pitchers
  'RP': 0.8,  // Relief pitchers
  'CL': 1.3,  // Elite closers
}

/**
 * Player season data structure (matches database schema)
 */
export interface PlayerSeasonStats {
  // Position info
  primary_position: string

  // Batting stats (nullable)
  at_bats: number | null
  batting_avg: number | null
  on_base_pct: number | null
  slugging_pct: number | null
  ops: number | null
  home_runs: number | null
  stolen_bases: number | null

  // Bill James advanced stats (already calculated in DB)
  runs_created_advanced: number | null
  isolated_power: number | null
  secondary_avg: number | null

  // Fielding stats
  fielding_pct: number | null
  range_factor: number | null
  errors: number | null

  // Pitching stats (nullable)
  wins: number | null
  losses: number | null
  saves: number | null
  era: number | null
  whip: number | null
  k_bb_ratio: number | null
  strikeouts_pitched: number | null
  walks_allowed: number | null
  innings_pitched_outs: number | null
}

/**
 * Estimate defensive rating (1-9 scale) from fielding statistics
 * 1 = Elite (Gold Glove), 9 = Poor
 *
 * APBA uses 1-9 defensive ratings. We estimate from fielding_pct and range_factor.
 * NOTE: Currently unused but exported for future defensive rating calculations
 */
export function estimateDefensiveRating(
  fielding_pct: number | null,
  range_factor: number | null,
  position: string
): number {
  // Position-specific benchmarks (approximate)
  const benchmarks: Record<string, { fpct: number, range: number }> = {
    'C': { fpct: 0.990, range: 7.0 },
    '1B': { fpct: 0.993, range: 9.5 },
    '2B': { fpct: 0.983, range: 5.0 },
    '3B': { fpct: 0.960, range: 2.8 },
    'SS': { fpct: 0.970, range: 4.5 },
    'OF': { fpct: 0.985, range: 2.0 },
    'LF': { fpct: 0.985, range: 2.0 },
    'CF': { fpct: 0.988, range: 2.3 },
    'RF': { fpct: 0.985, range: 2.0 },
  }

  const benchmark = benchmarks[position] || benchmarks['OF']

  // If no fielding data, assume average (rating 5)
  if (!fielding_pct && !range_factor) {
    return 5
  }

  let rating = 5.0  // Start at average

  // Adjust based on fielding percentage
  if (fielding_pct !== null) {
    const fpctDiff = fielding_pct - benchmark.fpct
    rating -= fpctDiff * 100  // Each .010 above average = -1 rating
  }

  // Adjust based on range factor
  if (range_factor !== null) {
    const rangeDiff = range_factor - benchmark.range
    rating -= rangeDiff * 0.5  // Each 1.0 above average = -0.5 rating
  }

  // Clamp to 1-9 range
  return Math.max(1, Math.min(9, Math.round(rating)))
}

/**
 * Map ERA to APBA pitching grade points
 * A = 100 (elite), B = 75 (above avg), C = 50 (avg), D = 25 (below avg)
 */
function mapERAtoGradePoints(era: number | null): number {
  if (era === null || era === 0) return 25  // Default to D grade

  if (era < 2.50) return 100  // Grade A (Cy Young level)
  if (era < 3.50) return 75   // Grade B (All-Star level)
  if (era < 4.50) return 50   // Grade C (Average starter)
  return 25                    // Grade D (Below average)
}

/**
 * Map K/BB ratio to APBA control points (0-88 scale)
 * Higher control = fewer walks relative to strikeouts
 */
function mapKBBtoControlPoints(k_bb_ratio: number | null): number {
  if (k_bb_ratio === null || k_bb_ratio === 0) return 20  // Default to poor control

  // Map K/BB ratio to 0-88 scale
  // Elite control: K/BB > 4.0 → 88 points
  // Poor control: K/BB < 1.0 → 8 points
  const controlScore = Math.min(88, k_bb_ratio * 22)
  return Math.max(8, controlScore)
}

/**
 * Map wins and saves to APBA star points (0-50 scale)
 * Z star = 50 (elite), Y = 30 (very good), X = 15 (good), W = 5 (average)
 */
function mapWinsAndSavesToStarPoints(wins: number | null, saves: number | null): number {
  const totalValue = (wins || 0) + (saves || 0)

  if (totalValue >= 20) return 50  // Z star (elite: 20+ W or 20+ SV)
  if (totalValue >= 15) return 30  // Y star (very good: 15-19)
  if (totalValue >= 10) return 15  // X star (good: 10-14)
  if (totalValue >= 5) return 5    // W star (average: 5-9)
  return 0  // No star (below average)
}

/**
 * Calculate APBA rating for a position player (batter)
 *
 * PURELY OFFENSIVE RATING - Position does NOT affect individual player rating
 *
 * Formula:
 * Rating = Average(OPS × 100, RC/5, ISO × 100)
 *
 * Uses Bill James offensive metrics:
 * - OPS (On-base Plus Slugging): Primary offensive value
 * - Runs Created (Advanced): Run production ability
 * - Isolated Power: Raw power measurement
 *
 * Position scarcity should ONLY be applied at draft selection time,
 * not when calculating historical player ratings.
 */
export function calculateBatterRating(player: PlayerSeasonStats): number {
  // Calculate offensive rating components
  const components: number[] = []

  // Component 1: OPS (scaled to 0-100)
  // OPS of 1.000 = 100 points, 0.700 = 70 points
  // Elite players: 1.100+ = 110 points (Babe Ruth, Ted Williams)
  if (player.ops !== null) {
    components.push(player.ops * 100)
  }

  // Component 2: Runs Created (Advanced)
  // Scaled by dividing by 5 to get 0-100 range
  // Elite seasons: 150+ RC = 30 points
  if (player.runs_created_advanced !== null) {
    components.push(player.runs_created_advanced / 5)
  }

  // Component 3: Isolated Power
  // ISO × 100 to scale to 0-100 range
  // Elite power: ISO of 0.300+ = 30 points (Babe Ruth, Barry Bonds)
  if (player.isolated_power !== null) {
    components.push(player.isolated_power * 100)
  }

  // If no offensive stats available, return 0
  if (components.length === 0) {
    return 0
  }

  // Average all available components
  const offensiveRating = components.reduce((sum, val) => sum + val, 0) / components.length

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, offensiveRating))
}

/**
 * Calculate APBA rating for a pitcher
 *
 * PURELY PITCHING EFFECTIVENESS RATING - Role does NOT affect individual rating
 *
 * Formula:
 * Rating = (Grade × 0.5) + (Control × 0.3) + (Stars × 0.2)
 *
 * Components:
 * - Grade: ERA-based effectiveness (A/B/C/D)
 * - Control: K/BB ratio (command and control)
 * - Stars: Wins + Saves (results and usage)
 *
 * Starter vs reliever distinctions should ONLY be applied at draft selection,
 * not when calculating historical pitcher ratings.
 */
export function calculatePitcherRating(player: PlayerSeasonStats): number {
  // Calculate grade points from ERA (0-100, weighted 50%)
  const gradePoints = mapERAtoGradePoints(player.era)

  // Calculate control points from K/BB ratio (0-88, weighted 30%)
  const controlPoints = mapKBBtoControlPoints(player.k_bb_ratio)

  // Calculate star points from wins and saves (0-50, weighted 20%)
  const starPoints = mapWinsAndSavesToStarPoints(player.wins, player.saves)

  // Combine with weights
  const rating = (gradePoints * 0.5) + (controlPoints * 0.3) + (starPoints * 0.2)

  // Clamp to 0-100 range (no role multipliers)
  return Math.max(0, Math.min(100, rating))
}

/**
 * Calculate APBA rating for any player (auto-detects position vs pitcher)
 *
 * @param player - Player season statistics
 * @returns APBA rating (0-100 scale)
 */
export function calculatePlayerRating(player: PlayerSeasonStats): number {
  const position = player.primary_position

  // Determine if pitcher or position player
  const isPitcher = position === 'P' || position === 'SP' || position === 'RP' || position === 'CL'

  // Also check if player has significant pitching stats
  const hasPitchingStats = (player.innings_pitched_outs || 0) >= 60  // ~20 IP minimum

  if (isPitcher || hasPitchingStats) {
    return calculatePitcherRating(player)
  } else {
    return calculateBatterRating(player)
  }
}

/**
 * Get rating description for display
 *
 * @param rating - APBA rating (0-100)
 * @returns Human-readable description
 */
export function getRatingDescription(rating: number): string {
  if (rating >= 90) return 'Legendary'
  if (rating >= 85) return 'Elite'
  if (rating >= 75) return 'All-Star'
  if (rating >= 65) return 'Above Average'
  if (rating >= 50) return 'Average'
  if (rating >= 35) return 'Below Average'
  return 'Replacement Level'
}

/**
 * Get APBA grade letter for pitchers (for display)
 *
 * @param rating - Pitcher APBA rating
 * @returns Grade letter (A, B, C, D)
 */
export function getPitcherGrade(rating: number): string {
  if (rating >= 85) return 'A'
  if (rating >= 70) return 'B'
  if (rating >= 50) return 'C'
  return 'D'
}
