/**
 * Players API Routes
 * Player pool and batch retrieval for draft and clubhouse
 */

import { Router, Request, Response } from 'express'
import { pool } from '../lib/db'
import { getOrLoadPlayerPool } from '../lib/playerPoolCache'

const router = Router()

// Common select fields for player_seasons
const PLAYER_SEASON_SELECT = `
  ps.id,
  ps.player_id,
  ps.year,
  ps.team_id,
  ps.primary_position,
  ps.apba_rating,
  ps.war,
  ps.at_bats,
  ps.batting_avg,
  ps.hits,
  ps.home_runs,
  ps.rbi,
  ps.stolen_bases,
  ps.on_base_pct,
  ps.slugging_pct,
  ps.innings_pitched_outs,
  ps.wins,
  ps.losses,
  ps.era,
  ps.strikeouts_pitched,
  ps.saves,
  ps.shutouts,
  ps.whip,
  p.id as player_id_nested,
  p.display_name,
  p.first_name,
  p.last_name,
  p.bats
`

// Transform database row to API response format
function transformPlayerRow(row: any) {
  return {
    id: row.id,
    player_id: row.player_id,
    year: row.year,
    team_id: row.team_id,
    primary_position: row.primary_position,
    apba_rating: row.apba_rating,
    war: row.war,
    at_bats: row.at_bats,
    batting_avg: row.batting_avg,
    hits: row.hits,
    home_runs: row.home_runs,
    rbi: row.rbi,
    stolen_bases: row.stolen_bases,
    on_base_pct: row.on_base_pct,
    slugging_pct: row.slugging_pct,
    innings_pitched_outs: row.innings_pitched_outs,
    wins: row.wins,
    losses: row.losses,
    era: row.era,
    strikeouts_pitched: row.strikeouts_pitched,
    saves: row.saves,
    shutouts: row.shutouts,
    whip: row.whip,
    players: {
      id: row.player_id,
      display_name: row.display_name,
      first_name: row.first_name,
      last_name: row.last_name,
      bats: row.bats
    }
  }
}

// Helper: Check if years are consecutive (for range query optimization)
function areYearsConsecutive(years: number[]): boolean {
  if (years.length <= 1) return true
  const sorted = [...years].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}

/**
 * GET /api/players/pool-full
 * Get FULL player pool using server-side cache (same cache as CPU picks)
 *
 * This is MUCH faster than paginated /pool endpoint because:
 * 1. Uses split queries (hitters vs pitchers) - avoids slow OR filter
 * 2. Caches result for 30 min - subsequent requests instant
 * 3. Single request instead of 70+ paginated requests
 *
 * Query params:
 * - sessionId: draft session ID (required for caching)
 * - seasons: comma-separated years (e.g., "1901,1902,...,2025")
 */
router.get('/pool-full', async (req: Request, res: Response) => {
  console.log('[Players API] /pool-full route hit')
  try {
    const { sessionId, seasons } = req.query

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId parameter is required' })
    }

    if (!seasons) {
      return res.status(400).json({ error: 'seasons parameter is required' })
    }

    const yearList = String(seasons).split(',').map(Number)

    console.log(`[Players API] Loading full pool for session ${sessionId}, ${yearList.length} seasons`)
    const startTime = Date.now()

    // Use the same cache as CPU picks - this is the key optimization
    const players = await getOrLoadPlayerPool(sessionId, yearList)

    const loadTime = Date.now() - startTime
    console.log(`[Players API] Full pool ready: ${players.length} players in ${loadTime}ms`)

    return res.json(players)
  } catch (err) {
    console.error('[Players API] Exception in pool-full:', err)
    return res.status(500).json({ error: 'Failed to load player pool' })
  }
})

/**
 * GET /api/players/pool
 * Get player pool for drafting (paginated - DEPRECATED for large datasets)
 *
 * NOTE: For 100+ seasons, use /pool-full instead to avoid query timeouts
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

    // Build year filter
    const useRangeQuery = areYearsConsecutive(yearList)
    const minYear = Math.min(...yearList)
    const maxYear = Math.max(...yearList)

    // Log if using range optimization
    if (useRangeQuery && yearList.length > 10) {
      console.log(`[Players API] Using range query optimization: ${minYear}-${maxYear}`)
    }

    let yearClause: string
    let yearParams: any[]

    if (useRangeQuery) {
      yearClause = 'ps.year >= $1 AND ps.year <= $2'
      yearParams = [minYear, maxYear]
    } else {
      yearClause = 'ps.year = ANY($1)'
      yearParams = [yearList]
    }

    // Count-only request (for progress indication)
    if (countOnly === 'true') {
      const countQuery = `
        SELECT COUNT(*) as count
        FROM player_seasons ps
        WHERE ${yearClause}
          AND (ps.at_bats >= 200 OR ps.innings_pitched_outs >= 30)
      `
      const result = await pool.query(countQuery, yearParams)
      return res.json({ count: parseInt(result.rows[0]?.count || '0', 10) })
    }

    // Full data request
    const dataQuery = `
      SELECT ${PLAYER_SEASON_SELECT}
      FROM player_seasons ps
      INNER JOIN players p ON ps.player_id = p.id
      WHERE ${yearClause}
        AND (ps.at_bats >= 200 OR ps.innings_pitched_outs >= 30)
      ORDER BY ps.apba_rating DESC NULLS LAST
      LIMIT $${yearParams.length + 1} OFFSET $${yearParams.length + 2}
    `

    const result = await pool.query(dataQuery, [...yearParams, limitNum, offsetNum])
    const data = result.rows.map(transformPlayerRow)

    return res.json(data)
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

    const query = `
      SELECT ${PLAYER_SEASON_SELECT}
      FROM player_seasons ps
      INNER JOIN players p ON ps.player_id = p.id
      WHERE ps.id = ANY($1)
    `

    const result = await pool.query(query, [ids])
    const data = result.rows.map(transformPlayerRow)

    return res.json(data)
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

    const query = `
      SELECT ${PLAYER_SEASON_SELECT}
      FROM player_seasons ps
      INNER JOIN players p ON ps.player_id = p.id
      WHERE ps.id = $1
      LIMIT 1
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Player not found: ${id}` })
    }

    return res.json(transformPlayerRow(result.rows[0]))
  } catch (err) {
    console.error('[Players API] Exception:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
