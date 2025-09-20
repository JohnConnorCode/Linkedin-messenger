-- Add A/B testing support to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS is_ab_test BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS variant_name TEXT,
ADD COLUMN IF NOT EXISTS variant_group TEXT,
ADD COLUMN IF NOT EXISTS traffic_split INTEGER DEFAULT 50 CHECK (traffic_split >= 0 AND traffic_split <= 100);

-- Create campaign variants table for tracking variant performance
CREATE TABLE IF NOT EXISTS campaign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_type TEXT CHECK (variant_type IN ('control', 'test_a', 'test_b', 'test_c')),
  template_id UUID REFERENCES message_templates(id),
  traffic_split INTEGER DEFAULT 50,
  messages_sent INTEGER DEFAULT 0,
  responses_received INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  confidence_level DECIMAL(3,2),
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, variant_name)
);

-- Add variant tracking to campaign_targets
ALTER TABLE campaign_targets
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES campaign_variants(id),
ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- Add variant tracking to send_logs
ALTER TABLE send_logs
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES campaign_variants(id),
ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- Create index for variant lookups
CREATE INDEX IF NOT EXISTS idx_campaign_variants_campaign_id ON campaign_variants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_variant_id ON campaign_targets(variant_id);
CREATE INDEX IF NOT EXISTS idx_send_logs_variant_id ON send_logs(variant_id);

-- Function to randomly assign variants based on traffic split
CREATE OR REPLACE FUNCTION assign_variant_to_target(
  p_campaign_id UUID,
  p_connection_id UUID
) RETURNS UUID AS $$
DECLARE
  v_variant_id UUID;
  v_random_num INTEGER;
  v_cumulative_split INTEGER := 0;
BEGIN
  -- Get a random number between 1 and 100
  v_random_num := floor(random() * 100) + 1;

  -- Select variant based on cumulative traffic split
  SELECT id INTO v_variant_id
  FROM (
    SELECT
      id,
      SUM(traffic_split) OVER (ORDER BY variant_type) as cumulative
    FROM campaign_variants
    WHERE campaign_id = p_campaign_id
  ) variants
  WHERE v_random_num <= cumulative
  ORDER BY cumulative
  LIMIT 1;

  RETURN v_variant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate statistical significance
CREATE OR REPLACE FUNCTION calculate_variant_significance(
  p_variant_a_conversions INTEGER,
  p_variant_a_total INTEGER,
  p_variant_b_conversions INTEGER,
  p_variant_b_total INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  p1 DECIMAL;
  p2 DECIMAL;
  p_pooled DECIMAL;
  se DECIMAL;
  z_score DECIMAL;
BEGIN
  IF p_variant_a_total = 0 OR p_variant_b_total = 0 THEN
    RETURN 0;
  END IF;

  p1 := p_variant_a_conversions::DECIMAL / p_variant_a_total;
  p2 := p_variant_b_conversions::DECIMAL / p_variant_b_total;

  p_pooled := (p_variant_a_conversions + p_variant_b_conversions)::DECIMAL /
              (p_variant_a_total + p_variant_b_total);

  se := sqrt(p_pooled * (1 - p_pooled) * (1.0/p_variant_a_total + 1.0/p_variant_b_total));

  IF se = 0 THEN
    RETURN 0;
  END IF;

  z_score := (p1 - p2) / se;

  -- Return confidence level (simplified)
  IF abs(z_score) >= 2.58 THEN
    RETURN 0.99; -- 99% confidence
  ELSIF abs(z_score) >= 1.96 THEN
    RETURN 0.95; -- 95% confidence
  ELSIF abs(z_score) >= 1.645 THEN
    RETURN 0.90; -- 90% confidence
  ELSE
    RETURN abs(z_score) / 2.58; -- Proportional confidence
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for A/B test results
CREATE OR REPLACE VIEW campaign_ab_test_results AS
SELECT
  c.id as campaign_id,
  c.name as campaign_name,
  cv.id as variant_id,
  cv.variant_name,
  cv.variant_type,
  cv.traffic_split,
  cv.messages_sent,
  cv.responses_received,
  cv.conversions,
  CASE
    WHEN cv.messages_sent > 0
    THEN (cv.responses_received::DECIMAL / cv.messages_sent * 100)
    ELSE 0
  END as response_rate,
  CASE
    WHEN cv.messages_sent > 0
    THEN (cv.conversions::DECIMAL / cv.messages_sent * 100)
    ELSE 0
  END as conversion_rate,
  cv.confidence_level,
  cv.is_winner
FROM campaigns c
JOIN campaign_variants cv ON c.id = cv.campaign_id
WHERE c.is_ab_test = true
ORDER BY c.id, cv.variant_type;

-- Enable RLS for new tables
ALTER TABLE campaign_variants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own campaign variants" ON campaign_variants
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own campaign variants" ON campaign_variants
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Add triggers to update variant statistics
CREATE OR REPLACE FUNCTION update_variant_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    -- Update messages sent count
    IF NEW.status = 'sent' THEN
      UPDATE campaign_variants
      SET
        messages_sent = messages_sent + 1,
        updated_at = NOW()
      WHERE id = NEW.variant_id;
    END IF;

    -- Update response count (would need response tracking in real implementation)
    IF NEW.response_received = true THEN
      UPDATE campaign_variants
      SET
        responses_received = responses_received + 1,
        updated_at = NOW()
      WHERE id = NEW.variant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_variant_stats_on_send
  AFTER INSERT OR UPDATE ON send_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_variant_statistics();