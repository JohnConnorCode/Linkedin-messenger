-- Complete Production Schema Enhancement
-- Adds missing tables and fields per production specifications

-- Session artifacts for encrypted storage
CREATE TABLE IF NOT EXISTS session_artifacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES linkedin_accounts(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('cookies', 'userDataDirBundle')),
  storage_path TEXT NOT NULL,
  enc_nonce BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Runner assignments for multi-runner support
CREATE TABLE IF NOT EXISTS runner_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  runner_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, runner_id)
);

-- Campaign enhancements with filtering and quiet hours
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS target_filter JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quiet_hours JSONB DEFAULT '{"start":"22:00","end":"07:00","tz":"Asia/Singapore"}',
ADD COLUMN IF NOT EXISTS hourly_cap INTEGER DEFAULT 5;

-- Enhanced campaign targets with approval
ALTER TABLE campaign_targets
ADD COLUMN IF NOT EXISTS personalized_body TEXT,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Enhanced task queue with locking and retry
ALTER TABLE task_queue
ADD COLUMN IF NOT EXISTS run_after TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS attempt INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_by TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Create proper task queue status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_status'
  ) THEN
    CREATE TYPE task_status AS ENUM ('queued', 'in_progress', 'succeeded', 'failed', 'deferred');
  END IF;
END $$;

-- Enhanced send logs with stages and selector versioning
CREATE TABLE IF NOT EXISTS send_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES task_queue(id) ON DELETE CASCADE,
  stage TEXT CHECK (stage IN ('navigation', 'openComposer', 'injectText', 'sendClick', 'postSend')),
  status TEXT CHECK (status IN ('info', 'success', 'warning', 'error')),
  message TEXT,
  screenshot_path TEXT,
  selector_version TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global user settings enhancements
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS global_daily_cap INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS global_hourly_cap INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS min_between_messages_ms INTEGER DEFAULT 90000,
ADD COLUMN IF NOT EXISTS humanize BOOLEAN DEFAULT true;

-- Connection enhancements
ALTER TABLE connections
ADD COLUMN IF NOT EXISTS csv_import_id UUID,
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sync_source TEXT CHECK (sync_source IN ('csv', 'linkedin_sync', 'manual'));

-- Template enhancements
ALTER TABLE message_templates
ADD COLUMN IF NOT EXISTS conditional_blocks JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS default_values JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_length INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS banned_phrases TEXT[] DEFAULT '{}';

-- Onboarding progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  runner_linked BOOLEAN DEFAULT false,
  timezone_confirmed BOOLEAN DEFAULT false,
  connections_imported BOOLEAN DEFAULT false,
  first_template_created BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CSV import tracking
CREATE TABLE IF NOT EXISTS csv_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  total_rows INTEGER,
  imported_count INTEGER,
  duplicate_count INTEGER,
  error_count INTEGER,
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')),
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Runner health monitoring
CREATE TABLE IF NOT EXISTS runner_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  runner_id TEXT NOT NULL,
  last_heartbeat TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  cpu_percent NUMERIC(5,2),
  memory_mb INTEGER,
  active_tasks INTEGER,
  version TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  error_class TEXT NOT NULL CHECK (error_class IN ('AUTH_REQUIRED', 'LIMIT_REACHED', 'SELECTOR_MISS', 'NETWORK', 'CAPTCHA', 'UNKNOWN')),
  error_message TEXT,
  stack_trace TEXT,
  context JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_artifacts_account ON session_artifacts(account_id);
