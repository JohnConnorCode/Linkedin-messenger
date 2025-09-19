const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gpuvqonjpdjxehihpuke.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdXZxb25qcGRqeGVoaWhwdWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODI1NzY1OSwiZXhwIjoyMDczODMzNjU5fQ.XLlVm_hemMeqwAXskuvOVQbGeyUOWy2DrVXQGAhTRos'
);

async function createTestData() {
  console.log('Creating test data for LinkedIn Messenger...\n');

  // 1. Create a test user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'testpass123',
    email_confirm: true
  });

  if (authError) {
    console.log('User might already exist:', authError.message);
  } else {
    console.log('✅ Created test user: test@example.com');
  }

  const userId = authData?.user?.id || 'b1f5e5a5-4a5a-4a5a-4a5a-4a5a4a5a4a5a';

  // 2. Create a template
  const { data: template } = await supabase
    .from('templates')
    .insert({
      user_id: userId,
      name: 'Introduction Template',
      subject: 'Hello {{firstName}}!',
      body: 'Hi {{firstName}},\\n\\nI noticed we both work in {{industry}}. Would love to connect and share insights!\\n\\nBest,\\n{{senderName}}',
      variables: ['firstName', 'industry', 'senderName'],
      is_active: true
    })
    .select()
    .single();

  console.log('✅ Created message template');

  // 3. Create test connections
  const connections = [
    {
      user_id: userId,
      linkedin_id: 'john-doe-123',
      name: 'John Doe',
      headline: 'Software Engineer at Tech Corp',
      linkedin_url: 'https://www.linkedin.com/in/johndoe/',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      connection_date: new Date().toISOString()
    },
    {
      user_id: userId,
      linkedin_id: 'jane-smith-456',
      name: 'Jane Smith',
      headline: 'Product Manager at StartupXYZ',
      linkedin_url: 'https://www.linkedin.com/in/janesmith/',
      company: 'StartupXYZ',
      location: 'New York, NY',
      connection_date: new Date().toISOString()
    }
  ];

  const { data: insertedConnections } = await supabase
    .from('connections')
    .insert(connections)
    .select();

  console.log(`✅ Created ${insertedConnections?.length || 0} test connections`);

  // 4. Create a campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name: 'Test Outreach Campaign',
      description: 'Testing LinkedIn automation',
      template_id: template?.id,
      status: 'draft',
      daily_limit: 10,
      hourly_limit: 2,
      total_limit: 50,
      delay_min_seconds: 30,
      delay_max_seconds: 60,
      requires_approval: true
    })
    .select()
    .single();

  console.log('✅ Created test campaign');

  // 5. Create campaign targets
  if (insertedConnections && campaign) {
    const targets = insertedConnections.map(conn => ({
      campaign_id: campaign.id,
      connection_id: conn.id,
      user_id: userId,
      status: 'pending',
      personalized_subject: `Hello ${conn.name.split(' ')[0]}!`,
      personalized_body: `Hi ${conn.name.split(' ')[0]},\n\nI noticed we both work in tech. Would love to connect and share insights!\n\nBest,\nTest User`,
      approval_status: 'approved'
    }));

    await supabase
      .from('campaign_targets')
      .insert(targets);

    console.log(`✅ Created ${targets.length} campaign targets`);

    // 6. Create task queue entries
    const tasks = targets.map((target, index) => ({
      campaign_id: campaign.id,
      target_id: target.connection_id,
      user_id: userId,
      status: 'queued',
      run_after: new Date(Date.now() + index * 60000).toISOString(),
      requires_approval: false,
      attempt: 0
    }));

    await supabase
      .from('task_queue')
      .insert(tasks);

    console.log(`✅ Created ${tasks.length} tasks in queue`);
  }

  console.log('\n📊 Test Data Summary:');
  console.log('   - User: test@example.com / testpass123');
  console.log('   - Campaign: Test Outreach Campaign');
  console.log('   - Connections: 2 test profiles');
  console.log('   - Tasks: Ready in queue');
  console.log('\n🚀 You can now:');
  console.log('   1. Login at https://linkedin-messenger.vercel.app');
  console.log('   2. Run the LinkedIn Runner: node run-local.js');
  console.log('   3. Watch messages being processed');
}

createTestData().catch(console.error);