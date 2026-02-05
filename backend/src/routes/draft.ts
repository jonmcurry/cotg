/**
 * Draft Sessions API Routes
 * CRUD operations for draft session management
 */

import { Router, Request, Response } from 'express'
import { pool } from '../lib/db'
import { clearCache } from '../lib/playerPoolCache'

const router = Router()

// Types matching frontend draft.types.ts
type TeamControl = 'human' | 'cpu'
type DraftStatus = 'setup' | 'in_progress' | 'paused' | 'completed' | 'abandoned' | 'clubhouse'
type PositionCode = 'C' | '1B' | '2B' | 'SS' | '3B' | 'OF' | 'SP' | 'RP' | 'CL' | 'DH' | 'BN'

const ROSTER_REQUIREMENTS: Record<PositionCode, number> = {
  'C': 1, '1B': 1, '2B': 1, 'SS': 1, '3B': 1,
  'OF': 3, 'SP': 4, 'RP': 3, 'CL': 1, 'DH': 1, 'BN': 4,
}
const TOTAL_ROUNDS = 21

interface DraftConfig {
  numTeams: number
  teams: Array<{ name: string; control: TeamControl }>
  selectedSeasons: number[]
  randomizeDraftOrder: boolean
}

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

interface DraftPick {
  pickNumber: number
  round: number
  pickInRound: number
  teamId: string
  playerSeasonId: string | null
  playerId: string | null
  pickTime: string | null
  position?: PositionCode | null
  slotNumber?: number | null
}

interface DraftSession {
  id: string
  name: string
  status: DraftStatus
  numTeams: number
  currentPick: number
  currentRound: number
  teams: DraftTeam[]
  picks: DraftPick[]
  selectedSeasons: number[]
  createdAt: string
  updatedAt: string
}

// Database row types
interface DbSessionRow {
  id: string
  session_name: string
  status: DraftStatus
  num_teams: number
  current_pick_number: number
  current_round: number
  selected_seasons: number[]
  created_at: string
  updated_at: string
}

interface DbTeamRow {
  id: string
  team_name: string
  control: string
  draft_order: number
}

interface DbPickRow {
  pick_number: number
  draft_team_id: string
  player_season_id: string | null
  player_id: string | null
  position: string | null
  slot_number: number | null
  created_at: string
}

// Helper: Create roster slots for a team
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

// Helper: Generate snake draft pick order
function generatePickOrder(
  teams: DraftTeam[],
  numTeams: number
): DraftPick[] {
  const picks: DraftPick[] = []

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const sortedTeams = [...teams].sort((a, b) => a.draftPosition - b.draftPosition)
    const pickOrder = round % 2 === 0 ? sortedTeams.reverse() : sortedTeams

    pickOrder.forEach((team, pickInRound) => {
      picks.push({
        pickNumber: (round - 1) * numTeams + pickInRound + 1,
        round,
        pickInRound: pickInRound + 1,
        teamId: team.id,
        playerSeasonId: null,
        playerId: null,
        pickTime: null,
      })
    })
  }

  return picks
}

