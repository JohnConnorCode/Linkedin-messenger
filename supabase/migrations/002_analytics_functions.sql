-- Create function to get message statistics
CREATE OR REPLACE FUNCTION get_message_stats()
RETURNS TABLE (
  total_sent INT,
  total_succeeded INT,
  total_failed INT,
  total_queued INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT as total_sent,
    COUNT(*) FILTER (WHERE status = 'succeeded')::INT as total_succeeded,
    COUNT(*) FILTER (WHERE status = 'failed')::INT as total_failed,
    COUNT(*) FILTER (WHERE status = 'queued')::INT as total_queued
  FROM public.task_queue t
  JOIN public.campaigns c ON c.id = t.campaign_id
  WHERE c.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;