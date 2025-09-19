import { createServerComponentClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ApprovalQueue } from './approval-queue';

export default async function CampaignApprovalPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerComponentClient();

  // Get campaign details
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      message_templates(*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  // Get pending approval tasks
  const { data: pendingTasks } = await supabase
    .from('task_queue')
    .select(`
      *,
      campaign_targets!inner(
        *,
        connections(*)
      )
    `)
    .eq('campaign_id', params.id)
    .eq('requires_approval', true)
    .is('approved_at', null)
    .order('scheduled_for', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Approval Queue</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve messages for campaign: {campaign.name}
        </p>
      </div>

      <ApprovalQueue
        campaign={campaign}
        template={campaign.message_templates}
        tasks={pendingTasks || []}
      />
    </div>
  );
}