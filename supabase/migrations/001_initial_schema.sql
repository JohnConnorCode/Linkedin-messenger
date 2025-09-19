-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LinkedIn account/session metadata
CREATE TABLE public.linkedin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connected', 'invalid')),
  last_check_at TIMESTAMPTZ,
  session_kind TEXT DEFAULT 'userDataDir' CHECK (session_kind IN ('userDataDir', 'cookies')),
  runner_instance TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Encrypted session artifacts metadata
CREATE TABLE public.session_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.linkedin_accounts(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('cookies', 'userDataDirBundle')),
  storage_path TEXT NOT NULL,
  enc_nonce BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connections imported from LinkedIn
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  linkedin_url TEXT,
  headline TEXT,
  company TEXT,
  location TEXT,
  tags TEXT[],
  last_messaged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connections_user_id ON public.connections(user_id);
CREATE INDEX idx_connections_company ON public.connections((LOWER(company)));

-- Message templates
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES public.message_templates(id) ON DELETE RESTRICT,
  target_filter JSONB NOT NULL DEFAULT '{}',
  require_manual_approval BOOLEAN DEFAULT TRUE,
  daily_cap INT DEFAULT 25,
  hourly_cap INT DEFAULT 5,
  jitter_ms INT DEFAULT 5000,
  dwell_ms INT DEFAULT 3000,
  quiet_hours JSONB DEFAULT '{"start":"22:00","end":"07:00","tz":"Asia/Singapore"}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign target materialization
CREATE TABLE public.campaign_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  personalized_body TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, connection_id)
);

-- Work queue
CREATE TABLE public.task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.campaign_targets(id) ON DELETE CASCADE,
  run_after TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'succeeded', 'failed', 'deferred')),
  attempt INT DEFAULT 0,
  last_error TEXT,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_queue_status_run_after ON public.task_queue(status, run_after);

-- Logs and artifacts
CREATE TABLE public.send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.task_queue(id) ON DELETE CASCADE,
  stage TEXT CHECK (stage IN ('navigation', 'openComposer', 'injectText', 'sendClick', 'postSend')),
  status TEXT CHECK (status IN ('info', 'success', 'warning', 'error')),
  message TEXT,
  screenshot_path TEXT,
  selector_version TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  global_daily_cap INT DEFAULT 80,
  global_hourly_cap INT DEFAULT 8,
  min_between_messages_ms INT DEFAULT 90000,
  humanize BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Runner assignments (which runner handles which user)
CREATE TABLE public.runner_assignments (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  runner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, runner_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runner_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own LinkedIn accounts" ON public.linkedin_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own session artifacts" ON public.session_artifacts
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.linkedin_accounts WHERE id = account_id
    )
  );

CREATE POLICY "Users can manage own connections" ON public.connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own templates" ON public.message_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own campaigns" ON public.campaigns
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own campaign targets" ON public.campaign_targets
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.campaigns WHERE id = campaign_id
    )
  );

CREATE POLICY "Users can view own tasks" ON public.task_queue
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.campaigns WHERE id = campaign_id
    )
  );

CREATE POLICY "Users can view own logs" ON public.send_logs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT c.user_id FROM public.campaigns c
      JOIN public.task_queue t ON t.campaign_id = c.id
      WHERE t.id = task_id
    )
  );

CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own runner assignments" ON public.runner_assignments
  FOR SELECT USING (auth.uid() = user_id);

-- Create functions for atomic task claiming
CREATE OR REPLACE FUNCTION claim_task(p_runner_id TEXT)
RETURNS TABLE (
  task_id UUID,
  campaign_id UUID,
  target_id UUID
) AS $$
DECLARE
  v_task_id UUID;
  v_campaign_id UUID;
  v_target_id UUID;
BEGIN
  -- Find and lock a queued task
  SELECT t.id, t.campaign_id, t.target_id
  INTO v_task_id, v_campaign_id, v_target_id
  FROM public.task_queue t
  JOIN public.campaigns c ON c.id = t.campaign_id
  WHERE t.status = 'queued'
    AND t.run_after <= NOW()
    AND c.status = 'active'
    AND (t.locked_by IS NULL OR t.locked_at < NOW() - INTERVAL '5 minutes')
  ORDER BY t.run_after
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_task_id IS NOT NULL THEN
    -- Update the task as claimed
    UPDATE public.task_queue
    SET status = 'in_progress',
        locked_by = p_runner_id,
        locked_at = NOW(),
        attempt = attempt + 1
    WHERE id = v_task_id;

    RETURN QUERY SELECT v_task_id, v_campaign_id, v_target_id;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limits(p_user_id UUID)
RETURNS TABLE (
  can_send BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_hourly_count INT;
  v_daily_count INT;
  v_hourly_cap INT;
  v_daily_cap INT;
  v_last_sent TIMESTAMPTZ;
  v_min_between_ms INT;
BEGIN
  -- Get user settings
  SELECT global_hourly_cap, global_daily_cap, min_between_messages_ms
  INTO v_hourly_cap, v_daily_cap, v_min_between_ms
  FROM public.user_settings
  WHERE user_id = p_user_id;

  -- Use defaults if no settings
  IF v_hourly_cap IS NULL THEN
    v_hourly_cap := 8;
    v_daily_cap := 80;
    v_min_between_ms := 90000;
  END IF;

  -- Count messages sent in last hour
  SELECT COUNT(*)
  INTO v_hourly_count
  FROM public.task_queue t
  JOIN public.campaigns c ON c.id = t.campaign_id
  WHERE c.user_id = p_user_id
    AND t.status = 'succeeded'
    AND t.locked_at >= NOW() - INTERVAL '1 hour';

  -- Count messages sent today
  SELECT COUNT(*)
  INTO v_daily_count
  FROM public.task_queue t
  JOIN public.campaigns c ON c.id = t.campaign_id
  WHERE c.user_id = p_user_id
    AND t.status = 'succeeded'
    AND DATE(t.locked_at) = CURRENT_DATE;

  -- Get last sent time
  SELECT MAX(t.locked_at)
  INTO v_last_sent
  FROM public.task_queue t
  JOIN public.campaigns c ON c.id = t.campaign_id
  WHERE c.user_id = p_user_id
    AND t.status = 'succeeded';

  -- Check hourly limit
  IF v_hourly_count >= v_hourly_cap THEN
    RETURN QUERY SELECT FALSE, 'Hourly limit reached';
    RETURN;
  END IF;

  -- Check daily limit
  IF v_daily_count >= v_daily_cap THEN
    RETURN QUERY SELECT FALSE, 'Daily limit reached';
    RETURN;
  END IF;

  -- Check minimum time between messages
  IF v_last_sent IS NOT NULL AND
     EXTRACT(EPOCH FROM (NOW() - v_last_sent)) * 1000 < v_min_between_ms THEN
    RETURN QUERY SELECT FALSE, 'Too soon after last message';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();