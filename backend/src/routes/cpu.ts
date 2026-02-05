/**
 * CPU Draft API Routes
 * Server-side CPU draft logic for calculating and executing CPU picks
 */

import { Router, Request, Response } from 'express'
import { pool } from '../lib/db'
import { getOrLoadPlayerPool, clearCache, type PlayerSeason } from '../lib/playerPoolCache'
import {
  getSessionData,
  updateCacheAfterPick,
  invalidateSessionCache,
  type DbPickRow
} from '../lib/sessionCache'

const router = Router()

// Types matching frontend
type PositionCode = 'C' | '1B' | '2B' | 'SS' | '3B' | 'OF' | 'SP' | 'RP' | 'CL' | 'DH' | 'BN'
type TeamControl = 'human' | 'cpu'

interface RosterSlot {
  position: PositionCode
  slotNumber: number
  playerSeasonId: string | null
  isFilled: boolean
  playerBats?: 'L' | 'R' | 'B' | null
}

interface DraftTeam {
  id: string
  name: string
  control: TeamControl
  draftPosition: number
  roster: RosterSlot[]
  draftSessionId: string
}

// Roster requirements from SRD 3.5
const ROSTER_REQUIREMENTS: Record<PositionCode, number> = {
  'C': 1, '1B': 1, '2B': 1, 'SS': 1, '3B': 1,
  'OF': 3, 'SP': 4, 'RP': 3, 'CL': 1, 'DH': 1, 'BN': 4,
}

const TOTAL_ROUNDS = 21

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

// Position scarcity weights
const POSITION_SCARCITY: Record<PositionCode, number> = {
  'C': 1.6, 'SS': 1.5, 'OF': 1.3, '2B': 1.2, '3B': 1.2,
  '1B': 1.1, 'SP': 1.15, 'CL': 0.8, 'DH': 0.7, 'RP': 0.6, 'BN': 0.5,
}

// Create roster slots for a team
function createRosterSlots(): RosterSlot[] {
  const roster: RosterSlot[] = []
  Object.entries(ROSTER_REQUIREMENTS).forEach(([position, count]) => {
    for (let i = 0; i < count; i++) {
      roster.push({
        position: position as PositionCode,
        slotNumber: i + 1,
        playerSeasonId: null,
        isFilled: false,
      })
    }
  })
  return roster
}

// Adjust position scarcity by draft round
function adjustScarcityByRound(baseWeight: number, currentRound: number): number {
  if (currentRound <= 5) return baseWeight * 0.8
  if (currentRound <= 15) return baseWeight
  return baseWeight * 1.2
}

// Round-based position type preference
function getPositionTypeBonus(position: PositionCode, currentRound: number): number {
  const isHitterSlot = ['C', '1B', '2B', 'SS', '3B', 'OF', 'DH'].includes(position)
  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(position)

  if (currentRound <= 5) {
    if (isHitterSlot) return 1.25
    if (isPitcherSlot) return 0.75
  }
  if (currentRound <= 10) return 1.0
  if (isPitcherSlot) return 1.15
  if (isHitterSlot) return 0.85
  return 1.0
}

// Calculate volume multiplier based on playing time
function calculateVolumeMultiplier(player: PlayerSeason, position: PositionCode): number {
  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(position)

  if (isPitcherSlot) {
    const outs = player.innings_pitched_outs || 0
    if (outs > 600) return 1.15
    if (outs > 450) return 1.1
    if (outs < 180) return 0.8
    return 1.0
  }

  const atBats = player.at_bats || 0
  if (atBats > 450) return 1.15
  return 1.0
}

// Get unfilled positions for a team
function getUnfilledPositions(team: DraftTeam): PositionCode[] {
  const unfilled: PositionCode[] = []
  Object.entries(ROSTER_REQUIREMENTS).forEach(([position, required]) => {
    const posCode = position as PositionCode
    const filled = team.roster.filter(slot => slot.position === posCode && slot.isFilled).length
    if (filled < required) {
      for (let i = 0; i < required - filled; i++) {
        unfilled.push(posCode)
      }
    }
  })
  return unfilled
}

