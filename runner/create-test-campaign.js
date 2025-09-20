#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestCampaign() {
  console.log('📝 Creating test campaign with sample data...\n');

  try {
    // 1. Create a test user (or use existing)
    const testUserId = 'test-user-001';
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError && !userError.message.includes('duplicate')) {
      console.log('User creation error:', userError);
    } else {
      console.log('✅ User ready');
    }

    // 2. Create a campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        user_id: testUserId,
        name: 'Test Campaign - ' + new Date().toLocaleDateString(),
        status: 'active',
        message_template: `Hi {{name}},

I noticed you're a {{title}} at {{company}}. I'm reaching out because I'm working on something interesting in your space.

Would love to connect and share ideas!

Best regards,
Test User`,
        daily_limit: 10,
        messages_per_day: 5,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (campaignError) {
      console.log('Campaign creation error:', campaignError);
      return;
    }
    console.log('✅ Campaign created:', campaign.name);

    // 3. Create test connections (LinkedIn profiles to message)
    const testProfiles = [
      {
        name: 'Bill Gates',
        linkedin_url: 'https://www.linkedin.com/in/williamhgates/',
        title: 'Co-chair',
        company: 'Bill & Melinda Gates Foundation'
      },
      {
        name: 'Satya Nadella',
        linkedin_url: 'https://www.linkedin.com/in/satyanadella/',
        title: 'Chairman and CEO',
        company: 'Microsoft'
      },
      {
        name: 'Reid Hoffman',
        linkedin_url: 'https://www.linkedin.com/in/reidhoffman/',
        title: 'Co-Founder',
        company: 'LinkedIn'
      }
    ];

    for (const profile of testProfiles) {
      // Create connection
      const { data: connection, error: connError } = await supabase
        .from('connections')
        .insert({
          user_id: testUserId,
          name: profile.name,
          linkedin_url: profile.linkedin_url,
          title: profile.title,
          company: profile.company,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (connError) {
        console.log(`Connection error for ${profile.name}:`, connError.message);
        continue;
      }

      // Create campaign target
      const { data: target, error: targetError } = await supabase
        .from('campaign_targets')
        .insert({
          campaign_id: campaign.id,
          connection_id: connection.id,
          status: 'pending',
          personalized_body: campaign.message_template
            .replace('{{name}}', profile.name.split(' ')[0])
            .replace('{{title}}', profile.title)
            .replace('{{company}}', profile.company),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (targetError) {
        console.log(`Target error for ${profile.name}:`, targetError.message);
        continue;
      }

      // Create task queue entry
      const { data: task, error: taskError } = await supabase
        .from('task_queue')
        .insert({
          campaign_id: campaign.id,
          target_id: target.id,
          connection_id: connection.id,
          user_id: testUserId,
          status: 'pending',
          priority: 1,
          scheduled_for: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (taskError) {
        console.log(`Task error for ${profile.name}:`, taskError.message);
      } else {
        console.log(`✅ Added ${profile.name} to message queue`);
      }
    }

    // 4. Check queue status
    const { data: queueStatus, error: queueError } = await supabase
      .from('task_queue')
      .select('status')
      .eq('campaign_id', campaign.id);

    if (!queueError && queueStatus) {
      console.log(`\n📊 Campaign "${campaign.name}" ready:`);
      console.log(`   - ${queueStatus.filter(t => t.status === 'pending').length} messages queued`);
      console.log(`   - Daily limit: ${campaign.daily_limit}`);
      console.log('\n🚀 Now run "node run-local.js" and watch it send messages!');
      console.log('\n⚠️  NOTE: These are public profiles, so you likely');
      console.log('   cannot message them unless connected.');
      console.log('   For real use, upload CSV with your actual connections.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
createTestCampaign();