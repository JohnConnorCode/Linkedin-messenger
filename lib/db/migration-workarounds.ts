/**
 * Temporary workarounds for missing database columns/functions
 * Remove this file once migrations are applied
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Workaround for missing active_tasks column in runner_status
 */
export async function updateRunnerStatus(runnerId: string, status: any, activeTasks?: any[]) {
  try {
    // First try with active_tasks
    const { error } = await supabase
      .from('runner_status')
      .upsert({
        runner_id: runnerId,
        status,
        last_heartbeat: new Date().toISOString(),
        active_tasks: activeTasks || []
      });

    if (error && error.message.includes('active_tasks')) {
      // Fallback without active_tasks
      console.warn('active_tasks column missing, updating without it');
      await supabase
        .from('runner_status')
        .upsert({
          runner_id: runnerId,
          status,
          last_heartbeat: new Date().toISOString()
        });
    }
  } catch (e) {
    console.error('Error updating runner status:', e);
  }
}

/**
 * Workaround for missing last_check_at in linkedin_sessions
 */
export async function updateSessionStatus(accountId: string, status: string, cookies?: any) {
  try {
    // First try with last_check_at
    const { error } = await supabase
      .from('linkedin_sessions')
      .upsert({
        account_id: accountId,
        status,
        cookies,
        last_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error && error.message.includes('last_check_at')) {
      // Fallback without last_check_at
      console.warn('last_check_at column missing, updating without it');
      await supabase
        .from('linkedin_sessions')
        .upsert({
          account_id: accountId,
          status,
          cookies,
          updated_at: new Date().toISOString()
        });
    }
  } catch (e) {
    console.error('Error updating session:', e);
  }
}

/**
 * Workaround for missing claim_next_task function
 */
export async function claimNextTask(runnerId: string, rateLimitsOk: boolean = true) {
  try {
    // First try the function with both parameters
    const { data, error } = await supabase
      .rpc('claim_next_task', {
        p_runner_id: runnerId,
        p_rate_limits_ok: rateLimitsOk
      });

    if (!error) {
      return data;
    }

    // Try single parameter version
    const { data: data2, error: error2 } = await supabase
      .rpc('claim_next_task', {
        p_runner_id: runnerId
      });

    if (!error2) {
      return data2;
    }

    // Fallback to manual claim
    console.warn('claim_next_task function missing, using manual claim');

    // Get next pending task
    const { data: tasks } = await supabase
      .from('task_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (tasks && tasks.length > 0) {
      const task = tasks[0];

      // Try to claim it
      const { data: claimed } = await supabase
        .from('task_queue')
        .update({
          status: 'processing',
          runner_id: runnerId,
          claimed_at: new Date().toISOString(),
          started_at: new Date().toISOString()
        })
        .eq('id', task.id)
        .eq('status', 'pending') // Ensure it's still pending
        .select();

      return claimed;
    }

    return null;
  } catch (e) {
    console.error('Error claiming task:', e);
    return null;
  }
}