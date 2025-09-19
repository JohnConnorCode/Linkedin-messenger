const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gpuvqonjpdjxehihpuke.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdXZxb25qcGRqeGVoaWhwdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTc2NTksImV4cCI6MjA3MzgzMzY1OX0._Ryjf18NOYaozCeSxkhREMbtwHw8bvGgmra9Ym_6ADY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  // Test if tables exist
  const tables = [
    'profiles',
    'connections',
    'message_templates',
    'campaigns',
    'campaign_targets',
    'task_queue',
    'campaign_stats',
    'runner_status',
    'runner_config',
    'linkedin_sessions',
    'rate_limits'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': exists`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}': ${e.message}`);
    }
  }

  // Test auth
  console.log('\nTesting authentication...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.log(`❌ Auth check: ${authError.message}`);
  } else if (user) {
    console.log(`✅ Auth: User logged in (${user.email})`);
  } else {
    console.log(`ℹ️  Auth: No user logged in`);
  }
}

testConnection().then(() => process.exit(0));