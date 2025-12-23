-- SuperDebate Conversation Tracking Migration
-- Adds fields for audience classification, conversation stages, and follow-up tracking

-- Add SuperDebate-specific columns to campaign_targets
ALTER TABLE campaign_targets
ADD COLUMN IF NOT EXISTS audience_type TEXT CHECK (audience_type IN ('funder', 'ambassador', 'debater', 'friend')),
ADD COLUMN IF NOT EXISTS conversation_stage TEXT DEFAULT 'first_message' CHECK (conversation_stage IN ('first_message', 'awaiting_response', 'in_dialogue', 'meeting_scheduled', 'closed_won', 'closed_lost')),
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'cold' CHECK (temperature IN ('cold', 'warm', 'hot')),
ADD COLUMN IF NOT EXISTS response_type TEXT CHECK (response_type IN ('positive', 'send_more_info', 'busy', 'intro_offered', 'hard_no', 'no_response')),
ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS personalization_hooks JSONB,
ADD COLUMN IF NOT EXISTS classification_confidence DECIMAL(3,2);

-- Add SuperDebate-specific columns to connections
ALTER TABLE connections
ADD COLUMN IF NOT EXISTS audience_types TEXT[],
ADD COLUMN IF NOT EXISTS debate_background TEXT,
ADD COLUMN IF NOT EXISTS investor_status TEXT,
ADD COLUMN IF NOT EXISTS community_experience TEXT,
ADD COLUMN IF NOT EXISTS profile_signals JSONB;

-- Add SuperDebate-specific columns to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS superdebate_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_audience_type TEXT CHECK (default_audience_type IN ('funder', 'ambassador', 'debater', 'friend')),
ADD COLUMN IF NOT EXISTS auto_follow_up BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_schedule JSONB DEFAULT '{"day_3": true, "day_7": true}'::jsonb;

-- Create follow_up_queue table for automated follow-ups
CREATE TABLE IF NOT EXISTS follow_up_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES campaign_targets(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('day_3', 'day_7', 'custom')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  message_template TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'skipped')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversation_events table for tracking all interactions
CREATE TABLE IF NOT EXISTS conversation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID NOT NULL REFERENCES campaign_targets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('message_sent', 'message_received', 'response_classified', 'stage_changed', 'follow_up_scheduled', 'meeting_booked', 'objection_handled')),
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient follow-up queries
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_scheduled
ON follow_up_queue(scheduled_for)
WHERE status = 'pending';

-- Create index for conversation stage queries
CREATE INDEX IF NOT EXISTS idx_campaign_targets_stage
ON campaign_targets(campaign_id, conversation_stage);

-- Create index for audience type queries
CREATE INDEX IF NOT EXISTS idx_campaign_targets_audience
ON campaign_targets(campaign_id, audience_type);

-- Create function to automatically schedule follow-ups
CREATE OR REPLACE FUNCTION schedule_follow_up()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule if auto_follow_up is enabled for the campaign
  IF EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = NEW.campaign_id
    AND auto_follow_up = true
  ) THEN
    -- Schedule day 3 follow-up
    INSERT INTO follow_up_queue (campaign_id, target_id, connection_id, follow_up_type, scheduled_for)
    SELECT
      NEW.campaign_id,
      NEW.id,
      NEW.connection_id,
      'day_3',
      NEW.sent_at + INTERVAL '3 days'
    WHERE NEW.sent_at IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- Schedule day 7 follow-up
    INSERT INTO follow_up_queue (campaign_id, target_id, connection_id, follow_up_type, scheduled_for)
    SELECT
      NEW.campaign_id,
      NEW.id,
      NEW.connection_id,
      'day_7',
      NEW.sent_at + INTERVAL '7 days'
    WHERE NEW.sent_at IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-scheduling follow-ups
DROP TRIGGER IF EXISTS trigger_schedule_follow_up ON campaign_targets;
CREATE TRIGGER trigger_schedule_follow_up
AFTER INSERT OR UPDATE OF sent_at ON campaign_targets
FOR EACH ROW
WHEN (NEW.sent_at IS NOT NULL AND NEW.conversation_stage = 'first_message')
EXECUTE FUNCTION schedule_follow_up();

-- Create function to cancel follow-ups when response received
CREATE OR REPLACE FUNCTION cancel_follow_ups_on_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Cancel pending follow-ups when we receive a response
  IF NEW.conversation_stage IN ('in_dialogue', 'meeting_scheduled', 'closed_won', 'closed_lost')
     AND OLD.conversation_stage = 'awaiting_response' THEN
    UPDATE follow_up_queue
    SET status = 'cancelled', updated_at = NOW()
    WHERE target_id = NEW.id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to cancel follow-ups
DROP TRIGGER IF EXISTS trigger_cancel_follow_ups ON campaign_targets;
CREATE TRIGGER trigger_cancel_follow_ups
AFTER UPDATE OF conversation_stage ON campaign_targets
FOR EACH ROW
EXECUTE FUNCTION cancel_follow_ups_on_response();

-- Grant permissions
GRANT ALL ON follow_up_queue TO authenticated;
GRANT ALL ON conversation_events TO authenticated;

-- Enable RLS
ALTER TABLE follow_up_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for follow_up_queue
CREATE POLICY "Users can view their own follow-ups"
ON follow_up_queue FOR SELECT
USING (
  campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage their own follow-ups"
ON follow_up_queue FOR ALL
USING (
  campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
);

-- RLS policies for conversation_events
CREATE POLICY "Users can view their own events"
ON conversation_events FOR SELECT
USING (
  target_id IN (
    SELECT id FROM campaign_targets
    WHERE campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert their own events"
ON conversation_events FOR INSERT
WITH CHECK (
  target_id IN (
    SELECT id FROM campaign_targets
    WHERE campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())
  )
);
