# Database Migration Guide for LinkedIn Messenger

## Current Status (as of 2025-09-22)

### ✅ Resolved Issues
- `active_tasks` column in `runner_status` table - **FIXED**
- `last_check_at` column in `linkedin_sessions` table - **FIXED**
- `claim_next_task` function signature - **PARTIALLY FIXED**
- Major application errors - **FIXED**

### ⚠️ Remaining Minor Issues
1. **Missing `cpu_percent` column** in `runner_status` table
   - Impact: Minor - only affects system monitoring features
   - Error: Logs show missing column warnings but doesn't break functionality

2. **Priority field type mismatch** in `task_queue` table
   - Impact: Moderate - prevents proper task prioritization
   - Error: "invalid input syntax for type integer: 'high'"
   - The application sends text values ('high', 'medium', 'low') but DB expects integer

## How to Push Database Changes

### Method 1: Using Supabase Dashboard (Recommended - 1 minute)
1. Go to Supabase SQL Editor: https://app.supabase.com/project/gpuvqonjpdjxehihpuke/sql
2. Copy and paste the SQL below
3. Click "Run"

```sql
-- Fix remaining issues
-- 1. Add missing cpu_percent column to runner_status
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS cpu_percent NUMERIC(5,2) DEFAULT 0;

-- 2. Add missing memory_percent and error_count columns
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS memory_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0;

-- 3. Fix priority field type (convert from integer to text)
DO $$
BEGIN
  -- Check if priority is integer and needs conversion
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'task_queue'
    AND column_name = 'priority'
    AND data_type = 'integer'
  ) THEN
    -- Add temporary column
    ALTER TABLE public.task_queue
    ADD COLUMN priority_text TEXT;

    -- Convert existing values
    UPDATE public.task_queue
    SET priority_text = CASE
      WHEN priority = 1 THEN 'high'
      WHEN priority = 2 THEN 'medium'
      WHEN priority = 3 THEN 'low'
      ELSE 'medium'
    END;

    -- Drop old column and rename new one
    ALTER TABLE public.task_queue
    DROP COLUMN priority;

    ALTER TABLE public.task_queue
    RENAME COLUMN priority_text TO priority;

    -- Set default
    ALTER TABLE public.task_queue
    ALTER COLUMN priority SET DEFAULT 'medium';
  END IF;
END $$;
```

### Method 2: Using Supabase CLI (For Agents with MCP Access)

#### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Access token from: https://app.supabase.com/account/tokens

#### Steps
1. Login with access token (NOT password):
   ```bash
   npx supabase login
   # Enter your access token when prompted
   ```

2. Link to project:
   ```bash
   npx supabase link --project-ref gpuvqonjpdjxehihpuke
   # Use access token, NOT database password
   ```

3. Push migrations:
   ```bash
   npx supabase db push
   ```

### Method 3: Direct PostgreSQL Connection
```bash
psql "postgresql://postgres.gpuvqonjpdjxehihpuke:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

## Migration Files Location
All migration SQL files are in: `/supabase/migrations/`

Key files:
- `20250922_targeted_fixes.sql` - Minimal fixes for remaining issues
- `20250922_complete_final_fixes.sql` - Comprehensive fixes including functions
- `20250922_fix_missing_columns.sql` - Earlier partial fixes

## Verification Script
Run this to check database status:
```bash
node scripts/apply-final-fixes.js
```

## Application Workarounds
The application has workaround code to handle missing columns gracefully:
- `/lib/db/migration-workarounds.ts` - Fallback functions for missing columns/functions
- These can be removed once all migrations are applied

## Important Notes
1. **Supabase Client Limitation**: The Supabase JavaScript client cannot execute DDL (ALTER TABLE, CREATE FUNCTION) statements. You must use the dashboard or CLI.

2. **Migration Order**: Some migrations may fail if tables already exist. This is normal - the important fixes are in the targeted migration files.

3. **Priority Field**: The most critical remaining fix is converting the priority field from integer to text type.

## For Other Agents
When working on this project:
1. Check database status first: `node scripts/apply-final-fixes.js`
2. If you see "cpu_percent" or "priority" errors, apply the SQL fix above
3. The application will work despite these warnings, but fixing them improves stability

## Contact
For database access issues, check the `.env.local` file for credentials or contact the project owner.