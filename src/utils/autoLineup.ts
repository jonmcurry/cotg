/**
 * Auto-Lineup Generation
 * Generates optimal depth charts (lineups, rotation, bullpen) for a team
 * based on roster composition and player stats.
 *
 * Called automatically when entering the Clubhouse after a draft.
 * Users can manually override any auto-generated assignments.
 */

import type { DraftTeam, TeamDepthChart, LineupSlot, RotationSlot, PositionCode } from '../types/draft.types'
import { POSITION_ELIGIBILITY } from '../types/draft.types'
import type { PlayerSeason } from './cpuDraftLogic'

type PlatoonContext = 'vsRHP' | 'vsLHP'

interface ScoredPlayer {
  player: PlayerSeason
  rosterPosition: PositionCode
  platoonScore: number
}

/**
 * Calculate platoon-adjusted score for a player.
 * vs RHP: lefties and switch hitters get a bonus
 * vs LHP: righties and switch hitters get a bonus
 */
function getPlatoonScore(player: PlayerSeason, context: PlatoonContext): number {
  const baseScore = player.apba_rating
    || ((player.on_base_pct || 0) + (player.slugging_pct || 0)) * 100
    || 0

  const bats = player.bats
  if (context === 'vsRHP') {
    if (bats === 'L') return baseScore * 1.15
    if (bats === 'B') return baseScore * 1.10
    return baseScore
  } else {
    if (bats === 'R') return baseScore * 1.15
    if (bats === 'B') return baseScore * 1.10
    return baseScore
  }
}

/**
 * Check if a player's primary position qualifies for a defensive slot.
 * Uses POSITION_ELIGIBILITY mapping from draft types.
 */
function canPlayPosition(player: PlayerSeason, position: PositionCode): boolean {
  const eligible = POSITION_ELIGIBILITY[position] || []
  return eligible.includes(player.primary_position)
}

/**
 * Defensive positions needed for a lineup, in assignment priority order.
 * Scarce positions first so the best available player fills them before
 * more flexible positions consume the pool.
 */
const LINEUP_POSITIONS: PositionCode[] = ['C', 'SS', '2B', '3B', '1B', 'OF', 'OF', 'OF', 'DH']

/**
 * Build a 9-player lineup for a given platoon context.
 * Assigns defensive positions via greedy best-fit, then orders the batting lineup.
 */
function buildLineup(
  positionPlayers: ScoredPlayer[],
  context: PlatoonContext,
  allPlayers: PlayerSeason[]
): LineupSlot[] {
  // Score each player for this platoon context
  const scored = positionPlayers.map(sp => ({
    ...sp,
    platoonScore: getPlatoonScore(sp.player, context),
  }))

  // Greedy assignment: for each required position, pick the best unassigned player
  const assigned: Array<{ player: PlayerSeason; position: PositionCode; platoonScore: number }> = []
  const usedPlayerIds = new Set<string>()

  for (const position of LINEUP_POSITIONS) {
    const candidates = scored.filter(sp =>
      !usedPlayerIds.has(sp.player.id) && canPlayPosition(sp.player, position)
    )

    // Sort by platoon score descending, pick best
    candidates.sort((a, b) => b.platoonScore - a.platoonScore)

    if (candidates.length > 0) {
      const best = candidates[0]
      assigned.push({ player: best.player, position, platoonScore: best.platoonScore })
      usedPlayerIds.add(best.player.id)
    }
  }

  // If we couldn't fill all 9 positions, fill remaining with best unassigned players as DH
  if (assigned.length < 9) {
    const remaining = scored
      .filter(sp => !usedPlayerIds.has(sp.player.id))
      .sort((a, b) => b.platoonScore - a.platoonScore)

    for (const sp of remaining) {
      if (assigned.length >= 9) break
      assigned.push({ player: sp.player, position: 'DH', platoonScore: sp.platoonScore })
      usedPlayerIds.add(sp.player.id)
    }
  }

  // Sort into batting order
  const battingOrder = sortBattingOrder(assigned, allPlayers)

  // Convert to LineupSlot array
  return battingOrder.map((entry, idx) => ({
    slotNumber: idx + 1,
    playerSeasonId: entry.player.id,
    position: entry.position,
  }))
}

/**
 * Sort 9 assigned players into an optimal batting order.
 *
 * 1. Leadoff: highest OBP (table-setter)
 * 2. 2-hole: highest OBP remaining (on-base machine)
 * 3. 3-hole: highest OPS (best all-around hitter)
 * 4. Cleanup: most HRs (power)
 * 5. 5-hole: highest OPS remaining
 * 6-9: remaining sorted by apba_rating descending
 */
