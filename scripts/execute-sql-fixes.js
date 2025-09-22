const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

// Create client with service role for full access
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  }
});

async function executeSQLFixes() {
  console.log('🚀 Executing SQL Fixes...\n');
  console.log('=' .repeat(60));

  try {
    // Test if we can update runner_status structure
    console.log('\n1️⃣ Fixing runner_status table...');

    // Try to insert a test record with active_tasks to see if column exists
    const testRunnerId = 'test-runner-' + Date.now();
    const { data: insertData, error: insertError } = await supabase
      .from('runner_status')
      .insert({
        runner_id: testRunnerId,
        status: 'inactive',
        active_tasks: []
      })
      .select();

    if (insertError) {
      if (insertError.message.includes('column') && insertError.message.includes('active_tasks')) {
        console.log('   ❌ Column active_tasks missing - needs manual SQL execution');
      } else {
        console.log('   ⚠️  Error:', insertError.message);
      }
    } else {
      console.log('   ✅ active_tasks column exists!');
      // Clean up test record
      await supabase.from('runner_status').delete().eq('runner_id', testRunnerId);
    }

    // Test linkedin_sessions
    console.log('\n2️⃣ Fixing linkedin_sessions table...');

    const testSessionId = 'test-session-' + Date.now();
    const { error: sessionError } = await supabase
      .from('linkedin_sessions')
      .insert({
        account_id: testSessionId,
        status: 'inactive',
        last_check_at: new Date().toISOString()
      })
      .select();

    if (sessionError) {
      if (sessionError.message.includes('column') && sessionError.message.includes('last_check_at')) {
        console.log('   ❌ Column last_check_at missing - needs manual SQL execution');
      } else {
        console.log('   ⚠️  Error:', sessionError.message);
      }
    } else {
      console.log('   ✅ last_check_at column exists!');
      // Clean up test record
      await supabase.from('linkedin_sessions').delete().eq('account_id', testSessionId);
    }

    // Test if claim_next_task function exists
    console.log('\n3️⃣ Testing claim_next_task function...');

    const { data: funcData, error: funcError } = await supabase
      .rpc('claim_next_task', {
        p_runner_id: 'test-runner',
        p_rate_limits_ok: true
      });

    if (funcError) {
      if (funcError.message.includes('function') && funcError.message.includes('not found')) {
        console.log('   ❌ Function claim_next_task missing or has wrong parameters');

        // Try the single parameter version
        const { error: funcError2 } = await supabase
          .rpc('claim_next_task', {
            p_runner_id: 'test-runner'
          });

        if (!funcError2) {
          console.log('   ⚠️  Function exists but needs the two-parameter version');
        } else {
          console.log('   ❌ Function does not exist at all');
        }
      } else {
        console.log('   ⚠️  Function error:', funcError.message);
      }
    } else {
      console.log('   ✅ claim_next_task function exists with correct parameters!');
    }

    console.log('\n' + '=' .repeat(60));
    console.log('\n📋 ATTEMPTING DIRECT FIXES VIA POSTGRES.JS...\n');

    // Try using raw SQL through fetch API to Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        query: `
          -- Add missing column to runner_status
          ALTER TABLE public.runner_status
          ADD COLUMN IF NOT EXISTS active_tasks JSONB DEFAULT '[]'::jsonb;
        `
      })
    });

    if (!response.ok) {
      console.log('❌ Direct SQL execution not available via REST API');
      console.log('   The exec_sql RPC function does not exist');
    } else {
      console.log('✅ Successfully added active_tasks column!');
    }

  } catch (error) {
    console.error('Error during execution:', error);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 FINAL STATUS:\n');

  console.log('Unfortunately, Supabase client libraries do not support direct DDL (Data Definition Language) operations.');
  console.log('You must use one of these methods:\n');

  console.log('1. **Supabase Dashboard** (Recommended - Takes 1 minute):');
  console.log('   a. Go to: https://app.supabase.com/project/gpuvqonjpdjxehihpuke/sql');
  console.log('   b. Copy the SQL from: scripts/fix-missing-columns.sql');
  console.log('   c. Paste and click "Run"\n');

  console.log('2. **Using psql directly**:');
  console.log('   psql "postgresql://postgres.gpuvqonjpdjxehihpuke:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"\n');

  console.log('3. **Create a database function**:');
  console.log('   You could create a migration function in the dashboard that we can then call via RPC\n');

  console.log('The SQL to run is very simple - just 3 ALTER TABLE and CREATE FUNCTION statements.');
  console.log('It will take less than a minute to execute in the dashboard.');

  console.log('\n' + '=' .repeat(60));
}

executeSQLFixes().catch(console.error);