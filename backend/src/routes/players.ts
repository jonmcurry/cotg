/**
 * Players API Routes
 * Player pool and batch retrieval for draft and clubhouse
 */

import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// Common select fields for player_seasons
const PLAYER_SEASON_SELECT = `
  id,
  player_id,
  year,
  team_id,
  primary_position,
  apba_rating,
  war,
  at_bats,
  batting_avg,
  hits,
  home_runs,
  rbi,
  stolen_bases,
  on_base_pct,
  slugging_pct,
  innings_pitched_outs,
  wins,
  losses,
  era,
  strikeouts_pitched,
  saves,
  shutouts,
  whip,
  players!inner (
    id,
    display_name,
    first_name,
    last_name,
    bats
  )
`

/**
 * GET /api/players/pool
 * Get player pool for drafting
 *
 * Query params:
 * - seasons: comma-separated years (e.g., "2023,2024")
 * - limit: max players to return (default 1000)
 * - offset: pagination offset (default 0)
 * - countOnly: if "true", only return count (for progress indication)
 */
router.get('/pool', async (req: Request, res: Response) => {
  try {
    const { seasons, limit = '1000', offset = '0', countOnly } = req.query

    if (!seasons) {
      return res.status(400).json({ error: 'seasons parameter is required' })
    }

    const yearList = String(seasons).split(',').map(Number)
    const limitNum = Math.min(Number(limit), 1000) // Cap at 1000 per request
    const offsetNum = Number(offset)

    // Count-only request (for progress indication)
    if (countOnly === 'true') {
      const { count, error } = await supabase
        .from('player_seasons')
        .select('id', { count: 'exact', head: true })
        .in('year', yearList)
        .or('at_bats.gte.200,innings_pitched_outs.gte.30')

      if (error) {
        console.error('[Players API] Count error:', error)
        return res.status(500).json({ error: `Failed to count players: ${error.message}` })
      }

      return res.json({ count: count || 0 })
    }

    // Full data request
    const { data, error } = await supabase
      .from('player_seasons')
      .select(PLAYER_SEASON_SELECT)
      .in('year', yearList)
      .or('at_bats.gte.200,innings_pitched_outs.gte.30')
      .order('apba_rating', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1)

    if (error) {
      console.error('[Players API] Pool error:', error)
      return res.status(500).json({ error: `Failed to fetch player pool: ${error.message}` })
    }

    return res.json(data || [])
  } catch (err) {
    console.error('[Players API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/players/batch
 * Get multiple players by their season IDs
 * Used by Clubhouse to load drafted player data
 *
 * Body: { ids: string[] }
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' })
    }

    // Batch queries to avoid URL length limits (100 IDs per batch)
    const BATCH_SIZE = 100
    const allData: any[] = []

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)

      const { data, error } = await supabase
        .from('player_seasons')
        .select(PLAYER_SEASON_SELECT)
        .in('id', batch)

      if (error) {
        console.error('[Players API] Batch error:', error)
        return res.status(500).json({ error: `Failed to fetch players: ${error.message}` })
      }

      if (data) {
        allData.push(...data)
      }
    }

    return res.json(allData)
  } catch (err) {
    console.error('[Players API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/players/:id
 * Get a single player season by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('player_seasons')
      .select(PLAYER_SEASON_SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: `Player not found: ${id}` })
      }
      console.error('[Players API] Get error:', error)
      return res.status(500).json({ error: `Failed to get player: ${error.message}` })
    }

    return res.json(data)
  } catch (err) {
    console.error('[Players API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
