import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

export function getTestSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

export const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

export async function setupTestUser() {
  const supabase = getTestSupabaseClient();

  try {
    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signInData?.user) {
      return signInData.user;
    }

    // If sign in fails, create new user using regular signup
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signUpError) {
      console.error('Failed to create test user:', signUpError);
      // Use a fixed test user ID for testing
      return {
        id: 'test-user-' + Date.now(),
        email: TEST_USER.email,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };
    }

    return signUpData.user;
  } catch (error) {
    console.error('Failed to setup test user:', error);
    // Return a mock user for testing
    return {
      id: 'test-user-' + Date.now(),
      email: TEST_USER.email,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    };
  }
}

export async function cleanupTestData(campaignId?: string) {
  const supabase = getTestSupabaseClient();

  try {
    // Clean up test campaign and related data if provided
    if (campaignId) {
      // Delete targets first (foreign key constraint)
      await supabase.from('campaign_targets').delete().eq('campaign_id', campaignId);

      // Delete campaign
      await supabase.from('campaigns').delete().eq('id', campaignId);
    }

    // Clean up test profiles (users can't be deleted without admin)
    await supabase.from('profiles').delete().eq('email', TEST_USER.email);

    // Clean up test templates
    await supabase.from('message_templates').delete().eq('name', 'Test Template');
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
  }
}

export async function createTestCampaign(userId: string) {
  const supabase = getTestSupabaseClient();

  // First ensure profile exists
  await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: TEST_USER.email,
      full_name: 'Test User',
    });

  // Create a message template
  const { data: template, error: templateError } = await supabase
    .from('message_templates')
    .insert({
      user_id: userId,
      name: 'Test Template',
      content: 'Hi {first_name}, I noticed your work at {company}.',
      is_active: true,
    })
    .select()
    .single();

  if (templateError) {
    console.error('Template creation error:', templateError);
    throw templateError;
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name: 'Test Campaign',
      description: 'Test campaign for E2E tests',
      template_id: template.id,
      status: 'draft',
      daily_cap: 25,
      hourly_cap: 5,
    })
    .select()
    .single();

  if (error) {
    console.error('Campaign creation error:', error);
    throw error;
  }
  return campaign;
}

export async function createTestTargets(campaignId: string, count = 5) {
  const supabase = getTestSupabaseClient();
  
  const targets = Array.from({ length: count }, (_, i) => ({
    campaign_id: campaignId,
    linkedin_url: `https://linkedin.com/in/test-user-${i}`,
    name: `Test User ${i}`,
    headline: `Test Role ${i} at Test Company`,
    company_name: `Test Company ${i}`,
    position: `Test Role ${i}`,
    location: `Test Location ${i}`,
    status: 'pending',
  }));
  
  const { data, error } = await supabase
    .from('campaign_targets')
    .insert(targets)
    .select();
    
  if (error) throw error;
  return data;
}