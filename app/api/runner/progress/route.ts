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
    const {
      task_id,
      stage,
      status,
      message,
      screenshot_path,
      selector_version,
      meta,
    } = body;

    if (!task_id || !stage || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Insert log entry
    const { error } = await supabase.from('send_logs').insert({
      task_id,
      stage,
      status,
      message,
      screenshot_path,
      selector_version,
      meta,
    } as any);

    if (error) {
      console.error('Error inserting log:', error);
      return NextResponse.json(
        { error: 'Failed to insert log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Runner progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}