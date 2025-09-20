-- Phase 3: GPT-5 Nano AI Personalization Tables

-- Store raw scraped profile data
CREATE TABLE public.profile_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  html TEXT, -- Sanitized rendered HTML or text dump
  text TEXT, -- Extracted text
  metadata JSONB, -- Structured data (headline, company, skills, etc)
  source_url TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id)
);

-- Store AI-generated summaries and personalized content
CREATE TABLE public.profile_ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,

  -- AI Configuration
  tone TEXT DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'friendly', 'concise', 'curious')),
  model TEXT DEFAULT 'gpt5-nano',
  model_version TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.3,

  -- AI Output
  persona JSONB, -- {"label": "Founder - AI", "confidence": 0.82, "signals": ["Seed stage", "Ex-FAANG"]}
  summary TEXT,
  first_line TEXT,
  midline TEXT,
  custom_variables JSONB, -- Additional variables extracted by AI

  -- Quality & Safety
  risk_flags TEXT[],
  confidence_score DECIMAL(3,2),
  validator_status TEXT DEFAULT 'pending' CHECK (validator_status IN ('pending', 'approved', 'flagged', 'rejected')),

  -- Caching
  input_hash TEXT NOT NULL, -- profile_hash + template_id + tone
  cache_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, input_hash)
);

-- AI personalization queue for batch processing
CREATE TABLE public.ai_personalization_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.campaign_targets(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Processing metadata
  processor_id TEXT, -- Runner ID that's processing this
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content safety filters and banned phrases
CREATE TABLE public.ai_safety_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_type TEXT NOT NULL CHECK (filter_type IN ('banned_phrase', 'regex', 'category')),
  pattern TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  action TEXT DEFAULT 'flag' CHECK (action IN ('flag', 'block', 'regenerate')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default safety filters
INSERT INTO public.ai_safety_filters (filter_type, pattern, severity, action, description) VALUES
  ('banned_phrase', 'quick call', 'low', 'regenerate', 'Avoid pushy language'),
  ('banned_phrase', 'synergy', 'low', 'regenerate', 'Corporate jargon'),
  ('banned_phrase', 'win-win', 'low', 'regenerate', 'Sales cliche'),
  ('banned_phrase', 'guarantee', 'high', 'block', 'Avoid promises'),
  ('banned_phrase', 'urgent', 'medium', 'flag', 'May seem spammy'),
  ('regex', '\\b(buy|purchase|discount|offer)\\b', 'high', 'flag', 'Commercial terms'),
  ('regex', '\\b\\d{3,}\\%\\b', 'high', 'block', 'Unrealistic percentages'),
  ('category', 'profanity', 'critical', 'block', 'Inappropriate language'),
  ('category', 'personal_info', 'critical', 'block', 'PII protection');

-- AI model configuration and limits
CREATE TABLE public.ai_model_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Model settings
  enabled BOOLEAN DEFAULT true,
  model_name TEXT DEFAULT 'gpt5-nano',
  default_tone TEXT DEFAULT 'professional',
  default_temperature DECIMAL(3,2) DEFAULT 0.3,
  max_tokens INTEGER DEFAULT 500,

  -- Rate limits
  daily_limit INTEGER DEFAULT 1000,
  hourly_limit INTEGER DEFAULT 100,
  current_daily_usage INTEGER DEFAULT 0,
  current_hourly_usage INTEGER DEFAULT 0,
  usage_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',

  -- Quality settings
  min_confidence_score DECIMAL(3,2) DEFAULT 0.7,
  auto_approve_threshold DECIMAL(3,2) DEFAULT 0.9,
  require_manual_review BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX idx_profile_raw_connection ON public.profile_raw(connection_id);
CREATE INDEX idx_profile_raw_scraped ON public.profile_raw(scraped_at DESC);
CREATE INDEX idx_ai_summaries_connection ON public.profile_ai_summaries(connection_id);
CREATE INDEX idx_ai_summaries_campaign ON public.profile_ai_summaries(campaign_id);
CREATE INDEX idx_ai_summaries_cache ON public.profile_ai_summaries(input_hash, cache_expires_at);
CREATE INDEX idx_ai_queue_status ON public.ai_personalization_queue(status, scheduled_for);
CREATE INDEX idx_ai_queue_campaign ON public.ai_personalization_queue(campaign_id, status);

-- RLS Policies
ALTER TABLE public.profile_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_personalization_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_config ENABLE ROW LEVEL SECURITY;

-- Profile raw data policies
CREATE POLICY "Users can view own profile data" ON public.profile_raw
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile data" ON public.profile_raw
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile data" ON public.profile_raw
  FOR UPDATE USING (user_id = auth.uid());

-- AI summaries policies
CREATE POLICY "Users can view own AI summaries" ON public.profile_ai_summaries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own AI summaries" ON public.profile_ai_summaries
  FOR ALL USING (user_id = auth.uid());

-- AI queue policies
CREATE POLICY "Users can view own AI queue" ON public.ai_personalization_queue
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = auth.uid()
    )
  );

