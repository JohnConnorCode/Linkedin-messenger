#!/bin/bash

# Apply SQL fixes via psql command line tool
# This script connects directly to the Supabase PostgreSQL database

SUPABASE_PROJECT_REF="gpuvqonjpdjxehihpuke"
SUPABASE_DB_URL="postgresql://postgres.[PASSWORD]@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres"

echo "🚀 Applying SQL fixes to Supabase database..."
echo ""
echo "⚠️  You'll need to enter the database password when prompted."
echo "    Get it from: https://app.supabase.com/project/${SUPABASE_PROJECT_REF}/settings/database"
echo ""

# Use the generated SQL file
SQL_FILE="./scripts/fix-all-schema-issues.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

echo "📄 SQL file to execute: $SQL_FILE"
echo ""

# Try to execute with psql
if command -v psql >/dev/null 2>&1; then
    echo "🔧 Executing SQL with psql..."

    # Replace [PASSWORD] placeholder with actual password prompt
    DB_URL_NO_PASSWORD="postgresql://postgres@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres"

    echo "💡 Command to run manually if this fails:"
    echo "   psql \"$DB_URL_NO_PASSWORD\" -f \"$SQL_FILE\""
    echo ""

    psql "$DB_URL_NO_PASSWORD" -f "$SQL_FILE"

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ SQL fixes applied successfully!"
        echo ""
        echo "🧪 Next steps:"
        echo "   1. Test the runner: node runner/index-production.js"
        echo "   2. Create a test task: node runner/add-test-task.js"
        echo "   3. Check the logs for errors"
    else
        echo ""
        echo "❌ SQL execution failed."
        echo ""
        echo "🎯 Manual execution required:"
        echo "   1. Go to: https://app.supabase.com/project/${SUPABASE_PROJECT_REF}/sql"
        echo "   2. Copy the contents of: $SQL_FILE"
        echo "   3. Paste and click 'Run'"
    fi
else
    echo "❌ psql command not found."
    echo ""
    echo "🎯 Please install psql or execute manually:"
    echo "   1. Go to: https://app.supabase.com/project/${SUPABASE_PROJECT_REF}/sql"
    echo "   2. Copy the contents of: $SQL_FILE"
    echo "   3. Paste and click 'Run'"
fi

echo ""
echo "📋 Summary of fixes being applied:"
echo "   - Add missing columns to linkedin_sessions (account_id, status, last_check_at)"
echo "   - Add missing columns to runner_status (cpu_percent, memory_percent, error_count, active_tasks)"
echo "   - Fix task_queue.priority type (INTEGER → TEXT)"
echo "   - Recreate claim_next_task function with proper priority handling"
echo "   - Set up triggers and permissions"