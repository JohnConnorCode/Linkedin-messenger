-- Create table for storing LinkedIn sessions with encryption
CREATE TABLE IF NOT EXISTS public.linkedin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Encrypted session data
  encrypted_cookies TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  encryption_auth_tag TEXT NOT NULL,

  -- Session metadata
  user_agent TEXT,
  viewport JSONB DEFAULT '{"width": 1366, "height": 768}',

  -- Session status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Error tracking
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one active session per user
  CONSTRAINT unique_active_session UNIQUE (user_id, is_active)
);

-- Create index for faster lookups
CREATE INDEX idx_linkedin_sessions_user_active ON linkedin_sessions(user_id, is_active);
CREATE INDEX idx_linkedin_sessions_expires ON linkedin_sessions(expires_at);

-- Enable RLS
ALTER TABLE linkedin_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own sessions" ON linkedin_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON linkedin_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON linkedin_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON linkedin_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to deactivate old sessions when creating new one
CREATE OR REPLACE FUNCTION deactivate_old_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Deactivate all other sessions for this user
  UPDATE linkedin_sessions
  SET
    is_active = false,
    updated_at = NOW()
  WHERE
    user_id = NEW.user_id
    AND id != NEW.id
    AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one active session
CREATE TRIGGER ensure_single_active_session
  AFTER INSERT ON linkedin_sessions
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION deactivate_old_sessions();

-- Function to check session validity
CREATE OR REPLACE FUNCTION check_session_validity(p_user_id UUID)
RETURNS TABLE (
  session_id UUID,
  is_valid BOOLEAN,
  status TEXT,
  expires_in_hours INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.id,
    CASE
      WHEN ls.expires_at IS NULL THEN true
      WHEN ls.expires_at > NOW() THEN true
      ELSE false
    END as is_valid,
    CASE
      WHEN ls.is_active = false THEN 'inactive'
      WHEN ls.expires_at IS NOT NULL AND ls.expires_at < NOW() THEN 'expired'
      WHEN ls.last_error IS NOT NULL AND ls.error_count > 3 THEN 'error'
      WHEN ls.last_verified_at < NOW() - INTERVAL '24 hours' THEN 'needs_verification'
      ELSE 'active'
    END as status,
    CASE
      WHEN ls.expires_at IS NOT NULL THEN
        EXTRACT(HOURS FROM (ls.expires_at - NOW()))::INTEGER
      ELSE NULL
    END as expires_in_hours
  FROM linkedin_sessions ls
  WHERE ls.user_id = p_user_id AND ls.is_active = true
  ORDER BY ls.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Table for session activity logs
CREATE TABLE IF NOT EXISTS public.session_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES linkedin_sessions(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'login', 'message_sent', 'connection_viewed', 'rate_limit',
    'error', 'verification', 'logout'
  )),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for activity logs
CREATE INDEX idx_session_activity_logs_session ON session_activity_logs(session_id);
CREATE INDEX idx_session_activity_logs_type ON session_activity_logs(activity_type);
CREATE INDEX idx_session_activity_logs_created ON session_activity_logs(created_at);

-- Enable RLS for activity logs
ALTER TABLE session_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for activity logs
CREATE POLICY "Users can view own session logs" ON session_activity_logs
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM linkedin_sessions WHERE user_id = auth.uid()
    )
  );

-- Function to log session activity
CREATE OR REPLACE FUNCTION log_session_activity(
  p_session_id UUID,
  p_activity_type TEXT,
  p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO session_activity_logs (
    session_id,
    activity_type,
    details
  ) VALUES (
    p_session_id,
    p_activity_type,
    p_details
  );

  -- Update last_used_at on the session
  UPDATE linkedin_sessions
  SET last_used_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for old sessions and logs
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS VOID AS $$
BEGIN
  -- Delete sessions older than 30 days
  DELETE FROM linkedin_sessions
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_active = false;

  -- Delete activity logs older than 7 days
  DELETE FROM session_activity_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;