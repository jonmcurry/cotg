# Database Migrations

This directory contains SQL migration files for the Supabase database schema.

## Migration Naming Convention

Migrations are named: `YYYYMMDD_description.sql`

Example: `20260203_add_control_column_to_draft_teams.sql`

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for Production)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy/paste the migration SQL
6. Click **Run** (or press Ctrl+Enter)

### Option 2: Supabase CLI (For Local Development)

```bash
# Apply a specific migration
supabase db push

# Or apply all pending migrations
supabase db reset
```

### Option 3: Manual psql (Advanced)

```bash
psql -h db.xxx.supabase.co -U postgres -d postgres -f migrations/20260203_add_control_column_to_draft_teams.sql
```

## Migration History

| Date       | Migration                                       | Status | Notes                                      |
|------------|------------------------------------------------|--------|--------------------------------------------|
| 2026-02-03 | add_position_slot_to_draft_picks               | ✅     | Added position and slot_number columns for roster reconstruction |
| 2026-02-03 | add_control_column_to_draft_teams              | ✅     | Added missing control column for team type |

## Creating New Migrations

When making schema changes:

1. Create a new file: `database/migrations/YYYYMMDD_description.sql`
2. Include:
   - Migration header comment with date and description
   - The actual SQL changes
   - Verification queries (optional but recommended)
3. Test locally first
4. Apply to production
5. Commit to git
6. Update this README with migration status

## Rollback Strategy

If a migration fails or needs to be reverted:

1. Create a new migration file with `_rollback` suffix
2. Write SQL to undo the changes
3. Apply the rollback migration

Example:
```sql
-- Rollback: Remove control column
ALTER TABLE draft_teams DROP COLUMN IF EXISTS control;
```

## Best Practices

- ✅ Always use `IF EXISTS` / `IF NOT EXISTS` for idempotency
- ✅ Include comments explaining why the change is needed
- ✅ Test migrations on a dev database first
- ✅ Keep migrations small and focused on one change
- ✅ Never modify existing migration files (create new ones instead)
- ✅ Commit migrations to version control
