-- Targeted fixes for specific remaining issues

-- 1. Add missing cpu_percent column to runner_status
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS cpu_percent NUMERIC(5,2) DEFAULT 0;

-- 2. Add missing memory_percent and error_count columns to runner_status
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS memory_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0;

-- 3. Add missing status column to linkedin_sessions
ALTER TABLE public.linkedin_sessions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive';

-- 4. Fix the priority column type issue
-- First check if it's integer and needs conversion
DO $$
BEGIN
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