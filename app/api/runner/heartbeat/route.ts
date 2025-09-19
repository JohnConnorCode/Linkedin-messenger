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
    const { status, metrics } = body;

    const supabase = createServiceRoleClient();

    // Update runner status
    const { error: updateError } = await (supabase
      .from('runner_status') as any)
      .upsert({
        runner_id: runnerId,
        status: status || 'active',
        last_heartbeat: new Date().toISOString(),
        metrics: metrics || {},
      });

    if (updateError) {
      console.error('Error updating runner status:', updateError);
    }

    // Check for pending tasks
    const { count: pendingTasks } = await supabase
      .from('task_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    // Get runner configuration updates if any
    const { data: config } = await (supabase
      .from('runner_config') as any)
      .select('*')
      .eq('runner_id', runnerId)
      .single();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      pendingTasks: pendingTasks || 0,
      config: config || null,
    });
  } catch (error) {
    console.error('Runner heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}