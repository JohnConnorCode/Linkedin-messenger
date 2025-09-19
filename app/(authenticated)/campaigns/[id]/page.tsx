import { createServerComponentClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { CampaignDetail } from './campaign-detail';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <div className="space-y-6">
      <CampaignDetail
        campaign={campaign}
        stats={stats?.[0] || {
          total_targets: 0,
          messages_sent: 0,
          messages_pending: 0,
          messages_failed: 0,
          approval_pending: 0
        }}
        todayCount={todayMessages?.length || 0}
      />

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <QueueView tasks={recentTasks || []} campaignId={params.id} />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <LogsView logs={sendLogs || []} />
        </TabsContent>

        <TabsContent value="targets" className="space-y-4">
          <TargetsView campaignId={params.id} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsView campaignId={params.id} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsView campaign={campaign} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Import client components
import { QueueView } from './queue-view';
import { LogsView } from './logs-view';
import { TargetsView } from './targets-view';
import { AnalyticsView } from './analytics-view';
import { SettingsView } from './settings-view';