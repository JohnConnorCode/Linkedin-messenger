#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addTestTask() {
  console.log('Adding a simple test task to queue...\n');

  // Create minimal test data directly in task_queue
  const { data, error } = await supabase
    .from('task_queue')
    .insert({
      id: crypto.randomUUID(),
      campaign_id: crypto.randomUUID(),
      target_id: crypto.randomUUID(),
      connection_id: crypto.randomUUID(),
      user_id: 'test-user',
      status: 'pending',
      priority: 1,
      scheduled_for: new Date().toISOString(),
      created_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.log('Error adding task:', error.message);
    console.log('\n❌ The database tables might not have the expected schema.');
    console.log('\n📌 To fix this:');
    console.log('   1. Go to your Vercel app');
    console.log('   2. Create a campaign manually');
    console.log('   3. Upload a CSV with LinkedIn URLs');
    console.log('\nOR:');
    console.log('   1. Check Supabase dashboard');
    console.log('   2. Verify tables were created');
    console.log('   3. Run migrations if needed');
  } else {
    console.log('✅ Test task added to queue!');
    console.log('\nNow run: node run-local.js');
    console.log('The runner should pick up this task.');
  }
}

addTestTask();