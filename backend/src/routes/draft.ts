/**
 * Draft Sessions API Routes
 * CRUD operations for draft session management
 */

import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

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
    const { data, error } = await supabase
      .from('draft_sessions')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Draft API] Error listing sessions:', error)
      return res.status(500).json({ error: `Failed to list sessions: ${error.message}` })
    }

    // Transform to API format
    const sessions = (data || []).map(row => ({
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
    const { data: sessionData, error: sessionError } = await supabase
      .from('draft_sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return res.status(404).json({ error: `Session not found: ${id}` })
      }
      console.error('[Draft API] Error getting session:', sessionError)
      return res.status(500).json({ error: `Failed to get session: ${sessionError.message}` })
    }

    // Load teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('draft_teams')
      .select('*')
      .eq('draft_session_id', id)
      .order('draft_order')

    if (teamsError) {
      console.error('[Draft API] Error loading teams:', teamsError)
      return res.status(500).json({ error: `Failed to load teams: ${teamsError.message}` })
    }

    // Load picks
    const { data: picksData, error: picksError } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('draft_session_id', id)
      .order('pick_number')

    if (picksError) {
      console.error('[Draft API] Error loading picks:', picksError)
      return res.status(500).json({ error: `Failed to load picks: ${picksError.message}` })
    }

    // Transform teams
    const teams: DraftTeam[] = (teamsData || []).map(row => ({
      id: row.id,
      name: row.team_name,
      control: (row.control || 'cpu') as TeamControl,
      draftPosition: row.draft_order,
      roster: createRosterSlots(), // Start with empty roster
      draftSessionId: id,
    }))

    // Fill roster from picks
    const picksMap = new Map<string, typeof picksData[0][]>()
    ;(picksData || []).forEach(pick => {
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
    ;(picksData || []).forEach(dbPick => {
      const pickIndex = picks.findIndex(p => p.pickNumber === dbPick.pick_number)
      if (pickIndex !== -1 && dbPick.player_season_id) {
        picks[pickIndex] = {
          ...picks[pickIndex],
          playerSeasonId: dbPick.player_season_id,
          playerId: dbPick.player_id,
          pickTime: dbPick.created_at,
          position: dbPick.position || null,
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
      selectedSeasons: [], // Not stored in DB currently
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
    const { data: newSession, error: sessionError } = await supabase
      .from('draft_sessions')
      .insert({
        session_name: `Draft ${new Date().toLocaleDateString()}`,
        season_year: config.selectedSeasons?.[0] || new Date().getFullYear(),
        num_teams: config.numTeams,
        num_rounds: TOTAL_ROUNDS,
        draft_type: 'snake',
        current_pick_number: 1,
        current_round: 1,
        status: 'setup',
      })
      .select()
      .single()

    if (sessionError || !newSession) {
      console.error('[Draft API] Error creating session:', sessionError)
      return res.status(500).json({ error: `Failed to create session: ${sessionError?.message}` })
    }

    // Create teams in database
    const teamsToInsert = config.teams.map((team, index) => ({
      draft_session_id: newSession.id,
      team_name: team.name,
      control: team.control,
      draft_order: teamPositions[index],
    }))

    const { data: newTeams, error: teamsError } = await supabase
      .from('draft_teams')
      .insert(teamsToInsert)
      .select()

    if (teamsError || !newTeams) {
      console.error('[Draft API] Error creating teams:', teamsError)
      // Rollback session
      await supabase.from('draft_sessions').delete().eq('id', newSession.id)
      return res.status(500).json({ error: `Failed to create teams: ${teamsError?.message}` })
    }

    // Build response
    const teams: DraftTeam[] = newTeams.map((row, index) => ({
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

    console.log('[Draft API] Created session:', session.id, 'with', teams.length, 'teams')
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

    const dbUpdates: Record<string, unknown> = {}
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.currentPick !== undefined) dbUpdates.current_pick_number = updates.currentPick
    if (updates.currentRound !== undefined) dbUpdates.current_round = updates.currentRound

    if (Object.keys(dbUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const { data, error } = await supabase
      .from('draft_sessions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: `Session not found: ${id}` })
      }
      console.error('[Draft API] Error updating session:', error)
      return res.status(500).json({ error: `Failed to update session: ${error.message}` })
    }

    console.log('[Draft API] Updated session:', id, Object.keys(dbUpdates))
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
    await supabase.from('draft_picks').delete().eq('draft_session_id', id)

    // Delete teams
    await supabase.from('draft_teams').delete().eq('draft_session_id', id)

    // Delete session
    const { error } = await supabase.from('draft_sessions').delete().eq('id', id)

    if (error) {
      console.error('[Draft API] Error deleting session:', error)
      return res.status(500).json({ error: `Failed to delete session: ${error.message}` })
    }

    console.log('[Draft API] Deleted session:', id)
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
