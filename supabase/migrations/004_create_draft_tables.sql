-- Migration: Create draft system tables
-- Description: Tables for fantasy draft sessions, teams, and picks
-- Date: 2026-01-27

-- Draft sessions table
CREATE TABLE draft_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Session details
  session_name VARCHAR(100) NOT NULL,
  session_description TEXT,

  -- Draft configuration
  season_year INTEGER NOT NULL CHECK (season_year BETWEEN 1901 AND 2025),
  num_teams INTEGER NOT NULL CHECK (num_teams BETWEEN 2 AND 30),
  num_rounds INTEGER NOT NULL CHECK (num_rounds BETWEEN 1 AND 50),
  draft_type VARCHAR(10) NOT NULL CHECK (draft_type IN ('snake', 'linear')),

  -- Player pool filters
  min_at_bats INTEGER DEFAULT 0, -- Minimum ABs for batters
  min_innings_pitched INTEGER DEFAULT 0, -- Minimum IP for pitchers
  eligible_positions TEXT[], -- Filter by positions (e.g., ['P', '1B', 'OF'])

  -- Draft state
  status VARCHAR(20) NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'in_progress', 'paused', 'completed', 'abandoned')),
  current_pick_number INTEGER DEFAULT 1,
  current_round INTEGER DEFAULT 1,
  current_team_picking UUID, -- References draft_teams(id)

  -- Timer settings
  pick_time_limit_seconds INTEGER, -- NULL = no time limit
  time_limit_enabled BOOLEAN DEFAULT false,

  -- Ownership
  created_by_user_id UUID, -- For future auth integration
  is_public BOOLEAN DEFAULT false,

  -- Metadata
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Draft teams table
CREATE TABLE draft_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  draft_session_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,

  -- Team details
  team_name VARCHAR(100) NOT NULL,
  team_abbreviation VARCHAR(5),
  owner_name VARCHAR(100),
  owner_user_id UUID, -- For future auth integration

  -- Draft order
  draft_order INTEGER NOT NULL, -- 1, 2, 3, etc.

  -- Team colors (for UI)
  primary_color VARCHAR(7) DEFAULT '#2C2C2C', -- Hex color
  secondary_color VARCHAR(7) DEFAULT '#8B2635',

  -- Roster limits
  max_batters INTEGER DEFAULT 15,
  max_pitchers INTEGER DEFAULT 10,
  max_bench INTEGER DEFAULT 5,

  -- Current roster counts (updated on picks)
  current_batters INTEGER DEFAULT 0,
  current_pitchers INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(draft_session_id, draft_order),
  UNIQUE(draft_session_id, team_name)
);

-- Draft picks table
CREATE TABLE draft_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  draft_session_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
  draft_team_id UUID NOT NULL REFERENCES draft_teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  player_season_id UUID NOT NULL REFERENCES player_seasons(id),

  -- Pick details
  pick_number INTEGER NOT NULL, -- Overall pick number (1, 2, 3, ...)
  round INTEGER NOT NULL,
  pick_in_round INTEGER NOT NULL, -- 1, 2, 3, ... within the round

  -- Pick metadata
  picked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_taken_seconds INTEGER, -- How long the pick took

  -- Auto-pick or manual
  was_autopick BOOLEAN DEFAULT false,
  autopick_reason TEXT, -- 'time_expired', 'best_available', etc.

  -- Constraints
  UNIQUE(draft_session_id, pick_number),
  UNIQUE(draft_session_id, player_season_id) -- Can't draft same player twice
);

-- Draft rankings table (for TRD algorithm and user preferences)
CREATE TABLE draft_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  draft_session_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
  draft_team_id UUID REFERENCES draft_teams(id) ON DELETE CASCADE, -- NULL = global TRD rankings
  player_season_id UUID NOT NULL REFERENCES player_seasons(id),

  -- Ranking data
  rank INTEGER NOT NULL, -- 1, 2, 3, ...
  ranking_score DECIMAL(10,2), -- TRD algorithm score or custom score

  -- Ranking type
  ranking_type VARCHAR(20) NOT NULL CHECK (ranking_type IN ('trd_global', 'trd_position', 'user_custom')),
  position_filter VARCHAR(2), -- For position-specific rankings

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(draft_session_id, draft_team_id, player_season_id, ranking_type)
);

-- Watchlist table (players a team is watching)
CREATE TABLE draft_watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  draft_team_id UUID NOT NULL REFERENCES draft_teams(id) ON DELETE CASCADE,
  player_season_id UUID NOT NULL REFERENCES player_seasons(id),

  -- Watchlist metadata
  notes TEXT,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1 = highest

  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(draft_team_id, player_season_id)
);

-- Indexes for draft tables
CREATE INDEX idx_draft_sessions_status ON draft_sessions(status);
CREATE INDEX idx_draft_sessions_season ON draft_sessions(season_year);
CREATE INDEX idx_draft_sessions_created_by ON draft_sessions(created_by_user_id);

CREATE INDEX idx_draft_teams_session ON draft_teams(draft_session_id);
CREATE INDEX idx_draft_teams_order ON draft_teams(draft_session_id, draft_order);

CREATE INDEX idx_draft_picks_session ON draft_picks(draft_session_id);
CREATE INDEX idx_draft_picks_team ON draft_picks(draft_team_id);
CREATE INDEX idx_draft_picks_round ON draft_picks(draft_session_id, round);
CREATE INDEX idx_draft_picks_player ON draft_picks(player_season_id);

CREATE INDEX idx_draft_rankings_session ON draft_rankings(draft_session_id);
CREATE INDEX idx_draft_rankings_team ON draft_rankings(draft_team_id);
CREATE INDEX idx_draft_rankings_rank ON draft_rankings(draft_session_id, ranking_type, rank);

CREATE INDEX idx_draft_watchlist_team ON draft_watchlist(draft_team_id);
CREATE INDEX idx_draft_watchlist_priority ON draft_watchlist(draft_team_id, priority DESC);

-- Triggers for updated_at
CREATE TRIGGER update_draft_sessions_updated_at
  BEFORE UPDATE ON draft_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draft_teams_updated_at
  BEFORE UPDATE ON draft_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draft_rankings_updated_at
  BEFORE UPDATE ON draft_rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE draft_sessions IS 'Fantasy draft sessions with configuration and state';
COMMENT ON TABLE draft_teams IS 'Teams participating in a draft session';
COMMENT ON TABLE draft_picks IS 'Record of all draft picks made during a session';
COMMENT ON TABLE draft_rankings IS 'Player rankings (TRD algorithm or custom) for draft guidance';
COMMENT ON TABLE draft_watchlist IS 'Players a team is watching during the draft';

COMMENT ON COLUMN draft_sessions.draft_type IS 'snake = reverse order each round, linear = same order';
COMMENT ON COLUMN draft_picks.was_autopick IS 'True if pick was automatically made (time expired or best available)';
COMMENT ON COLUMN draft_rankings.ranking_type IS 'trd_global = overall TRD, trd_position = by position, user_custom = user override';
