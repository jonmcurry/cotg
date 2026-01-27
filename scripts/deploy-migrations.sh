#!/bin/bash

# Deploy Supabase Migrations
# Uses psql to connect directly to Supabase PostgreSQL database

set -e  # Exit on error

echo ""
echo "🚀 Deploying Supabase Migrations"
echo "=================================="
echo ""

# Supabase connection details
PROJECT_REF="vbxpxgrqiixrvvmhkhrx"
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# You need to set SUPABASE_DB_PASSWORD environment variable
# Get it from: https://supabase.com/dashboard/project/vbxpxgrqiixrvvmhkhrx/settings/database
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "❌ Error: SUPABASE_DB_PASSWORD not set"
  echo ""
  echo "To get your database password:"
  echo "1. Go to: https://supabase.com/dashboard/project/vbxpxgrqiixrvvmhkhrx/settings/database"
  echo "2. Find 'Database password' section"
  echo "3. Click 'Reset database password' if needed"
  echo "4. Set it as environment variable:"
  echo "   export SUPABASE_DB_PASSWORD='your-password-here'"
  echo ""
  exit 1
fi

# Connection string
CONN_STRING="postgresql://${DB_USER}:${SUPABASE_DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Test connection
echo "📡 Testing connection to Supabase..."
if psql "$CONN_STRING" -c "SELECT version();" > /dev/null 2>&1; then
  echo "✅ Connected successfully"
  echo ""
else
  echo "❌ Connection failed"
  echo "   Please check your SUPABASE_DB_PASSWORD"
  echo ""
  exit 1
fi

# Get migration files
MIGRATIONS_DIR="supabase/migrations"
FILES=$(ls -1 $MIGRATIONS_DIR/*.sql 2>/dev/null | sort)

if [ -z "$FILES" ]; then
  echo "❌ No migration files found in $MIGRATIONS_DIR"
  exit 1
fi

FILE_COUNT=$(echo "$FILES" | wc -l)
echo "Found $FILE_COUNT migration files"
echo ""

# Execute each migration
SUCCESS=0
FAILED=0

for FILE in $FILES; do
  FILENAME=$(basename "$FILE")
  echo "📄 Executing: $FILENAME"

  START=$(date +%s%3N)

  if psql "$CONN_STRING" -f "$FILE" > /dev/null 2>&1; then
    END=$(date +%s%3N)
    DURATION=$((END - START))
    echo "   ✅ Success (${DURATION}ms)"
    echo ""
    SUCCESS=$((SUCCESS + 1))
  else
    echo "   ❌ Failed"
    echo ""
    echo "⚠️  Migration failed. Stopping deployment."
    echo ""
    echo "To debug, run manually:"
    echo "   psql \"\$CONN_STRING\" -f \"$FILE\""
    echo ""
    FAILED=$((FAILED + 1))
    break
  fi
done

# Summary
echo "============================================================"
echo "Migration Summary"
echo "============================================================"
echo ""
echo "📊 Total: $SUCCESS successful, $FAILED failed"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "⚠️  Some migrations failed."
  exit 1
else
  echo "🎉 All migrations deployed successfully!"
  echo ""
  echo "Next steps:"
  echo "  1. Verify tables in Supabase dashboard"
  echo "  2. Run: npm run import:lahman"
  echo ""
fi
