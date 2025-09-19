'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function approveMessages(taskIds: string[]) {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Update task_queue to mark messages as approved
  const { error } = await supabase
    .from('task_queue')
    .update({
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .in('id', taskIds);

  if (error) {
    console.error('Error approving messages:', error);
    throw new Error('Failed to approve messages');
  }

  // Update campaign_targets to mark as approved
  const { error: targetError } = await supabase
    .from('campaign_targets')
    .update({
      approved: true,
    })
    .in('id', taskIds);

  if (targetError) {
    console.error('Error updating campaign targets:', targetError);
  }

  // Log the approval event
  await supabase
    .from('analytics_events')
    .insert({
      user_id: user.id,
      event_type: 'messages_approved',
      event_data: {
        count: taskIds.length,
        task_ids: taskIds,
      },
    });

  revalidatePath('/campaigns');
}

export async function rejectMessages(taskIds: string[]) {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Update task_queue to mark messages as failed
  const { error } = await supabase
    .from('task_queue')
    .update({
      status: 'failed',
      last_error: 'Rejected by user',
      completed_at: new Date().toISOString(),
    })
    .in('id', taskIds);

  if (error) {
    console.error('Error rejecting messages:', error);
    throw new Error('Failed to reject messages');
  }

  // Update campaign_targets to mark as skipped
  const { error: targetError } = await supabase
    .from('campaign_targets')
    .update({
      status: 'skipped',
      skip_reason: 'Rejected during manual approval',
      approved: false,
    })
    .in('id', taskIds);

  if (targetError) {
    console.error('Error updating campaign targets:', targetError);
  }

  // Log the rejection event
  await supabase
    .from('analytics_events')
    .insert({
      user_id: user.id,
      event_type: 'messages_rejected',
      event_data: {
        count: taskIds.length,
        task_ids: taskIds,
      },
    });

  revalidatePath('/campaigns');
}

export async function updateMessage(taskId: string, message: string) {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Get the campaign target ID from the task
  const { data: task, error: taskError } = await supabase
    .from('task_queue')
    .select('target_id')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    throw new Error('Task not found');
  }

  // Update the personalized message in campaign_targets
  const { error } = await supabase
    .from('campaign_targets')
    .update({
      personalized_message: message,
    })
    .eq('id', task.target_id);

  if (error) {
    console.error('Error updating message:', error);
    throw new Error('Failed to update message');
  }

  // Log the edit event
  await supabase
    .from('analytics_events')
    .insert({
      user_id: user.id,
      event_type: 'message_edited',
      event_data: {
        task_id: taskId,
        target_id: task.target_id,
      },
    });

  revalidatePath('/campaigns');
}