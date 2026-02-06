-- Migration: Create helper views for common UI queries
-- Description: Materialized views and helper functions for frontend
-- Date: 2026-01-27

-- ========================================
-- VIEW: Player Seasons with Calculated Stats
-- ========================================
CREATE OR REPLACE VIEW v_player_seasons_enriched AS
SELECT
  ps.*,
  p.lahman_id,
  p.first_name,
  p.last_name,
  p.display_name,
  p.bats,
  p.throws,
  th.team_name,
  th.league_id,

  -- Calculate missing stats on the fly
  CASE
    WHEN ps.at_bats >= 1 THEN ROUND((ps.hits::DECIMAL / ps.at_bats), 3)
    ELSE NULL
  END AS calculated_avg,

  CASE
    WHEN (ps.at_bats + ps.walks + ps.hit_by_pitch + ps.sacrifice_flies) > 0
    THEN ROUND(
      (ps.hits + ps.walks + ps.hit_by_pitch)::DECIMAL /
      (ps.at_bats + ps.walks + ps.hit_by_pitch + ps.sacrifice_flies), 3
    )
    ELSE NULL
  END AS calculated_obp,

  CASE
    WHEN ps.at_bats >= 1 THEN ROUND((ps.total_bases::DECIMAL / ps.at_bats), 3)
    ELSE NULL
  END AS calculated_slg,

  -- Pitching ratios
  CASE
    WHEN ps.innings_pitched_outs >= 1
    THEN ROUND(
      (9.0 * ps.strikeouts_pitched / (ps.innings_pitched_outs / 3.0)), 2
    )
    ELSE NULL
  END AS calculated_k_per_9,

  CASE
    WHEN ps.innings_pitched_outs >= 1
    THEN ROUND(
      (9.0 * ps.walks_allowed / (ps.innings_pitched_outs / 3.0)), 2
    )
    ELSE NULL
  END AS calculated_bb_per_9,

  -- Qualified batter/pitcher flags
  ps.at_bats >= 300 AS is_qualified_batter,
  ps.innings_pitched_outs >= 450 AS is_qualified_pitcher -- 150 IP

FROM player_seasons ps
JOIN players p ON ps.player_id = p.id
LEFT JOIN teams_history th ON ps.team_history_id = th.id;

COMMENT ON VIEW v_player_seasons_enriched IS 'Player seasons with calculated stats and player/team names for UI display';

-- ========================================
-- VIEW: APBA Cards with Player Details
-- ========================================
CREATE OR REPLACE VIEW v_apba_cards_enriched AS
SELECT
  ac.*,
  p.display_name,
  p.first_name,
  p.last_name,
  ps.primary_position,
  ps.batting_avg,
  ps.home_runs,
  ps.rbi,
  ps.era,
  ps.wins,
  ps.strikeouts_pitched

FROM apba_cards ac
JOIN players p ON ac.player_id = p.id
JOIN player_seasons ps ON ac.player_season_id = ps.id;

COMMENT ON VIEW v_apba_cards_enriched IS 'APBA cards with player names and season stats for UI display';

-- ========================================
-- VIEW: Draft Board (Available Players)
-- ========================================
CREATE OR REPLACE VIEW v_draft_board AS
SELECT
  ps.id AS player_season_id,
  p.id AS player_id,
  p.display_name,
  ps.year,
  ps.primary_position,
  ps.team_id,

  -- Batting stats
  ps.games,
  ps.at_bats,
  ps.batting_avg,
  ps.home_runs,
  ps.rbi,
  ps.stolen_bases,
  ps.ops,

  -- Pitching stats
  ps.wins,
  ps.losses,
  ps.era,
  ps.innings_pitched_outs / 3.0 AS innings_pitched,
  ps.strikeouts_pitched,
  ps.whip,

  -- Bill James stats
  ps.runs_created_basic,
  ps.isolated_power,
  ps.war,

  -- Qualified flags
  ps.at_bats >= 300 AS is_qualified_batter,
  ps.innings_pitched_outs >= 450 AS is_qualified_pitcher,

  -- APBA card exists
  EXISTS(
    SELECT 1 FROM apba_cards ac
    WHERE ac.player_season_id = ps.id
  ) AS has_apba_card

FROM player_seasons ps
JOIN players p ON ps.player_id = p.id
WHERE ps.is_primary_season = true; -- Exclude mid-season trades

COMMENT ON VIEW v_draft_board IS 'Available players for drafting with key stats for sorting/filtering';

-- ========================================
-- VIEW: League Standings
-- ========================================
CREATE OR REPLACE VIEW v_league_standings AS
SELECT
  lt.*,
  l.league_name,
  l.season_year,

  -- Calculate winning percentage
  CASE
    WHEN (lt.wins + lt.losses) > 0
    THEN ROUND(lt.wins::DECIMAL / (lt.wins + lt.losses), 3)
    ELSE 0.000
  END AS calculated_win_pct,

  -- Calculate run differential
  lt.runs_scored - lt.runs_allowed AS run_differential,

  -- Rank within league
  RANK() OVER (
    PARTITION BY lt.league_id
    ORDER BY lt.wins DESC, (lt.runs_scored - lt.runs_allowed) DESC
  ) AS division_rank

