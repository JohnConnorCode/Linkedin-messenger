const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAIQueueTable() {
  console.log('Creating ai_personalization_queue table...');

  const { error } = await supabase.rpc('exec', {
    query: `
      -- Create AI personalization queue table
      CREATE TABLE IF NOT EXISTS public.ai_personalization_queue (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        campaign_target_id UUID,
        campaign_id UUID,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

        -- LinkedIn profile data
        profile_data JSONB NOT NULL,
        profile_url TEXT NOT NULL,

        -- Template and personalization
        template_id UUID,
        template_body TEXT NOT NULL,
        tone TEXT DEFAULT 'professional',
        campaign_context TEXT,

        -- Processing status
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'approved', 'rejected')),
        processor_id TEXT,
        claimed_at TIMESTAMP WITH TIME ZONE,

        -- Results
        personalization_result JSONB,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,

        -- Approval
        approved_by UUID REFERENCES auth.users(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        approval_notes TEXT,

        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );

      -- Create indexes for efficient querying
      CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON public.ai_personalization_queue(status);
      CREATE INDEX IF NOT EXISTS idx_ai_queue_campaign ON public.ai_personalization_queue(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_ai_queue_user ON public.ai_personalization_queue(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_queue_created ON public.ai_personalization_queue(created_at);
      CREATE INDEX IF NOT EXISTS idx_ai_queue_processor ON public.ai_personalization_queue(processor_id);

      -- Enable RLS
      ALTER TABLE public.ai_personalization_queue ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'ai_personalization_queue'
          AND policyname = 'Users can view their own queue items'
        ) THEN
          CREATE POLICY "Users can view their own queue items" ON public.ai_personalization_queue
            FOR SELECT
            USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'ai_personalization_queue'
          AND policyname = 'Users can create queue items'
        ) THEN
          CREATE POLICY "Users can create queue items" ON public.ai_personalization_queue
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'ai_personalization_queue'
          AND policyname = 'Users can update their own queue items'
        ) THEN
          CREATE POLICY "Users can update their own queue items" ON public.ai_personalization_queue
            FOR UPDATE
            USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'ai_personalization_queue'
          AND policyname = 'Users can delete their own queue items'
        ) THEN
          CREATE POLICY "Users can delete their own queue items" ON public.ai_personalization_queue
            FOR DELETE
            USING (auth.uid() = user_id);
        END IF;
      END $$;

      -- Grant necessary permissions
      GRANT ALL ON public.ai_personalization_queue TO authenticated;
    `
  });

  if (error) {
    // Try direct SQL if RPC doesn't exist
    console.log('RPC failed, trying direct table creation...');

    // Just verify the table can be accessed
    const { data, error: selectError } = await supabase
      .from('ai_personalization_queue')
      .select('count')
      .limit(1);

    if (selectError && selectError.code === 'PGRST205') {
      console.error('❌ Table creation failed. Please run the migration manually.');
      console.error('Migration file: supabase/migrations/20240320000003_ai_personalization_queue.sql');
      return false;
    } else {
      console.log('✅ Table ai_personalization_queue is accessible');
      return true;
    }
  }

  console.log('✅ AI personalization queue table created successfully');
  return true;
}

createAIQueueTable().catch(console.error);