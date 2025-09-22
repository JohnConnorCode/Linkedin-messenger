-- Final production fixes - created at 2025-09-22
-- This fixes the remaining schema issues preventing production deployment

-- 1. Fix linkedin_sessions table - add missing columns with proper checks
DO $$
BEGIN
  -- Add account_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linkedin_sessions' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE public.linkedin_sessions ADD COLUMN account_id TEXT UNIQUE;
  END IF;

  -- Add status if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linkedin_sessions' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.linkedin_sessions ADD COLUMN status TEXT DEFAULT 'inactive';
  END IF;

  -- Add last_check_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linkedin_sessions' AND column_name = 'last_check_at'
  ) THEN
    ALTER TABLE public.linkedin_sessions ADD COLUMN last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add other missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linkedin_sessions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.linkedin_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'linkedin_sessions' AND column_name = 'cookies'
  ) THEN
    ALTER TABLE public.linkedin_sessions ADD COLUMN cookies JSONB;
  END IF;
END $$;

-- 2. Fix runner_status table - add missing columns with proper checks
DO $$
BEGIN
  -- Add cpu_percent if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'runner_status' AND column_name = 'cpu_percent'
  ) THEN
    ALTER TABLE public.runner_status ADD COLUMN cpu_percent NUMERIC(5,2) DEFAULT 0;
  END IF;

  -- Add memory_percent if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'runner_status' AND column_name = 'memory_percent'
  ) THEN
    ALTER TABLE public.runner_status ADD COLUMN memory_percent NUMERIC(5,2) DEFAULT 0;
  END IF;

  -- Add error_count if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'runner_status' AND column_name = 'error_count'
  ) THEN
    ALTER TABLE public.runner_status ADD COLUMN error_count INTEGER DEFAULT 0;
  END IF;

  -- Add active_tasks if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'runner_status' AND column_name = 'active_tasks'
  ) THEN
    ALTER TABLE public.runner_status ADD COLUMN active_tasks JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3. CRITICAL FIX: Change task_queue.priority from integer to text
-- This is the root cause of the "invalid input syntax for type integer: 'high'" error
DO $$
BEGIN
  -- Check if priority column exists and is not text type
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'task_queue'
    AND column_name = 'priority'
    AND data_type != 'text'
  ) THEN
    -- Convert existing integer values to text equivalents
    ALTER TABLE public.task_queue
    ALTER COLUMN priority TYPE TEXT USING
      CASE
        WHEN priority = 1 THEN 'high'
        WHEN priority = 2 THEN 'medium'
        WHEN priority = 3 THEN 'low'
        ELSE 'medium'
      END;

    -- Set default value for new records
    ALTER TABLE public.task_queue
    ALTER COLUMN priority SET DEFAULT 'medium';
  END IF;
END $$;

-- 4. Drop and recreate claim_next_task function with proper priority handling
DROP FUNCTION IF EXISTS public.claim_next_task(TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.claim_next_task(TEXT) CASCADE;

-- Main function with rate limit parameter
CREATE OR REPLACE FUNCTION public.claim_next_task(
  p_runner_id TEXT,
  p_rate_limits_ok BOOLEAN DEFAULT true
)
RETURNS SETOF public.task_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE public.task_queue
  SET
    status = 'processing',
    runner_id = p_runner_id,
    claimed_at = NOW(),
    started_at = NOW()
  WHERE id IN (
    SELECT id
    FROM public.task_queue
    WHERE status = 'pending'
      AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '5 minutes')
      AND (p_rate_limits_ok = true OR priority = 'high')
    ORDER BY
      CASE priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END,
      created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Simpler overload without rate limit parameter
CREATE OR REPLACE FUNCTION public.claim_next_task(p_runner_id TEXT)
RETURNS SETOF public.task_queue AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.claim_next_task(p_runner_id, true);
END;
$$ LANGUAGE plpgsql;

-- 5. Create or replace timestamp update function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to linkedin_sessions if not exists (safe operation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_linkedin_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_linkedin_sessions_updated_at
      BEFORE UPDATE ON public.linkedin_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT) TO authenticated;
GRANT ALL ON public.linkedin_sessions TO authenticated;
GRANT ALL ON public.runner_status TO authenticated;

-- Success message
SELECT 'Final production schema fixes applied successfully!' as status;