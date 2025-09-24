#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// Extract project ID from URL
const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

async function executeSQLViaAPI(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }

  return await response.json();
}

async function applyMigrations() {
  console.log('🚀 Applying database migrations via Supabase API...\n');

  const migrations = [
    {
      name: 'Add missing columns to runner_status',
      sql: `
        ALTER TABLE public.runner_status
        ADD COLUMN IF NOT EXISTS cpu_percent FLOAT,
        ADD COLUMN IF NOT EXISTS memory_percent FLOAT,
        ADD COLUMN IF NOT EXISTS memory_mb INTEGER,
        ADD COLUMN IF NOT EXISTS active_tasks JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS version TEXT,
        ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS active_tasks_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      `
    },
    {
      name: 'Add missing columns to linkedin_sessions',
      sql: `
        ALTER TABLE public.linkedin_sessions
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected',
        ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS runner_instance TEXT;
      `
    },
    {
      name: 'Create ai_personalization_queue table',
      sql: `
        CREATE TABLE IF NOT EXISTS public.ai_personalization_queue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
          target_id UUID REFERENCES public.campaign_targets(id) ON DELETE CASCADE,
          message_template TEXT NOT NULL,
          personalization_data JSONB,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          result TEXT,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'Create index on ai_personalization_queue',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_ai_personalization_queue_status
        ON public.ai_personalization_queue(status, created_at);
      `
    },
    {
      name: 'Update claim_next_task function',
      sql: `
        CREATE OR REPLACE FUNCTION public.claim_next_task(
          p_runner_id TEXT,
          p_rate_limits_ok BOOLEAN DEFAULT true
        )
        RETURNS TABLE(task_id UUID, campaign_id UUID, target_id UUID) AS $$
        DECLARE
          v_task_id UUID;
          v_campaign_id UUID;
          v_target_id UUID;
        BEGIN
          SELECT t.id, t.campaign_id, t.target_id
          INTO v_task_id, v_campaign_id, v_target_id
          FROM public.task_queue t
          JOIN public.campaigns c ON t.campaign_id = c.id
          WHERE t.status = 'queued'
          AND c.status = 'active'
          AND (p_rate_limits_ok = true OR t.priority >= 5)
          ORDER BY t.priority DESC, t.created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED;

          IF v_task_id IS NOT NULL THEN
            UPDATE public.task_queue
            SET status = 'processing',
                runner_id = p_runner_id,
                claimed_at = NOW()
            WHERE id = v_task_id;

            UPDATE public.runner_status
            SET current_task_id = v_task_id,
                tasks_completed = COALESCE(tasks_completed, 0) + 1
            WHERE runner_id = p_runner_id;
          END IF;

          RETURN QUERY SELECT v_task_id, v_campaign_id, v_target_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const migration of migrations) {
    process.stdout.write(`  ${migration.name}... `);
    try {
      await executeSQLViaAPI(migration.sql);
      console.log('✅');
      successCount++;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ (already exists)');
        successCount++;
      } else {
        console.log(`❌ ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 All migrations applied successfully!');
  } else {
    console.log('\n⚠️  Some migrations failed. Please check the Supabase dashboard.');
  }
}

applyMigrations().catch(console.error);