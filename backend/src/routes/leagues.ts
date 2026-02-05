/**
 * Leagues API Routes
 * CRUD operations for league management
 */

import { Router, Request, Response } from 'express'
import { pool } from '../lib/db'

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
    const result = await pool.query('SELECT * FROM leagues ORDER BY updated_at DESC')
    const leagues = result.rows.map(transformLeagueRow)
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
    const result = await pool.query('SELECT * FROM leagues WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `League not found: ${id}` })
    }

    return res.json(transformLeagueRow(result.rows[0]))
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

    const result = await pool.query(`
      INSERT INTO leagues (
        league_name, league_description, season_year, num_teams, games_per_season,
        playoff_format, use_apba_rules, injury_enabled, weather_effects, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      config.name,
      config.description || null,
      config.seasonYear,
      config.numTeams,
      config.gamesPerSeason,
      config.playoffFormat || 'none',
      config.useApbaRules ?? true,
      config.injuryEnabled ?? false,
      config.weatherEffects ?? false,
      'draft'
    ])

    return res.status(201).json(transformLeagueRow(result.rows[0]))
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

    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`)
      values.push(updates.status)
    }
    if (updates.draftSessionId !== undefined) {
      setClauses.push(`draft_session_id = $${paramIndex++}`)
      values.push(updates.draftSessionId)
    }
    if (updates.currentGameDate !== undefined) {
      setClauses.push(`current_game_date = $${paramIndex++}`)
      values.push(updates.currentGameDate)
    }
    if (updates.name !== undefined) {
      setClauses.push(`league_name = $${paramIndex++}`)
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      setClauses.push(`league_description = $${paramIndex++}`)
      values.push(updates.description)
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    values.push(id)
    const result = await pool.query(`
      UPDATE leagues
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `League not found: ${id}` })
    }

    return res.json(transformLeagueRow(result.rows[0]))
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
    await pool.query('DELETE FROM leagues WHERE id = $1', [id])
    return res.status(204).send()
  } catch (err) {
    console.error('[Leagues API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
