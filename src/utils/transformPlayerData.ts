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
export function transformPlayerSeasonData(raw: any): PlayerSeason {
  // Handle both nested (Supabase join) and flat (server cache) formats
  const playerData = raw.players || raw

  return {
    id: raw.id,
    player_id: raw.player_id,
    year: raw.year,
    team_id: raw.team_id,
    primary_position: raw.primary_position,
    apba_rating: raw.apba_rating,
    war: raw.war,
    at_bats: raw.at_bats !== null && raw.at_bats !== undefined ? Number(raw.at_bats) : null,
    batting_avg: raw.batting_avg,
    hits: raw.hits,
    home_runs: raw.home_runs,
    rbi: raw.rbi,
    stolen_bases: raw.stolen_bases,
    on_base_pct: raw.on_base_pct,
    slugging_pct: raw.slugging_pct,
    innings_pitched_outs: raw.innings_pitched_outs !== null && raw.innings_pitched_outs !== undefined ? Number(raw.innings_pitched_outs) : null,
    wins: raw.wins,
    losses: raw.losses,
    era: raw.era,
    strikeouts_pitched: raw.strikeouts_pitched,
    saves: raw.saves,
    shutouts: raw.shutouts,
    whip: raw.whip,
    display_name: playerData.display_name,
    first_name: playerData.first_name,
    last_name: playerData.last_name,
    bats: playerData.bats,
  }
}
