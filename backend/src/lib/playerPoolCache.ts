/**
 * Player Pool Cache Module
 *
 * Caches player pools by session ID to avoid reloading 69,000+ players
 * for every CPU pick. This provides 30-60x performance improvement.
 *
 * Cache is:
 * - Per-session (isolated between drafts)
 * - Auto-expiring (30 minute TTL)
 * - Cleared on draft completion
 */

import { pool } from './db'

// Types matching cpu.ts
interface PlayerSeason {
  id: string
  player_id: string
  year: number
  team_id: string
  primary_position: string
  apba_rating: number | null
  war: number | null
  at_bats: number | null
  batting_avg: number | null
  hits: number | null
  home_runs: number | null
  rbi: number | null
  stolen_bases: number | null
  on_base_pct: number | null
  slugging_pct: number | null
  innings_pitched_outs: number | null
  wins: number | null
  losses: number | null
  era: number | null
  strikeouts_pitched: number | null
  saves: number | null
  shutouts: number | null
  whip: number | null
  display_name?: string
  first_name?: string
  last_name?: string
  bats?: 'L' | 'R' | 'B' | null
}

interface CachedPool {
  players: PlayerSeason[]
  loadedAt: number
  yearList: number[]
}

// Module-level cache
const poolCache = new Map<string, CachedPool>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// Config
const RELAXED_AB_THRESHOLD = 100
const RELAXED_IP_THRESHOLD = 45

/**
 * Check if years are consecutive (for range query optimization)
 */
function areYearsConsecutive(years: number[]): boolean {
  if (years.length <= 1) return true
  const sorted = [...years].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}

/**
 * Transform database row to PlayerSeason type
 */
function transformPlayerRow(row: any): PlayerSeason {
  return {
    id: row.id,
    player_id: row.player_id,
    year: row.year,
    team_id: row.team_id,
    primary_position: row.primary_position,
    apba_rating: row.apba_rating,
    war: row.war,
    at_bats: Number(row.at_bats) || 0,
    batting_avg: row.batting_avg,
    hits: row.hits,
    home_runs: row.home_runs,
    rbi: row.rbi,
    stolen_bases: row.stolen_bases,
    on_base_pct: row.on_base_pct,
    slugging_pct: row.slugging_pct,
    innings_pitched_outs: Number(row.innings_pitched_outs) || 0,
    wins: row.wins,
    losses: row.losses,
    era: row.era,
    strikeouts_pitched: row.strikeouts_pitched,
    saves: row.saves,
    shutouts: row.shutouts,
    whip: row.whip,
    display_name: row.display_name,
    first_name: row.first_name,
    last_name: row.last_name,
    bats: row.bats,
  }
}

/**
 * Load players from Neon PostgreSQL
 */
async function loadPlayersFromDatabase(yearList: number[]): Promise<PlayerSeason[]> {
  const useRangeQuery = areYearsConsecutive(yearList)
  const minYear = Math.min(...yearList)
  const maxYear = Math.max(...yearList)

  if (useRangeQuery && yearList.length > 10) {
    console.log(`[Cache] Using range query optimization: ${minYear}-${maxYear}`)
  }

  // Build year filter clause
  let yearClause: string
  let yearParams: any[]

  if (useRangeQuery) {
    yearClause = 'ps.year >= $1 AND ps.year <= $2'
    yearParams = [minYear, maxYear]
  } else {
    yearClause = 'ps.year = ANY($1)'
    yearParams = [yearList]
  }

  // Fetch hitters (at_bats >= threshold)
  const hittersQuery = `
    SELECT
      ps.id, ps.player_id, ps.year, ps.team_id, ps.primary_position, ps.apba_rating, ps.war,
      ps.at_bats, ps.batting_avg, ps.hits, ps.home_runs, ps.rbi, ps.stolen_bases,
      ps.on_base_pct, ps.slugging_pct, ps.innings_pitched_outs, ps.wins, ps.losses,
      ps.era, ps.strikeouts_pitched, ps.saves, ps.shutouts, ps.whip,
      p.display_name, p.first_name, p.last_name, p.bats
    FROM player_seasons ps
    INNER JOIN players p ON ps.player_id = p.id
    WHERE ${yearClause}
      AND ps.at_bats >= $${yearParams.length + 1}
    ORDER BY ps.apba_rating DESC NULLS LAST
  `

  // Fetch pitchers (innings_pitched_outs >= threshold AND at_bats < threshold)
  const pitchersQuery = `
    SELECT
      ps.id, ps.player_id, ps.year, ps.team_id, ps.primary_position, ps.apba_rating, ps.war,
      ps.at_bats, ps.batting_avg, ps.hits, ps.home_runs, ps.rbi, ps.stolen_bases,
      ps.on_base_pct, ps.slugging_pct, ps.innings_pitched_outs, ps.wins, ps.losses,
      ps.era, ps.strikeouts_pitched, ps.saves, ps.shutouts, ps.whip,
      p.display_name, p.first_name, p.last_name, p.bats
    FROM player_seasons ps
    INNER JOIN players p ON ps.player_id = p.id
    WHERE ${yearClause}
      AND ps.innings_pitched_outs >= $${yearParams.length + 1}
      AND ps.at_bats < $${yearParams.length + 2}
    ORDER BY ps.apba_rating DESC NULLS LAST
  `

  // Execute both queries in parallel
  const [hittersResult, pitchersResult] = await Promise.all([
    pool.query(hittersQuery, [...yearParams, RELAXED_AB_THRESHOLD]),
    pool.query(pitchersQuery, [...yearParams, RELAXED_IP_THRESHOLD, RELAXED_AB_THRESHOLD])
  ])

  const allPlayers = [
    ...hittersResult.rows.map(transformPlayerRow),
    ...pitchersResult.rows.map(transformPlayerRow),
  ]

  return allPlayers
}

/**
 * Get or load player pool for a session
 * Returns cached pool if valid, otherwise loads from database
 */
export async function getOrLoadPlayerPool(
  sessionId: string,
  yearList: number[]
): Promise<PlayerSeason[]> {
  const cached = poolCache.get(sessionId)

  // Return cached if valid and not expired
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    console.log(`[Cache] HIT for session ${sessionId}: ${cached.players.length} players`)
    return cached.players
  }

  // Load from database
  console.log(`[Cache] MISS for session ${sessionId}, loading ${yearList.length} seasons...`)
  const startTime = Date.now()

  const players = await loadPlayersFromDatabase(yearList)

  const loadTime = Date.now() - startTime
  console.log(`[Cache] Loaded ${players.length} players in ${loadTime}ms`)

  // Store in cache
  poolCache.set(sessionId, {
    players,
    loadedAt: Date.now(),
    yearList
  })

  return players
}

/**
 * Clear cache for a specific session or all sessions
 */
export function clearCache(sessionId?: string): void {
  if (sessionId) {
    const had = poolCache.has(sessionId)
    poolCache.delete(sessionId)
    if (had) {
      console.log(`[Cache] Cleared cache for session ${sessionId}`)
    }
  } else {
    const count = poolCache.size
    poolCache.clear()
    console.log(`[Cache] Cleared all ${count} cached sessions`)
  }
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getCacheStats(): { sessions: number; totalPlayers: number; oldestMs: number } {
  let totalPlayers = 0
  let oldestMs = 0
  const now = Date.now()

  for (const [, cached] of poolCache) {
    totalPlayers += cached.players.length
    const age = now - cached.loadedAt
    if (age > oldestMs) oldestMs = age
  }

  return {
    sessions: poolCache.size,
    totalPlayers,
    oldestMs
  }
}

// Export types
export type { PlayerSeason }
