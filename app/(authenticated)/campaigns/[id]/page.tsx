import { createServerComponentClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EnhancedCampaignView from './enhanced-campaign-view';

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerComponentClient();

  // Get campaign details with all relations
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      message_templates(*),
      user_settings(*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  // Get campaign statistics
  const { data: stats } = await supabase
    .rpc('get_campaign_stats', { p_campaign_id: params.id });

  // Get recent tasks
  const { data: recentTasks } = await supabase
    .from('task_queue')
    .select(`
      *,
      campaign_targets!inner(
        *,
        connections(*)
      )
    `)
    .eq('campaign_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get send logs for this campaign
  const { data: sendLogs } = await supabase
    .from('send_logs')
    .select('*')
    .in('task_id', recentTasks?.map(t => t.id) || [])
    .order('created_at', { ascending: false });

  // Get today's sends
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayMessages } = await supabase
    .from('message_log')
    .select('*')
    .eq('campaign_id', params.id)
    .gte('sent_at', today.toISOString());

  return (
    <EnhancedCampaignView
      campaignId={params.id}
      campaign={campaign}
    />
  );
}