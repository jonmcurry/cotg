-- Migration: Add control column to draft_teams
-- Date: 2026-02-03
-- Description: Add team control type column to support human vs CPU teams
--
-- This column was missing from initial deployment which caused 500 errors
-- when creating draft sessions via the backend API.

-- Add control column to draft_teams table
ALTER TABLE draft_teams
ADD COLUMN IF NOT EXISTS control TEXT NOT NULL DEFAULT 'cpu'
CHECK (control IN ('human', 'cpu'));

-- Add comment to document the column
COMMENT ON COLUMN draft_teams.control IS 'Team control type: human (user-controlled) or cpu (AI-controlled)';

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'draft_teams'
  AND column_name = 'control';
