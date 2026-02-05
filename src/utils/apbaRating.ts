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
 * Minimum at-bats required for a batter rating
 * Below this threshold, sample size is too small for meaningful rating
 */
export const MIN_AT_BATS = 100

/**
 * Minimum innings pitched (in outs) required for a pitcher rating
 * 150 outs = 50 IP - below this threshold, sample size is too small
 */
export const MIN_INNINGS_PITCHED_OUTS = 150

/**
 * Map ERA to continuous pitching grade points (0-100 scale)
 *
 * Continuous formula replaces discrete A/B/C/D buckets to avoid cliff effects.
 * ERA 1.00 = 95, ERA 2.00 = 80, ERA 3.00 = 65, ERA 4.00 = 50, ERA 5.00 = 35, ERA 6.00 = 20
 *
 * Formula: 110 - (ERA * 15), clamped to 0-100
 */
function mapERAtoGradePoints(era: number | null): number {
  if (era === null || era === 0) return 35  // Default to below average

  // Continuous scale: lower ERA = higher score
  // ERA 1.00 -> 95, ERA 2.00 -> 80, ERA 3.00 -> 65, ERA 4.00 -> 50
  const score = 110 - (era * 15)
  return Math.max(0, Math.min(100, score))
}

/**
 * Map K/BB ratio to control points (0-100 scale)
 * Higher control = fewer walks relative to strikeouts
 *
 * Formula: K/BB * 25, clamped to 0-100
 * K/BB of 1.0 = 25, K/BB of 2.0 = 50, K/BB of 3.0 = 75, K/BB of 4.0+ = 100
 */
function mapKBBtoControlPoints(k_bb_ratio: number | null): number {
  if (k_bb_ratio === null || k_bb_ratio === 0) return 15  // Default to poor control

  // Map K/BB ratio to 0-100 scale
  // Elite control: K/BB > 4.0 → 100 points (matches elite starters)
  // Average control: K/BB 2.0 → 50 points
  // Poor control: K/BB < 1.0 → 25 points
  const controlScore = k_bb_ratio * 25
  return Math.max(10, Math.min(100, controlScore))
}

/**
 * Map wins and saves to star points (0-100 scale)
 * Continuous scale: (W + SV) * 5, clamped to 0-100
 *
 * 5 W/SV = 25, 10 W/SV = 50, 15 W/SV = 75, 20 W/SV = 100
 */
function mapWinsAndSavesToStarPoints(wins: number | null, saves: number | null): number {
  const totalValue = (wins || 0) + (saves || 0)

  // Continuous scale: 5 points per win/save
  // 20+ W or 40+ SV caps at 100
  const starScore = totalValue * 5
  return Math.max(0, Math.min(100, starScore))
}

/**
 * Normalize a value to 0-100 scale given min/max bounds
 */
function normalizeToScale(value: number, min: number, max: number): number {
  const normalized = ((value - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, normalized))
}

