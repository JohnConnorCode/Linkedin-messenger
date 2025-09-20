import { NextResponse } from 'next/server';
import { getAIProcessor } from '@/lib/workers/ai-processor';
import { createServerComponentClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerComponentClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, connectionId, campaignId } = await request.json();
    const processor = getAIProcessor();

    switch (action) {
      case 'start':
        await processor.start();
        return NextResponse.json({ status: 'started' });

      case 'stop':
        processor.stop();
        return NextResponse.json({ status: 'stopped' });

      case 'process-single':
        if (!connectionId || !campaignId) {
          return NextResponse.json({ error: 'Missing connectionId or campaignId' }, { status: 400 });
        }
        const result = await processor.processSingleConnection(connectionId, campaignId);
        return NextResponse.json(result);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI Processor API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createServerComponentClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get queue stats
    const { data: stats } = await supabase
      .from('ai_personalization_queue')
      .select('status')
      .eq('user_id', user.id);

    const counts = {
      pending: stats?.filter(s => s.status === 'pending').length || 0,
      processing: stats?.filter(s => s.status === 'processing').length || 0,
      completed: stats?.filter(s => s.status === 'completed').length || 0,
      failed: stats?.filter(s => s.status === 'failed').length || 0,
    };

    return NextResponse.json({ stats: counts });
  } catch (error) {
    console.error('AI Processor API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}