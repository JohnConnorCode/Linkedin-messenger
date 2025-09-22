-- Final fixes for remaining column issues

-- Add missing cpu_percent column to runner_status
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS cpu_percent NUMERIC(5,2) DEFAULT 0;

-- Add missing status column to linkedin_sessions
ALTER TABLE public.linkedin_sessions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive';

-- Fix priority column type in task_queue (if it's text, leave it; if integer is needed, update the code instead)
-- The application is sending 'high', 'medium', 'low' as text, so the column should be text
ALTER TABLE public.task_queue
ALTER COLUMN priority TYPE TEXT USING priority::TEXT;