// Check if player qualifies for a position
function playerQualifiesForPosition(playerPosition: string, rosterPosition: PositionCode): boolean {
  if (!playerPosition) return false
  const eligiblePositions = POSITION_ELIGIBILITY[rosterPosition] || []
  const normalizedPlayerPosition = playerPosition.toUpperCase()
  return eligiblePositions.some(pos => pos.toUpperCase() === normalizedPlayerPosition)
}

// Check playing time requirements
function meetsPlayingTimeRequirements(player: PlayerSeason, rosterPosition: PositionCode, useRelaxed: boolean = false): boolean {
  const atBats = player.at_bats || 0
  const inningsPitchedOuts = player.innings_pitched_outs || 0
  const minAtBats = useRelaxed ? 100 : 200
  const minInningsPitchedOuts = useRelaxed ? 45 : 90

  const isPositionPlayerSlot = ['C', '1B', '2B', 'SS', '3B', 'OF', 'DH'].includes(rosterPosition)
  if (isPositionPlayerSlot) return atBats >= minAtBats

  const isPitcherSlot = ['SP', 'RP', 'CL'].includes(rosterPosition)
  if (isPitcherSlot) return inningsPitchedOuts >= minInningsPitchedOuts

  if (rosterPosition === 'BN') return atBats >= minAtBats
  return atBats >= minAtBats || inningsPitchedOuts >= minInningsPitchedOuts
}

// Calculate weighted score for a player
function calculateWeightedScore(
  player: PlayerSeason,
  position: PositionCode,
  team: DraftTeam,
  randomizationFactor: number = 0.1,
  scarcityWeight?: number,
  currentRound: number = 1
): number {
  const rating = player.apba_rating || 0
  const effectiveScarcityWeight = scarcityWeight ?? (POSITION_SCARCITY[position] || 1.0)

  let platoonBonus = 1.0
  if (position !== 'SP' && position !== 'RP' && position !== 'CL') {
    const filledRoster = team.roster.filter(s => s.isFilled)
    const existingLefties = filledRoster.filter(s => s.playerBats === 'L').length
    const existingRighties = filledRoster.filter(s => s.playerBats === 'R').length

    if (player.bats === 'L' && existingLefties < existingRighties) {
      platoonBonus = 1.05
    } else if (player.bats === 'R' && existingRighties < existingLefties) {
      platoonBonus = 1.05
    } else if (player.bats === 'B') {
      platoonBonus = 1.10
    }
  }

  const volumeMultiplier = calculateVolumeMultiplier(player, position)
  const posTypeBonus = getPositionTypeBonus(position, currentRound)
  const randomness = 1 + (Math.random() * 2 - 1) * randomizationFactor

  return rating * effectiveScarcityWeight * volumeMultiplier * platoonBonus * posTypeBonus * randomness
}

