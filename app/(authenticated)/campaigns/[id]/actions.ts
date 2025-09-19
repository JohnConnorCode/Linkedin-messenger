'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function startCampaign(campaignId: string) {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Update campaign status to active
  // @ts-ignore
  const { error: campaignError } = await supabase
    .from('campaigns')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
    .eq('user_id', user.id);

  if (campaignError) {
    throw new Error('Failed to start campaign');
  }

  // Create tasks for all approved targets that haven't been sent
  const { data: targets } = await supabase
    .from('campaign_targets')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .or('approval_status.eq.approved,approval_status.is.null');

  if (targets && targets.length > 0) {
    // Create task queue entries
    const tasks = targets.map((target, index) => ({
      campaign_id: campaignId,
      target_id: target.id,
      user_id: user.id,
      status: 'queued',
      run_after: new Date(Date.now() + index * 60000).toISOString(), // Space out by 1 minute
      requires_approval: target.approval_status === null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: taskError } = await supabase
      .from('task_queue')
      .insert(tasks);

    if (taskError) {
      console.error('Error creating tasks:', taskError);
    }
  }

  // Log the event
  await supabase
    .from('analytics_events')
    .insert({
      user_id: user.id,
      event_type: 'campaign_started',
      event_data: {
        campaign_id: campaignId,
        target_count: targets?.length || 0
      }
    });

  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function pauseCampaign(campaignId: string) {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Update campaign status to paused
  // @ts-ignore
  const { error } = await supabase
    .from('campaigns')
    .update({
      status: 'paused',
      paused_reason: 'User paused',
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error('Failed to pause campaign');
  }

  // Mark queued tasks as deferred
  // @ts-ignore
  await supabase
    .from('task_queue')
    .update({
      status: 'deferred',
      updated_at: new Date().toISOString()
    })
    .eq('campaign_id', campaignId)
    .eq('status', 'queued');

  // Log the event
  await supabase
    .from('analytics_events')
    .insert({
      user_id: user.id,
      event_type: 'campaign_paused',
      event_data: {
        campaign_id: campaignId
      }
    });

  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function stopCampaign(campaignId: string) {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Update campaign status to completed
  // @ts-ignore
  const { error } = await supabase
    .from('campaigns')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error('Failed to stop campaign');
  }

  // Cancel all pending tasks
  // @ts-ignore
  await supabase
    .from('task_queue')
    .update({
      status: 'failed',
      last_error: 'Campaign stopped by user',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('campaign_id', campaignId)
    .in('status', ['queued', 'deferred']);

  // Log the event
  await supabase
    .from('analytics_events')
    .insert({
      user_id: user.id,
      event_type: 'campaign_stopped',
      event_data: {
        campaign_id: campaignId
      }
    });

  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function retryFailedTasks(campaignId: string) {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Get failed tasks
  const { data: failedTasks } = await supabase
    .from('task_queue')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'failed')
    .lt('attempt', 3);

  if (failedTasks && failedTasks.length > 0) {
    // Reset failed tasks
    const taskIds = failedTasks.map(t => t.id);

    // @ts-ignore
    await supabase
      .from('task_queue')
      .update({
        status: 'queued',
        attempt: 0,
        last_error: null,
        run_after: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', taskIds);

    // Log the event
    await supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_type: 'tasks_retried',
        event_data: {
          campaign_id: campaignId,
          task_count: taskIds.length
        }
      });
  }

  revalidatePath(`/campaigns/${campaignId}`);
}