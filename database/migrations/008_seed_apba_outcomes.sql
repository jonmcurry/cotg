-- Migration: Seed APBA outcomes data
-- Description: Insert common APBA outcome codes from parsed data
-- Date: 2026-01-27

-- Insert common batting outcomes
-- These are examples based on APBA reverse engineering
-- Full data will be loaded from JSON in Phase 1.6

INSERT INTO apba_outcomes (outcome_code, outcome_type, message, short_description, is_hit, is_extra_base, is_out, is_strikeout, is_walk) VALUES
  -- Hits
  (1, 'batting', 'Single to left field', 'Single', true, false, false, false, false),
  (2, 'batting', 'Single to center field', 'Single', true, false, false, false, false),
  (3, 'batting', 'Single to right field', 'Single', true, false, false, false, false),
  (4, 'batting', 'Double down the line', 'Double', true, true, false, false, false),
  (5, 'batting', 'Double to the gap', 'Double', true, true, false, false, false),
  (6, 'batting', 'Triple to the gap', 'Triple', true, true, false, false, false),
  (7, 'batting', 'Home run', 'Home Run', true, true, false, false, false),

  -- Outs
  (10, 'batting', 'Strikeout', 'Strikeout', false, false, true, true, false),
  (11, 'batting', 'Pop out to infield', 'Pop Out', false, false, true, false, false),
  (12, 'batting', 'Fly out to outfield', 'Fly Out', false, false, true, false, false),
  (13, 'batting', 'Ground out to infield', 'Ground Out', false, false, true, false, false),
  (14, 'batting', 'Line out', 'Line Out', false, false, true, false, false),
  (15, 'batting', 'Foul out', 'Foul Out', false, false, true, false, false),

  -- Walks and HBP
  (20, 'batting', 'Walk', 'Walk', false, false, false, false, true),
  (21, 'batting', 'Hit by pitch', 'HBP', true, false, false, false, false),

  -- Special outcomes
  (30, 'batting', 'Error on play', 'Error', true, false, false, false, false),
  (31, 'batting', 'Fielders choice', 'FC', false, false, false, false, false),
  (32, 'batting', 'Double play', 'DP', false, false, true, false, false),
  (33, 'batting', 'Sacrifice fly', 'Sac Fly', false, false, true, false, false),
  (34, 'batting', 'Sacrifice bunt', 'Sac Bunt', false, false, true, false, false)

ON CONFLICT (outcome_code) DO NOTHING;

-- Insert pitcher-specific outcomes
INSERT INTO apba_outcomes (outcome_code, outcome_type, message, short_description, is_hit, is_extra_base, is_out, is_strikeout, is_walk) VALUES
  (100, 'pitching', 'Strikeout looking', 'K Looking', false, false, true, true, false),
  (101, 'pitching', 'Strikeout swinging', 'K Swinging', false, false, true, true, false),
  (102, 'pitching', 'Walk', 'BB', false, false, false, false, true),
  (103, 'pitching', 'Wild pitch', 'Wild Pitch', false, false, false, false, false),
  (104, 'pitching', 'Balk', 'Balk', false, false, false, false, false)

ON CONFLICT (outcome_code) DO NOTHING;

-- Insert fielding-specific outcomes
INSERT INTO apba_outcomes (outcome_code, outcome_type, message, short_description, is_hit, is_extra_base, is_out, is_strikeout, is_walk) VALUES
  (200, 'fielding', 'Great catch!', 'Great Catch', false, false, true, false, false),
  (201, 'fielding', 'Error - ball dropped', 'Error', true, false, false, false, false),
  (202, 'fielding', 'Throwing error', 'Throwing Error', true, false, false, false, false)

ON CONFLICT (outcome_code) DO NOTHING;

COMMENT ON TABLE apba_outcomes IS 'Lookup table for APBA outcome codes and descriptions';
