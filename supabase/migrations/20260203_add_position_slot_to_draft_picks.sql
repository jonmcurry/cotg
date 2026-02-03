-- Migration: Add position and slot_number to draft_picks
-- Date: 2026-02-03
-- Description: Adds position and slot_number columns to draft_picks table to enable
--              proper roster reconstruction when reloading draft sessions.
--
-- Problem: Without these columns, loadSession() cannot reconstruct rosters correctly
--          and uses broken "find first unfilled slot" logic, causing roster corruption.
--
-- Solution: Store the exact position (C, 1B, 2B, etc.) and slot number (1, 2, 3, etc.)
--           for each pick so rosters can be perfectly reconstructed from database.

-- Step 1: Add columns (nullable initially for existing data)
ALTER TABLE draft_picks
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS slot_number INTEGER;

-- Step 2: Delete corrupted test data (user mentioned 672 picks from testing)
-- Safer to delete than try to backfill with guessed positions
DELETE FROM draft_picks WHERE position IS NULL;

-- Step 3: Now make columns NOT NULL (all remaining rows have values)
ALTER TABLE draft_picks
  ALTER COLUMN position SET NOT NULL,
  ALTER COLUMN slot_number SET NOT NULL;

-- Step 4: Add check constraint for valid positions (drop first if exists)
DO $$
BEGIN
  ALTER TABLE draft_picks DROP CONSTRAINT IF EXISTS check_valid_position;
  ALTER TABLE draft_picks ADD CONSTRAINT check_valid_position
    CHECK (position IN ('C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CL'));
END $$;

-- Step 5: Add check constraint for slot_number (drop first if exists)
DO $$
BEGIN
  ALTER TABLE draft_picks DROP CONSTRAINT IF EXISTS check_valid_slot_number;
  ALTER TABLE draft_picks ADD CONSTRAINT check_valid_slot_number
    CHECK (slot_number > 0);
END $$;

-- Step 6: Add index for efficient roster queries
CREATE INDEX IF NOT EXISTS idx_draft_picks_position_slot
  ON draft_picks(draft_team_id, position, slot_number);

-- Verification: Check the schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'draft_picks'
ORDER BY ordinal_position;

-- Verification: Confirm no picks remain (all corrupted data deleted)
SELECT COUNT(*) as remaining_picks FROM draft_picks;
