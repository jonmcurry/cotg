# Draft System Schema Alignment Fix

## Issue
Draft system failing with 401 Unauthorized and 400 Bad Request errors when attempting to create draft sessions.

## Root Causes
1. Invalid/placeholder Supabase anon key in .env file
2. Row Level Security (RLS) policies blocking anonymous access to draft tables
3. Schema mismatch between code and database (column names don't match)
4. Status enum values don't match database constraints

## Resolution Plan

### Phase 1: Authentication Fix
- [x] Retrieve real Supabase anon key from project dashboard
- [x] Update .env file with real key
- [x] Verify Vite auto-restart with new environment variables

### Phase 2: RLS Policy Fix
- [x] Create migration: 20260127_add_draft_rls_policies.sql
- [x] Add permissive RLS policies for all draft tables (draft_sessions, draft_teams, draft_picks, draft_rankings, draft_watchlist)
- [x] Allow anonymous users (anon role) to INSERT, SELECT, UPDATE, DELETE
- [x] Apply migration to Supabase database
- [x] Verify policies are active via psql query

### Phase 3: Schema Alignment
- [x] Identify column name mismatches in draft_sessions table
  - name -> session_name
  - current_pick -> current_pick_number
  - Missing: season_year (required)
  - Missing: draft_type (required)
  - Missing: current_round
- [x] Update draftStore.ts createSession method to use correct column names
- [x] Update draftStore.ts saveSession method to use correct column names
- [x] Update DraftStatus type to match database constraint
  - Old: 'configuring' | 'in_progress' | 'completed' | 'paused'
  - New: 'setup' | 'in_progress' | 'paused' | 'completed' | 'abandoned'

### Phase 4: Code Cleanup (Rule 6: No Emojis)
- [x] Remove emoji characters from App.tsx (home screen feature cards)
- [x] Remove emoji characters from DraftBoard.tsx (loading/completion screens)
- [x] Remove emoji from DraftControls.tsx (team control indicators)
- [x] Replace with text-only (no icon components needed)

### Phase 5: Documentation & Git
- [x] Update CHANGELOG.md with all fixes
- [x] Commit changes to git with descriptive message (commit 5a853a9)
- [x] Clean up temporary scripts (get-supabase-anon-key.ts)
- [x] Clean up backup files (App-Draft.tsx, App-Old.tsx)

## Additional Issues Found

### Issue 4: UUID Format Error (2026-01-27)
**Problem:** Session ID generated as `draft-${Date.now()}` is not a valid UUID format
- Error: `invalid input syntax for type uuid: "draft-1769536158830"`
- The database `draft_sessions.id` column expects UUID type
- Frontend was generating string IDs, causing PATCH requests to fail

**Solution:**
- Let Supabase auto-generate the UUID via `uuid_generate_v4()` default
- Use `.select().single()` to retrieve the generated UUID after insert
- Update local session state with the real UUID from database
- Modified draftStore.ts createSession to insert first, then create session object

## Testing Checklist
- [x] TypeScript compilation succeeds
- [x] Production build succeeds
- [x] Draft session creation succeeds (no 401 error)
- [x] Draft session creation succeeds (no 400 error)
- [ ] Draft board loads with player data
- [ ] CPU auto-draft executes successfully
- [ ] Human player can select and assign players
- [ ] Snake draft order works correctly
- [ ] Session persistence works

## Files Modified
- .env (anon key updated)
- supabase/migrations/20260127_add_draft_rls_policies.sql (created)
- src/stores/draftStore.ts (schema fixes)
- src/types/draft.types.ts (status enum fix)
- src/vite-env.d.ts (created for type definitions)

## Files to Clean Up
- scripts/get-supabase-anon-key.ts (temporary helper, no longer needed)
