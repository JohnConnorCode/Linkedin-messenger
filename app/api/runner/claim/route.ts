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

    const supabase = createServiceRoleClient();

    // Call the claim_task function
    const { data: tasks, error } = await supabase
      .rpc('claim_task', { p_runner_id: runnerId } as any) as { data: any[] | null; error: any };

    if (error) {
      console.error('Error claiming task:', error);
      return NextResponse.json({ error: 'Failed to claim task' }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ task: null }, { status: 200 });
    }

    const task = tasks![0];

    // Get full task details with campaign and target info
    const { data: fullTask } = (await supabase
      .from('task_queue')
      .select(`
        *,
        campaigns(
          *,
          message_templates(*),
          user_settings(*)
        ),
        campaign_targets(
          *,
          connections(*)
        )
      `)
      .eq('id', task.task_id)
      .single()) as { data: any };

    // Get selector pack version
    const selectorPack = {
      version: 'v2025.09.1',
      selectors: {
        messageButton: { role: 'button', name: /message/i },
        composer: { selector: '[contenteditable="true"][role="textbox"]' },
        sendButton: { role: 'button', name: /^send$/i },
      },
    };

    // Calculate pacing based on campaign settings
    const campaign = (fullTask as any)?.campaigns;
    const pacing = {
      jitter_ms: campaign?.jitter_ms || 5000,
      dwell_ms: campaign?.dwell_ms || 3000,
      typing_delay_ms: 50 + Math.random() * 100,
    };

    return NextResponse.json({
      task: fullTask,
      selector_pack: selectorPack,
      pacing,
    });
  } catch (error) {
    console.error('Runner claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}