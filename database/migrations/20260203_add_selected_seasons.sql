-- Migration: Add selected_seasons to draft_sessions
-- Description: Store selected seasons array in database for persistence
-- Date: 2026-02-03
-- FIXED Issue #13: selectedSeasons not persisted

-- Add selected_seasons column to draft_sessions table
ALTER TABLE draft_sessions
ADD COLUMN selected_seasons INTEGER[] NOT NULL DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN draft_sessions.selected_seasons IS 'Array of season years selected for the draft player pool';

-- Create index for querying by selected seasons
CREATE INDEX idx_draft_sessions_selected_seasons ON draft_sessions USING GIN (selected_seasons);
