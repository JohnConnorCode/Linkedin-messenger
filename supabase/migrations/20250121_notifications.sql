-- Create notifications table for user alerts and updates
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification details
  type TEXT NOT NULL CHECK (type IN (
    'campaign_started', 'campaign_completed', 'campaign_error',
    'message_sent', 'message_failed', 'rate_limit',
    'approval_needed', 'test_message', 'system_alert',
    'connection_accepted', 'reply_received'
  )),
  title TEXT NOT NULL,
  body TEXT,
  
  -- Related entities
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  target_id UUID REFERENCES campaign_targets(id) ON DELETE CASCADE,
  
  -- Metadata
  metadata JSONB,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  
  -- Actions
  action_url TEXT,
  action_label TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_campaign ON notifications(campaign_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications" ON notifications
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, body, campaign_id, target_id,
    metadata, priority, action_url, action_label
  ) VALUES (
    p_user_id, p_type, p_title, p_body, p_campaign_id, p_target_id,
    p_metadata, p_priority, p_action_url, p_action_label
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND read = false;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = auth.uid() 
      AND read = false 
      AND dismissed = false
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications for campaign events
CREATE OR REPLACE FUNCTION notify_campaign_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Campaign completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM create_notification(
      NEW.user_id,
      'campaign_completed',
      'Campaign Completed',
      format('Your campaign "%s" has been completed successfully.', NEW.name),
      NEW.id,
      NULL,
      jsonb_build_object(
        'campaign_name', NEW.name,
        'completed_at', NOW()
      ),
      'normal',
      '/campaigns/' || NEW.id,
      'View Results'
    );
  END IF;
  
  -- Campaign error
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    PERFORM create_notification(
      NEW.user_id,
      'campaign_error',
      'Campaign Failed',
      format('Your campaign "%s" encountered an error and was stopped.', NEW.name),
      NEW.id,
      NULL,
      jsonb_build_object(
        'campaign_name', NEW.name,
        'failed_at', NOW(),
        'error', NEW.error_message
      ),
      'high',
      '/campaigns/' || NEW.id,
      'View Details'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_notification_trigger
  AFTER UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION notify_campaign_event();

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS VOID AS $$
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM notifications
  WHERE read = true AND read_at < NOW() - INTERVAL '30 days';
  
  -- Delete dismissed notifications older than 7 days
  DELETE FROM notifications
  WHERE dismissed = true AND dismissed_at < NOW() - INTERVAL '7 days';
  
  -- Delete expired notifications
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;