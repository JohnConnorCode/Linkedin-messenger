-- Add schedule settings to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS schedule_settings JSONB DEFAULT NULL;

-- Add new campaign statuses for scheduling
ALTER TABLE campaigns
DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE campaigns
ADD CONSTRAINT campaigns_status_check CHECK (status IN (
  'draft', 'scheduled', 'active', 'paused', 'completed', 'failed'
));

-- Add error tracking columns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;

-- Function to check if campaign should run based on schedule
CREATE OR REPLACE FUNCTION is_campaign_scheduled_to_run(p_campaign_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings JSONB;
  v_enabled BOOLEAN;
  v_start_date DATE;
  v_end_date DATE;
  v_working_hours JSONB;
  v_working_days JSONB;
  v_current_day TEXT;
  v_current_time TIME;
BEGIN
  -- Get schedule settings
  SELECT schedule_settings INTO v_settings
  FROM campaigns
  WHERE id = p_campaign_id;
  
  -- If no settings or not enabled, return true (always run)
  IF v_settings IS NULL OR NOT (v_settings->>'enabled')::BOOLEAN THEN
    RETURN TRUE;
  END IF;
  
  -- Check date range
  v_start_date := (v_settings->>'startDate')::DATE;
  v_end_date := (v_settings->>'endDate')::DATE;
  
  IF CURRENT_DATE < v_start_date THEN
    RETURN FALSE;
  END IF;
  
  IF v_end_date IS NOT NULL AND CURRENT_DATE > v_end_date THEN
    RETURN FALSE;
  END IF;
  
  -- Check working days
  v_working_days := v_settings->'workingDays';
  v_current_day := LOWER(TO_CHAR(CURRENT_DATE, 'Day'));
  v_current_day := TRIM(v_current_day);
  
  IF v_working_days IS NOT NULL AND NOT (v_working_days->>v_current_day)::BOOLEAN THEN
    RETURN FALSE;
  END IF;
  
  -- Check working hours
  v_working_hours := v_settings->'workingHours';
  IF v_working_hours IS NOT NULL AND (v_working_hours->>'enabled')::BOOLEAN THEN
    v_current_time := CURRENT_TIME;
    
    IF v_current_time < (v_working_hours->>'startTime')::TIME OR
       v_current_time > (v_working_hours->>'endTime')::TIME THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get next scheduled run time
CREATE OR REPLACE FUNCTION get_next_scheduled_run(p_campaign_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_settings JSONB;
  v_working_hours JSONB;
  v_next_run TIMESTAMPTZ;
  v_start_time TIME;
  v_end_time TIME;
BEGIN
  SELECT schedule_settings INTO v_settings
  FROM campaigns
  WHERE id = p_campaign_id;
  
  IF v_settings IS NULL OR NOT (v_settings->>'enabled')::BOOLEAN THEN
    RETURN NOW();
  END IF;
  
  v_working_hours := v_settings->'workingHours';
  
  IF v_working_hours IS NOT NULL AND (v_working_hours->>'enabled')::BOOLEAN THEN
    v_start_time := (v_working_hours->>'startTime')::TIME;
    v_end_time := (v_working_hours->>'endTime')::TIME;
    
    -- If current time is before start time, next run is today at start time
    IF CURRENT_TIME < v_start_time THEN
      v_next_run := CURRENT_DATE + v_start_time;
    -- If current time is after end time, next run is tomorrow at start time
    ELSIF CURRENT_TIME > v_end_time THEN
      v_next_run := (CURRENT_DATE + INTERVAL '1 day') + v_start_time;
    -- Otherwise, can run now
    ELSE
      v_next_run := NOW();
    END IF;
  ELSE
    v_next_run := NOW();
  END IF;
  
  RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- Update campaign status based on schedule
CREATE OR REPLACE FUNCTION update_campaign_schedule_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If schedule settings are enabled and campaign is draft, change to scheduled
  IF NEW.schedule_settings IS NOT NULL AND 
     (NEW.schedule_settings->>'enabled')::BOOLEAN = true AND
     NEW.status = 'draft' THEN
    NEW.status := 'scheduled';
  END IF;
  
  -- If schedule is disabled and status is scheduled, change back to draft
  IF (NEW.schedule_settings IS NULL OR 
      (NEW.schedule_settings->>'enabled')::BOOLEAN = false) AND
     NEW.status = 'scheduled' THEN
    NEW.status := 'draft';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_schedule_status_trigger
  BEFORE INSERT OR UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_schedule_status();