// Select best available player for CPU team
function selectBestPlayer(
  availablePlayers: PlayerSeason[],
  team: DraftTeam,
  draftedPlayerIds: Set<string>,
  excludePlayerSeasonIds: Set<string> = new Set(),
  currentRound: number = 1
): { player: PlayerSeason; position: PositionCode; slotNumber: number } | null {
  const undraftedPlayers = availablePlayers.filter(p =>
    !draftedPlayerIds.has(p.player_id) && !excludePlayerSeasonIds.has(p.id)
  )

  if (undraftedPlayers.length === 0) return null

  const unfilledPositions = getUnfilledPositions(team)
  const uniqueUnfilledPositions = [...new Set(unfilledPositions)]

  if (uniqueUnfilledPositions.length === 0) {
    const benchSlotsAvailable = team.roster.filter(slot => slot.position === 'BN' && !slot.isFilled).length
    if (benchSlotsAvailable > 0) {
      uniqueUnfilledPositions.push('BN')
    } else {
      return null
    }
  }

  interface ScoredCandidate { player: PlayerSeason; position: PositionCode; score: number }
  const allScoredCandidates: ScoredCandidate[] = []

  for (const position of uniqueUnfilledPositions) {
    const baseWeight = POSITION_SCARCITY[position] || 1.0
    const adjustedWeight = adjustScarcityByRound(baseWeight, currentRound)
    const eligible = undraftedPlayers.filter(player =>
      playerQualifiesForPosition(player.primary_position, position) &&
      meetsPlayingTimeRequirements(player, position)
    )
    for (const player of eligible) {
      const score = calculateWeightedScore(player, position, team, 0.1, adjustedWeight, currentRound)
      allScoredCandidates.push({ player, position, score })
    }
  }

  if (allScoredCandidates.length === 0) {
    // FALLBACK: Try with relaxed playing time requirements
    for (const position of uniqueUnfilledPositions) {
      const baseWeight = POSITION_SCARCITY[position] || 1.0
      const adjustedWeight = adjustScarcityByRound(baseWeight, currentRound)
      const eligible = undraftedPlayers.filter(player =>
        playerQualifiesForPosition(player.primary_position, position) &&
        meetsPlayingTimeRequirements(player, position, true)
      )
      for (const player of eligible) {
        const score = calculateWeightedScore(player, position, team, 0.1, adjustedWeight, currentRound)
        allScoredCandidates.push({ player, position, score })
      }
    }
  }

  if (allScoredCandidates.length === 0) return null

  allScoredCandidates.sort((a, b) => b.score - a.score)
  const topCount = Math.min(5, allScoredCandidates.length)
  const topCandidates = allScoredCandidates.slice(0, topCount)
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)]

  if (!selected) return null

  const availableSlot = team.roster.find(slot => slot.position === selected.position && !slot.isFilled)
  if (!availableSlot) return null

  return { player: selected.player, position: selected.position, slotNumber: availableSlot.slotNumber }
}

/**
 * POST /api/draft/sessions/:sessionId/cpu-pick
 * Calculate and execute a CPU draft pick
 */
