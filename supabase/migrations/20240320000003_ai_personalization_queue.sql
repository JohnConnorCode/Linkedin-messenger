-- Create AI personalization queue table
CREATE TABLE IF NOT EXISTS public.ai_personalization_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_target_id UUID NOT NULL REFERENCES public.campaign_targets(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- LinkedIn profile data
  profile_data JSONB NOT NULL,
  profile_url TEXT NOT NULL,

  -- Template and personalization
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  template_body TEXT NOT NULL,
  tone TEXT DEFAULT 'professional',
  campaign_context TEXT,

  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'approved', 'rejected')),
  processor_id TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE,

  -- Results
  personalization_result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient querying
CREATE INDEX idx_ai_queue_status ON public.ai_personalization_queue(status);
CREATE INDEX idx_ai_queue_campaign ON public.ai_personalization_queue(campaign_id);
CREATE INDEX idx_ai_queue_user ON public.ai_personalization_queue(user_id);
CREATE INDEX idx_ai_queue_created ON public.ai_personalization_queue(created_at);
CREATE INDEX idx_ai_queue_processor ON public.ai_personalization_queue(processor_id);

-- Enable RLS
ALTER TABLE public.ai_personalization_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own queue items" ON public.ai_personalization_queue
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create queue items" ON public.ai_personalization_queue
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue items" ON public.ai_personalization_queue
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue items" ON public.ai_personalization_queue
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_ai_queue_updated_at
  BEFORE UPDATE ON public.ai_personalization_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_queue_updated_at();

-- Create function to claim items from queue atomically
CREATE OR REPLACE FUNCTION claim_ai_queue_items(
  p_processor_id TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF public.ai_personalization_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE public.ai_personalization_queue
  SET
    status = 'processing',
    processor_id = p_processor_id,
    claimed_at = NOW()
  WHERE id IN (
    SELECT id
    FROM public.ai_personalization_queue
    WHERE status = 'pending'
      AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '5 minutes')
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON public.ai_personalization_queue TO authenticated;
GRANT EXECUTE ON FUNCTION claim_ai_queue_items TO authenticated;