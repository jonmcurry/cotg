/**
 * Database types for Century of the Game
 * Auto-generated from Supabase schema
 * Schema Version: 1.0
 * Last Updated: 2026-01-27
 *
 * See docs/DATABASE_SCHEMA.md for full documentation
 */

// ========================================
// CORE PLAYER DATA
// ========================================

export interface Player {
  id: string
  lahman_id: string
  lahman_numeric_id: number | null
  bbref_id: string | null
  retro_id: string | null

  // Name fields
  first_name: string | null
  last_name: string | null
  full_name: string | null
  name_given: string | null

  // Birth information
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_city: string | null
  birth_state: string | null
  birth_country: string | null

  // Death information
  death_year: number | null
  death_month: number | null
  death_day: number | null
  death_city: string | null
  death_state: string | null
  death_country: string | null

  // Physical attributes
  weight: number | null
  height: number | null
  bats: 'L' | 'R' | 'B' | null
  throws: 'L' | 'R' | 'B' | null

  // Career dates
  debut_date: string | null // ISO date
  final_game_date: string | null
  debut_year: number | null
  final_year: number | null

  // Computed fields (generated columns)
  display_name: string | null // "First Last"
  career_span: string | null // "1954-1976"

  // Metadata
  created_at: string
  updated_at: string
}

export interface TeamHistory {
  id: string
  team_id: string // e.g., 'NYA', 'BOS'
  year: number
  league_id: string | null // 'AL', 'NL'
  franchise_id: string | null
  division: string | null
  team_name: string | null
  park_name: string | null

  // Team season stats
  wins: number | null
  losses: number | null
  rank: number | null

  created_at: string
  updated_at: string
}

export interface PlayerSeason {
  id: string
  player_id: string
  team_history_id: string | null

  // Season identifiers
  year: number
  stint: number // 1, 2, 3 for mid-season trades
  team_id: string | null
  league_id: string | null

  // Position
  primary_position: string | null // '1B', '2B', 'SS', 'OF', 'P', etc.
  games_by_position: Record<string, number> | null // {"P": 10, "1B": 5}

  // General
  games: number
  games_started: number | null

  // ===== BATTING STATS =====
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
  intentional_walks: number
  hit_by_pitch: number
  sacrifice_hits: number
  sacrifice_flies: number
  grounded_into_double_play: number

  // Calculated batting
  batting_avg: number | null // decimal(4,3)
  on_base_pct: number | null
  slugging_pct: number | null
  ops: number | null
  total_bases: number | null

  // Bill James offensive metrics
  runs_created_basic: number | null
  runs_created_advanced: number | null
  isolated_power: number | null
  secondary_avg: number | null
  power_speed_number: number | null

  // ===== PITCHING STATS =====
  wins: number
  losses: number
  games_pitched: number
  games_started_pitcher: number
  complete_games: number
  shutouts: number
  saves: number
  innings_pitched_outs: number // Stored as outs (IP * 3)
  innings_pitched: number | null // Calculated: outs / 3

  hits_allowed: number
  runs_allowed: number
  earned_runs: number
  home_runs_allowed: number
  walks_allowed: number
  strikeouts_pitched: number
  intentional_walks_allowed: number
  hit_batters: number
  wild_pitches: number
  balks: number
  batters_faced: number

  // Calculated pitching
  era: number | null // decimal(4,2)
  whip: number | null
  k_per_9: number | null
  bb_per_9: number | null
  k_bb_ratio: number | null
  opponent_batting_avg: number | null

  // Bill James pitching metrics
  component_era: number | null
  game_score: number | null

  // ===== FIELDING STATS =====
  innings_fielded_outs: number | null
  putouts: number
  assists: number
  errors: number
  double_plays: number
  passed_balls: number

  // Calculated fielding
  fielding_pct: number | null
  range_factor: number | null

  // ===== ADVANCED METRICS =====
  war: number | null // Wins Above Replacement

  // Metadata
  is_primary_season: boolean // false if stint > 1
  created_at: string
  updated_at: string
}

export interface APBAOutcome {
  id: number
  outcome_code: number
  outcome_type: string // 'batting', 'pitching', 'fielding'
  message: string | null
  short_description: string | null

  // Outcome classification
  is_hit: boolean
  is_extra_base: boolean
  is_out: boolean
  is_strikeout: boolean
  is_walk: boolean

  created_at: string
}

export interface APBACard {
  id: string
  player_id: string
  player_season_id: string
  season: number

  // Card metadata
  card_number: number | null
  card_type: 'batter' | 'pitcher' | null

