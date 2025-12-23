/**
 * SuperDebate Response Classification API
 * POST /api/superdebate/classify-response
 *
 * Classifies incoming LinkedIn responses and suggests appropriate replies
 *
 * Security:
 * - HMAC signature verification for runner requests
 * - Ownership verification for user requests
 * - Error visibility (no silent failures)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { SuperDebateOutreachService, RESPONSE_AWARE_FOLLOW_UPS } from '@/lib/superdebate';
import { verifyRunnerRequest } from '@/lib/auth/request-signing';
import { verifyTargetOwnership, getUserIdFromCampaign } from '@/lib/auth/ownership';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const signatureHeader = request.headers.get('x-signature');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Parse body early for signature verification
    const body = await request.json();
    const { responseText, targetId, campaignId } = body;

    let isServiceAuth = false;
    let userId: string | undefined;

    // Verify authentication
    const authResult = await verifyRunnerRequest(authHeader, signatureHeader, body);

    if (authResult.valid) {
      isServiceAuth = true;
      if (authResult.method === 'service_key' && process.env.NODE_ENV === 'production') {
        console.warn('SECURITY: Service role key used in Authorization header - migrate to HMAC signing');
      }
    } else {
      // Try user authentication
      const userSupabase = await createServerComponentClient();
      const { data: { user }, error: authError } = await userSupabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      userId = user.id;

      // SECURITY: Verify user owns the target before processing
      // Use service client only for ownership check, not for subsequent operations
      if (targetId) {
        const serviceClient = createClient(supabaseUrl!, serviceRoleKey!);
        const ownsTarget = await verifyTargetOwnership(serviceClient, userId, targetId);
        if (!ownsTarget) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have access to this target' },
            { status: 403 }
          );
        }
      } else {
        // targetId is required for user auth
        return NextResponse.json(
          { error: 'targetId is required' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!responseText) {
      return NextResponse.json(
        { error: 'responseText is required' },
        { status: 400 }
      );
    }

    if (!targetId) {
      return NextResponse.json(
        { error: 'targetId is required' },
        { status: 400 }
      );
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl!, serviceRoleKey!);

    // Initialize service
    const service = new SuperDebateOutreachService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Classify the response
    const classification = await service.classifyResponse(responseText);

    // Update the conversation stage based on classification
    let newStage: string;
    switch (classification.type) {
      case 'positive':
      case 'intro_offered':
        newStage = 'in_dialogue';
        break;
      case 'hard_no':
        newStage = 'closed_lost';
        break;
      default:
        newStage = 'awaiting_response';
    }

    // Update temperature based on response
    let temperature = 'cold';
    if (classification.type === 'positive' || classification.type === 'intro_offered') {
      temperature = 'hot';
    } else if (classification.type === 'send_more_info' || classification.type === 'busy') {
      temperature = 'warm';
    }

    // Update campaign target
    const { error: updateError } = await supabase
      .from('campaign_targets')
      .update({
        conversation_stage: newStage,
        temperature,
        response_type: classification.type,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (updateError) {
      console.error('Failed to update campaign_targets:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update target',
          details: updateError.message
        },
        { status: 500 }
      );
    }

    // Log the event
    const { error: eventError } = await supabase.from('conversation_events').insert({
      target_id: targetId,
      event_type: 'response_classified',
      event_data: {
        response_text: responseText.substring(0, 500),
        classification: classification.type,
        confidence: classification.confidence,
        escalate: classification.escalateToJohn,
      },
    });

    if (eventError) {
      console.error('Failed to log conversation event:', eventError);
      // Continue - not a critical failure
    }

    // Auto-schedule follow-up based on response type
    // Uses RESPONSE_AWARE_FOLLOW_UPS config for proper timing
    let scheduledFollowUp: { type: string; scheduledFor: string } | null = null;

    if (classification.type === 'busy' || classification.type === 'send_more_info') {
      // Get target's audience type for audience-specific follow-up timing
      const { data: targetData } = await supabase
        .from('campaign_targets')
        .select('audience_type, connection_id')
        .eq('id', targetId)
        .single();

      const audienceType = targetData?.audience_type || 'default';
      // Type is already narrowed by outer if - classification.type is 'busy' | 'send_more_info'
      const responseConfig = RESPONSE_AWARE_FOLLOW_UPS[classification.type as 'busy' | 'send_more_info'];
      // Get audience-specific config or fall back to default
      const config = (responseConfig as Record<string, { delay_days: number; template: string }>)[audienceType]
        || responseConfig.default;

      if (config) {
          const scheduledFor = new Date(Date.now() + config.delay_days * 24 * 60 * 60 * 1000);

          // Create follow-up using atomic RPC
          const { data: followUpResult, error: followUpError } = await supabase.rpc(
            'create_follow_up_atomic',
            {
              p_campaign_id: campaignId,
              p_target_id: targetId,
              p_connection_id: targetData?.connection_id,
              p_follow_up_type: `response_${classification.type}`,
              p_scheduled_for: scheduledFor.toISOString(),
              p_message_template: config.template,
            }
          );

          if (followUpError) {
            console.error('Failed to auto-schedule follow-up:', followUpError);
            // Continue - not critical
          } else if (followUpResult?.success) {
            scheduledFollowUp = {
              type: `response_${classification.type}`,
              scheduledFor: scheduledFor.toISOString(),
            };
            console.log('Auto-scheduled follow-up:', scheduledFollowUp);
          }
        }
    }

    // If escalation needed, create a notification
    if (classification.escalateToJohn) {
      // Get user_id from campaign if not available from auth
      let notifyUserId = userId;
      if (!notifyUserId && campaignId) {
        notifyUserId = await getUserIdFromCampaign(supabase, campaignId) || undefined;
      }

      if (notifyUserId) {
        const { error: notifyError } = await supabase.from('notifications').insert({
          user_id: notifyUserId,
          type: 'approval_needed',
          title: `High-value response: ${classification.type}`,
          body: `Response requires your attention: "${responseText.substring(0, 100)}..."`,
          metadata: {
            target_id: targetId,
            campaign_id: campaignId,
            classification: classification.type,
            escalate_reason: 'superdebate_response',
          },
        });

        if (notifyError) {
          console.error('Failed to create escalation notification:', notifyError);
          // Continue - not a critical failure
        }
      }
    }

    return NextResponse.json({
      success: true,
      classification: {
        type: classification.type,
        confidence: classification.confidence,
        suggestedReply: classification.suggestedReply,
        escalateToJohn: classification.escalateToJohn,
        reasoning: classification.reasoning,
      },
      scheduledFollowUp,
    });
  } catch (error) {
    console.error('Response classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify response', details: (error as Error).message },
      { status: 500 }
    );
  }
}