/**
 * Calculate APBA rating for a position player (batter)
 *
 * PURELY OFFENSIVE RATING - Position does NOT affect individual player rating
 *
 * Formula (FIXED):
 * 1. Apply minimum at-bat threshold (100 AB) to avoid small sample inflation
 * 2. Normalize each component to 0-100 scale:
 *    - OPS: 0.500-1.400 maps to 0-100
 *    - RC:  0-250 maps to 0-100
 *    - ISO: 0-0.500 maps to 0-100
 * 3. Average the normalized components equally
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
  // MINIMUM THRESHOLD: Reject small sample sizes
  // Players with <100 AB can have extreme OPS values that don't reflect true talent
  if (player.at_bats === null || player.at_bats < MIN_AT_BATS) {
    return 0
  }

  // Calculate normalized offensive rating components
  const components: number[] = []

  // Component 1: OPS normalized to 0-100 scale
  // OPS range: 0.500 (replacement) to 1.400 (Ruth/Bonds peak) = 0-100
  // Average OPS ~0.750 = ~28, Good OPS ~0.850 = ~39, Elite OPS ~1.000 = ~56
  if (player.ops !== null) {
    const opsNormalized = normalizeToScale(player.ops, 0.500, 1.400)
    components.push(opsNormalized)
  }

  // Component 2: Runs Created normalized to 0-100 scale
  // RC range: 0 to 250 (Ruth 1921 had 249) = 0-100
  // Average RC ~60 = ~24, Good RC ~100 = ~40, Elite RC ~150 = ~60
  if (player.runs_created_advanced !== null) {
    const rcNormalized = normalizeToScale(player.runs_created_advanced, 0, 250)
    components.push(rcNormalized)
  }

  // Component 3: Isolated Power normalized to 0-100 scale
  // ISO range: 0 to 0.500 (extreme power like Ruth/Bonds) = 0-100
  // Average ISO ~0.150 = ~30, Good ISO ~0.200 = ~40, Elite ISO ~0.300 = ~60
  if (player.isolated_power !== null) {
    const isoNormalized = normalizeToScale(player.isolated_power, 0, 0.500)
    components.push(isoNormalized)
  }

  // If no offensive stats available, return 0
  if (components.length === 0) {
    return 0
  }

  // Average all available components (now equally weighted since all are 0-100)
  const offensiveRating = components.reduce((sum, val) => sum + val, 0) / components.length

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, offensiveRating))
}

/**
 * Calculate APBA rating for a pitcher
 *
 * PURELY PITCHING EFFECTIVENESS RATING - Role does NOT affect individual rating
 *
 * Formula (FIXED):
 * 1. Apply minimum innings threshold (50 IP = 150 outs) to avoid small sample inflation
 * 2. Calculate components (all now 0-100 scale):
 *    - ERA: Continuous scale (110 - ERA*15), clamped 0-100
 *    - Control: K/BB * 18, clamped 0-100
 *    - Stars: (W+SV) * 4, clamped 0-100
 * 3. Combine with adjusted weights: ERA 50%, Control 30%, Stars 20%
 *
 * This allows elite pitchers to reach 95+ ratings:
 * - Gibson 1968 (1.12 ERA): 95 + 77.8 + 88 weighted = 93.3
 * - Koufax 1965 (2.04 ERA): 79.4 + 96.8 + 100 weighted = 88.9
 *
 * Starter vs reliever distinctions should ONLY be applied at draft selection,
 * not when calculating historical pitcher ratings.
 */
export function calculatePitcherRating(player: PlayerSeasonStats): number {
  // MINIMUM THRESHOLD: Reject small sample sizes
  // Pitchers with <50 IP can have extreme ERAs that don't reflect true talent
  if (player.innings_pitched_outs === null || player.innings_pitched_outs < MIN_INNINGS_PITCHED_OUTS) {
    return 0
  }

  // Calculate grade points from ERA (0-100 continuous scale)
  const gradePoints = mapERAtoGradePoints(player.era)

  // Calculate control points from K/BB ratio (0-100 scale)
  const controlPoints = mapKBBtoControlPoints(player.k_bb_ratio)

  // Calculate star points from wins and saves (0-100 scale)
  const starPoints = mapWinsAndSavesToStarPoints(player.wins, player.saves)

  // Combine with weights (all components now 0-100)
  // Weights: ERA dominance (50%) + Control (30%) + Results (20%)
  const rating = (gradePoints * 0.50) + (controlPoints * 0.30) + (starPoints * 0.20)

  // Clamp to 0-100 range (no role multipliers)
  return Math.max(0, Math.min(100, rating))
}

/**
 * Calculate APBA rating for any player (auto-detects position vs pitcher)
 *
 * @param player - Player season statistics
 * @returns APBA rating (0-100 scale), or 0 if insufficient playing time
 */
export function calculatePlayerRating(player: PlayerSeasonStats): number {
  const position = player.primary_position

  // Determine if pitcher or position player
  const isPitcher = position === 'P' || position === 'SP' || position === 'RP' || position === 'CL'

  // Also check if player has significant pitching stats (above minimum threshold)
  const hasPitchingStats = (player.innings_pitched_outs || 0) >= MIN_INNINGS_PITCHED_OUTS

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
