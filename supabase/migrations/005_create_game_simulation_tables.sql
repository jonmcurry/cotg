-- Migration: Create game simulation tables
-- Description: Tables for simulated leagues, games, and play-by-play events
-- Date: 2026-01-27

-- Leagues table (user-created fantasy leagues)
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- League details
  league_name VARCHAR(100) NOT NULL,
  league_description TEXT,
  season_year INTEGER NOT NULL CHECK (season_year BETWEEN 1901 AND 2025),

  -- League configuration
  num_teams INTEGER NOT NULL CHECK (num_teams BETWEEN 2 AND 30),
  games_per_season INTEGER DEFAULT 162 CHECK (games_per_season BETWEEN 1 AND 200),
  playoff_format VARCHAR(20) DEFAULT 'none' CHECK (playoff_format IN ('none', 'wild_card', 'division', 'expanded')),

  -- Simulation settings
  use_apba_rules BOOLEAN DEFAULT true,
  injury_enabled BOOLEAN DEFAULT false,
  weather_effects BOOLEAN DEFAULT false,

  -- League state
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_season', 'playoffs', 'completed')),
  current_game_date DATE,

  -- Ownership
  created_by_user_id UUID,
  is_public BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- League teams table (teams within a league)
CREATE TABLE league_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  draft_team_id UUID REFERENCES draft_teams(id), -- Link to draft team if came from draft

  -- Team details
  team_name VARCHAR(100) NOT NULL,
  team_abbreviation VARCHAR(5) NOT NULL,
  team_city VARCHAR(50),
  owner_name VARCHAR(100),
  owner_user_id UUID,

  -- Division/Conference (optional)
  division VARCHAR(50),
  conference VARCHAR(50),

  -- Team colors
  primary_color VARCHAR(7) DEFAULT '#2C2C2C',
  secondary_color VARCHAR(7) DEFAULT '#8B2635',

  -- Season record (updated as games are played)
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  runs_scored INTEGER DEFAULT 0,
  runs_allowed INTEGER DEFAULT 0,

  -- Standings
  games_back DECIMAL(3,1),
  win_pct DECIMAL(4,3),
  streak VARCHAR(10), -- 'W5', 'L3', etc.

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_id, team_abbreviation),
  UNIQUE(league_id, team_name)
);

-- League rosters table (players on each league team)
CREATE TABLE league_rosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  league_team_id UUID NOT NULL REFERENCES league_teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  player_season_id UUID NOT NULL REFERENCES player_seasons(id),

  -- Roster position
  roster_position VARCHAR(20) CHECK (roster_position IN ('active', 'bench', 'injured', 'inactive')),
  depth_chart_order INTEGER, -- 1 = starter, 2 = backup, etc.

  -- Position eligibility
  eligible_positions TEXT[], -- ['1B', 'OF', 'DH']
  primary_position VARCHAR(2),

  -- Metadata
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_team_id, player_season_id)
);

-- Games table (simulated games)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES league_teams(id),
  away_team_id UUID NOT NULL REFERENCES league_teams(id),

  -- Game details
  game_number INTEGER, -- Sequential game number in season
  game_date DATE,
  game_time TIME,

  -- Game status
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled')),

  -- Score
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  innings_played INTEGER DEFAULT 9,
  is_extra_innings BOOLEAN DEFAULT false,

  -- Simulation metadata
  simulation_speed VARCHAR(10) DEFAULT 'normal' CHECK (simulation_speed IN ('fast', 'normal', 'detailed')),
  simulation_seed INTEGER, -- Random seed for reproducibility

  -- Game conditions
  weather VARCHAR(20), -- 'clear', 'rain', 'snow', 'dome'
  temperature INTEGER,

  -- Time tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (home_team_id != away_team_id)
);

