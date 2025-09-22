#!/usr/bin/env node

/**
 * Script to create a test user and bypass email confirmation
 * Run with: node scripts/setup-test-user.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  const email = process.argv[2] || 'test@example.com';
  const password = process.argv[3] || 'TestPassword123!';

  console.log(`\n📧 Setting up user: ${email}`);

  try {
    // First, try to delete existing user if any
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log('🗑️  Removing existing user...');
      await supabase.auth.admin.deleteUser(existingUser.id);
    }

    // Create new user with email confirmed
    console.log('✨ Creating new user with confirmed email...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // This bypasses email confirmation
      user_metadata: {
        full_name: 'Test User'
      }
    });

    if (createError) {
      throw createError;
    }

    // Create profile
    console.log('👤 Creating user profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: email,
        full_name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.warn('⚠️  Profile creation warning:', profileError.message);
    }

    console.log('\n✅ User created successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🚀 You can now login at: http://localhost:3004/login\n');

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message?.includes('not enabled')) {
      console.log('\n💡 Tip: You may need to disable email confirmation in Supabase:');
      console.log('   1. Go to https://app.supabase.com/project/gpuvqonjpdjxehihpuke/auth/configuration');
      console.log('   2. Under "Email Auth", turn OFF "Confirm email"');
      console.log('   3. Save changes and try again\n');
    }
  }
}

// Run the script
createTestUser().then(() => process.exit(0)).catch(() => process.exit(1));