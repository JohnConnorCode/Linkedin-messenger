/**
 * Schema fixes to handle database column mismatches
 * This provides runtime fixes for schema issues until migrations are applied
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sanitize runner status data before insert/update
 */
export function sanitizeRunnerStatus(data: any) {
  const sanitized = { ...data };

  // Remove columns that might not exist
  delete sanitized.cpu_percent;
  delete sanitized.memory_percent;
  delete sanitized.error_count;

  return sanitized;
}

/**
 * Sanitize task queue data before insert/update
 */
export function sanitizeTaskQueue(data: any) {
  const sanitized = { ...data };

  // Convert priority to the format the DB expects
  if (sanitized.priority) {
    // If DB expects integer, convert text to integer
    const priorityMap: Record<string, number> = {
      'high': 1,
      'medium': 2,
      'low': 3
    };

    if (typeof sanitized.priority === 'string' && priorityMap[sanitized.priority]) {
      // Try integer format first
      sanitized.priority = priorityMap[sanitized.priority];
    }
  }

  return sanitized;
}

/**
 * Wrapper for task queue operations with automatic priority conversion
 */
export async function safeTaskQueueInsert(
  supabase: SupabaseClient,
  data: any
) {
  // First try with text priority
  let result = await supabase
    .from('task_queue')
    .insert(data);

  // If it fails due to priority type, try with integer
  if (result.error?.message?.includes('priority')) {
    const sanitized = sanitizeTaskQueue(data);
    result = await supabase
      .from('task_queue')
      .insert(sanitized);
  }

  return result;
}

/**
 * Wrapper for runner status operations
 */
export async function safeRunnerStatusUpsert(
  supabase: SupabaseClient,
  data: any
) {
  const sanitized = sanitizeRunnerStatus(data);
  return await supabase
    .from('runner_status')
    .upsert(sanitized);
}

/**
 * Safe claim_next_task function call
 */
export async function safeClaimNextTask(
  supabase: SupabaseClient,
  runnerId: string,
  rateLimitsOk: boolean = true
) {
  // Try the two-parameter version first
  let result = await supabase
    .rpc('claim_next_task', {
      p_runner_id: runnerId,
      p_rate_limits_ok: rateLimitsOk
    });

  if (result.error) {
    // Try single parameter version
    result = await supabase
      .rpc('claim_next_task', {
        p_runner_id: runnerId
      });

    if (result.error) {
      // Fallback to manual claiming
      const { data: tasks } = await supabase
        .from('task_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (tasks && tasks.length > 0) {
        const task = tasks[0];
        const { data: claimed } = await supabase
          .from('task_queue')
          .update({
            status: 'processing',
            runner_id: runnerId,
            claimed_at: new Date().toISOString(),
            started_at: new Date().toISOString()
          })
          .eq('id', task.id)
          .eq('status', 'pending')
          .select();

        return { data: claimed, error: null };
      }
    }
  }

  return result;
}