FROM league_teams lt
JOIN leagues l ON lt.league_id = l.id
ORDER BY lt.league_id, lt.wins DESC;

COMMENT ON VIEW v_league_standings IS 'League standings with calculated win percentage and rankings';

-- ========================================
-- FUNCTION: Get Player Career Stats
-- ========================================
CREATE OR REPLACE FUNCTION get_player_career_stats(p_player_id UUID)
RETURNS TABLE (
  total_seasons INTEGER,
  career_games INTEGER,
  career_at_bats INTEGER,
  career_hits INTEGER,
  career_home_runs INTEGER,
  career_rbi INTEGER,
  career_avg DECIMAL(4,3),
  career_ops DECIMAL(4,3),
  career_war DECIMAL(6,1),
  best_season_year INTEGER,
  best_season_war DECIMAL(4,1)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ps.year)::INTEGER AS total_seasons,
    SUM(ps.games)::INTEGER AS career_games,
    SUM(ps.at_bats)::INTEGER AS career_at_bats,
    SUM(ps.hits)::INTEGER AS career_hits,
    SUM(ps.home_runs)::INTEGER AS career_home_runs,
    SUM(ps.rbi)::INTEGER AS career_rbi,

    CASE
      WHEN SUM(ps.at_bats) > 0
      THEN ROUND((SUM(ps.hits)::DECIMAL / SUM(ps.at_bats)), 3)
      ELSE NULL
    END AS career_avg,

    CASE
      WHEN SUM(ps.at_bats) > 0
      THEN ROUND(AVG(ps.ops), 3)
      ELSE NULL
    END AS career_ops,

    SUM(ps.war) AS career_war,

    (SELECT year FROM player_seasons
     WHERE player_id = p_player_id
     ORDER BY war DESC NULLS LAST
     LIMIT 1) AS best_season_year,

    (SELECT war FROM player_seasons
     WHERE player_id = p_player_id
     ORDER BY war DESC NULLS LAST
     LIMIT 1) AS best_season_war

  FROM player_seasons ps
  WHERE ps.player_id = p_player_id
    AND ps.is_primary_season = true;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_player_career_stats IS 'Calculate career totals and best season for a player';

-- ========================================
-- FUNCTION: Get Draft Pick Order
-- ========================================
CREATE OR REPLACE FUNCTION get_draft_pick_order(
  p_draft_session_id UUID,
  p_round INTEGER
)
RETURNS TABLE (
  pick_number INTEGER,
  team_id UUID,
  team_name VARCHAR(100),
  draft_order INTEGER
) AS $$
DECLARE
  v_num_teams INTEGER;
  v_draft_type VARCHAR(10);
BEGIN
  -- Get draft configuration
  SELECT num_teams, draft_type
  INTO v_num_teams, v_draft_type
  FROM draft_sessions
  WHERE id = p_draft_session_id;

  -- Snake draft: reverse order on even rounds
  IF v_draft_type = 'snake' AND p_round % 2 = 0 THEN
    RETURN QUERY
    SELECT
      ((p_round - 1) * v_num_teams + (v_num_teams - dt.draft_order + 1))::INTEGER AS pick_number,
      dt.id AS team_id,
      dt.team_name,
      dt.draft_order
    FROM draft_teams dt
    WHERE dt.draft_session_id = p_draft_session_id
    ORDER BY dt.draft_order DESC;
  ELSE
    -- Linear draft or odd snake rounds: normal order
    RETURN QUERY
    SELECT
      ((p_round - 1) * v_num_teams + dt.draft_order)::INTEGER AS pick_number,
      dt.id AS team_id,
      dt.team_name,
      dt.draft_order
    FROM draft_teams dt
    WHERE dt.draft_session_id = p_draft_session_id
    ORDER BY dt.draft_order;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_draft_pick_order IS 'Calculate pick order for a given round (handles snake draft)';

-- ========================================
-- FUNCTION: Calculate Next Pick
-- ========================================
CREATE OR REPLACE FUNCTION calculate_next_pick(p_draft_session_id UUID)
RETURNS TABLE (
  next_pick_number INTEGER,
  next_round INTEGER,
  next_team_id UUID,
  next_team_name VARCHAR(100)
) AS $$
DECLARE
  v_num_teams INTEGER;
  v_num_rounds INTEGER;
  v_current_pick INTEGER;
BEGIN
  -- Get draft configuration
  SELECT
    ds.num_teams,
    ds.num_rounds,
    COALESCE(MAX(dp.pick_number), 0) + 1
  INTO v_num_teams, v_num_rounds, v_current_pick
  FROM draft_sessions ds
  LEFT JOIN draft_picks dp ON dp.draft_session_id = ds.id
  WHERE ds.id = p_draft_session_id
  GROUP BY ds.num_teams, ds.num_rounds;

  -- Check if draft is complete
  IF v_current_pick > (v_num_teams * v_num_rounds) THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::INTEGER, NULL::UUID, NULL::VARCHAR(100);
    RETURN;
  END IF;

  -- Calculate next round and position
  RETURN QUERY
  SELECT * FROM get_draft_pick_order(
    p_draft_session_id,
    ((v_current_pick - 1) / v_num_teams + 1)::INTEGER
  )
  WHERE pick_number = v_current_pick
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_next_pick IS 'Determine who picks next in the draft';