-- Game events table (play-by-play simulation log)
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  batting_team_id UUID NOT NULL REFERENCES league_teams(id),
  fielding_team_id UUID NOT NULL REFERENCES league_teams(id),

  -- Event metadata
  event_number INTEGER NOT NULL, -- Sequential event within game
  inning INTEGER NOT NULL,
  is_top_inning BOOLEAN NOT NULL, -- true = away team batting

  -- Count and outs
  balls INTEGER DEFAULT 0 CHECK (balls BETWEEN 0 AND 3),
  strikes INTEGER DEFAULT 0 CHECK (strikes BETWEEN 0 AND 2),
  outs_before INTEGER NOT NULL CHECK (outs_before BETWEEN 0 AND 2),
  outs_after INTEGER NOT NULL CHECK (outs_after BETWEEN 0 AND 3),

  -- Players involved
  batter_id UUID NOT NULL REFERENCES players(id),
  pitcher_id UUID NOT NULL REFERENCES players(id),
  fielder_id UUID REFERENCES players(id), -- Player who fielded the ball (if applicable)

  -- APBA dice roll
  dice_roll_1 INTEGER CHECK (dice_roll_1 BETWEEN 1 AND 6),
  dice_roll_2 INTEGER CHECK (dice_roll_2 BETWEEN 1 AND 6),
  dice_total INTEGER CHECK (dice_total BETWEEN 2 AND 12),

  -- Outcome
  outcome_code INTEGER, -- References apba_outcomes(outcome_code)
  outcome_type VARCHAR(20), -- 'single', 'double', 'triple', 'home_run', 'out', 'walk', 'strikeout', etc.
  outcome_description TEXT, -- Human-readable description

  -- Base runners (before event)
  runner_on_first UUID REFERENCES players(id),
  runner_on_second UUID REFERENCES players(id),
  runner_on_third UUID REFERENCES players(id),

  -- Base runner advancement (after event)
  runner_first_to VARCHAR(10), -- 'home', 'second', 'third', 'out'
  runner_second_to VARCHAR(10),
  runner_third_to VARCHAR(10),
  batter_to VARCHAR(10), -- Where batter ended up

  -- Runs scored on play
  runs_scored INTEGER DEFAULT 0,
  rbi INTEGER DEFAULT 0,

  -- Errors
  is_error BOOLEAN DEFAULT false,
  error_position VARCHAR(2),

  -- Score after event
  home_score_after INTEGER DEFAULT 0,
  away_score_after INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(game_id, event_number)
);

-- Player game stats table (box score data)
CREATE TABLE player_game_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  team_id UUID NOT NULL REFERENCES league_teams(id),

  -- Batting stats
  plate_appearances INTEGER DEFAULT 0,
  at_bats INTEGER DEFAULT 0,
  runs INTEGER DEFAULT 0,
  hits INTEGER DEFAULT 0,
  doubles INTEGER DEFAULT 0,
  triples INTEGER DEFAULT 0,
  home_runs INTEGER DEFAULT 0,
  rbi INTEGER DEFAULT 0,
  walks INTEGER DEFAULT 0,
  strikeouts INTEGER DEFAULT 0,

  -- Pitching stats (if pitcher)
  innings_pitched_outs INTEGER DEFAULT 0,
  hits_allowed INTEGER DEFAULT 0,
  runs_allowed INTEGER DEFAULT 0,
  earned_runs INTEGER DEFAULT 0,
  walks_allowed INTEGER DEFAULT 0,
  strikeouts_pitched INTEGER DEFAULT 0,
  pitches_thrown INTEGER DEFAULT 0,

  -- Fielding stats
  putouts INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(game_id, player_id)
);

-- Indexes for game simulation tables
CREATE INDEX idx_leagues_status ON leagues(status);
CREATE INDEX idx_leagues_season ON leagues(season_year);

CREATE INDEX idx_league_teams_league ON league_teams(league_id);
CREATE INDEX idx_league_teams_record ON league_teams(league_id, wins DESC);

CREATE INDEX idx_league_rosters_team ON league_rosters(league_team_id);
CREATE INDEX idx_league_rosters_player ON league_rosters(player_season_id);

CREATE INDEX idx_games_league ON games(league_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id);
CREATE INDEX idx_games_date ON games(game_date);

CREATE INDEX idx_game_events_game ON game_events(game_id);
CREATE INDEX idx_game_events_sequence ON game_events(game_id, event_number);
CREATE INDEX idx_game_events_inning ON game_events(game_id, inning);
CREATE INDEX idx_game_events_batter ON game_events(batter_id);
CREATE INDEX idx_game_events_pitcher ON game_events(pitcher_id);

CREATE INDEX idx_player_game_stats_game ON player_game_stats(game_id);
CREATE INDEX idx_player_game_stats_player ON player_game_stats(player_id);

-- Triggers for updated_at
CREATE TRIGGER update_leagues_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_league_teams_updated_at
  BEFORE UPDATE ON league_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_league_rosters_updated_at
  BEFORE UPDATE ON league_rosters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_game_stats_updated_at
  BEFORE UPDATE ON player_game_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE leagues IS 'User-created fantasy leagues for game simulation';
COMMENT ON TABLE league_teams IS 'Teams within a league (drafted teams playing a season)';
COMMENT ON TABLE league_rosters IS 'Players assigned to each league team';
COMMENT ON TABLE games IS 'Simulated games between league teams';
COMMENT ON TABLE game_events IS 'Play-by-play event log for APBA simulation';
COMMENT ON TABLE player_game_stats IS 'Box score statistics for each player in each game';

COMMENT ON COLUMN game_events.dice_roll_1 IS 'First die (1-6)';
COMMENT ON COLUMN game_events.dice_roll_2 IS 'Second die (1-6)';
COMMENT ON COLUMN game_events.outcome_code IS 'References apba_outcomes table';
COMMENT ON COLUMN game_events.is_top_inning IS 'true = away team batting, false = home team batting';
