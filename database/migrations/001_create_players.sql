-- Migration: Create players table
-- Description: Core player biographical data from Lahman People.csv
-- Date: 2026-01-27

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table: biographical information
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Lahman identifiers
  lahman_id VARCHAR(9) NOT NULL UNIQUE, -- playerID from Lahman (e.g., 'aaronha01')
  lahman_numeric_id INTEGER, -- ID column from Lahman
  bbref_id VARCHAR(9), -- Baseball Reference ID
  retro_id VARCHAR(8), -- Retrosheet ID

  -- Name fields
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  full_name VARCHAR(100),
  name_given VARCHAR(100), -- Full legal name

  -- Birth information
  birth_year INTEGER,
  birth_month INTEGER,
  birth_day INTEGER,
  birth_city VARCHAR(100),
  birth_state VARCHAR(2),
  birth_country VARCHAR(50),

  -- Death information (if applicable)
  death_year INTEGER,
  death_month INTEGER,
  death_day INTEGER,
  death_city VARCHAR(100),
  death_state VARCHAR(2),
  death_country VARCHAR(50),

  -- Physical attributes
  weight INTEGER, -- in pounds
  height INTEGER, -- in inches
  bats CHAR(1) CHECK (bats IN ('L', 'R', 'B')), -- Left, Right, Both
  throws CHAR(1) CHECK (throws IN ('L', 'R', 'B')),

  -- Career dates
  debut_date DATE, -- First MLB game
  final_game_date DATE, -- Last MLB game
  debut_year INTEGER,
  final_year INTEGER,

  -- Computed fields (for UI convenience)
  display_name VARCHAR(100) GENERATED ALWAYS AS (
    COALESCE(first_name || ' ' || last_name, last_name, first_name)
  ) STORED,

  career_span VARCHAR(20) GENERATED ALWAYS AS (
    CASE
      WHEN debut_year IS NOT NULL AND final_year IS NOT NULL
      THEN debut_year::TEXT || '-' || final_year::TEXT
      ELSE NULL
    END
  ) STORED,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_players_lahman_id ON players(lahman_id);
CREATE INDEX idx_players_last_name ON players(last_name);
CREATE INDEX idx_players_debut_year ON players(debut_year);
CREATE INDEX idx_players_final_year ON players(final_year);
CREATE INDEX idx_players_display_name ON players(display_name);

-- Full-text search index for player names
CREATE INDEX idx_players_name_search ON players USING GIN (
  to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(name_given, ''))
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE players IS 'Core player biographical data from Lahman People.csv';
COMMENT ON COLUMN players.lahman_id IS 'Unique Lahman player ID (e.g., aaronha01)';
COMMENT ON COLUMN players.display_name IS 'Computed field: First Last for UI display';
COMMENT ON COLUMN players.career_span IS 'Computed field: YYYY-YYYY for career range';
