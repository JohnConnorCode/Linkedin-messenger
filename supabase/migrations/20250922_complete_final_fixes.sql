-- Complete final fixes for ALL remaining issues

-- 1. Add missing cpu_percent column to runner_status
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS cpu_percent NUMERIC(5,2) DEFAULT 0;

-- 2. Add missing status column to linkedin_sessions
ALTER TABLE public.linkedin_sessions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive';

-- 3. Ensure account_id exists in linkedin_sessions
ALTER TABLE public.linkedin_sessions
ADD COLUMN IF NOT EXISTS account_id TEXT UNIQUE;

-- 4. Fix the priority column issue - ensure it accepts text values
DO $$
BEGIN
  -- Check if priority column exists and its type
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'task_queue'
    AND column_name = 'priority'
    AND data_type != 'text'
  ) THEN
    -- Convert to text if it's not already
    ALTER TABLE public.task_queue
    ALTER COLUMN priority TYPE TEXT USING priority::TEXT;
  END IF;
END $$;

-- 5. Ensure all required columns exist with proper defaults
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS memory_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0;

ALTER TABLE public.linkedin_sessions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cookies JSONB,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. Fix claim_next_task function to handle priority correctly
DROP FUNCTION IF EXISTS public.claim_next_task(TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.claim_next_task(TEXT) CASCADE;

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

-- Simpler overload
CREATE OR REPLACE FUNCTION public.claim_next_task(p_runner_id TEXT)
RETURNS SETOF public.task_queue AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.claim_next_task(p_runner_id, true);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT) TO authenticated;

-- 7. Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to linkedin_sessions if not exists
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

-- 8. Ensure runner can update session status properly
GRANT ALL ON public.linkedin_sessions TO authenticated;
GRANT ALL ON public.runner_status TO authenticated;

-- Verification query to check all fixes
SELECT
  'runner_status.cpu_percent' as check_item,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'runner_status' AND column_name = 'cpu_percent') as exists
UNION ALL
SELECT
  'linkedin_sessions.status',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'linkedin_sessions' AND column_name = 'status')
UNION ALL
SELECT
  'linkedin_sessions.account_id',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'linkedin_sessions' AND column_name = 'account_id')
UNION ALL
SELECT
  'task_queue.priority is TEXT',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'task_queue' AND column_name = 'priority' AND data_type = 'text');