/**
 * Draft Picks API Routes
 * Operations for making and retrieving draft picks
 */

import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// FIXED Issue #15: Use constant instead of magic number
const TOTAL_ROUNDS = 21

type PositionCode = 'C' | '1B' | '2B' | 'SS' | '3B' | 'OF' | 'SP' | 'RP' | 'CL' | 'DH' | 'BN'

// FIXED Issue #10: Position eligibility mapping (matches database primary_position to roster slots)
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

interface MakePickRequest {
  playerSeasonId: string
  playerId?: string
  position: PositionCode
  slotNumber: number
  bats?: 'L' | 'R' | 'B' | null
}

interface DraftPick {
  pickNumber: number
  round: number
  pickInRound: number
  teamId: string
  playerSeasonId: string | null
  playerId: string | null
  pickTime: string | null
  position: PositionCode | null
  slotNumber: number | null
}

/**
 * GET /api/draft/sessions/:sessionId/picks
 * Get all picks for a session
 */
router.get('/:sessionId/picks', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    const { data, error } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('draft_session_id', sessionId)
      .order('pick_number')

    if (error) {
      console.error('[Picks API] Error loading picks:', error)
      return res.status(500).json({ error: `Failed to load picks: ${error.message}` })
    }

    const picks: DraftPick[] = (data || []).map(row => ({
      pickNumber: row.pick_number,
      round: row.round,
      pickInRound: row.pick_in_round,
      teamId: row.draft_team_id,
      playerSeasonId: row.player_season_id,
      playerId: row.player_id,
      pickTime: row.created_at,
      position: row.position || null,
      slotNumber: row.slot_number || null,
    }))

    return res.json(picks)
  } catch (err) {
    console.error('[Picks API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/draft/sessions/:sessionId/picks
 * Make a draft pick
 *
 * This is the core pick operation:
 * 1. Validates the session and current pick
 * 2. Resolves playerId if not provided
 * 3. Upserts the pick to handle idempotency
 * 4. Advances the pick counter
 *
 * Returns: { result: 'success' | 'duplicate' | 'error', pick?, session? }
 */
router.post('/:sessionId/picks', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { playerSeasonId, playerId, position, slotNumber, bats }: MakePickRequest = req.body

    // FIXED Issue #4: Comprehensive input validation
    // Validate playerSeasonId
    if (!playerSeasonId || typeof playerSeasonId !== 'string' || playerSeasonId.trim().length === 0) {
      return res.status(400).json({
        result: 'error',
        error: `playerSeasonId is required and must be a non-empty string (got: ${JSON.stringify(playerSeasonId)})`
      })
    }

    // Validate position
    const VALID_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'OF', 'LF', 'CF', 'RF', 'SP', 'RP', 'CL', 'DH', 'BN']
    if (!position || typeof position !== 'string' || position.trim().length === 0) {
      return res.status(400).json({
        result: 'error',
        error: `position is required and must be a non-empty string (got: ${JSON.stringify(position)})`
      })
    }
    if (!VALID_POSITIONS.includes(position)) {
      return res.status(400).json({
        result: 'error',
        error: `Invalid position "${position}". Must be one of: ${VALID_POSITIONS.join(', ')}`
      })
    }

    // Validate slotNumber
    if (slotNumber === null || slotNumber === undefined || typeof slotNumber !== 'number') {
      return res.status(400).json({
        result: 'error',
        error: `slotNumber is required and must be a number (got: ${JSON.stringify(slotNumber)})`
      })
    }
    if (slotNumber < 1 || !Number.isInteger(slotNumber)) {
      return res.status(400).json({
        result: 'error',
        error: `slotNumber must be a positive integer >= 1 (got: ${slotNumber})`
      })
    }

    // Load session to get current pick info
    const { data: session, error: sessionError } = await supabase
      .from('draft_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return res.status(404).json({ error: `Session not found: ${sessionId}` })
    }

    // Load teams to find current picking team
    const { data: teams, error: teamsError } = await supabase
      .from('draft_teams')
      .select('*')
      .eq('draft_session_id', sessionId)
      .order('draft_order')

    if (teamsError || !teams || teams.length === 0) {
      return res.status(500).json({ error: 'Failed to load teams' })
    }

    // Calculate current picking team (snake draft)
    const round = session.current_round
    const pickInRound = ((session.current_pick_number - 1) % session.num_teams) + 1
    const sortedTeams = round % 2 === 0
      ? [...teams].sort((a, b) => b.draft_order - a.draft_order)
      : [...teams].sort((a, b) => a.draft_order - b.draft_order)

    const currentTeam = sortedTeams[pickInRound - 1]
    if (!currentTeam) {
      return res.status(500).json({ error: 'Could not determine current picking team' })
    }

    // Resolve playerId if not provided
    let resolvedPlayerId = playerId
    if (!resolvedPlayerId) {
      const { data: playerSeason, error: fetchError } = await supabase
        .from('player_seasons')
        .select('player_id')
        .eq('id', playerSeasonId)
        .single()

      if (fetchError || !playerSeason) {
        console.error('[Picks API] Error fetching player_id:', fetchError)
        return res.status(500).json({ error: 'Failed to resolve player ID' })
      }

      resolvedPlayerId = playerSeason.player_id
    }

    // FIXED Issue #10: Validate position eligibility
    const { data: playerSeasonData, error: positionError } = await supabase
      .from('player_seasons')
      .select('primary_position, games_by_position')
      .eq('id', playerSeasonId)
      .single()

    if (positionError || !playerSeasonData) {
      console.error('[Picks API] Error fetching player position:', positionError)
      return res.status(500).json({ error: 'Failed to validate position eligibility' })
    }

    // Check if player's primary_position is eligible for the requested position
    const eligiblePositions = POSITION_ELIGIBILITY[position as PositionCode]
    const playerPosition = playerSeasonData.primary_position

    if (!eligiblePositions.includes(playerPosition)) {
      console.warn('[Picks API] INVALID POSITION:', {
        playerSeasonId,
        playerPosition,
        requestedPosition: position,
        eligiblePositions,
      })
      return res.status(400).json({
        result: 'error',
        error: `Player position "${playerPosition}" is not eligible for roster slot "${position}". Eligible positions: ${eligiblePositions.join(', ')}`,
      })
    }

    // Upsert the pick (idempotent - handles duplicate submissions)
    const { error: pickError } = await supabase
      .from('draft_picks')
      .upsert({
        draft_session_id: sessionId,
        draft_team_id: currentTeam.id,
        player_id: resolvedPlayerId,
        player_season_id: playerSeasonId,
        pick_number: session.current_pick_number,
        round: round,
        pick_in_round: pickInRound,
        position: position,
        slot_number: slotNumber,
      }, {
        onConflict: 'draft_session_id,pick_number',
      })

    if (pickError) {
      // Check for duplicate player constraint
      if (pickError.code === '23505' && pickError.message?.includes('player_season_id')) {
        console.warn('[Picks API] DUPLICATE PLAYER:', playerSeasonId)
        return res.status(409).json({
          result: 'duplicate',
          error: 'Player already drafted in this session',
          playerSeasonId,
        })
      }

      console.error('[Picks API] Error saving pick:', pickError)
      return res.status(500).json({ result: 'error', error: pickError.message })
    }

    // Calculate next pick
    const totalPicks = session.num_teams * TOTAL_ROUNDS
    const nextPickNumber = session.current_pick_number + 1
    const isComplete = nextPickNumber > totalPicks
    const nextRound = isComplete ? round : Math.floor((nextPickNumber - 1) / session.num_teams) + 1
    const newStatus = isComplete ? 'completed' : session.status

    // Update session with new pick number
    const { error: updateError } = await supabase
      .from('draft_sessions')
      .update({
        current_pick_number: nextPickNumber,
        current_round: nextRound,
        status: newStatus,
      })
      .eq('id', sessionId)

    // FIXED Issue #7: Return error if session update fails after pick saved
    // This prevents database inconsistency where pick exists but counter didn't advance
    if (updateError) {
      console.error('[Picks API] CRITICAL: Pick saved but session update failed!', {
        sessionId,
        pickNumber: session.current_pick_number,
        updateError,
      })
      return res.status(500).json({
        result: 'error',
        error: 'Pick was saved but draft status could not be updated. Please refresh and verify state.',
      })
    }

    // console.log('[Picks API] Pick made:', {
      session: sessionId,
      pick: session.current_pick_number,
      team: currentTeam.team_name,
      player: playerSeasonId,
    })

    return res.status(201).json({
      result: 'success',
      pick: {
        pickNumber: session.current_pick_number,
        round,
        pickInRound,
        teamId: currentTeam.id,
        playerSeasonId,
        playerId: resolvedPlayerId,
        position,
        slotNumber,
      },
      session: {
        currentPick: nextPickNumber,
        currentRound: nextRound,
        status: newStatus,
      },
    })
  } catch (err) {
    console.error('[Picks API] Exception:', err)
    return res.status(500).json({ result: 'error', error: 'Internal server error' })
  }
})

export default router
