import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRunnerToken } from '@/lib/auth/runner';

export async function POST(request: NextRequest) {
  try {
    // Verify runner authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const runnerId = await verifyRunnerToken(token);

    if (!runnerId) {
      return NextResponse.json({ error: 'Invalid runner token' }, { status: 401 });
    }

    const body = await request.json();
    const { task_id, success, error: taskError } = body;

    if (!task_id || success === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get current task details
    const { data: task } = (await supabase
      .from('task_queue')
      .select('*, campaigns(user_id)')
      .eq('id', task_id)
      .single()) as { data: any };

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task status
    const newStatus = success ? 'succeeded' : 'failed';
    const updateData: any = {
      status: newStatus,
      locked_by: null,
      locked_at: null,
    };

    if (!success) {
      updateData.last_error = taskError || 'Unknown error';

      // If we haven't exceeded max attempts, schedule retry
      if (task.attempt < 3) {
        // Calculate exponential backoff
        const delayMinutes = Math.pow(2, task.attempt) * 10; // 10, 20, 40 minutes
        const runAfter = new Date();
        runAfter.setMinutes(runAfter.getMinutes() + delayMinutes);

        updateData.status = 'deferred';
        updateData.run_after = runAfter.toISOString();
      }
    } else {
      // Update connection's last_messaged_at
      const { data: target } = (await supabase
        .from('campaign_targets')
        .select('connection_id')
        .eq('id', task.target_id)
        .single()) as { data: any };

      if (target) {
        await (supabase
          .from('connections') as any)
          .update({ last_messaged_at: new Date().toISOString() })
          .eq('id', target.connection_id);
      }
    }

    const { error: updateError } = await (supabase
      .from('task_queue') as any)
      .update(updateData)
      .eq('id', task_id);

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      );
    }

    // Check if campaign is complete
    const { count: remainingTasks } = await supabase
      .from('task_queue')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', task.campaign_id)
      .in('status', ['queued', 'deferred']);

    if (remainingTasks === 0) {
      // Mark campaign as completed
      await (supabase
        .from('campaigns') as any)
        .update({ status: 'completed' })
        .eq('id', task.campaign_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Runner complete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}