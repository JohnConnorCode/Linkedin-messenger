-- Create campaign backups table
CREATE TABLE IF NOT EXISTS public.campaign_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Backup details
  backup_path TEXT NOT NULL,
  size_bytes INTEGER,
  record_counts JSONB,
  
  -- Metadata
  description TEXT,
  version TEXT DEFAULT '1.0',
  is_auto_backup BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create indexes
CREATE INDEX idx_campaign_backups_campaign ON campaign_backups(campaign_id);
CREATE INDEX idx_campaign_backups_user ON campaign_backups(user_id);
CREATE INDEX idx_campaign_backups_created ON campaign_backups(created_at DESC);

-- Enable RLS
ALTER TABLE campaign_backups ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own backups" ON campaign_backups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own backups" ON campaign_backups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own backups" ON campaign_backups
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-backups', 'campaign-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own backups" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'campaign-backups' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own backups" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'campaign-backups' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own backups" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'campaign-backups' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to create automatic backup
CREATE OR REPLACE FUNCTION create_auto_backup(p_campaign_id UUID)
RETURNS UUID AS $$
DECLARE
  v_backup_id UUID;
  v_user_id UUID;
BEGIN
  -- Get user_id from campaign
  SELECT user_id INTO v_user_id
  FROM campaigns
  WHERE id = p_campaign_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;
  
  -- Create backup record
  INSERT INTO campaign_backups (
    campaign_id,
    user_id,
    backup_path,
    is_auto_backup,
    description
  ) VALUES (
    p_campaign_id,
    v_user_id,
    format('backups/%s/auto_%s.json', p_campaign_id, extract(epoch from now())),
    true,
    'Automatic backup'
  ) RETURNING id INTO v_backup_id;
  
  RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS VOID AS $$
BEGIN
  -- Delete expired backups
  DELETE FROM campaign_backups
  WHERE expires_at < NOW();
  
  -- Keep only last 5 auto backups per campaign
  DELETE FROM campaign_backups b1
  WHERE is_auto_backup = true
    AND id NOT IN (
      SELECT id
      FROM campaign_backups b2
      WHERE b2.campaign_id = b1.campaign_id
        AND b2.is_auto_backup = true
      ORDER BY created_at DESC
      LIMIT 5
    );
END;
$$ LANGUAGE plpgsql;

-- Create activity logs table for audit trail
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Activity details
  type TEXT NOT NULL CHECK (type IN (
    'export', 'import', 'backup', 'restore',
    'campaign_start', 'campaign_pause', 'campaign_stop',
    'bulk_approve', 'bulk_reject', 'settings_update'
  )),
  description TEXT,
  metadata JSONB,
  
  -- Request info
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for activity logs
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_campaign ON activity_logs(campaign_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(type);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- Enable RLS for activity logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for activity logs
CREATE POLICY "Users can view own activity" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);