  // Batting card data
  dice_outcomes: number[] | null // 36 outcome codes
  fielding_grade: number | null // 1-9
  speed_rating: number | null // 1-20
  advancement_rating: string | null // 'A', 'B', 'C'

  // Pitching card data
  pitcher_grade: 'A' | 'B' | 'C' | 'D' | 'E' | null
  pitcher_dice_outcomes: number[] | null // 36 outcome codes
  control_rating: number | null // 1-10
  endurance: number | null // 1-10

  // Generation metadata
  generation_algorithm_version: string
  validated_against_original: boolean
  validation_similarity_score: number | null
  generation_notes: string | null

  created_at: string
  updated_at: string
}

// ========================================
// DRAFT SYSTEM
// ========================================

export interface DraftSession {
  id: string
  session_name: string
  session_description: string | null

  // Draft configuration
  season_year: number
  num_teams: number
  num_rounds: number
  draft_type: 'snake' | 'linear'

  // Player pool filters
  min_at_bats: number | null
  min_innings_pitched: number | null
  eligible_positions: string[] | null

  // Draft state
  status: 'setup' | 'in_progress' | 'paused' | 'completed' | 'abandoned'
  current_pick_number: number
  current_round: number
  current_team_picking: string | null

  // Timer settings
  pick_time_limit_seconds: number | null
  time_limit_enabled: boolean

  // Ownership
  created_by_user_id: string | null
  is_public: boolean

  // Metadata
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface DraftTeam {
  id: string
  draft_session_id: string

  // Team details
  team_name: string
  team_abbreviation: string | null
  owner_name: string | null
  owner_user_id: string | null

  // Draft order
  draft_order: number

  // Team colors
  primary_color: string
  secondary_color: string

  // Roster limits
  max_batters: number
  max_pitchers: number
  max_bench: number

  // Current roster counts
  current_batters: number
  current_pitchers: number

  created_at: string
  updated_at: string
}

export interface DraftPick {
  id: string
  draft_session_id: string
  draft_team_id: string
  player_id: string
  player_season_id: string

  // Pick details
  pick_number: number
  round: number
  pick_in_round: number

  // Pick metadata
  picked_at: string
  time_taken_seconds: number | null

  // Auto-pick
  was_autopick: boolean
  autopick_reason: string | null
}

export interface DraftRanking {
  id: string
  draft_session_id: string
  draft_team_id: string | null // NULL = global TRD rankings
  player_season_id: string

  // Ranking data
  rank: number
  ranking_score: number | null

  // Ranking type
  ranking_type: 'trd_global' | 'trd_position' | 'user_custom'
  position_filter: string | null

  created_at: string
  updated_at: string
}

export interface DraftWatchlist {
  id: string
  draft_team_id: string
  player_season_id: string

  // Watchlist metadata
  notes: string | null
  priority: number // 1-5, 1 = highest

  added_at: string
}

// ========================================
// GAME SIMULATION
// ========================================

export interface League {
  id: string
  league_name: string
  league_description: string | null
  season_year: number

  // League configuration
  num_teams: number
  games_per_season: number
  playoff_format: 'none' | 'wild_card' | 'division' | 'expanded'

  // Simulation settings
  use_apba_rules: boolean
  injury_enabled: boolean
  weather_effects: boolean

  // League state
  status: 'draft' | 'in_season' | 'playoffs' | 'completed'
  current_game_date: string | null

  // Ownership
  created_by_user_id: string | null
  is_public: boolean

  created_at: string
  updated_at: string
}

export interface LeagueTeam {
  id: string
  league_id: string
  draft_team_id: string | null

  // Team details
  team_name: string
  team_abbreviation: string
  team_city: string | null
  owner_name: string | null
  owner_user_id: string | null

  // Division/Conference
  division: string | null
  conference: string | null

  // Team colors
  primary_color: string
  secondary_color: string

  // Season record
  wins: number
  losses: number
  ties: number
  runs_scored: number
  runs_allowed: number

  // Standings
  games_back: number | null
  win_pct: number | null
  streak: string | null // 'W5', 'L3'

  created_at: string
  updated_at: string
}

export interface LeagueRoster {
  id: string
  league_team_id: string
  player_id: string
  player_season_id: string

  // Roster position
  roster_position: 'active' | 'bench' | 'injured' | 'inactive' | null
  depth_chart_order: number | null

  // Position eligibility
  eligible_positions: string[] | null
  primary_position: string | null

  added_at: string
  updated_at: string
}

export interface Game {
  id: string
  league_id: string
  home_team_id: string
  away_team_id: string

  // Game details
  game_number: number | null
  game_date: string | null
  game_time: string | null

