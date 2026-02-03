/**
 * Leagues API Routes
 * CRUD operations for league management
 */

import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// Types matching frontend league.types.ts
type LeagueStatus = 'draft' | 'in_season' | 'playoffs' | 'completed'
type PlayoffFormat = 'none' | 'wild_card' | 'division' | 'expanded'

interface LeagueConfig {
  name: string
  description?: string
  numTeams: number
  gamesPerSeason: number
  playoffFormat: PlayoffFormat
  useApbaRules: boolean
  injuryEnabled: boolean
  weatherEffects: boolean
  seasonYear: number
}

interface League {
  id: string
  name: string
  description: string | null
  seasonYear: number
  numTeams: number
  gamesPerSeason: number
  playoffFormat: PlayoffFormat
  useApbaRules: boolean
  injuryEnabled: boolean
  weatherEffects: boolean
  status: LeagueStatus
  currentGameDate: string | null
  draftSessionId: string | null
  createdAt: string
  updatedAt: string
}

// Transform DB row to API response format (camelCase)
function transformLeagueRow(row: Record<string, unknown>): League {
  return {
    id: row.id as string,
    name: row.league_name as string,
    description: (row.league_description as string) || null,
    seasonYear: row.season_year as number,
    numTeams: row.num_teams as number,
    gamesPerSeason: row.games_per_season as number,
    playoffFormat: (row.playoff_format as PlayoffFormat) || 'none',
    useApbaRules: (row.use_apba_rules as boolean) ?? true,
    injuryEnabled: (row.injury_enabled as boolean) ?? false,
    weatherEffects: (row.weather_effects as boolean) ?? false,
    status: row.status as LeagueStatus,
    currentGameDate: (row.current_game_date as string) || null,
    draftSessionId: (row.draft_session_id as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * GET /api/leagues
 * List all leagues, ordered by most recently updated
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Leagues API] Error listing leagues:', error)
      return res.status(500).json({ error: `Failed to list leagues: ${error.message}` })
    }

    const leagues = (data || []).map(transformLeagueRow)
    return res.json(leagues)
  } catch (err) {
    console.error('[Leagues API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/leagues/:id
 * Get a single league by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: `League not found: ${id}` })
      }
      console.error('[Leagues API] Error getting league:', error)
      return res.status(500).json({ error: `Failed to get league: ${error.message}` })
    }

    return res.json(transformLeagueRow(data))
  } catch (err) {
    console.error('[Leagues API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/leagues
 * Create a new league
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const config: LeagueConfig = req.body

    // Validate required fields
    if (!config.name || !config.numTeams || !config.gamesPerSeason || !config.seasonYear) {
      return res.status(400).json({
        error: 'Missing required fields: name, numTeams, gamesPerSeason, seasonYear'
      })
    }

    const { data, error } = await supabase
      .from('leagues')
      .insert({
        league_name: config.name,
        league_description: config.description || null,
        season_year: config.seasonYear,
        num_teams: config.numTeams,
        games_per_season: config.gamesPerSeason,
        playoff_format: config.playoffFormat || 'none',
        use_apba_rules: config.useApbaRules ?? true,
        injury_enabled: config.injuryEnabled ?? false,
        weather_effects: config.weatherEffects ?? false,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('[Leagues API] Error creating league:', error)
      return res.status(500).json({ error: `Failed to create league: ${error.message}` })
    }

    console.log('[Leagues API] Created league:', data.id, config.name)
    return res.status(201).json(transformLeagueRow(data))
  } catch (err) {
    console.error('[Leagues API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /api/leagues/:id
 * Update a league (status, draft session link, etc.)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Build update object with snake_case keys
    const dbUpdates: Record<string, unknown> = {}

    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.draftSessionId !== undefined) dbUpdates.draft_session_id = updates.draftSessionId
    if (updates.currentGameDate !== undefined) dbUpdates.current_game_date = updates.currentGameDate
    if (updates.name !== undefined) dbUpdates.league_name = updates.name
    if (updates.description !== undefined) dbUpdates.league_description = updates.description

    if (Object.keys(dbUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const { data, error } = await supabase
      .from('leagues')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: `League not found: ${id}` })
      }
      console.error('[Leagues API] Error updating league:', error)
      return res.status(500).json({ error: `Failed to update league: ${error.message}` })
    }

    console.log('[Leagues API] Updated league:', id, Object.keys(dbUpdates))
    return res.json(transformLeagueRow(data))
  } catch (err) {
    console.error('[Leagues API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/leagues/:id
 * Delete a league
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('leagues')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Leagues API] Error deleting league:', error)
      return res.status(500).json({ error: `Failed to delete league: ${error.message}` })
    }

    console.log('[Leagues API] Deleted league:', id)
    return res.status(204).send()
  } catch (err) {
    console.error('[Leagues API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
