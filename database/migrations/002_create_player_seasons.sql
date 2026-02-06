-- Migration: Create player_seasons table
-- Description: Season-by-season statistics combining Batting, Pitching, and Fielding data
-- Date: 2026-01-27

-- Teams history table (for foreign key relationships)
CREATE TABLE teams_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id VARCHAR(3) NOT NULL, -- e.g., 'NYA', 'BOS', 'CHN'
  year INTEGER NOT NULL,
  league_id VARCHAR(2), -- AL, NL, etc.
  franchise_id VARCHAR(3),
  division VARCHAR(2),
  team_name VARCHAR(100),
  park_name VARCHAR(100),

  -- Team season stats (for context)
  wins INTEGER,
  losses INTEGER,
  rank INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(team_id, year)
);

CREATE INDEX idx_teams_history_year ON teams_history(year);
CREATE INDEX idx_teams_history_team_id ON teams_history(team_id);

-- Player seasons table: comprehensive season statistics
CREATE TABLE player_seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_history_id UUID REFERENCES teams_history(id),

  -- Season identifiers
  year INTEGER NOT NULL,
  stint INTEGER DEFAULT 1, -- Multiple teams in same season
  team_id VARCHAR(3), -- Direct reference for queries
  league_id VARCHAR(2),

  -- Position information
  primary_position VARCHAR(2), -- 1B, 2B, SS, 3B, OF, C, P, DH
  games_by_position JSONB, -- {"P": 10, "1B": 5} for multi-position players

  -- General stats
  games INTEGER DEFAULT 0,
  games_started INTEGER,

  -- ========================================
  -- BATTING STATISTICS
  -- ========================================
  at_bats INTEGER DEFAULT 0,
  runs INTEGER DEFAULT 0,
  hits INTEGER DEFAULT 0,
  doubles INTEGER DEFAULT 0,
  triples INTEGER DEFAULT 0,
  home_runs INTEGER DEFAULT 0,
  rbi INTEGER DEFAULT 0,
  stolen_bases INTEGER DEFAULT 0,
  caught_stealing INTEGER DEFAULT 0,
  walks INTEGER DEFAULT 0,
  strikeouts INTEGER DEFAULT 0,
  intentional_walks INTEGER DEFAULT 0,
  hit_by_pitch INTEGER DEFAULT 0,
  sacrifice_hits INTEGER DEFAULT 0,
  sacrifice_flies INTEGER DEFAULT 0,
  grounded_into_double_play INTEGER DEFAULT 0,

  -- Calculated batting stats
  batting_avg DECIMAL(4,3), -- e.g., 0.300
  on_base_pct DECIMAL(4,3),
  slugging_pct DECIMAL(4,3),
  ops DECIMAL(4,3), -- OBP + SLG
  total_bases INTEGER, -- 1B + 2*2B + 3*3B + 4*HR

  -- Bill James offensive metrics
  runs_created_basic DECIMAL(6,2),
  runs_created_advanced DECIMAL(6,2),
  isolated_power DECIMAL(4,3), -- ISO = SLG - AVG
  secondary_avg DECIMAL(4,3), -- SecA
  power_speed_number DECIMAL(6,2), -- P/S Number

  -- ========================================
  -- PITCHING STATISTICS
  -- ========================================
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  games_pitched INTEGER DEFAULT 0,
  games_started_pitcher INTEGER DEFAULT 0,
  complete_games INTEGER DEFAULT 0,
  shutouts INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  innings_pitched_outs INTEGER DEFAULT 0, -- Stored as outs (IP * 3)
  innings_pitched DECIMAL(5,1), -- Calculated: outs / 3

  hits_allowed INTEGER DEFAULT 0,
  runs_allowed INTEGER DEFAULT 0,
  earned_runs INTEGER DEFAULT 0,
  home_runs_allowed INTEGER DEFAULT 0,
  walks_allowed INTEGER DEFAULT 0,
  strikeouts_pitched INTEGER DEFAULT 0,
  intentional_walks_allowed INTEGER DEFAULT 0,
  hit_batters INTEGER DEFAULT 0,
  wild_pitches INTEGER DEFAULT 0,
  balks INTEGER DEFAULT 0,
  batters_faced INTEGER DEFAULT 0,

  -- Calculated pitching stats
  era DECIMAL(4,2), -- Earned Run Average
  whip DECIMAL(4,2), -- (BB + H) / IP
  k_per_9 DECIMAL(4,2), -- Strikeouts per 9 innings
  bb_per_9 DECIMAL(4,2), -- Walks per 9 innings
  k_bb_ratio DECIMAL(4,2), -- K/BB ratio
  opponent_batting_avg DECIMAL(4,3),

  -- Bill James pitching metrics
  component_era DECIMAL(4,2),
  game_score DECIMAL(5,1), -- Average game score

  -- ========================================
  -- FIELDING STATISTICS
  -- ========================================
  innings_fielded_outs INTEGER, -- InnOuts from Lahman
  putouts INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  double_plays INTEGER DEFAULT 0,
  passed_balls INTEGER DEFAULT 0, -- Catchers only

  -- Calculated fielding stats
  fielding_pct DECIMAL(4,3), -- (PO + A) / (PO + A + E)
  range_factor DECIMAL(4,2), -- Bill James: (PO + A) * 9 / Innings

  -- ========================================
  -- ADVANCED / MODERN METRICS
  -- ========================================
  war DECIMAL(4,1), -- Wins Above Replacement (calculated)

  -- Metadata
  is_primary_season BOOLEAN DEFAULT true, -- False if traded mid-season (stint > 1)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(player_id, year, stint)
);

-- Indexes for common queries
CREATE INDEX idx_player_seasons_player_id ON player_seasons(player_id);
CREATE INDEX idx_player_seasons_year ON player_seasons(year);
CREATE INDEX idx_player_seasons_player_year ON player_seasons(player_id, year);
CREATE INDEX idx_player_seasons_team_year ON player_seasons(team_id, year);
CREATE INDEX idx_player_seasons_position ON player_seasons(primary_position);

-- Indexes for sorting/filtering (UI queries)
CREATE INDEX idx_player_seasons_batting_avg ON player_seasons(batting_avg DESC NULLS LAST) WHERE at_bats >= 300;
CREATE INDEX idx_player_seasons_home_runs ON player_seasons(home_runs DESC) WHERE at_bats >= 300;
CREATE INDEX idx_player_seasons_era ON player_seasons(era ASC NULLS LAST) WHERE innings_pitched_outs >= 450; -- 150 IP
CREATE INDEX idx_player_seasons_war ON player_seasons(war DESC NULLS LAST);

-- Trigger for updated_at
CREATE TRIGGER update_player_seasons_updated_at
  BEFORE UPDATE ON player_seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_history_updated_at
  BEFORE UPDATE ON teams_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE player_seasons IS 'Season-by-season player statistics combining batting, pitching, and fielding data';
COMMENT ON COLUMN player_seasons.stint IS 'Sequential number for players traded during season (1 = first team)';
COMMENT ON COLUMN player_seasons.innings_pitched_outs IS 'Innings pitched stored as outs (multiply IP by 3)';
COMMENT ON COLUMN player_seasons.games_by_position IS 'JSON object tracking games played at each position';
COMMENT ON COLUMN player_seasons.is_primary_season IS 'False for stint > 1 (traded players)';
