import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'checking',
      storage: 'checking',
    },
  };

  try {
    // Check database connectivity
    const supabase = createServiceRoleClient();
    const { error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    health.checks.database = dbError ? 'unhealthy' : 'healthy';

    // Check if storage buckets are accessible
    const { error: storageError } = await supabase
      .storage
      .from('screenshots')
      .list('', { limit: 1 });

    health.checks.storage = storageError ? 'unhealthy' : 'healthy';

    // Determine overall health
    const allHealthy = Object.values(health.checks).every(
      (check) => check === 'healthy'
    );

    health.status = allHealthy ? 'healthy' : 'degraded';

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        ...health,
        responseTime: `${responseTime}ms`,
      },
      {
        status: allHealthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ...health,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}