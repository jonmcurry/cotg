-- Migration: Add draft session link to leagues table and update constraints
-- Description: Adds draft_session_id FK for linking leagues to drafts, updates team caps
-- Date: 2026-02-02

ALTER TABLE leagues ADD COLUMN draft_session_id UUID REFERENCES draft_sessions(id) ON DELETE SET NULL;

-- Update season_year check to include 2026
ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_season_year_check;
ALTER TABLE leagues ADD CONSTRAINT leagues_season_year_check CHECK (season_year BETWEEN 1901 AND 2026);

-- Update num_teams cap from 30 to 32
ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_num_teams_check;
ALTER TABLE leagues ADD CONSTRAINT leagues_num_teams_check CHECK (num_teams BETWEEN 2 AND 32);

ALTER TABLE draft_sessions DROP CONSTRAINT IF EXISTS draft_sessions_num_teams_check;
ALTER TABLE draft_sessions ADD CONSTRAINT draft_sessions_num_teams_check CHECK (num_teams BETWEEN 2 AND 32);

-- Index for looking up league by draft session
CREATE INDEX idx_leagues_draft_session ON leagues(draft_session_id);

COMMENT ON COLUMN leagues.draft_session_id IS 'Link to the draft session that created this league';
