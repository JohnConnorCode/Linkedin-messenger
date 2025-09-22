const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
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

async function executeSqlFile(filePath, fileName) {
  try {
    console.log(`\n📄 Processing: ${fileName}`);
    const sql = await fs.readFile(filePath, 'utf-8');

    // Split by semicolon but be careful with functions
    const statements = sql
      .split(/;\s*$|;\s*\n/m)
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');

    for (const statement of statements) {
      if (!statement.trim() || statement.trim() === ';') continue;

      try {
        // Use raw SQL execution via RPC or direct query
        const { error } = await supabase.rpc('exec_sql', {
          query: statement
        }).catch(async () => {
          // If RPC doesn't exist, try direct execution
          // This is a workaround - normally you'd use Supabase SQL editor or CLI
          console.log('   ⚠️  Direct SQL execution not available via client library');
          return { error: 'Direct SQL not supported' };
        });

        if (error) {
          console.log(`   ⚠️  Statement failed: ${error.message}`);
        }
      } catch (e) {
        console.log(`   ⚠️  Error: ${e.message}`);
      }
    }

    console.log(`   ✅ Processed: ${fileName}`);
  } catch (error) {
    console.error(`   ❌ Failed to read file: ${error.message}`);
  }
}

async function applyMigrations() {
  console.log('🚀 Starting Migration Process...\n');
  console.log('=' .repeat(60));

  // First, let's check what tables already exist
  console.log('\n📊 Current Database State:');

  const tables = [
    'profiles',
    'campaigns',
    'templates',
    'connections',
    'campaign_targets',
    'task_queue',
    'ai_personalization_queue',
    'linkedin_sessions',
    'runner_status'
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ❌ ${table}: Not found`);
    } else {
      console.log(`   ✅ ${table}: Exists (${count || 0} records)`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n⚠️  IMPORTANT: Direct SQL execution via JavaScript client is limited.');
  console.log('For full migration support, you need to either:');
  console.log('1. Use Supabase Dashboard SQL Editor');
  console.log('2. Use Supabase CLI with database password');
  console.log('3. Use an agent with Supabase MCP access\n');

  // Try to create critical missing tables using Supabase client
  console.log('🔧 Attempting to create critical tables via API...\n');

  // Create ai_personalization_queue if it doesn't exist
  const { error: aiQueueError } = await supabase
    .from('ai_personalization_queue')
    .select('count')
    .limit(1);

  if (aiQueueError && aiQueueError.code === 'PGRST205') {
    console.log('📝 Creating ai_personalization_queue table...');
    console.log('   ⚠️  Cannot create via API - use SQL editor or CLI');
  }

  // List migration files for manual execution
  console.log('\n📋 Migration Files to Apply Manually:\n');
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  const criticalMigrations = [
    '20240320000003_ai_personalization_queue.sql',
    '20250920_linkedin_sessions.sql',
    '20250919_complete_production_schema.sql'
  ];

  for (const file of criticalMigrations) {
    const filePath = path.join(migrationsDir, file);
    try {
      await fs.access(filePath);
      console.log(`   ✅ ${file} - Ready to apply`);
    } catch {
      console.log(`   ❌ ${file} - Not found`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 NEXT STEPS:\n');
  console.log('1. Go to Supabase Dashboard: https://app.supabase.com');
  console.log('2. Select your project (gpuvqonjpdjxehihpuke)');
  console.log('3. Go to SQL Editor');
  console.log('4. Copy and paste migrations from:');
  console.log('   - supabase/migrations/20240320000003_ai_personalization_queue.sql');
  console.log('   - supabase/migrations/20250920_linkedin_sessions.sql');
  console.log('   - supabase/migrations/20250919_complete_production_schema.sql');
  console.log('5. Execute each migration\n');

  console.log('OR\n');
  console.log('If you have the database password:');
  console.log('npx supabase link --project-ref gpuvqonjpdjxehihpuke');
  console.log('npx supabase db push\n');

  console.log('=' .repeat(60));
}

applyMigrations().catch(console.error);