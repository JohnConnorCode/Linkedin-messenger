-- Add missing columns to runner_status table
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS cpu_percent FLOAT,
ADD COLUMN IF NOT EXISTS memory_percent FLOAT,
ADD COLUMN IF NOT EXISTS memory_mb INTEGER,
ADD COLUMN IF NOT EXISTS active_tasks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS version TEXT;

-- Add missing columns to linkedin_sessions table
ALTER TABLE public.linkedin_sessions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS runner_instance TEXT;

-- Add missing columns to runner_status for additional tracking
ALTER TABLE public.runner_status
ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS active_tasks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create ai_personalization_queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ai_personalization_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.campaign_targets(id) ON DELETE CASCADE,
    message_template TEXT NOT NULL,
    personalization_data JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    result TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on ai_personalization_queue
CREATE INDEX IF NOT EXISTS idx_ai_personalization_queue_status
ON public.ai_personalization_queue(status, created_at);

-- Drop existing claim_next_task function to allow changing return type
DROP FUNCTION IF EXISTS public.claim_next_task(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.claim_next_task(TEXT);

-- Create claim_next_task function with new signature
CREATE OR REPLACE FUNCTION public.claim_next_task(
    p_runner_id TEXT,
    p_rate_limits_ok BOOLEAN DEFAULT true
)
RETURNS TABLE(task_id UUID, campaign_id UUID, target_id UUID) AS $$
DECLARE
    v_task_id UUID;
    v_campaign_id UUID;
    v_target_id UUID;
BEGIN
    -- Select and lock the next available task
    SELECT t.id, t.campaign_id, t.target_id
    INTO v_task_id, v_campaign_id, v_target_id
    FROM public.task_queue t
    JOIN public.campaigns c ON t.campaign_id = c.id
    WHERE t.status = 'queued'
    AND c.status = 'active'
    AND (p_rate_limits_ok = true OR t.priority >= 5)  -- Higher priority tasks bypass rate limits
    ORDER BY t.priority DESC, t.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- If a task was found, update its status
    IF v_task_id IS NOT NULL THEN
        UPDATE public.task_queue
        SET status = 'processing',
            runner_id = p_runner_id,
            claimed_at = NOW()
        WHERE id = v_task_id;

        -- Update runner status
        UPDATE public.runner_status
        SET current_task_id = v_task_id,
            tasks_completed = tasks_completed + 1
        WHERE runner_id = p_runner_id;
    END IF;

    -- Return the task details
    RETURN QUERY SELECT v_task_id, v_campaign_id, v_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT, BOOLEAN) TO anon;

-- Add comment
COMMENT ON FUNCTION public.claim_next_task(TEXT, BOOLEAN) IS 'Claims the next available task for a runner with optional rate limit check';