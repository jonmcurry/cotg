-- Add APBA rating column to player_seasons table
-- Migration: 20260127_add_apba_rating
-- Purpose: Add APBA-style player rating (0-100 scale) for draft system
-- See: docs/analysis/apba-rating-system-reverse-engineered.md

-- Add apba_rating column
ALTER TABLE player_seasons
ADD COLUMN IF NOT EXISTS apba_rating DECIMAL(5,2);

-- Add index for sorting/filtering by rating (frequently used in draft queries)
CREATE INDEX IF NOT EXISTS idx_player_seasons_apba_rating
ON player_seasons(apba_rating DESC NULLS LAST);

-- Add comment explaining the column
COMMENT ON COLUMN player_seasons.apba_rating IS
'APBA-style player rating (0-100 scale) calculated from statistics. '
'Combines offensive value, defensive rating, and position scarcity for position players. '
'Combines ERA grade, control (K/BB), and performance (W+SV) for pitchers. '
'Used for draft rankings and player comparison.';

-- Verify column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'player_seasons'
    AND column_name = 'apba_rating'
  ) THEN
    RAISE NOTICE 'Column apba_rating added successfully to player_seasons table';
  ELSE
    RAISE EXCEPTION 'Failed to add apba_rating column';
  END IF;
END $$;
