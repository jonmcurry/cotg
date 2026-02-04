/**
 * Auto-Lineup API Routes
 * Server-side lineup generation for optimal depth charts
 */

import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// Types
type PositionCode = 'C' | '1B' | '2B' | 'SS' | '3B' | 'OF' | 'SP' | 'RP' | 'CL' | 'DH' | 'BN'
type PlatoonContext = 'vsRHP' | 'vsLHP'

interface PlayerSeason {
  id: string
  player_id: string
  year: number
  primary_position: string
  apba_rating: number | null
  at_bats: number | null
  home_runs: number | null
  on_base_pct: number | null
  slugging_pct: number | null
  innings_pitched_outs: number | null
  era: number | null
  bats?: 'L' | 'R' | 'B' | null
}

interface RosterSlot {
  position: PositionCode
  slotNumber: number
  playerSeasonId: string | null
  isFilled: boolean
}

interface LineupSlot {
  slotNumber: number
  playerSeasonId: string | null
  position: PositionCode
}

interface RotationSlot {
  slotNumber: number
  playerSeasonId: string | null
}

interface TeamDepthChart {
  lineupVS_RHP: LineupSlot[]
  lineupVS_LHP: LineupSlot[]
  rotation: RotationSlot[]
  bullpen: {
    closer: string | null
    setup: string[]
  }
}

interface ScoredPlayer {
  player: PlayerSeason
  rosterPosition: PositionCode
  platoonScore: number
}

// Position eligibility mapping
const POSITION_ELIGIBILITY: Record<PositionCode, string[]> = {
  'C': ['C'],
  '1B': ['1B'],
  '2B': ['2B'],
  'SS': ['SS'],
  '3B': ['3B'],
  'OF': ['OF', 'LF', 'CF', 'RF'],
  'SP': ['P', 'SP'],
  'RP': ['P', 'RP'],
  'CL': ['P', 'RP', 'CL'],
  'DH': ['C', '1B', '2B', 'SS', '3B', 'OF', 'LF', 'CF', 'RF', 'P', 'SP', 'RP', 'CL', 'DH'],
  'BN': ['C', '1B', '2B', 'SS', '3B', 'OF', 'LF', 'CF', 'RF', 'DH'],
}

// Defensive positions in assignment priority order
const LINEUP_POSITIONS: PositionCode[] = ['C', 'SS', '2B', '3B', '1B', 'OF', 'OF', 'OF', 'DH']

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
 */
function canPlayPosition(player: PlayerSeason, position: PositionCode): boolean {
  const eligible = POSITION_ELIGIBILITY[position] || []
  return eligible.includes(player.primary_position)
}

/**
 * Sort 9 assigned players into an optimal batting order.
 */
function sortBattingOrder(
  assigned: Array<{ player: PlayerSeason; position: PositionCode; platoonScore: number }>
): Array<{ player: PlayerSeason; position: PositionCode }> {
  const pool = [...assigned]
  const order: Array<{ player: PlayerSeason; position: PositionCode }> = []

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
 * Build a 9-player lineup for a given platoon context.
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
    candidates.sort((a, b) => b.platoonScore - a.platoonScore)

    if (candidates.length > 0) {
      const best = candidates[0]
      assigned.push({ player: best.player, position, platoonScore: best.platoonScore })
      usedPlayerIds.add(best.player.id)
    }
  }

  // Fill remaining with best unassigned players as DH
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
  const battingOrder = sortBattingOrder(assigned)

  // Convert to LineupSlot array
  return battingOrder.map((entry, idx) => ({
    slotNumber: idx + 1,
    playerSeasonId: entry.player.id,
    position: entry.position,
  }))
}

/**
 * Generate an optimal depth chart for a team.
 */
function generateOptimalDepthChart(
  roster: Array<{ position: PositionCode; playerSeasonId: string }>,
  players: PlayerSeason[]
): TeamDepthChart {
  // Map roster slots to player data
  const rosterWithPlayers = roster
    .filter(slot => slot.playerSeasonId)
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

  // Pad to 9 slots
  while (lineupVS_RHP.length < 9) {
    lineupVS_RHP.push({ slotNumber: lineupVS_RHP.length + 1, playerSeasonId: null, position: 'DH' })
  }
  while (lineupVS_LHP.length < 9) {
    lineupVS_LHP.push({ slotNumber: lineupVS_LHP.length + 1, playerSeasonId: null, position: 'DH' })
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
    .sort((a, b) => (a.player.era || 99) - (b.player.era || 99))

  const setup = setupCandidates.map(p => p.player.id)

  return {
    lineupVS_RHP,
    lineupVS_LHP,
    rotation,
    bullpen: { closer: closerId, setup },
  }
}

// Transform database row to PlayerSeason
function transformPlayerRow(row: any): PlayerSeason {
  return {
    id: row.id,
    player_id: row.player_id,
    year: row.year,
    primary_position: row.primary_position,
    apba_rating: row.apba_rating,
    at_bats: Number(row.at_bats) || 0,
    home_runs: row.home_runs,
    on_base_pct: row.on_base_pct,
    slugging_pct: row.slugging_pct,
    innings_pitched_outs: Number(row.innings_pitched_outs) || 0,
    era: row.era,
    bats: row.players?.bats,
  }
}

/**
 * POST /api/teams/:teamId/auto-lineup
 * Generate an optimal depth chart for a team
 *
 * Request body:
 *   - roster: Array<{ position: PositionCode, playerSeasonId: string }>
 *
 * Returns:
 *   - depthChart: TeamDepthChart
 */
router.post('/:teamId/auto-lineup', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params
    const { roster } = req.body as { roster: Array<{ position: PositionCode; playerSeasonId: string }> }

    if (!roster || !Array.isArray(roster)) {
      return res.status(400).json({ error: 'Missing roster data in request body' })
    }

    // Extract player season IDs from roster
    const playerSeasonIds = roster
      .filter(slot => slot.playerSeasonId)
      .map(slot => slot.playerSeasonId)

    if (playerSeasonIds.length === 0) {
      return res.status(400).json({ error: 'No players in roster' })
    }

    // Load player data
    const { data, error } = await supabase
      .from('player_seasons')
      .select(`
        id, player_id, year, primary_position, apba_rating,
        at_bats, home_runs, on_base_pct, slugging_pct,
        innings_pitched_outs, era,
        players!inner (bats)
      `)
      .in('id', playerSeasonIds)

    if (error) {
      console.error('[Lineup API] Error loading players:', error)
      return res.status(500).json({ error: 'Failed to load player data' })
    }

    const players = (data || []).map(transformPlayerRow)

    // Generate the depth chart
    const depthChart = generateOptimalDepthChart(roster, players)

    // console.log('[Lineup API] Generated depth chart for team:', teamId, {
    //   lineupVS_RHP: depthChart.lineupVS_RHP.filter(s => s.playerSeasonId).length,
    //   lineupVS_LHP: depthChart.lineupVS_LHP.filter(s => s.playerSeasonId).length,
    //   rotation: depthChart.rotation.filter(s => s.playerSeasonId).length,
    //   closer: depthChart.bullpen.closer ? 'assigned' : 'none',
    //   setup: depthChart.bullpen.setup.length,
    // })

    return res.json({ depthChart })
  } catch (err) {
    console.error('[Lineup API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