function sortBattingOrder(
  assigned: Array<{ player: PlayerSeason; position: PositionCode; platoonScore: number }>,
  _allPlayers: PlayerSeason[]
): Array<{ player: PlayerSeason; position: PositionCode }> {
  const pool = [...assigned]
  const order: Array<{ player: PlayerSeason; position: PositionCode }> = []

  // Helper: extract best by comparator, remove from pool
  function pickBest(comparator: (a: typeof pool[0], b: typeof pool[0]) => number) {
    pool.sort(comparator)
    const best = pool.shift()!
    order.push({ player: best.player, position: best.position })
  }

  if (pool.length === 0) return order

  // 1. Leadoff: highest OBP
  pickBest((a, b) => (b.player.on_base_pct || 0) - (a.player.on_base_pct || 0))

  if (pool.length === 0) return order

  // 2. 2-hole: highest OBP remaining
  pickBest((a, b) => (b.player.on_base_pct || 0) - (a.player.on_base_pct || 0))

  if (pool.length === 0) return order

  // 3. 3-hole: highest OPS
  const ops = (p: PlayerSeason) => (p.on_base_pct || 0) + (p.slugging_pct || 0)
  pickBest((a, b) => ops(b.player) - ops(a.player))

  if (pool.length === 0) return order

  // 4. Cleanup: most HRs
  pickBest((a, b) => (b.player.home_runs || 0) - (a.player.home_runs || 0))

  if (pool.length === 0) return order

  // 5. 5-hole: highest OPS remaining
  pickBest((a, b) => ops(b.player) - ops(a.player))

  // 6-9: remaining by apba_rating descending
  pool.sort((a, b) => (b.player.apba_rating || 0) - (a.player.apba_rating || 0))
  for (const entry of pool) {
    order.push({ player: entry.player, position: entry.position })
  }

  return order
}

/**
 * Generate an optimal depth chart for a team based on drafted roster and player stats.
 *
 * @param team - The draft team with filled roster slots
 * @param players - All drafted player season data (across all teams)
 * @returns A complete TeamDepthChart with lineups, rotation, and bullpen
 */
export function generateOptimalDepthChart(
  team: DraftTeam,
  players: PlayerSeason[]
): TeamDepthChart {
  // Map roster slots to player data
  const rosterWithPlayers = team.roster
    .filter(slot => slot.isFilled && slot.playerSeasonId)
    .map(slot => ({
      player: players.find(p => p.id === slot.playerSeasonId),
      rosterPosition: slot.position,
    }))
    .filter((r): r is { player: PlayerSeason; rosterPosition: PositionCode } => !!r.player)

  // Split into position players and pitchers
  const positionPlayers: ScoredPlayer[] = rosterWithPlayers
    .filter(r => !['SP', 'RP', 'CL'].includes(r.rosterPosition))
    .map(r => ({ player: r.player, rosterPosition: r.rosterPosition, platoonScore: 0 }))

  const pitchers = rosterWithPlayers
    .filter(r => ['SP', 'RP', 'CL'].includes(r.rosterPosition))

  // --- LINEUPS ---
  const lineupVS_RHP = buildLineup(positionPlayers, 'vsRHP', players)
  const lineupVS_LHP = buildLineup(positionPlayers, 'vsLHP', players)

  // Pad to 9 slots if fewer than 9 players available
  while (lineupVS_RHP.length < 9) {
    lineupVS_RHP.push({ slotNumber: lineupVS_RHP.length + 1, playerSeasonId: null, position: 'DH' as PositionCode })
  }
  while (lineupVS_LHP.length < 9) {
    lineupVS_LHP.push({ slotNumber: lineupVS_LHP.length + 1, playerSeasonId: null, position: 'DH' as PositionCode })
  }

  // --- ROTATION ---
  const starters = pitchers
    .filter(p => p.rosterPosition === 'SP')
    .sort((a, b) => (b.player.apba_rating || 0) - (a.player.apba_rating || 0))

  const rotation: RotationSlot[] = Array.from({ length: 5 }, (_, i) => ({
    slotNumber: i + 1,
    playerSeasonId: starters[i]?.player.id || null,
  }))

  // --- BULLPEN ---
  const closerCandidate = pitchers.find(p => p.rosterPosition === 'CL')
  const closerId = closerCandidate?.player.id || null

  const setupCandidates = pitchers
    .filter(p => p.rosterPosition === 'RP')
    .sort((a, b) => (a.player.era || 99) - (b.player.era || 99)) // lowest ERA first

  const setup = setupCandidates.map(p => p.player.id)

  return {
    lineupVS_RHP,
    lineupVS_LHP,
    rotation,
    bullpen: {
      closer: closerId,
      setup,
    },
  }
}
