-- Migration: Fix position CHECK constraint to include OF and BN
-- Date: 2026-02-03
-- Description: Updates the check_valid_position constraint to include 'OF' (Outfield)
--              and 'BN' (Bench) positions that are used by the application code.
--
-- Problem: The previous constraint only allowed:
--          C, 1B, 2B, 3B, SS, LF, CF, RF, DH, SP, RP, CL
--          But the application code uses 'OF' (Outfield) and 'BN' (Bench) positions,
--          causing 500 errors when CPU tries to draft players for these positions.
--
-- Solution: Update the constraint to include all positions used by the application:
--          C, 1B, 2B, 3B, SS, LF, CF, RF, OF, DH, SP, RP, CL, BN

-- Drop and recreate the position constraint with complete position list
DO $$
BEGIN
  -- Drop the existing constraint
  ALTER TABLE draft_picks DROP CONSTRAINT IF EXISTS check_valid_position;

  -- Add the updated constraint with OF and BN included
  ALTER TABLE draft_picks ADD CONSTRAINT check_valid_position
    CHECK (position IN (
      'C',   -- Catcher
      '1B',  -- First Base
      '2B',  -- Second Base
      '3B',  -- Third Base
      'SS',  -- Shortstop
      'LF',  -- Left Field
      'CF',  -- Center Field
      'RF',  -- Right Field
      'OF',  -- Outfield (generic)
      'DH',  -- Designated Hitter
      'SP',  -- Starting Pitcher
      'RP',  -- Relief Pitcher
      'CL',  -- Closer
      'BN'   -- Bench
    ));
END $$;

-- Verification: Check the constraint
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'draft_picks'::regclass
  AND conname = 'check_valid_position';
