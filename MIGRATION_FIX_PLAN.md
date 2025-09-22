# LinkedIn Messenger - Database Migration Fix Plan

## Overview
The LinkedIn Messenger application has multiple database migration files that need to be properly applied to Supabase. Currently, there are schema mismatches causing errors in the application.

## Current Issues
1. **Missing Tables**: Several tables referenced in the application don't exist in the database
2. **Missing Functions**: Database functions like `claim_next_task` are not found
3. **Column Mismatches**: Some tables exist but are missing expected columns
4. **Duplicate Migration Attempts**: Some migrations try to create tables that already exist

## Migration Files to Process

### Directory: `/supabase/migrations/`

The following migration files need to be reviewed and applied in order:

1. **001_initial_schema.sql** - Creates base tables (profiles, etc.)
   - Status: Partially applied (profiles table exists)
   - Action: Skip existing tables, apply missing ones

2. **001_initial_setup.sql** - Initial setup
   - Action: Review and apply missing components

3. **002_analytics_functions.sql** - Analytics functions
   - Action: Apply if not exists

4. **20240320000003_ai_personalization_queue.sql** - AI queue table
   - Status: Not applied
   - Critical: Required for AI approval features
   - Action: Apply immediately

5. **20250121_campaign_backups.sql** - Campaign backup functionality
   - Action: Apply if not exists

6. **20250121_campaign_schedule_settings.sql** - Schedule settings
   - Action: Apply if not exists

7. **20250121_notifications.sql** - Notification system
   - Action: Apply if not exists

8. **20250919_ai_personalization.sql** - AI personalization features
   - Action: Apply if not exists

9. **20250919_complete_production_schema.sql** - Complete production schema
   - Status: Likely the most comprehensive
   - Action: Review and apply missing components

10. **20250919_production_schema.sql** - Production schema
    - Action: Review for any additional components

11. **20250920_ab_testing.sql** - A/B testing features
    - Action: Apply if not exists

12. **20250920_linkedin_sessions.sql** - LinkedIn session management
    - Critical: Required for runner functionality
    - Action: Apply immediately

## Step-by-Step Execution Plan

### Step 1: Backup Current Database
```sql
-- Create a backup of the current schema before making changes
-- Use Supabase dashboard to create a backup
```

### Step 2: Analyze Current Schema
```sql
-- List all existing tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- List all existing functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### Step 3: Apply Critical Tables First

#### 3.1 Apply AI Personalization Queue
```sql
-- From: 20240320000003_ai_personalization_queue.sql
-- This table is critical for AI approval features
-- Apply the entire migration file
```

#### 3.2 Apply LinkedIn Sessions
```sql
-- From: 20250920_linkedin_sessions.sql
-- Critical for runner functionality
-- Ensure columns: last_check_at, status, cookies, etc.
```

#### 3.3 Apply Runner Status Table
```sql
-- Needed for runner heartbeat
-- Must include: active_tasks column
CREATE TABLE IF NOT EXISTS public.runner_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  runner_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'inactive',
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  active_tasks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Step 4: Apply Missing Functions

#### 4.1 Create claim_next_task Function
```sql
-- The runner expects this function with specific parameters
CREATE OR REPLACE FUNCTION public.claim_next_task(
  p_runner_id TEXT,
  p_rate_limits_ok BOOLEAN DEFAULT true
)
RETURNS SETOF public.task_queue AS $$
BEGIN
  -- Implementation from migration files
  -- Must handle atomic task claiming
END;
$$ LANGUAGE plpgsql;
```

### Step 5: Apply Comprehensive Schema
```sql
-- From: 20250919_complete_production_schema.sql
-- This should be the most complete schema
-- Apply with IF NOT EXISTS conditions
```

### Step 6: Verify Required Tables

Ensure these critical tables exist with correct structure:
- [ ] users (auth schema)
- [ ] profiles
- [ ] campaigns
- [ ] templates
- [ ] connections
- [ ] campaign_targets
- [ ] task_queue
- [ ] ai_personalization_queue
- [ ] linkedin_sessions
- [ ] runner_status
- [ ] campaign_analytics
- [ ] notifications
- [ ] ab_test_variants

### Step 7: Verify Required Functions

Ensure these critical functions exist:
- [ ] claim_next_task(p_runner_id, p_rate_limits_ok)
- [ ] claim_ai_queue_items(p_processor_id, p_limit)
- [ ] update_updated_at() - trigger function
- [ ] Any analytics aggregation functions

### Step 8: Apply Row Level Security (RLS)

For each table, ensure RLS is enabled and policies exist:
```sql
ALTER TABLE public.[table_name] ENABLE ROW LEVEL SECURITY;
-- Apply appropriate policies for each table
```

### Step 9: Create Storage Buckets

```sql
-- These need to be created via Supabase dashboard or API
-- Required buckets:
-- 1. screenshots (public)
-- 2. sessions (private)
```

### Step 10: Final Verification

Run the verification script:
```bash
node /Users/johnconnor/Documents/GitHub/Linkedin-messenger/check-status.js
```

Expected output:
- All tables should show as "Ready"
- No "Table missing" errors
- Storage buckets should exist

## Common Issues and Solutions

### Issue: "relation already exists"
**Solution**: Wrap CREATE TABLE statements with IF NOT EXISTS

### Issue: "could not find table in schema cache"
**Solution**: The table doesn't exist - apply the relevant migration

### Issue: "could not find function in schema cache"
**Solution**: The function doesn't exist or has wrong parameters - create/update it

### Issue: "column does not exist"
**Solution**: Add the missing column to the existing table:
```sql
ALTER TABLE public.[table_name]
ADD COLUMN IF NOT EXISTS [column_name] [data_type];
```

## Testing After Migration

1. **Test Web App**:
   - Login should work
   - Dashboard should load without errors
   - AI Approval queue should be accessible

2. **Test Runner**:
   ```bash
   cd /Users/johnconnor/Documents/GitHub/Linkedin-messenger/runner
   node index-production.js
   ```
   - Should not show schema errors
   - Heartbeat should work
   - Task claiming should work

3. **Test AI Processor**:
   - Should initialize without errors
   - Should be able to query ai_personalization_queue

## Important Notes

1. **Order Matters**: Some migrations depend on others. Apply in chronological order when possible.

2. **Idempotency**: All migrations should be idempotent (safe to run multiple times). Use IF NOT EXISTS.

3. **Service Role Key**: Some operations require the service role key, not just the anon key.

4. **Schema Cache**: After applying migrations, Supabase may need a moment to update its schema cache.

5. **RLS Policies**: Don't forget to apply RLS policies after creating tables.

## Files for Reference

- Main schema: `/supabase/migrations/20250919_complete_production_schema.sql`
- AI Queue: `/supabase/migrations/20240320000003_ai_personalization_queue.sql`
- Sessions: `/supabase/migrations/20250920_linkedin_sessions.sql`
- Status check: `/check-status.js`

## Success Criteria

✅ No schema-related errors in application logs
✅ All tables listed in check-status.js exist
✅ Runner can claim tasks without errors
✅ AI processor can access queue without errors
✅ Web app loads all pages without database errors

---

**Note for executing agent**: Use Supabase MCP tools to connect to the database and execute these migrations systematically. Start with Step 2 (Analyze Current Schema) to understand what already exists before applying new migrations.