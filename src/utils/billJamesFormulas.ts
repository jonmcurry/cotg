/**
 * Bill James Formula Implementations
 *
 * These formulas are applied to Lahman database statistics to provide
 * advanced baseball metrics pioneered by Bill James.
 *
 * References:
 * - docs/BILL_JAMES_FORMULAS.md
 * - docs/BILL_JAMES_FEATURES.md
 */

export interface BattingStats {
  H: number // Hits
  BB: number // Walks
  TB: number // Total Bases
  AB: number // At Bats
  SB?: number // Stolen Bases
  CS?: number // Caught Stealing
  HBP?: number // Hit By Pitch
  GIDP?: number // Grounded Into Double Play
  IBB?: number // Intentional Walks
  SH?: number // Sacrifice Hits
  SF?: number // Sacrifice Flies
  HR?: number // Home Runs
}

export interface PitchingStats {
  IP: number // Innings Pitched
  H: number // Hits Allowed
  ER: number // Earned Runs
  R: number // Runs Allowed
  BB: number // Walks
  SO: number // Strikeouts
  HR?: number // Home Runs Allowed
}

export interface FieldingStats {
  PO: number // Putouts
  A: number // Assists
  G: number // Games
  InnOuts?: number // Innings as outs (from Lahman Fielding.csv)
}

/**
 * Runs Created (Basic Version)
 * Formula: (H + BB) × TB / (AB + BB)
 *
 * Estimates the number of runs a player contributed to their team.
 */
export function runsCreatedBasic(stats: BattingStats): number {
  const { H, BB, TB, AB } = stats

  if (AB + BB === 0) return 0

  return ((H + BB) * TB) / (AB + BB)
}

/**
 * Runs Created (Advanced Version)
 * Formula: (H + BB + HBP - CS - GIDP) × (TB + 0.26(BB+HBP-IBB) + 0.52(SH+SF+SB)) / (AB + BB + HBP + SH + SF)
 *
 * More accurate version accounting for all offensive events.
 */
export function runsCreatedAdvanced(stats: BattingStats): number {
  const {
    H, BB, AB, TB,
    HBP = 0, CS = 0, GIDP = 0, IBB = 0,
    SH = 0, SF = 0, SB = 0
  } = stats

  const numerator = (H + BB + HBP - CS - GIDP) *
                    (TB + 0.26 * (BB + HBP - IBB) + 0.52 * (SH + SF + SB))

  const denominator = AB + BB + HBP + SH + SF

  if (denominator === 0) return 0

  return numerator / denominator
}

/**
 * Isolated Power (ISO)
 * Formula: SLG - AVG = (TB/AB) - (H/AB) = (TB - H) / AB
 *
 * Measures raw power by calculating extra bases per at-bat.
 */
export function isolatedPower(stats: BattingStats): number {
  const { TB, H, AB } = stats

  if (AB === 0) return 0

  return (TB - H) / AB
}

/**
 * Secondary Average (SecA)
 * Formula: (BB + TB - H + SB - CS) / AB
 *
 * Measures offensive contribution beyond batting average.
 */
export function secondaryAverage(stats: BattingStats): number {
  const { BB, TB, H, AB, SB = 0, CS = 0 } = stats

  if (AB === 0) return 0

  return (BB + TB - H + SB - CS) / AB
}

/**
 * Power/Speed Number
 * Formula: 2 × (HR × SB) / (HR + SB)
 *
 * Identifies rare 5-tool players. A player with 20 HR and 20 SB gets a score of 20.
 * Used to identify 20/20, 30/30, and 40/40 club members.
 */
export function powerSpeedNumber(stats: BattingStats): number {
  const { HR = 0, SB = 0 } = stats

  if (HR + SB === 0) return 0

  return (2 * HR * SB) / (HR + SB)
}

/**
 * Range Factor
 * Formula: (PO + A) × 9 / Innings
 *
 * Measures defensive plays made per 9 innings.
 * Note: Lahman Fielding.csv provides InnOuts (outs, not innings)
 * Innings = InnOuts / 3
 */
export function rangeFactor(stats: FieldingStats): number {
  const { PO, A, InnOuts = 0 } = stats

  // Convert InnOuts to actual innings
  const innings = InnOuts / 3

  if (innings === 0) return 0

  return ((PO + A) * 9) / innings
}

/**
 * Component ERA (Simplified)
 * Estimates what a pitcher's ERA would be with average defense.
 *
 * Simplified formula: ((H×0.89) + (BB×0.475) + (HR×3.2)) / IP
 */
export function componentERA(stats: PitchingStats): number {
  const { H, BB, HR = 0, IP } = stats

  if (IP === 0) return 0

  const componentRuns = (H * 0.89) + (BB * 0.475) + (HR * 3.2)

  return (componentRuns / IP) * 9
}

/**
 * Game Score (Per Game Average)
 * Start with 50, then:
 * +1 for each out recorded
 * +2 for each inning completed after 4th
 * +1 for each strikeout
 * -2 for each hit allowed
 * -4 for each earned run
 * -2 for each unearned run
 * -1 for each walk
 *
 * This implementation calculates an average game score from season stats.
 */
export function gameScore(stats: PitchingStats): number {
  const { IP, SO, H, ER, R, BB } = stats

  const outs = IP * 3
  const inningsAfter4 = Math.max(0, IP - 4)

  let score = 50
  score += outs * 1
  score += inningsAfter4 * 2
  score += SO * 1
  score -= H * 2
  score -= ER * 4
  score -= (R - ER) * 2 // Unearned runs
  score -= BB * 1

  return score
}

/**
 * Calculate all Bill James metrics for a batter
 */
export function calculateBattingMetrics(stats: BattingStats) {
  return {
    runsCreatedBasic: runsCreatedBasic(stats),
    runsCreatedAdvanced: runsCreatedAdvanced(stats),
    isolatedPower: isolatedPower(stats),
    secondaryAverage: secondaryAverage(stats),
    powerSpeedNumber: powerSpeedNumber(stats),
  }
}

/**
 * Calculate all Bill James metrics for a pitcher
 */
export function calculatePitchingMetrics(stats: PitchingStats) {
  return {
    componentERA: componentERA(stats),
    gameScore: gameScore(stats),
  }
}

/**
 * Calculate defensive metrics
 */
export function calculateFieldingMetrics(stats: FieldingStats) {
  return {
    rangeFactor: rangeFactor(stats),
  }
}