router.post('/:sessionId/cpu-pick', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now()
    const { sessionId } = req.params
    const { seasons, excludePlayerSeasonIds = [] } = req.body

    // Load session data from cache (or database on miss)
    // This replaces 3 separate queries with a single cached lookup
    const sessionData = await getSessionData(sessionId)
    if (!sessionData) {
      return res.status(404).json({ result: 'error', error: `Session not found: ${sessionId}` })
    }

    const { session, teams: teamsRows, picks: picksRows } = sessionData
    const cacheLoadTime = Date.now() - startTime

    if (session.status !== 'in_progress') {
      return res.json({ result: 'error', error: `Draft is not in progress (status: ${session.status})` })
    }

    if (teamsRows.length === 0) {
      return res.status(500).json({ result: 'error', error: 'Failed to load teams' })
    }

    // Calculate current picking team (snake draft)
    const round = session.current_round
    const pickInRound = ((session.current_pick_number - 1) % session.num_teams) + 1
    const sortedTeams = round % 2 === 0
      ? [...teamsRows].sort((a, b) => b.draft_order - a.draft_order)
      : [...teamsRows].sort((a, b) => a.draft_order - b.draft_order)

    const currentTeamData = sortedTeams[pickInRound - 1]
    if (!currentTeamData) {
      return res.status(500).json({ result: 'error', error: 'Could not determine current picking team' })
    }

    if (currentTeamData.control !== 'cpu') {
      return res.json({ result: 'not_cpu_turn', teamId: currentTeamData.id, teamName: currentTeamData.team_name })
    }

    // Build team rosters from cached data
    const teams: DraftTeam[] = teamsRows.map((t: any) => ({
      id: t.id,
      name: t.team_name,
      control: t.control as TeamControl,
      draftPosition: t.draft_order,
      roster: createRosterSlots(),
      draftSessionId: sessionId,
    }))

    const draftedPlayerIds = new Set<string>()
    for (const pick of picksRows) {
      if (pick.player_id) draftedPlayerIds.add(pick.player_id)
      const team = teams.find(t => t.id === pick.draft_team_id)
      if (team && pick.player_season_id && pick.position && pick.slot_number) {
        const rosterSlot = team.roster.find(s => s.position === pick.position && s.slotNumber === pick.slot_number)
        if (rosterSlot) {
          rosterSlot.playerSeasonId = pick.player_season_id
          rosterSlot.isFilled = true
        }
      }
    }

    const currentTeam = teams.find(t => t.id === currentTeamData.id)
    if (!currentTeam) {
      return res.status(500).json({ result: 'error', error: 'Could not find current team' })
    }

    // Load player pool
    const yearList = seasons && seasons.length > 0 ? seasons : [session.season_year || new Date().getFullYear()]
    let allPlayers: PlayerSeason[]
    try {
      allPlayers = await getOrLoadPlayerPool(sessionId, yearList)
    } catch (err) {
      console.error('[CPU API] Error loading player pool:', err)
      return res.status(500).json({ result: 'error', error: 'Failed to load player pool' })
    }

    if (allPlayers.length === 0) {
      return res.status(500).json({ result: 'error', error: 'No players available in pool' })
    }

    // Run CPU selection
    const excludeSet = new Set<string>(excludePlayerSeasonIds)
    const selection = selectBestPlayer(allPlayers, currentTeam, draftedPlayerIds, excludeSet, round)

    if (!selection) {
      return res.json({ result: 'error', error: 'CPU could not find a player to draft' })
    }

    // Make the pick
    try {
      await pool.query(`
        INSERT INTO draft_picks (draft_session_id, draft_team_id, player_id, player_season_id, pick_number, round, pick_in_round, position, slot_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (draft_session_id, pick_number) DO UPDATE SET
          player_id = EXCLUDED.player_id, player_season_id = EXCLUDED.player_season_id,
          position = EXCLUDED.position, slot_number = EXCLUDED.slot_number
      `, [sessionId, currentTeam.id, selection.player.player_id, selection.player.id,
          session.current_pick_number, round, pickInRound, selection.position, selection.slotNumber])
    } catch (pickError: any) {
      if (pickError.code === '23505' && pickError.message?.includes('player_season_id')) {
        return res.status(409).json({ result: 'duplicate', error: 'Player already drafted', playerSeasonId: selection.player.id })
      }
      return res.status(500).json({ result: 'error', error: pickError.message })
    }

    // Update session
    const totalPicks = session.num_teams * TOTAL_ROUNDS
    const nextPickNumber = session.current_pick_number + 1
    const isComplete = nextPickNumber > totalPicks
    const nextRound = isComplete ? round : Math.floor((nextPickNumber - 1) / session.num_teams) + 1
    const newStatus = isComplete ? 'completed' : session.status

    await pool.query(
      'UPDATE draft_sessions SET current_pick_number = $1, current_round = $2, status = $3, updated_at = NOW() WHERE id = $4',
      [nextPickNumber, nextRound, newStatus, sessionId]
    )

    // Update cache with new pick data (avoids full reload on next pick)
    const newPickRow: DbPickRow = {
      pick_number: session.current_pick_number,
      draft_team_id: currentTeam.id,
      player_season_id: selection.player.id,
      player_id: selection.player.player_id,
      position: selection.position,
      slot_number: selection.slotNumber,
      created_at: new Date().toISOString()
    }
    updateCacheAfterPick(sessionId, newPickRow, nextPickNumber, nextRound, newStatus)

    if (isComplete) {
      clearCache(sessionId)
      invalidateSessionCache(sessionId)
    }

    const totalTime = Date.now() - startTime
    console.log(`[CPU Pick] Pick ${session.current_pick_number} completed in ${totalTime}ms (cache: ${cacheLoadTime}ms)`)

    return res.status(201).json({
      result: 'success',
      pick: {
        pickNumber: session.current_pick_number,
        round,
        pickInRound,
        teamId: currentTeam.id,
        playerSeasonId: selection.player.id,
        playerId: selection.player.player_id,
        position: selection.position,
        slotNumber: selection.slotNumber,
        playerName: selection.player.display_name || 'Unknown',
        year: selection.player.year,
        bats: selection.player.bats,
      },
      session: { currentPick: nextPickNumber, currentRound: nextRound, status: newStatus },
    })
  } catch (err) {
    console.error('[CPU API] Exception:', err)
    return res.status(500).json({ result: 'error', error: 'Internal server error' })
  }
})

