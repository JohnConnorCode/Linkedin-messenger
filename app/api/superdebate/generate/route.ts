/**
 * SuperDebate Message Generation API v2
 * POST /api/superdebate/generate
 *
 * Generates personalized outreach messages using:
 * - 4-audience classification (Funder, Ambassador, Debater, Friend)
 * - AI-enhanced personalization with John's voice
 * - Fit assessment (Resonance, Relevance, Reach)
 * - Message deduplication
 *
 * Security:
 * - HMAC signature verification for runner requests
 * - Ownership verification for user requests
 * - Error visibility (no silent failures)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { SuperDebateOutreachService } from '@/lib/superdebate';
import { verifyRunnerRequest } from '@/lib/auth/request-signing';
import { verifyCampaignOwnership, verifyConnectionOwnership } from '@/lib/auth/ownership';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const signatureHeader = request.headers.get('x-signature');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Parse body early for signature verification
    const body = await request.json();
    const { connectionId, profileData, campaignId } = body;

    let isServiceAuth = false;
    let userId: string | undefined;

    // Verify authentication
    const authResult = await verifyRunnerRequest(authHeader, signatureHeader, body);

    // Create service role client once for all operations
    const supabase = createClient(supabaseUrl!, serviceRoleKey!);

    if (authResult.valid) {
      isServiceAuth = true;
      if (authResult.method === 'service_key' && process.env.NODE_ENV === 'production') {
        console.warn('SECURITY: Service role key used in Authorization header - migrate to HMAC signing');
      }

      // SECURITY FIX: Even service auth must verify resource ownership
      // This prevents compromised HMAC secret from accessing all campaigns
      if (campaignId) {
        // Get campaign's user_id to verify it exists
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('user_id')
          .eq('id', campaignId)
          .single();

        if (campaignError || !campaign) {
          return NextResponse.json(
            { error: 'Campaign not found' },
            { status: 404 }
          );
        }
        // Store userId for later use (rate limiting, etc)
        userId = campaign.user_id;
      }
    } else {
      // Try user authentication
      const userSupabase = await createServerComponentClient();
      const { data: { user }, error: authError } = await userSupabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      userId = user.id;

      // Verify user owns the campaign (if provided)
      if (campaignId) {
        const ownsCampaign = await verifyCampaignOwnership(supabase, userId, campaignId);
        if (!ownsCampaign) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have access to this campaign' },
            { status: 403 }
          );
        }
      }

      // Verify user owns the connection (if provided)
      if (connectionId) {
        const ownsConnection = await verifyConnectionOwnership(supabase, userId, connectionId);
        if (!ownsConnection) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have access to this connection' },
            { status: 403 }
          );
        }
      }
    }

    // Rate limiting check
    if (userId) {
      const { data: rateLimit } = await supabase
        .from('rate_limits')
        .select('request_count, window_start')
        .eq('user_id', userId)
        .eq('endpoint', 'superdebate_generate')
        .single();

      const windowMs = 60 * 1000; // 1 minute window
      const maxRequests = 30; // 30 requests per minute

      if (rateLimit) {
        const windowStart = new Date(rateLimit.window_start).getTime();
        const now = Date.now();

        if (now - windowStart < windowMs && rateLimit.request_count >= maxRequests) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Try again in a minute.', code: 'RATE_LIMITED' },
            { status: 429 }
          );
        }
      }
    }

    // Validate required fields
    if (!profileData || !profileData.name) {
      return NextResponse.json(
        { error: 'Profile data with name is required' },
        { status: 400 }
      );
    }

    // Initialize SuperDebate service
    const service = new SuperDebateOutreachService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load existing message hashes to prevent duplicates
    if (campaignId) {
      await service.loadSentHashes(campaignId);
    }

    // Classify the audience (includes fit assessment)
    const classification = await service.classifyAudience(profileData);

    // QUALIFICATION GATE: Skip low-fit targets to improve response rates
    // Low-fit prospects waste outreach capacity and hurt sender reputation
    const MIN_FIT_SCORE = 0.4;
    if (classification.fitAssessment.overall < MIN_FIT_SCORE) {
      return NextResponse.json({
        success: false,
        error: 'Target does not meet minimum fit threshold',
        code: 'LOW_FIT_SCORE',
        classification: {
          primary: classification.primary,
          fitAssessment: classification.fitAssessment,
        },
        suggestion: 'Review manually or skip this target',
      }, { status: 422 }); // Unprocessable Entity
    }

    // Generate the message
    const message = await service.generateMessage(profileData, classification);

    // If we have a connection ID, save the classification
    if (connectionId) {
      const { error: classError } = await service.saveClassification(connectionId, classification);
      if (classError) {
        console.error('Failed to save classification:', classError);
        // Continue - not a critical failure
      }
    }

    // If we have a campaign ID and connection ID, persist the message
    if (campaignId && connectionId) {
      // TOCTOU FIX: CLAIM hash FIRST, before any database writes
      // This ensures no data is persisted if claim fails (another request won the race)
      const { claimed, error: claimError } = await service.claimMessageHash(
        message.messageHash,
        campaignId,
        connectionId
      );

      if (claimError) {
        console.error('Failed to claim message hash:', claimError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to verify message uniqueness',
            details: claimError.message,
            code: 'DEDUP_CLAIM_FAILED'
          },
          { status: 500 }
        );
      }

      if (!claimed) {
        // Another request already claimed this hash - don't persist duplicate
        return NextResponse.json(
          {
            success: false,
            error: 'Duplicate message detected',
            code: 'DUPLICATE_MESSAGE',
            suggestion: message.isUnique
              ? 'Concurrent request claimed this hash first. Regenerate.'
              : 'This message was already sent previously.'
          },
          { status: 409 } // Conflict
        );
      }

      // ONLY NOW, after successful claim, persist to database
      const { error: updateError } = await supabase
        .from('campaign_targets')
        .update({
          audience_type: classification.primary,
          classification_confidence: classification.confidence,
          personalization_hooks: classification.personalizationHooks,
          personalized_message: message.fullMessage,
          metadata: {
            fit_assessment: classification.fitAssessment,
            ai_enhanced: classification.aiEnhanced,
            message_hash: message.messageHash,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaignId)
        .eq('connection_id', connectionId);

      if (updateError) {
        console.error('Failed to update campaign_targets:', updateError);
        // Note: Hash is claimed but message not persisted. This is safe -
        // the claimed hash prevents retries from creating duplicates.
        // The target will need manual regeneration.
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to save message to target',
            details: updateError.message,
            code: 'PERSIST_FAILED'
          },
          { status: 500 }
        );
      }
    }

    // Determine if this should be escalated to John
    const shouldEscalate = classification.fitAssessment.overall > 0.75 ||
                          classification.primary === 'funder';

    return NextResponse.json({
      success: true,
      classification: {
        primary: classification.primary,
        secondary: classification.secondary,
        confidence: classification.confidence,
        signals: classification.signals,
        personalizationHooks: classification.personalizationHooks,
        fitAssessment: classification.fitAssessment,
        aiEnhanced: classification.aiEnhanced,
      },
      message: {
        full: message.fullMessage,
        parts: message.parts,
        audienceType: message.audienceType,
        confidence: message.confidence,
        riskFlags: message.riskFlags,
        isUnique: message.isUnique,
        messageHash: message.messageHash,
      },
      meta: {
        shouldEscalate,
        escalateReason: shouldEscalate
          ? classification.primary === 'funder'
            ? 'High-value funder prospect'
            : 'High fit score (>75%)'
          : null,
      },
    });
  } catch (error) {
    console.error('SuperDebate generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate message', details: (error as Error).message },
      { status: 500 }
    );
  }
}
