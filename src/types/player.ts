/**
 * Player Type Definitions
 * Shared types for player data across the application
 */

export interface PlayerSeason {
  id: string
  player_id: string
  year: number
  team_id: string
  primary_position: string

  // Batting stats
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

  // Pitching stats
  innings_pitched_outs: number | null
  wins: number | null
  losses: number | null
  era: number | null
  strikeouts_pitched: number | null
  saves: number | null
  shutouts: number | null
  whip: number | null

  // Player info (from join)
  display_name?: string
  first_name?: string
  last_name?: string
  bats?: 'L' | 'R' | 'B' | null
}
