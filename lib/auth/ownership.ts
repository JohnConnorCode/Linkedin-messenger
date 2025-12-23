/**
 * Ownership Verification Middleware
 *
 * Ensures users can only access resources they own.
 * Prevents cross-user data access even when authenticated.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export class ForbiddenError extends Error {
  constructor(message = 'Access denied: You do not have permission to access this resource') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Verify user owns a campaign
 */
export async function verifyCampaignOwnership(
  supabase: SupabaseClient,
  userId: string | undefined,
  campaignId: string
): Promise<boolean> {
  if (!userId) return false;
  if (!campaignId) return false;

  const { data, error } = await supabase
    .from('campaigns')
    .select('user_id')
    .eq('id', campaignId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.user_id === userId;
}

/**
 * Verify user owns a connection
 */
export async function verifyConnectionOwnership(
  supabase: SupabaseClient,
  userId: string | undefined,
  connectionId: string
): Promise<boolean> {
  if (!userId) return false;
  if (!connectionId) return false;

  const { data, error } = await supabase
    .from('connections')
    .select('user_id')
    .eq('id', connectionId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.user_id === userId;
}

/**
 * Verify user owns a campaign target
 */
export async function verifyTargetOwnership(
  supabase: SupabaseClient,
  userId: string | undefined,
  targetId: string
): Promise<boolean> {
  if (!userId) return false;
  if (!targetId) return false;

  const { data, error } = await supabase
    .from('campaign_targets')
    .select('campaign_id, campaigns(user_id)')
    .eq('id', targetId)
    .single();

  if (error || !data) {
    return false;
  }

  // Access nested user_id from campaigns relation (may be object or array depending on query)
  const campaigns = data.campaigns as { user_id: string } | { user_id: string }[] | null;
  const campaignData = Array.isArray(campaigns) ? campaigns[0] : campaigns;
  return campaignData?.user_id === userId;
}

/**
 * Verify user owns a follow-up
 */
export async function verifyFollowUpOwnership(
  supabase: SupabaseClient,
  userId: string | undefined,
  followUpId: string
): Promise<boolean> {
  if (!userId) return false;
  if (!followUpId) return false;

  const { data, error } = await supabase
    .from('follow_up_queue')
    .select('campaign_id, campaigns(user_id)')
    .eq('id', followUpId)
    .single();

  if (error || !data) {
    return false;
  }

  // Access nested user_id from campaigns relation (may be object or array depending on query)
  const campaigns = data.campaigns as { user_id: string } | { user_id: string }[] | null;
  const campaignData = Array.isArray(campaigns) ? campaigns[0] : campaigns;
  return campaignData?.user_id === userId;
}

/**
 * Combined verification: check campaign and optionally connection
 */
export async function verifyResourceAccess(
  supabase: SupabaseClient,
  userId: string | undefined,
  resources: {
    campaignId?: string;
    connectionId?: string;
    targetId?: string;
  }
): Promise<{ valid: boolean; reason?: string }> {
  if (!userId) {
    return { valid: false, reason: 'User ID required' };
  }

  // Verify campaign ownership
  if (resources.campaignId) {
    const ownsCampaign = await verifyCampaignOwnership(supabase, userId, resources.campaignId);
    if (!ownsCampaign) {
      return { valid: false, reason: 'Campaign not found or access denied' };
    }
  }

  // Verify connection ownership
  if (resources.connectionId) {
    const ownsConnection = await verifyConnectionOwnership(supabase, userId, resources.connectionId);
    if (!ownsConnection) {
      return { valid: false, reason: 'Connection not found or access denied' };
    }
  }

  // Verify target ownership
  if (resources.targetId) {
    const ownsTarget = await verifyTargetOwnership(supabase, userId, resources.targetId);
    if (!ownsTarget) {
      return { valid: false, reason: 'Target not found or access denied' };
    }
  }

  return { valid: true };
}

/**
 * Get user ID from campaign (for service-to-service calls)
 */
export async function getUserIdFromCampaign(
  supabase: SupabaseClient,
  campaignId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('user_id')
    .eq('id', campaignId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.user_id;
}
