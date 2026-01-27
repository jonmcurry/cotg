# Database Deployment Guide

**Project:** Century of the Game
**Supabase Project:** vbxpxgrqiixrvvmhkhrx
**Date:** 2026-01-27

---

## Overview

This guide covers deploying the database schema to Supabase. Choose the method that works best for you.

---

## Method 1: Supabase Dashboard (Recommended for First Time)

**Pros:** Simple, visual feedback, no local setup needed
**Time:** ~5 minutes

### Steps:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/vbxpxgrqiixrvvmhkhrx/sql

2. **Create New Query**
   - Click "+ New query" button

3. **Run Migrations in Order**

   Execute each file in this exact order:

   **a) 001_create_players.sql**
   - Copy contents from: `supabase/migrations/001_create_players.sql`
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for "Success" message (green checkmark)

   **b) 002_create_player_seasons.sql**
   - Copy from: `supabase/migrations/002_create_player_seasons.sql`
   - Paste and Run
   - Verify success

   **c) 003_create_apba_cards.sql**
   - Copy from: `supabase/migrations/003_create_apba_cards.sql`
   - Paste and Run

   **d) 004_create_draft_tables.sql**
   - Copy from: `supabase/migrations/004_create_draft_tables.sql`
   - Paste and Run

   **e) 005_create_game_simulation_tables.sql**
   - Copy from: `supabase/migrations/005_create_game_simulation_tables.sql`
   - Paste and Run

   **f) 006_create_helper_views.sql**
   - Copy from: `supabase/migrations/006_create_helper_views.sql`
   - Paste and Run

   **g) 007_create_rls_policies.sql**
   - Copy from: `supabase/migrations/007_create_rls_policies.sql`
   - Paste and Run

   **h) 008_seed_apba_outcomes.sql**
   - Copy from: `supabase/migrations/008_seed_apba_outcomes.sql`
   - Paste and Run

4. **Verify Deployment**
   - Go to: https://supabase.com/dashboard/project/vbxpxgrqiixrvvmhkhrx/editor
   - You should see 17 tables in the "public" schema:
     - players
     - player_seasons
     - teams_history
     - apba_cards
     - apba_outcomes
     - draft_sessions
     - draft_teams
     - draft_picks
     - draft_rankings
     - draft_watchlist
     - leagues
     - league_teams
     - league_rosters
     - games
     - game_events
     - player_game_stats

5. **Check Views**
   - In the same editor, look for views:
     - v_player_seasons_enriched
     - v_apba_cards_enriched
     - v_draft_board
     - v_league_standings

---

## Method 2: Using psql (Command Line)

**Pros:** Automated, scriptable, faster for multiple migrations
**Prerequisites:** PostgreSQL client (psql) installed ✓

### Steps:

1. **Get Your Database Password**
   - Go to: https://supabase.com/dashboard/project/vbxpxgrqiixrvvmhkhrx/settings/database
   - Scroll to "Database password"
   - Click "Reset database password" if you don't know it
   - Copy the password

2. **Set Environment Variable**
   ```bash
   export SUPABASE_DB_PASSWORD='your-password-here'
   ```

3. **Run Deployment Script**
   ```bash
   bash scripts/deploy-migrations.sh
   ```

4. **Verify Success**
   - Script will show ✅ for each successful migration
   - Check Supabase dashboard for tables

### Troubleshooting

**Connection refused:**
- Verify your IP is allowed in Supabase settings
- Go to: https://supabase.com/dashboard/project/vbxpxgrqiixrvvmhkhrx/settings/database
- Under "Connection Pooling", make sure connection is enabled

**Authentication failed:**
- Double-check SUPABASE_DB_PASSWORD
- Try resetting password in Supabase dashboard

---

## Method 3: Manual SQL Execution

If both methods above fail, you can run SQL directly:

1. Connect to Supabase using any PostgreSQL client
2. Connection string:
   ```
   postgresql://postgres:[PASSWORD]@db.vbxpxgrqiixrvvmhkhrx.supabase.co:5432/postgres
   ```
3. Execute each `.sql` file in order (001 through 008)

---

## Verification Checklist

After deployment, verify:

- [ ] 17 tables exist in public schema
- [ ] 4 views exist (v_player_seasons_enriched, etc.)
- [ ] 3 functions exist (get_player_career_stats, get_draft_pick_order, calculate_next_pick)
- [ ] RLS is enabled on all tables (check "Policies" tab in Supabase)
- [ ] apba_outcomes table has ~20 sample rows

### Quick Verification Query

Run this in Supabase SQL Editor:

```sql
-- Count all tables
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
-- Should return: 17

-- Count all views
SELECT COUNT(*) as view_count
FROM information_schema.views
WHERE table_schema = 'public';
-- Should return: 4

-- Check APBA outcomes
SELECT COUNT(*) FROM apba_outcomes;
-- Should return: ~20-30
```

---

## Next Steps After Deployment

1. ✅ Database schema deployed
2. ⏳ Import Lahman data: `npm run import:lahman`
3. ⏳ Generate APBA cards: `npm run generate:apba-cards`
4. ⏳ Build React frontend

---

## Rolling Back (If Needed)

To start fresh:

1. Go to Supabase SQL Editor
2. Run this to drop everything:
   ```sql
   -- Drop all views
   DROP VIEW IF EXISTS v_player_seasons_enriched CASCADE;
   DROP VIEW IF EXISTS v_apba_cards_enriched CASCADE;
   DROP VIEW IF EXISTS v_draft_board CASCADE;
   DROP VIEW IF EXISTS v_league_standings CASCADE;

   -- Drop all tables (in reverse order of dependencies)
   DROP TABLE IF EXISTS player_game_stats CASCADE;
   DROP TABLE IF EXISTS game_events CASCADE;
   DROP TABLE IF EXISTS games CASCADE;
   DROP TABLE IF EXISTS league_rosters CASCADE;
   DROP TABLE IF EXISTS league_teams CASCADE;
   DROP TABLE IF EXISTS leagues CASCADE;

   DROP TABLE IF EXISTS draft_watchlist CASCADE;
   DROP TABLE IF EXISTS draft_rankings CASCADE;
   DROP TABLE IF EXISTS draft_picks CASCADE;
   DROP TABLE IF EXISTS draft_teams CASCADE;
   DROP TABLE IF EXISTS draft_sessions CASCADE;

   DROP TABLE IF EXISTS apba_cards CASCADE;
   DROP TABLE IF EXISTS apba_outcomes CASCADE;
   DROP TABLE IF EXISTS player_seasons CASCADE;
   DROP TABLE IF EXISTS teams_history CASCADE;
   DROP TABLE IF EXISTS players CASCADE;

   -- Drop functions
   DROP FUNCTION IF EXISTS get_player_career_stats CASCADE;
   DROP FUNCTION IF EXISTS get_draft_pick_order CASCADE;
   DROP FUNCTION IF EXISTS calculate_next_pick CASCADE;
   DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
   ```

3. Re-run migrations from step 1

---

**Support:**
- Supabase Docs: https://supabase.com/docs
- Project Dashboard: https://supabase.com/dashboard/project/vbxpxgrqiixrvvmhkhrx
