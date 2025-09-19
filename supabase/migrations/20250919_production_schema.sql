-- Production Schema for LinkedIn Messenger
-- This migration adds all required tables, functions, and RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- User Settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT DEFAULT 'UTC',
  daily_send_limit INTEGER DEFAULT 50,
  min_delay_between_messages INTEGER DEFAULT 60, -- seconds
  max_delay_between_messages INTEGER DEFAULT 300, -- seconds
  auto_pause_on_rate_limit BOOLEAN DEFAULT true,
  require_manual_approval BOOLEAN DEFAULT true,
  browser_headless BOOLEAN DEFAULT false,
  notification_email TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Message Log table for tracking all sent messages
CREATE TABLE IF NOT EXISTS message_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES connections(id) ON DELETE SET NULL,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  message_body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('sent', 'failed', 'skipped')) DEFAULT 'sent',
  error_message TEXT,
  screenshot_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Threads table
CREATE TABLE IF NOT EXISTS conversation_threads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  is_active BOOLEAN DEFAULT true,
  thread_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, connection_id)
);

-- Browser Sessions table for managing Playwright sessions
CREATE TABLE IF NOT EXISTS browser_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  runner_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES linkedin_accounts(id) ON DELETE CASCADE,
  session_data JSONB NOT NULL, -- encrypted cookies/storage
  user_data_dir TEXT,
  status TEXT CHECK (status IN ('active', 'expired', 'invalidated')) DEFAULT 'active',
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Selector Packs for LinkedIn UI element targeting
CREATE TABLE IF NOT EXISTS selector_packs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  selectors JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  tested_at TIMESTAMPTZ,
  success_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Queue enhancements
ALTER TABLE task_queue
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Campaign enhancements
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS total_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_failed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paused_reason TEXT,
ADD COLUMN IF NOT EXISTS jitter_ms INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS dwell_ms INTEGER DEFAULT 3000;

-- Campaign Targets enhancements
ALTER TABLE campaign_targets
ADD COLUMN IF NOT EXISTS personalized_message TEXT,
ADD COLUMN IF NOT EXISTS skip_reason TEXT,
ADD COLUMN IF NOT EXISTS approved BOOLEAN,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Rate Limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL CHECK (limit_type IN ('daily', 'hourly', 'campaign')),
  resource_id UUID, -- campaign_id if limit_type = 'campaign'
  count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, limit_type, resource_id, window_start)
);

-- Analytics Events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_log_user_campaign ON message_log(user_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_log_sent_at ON message_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_task_queue_status_scheduled ON task_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_task_queue_runner ON task_queue(runner_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign_status ON campaign_targets(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window ON rate_limits(user_id, window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at);

-- Function to claim a task for a runner
CREATE OR REPLACE FUNCTION claim_task(p_runner_id TEXT)
RETURNS TABLE(task_id UUID) AS $$
BEGIN
  RETURN QUERY
  UPDATE task_queue
  SET
    status = 'processing',
    runner_id = p_runner_id,
    started_at = NOW(),
    updated_at = NOW()
  WHERE id = (
    SELECT id
    FROM task_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
      AND (requires_approval = false OR approved_at IS NOT NULL)
    ORDER BY scheduled_for ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_limit_type TEXT,
  p_resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  -- Determine window based on limit type
  IF p_limit_type = 'daily' THEN
    v_window_start := date_trunc('day', NOW());
    v_window_end := v_window_start + INTERVAL '1 day';
  ELSIF p_limit_type = 'hourly' THEN
    v_window_start := date_trunc('hour', NOW());
    v_window_end := v_window_start + INTERVAL '1 hour';
  ELSE
    RETURN true; -- Unknown limit type, allow
  END IF;

  -- Get user's limit setting
  SELECT daily_send_limit INTO v_limit
  FROM user_settings
  WHERE user_id = p_user_id;

  IF v_limit IS NULL THEN
    v_limit := 50; -- Default limit
  END IF;

  -- Get current count
  SELECT COALESCE(count, 0) INTO v_current_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND limit_type = p_limit_type
    AND (resource_id = p_resource_id OR (resource_id IS NULL AND p_resource_id IS NULL))
    AND window_start = v_window_start;

  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID,
  p_limit_type TEXT,
  p_resource_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  -- Determine window based on limit type
  IF p_limit_type = 'daily' THEN
    v_window_start := date_trunc('day', NOW());
    v_window_end := v_window_start + INTERVAL '1 day';
  ELSIF p_limit_type = 'hourly' THEN
    v_window_start := date_trunc('hour', NOW());
    v_window_end := v_window_start + INTERVAL '1 hour';
  ELSE
    RETURN;
  END IF;

  -- Upsert rate limit counter
  INSERT INTO rate_limits (user_id, limit_type, resource_id, count, window_start, window_end)
  VALUES (p_user_id, p_limit_type, p_resource_id, 1, v_window_start, v_window_end)
  ON CONFLICT (user_id, limit_type, resource_id, window_start)
  DO UPDATE SET count = rate_limits.count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get campaign statistics
CREATE OR REPLACE FUNCTION get_campaign_stats(p_campaign_id UUID)
RETURNS TABLE(
  total_targets BIGINT,
  messages_sent BIGINT,
  messages_pending BIGINT,
  messages_failed BIGINT,
  approval_pending BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_targets,
    COUNT(*) FILTER (WHERE status = 'sent') as messages_sent,
    COUNT(*) FILTER (WHERE status = 'pending') as messages_pending,
    COUNT(*) FILTER (WHERE status = 'failed') as messages_failed,
    COUNT(*) FILTER (WHERE status = 'pending' AND approved IS NULL) as approval_pending
  FROM campaign_targets
  WHERE campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE selector_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- User Settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Message Log policies
CREATE POLICY "Users can view own messages" ON message_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON message_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Conversation Threads policies
CREATE POLICY "Users can view own threads" ON conversation_threads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own threads" ON conversation_threads
  FOR ALL USING (auth.uid() = user_id);

-- Browser Sessions policies (service role only for runner)
CREATE POLICY "Users can view own sessions" ON browser_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Rate Limits policies
CREATE POLICY "Users can view own rate limits" ON rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Analytics Events policies
CREATE POLICY "Users can view own analytics" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Selector Packs policies (public read)
CREATE POLICY "Public can view active selector packs" ON selector_packs
  FOR SELECT USING (is_active = true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_threads_updated_at BEFORE UPDATE ON conversation_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_browser_sessions_updated_at BEFORE UPDATE ON browser_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default selector pack
INSERT INTO selector_packs (version, selectors, is_active, tested_at, success_rate)
VALUES (
  'v2025.01.1',
  '{
    "messageButton": {"role": "button", "name": "Message"},
    "composer": {"selector": "[contenteditable=\"true\"][role=\"textbox\"]"},
    "sendButton": {"role": "button", "name": "Send"},
    "connectButton": {"role": "button", "name": "Connect"},
    "moreButton": {"role": "button", "name": "More"},
    "profileName": {"selector": "h1"},
    "profileHeadline": {"selector": "[data-generated-suggestion-target]"}
  }'::jsonb,
  true,
  NOW(),
  95.5
)
ON CONFLICT (version) DO NOTHING;