-- Model config policies
CREATE POLICY "Users can view own AI config" ON public.ai_model_config
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own AI config" ON public.ai_model_config
  FOR ALL USING (user_id = auth.uid());

-- Functions for AI processing

-- Function to enqueue AI personalization for a campaign
CREATE OR REPLACE FUNCTION enqueue_ai_personalization(
  p_campaign_id UUID,
  p_priority INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.ai_personalization_queue (
    campaign_id,
    target_id,
    connection_id,
    priority,
    scheduled_for
  )
  SELECT
    ct.campaign_id,
    ct.id,
    ct.connection_id,
    p_priority,
    NOW() + (ROW_NUMBER() OVER (ORDER BY ct.created_at) * INTERVAL '1 second')
  FROM public.campaign_targets ct
  WHERE ct.campaign_id = p_campaign_id
    AND ct.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.ai_personalization_queue apq
      WHERE apq.target_id = ct.id
        AND apq.status IN ('completed', 'processing')
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim AI personalization tasks for processing
CREATE OR REPLACE FUNCTION claim_ai_tasks(
  p_processor_id TEXT,
  p_limit INTEGER DEFAULT 10
) RETURNS SETOF public.ai_personalization_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE public.ai_personalization_queue
  SET
    status = 'processing',
    processor_id = p_processor_id,
    started_at = NOW(),
    attempts = attempts + 1
  WHERE id IN (
    SELECT id
    FROM public.ai_personalization_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
      AND attempts < max_attempts
    ORDER BY priority DESC, scheduled_for ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate AI-generated content
CREATE OR REPLACE FUNCTION validate_ai_content(
  p_text TEXT,
  p_check_type TEXT DEFAULT 'all'
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{"valid": true, "flags": []}'::JSONB;
  v_filter RECORD;
BEGIN
  -- Check against safety filters
  FOR v_filter IN
    SELECT * FROM public.ai_safety_filters
    WHERE is_active = true
      AND (p_check_type = 'all' OR filter_type = p_check_type)
  LOOP
    IF v_filter.filter_type = 'banned_phrase' THEN
      IF LOWER(p_text) LIKE '%' || LOWER(v_filter.pattern) || '%' THEN
        v_result := v_result || jsonb_build_object(
          'valid', false,
          'flags', v_result->'flags' || jsonb_build_array(jsonb_build_object(
            'type', v_filter.filter_type,
            'pattern', v_filter.pattern,
            'severity', v_filter.severity,
            'action', v_filter.action
          ))
        );
      END IF;
    ELSIF v_filter.filter_type = 'regex' THEN
      IF p_text ~ v_filter.pattern THEN
        v_result := v_result || jsonb_build_object(
          'valid', false,
          'flags', v_result->'flags' || jsonb_build_array(jsonb_build_object(
            'type', v_filter.filter_type,
            'pattern', v_filter.pattern,
            'severity', v_filter.severity,
            'action', v_filter.action
          ))
        );
      END IF;
    END IF;
  END LOOP;

  -- Check length constraints
  IF LENGTH(p_text) > 500 THEN
    v_result := v_result || jsonb_build_object(
      'valid', false,
      'flags', v_result->'flags' || jsonb_build_array(jsonb_build_object(
        'type', 'length',
        'message', 'Text exceeds 500 characters',
        'severity', 'medium',
        'action', 'regenerate'
      ))
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_ai_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_raw_timestamp
  BEFORE UPDATE ON public.profile_raw
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER update_ai_summaries_timestamp
  BEFORE UPDATE ON public.profile_ai_summaries
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER update_ai_queue_timestamp
  BEFORE UPDATE ON public.ai_personalization_queue
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER update_ai_config_timestamp
  BEFORE UPDATE ON public.ai_model_config
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();