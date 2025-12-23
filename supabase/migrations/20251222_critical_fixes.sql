-- SuperDebate Critical Fixes Migration
-- Addresses: outcome tracking, message deduplication, atomic task claiming

-- =============================================================================
-- 1. OUTCOME TRACKING - Track actual business results
-- =============================================================================

-- Add outcome tracking columns to campaign_targets
ALTER TABLE campaign_targets
ADD COLUMN IF NOT EXISTS closed_won_value DECIMAL,
ADD COLUMN IF NOT EXISTS closed_won_type TEXT CHECK (closed_won_type IN ('funded', 'ambassador_signup', 'meeting_held', 'intro_made', 'other')),
ADD COLUMN IF NOT EXISTS conversion_source TEXT CHECK (conversion_source IN ('first_message', 'day_3', 'day_7', 'custom', 'manual'));

-- Index for outcome analytics
CREATE INDEX IF NOT EXISTS idx_campaign_targets_outcome
ON campaign_targets(campaign_id, closed_won_type)
WHERE closed_won_type IS NOT NULL;

-- =============================================================================
-- 2. MESSAGE HASH PERSISTENCE - Replace in-memory deduplication
-- =============================================================================

-- Create table for persistent message hash tracking
CREATE TABLE IF NOT EXISTS sent_message_hashes (
  hash TEXT PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
  audience_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for campaign-specific lookups
CREATE INDEX IF NOT EXISTS idx_hashes_campaign
ON sent_message_hashes(campaign_id);

-- Index for connection-specific lookups
CREATE INDEX IF NOT EXISTS idx_hashes_connection
ON sent_message_hashes(connection_id);

-- Grant permissions
GRANT ALL ON sent_message_hashes TO authenticated;

-- Enable RLS
ALTER TABLE sent_message_hashes ENABLE ROW LEVEL SECURITY;

-- RLS policy - users can only access hashes for their campaigns
CREATE POLICY "Users can view their own message hashes"
ON sent_message_hashes FOR SELECT
USING (
  campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert their own message hashes"
ON sent_message_hashes FOR INSERT
WITH CHECK (
  campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
);

-- =============================================================================
-- 3. ATOMIC TASK CLAIMING - Prevent race conditions
-- =============================================================================

-- Function for atomic task claiming with FOR UPDATE SKIP LOCKED
-- This prevents two runners from claiming the same task
CREATE OR REPLACE FUNCTION claim_next_task(p_runner_id TEXT, p_user_id UUID DEFAULT NULL)
RETURNS SETOF task_queue AS $$
  UPDATE task_queue
  SET
    status = 'processing',
    runner_id = p_runner_id,
    claimed_at = NOW(),
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM task_queue
    WHERE status = 'pending'
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      AND (p_user_id IS NULL OR user_id = p_user_id)
    ORDER BY priority DESC NULLS LAST, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE sql;

-- =============================================================================
-- 4. HELPER FUNCTIONS FOR OUTCOME TRACKING
-- =============================================================================

-- Function to mark a target as won with value
CREATE OR REPLACE FUNCTION mark_target_won(
  p_target_id UUID,
  p_won_type TEXT,
  p_value DECIMAL DEFAULT NULL,
  p_source TEXT DEFAULT 'manual'
)
RETURNS void AS $$
BEGIN
  UPDATE campaign_targets
  SET
    conversation_stage = 'closed_won',
    closed_won_type = p_won_type,
    closed_won_value = p_value,
    conversion_source = p_source,
    updated_at = NOW()
  WHERE id = p_target_id;

  -- Cancel any pending follow-ups
  UPDATE follow_up_queue
  SET status = 'cancelled', updated_at = NOW()
  WHERE target_id = p_target_id AND status = 'pending';

  -- Log the event
  INSERT INTO conversation_events (target_id, event_type, event_data)
  VALUES (
    p_target_id,
    'stage_changed',
    jsonb_build_object(
      'new_stage', 'closed_won',
      'won_type', p_won_type,
      'value', p_value,
      'source', p_source
    )
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. API SIGNING VERIFICATION (for use in RPC if needed)
-- =============================================================================

-- Store API secrets for runner authentication (optional, can use env vars instead)
CREATE TABLE IF NOT EXISTS api_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  secret_hash TEXT NOT NULL, -- Store hashed version, not plaintext
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- =============================================================================
-- 6. CONVERSION SOURCE TRACKING TRIGGER
-- =============================================================================

-- Function to track which message led to conversion
CREATE OR REPLACE FUNCTION track_conversion_source()
RETURNS TRIGGER AS $$
DECLARE
  last_follow_up follow_up_queue%ROWTYPE;
BEGIN
  -- Only track when moving to positive response states
  IF NEW.response_type IN ('positive', 'intro_offered')
     AND OLD.response_type IS DISTINCT FROM NEW.response_type THEN

    -- Check if there was a recent follow-up sent
    SELECT * INTO last_follow_up
    FROM follow_up_queue
    WHERE target_id = NEW.id
      AND status = 'sent'
      AND sent_at IS NOT NULL
    ORDER BY sent_at DESC
    LIMIT 1;

    IF last_follow_up.id IS NOT NULL THEN
      -- Conversion came after a follow-up
      NEW.conversion_source := last_follow_up.follow_up_type;
    ELSE
      -- Conversion came from first message
      NEW.conversion_source := 'first_message';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conversion source tracking
DROP TRIGGER IF EXISTS trigger_track_conversion_source ON campaign_targets;
CREATE TRIGGER trigger_track_conversion_source
BEFORE UPDATE OF response_type ON campaign_targets
FOR EACH ROW
EXECUTE FUNCTION track_conversion_source();
