-- Migration: Add DH rule and draft session link to leagues table
-- Description: Adds use_dh boolean and draft_session_id FK for linking leagues to drafts
-- Date: 2026-02-02

ALTER TABLE leagues ADD COLUMN use_dh BOOLEAN DEFAULT true;
ALTER TABLE leagues ADD COLUMN draft_session_id UUID REFERENCES draft_sessions(id) ON DELETE SET NULL;

-- Update season_year check to include 2026
ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_season_year_check;
ALTER TABLE leagues ADD CONSTRAINT leagues_season_year_check CHECK (season_year BETWEEN 1901 AND 2026);

-- Index for looking up league by draft session
CREATE INDEX idx_leagues_draft_session ON leagues(draft_session_id);

COMMENT ON COLUMN leagues.use_dh IS 'Whether the designated hitter rule is enabled';
COMMENT ON COLUMN leagues.draft_session_id IS 'Link to the draft session that created this league';