  // Game status
  status: 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled'

  // Score
  home_score: number
  away_score: number
  innings_played: number
  is_extra_innings: boolean

  // Simulation metadata
  simulation_speed: 'fast' | 'normal' | 'detailed'
  simulation_seed: number | null

  // Game conditions
  weather: string | null
  temperature: number | null

  // Time tracking
  started_at: string | null
  completed_at: string | null
  duration_minutes: number | null

  created_at: string
  updated_at: string
}

export interface GameEvent {
  id: string
  game_id: string
  batting_team_id: string
  fielding_team_id: string

  // Event metadata
  event_number: number
  inning: number
  is_top_inning: boolean

  // Count and outs
  balls: number
  strikes: number
  outs_before: number
  outs_after: number

  // Players involved
  batter_id: string
  pitcher_id: string
  fielder_id: string | null

  // APBA dice roll
  dice_roll_1: number | null
  dice_roll_2: number | null
  dice_total: number | null

  // Outcome
  outcome_code: number | null
  outcome_type: string | null
  outcome_description: string | null

  // Base runners (before)
  runner_on_first: string | null
  runner_on_second: string | null
  runner_on_third: string | null

  // Base runner advancement (after)
  runner_first_to: string | null // 'home', 'second', 'third', 'out'
  runner_second_to: string | null
  runner_third_to: string | null
  batter_to: string | null

  // Runs scored
  runs_scored: number
  rbi: number

  // Errors
  is_error: boolean
  error_position: string | null

  // Score after event
  home_score_after: number
  away_score_after: number

  created_at: string
}

export interface PlayerGameStats {
  id: string
  game_id: string
  player_id: string
  team_id: string

  // Batting stats
  plate_appearances: number
  at_bats: number
  runs: number
  hits: number
  doubles: number
  triples: number
  home_runs: number
  rbi: number
  walks: number
  strikeouts: number

  // Pitching stats
  innings_pitched_outs: number
  hits_allowed: number
  runs_allowed: number
  earned_runs: number
  walks_allowed: number
  strikeouts_pitched: number
  pitches_thrown: number

  // Fielding stats
  putouts: number
  assists: number
  errors: number

  created_at: string
  updated_at: string
}

// ========================================
// VIEW TYPES
// ========================================

export interface PlayerSeasonEnriched extends PlayerSeason {
  lahman_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  bats: 'L' | 'R' | 'B' | null
  throws: 'L' | 'R' | 'B' | null
  team_name: string | null
  league_id: string | null

  // Calculated stats
  calculated_avg: number | null
  calculated_obp: number | null
  calculated_slg: number | null
  calculated_k_per_9: number | null
  calculated_bb_per_9: number | null

  // Qualified flags
  is_qualified_batter: boolean
  is_qualified_pitcher: boolean
}

export interface APBACardEnriched extends APBACard {
  display_name: string | null
  first_name: string | null
  last_name: string | null
  primary_position: string | null
  batting_avg: number | null
  home_runs: number
  rbi: number
  era: number | null
  wins: number
  strikeouts_pitched: number
}

export interface DraftBoardPlayer {
  player_season_id: string
  player_id: string
  display_name: string | null
  year: number
  primary_position: string | null
  team_id: string | null

  // Batting
  games: number
  at_bats: number
  batting_avg: number | null
  home_runs: number
  rbi: number
  stolen_bases: number
  ops: number | null

  // Pitching
  wins: number
  losses: number
  era: number | null
  innings_pitched: number | null
  strikeouts_pitched: number
  whip: number | null

  // Bill James
  runs_created_basic: number | null
  isolated_power: number | null
  war: number | null

  // Qualified flags
  is_qualified_batter: boolean
  is_qualified_pitcher: boolean

  // APBA
  has_apba_card: boolean
}

export interface LeagueStanding extends LeagueTeam {
  league_name: string
  season_year: number
  calculated_win_pct: number
  run_differential: number
  division_rank: number
}

// ========================================
// FUNCTION RETURN TYPES
// ========================================

export interface PlayerCareerStats {
  total_seasons: number
  career_games: number
  career_at_bats: number
  career_hits: number
  career_home_runs: number
  career_rbi: number
  career_avg: number | null
  career_ops: number | null
  career_war: number | null
  best_season_year: number | null
  best_season_war: number | null
}

export interface DraftPickOrder {
  pick_number: number
  team_id: string
  team_name: string
  draft_order: number
}

export interface NextPick {
  next_pick_number: number | null
  next_round: number | null
  next_team_id: string | null
  next_team_name: string | null
}