CREATE INDEX IF NOT EXISTS idx_runner_assignments_user ON runner_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_runner_assignments_runner ON runner_assignments(runner_id);
CREATE INDEX IF NOT EXISTS idx_send_logs_task ON send_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_send_logs_created ON send_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_task_queue_locked ON task_queue(locked_by, status);
CREATE INDEX IF NOT EXISTS idx_task_queue_run_after ON task_queue(run_after, status);
CREATE INDEX IF NOT EXISTS idx_csv_imports_user ON csv_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_runner_health_runner ON runner_health(runner_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_class ON error_logs(error_class);

-- Function to claim task with advisory lock
CREATE OR REPLACE FUNCTION claim_task_atomic(
  p_runner_id TEXT,
  p_rate_limits_ok BOOLEAN DEFAULT true
)
RETURNS TABLE(
  task_id UUID,
  campaign_id UUID,
  target_id UUID,
  user_id UUID
) AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Only proceed if rate limits are OK
  IF NOT p_rate_limits_ok THEN
    RETURN;
  END IF;

  -- Select and lock a task atomically
  SELECT t.id INTO v_task_id
  FROM task_queue t
  JOIN campaigns c ON t.campaign_id = c.id
  WHERE t.status = 'queued'
    AND t.run_after <= NOW()
    AND t.locked_by IS NULL
    AND c.status = 'active'
    AND (NOT t.requires_approval OR t.approved_at IS NOT NULL)
  ORDER BY t.run_after ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_task_id IS NOT NULL THEN
    -- Update the task with runner info
    UPDATE task_queue
    SET
      status = 'in_progress',
      locked_by = p_runner_id,
      locked_at = NOW(),
      started_at = NOW(),
      updated_at = NOW()
    WHERE id = v_task_id;

    -- Return task details
    RETURN QUERY
    SELECT
      t.id as task_id,
      t.campaign_id,
      t.target_id,
      c.user_id
    FROM task_queue t
    JOIN campaigns c ON t.campaign_id = c.id
    WHERE t.id = v_task_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to release stuck tasks
CREATE OR REPLACE FUNCTION release_stuck_tasks()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE task_queue
  SET
    status = 'queued',
    locked_by = NULL,
    locked_at = NULL,
    attempt = attempt + 1
  WHERE status = 'in_progress'
    AND locked_at < NOW() - INTERVAL '10 minutes'
    AND attempt < max_retries;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- Function for calculating next run time with backoff
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_attempt INTEGER,
  p_base_delay_seconds INTEGER DEFAULT 600
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- Exponential backoff: 10min, 30min, 2hr
  CASE p_attempt
    WHEN 0 THEN RETURN NOW() + INTERVAL '10 minutes';
    WHEN 1 THEN RETURN NOW() + INTERVAL '30 minutes';
    WHEN 2 THEN RETURN NOW() + INTERVAL '2 hours';
    ELSE RETURN NOW() + INTERVAL '24 hours';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to check quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(
  p_quiet_hours JSONB,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_time TIME;
  v_start_time TIME;
  v_end_time TIME;
BEGIN
  -- Get current time in user timezone
  v_current_time := (NOW() AT TIME ZONE p_timezone)::TIME;
  v_start_time := (p_quiet_hours->>'start')::TIME;
  v_end_time := (p_quiet_hours->>'end')::TIME;

  -- Handle overnight quiet hours
  IF v_start_time > v_end_time THEN
    RETURN v_current_time >= v_start_time OR v_current_time < v_end_time;
  ELSE
    RETURN v_current_time >= v_start_time AND v_current_time < v_end_time;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for new tables
ALTER TABLE session_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_logs ENABLE ROW LEVEL SECURITY;

-- Session artifacts policies (service role only)
CREATE POLICY "Service role manages session artifacts" ON session_artifacts
  FOR ALL USING (auth.role() = 'service_role');

-- Runner assignments policies
CREATE POLICY "Users view own runner assignments" ON runner_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages runner assignments" ON runner_assignments
  FOR ALL USING (auth.role() = 'service_role');

-- Onboarding policies
CREATE POLICY "Users manage own onboarding" ON onboarding_progress
  FOR ALL USING (auth.uid() = user_id);

-- CSV imports policies
CREATE POLICY "Users view own imports" ON csv_imports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own imports" ON csv_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Runner health policies (public read for monitoring)
CREATE POLICY "Public read runner health" ON runner_health
  FOR SELECT USING (true);

-- Error logs policies
CREATE POLICY "Users view own errors" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Send logs policies
CREATE POLICY "Users view own send logs" ON send_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_queue t
      JOIN campaigns c ON t.campaign_id = c.id
      WHERE t.id = send_logs.task_id
      AND c.user_id = auth.uid()
    )
  );

-- Notification for task queue changes
CREATE OR REPLACE FUNCTION notify_task_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'task_queue_changes',
    json_build_object(
      'operation', TG_OP,
      'task_id', NEW.id,
      'status', NEW.status,
      'runner_id', NEW.locked_by
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_queue_notify
  AFTER INSERT OR UPDATE ON task_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_change();

-- Create cron job for releasing stuck tasks (requires pg_cron extension)
-- SELECT cron.schedule('release-stuck-tasks', '*/5 * * * *', 'SELECT release_stuck_tasks();');