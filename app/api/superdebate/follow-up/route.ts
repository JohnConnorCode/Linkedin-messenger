/**
 * SuperDebate Follow-up Management API
 * GET /api/superdebate/follow-up - Get pending follow-ups
 * POST /api/superdebate/follow-up - Create follow-up for target
 *
 * Security:
 * - HMAC signature verification for runner requests
 * - Ownership verification for user requests
 * - Error visibility (no silent failures)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { SuperDebateOutreachService, FOLLOW_UP_SEQUENCES } from '@/lib/superdebate';
import { verifyRunnerRequest } from '@/lib/auth/request-signing';
import { verifyCampaignOwnership, verifyTargetOwnership } from '@/lib/auth/ownership';

// Auth context types
type AuthContextSuccess = {
  authorized: true;
  isServiceAuth: boolean;
  userId?: string;
  supabase: ReturnType<typeof createClient>;
  serviceSupabase: ReturnType<typeof createClient>;
};

type AuthContextFailure = {
  authorized: false;
  supabase: null;
  serviceSupabase?: undefined;
  isServiceAuth?: undefined;
  userId?: undefined;
};

type AuthContext = AuthContextSuccess | AuthContextFailure;

// Helper to verify auth and create supabase client
async function getAuthContext(request: NextRequest, body?: object): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization');
  const signatureHeader = request.headers.get('x-signature');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Verify authentication
  const authResult = await verifyRunnerRequest(authHeader, signatureHeader, body || {});

  if (authResult.valid) {
    if (authResult.method === 'service_key' && process.env.NODE_ENV === 'production') {
      console.warn('SECURITY: Service role key used in Authorization header - migrate to HMAC signing');
    }
    return {
      authorized: true,
      isServiceAuth: true,
      supabase: createClient(supabaseUrl!, serviceRoleKey!),
      serviceSupabase: createClient(supabaseUrl!, serviceRoleKey!),
    };
  }

  // Try user authentication
  const userSupabase = await createServerComponentClient();
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, supabase: null };
  }

  // SECURITY FIX: User auth uses user's own client with RLS enforced
  return {
    authorized: true,
    isServiceAuth: false,
    userId: user.id,
    supabase: userSupabase as unknown as ReturnType<typeof createClient>,
    serviceSupabase: createClient(supabaseUrl!, serviceRoleKey!),
  };
}

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Type is now narrowed to AuthContextSuccess
    const { supabase, serviceSupabase, isServiceAuth, userId } = authContext;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    // SECURITY: User auth REQUIRES campaignId to prevent data enumeration
    // Service auth can query all follow-ups (for runner processing)
    if (!isServiceAuth) {
      if (!campaignId) {
        return NextResponse.json(
          { error: 'campaignId is required' },
          { status: 400 }
        );
      }

      // Verify user owns this campaign using service client for ownership check
      const ownsCampaign = await verifyCampaignOwnership(
        serviceSupabase,
        userId!,
        campaignId
      );
      if (!ownsCampaign) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this campaign' },
          { status: 403 }
        );
      }
    }

    // Get pending follow-ups due today or earlier
    let query = supabase
      .from('follow_up_queue')
      .select(`
        *,
        campaign_targets(
          id,
          personalized_message,
          connection:connections(
            id,
            first_name,
            last_name,
            full_name,
            linkedin_url,
            headline,
            company
          )
        ),
        campaigns(id, name)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: followUps, error } = await query;

    if (error) {
      console.error('Failed to fetch follow-ups:', error);
      return NextResponse.json(
        { error: 'Failed to fetch follow-ups', details: error.message },
        { status: 500 }
      );
    }

    // Group by type
    const grouped = {
      day_3: followUps?.filter((f: { follow_up_type: string }) => f.follow_up_type === 'day_3') || [],
      day_7: followUps?.filter((f: { follow_up_type: string }) => f.follow_up_type === 'day_7') || [],
      custom: followUps?.filter((f: { follow_up_type: string }) => f.follow_up_type === 'custom') || [],
    };

    return NextResponse.json({
      success: true,
      total: followUps?.length || 0,
      grouped,
      followUps,
    });
  } catch (error) {
    console.error('Follow-up fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetId, campaignId, connectionId, followUpType, customMessage } = body;

    const authContext = await getAuthContext(request, body);
    if (!authContext.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Type is now narrowed to AuthContextSuccess
    const { supabase, serviceSupabase, isServiceAuth, userId } = authContext;

    // Idempotency key support - prevents duplicate follow-ups on retries
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('follow_up_queue')
        .select('id, follow_up_type, scheduled_for, message_template')
        .eq('idempotency_key', idempotencyKey)
        .single();

      if (existing) {
        // Return cached result for idempotent retry
        return NextResponse.json({
          success: true,
          followUp: existing,
          cached: true,
          message: existing.message_template,
        });
      }
    }

    // Validate required fields
    if (!targetId || !campaignId || !connectionId) {
      return NextResponse.json(
        { error: 'targetId, campaignId, and connectionId are required' },
        { status: 400 }
      );
    }

    // Verify ownership if user auth (not service auth)
    if (!isServiceAuth) {
      const ownsTarget = await verifyTargetOwnership(
        serviceSupabase,
        userId!,
        targetId
      );
      if (!ownsTarget) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this target' },
          { status: 403 }
        );
      }
    }

    // Use service client for database operations (user already verified via ownership check)
    const dbClient = serviceSupabase;

    // Get the connection's first name for template personalization
    const { data: connection, error: connError } = await dbClient
      .from('connections')
      .select('first_name, full_name')
      .eq('id', connectionId)
      .single();

    if (connError) {
      console.error('Failed to fetch connection:', connError);
      return NextResponse.json(
        { error: 'Failed to fetch connection', details: connError.message },
        { status: 500 }
      );
    }

    const firstName = connection?.first_name || connection?.full_name?.split(' ')[0] || 'there';

    // Initialize service
    const service = new SuperDebateOutreachService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get target's sent_at date to calculate days since contact
    const { data: target, error: targetError } = await dbClient
      .from('campaign_targets')
      .select('sent_at')
      .eq('id', targetId)
      .single();

    if (targetError) {
      console.error('Failed to fetch target:', targetError);
      return NextResponse.json(
        { error: 'Failed to fetch target', details: targetError.message },
        { status: 500 }
      );
    }

    let messageTemplate = customMessage;
    let type = followUpType || 'custom';

    if (!messageTemplate && target?.sent_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(target.sent_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const followUp = service.generateFollowUp(firstName, daysSince);
      if (followUp) {
        messageTemplate = followUp.template;
        type = followUp.type;
      }
    }

    if (!messageTemplate) {
      // Default to day 3 template if we can't determine
      messageTemplate = FOLLOW_UP_SEQUENCES.no_response_day_3.template.replace(
        '{first_name}',
        firstName
      );
      type = 'day_3';
    }

    // Calculate schedule time (now + 1 hour to allow for approval)
    const scheduledFor = new Date(Date.now() + 60 * 60 * 1000);

    // Use atomic transaction to create follow-up, update count, and log event
    // This prevents race conditions from concurrent requests
    const { data: atomicResult, error: atomicError } = await dbClient.rpc(
      'create_follow_up_atomic',
      {
        p_campaign_id: campaignId,
        p_target_id: targetId,
        p_connection_id: connectionId,
        p_follow_up_type: type,
        p_scheduled_for: scheduledFor.toISOString(),
        p_message_template: messageTemplate,
      }
    );

    // Handle RPC errors or function not existing (migration not applied)
    // SECURITY: No fallback to non-atomic - prevents race conditions
    if (atomicError) {
      if (atomicError.message?.includes('function') || atomicError.code === '42883') {
        console.error('MIGRATION REQUIRED: create_follow_up_atomic RPC not found');
        return NextResponse.json(
          {
            error: 'Database migration required',
            details: 'Please run migration 20251223_atomic_operations.sql to enable atomic follow-up creation',
            code: 'MIGRATION_REQUIRED',
          },
          { status: 503 }
        );
      }

      console.error('Atomic follow-up creation failed:', atomicError);
      return NextResponse.json(
        { error: 'Failed to create follow-up', details: atomicError.message },
        { status: 500 }
      );
    }

    // Check if the transaction succeeded
    if (!atomicResult?.success) {
      console.error('Atomic follow-up transaction failed:', atomicResult?.error);
      return NextResponse.json(
        { error: 'Failed to create follow-up', details: atomicResult?.error || 'Unknown error' },
        { status: 500 }
      );
    }

    // Store idempotency key for future deduplication (non-blocking)
    if (idempotencyKey && atomicResult.follow_up_id) {
      dbClient
        .from('follow_up_queue')
        .update({ idempotency_key: idempotencyKey })
        .eq('id', atomicResult.follow_up_id)
        .then(({ error }: { error: Error | null }) => {
          if (error) console.warn('Failed to store idempotency key:', error);
        });
    }

    return NextResponse.json({
      success: true,
      followUp: {
        id: atomicResult.follow_up_id,
        follow_up_type: type,
        scheduled_for: scheduledFor.toISOString(),
        message_template: messageTemplate,
      },
      followUpCount: atomicResult.follow_up_count,
      message: messageTemplate,
    });
  } catch (error) {
    console.error('Follow-up creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create follow-up', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// NOTE: Non-atomic fallback removed for security
// All follow-up creation now requires the atomic RPC functions from migration 20251223_atomic_operations.sql
// This prevents race conditions that could cause duplicate follow-ups or incorrect counts
