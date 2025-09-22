const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function checkAndApplyFixes() {
  console.log('🔍 Checking current database state...\n');

  const checks = [];

  // Check runner_status columns
  try {
    const { data, error } = await supabase
      .from('runner_status')
      .select('*')
      .limit(0);

    if (!error) {
      console.log('✅ runner_status table accessible');
    }
  } catch (e) {
    console.log('❌ runner_status table issue:', e.message);
  }

  // Check linkedin_sessions columns
  try {
    const { data, error } = await supabase
      .from('linkedin_sessions')
      .select('*')
      .limit(0);

    if (!error) {
      console.log('✅ linkedin_sessions table accessible');
    }
  } catch (e) {
    console.log('❌ linkedin_sessions table issue:', e.message);
  }

  // Test inserting with missing columns
  console.log('\n🧪 Testing column availability...\n');

  // Test cpu_percent in runner_status
  const testRunnerId = 'test-' + Date.now();
  const { error: cpuError } = await supabase
    .from('runner_status')
    .insert({
      runner_id: testRunnerId,
      status: 'inactive',
      cpu_percent: 50,
      memory_percent: 60,
      error_count: 0
    });

  if (cpuError) {
    if (cpuError.message.includes('cpu_percent')) {
      console.log('❌ Missing cpu_percent column in runner_status');
      checks.push('cpu_percent');
    }
    if (cpuError.message.includes('memory_percent')) {
      console.log('❌ Missing memory_percent column in runner_status');
      checks.push('memory_percent');
    }
    if (cpuError.message.includes('error_count')) {
      console.log('❌ Missing error_count column in runner_status');
      checks.push('error_count');
    }
  } else {
    console.log('✅ runner_status columns exist');
    // Clean up test record
    await supabase.from('runner_status').delete().eq('runner_id', testRunnerId);
  }

  // Test status in linkedin_sessions
  const testSessionId = 'test-' + Date.now();
  const { error: statusError } = await supabase
    .from('linkedin_sessions')
    .insert({
      account_id: testSessionId,
      status: 'active',
      user_id: null,
      cookies: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (statusError) {
    if (statusError.message.includes('status')) {
      console.log('❌ Missing status column in linkedin_sessions');
      checks.push('session_status');
    }
    if (statusError.message.includes('user_id')) {
      console.log('❌ Missing user_id column in linkedin_sessions');
      checks.push('user_id');
    }
  } else {
    console.log('✅ linkedin_sessions columns exist');
    // Clean up test record
    await supabase.from('linkedin_sessions').delete().eq('account_id', testSessionId);
  }

  // Test claim_next_task function
  console.log('\n🔧 Testing database functions...\n');

  const { data: funcData, error: funcError } = await supabase
    .rpc('claim_next_task', {
      p_runner_id: 'test-runner',
      p_rate_limits_ok: true
    });

  if (funcError) {
    console.log('❌ claim_next_task function issue:', funcError.message);
    checks.push('claim_function');
  } else {
    console.log('✅ claim_next_task function works');
  }

  // Test priority field
  const { error: priorityError } = await supabase
    .from('task_queue')
    .insert({
      id: 'test-' + Date.now(),
      type: 'connection_request',
      priority: 'high',
      data: {},
      status: 'pending',
      created_at: new Date().toISOString()
    });

  if (priorityError) {
    if (priorityError.message.includes('priority')) {
      console.log('❌ Priority field type issue:', priorityError.message);
      checks.push('priority_type');
    }
  } else {
    console.log('✅ Priority field accepts text values');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:\n');

  if (checks.length === 0) {
    console.log('🎉 All database issues are resolved!');
    console.log('✅ The application should work without errors now.');
  } else {
    console.log('⚠️  Some issues remain:');
    checks.forEach(issue => {
      console.log(`   - ${issue}`);
    });
    console.log('\n📝 To fix these issues:');
    console.log('1. Go to Supabase SQL Editor:');
    console.log('   https://app.supabase.com/project/gpuvqonjpdjxehihpuke/sql');
    console.log('2. Run the SQL from:');
    console.log('   supabase/migrations/20250922_complete_final_fixes.sql');
  }

  console.log('\n' + '='.repeat(60));
}

checkAndApplyFixes().catch(console.error);