/**
 * Draft Picks API Routes
 * Operations for making and retrieving draft picks
 */

import { Router, Request, Response } from 'express'
import { pool } from '../lib/db'

const router = Router()

const TOTAL_ROUNDS = 21

type PositionCode = 'C' | '1B' | '2B' | 'SS' | '3B' | 'OF' | 'SP' | 'RP' | 'CL' | 'DH' | 'BN'

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

    const result = await pool.query(
      'SELECT * FROM draft_picks WHERE draft_session_id = $1 ORDER BY pick_number',
      [sessionId]
    )

    const picks: DraftPick[] = result.rows.map(row => ({
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
 */
router.post('/:sessionId/picks', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { playerSeasonId, playerId, position, slotNumber }: MakePickRequest = req.body

    // Validate playerSeasonId
    if (!playerSeasonId || typeof playerSeasonId !== 'string' || playerSeasonId.trim().length === 0) {
      return res.status(400).json({
        result: 'error',
        error: `playerSeasonId is required and must be a non-empty string`
      })
    }

    // Validate position
    const VALID_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'OF', 'LF', 'CF', 'RF', 'SP', 'RP', 'CL', 'DH', 'BN']
    if (!position || !VALID_POSITIONS.includes(position)) {
      return res.status(400).json({
        result: 'error',
        error: `Invalid position "${position}". Must be one of: ${VALID_POSITIONS.join(', ')}`
      })
    }

    // Validate slotNumber
    if (slotNumber === null || slotNumber === undefined || typeof slotNumber !== 'number' || slotNumber < 1) {
      return res.status(400).json({
        result: 'error',
        error: `slotNumber must be a positive integer >= 1`
      })
    }

    // Load session
    const sessionResult = await pool.query('SELECT * FROM draft_sessions WHERE id = $1', [sessionId])
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: `Session not found: ${sessionId}` })
    }
    const session = sessionResult.rows[0]

    // Load teams
    const teamsResult = await pool.query(
      'SELECT * FROM draft_teams WHERE draft_session_id = $1 ORDER BY draft_order',
      [sessionId]
    )
    if (teamsResult.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to load teams' })
    }

    // Calculate current picking team (snake draft)
    const round = session.current_round
    const pickInRound = ((session.current_pick_number - 1) % session.num_teams) + 1
    const sortedTeams = round % 2 === 0
      ? [...teamsResult.rows].sort((a, b) => b.draft_order - a.draft_order)
      : [...teamsResult.rows].sort((a, b) => a.draft_order - b.draft_order)

    const currentTeam = sortedTeams[pickInRound - 1]
    if (!currentTeam) {
      return res.status(500).json({ error: 'Could not determine current picking team' })
    }

    // Resolve playerId if not provided
    let resolvedPlayerId = playerId
    if (!resolvedPlayerId) {
      const playerResult = await pool.query(
        'SELECT player_id FROM player_seasons WHERE id = $1',
        [playerSeasonId]
      )
      if (playerResult.rows.length === 0) {
        return res.status(500).json({ error: 'Failed to resolve player ID' })
      }
      resolvedPlayerId = playerResult.rows[0].player_id
    }

    // Validate position eligibility
    const positionResult = await pool.query(
      'SELECT primary_position FROM player_seasons WHERE id = $1',
      [playerSeasonId]
    )
    if (positionResult.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to validate position eligibility' })
    }

    const playerPosition = positionResult.rows[0].primary_position
    const eligiblePositions = POSITION_ELIGIBILITY[position as PositionCode]

    if (!eligiblePositions.includes(playerPosition)) {
      return res.status(400).json({
        result: 'error',
        error: `Player position "${playerPosition}" is not eligible for roster slot "${position}"`,
      })
    }

    // Upsert the pick
    try {
      await pool.query(`
        INSERT INTO draft_picks (draft_session_id, draft_team_id, player_id, player_season_id, pick_number, round, pick_in_round, position, slot_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (draft_session_id, pick_number) DO UPDATE SET
          player_id = EXCLUDED.player_id, player_season_id = EXCLUDED.player_season_id,
          position = EXCLUDED.position, slot_number = EXCLUDED.slot_number
      `, [sessionId, currentTeam.id, resolvedPlayerId, playerSeasonId, session.current_pick_number, round, pickInRound, position, slotNumber])
    } catch (pickError: any) {
      if (pickError.code === '23505' && pickError.message?.includes('player_season_id')) {
        return res.status(409).json({
          result: 'duplicate',
          error: 'Player already drafted in this session',
          playerSeasonId,
        })
      }
      return res.status(500).json({ result: 'error', error: pickError.message })
    }

    // Calculate next pick
    const totalPicks = session.num_teams * TOTAL_ROUNDS
    const nextPickNumber = session.current_pick_number + 1
    const isComplete = nextPickNumber > totalPicks
    const nextRound = isComplete ? round : Math.floor((nextPickNumber - 1) / session.num_teams) + 1
    const newStatus = isComplete ? 'completed' : session.status

    // Update session
    const updateResult = await pool.query(
      'UPDATE draft_sessions SET current_pick_number = $1, current_round = $2, status = $3, updated_at = NOW() WHERE id = $4',
      [nextPickNumber, nextRound, newStatus, sessionId]
    )

    if (updateResult.rowCount === 0) {
      return res.status(500).json({
        result: 'error',
        error: 'Pick was saved but draft status could not be updated.',
      })
    }

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
