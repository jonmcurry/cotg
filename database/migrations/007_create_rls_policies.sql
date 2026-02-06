-- Migration: Row Level Security (RLS) Policies
-- Description: Security policies for Supabase authentication
-- Date: 2026-01-27

-- Note: For Phase 1-3, we'll keep RLS permissive (public access)
-- In Phase 5 (Production), we'll add proper authentication

-- ========================================
-- Enable RLS on all tables
-- ========================================

-- Core data tables (read-only for all users)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE apba_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE apba_outcomes ENABLE ROW LEVEL SECURITY;

-- Draft tables (will need auth in future)
ALTER TABLE draft_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_watchlist ENABLE ROW LEVEL SECURITY;

-- Game simulation tables (will need auth in future)
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_game_stats ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PUBLIC READ ACCESS (Phase 1-3)
-- ========================================

-- Players: public read access
CREATE POLICY "Players are viewable by everyone"
  ON players FOR SELECT
  USING (true);

-- Player seasons: public read access
CREATE POLICY "Player seasons are viewable by everyone"
  ON player_seasons FOR SELECT
  USING (true);

-- Teams history: public read access
CREATE POLICY "Teams history is viewable by everyone"
  ON teams_history FOR SELECT
  USING (true);

-- APBA cards: public read access
CREATE POLICY "APBA cards are viewable by everyone"
  ON apba_cards FOR SELECT
  USING (true);

-- APBA outcomes: public read access
CREATE POLICY "APBA outcomes are viewable by everyone"
  ON apba_outcomes FOR SELECT
  USING (true);

-- ========================================
-- DRAFT SYSTEM POLICIES (Phase 1-3: Permissive)
-- ========================================

-- Draft sessions: anyone can view/create/update for now
CREATE POLICY "Draft sessions are viewable by everyone"
  ON draft_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create draft sessions"
  ON draft_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update draft sessions"
  ON draft_sessions FOR UPDATE
  USING (true);

-- Draft teams: public access
CREATE POLICY "Draft teams are viewable by everyone"
  ON draft_teams FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create draft teams"
  ON draft_teams FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update draft teams"
  ON draft_teams FOR UPDATE
  USING (true);

-- Draft picks: public access
CREATE POLICY "Draft picks are viewable by everyone"
  ON draft_picks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create draft picks"
  ON draft_picks FOR INSERT
  WITH CHECK (true);

-- Draft rankings: public access
CREATE POLICY "Draft rankings are viewable by everyone"
  ON draft_rankings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create/update draft rankings"
  ON draft_rankings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update draft rankings"
  ON draft_rankings FOR UPDATE
  USING (true);

-- Draft watchlist: public access
CREATE POLICY "Draft watchlist is viewable by everyone"
  ON draft_watchlist FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create/update draft watchlist"
  ON draft_watchlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update draft watchlist"
  ON draft_watchlist FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete draft watchlist"
  ON draft_watchlist FOR DELETE
  USING (true);

-- ========================================
-- GAME SIMULATION POLICIES (Phase 1-3: Permissive)
-- ========================================

-- Leagues: public access
CREATE POLICY "Leagues are viewable by everyone"
  ON leagues FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create leagues"
  ON leagues FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update leagues"
  ON leagues FOR UPDATE
  USING (true);

-- League teams: public access
CREATE POLICY "League teams are viewable by everyone"
  ON league_teams FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create league teams"
  ON league_teams FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update league teams"
  ON league_teams FOR UPDATE
  USING (true);

-- League rosters: public access
CREATE POLICY "League rosters are viewable by everyone"
  ON league_rosters FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create league rosters"
  ON league_rosters FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update league rosters"
  ON league_rosters FOR UPDATE
  USING (true);

-- Games: public access
CREATE POLICY "Games are viewable by everyone"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create games"
  ON games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update games"
  ON games FOR UPDATE
  USING (true);

-- Game events: public access
CREATE POLICY "Game events are viewable by everyone"
  ON game_events FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create game events"
  ON game_events FOR INSERT
  WITH CHECK (true);

-- Player game stats: public access
CREATE POLICY "Player game stats are viewable by everyone"
  ON player_game_stats FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create player game stats"
  ON player_game_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update player game stats"
  ON player_game_stats FOR UPDATE
  USING (true);

-- ========================================
-- FUTURE: Authentication-based policies
-- ========================================

/*
  Phase 5 TODO: Replace permissive policies with auth-based policies

  Example authenticated policies:

  -- Only session creator can update draft
  CREATE POLICY "Only creator can update draft session"
    ON draft_sessions FOR UPDATE
    USING (auth.uid() = created_by_user_id);

  -- Only team owner can update their team
  CREATE POLICY "Only owner can update draft team"
    ON draft_teams FOR UPDATE
    USING (auth.uid() = owner_user_id);

  -- Only league owner can update league
  CREATE POLICY "Only owner can update league"
    ON leagues FOR UPDATE
    USING (auth.uid() = created_by_user_id);

  -- Users can only see their own watchlist
  CREATE POLICY "Users can only view their own watchlist"
    ON draft_watchlist FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM draft_teams dt
        WHERE dt.id = draft_watchlist.draft_team_id
        AND dt.owner_user_id = auth.uid()
      )
    );
*/

COMMENT ON POLICY "Players are viewable by everyone" ON players IS 'Public read access to all players';
COMMENT ON POLICY "Draft sessions are viewable by everyone" ON draft_sessions IS 'Phase 1-3: Permissive access. Phase 5: Add auth checks';
