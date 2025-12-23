-- Migration: Atomic Operations for Race Condition Fixes
-- Date: 2023-12-23
-- Purpose: Add atomic increment and transaction functions to prevent race conditions

-- ============================================================================
-- ATOMIC FOLLOW-UP COUNT INCREMENT
-- Prevents read-modify-write race condition
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_follow_up_count(
  p_target_id UUID,
  p_next_follow_up_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE campaign_targets
  SET
    follow_up_count = COALESCE(follow_up_count, 0) + 1,
    next_follow_up_at = COALESCE(p_next_follow_up_at, next_follow_up_at),
    updated_at = NOW()
  WHERE id = p_target_id
  RETURNING follow_up_count INTO v_new_count;

  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ATOMIC MESSAGE GENERATION TRANSACTION
-- Ensures classification, target update, and hash persistence are atomic
-- ============================================================================

CREATE OR REPLACE FUNCTION save_generated_message(
  p_campaign_id UUID,
  p_connection_id UUID,
  p_audience_type TEXT,
  p_classification_confidence DECIMAL,
  p_personalization_hooks JSONB,
  p_personalized_message TEXT,
  p_metadata JSONB,
  p_message_hash TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_target_id UUID;
  v_result JSONB;
BEGIN
  -- Step 1: Update campaign_targets (get target_id)
  UPDATE campaign_targets
  SET
    audience_type = p_audience_type,
    classification_confidence = p_classification_confidence,
    personalization_hooks = p_personalization_hooks,
    personalized_message = p_personalized_message,
    metadata = COALESCE(metadata, '{}'::jsonb) || p_metadata,
    updated_at = NOW()
  WHERE campaign_id = p_campaign_id AND connection_id = p_connection_id
  RETURNING id INTO v_target_id;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Target not found for campaign % and connection %', p_campaign_id, p_connection_id;
  END IF;

  -- Step 2: Insert message hash (upsert to handle duplicates)
  INSERT INTO sent_message_hashes (hash, campaign_id, connection_id, created_at)
  VALUES (p_message_hash, p_campaign_id, p_connection_id, NOW())
  ON CONFLICT (hash) DO NOTHING;

  -- Return success with target_id
  v_result := jsonb_build_object(
    'success', true,
    'target_id', v_target_id
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error info
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ATOMIC FOLLOW-UP CREATION
-- Ensures follow-up insert and count increment are atomic
-- ============================================================================

CREATE OR REPLACE FUNCTION create_follow_up_atomic(
  p_campaign_id UUID,
  p_target_id UUID,
  p_connection_id UUID,
  p_follow_up_type TEXT,
  p_scheduled_for TIMESTAMPTZ,
  p_message_template TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_follow_up_id UUID;
  v_new_count INTEGER;
BEGIN
  -- Step 1: Insert follow-up
  INSERT INTO follow_up_queue (
    campaign_id,
    target_id,
    connection_id,
    follow_up_type,
    scheduled_for,
    message_template,
    status,
    created_at
  )
  VALUES (
    p_campaign_id,
    p_target_id,
    p_connection_id,
    p_follow_up_type,
    p_scheduled_for,
    p_message_template,
    'pending',
    NOW()
  )
  RETURNING id INTO v_follow_up_id;

  -- Step 2: Atomic increment of follow-up count
  UPDATE campaign_targets
  SET
    follow_up_count = COALESCE(follow_up_count, 0) + 1,
    next_follow_up_at = p_scheduled_for,
    updated_at = NOW()
  WHERE id = p_target_id
  RETURNING follow_up_count INTO v_new_count;

  -- Step 3: Log the event
  INSERT INTO conversation_events (target_id, event_type, event_data, created_at)
  VALUES (
    p_target_id,
    'follow_up_scheduled',
    jsonb_build_object(
      'follow_up_id', v_follow_up_id,
      'type', p_follow_up_type,
      'scheduled_for', p_scheduled_for
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'follow_up_id', v_follow_up_id,
    'follow_up_count', v_new_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MARK TARGET AS WON (Atomic)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_target_won(
  p_target_id UUID,
  p_won_type TEXT,
  p_won_value DECIMAL DEFAULT NULL,
  p_win_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_follow_up_count INTEGER;
  v_conversion_source TEXT;
BEGIN
  -- Get current follow-up count to determine conversion source
  SELECT follow_up_count INTO v_follow_up_count
  FROM campaign_targets
  WHERE id = p_target_id;

  -- Determine conversion source based on follow-ups
  IF v_follow_up_count IS NULL OR v_follow_up_count = 0 THEN
    v_conversion_source := 'first_message';
  ELSIF v_follow_up_count = 1 THEN
    v_conversion_source := 'day_3';
  ELSE
    v_conversion_source := 'day_7';
  END IF;

  -- Update target atomically
  UPDATE campaign_targets
  SET
    conversation_stage = 'closed_won',
    closed_won_type = p_won_type,
    closed_won_value = p_won_value,
    conversion_source = v_conversion_source,
    win_reason = p_win_reason,
    converted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_target_id
    AND conversation_stage != 'closed_won'; -- Idempotent

  -- Log the event
  INSERT INTO conversation_events (target_id, event_type, event_data, created_at)
  VALUES (
    p_target_id,
    'closed_won',
    jsonb_build_object(
      'won_type', p_won_type,
      'won_value', p_won_value,
      'win_reason', p_win_reason,
      'conversion_source', v_conversion_source
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'conversion_source', v_conversion_source
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADD MISSING COLUMNS FOR ENHANCED TRACKING
-- ============================================================================

-- Add win_reason for capturing why someone converted
ALTER TABLE campaign_targets
ADD COLUMN IF NOT EXISTS win_reason TEXT;

-- Add converted_at for time-to-conversion tracking
ALTER TABLE campaign_targets
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Add qualification_status for tracking qualification progress
ALTER TABLE campaign_targets
ADD COLUMN IF NOT EXISTS qualification_status TEXT
CHECK (qualification_status IN ('unqualified', 'qualifying', 'qualified', 'disqualified'));

-- Add qualification_data for storing qualification answers
ALTER TABLE campaign_targets
ADD COLUMN IF NOT EXISTS qualification_data JSONB;

-- Index for conversion analytics
CREATE INDEX IF NOT EXISTS idx_targets_conversion
ON campaign_targets(conversation_stage, closed_won_type, converted_at);

-- Index for qualification tracking
CREATE INDEX IF NOT EXISTS idx_targets_qualification
ON campaign_targets(qualification_status)
WHERE qualification_status IS NOT NULL;

-- ============================================================================
-- ATOMIC TASK SUCCESS (For Runner)
-- Ensures all post-send updates happen in one transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_task_success_atomic(
  p_task_id UUID,
  p_screenshot_url TEXT DEFAULT NULL,
  p_sent_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_target_id UUID;
  v_connection_id UUID;
  v_user_id UUID;
  v_campaign_id UUID;
BEGIN
  -- Step 1: Get task details and mark as succeeded
  UPDATE task_queue
  SET
    status = 'succeeded',
    completed_at = NOW(),
    updated_at = NOW(),
    screenshot_url = COALESCE(p_screenshot_url, screenshot_url)
  WHERE id = p_task_id
  RETURNING target_id, user_id, campaign_id INTO v_target_id, v_user_id, v_campaign_id;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Task not found: %', p_task_id;
  END IF;

  -- Step 2: Get connection_id from target
  SELECT connection_id INTO v_connection_id
  FROM campaign_targets
  WHERE id = v_target_id;

  -- Step 3: Update target sent_at (CRITICAL for follow-up scheduling)
  UPDATE campaign_targets
  SET
    sent_at = p_sent_at,
    conversation_stage = 'first_message',
    updated_at = NOW()
  WHERE id = v_target_id
    AND sent_at IS NULL; -- Only if not already sent (idempotent)

  -- Step 4: Update connection last_messaged_at
  UPDATE connections
  SET
    last_messaged_at = p_sent_at,
    updated_at = NOW()
  WHERE id = v_connection_id;

  -- Step 5: Increment rate limit counter
  INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
  VALUES (v_user_id, 'linkedin_send', 1, NOW())
  ON CONFLICT (user_id, endpoint) DO UPDATE
  SET
    request_count = CASE
      WHEN rate_limits.window_start < NOW() - INTERVAL '1 day' THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < NOW() - INTERVAL '1 day' THEN NOW()
      ELSE rate_limits.window_start
    END;

  -- Step 6: Update campaign stats
  UPDATE campaigns
  SET
    total_sent = COALESCE(total_sent, 0) + 1,
    updated_at = NOW()
  WHERE id = v_campaign_id;

  -- Step 7: Log the event
  INSERT INTO conversation_events (target_id, event_type, event_data, created_at)
  VALUES (
    v_target_id,
    'message_sent',
    jsonb_build_object(
      'task_id', p_task_id,
      'sent_at', p_sent_at,
      'screenshot_url', p_screenshot_url
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_id', v_target_id,
    'connection_id', v_connection_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RATE LIMITS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, endpoint)
);
