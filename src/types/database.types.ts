/**
 * Database types for Century of the Game
 * Generated from Supabase schema
 */

export interface Player {
  id: string
  lahman_id: string
  first_name: string
  last_name: string
  birth_year: number | null
  debut_year: number | null
  final_year: number | null
  bats: 'L' | 'R' | 'B' | null
  throws: 'L' | 'R' | 'B' | null
  created_at: string
  updated_at: string
}

export interface PlayerSeason {
  id: string
  player_id: string
  year: number
  team_id: string

  // Position
  primary_position: string | null

  // Batting stats
  games: number
  at_bats: number
  runs: number
  hits: number
  doubles: number
  triples: number
  home_runs: number
  rbi: number
  stolen_bases: number
  caught_stealing: number
  walks: number
  strikeouts: number

  // Calculated batting stats
  batting_avg: number | null
  on_base_pct: number | null
  slugging_pct: number | null
  ops: number | null

  // Bill James stats
  runs_created: number | null
  isolated_power: number | null
  secondary_avg: number | null
  power_speed_number: number | null

  // Pitching stats (if pitcher)
  wins: number | null
  losses: number | null
  era: number | null
  innings_pitched: number | null
  hits_allowed: number | null
  runs_allowed: number | null
  earned_runs: number | null
  walks_allowed: number | null
  strikeouts_pitched: number | null

  // Fielding stats
  putouts: number | null
  assists: number | null
  errors: number | null
  fielding_pct: number | null
  range_factor: number | null

  created_at: string
  updated_at: string
}

export interface APBACard {
  id: string
  player_id: string
  season: number

  // APBA specific fields
  fielding_grade: number // 1-9 scale
  speed_rating: number | null
  pitcher_grade: 'A' | 'B' | 'C' | 'D' | 'E' | null

  // Dice outcome array (36 outcomes for 2d6)
  dice_outcomes: number[] // Array of 36 outcome codes

  // Card metadata
  card_number: number | null

  created_at: string
  updated_at: string
}

export interface DraftSession {
  id: string
  name: string
  season_year: number
  num_teams: number
  rounds: number
  draft_type: 'snake' | 'linear'
  status: 'setup' | 'in_progress' | 'completed'
  current_pick: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  draft_session_id: string
  team_name: string
  owner_name: string
  draft_order: number
  created_at: string
  updated_at: string
}

export interface DraftPick {
  id: string
  draft_session_id: string
  team_id: string
  player_id: string
  pick_number: number
  round: number
  pick_in_round: number
  created_at: string
}
