-- Migration: Create APBA cards table
-- Description: APBA-style player cards with dice outcome arrays
-- Date: 2026-01-27

-- APBA outcome reference table (from parsed outcome tables)
CREATE TABLE apba_outcomes (
  id SERIAL PRIMARY KEY,
  outcome_code INTEGER NOT NULL UNIQUE,
  outcome_type VARCHAR(20) NOT NULL, -- 'batting', 'pitching', 'fielding'
  message TEXT,
  short_description VARCHAR(100),

  -- Outcome classification
  is_hit BOOLEAN DEFAULT false,
  is_extra_base BOOLEAN DEFAULT false,
  is_out BOOLEAN DEFAULT false,
  is_strikeout BOOLEAN DEFAULT false,
  is_walk BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_apba_outcomes_code ON apba_outcomes(outcome_code);
CREATE INDEX idx_apba_outcomes_type ON apba_outcomes(outcome_type);

-- APBA player cards table
CREATE TABLE apba_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_season_id UUID NOT NULL REFERENCES player_seasons(id) ON DELETE CASCADE,

  -- Season identifier
  season INTEGER NOT NULL,

  -- Card metadata
  card_number INTEGER, -- APBA card number (if we assign them)
  card_type VARCHAR(10) CHECK (card_type IN ('batter', 'pitcher')),

  -- ========================================
  -- BATTING CARD DATA
  -- ========================================

  -- Dice outcomes (36 outcomes for 2d6)
  -- Index 0 = roll of 2 (1+1)
  -- Index 1 = roll of 3 (1+2, 2+1) - average of both
  -- ...
  -- Index 10 = roll of 12 (6+6)
  dice_outcomes INTEGER[36], -- Array of outcome codes referencing apba_outcomes

  -- Fielding grade (1-9, lower is better)
  fielding_grade INTEGER CHECK (fielding_grade BETWEEN 1 AND 9),

  -- Speed rating
  speed_rating INTEGER CHECK (speed_rating BETWEEN 1 AND 20),

  -- Hit advancement rating (for runners on base)
  advancement_rating VARCHAR(2), -- 'A', 'B', 'C', etc.

  -- ========================================
  -- PITCHING CARD DATA
  -- ========================================

  -- Pitcher grade (A-E)
  pitcher_grade CHAR(1) CHECK (pitcher_grade IN ('A', 'B', 'C', 'D', 'E')),

  -- Pitcher dice outcomes (when grade A uses pitcher's card)
  pitcher_dice_outcomes INTEGER[36],

  -- Pitcher control rating
  control_rating INTEGER CHECK (control_rating BETWEEN 1 AND 10),

  -- Endurance (for starters)
  endurance INTEGER CHECK (endurance BETWEEN 1 AND 10),

  -- ========================================
  -- GENERATION METADATA
  -- ========================================

  -- Algorithm version (for tracking changes to generation algorithm)
  generation_algorithm_version VARCHAR(10) DEFAULT '1.0',

  -- Was this card validated against original APBA data?
  validated_against_original BOOLEAN DEFAULT false,

  -- Validation score (if compared to real APBA card)
  validation_similarity_score DECIMAL(4,2),

  -- Generation notes
  generation_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(player_season_id) -- One card per player per season
);

-- Indexes
CREATE INDEX idx_apba_cards_player_id ON apba_cards(player_id);
CREATE INDEX idx_apba_cards_season ON apba_cards(season);
CREATE INDEX idx_apba_cards_player_season ON apba_cards(player_id, season);
CREATE INDEX idx_apba_cards_fielding_grade ON apba_cards(fielding_grade);
CREATE INDEX idx_apba_cards_pitcher_grade ON apba_cards(pitcher_grade);
CREATE INDEX idx_apba_cards_validated ON apba_cards(validated_against_original) WHERE validated_against_original = true;

-- Trigger for updated_at
CREATE TRIGGER update_apba_cards_updated_at
  BEFORE UPDATE ON apba_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE apba_cards IS 'APBA-style player cards with dice outcome arrays for game simulation';
COMMENT ON COLUMN apba_cards.dice_outcomes IS 'Array of 36 outcome codes (one per 2d6 result)';
COMMENT ON COLUMN apba_cards.fielding_grade IS 'APBA fielding grade: 1 (best) to 9 (worst)';
COMMENT ON COLUMN apba_cards.pitcher_grade IS 'A (ace) to E (batting practice)';
COMMENT ON COLUMN apba_cards.validated_against_original IS 'True if compared against real APBA card from 1921/1943/1971';
