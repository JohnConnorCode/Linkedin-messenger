import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      application: 'ok',
      database: 'checking',
      environment: process.env.NODE_ENV,
    },
    version: '1.0.0'
  };

  try {
    // Check database connection
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('campaigns')
      .select('count')
      .limit(0);

    checks.checks.database = error ? 'error' : 'ok';

    if (error) {
      checks.status = 'degraded';
    }
  } catch (e) {
    checks.checks.database = 'error';
    checks.status = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 :
                     checks.status === 'degraded' ? 206 : 503;

  return NextResponse.json(checks, { status: statusCode });
}
