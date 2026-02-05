/**
 * Shared player data transformation utility
 * Transforms raw Supabase player_seasons join data into typed PlayerSeason objects
 * Used by DraftBoard and Clubhouse to avoid duplicate transformation logic
 */

import type { PlayerSeason } from '../types/player'

/**
 * Raw player data shape from Supabase query with players!inner join
 * Uses `any` for the input since Supabase client returns untyped data
 *
 * Handles BOTH formats:
 * - Nested: raw.players?.display_name (from /pool endpoint - direct Supabase)
 * - Flat: raw.display_name (from /pool-full endpoint - server-side cache)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Helper to safely convert to number or null
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return isNaN(num) ? null : num
}

export function transformPlayerSeasonData(raw: any): PlayerSeason {
  // Handle both nested (Supabase join) and flat (server cache) formats
  const playerData = raw.players || raw

  return {
    id: raw.id,
    player_id: raw.player_id,
    year: raw.year,
    team_id: raw.team_id,
    primary_position: raw.primary_position,
    apba_rating: toNumberOrNull(raw.apba_rating),
    war: toNumberOrNull(raw.war),
    at_bats: toNumberOrNull(raw.at_bats),
    batting_avg: toNumberOrNull(raw.batting_avg),
    hits: raw.hits,
    home_runs: raw.home_runs,
    rbi: raw.rbi,
    stolen_bases: raw.stolen_bases,
    on_base_pct: toNumberOrNull(raw.on_base_pct),
    slugging_pct: toNumberOrNull(raw.slugging_pct),
    innings_pitched_outs: toNumberOrNull(raw.innings_pitched_outs),
    wins: raw.wins,
    losses: raw.losses,
    era: toNumberOrNull(raw.era),
    strikeouts_pitched: raw.strikeouts_pitched,
    saves: raw.saves,
    shutouts: raw.shutouts,
    whip: toNumberOrNull(raw.whip),
    display_name: playerData.display_name,
    first_name: playerData.first_name,
    last_name: playerData.last_name,
    bats: playerData.bats,
  }
}
