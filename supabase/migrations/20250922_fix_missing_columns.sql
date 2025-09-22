-- Fix missing columns and functions
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to runner_status
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS active_tasks JSONB DEFAULT '[]'::jsonb;

-- 2. Add missing columns to linkedin_sessions
ALTER TABLE public.linkedin_sessions
ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP WITH TIME ZONE;

-- 3. Create or replace the claim_next_task function with correct parameters
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

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS public.claim_next_task(TEXT);

-- Also create the simpler version for backward compatibility
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

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'runner_status'
  AND column_name = 'active_tasks';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'linkedin_sessions'
  AND column_name = 'last_check_at';

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'claim_next_task';