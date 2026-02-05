/**
 * Session Data Cache Module
 *
 * Caches session, teams, and picks data during active drafts to avoid
 * redundant database queries per CPU pick. This reduces 3 read queries
 * per pick to 0 (after initial load), dramatically improving performance.
 *
 * Cache is:
 * - Per-session (isolated between drafts)
 * - Invalidated on writes (pick made, session updated)
 * - Auto-expiring (5 minute TTL as safety net)
 */

import { pool } from './db'

// Database row types (matching draft.ts)
interface DbSessionRow {
  id: string
  session_name: string
  status: string
  num_teams: number
  current_pick_number: number
  current_round: number
  selected_seasons: number[]
  season_year: number
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

interface CachedSessionData {
  session: DbSessionRow
  teams: DbTeamRow[]
  picks: DbPickRow[]
  loadedAt: number
}

// Module-level cache
const sessionCache = new Map<string, CachedSessionData>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get or load session data (session, teams, picks)
 * Returns cached data if valid, otherwise loads from database
 */
export async function getSessionData(sessionId: string): Promise<CachedSessionData | null> {
  const cached = sessionCache.get(sessionId)

  // Return cached if valid and not expired
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    console.log(`[SessionCache] HIT for session ${sessionId}`)
    return cached
  }

  // Load from database
  console.log(`[SessionCache] MISS for session ${sessionId}, loading...`)
  const startTime = Date.now()

  // Run all 3 queries in parallel
  const [sessionResult, teamsResult, picksResult] = await Promise.all([
    pool.query('SELECT * FROM draft_sessions WHERE id = $1', [sessionId]),
    pool.query('SELECT * FROM draft_teams WHERE draft_session_id = $1 ORDER BY draft_order', [sessionId]),
    pool.query('SELECT * FROM draft_picks WHERE draft_session_id = $1 ORDER BY pick_number', [sessionId])
  ])

  if (sessionResult.rows.length === 0) {
    console.log(`[SessionCache] Session not found: ${sessionId}`)
    return null
  }

  const data: CachedSessionData = {
    session: sessionResult.rows[0],
    teams: teamsResult.rows,
    picks: picksResult.rows,
    loadedAt: Date.now()
  }

  const loadTime = Date.now() - startTime
  console.log(`[SessionCache] Loaded session data in ${loadTime}ms (${data.teams.length} teams, ${data.picks.length} picks)`)

  // Store in cache
  sessionCache.set(sessionId, data)

  return data
}

/**
 * Update cached session state after a pick is made
 * Avoids full reload by updating in-place
 */
export function updateCacheAfterPick(
  sessionId: string,
  newPick: DbPickRow,
  newCurrentPick: number,
  newCurrentRound: number,
  newStatus: string
): void {
  const cached = sessionCache.get(sessionId)
  if (!cached) return

  // Update session state
  cached.session.current_pick_number = newCurrentPick
  cached.session.current_round = newCurrentRound
  cached.session.status = newStatus

  // Add or update pick
  const existingPickIndex = cached.picks.findIndex(p => p.pick_number === newPick.pick_number)
  if (existingPickIndex >= 0) {
    cached.picks[existingPickIndex] = newPick
  } else {
    cached.picks.push(newPick)
  }

  cached.loadedAt = Date.now() // Reset TTL
  console.log(`[SessionCache] Updated cache after pick ${newPick.pick_number}`)
}

/**
 * Invalidate cache for a session (force reload on next access)
 */
export function invalidateSessionCache(sessionId: string): void {
  const had = sessionCache.has(sessionId)
  sessionCache.delete(sessionId)
  if (had) {
    console.log(`[SessionCache] Invalidated cache for session ${sessionId}`)
  }
}

/**
 * Clear all session caches
 */
export function clearAllSessionCaches(): void {
  const count = sessionCache.size
  sessionCache.clear()
  console.log(`[SessionCache] Cleared all ${count} cached sessions`)
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getSessionCacheStats(): { sessions: number; oldestMs: number } {
  let oldestMs = 0
  const now = Date.now()

  for (const [, cached] of sessionCache) {
    const age = now - cached.loadedAt
    if (age > oldestMs) oldestMs = age
  }

  return {
    sessions: sessionCache.size,
    oldestMs
  }
}

export type { DbSessionRow, DbTeamRow, DbPickRow, CachedSessionData }