/**
 * GET /api/draft/sessions
 * List all draft sessions
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM draft_sessions
      ORDER BY updated_at DESC
    `)

    // Transform to API format
    const sessions = result.rows.map((row: DbSessionRow) => ({
      id: row.id,
      name: row.session_name,
      status: row.status,
      numTeams: row.num_teams,
      currentPick: row.current_pick_number,
      currentRound: row.current_round,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return res.json(sessions)
  } catch (err) {
    console.error('[Draft API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/draft/sessions/:id
 * Get a single session with teams and picks
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Load session
    const sessionResult = await pool.query(
      'SELECT * FROM draft_sessions WHERE id = $1',
      [id]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: `Session not found: ${id}` })
    }

    const sessionData = sessionResult.rows[0]

    // Load teams
    const teamsResult = await pool.query(
      'SELECT * FROM draft_teams WHERE draft_session_id = $1 ORDER BY draft_order',
      [id]
    )

    // Load picks
    const picksResult = await pool.query(
      'SELECT * FROM draft_picks WHERE draft_session_id = $1 ORDER BY pick_number',
      [id]
    )

    // Transform teams
    const teams: DraftTeam[] = teamsResult.rows.map((row: DbTeamRow) => ({
      id: row.id,
      name: row.team_name,
      control: (row.control || 'cpu') as TeamControl,
      draftPosition: row.draft_order,
      roster: createRosterSlots(), // Start with empty roster
      draftSessionId: id,
    }))

    // Fill roster from picks
    const picksMap = new Map<string, DbPickRow[]>()
    picksResult.rows.forEach((pick: DbPickRow) => {
      if (pick.player_season_id) {
        const teamPicks = picksMap.get(pick.draft_team_id) || []
        teamPicks.push(pick)
        picksMap.set(pick.draft_team_id, teamPicks)
      }
    })

    // Note: Roster slot assignments would need additional data from the frontend
    // For now, we return teams with empty rosters - the frontend reconstructs from picks

    // Transform picks to API format
    const picks: DraftPick[] = teams.length > 0
      ? generatePickOrder(teams, sessionData.num_teams)
      : []

    // Overlay completed picks from database
    picksResult.rows.forEach((dbPick: DbPickRow) => {
      const pickIndex = picks.findIndex(p => p.pickNumber === dbPick.pick_number)
      if (pickIndex !== -1 && dbPick.player_season_id) {
        picks[pickIndex] = {
          ...picks[pickIndex],
          playerSeasonId: dbPick.player_season_id,
          playerId: dbPick.player_id,
          pickTime: dbPick.created_at,
          position: dbPick.position as PositionCode || null,
          slotNumber: dbPick.slot_number || null,
        }
      }
    })

    const session: DraftSession = {
      id: sessionData.id,
      name: sessionData.session_name,
      status: sessionData.status,
      numTeams: sessionData.num_teams,
      currentPick: sessionData.current_pick_number,
      currentRound: sessionData.current_round,
      teams,
      picks,
      selectedSeasons: sessionData.selected_seasons || [], // FIXED Issue #13: Return persisted selectedSeasons
      createdAt: sessionData.created_at,
      updatedAt: sessionData.updated_at,
    }

    return res.json(session)
  } catch (err) {
    console.error('[Draft API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/draft/sessions
 * Create a new draft session
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const config: DraftConfig = req.body

    // Validate
    if (!config.numTeams || !config.teams || config.teams.length !== config.numTeams) {
      return res.status(400).json({ error: 'Invalid config: numTeams must match teams array length' })
    }

    // Create teams with draft positions
    const teamPositions = config.randomizeDraftOrder
      ? shuffle(Array.from({ length: config.numTeams }, (_, i) => i + 1))
      : Array.from({ length: config.numTeams }, (_, i) => i + 1)

    // Create session in database
    const sessionResult = await pool.query(`
      INSERT INTO draft_sessions (
        session_name, season_year, selected_seasons, num_teams, num_rounds,
        draft_type, current_pick_number, current_round, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      `Draft ${new Date().toLocaleDateString()}`,
      config.selectedSeasons?.[0] || new Date().getFullYear(),
      config.selectedSeasons || [],
      config.numTeams,
      TOTAL_ROUNDS,
      'snake',
      1,
      1,
      'setup'
    ])

    const newSession = sessionResult.rows[0]

    // Create teams in database
    const teamInserts = config.teams.map((team, index) => [
      newSession.id,
      team.name,
      team.control,
      teamPositions[index]
    ])

    const teamsResult = await pool.query(`
      INSERT INTO draft_teams (draft_session_id, team_name, control, draft_order)
      SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::text[], $4::int[])
      RETURNING *
    `, [
      teamInserts.map(t => t[0]),
      teamInserts.map(t => t[1]),
      teamInserts.map(t => t[2]),
      teamInserts.map(t => t[3])
    ])

    // Build response
    const teams: DraftTeam[] = teamsResult.rows.map((row: DbTeamRow) => ({
      id: row.id,
      name: row.team_name,
      control: row.control as TeamControl,
      draftPosition: row.draft_order,
      roster: createRosterSlots(),
      draftSessionId: newSession.id,
    }))

    const picks = generatePickOrder(teams, config.numTeams)

    const session: DraftSession = {
      id: newSession.id,
      name: newSession.session_name,
      status: newSession.status,
      numTeams: config.numTeams,
      currentPick: 1,
      currentRound: 1,
      teams,
      picks,
      selectedSeasons: config.selectedSeasons || [],
      createdAt: newSession.created_at,
      updatedAt: newSession.updated_at,
    }

    return res.status(201).json(session)
  } catch (err) {
    console.error('[Draft API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /api/draft/sessions/:id
 * Update session (status, currentPick, etc.)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`)
      values.push(updates.status)
    }
    if (updates.currentPick !== undefined) {
      setClauses.push(`current_pick_number = $${paramIndex++}`)
      values.push(updates.currentPick)
    }
    if (updates.currentRound !== undefined) {
      setClauses.push(`current_round = $${paramIndex++}`)
      values.push(updates.currentRound)
    }
    if (updates.selectedSeasons !== undefined) {
      setClauses.push(`selected_seasons = $${paramIndex++}`)
      values.push(updates.selectedSeasons)
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    values.push(id)
    const result = await pool.query(`
      UPDATE draft_sessions
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Session not found: ${id}` })
    }

    const data = result.rows[0]

    // Clear player pool cache when draft finishes or is abandoned
    if (data.status === 'completed' || data.status === 'abandoned') {
      clearCache(id)
    }

    return res.json({
      id: data.id,
      name: data.session_name,
      status: data.status,
      numTeams: data.num_teams,
      currentPick: data.current_pick_number,
      currentRound: data.current_round,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
  } catch (err) {
    console.error('[Draft API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/draft/sessions/:id
 * Delete a session and all related data
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Delete picks first (foreign key constraint)
    await pool.query('DELETE FROM draft_picks WHERE draft_session_id = $1', [id])

    // Delete teams
    await pool.query('DELETE FROM draft_teams WHERE draft_session_id = $1', [id])

    // Delete session
    await pool.query('DELETE FROM draft_sessions WHERE id = $1', [id])

    // Clear player pool cache for this session
    clearCache(id)

    return res.status(204).send()
  } catch (err) {
    console.error('[Draft API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper: Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export default router
