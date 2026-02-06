-- Add RLS Policies for Draft Tables
-- These permissive policies allow anonymous users to manage draft sessions
-- For production, you would want more restrictive policies with authentication

-- Draft Sessions
DROP POLICY IF EXISTS "Allow anonymous insert on draft_sessions" ON draft_sessions;
DROP POLICY IF EXISTS "Allow anonymous select on draft_sessions" ON draft_sessions;
DROP POLICY IF EXISTS "Allow anonymous update on draft_sessions" ON draft_sessions;
DROP POLICY IF EXISTS "Allow anonymous delete on draft_sessions" ON draft_sessions;

CREATE POLICY "Allow anonymous insert on draft_sessions"
  ON draft_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on draft_sessions"
  ON draft_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous update on draft_sessions"
  ON draft_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on draft_sessions"
  ON draft_sessions FOR DELETE
  TO anon
  USING (true);

-- Draft Teams
DROP POLICY IF EXISTS "Allow anonymous insert on draft_teams" ON draft_teams;
DROP POLICY IF EXISTS "Allow anonymous select on draft_teams" ON draft_teams;
DROP POLICY IF EXISTS "Allow anonymous update on draft_teams" ON draft_teams;
DROP POLICY IF EXISTS "Allow anonymous delete on draft_teams" ON draft_teams;

CREATE POLICY "Allow anonymous insert on draft_teams"
  ON draft_teams FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on draft_teams"
  ON draft_teams FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous update on draft_teams"
  ON draft_teams FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on draft_teams"
  ON draft_teams FOR DELETE
  TO anon
  USING (true);

-- Draft Picks
DROP POLICY IF EXISTS "Allow anonymous insert on draft_picks" ON draft_picks;
DROP POLICY IF EXISTS "Allow anonymous select on draft_picks" ON draft_picks;
DROP POLICY IF EXISTS "Allow anonymous update on draft_picks" ON draft_picks;
DROP POLICY IF EXISTS "Allow anonymous delete on draft_picks" ON draft_picks;

CREATE POLICY "Allow anonymous insert on draft_picks"
  ON draft_picks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on draft_picks"
  ON draft_picks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous update on draft_picks"
  ON draft_picks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on draft_picks"
  ON draft_picks FOR DELETE
  TO anon
  USING (true);

-- Draft Rankings
DROP POLICY IF EXISTS "Allow anonymous insert on draft_rankings" ON draft_rankings;
DROP POLICY IF EXISTS "Allow anonymous select on draft_rankings" ON draft_rankings;
DROP POLICY IF EXISTS "Allow anonymous update on draft_rankings" ON draft_rankings;
DROP POLICY IF EXISTS "Allow anonymous delete on draft_rankings" ON draft_rankings;

CREATE POLICY "Allow anonymous insert on draft_rankings"
  ON draft_rankings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on draft_rankings"
  ON draft_rankings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous update on draft_rankings"
  ON draft_rankings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on draft_rankings"
  ON draft_rankings FOR DELETE
  TO anon
  USING (true);

-- Draft Watchlist
DROP POLICY IF EXISTS "Allow anonymous insert on draft_watchlist" ON draft_watchlist;
DROP POLICY IF EXISTS "Allow anonymous select on draft_watchlist" ON draft_watchlist;
DROP POLICY IF EXISTS "Allow anonymous update on draft_watchlist" ON draft_watchlist;
DROP POLICY IF EXISTS "Allow anonymous delete on draft_watchlist" ON draft_watchlist;

CREATE POLICY "Allow anonymous insert on draft_watchlist"
  ON draft_watchlist FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous select on draft_watchlist"
  ON draft_watchlist FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous update on draft_watchlist"
  ON draft_watchlist FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on draft_watchlist"
  ON draft_watchlist FOR DELETE
  TO anon
  USING (true);