/**
 * POST /api/draft/sessions/:sessionId/cpu-picks-batch
 * Process ALL consecutive CPU picks until human turn or draft completion
 * Returns all picks made in a single response - eliminates frontend round-trip latency
 */
router.post('/:sessionId/cpu-picks-batch', async (req: Request, res: Response) => {
  try {
    const batchStartTime = Date.now()
    const { sessionId } = req.params
    const { seasons, excludePlayerSeasonIds = [] } = req.body

    // Load session data from cache
    let sessionData = await getSessionData(sessionId)
    if (!sessionData) {
      return res.status(404).json({ result: 'error', error: `Session not found: ${sessionId}` })
    }

    if (sessionData.session.status !== 'in_progress') {
      return res.json({ result: 'error', error: `Draft is not in progress (status: ${sessionData.session.status})` })
    }

    // Load player pool once for all picks
    const yearList = seasons && seasons.length > 0 ? seasons : [sessionData.session.season_year || new Date().getFullYear()]
    let allPlayers: PlayerSeason[]
    try {
      allPlayers = await getOrLoadPlayerPool(sessionId, yearList)
    } catch (err) {
      console.error('[CPU Batch] Error loading player pool:', err)
      return res.status(500).json({ result: 'error', error: 'Failed to load player pool' })
    }

    if (allPlayers.length === 0) {
      return res.status(500).json({ result: 'error', error: 'No players available in pool' })
    }

    const excludeSet = new Set<string>(excludePlayerSeasonIds)
    const picks: Array<{
      pickNumber: number
      round: number
      pickInRound: number
      teamId: string
      playerSeasonId: string
      playerId: string
      position: PositionCode
      slotNumber: number
      playerName: string
      year: number
      bats?: 'L' | 'R' | 'B' | null
    }> = []

    let continueLoop = true
    let lastSession = sessionData.session
    const totalPicks = lastSession.num_teams * TOTAL_ROUNDS

    while (continueLoop) {
      // Refresh session data from cache (updated in-place after each pick)
      sessionData = await getSessionData(sessionId)
      if (!sessionData) break

      const { session, teams: teamsRows, picks: picksRows } = sessionData

      if (session.status !== 'in_progress' || session.current_pick_number > totalPicks) {
        continueLoop = false
        break
      }

      // Calculate current picking team (snake draft)
      const round = session.current_round
      const pickInRound = ((session.current_pick_number - 1) % session.num_teams) + 1
      const sortedTeams = round % 2 === 0
        ? [...teamsRows].sort((a, b) => b.draft_order - a.draft_order)
        : [...teamsRows].sort((a, b) => a.draft_order - b.draft_order)

      const currentTeamData = sortedTeams[pickInRound - 1]
      if (!currentTeamData) {
        continueLoop = false
        break
      }

      // Stop if it's a human's turn
      if (currentTeamData.control !== 'cpu') {
        continueLoop = false
        break
      }

      // Build team rosters
      const teams: DraftTeam[] = teamsRows.map((t: any) => ({
        id: t.id,
        name: t.team_name,
        control: t.control as TeamControl,
        draftPosition: t.draft_order,
        roster: createRosterSlots(),
        draftSessionId: sessionId,
      }))

      const draftedPlayerIds = new Set<string>()
      for (const pick of picksRows) {
        if (pick.player_id) draftedPlayerIds.add(pick.player_id)
        const team = teams.find(t => t.id === pick.draft_team_id)
        if (team && pick.player_season_id && pick.position && pick.slot_number) {
          const rosterSlot = team.roster.find(s => s.position === pick.position && s.slotNumber === pick.slot_number)
          if (rosterSlot) {
            rosterSlot.playerSeasonId = pick.player_season_id
            rosterSlot.isFilled = true
          }
        }
      }

      const currentTeam = teams.find(t => t.id === currentTeamData.id)
      if (!currentTeam) {
        continueLoop = false
        break
      }

      // Run CPU selection
      const selection = selectBestPlayer(allPlayers, currentTeam, draftedPlayerIds, excludeSet, round)
      if (!selection) {
        console.warn('[CPU Batch] Could not find player for pick', session.current_pick_number)
        continueLoop = false
        break
      }

      // Make the pick
      try {
        await pool.query(`
          INSERT INTO draft_picks (draft_session_id, draft_team_id, player_id, player_season_id, pick_number, round, pick_in_round, position, slot_number)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (draft_session_id, pick_number) DO UPDATE SET
            player_id = EXCLUDED.player_id, player_season_id = EXCLUDED.player_session_id,
            position = EXCLUDED.position, slot_number = EXCLUDED.slot_number
        `, [sessionId, currentTeam.id, selection.player.player_id, selection.player.id,
            session.current_pick_number, round, pickInRound, selection.position, selection.slotNumber])
      } catch (pickError: any) {
        console.error('[CPU Batch] Pick insert error:', pickError)
        // Add to exclude list and continue
        excludeSet.add(selection.player.id)
        continue
      }

      // Update session
      const nextPickNumber = session.current_pick_number + 1
      const isComplete = nextPickNumber > totalPicks
      const nextRound = isComplete ? round : Math.floor((nextPickNumber - 1) / session.num_teams) + 1
      const newStatus = isComplete ? 'completed' : session.status

      await pool.query(
        'UPDATE draft_sessions SET current_pick_number = $1, current_round = $2, status = $3, updated_at = NOW() WHERE id = $4',
        [nextPickNumber, nextRound, newStatus, sessionId]
      )

      // Update cache
      const newPickRow: DbPickRow = {
        pick_number: session.current_pick_number,
        draft_team_id: currentTeam.id,
        player_season_id: selection.player.id,
        player_id: selection.player.player_id,
        position: selection.position,
        slot_number: selection.slotNumber,
        created_at: new Date().toISOString()
      }
      updateCacheAfterPick(sessionId, newPickRow, nextPickNumber, nextRound, newStatus)

      // Record the pick
      picks.push({
        pickNumber: session.current_pick_number,
        round,
        pickInRound,
        teamId: currentTeam.id,
        playerSeasonId: selection.player.id,
        playerId: selection.player.player_id,
        position: selection.position,
        slotNumber: selection.slotNumber,
        playerName: selection.player.display_name || 'Unknown',
        year: selection.player.year,
        bats: selection.player.bats,
      })

      lastSession = { ...session, current_pick_number: nextPickNumber, current_round: nextRound, status: newStatus }

      if (isComplete) {
        clearCache(sessionId)
        invalidateSessionCache(sessionId)
        continueLoop = false
      }
    }

    const batchTime = Date.now() - batchStartTime
    console.log(`[CPU Batch] Completed ${picks.length} picks in ${batchTime}ms (${picks.length > 0 ? Math.round(batchTime / picks.length) : 0}ms/pick)`)

    return res.status(201).json({
      result: 'success',
      picks,
      picksCount: picks.length,
      session: {
        currentPick: lastSession.current_pick_number,
        currentRound: lastSession.current_round,
        status: lastSession.status
      }
    })
  } catch (err) {
    console.error('[CPU Batch] Exception:', err)
    return res.status(500).json({ result: 'error', error: 'Internal server error' })
  }
})

export default router

export {
  selectBestPlayer,
  meetsPlayingTimeRequirements,
  playerQualifiesForPosition,
  getUnfilledPositions,
  ROSTER_REQUIREMENTS,
  POSITION_ELIGIBILITY,
}
export type { PlayerSeason, DraftTeam, RosterSlot, PositionCode }
