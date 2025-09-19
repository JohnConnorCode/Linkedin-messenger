const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://gpuvqonjpdjxehihpuke.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdXZxb25qcGRqeGVoaWhwdWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTc2NTksImV4cCI6MjA3MzgzMzY1OX0._Ryjf18NOYaozCeSxkhREMbtwHw8bvGgmra9Ym_6ADY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  // Read the SQL file
  const sqlFile = fs.readFileSync(path.join(__dirname, 'setup-database.sql'), 'utf8');

  // Split into individual statements (basic split, may need refinement for complex SQL)
  const statements = sqlFile
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments and empty statements
    if (statement.trim().startsWith('--') || statement.trim().length <= 1) {
      continue;
    }

    // Extract a description of what we're doing
    let description = 'SQL statement';
    if (statement.includes('CREATE TABLE')) {
      const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\S+)/i);
      description = `Creating table ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('CREATE INDEX')) {
      const match = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\S+)/i);
      description = `Creating index ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('CREATE POLICY')) {
      const match = statement.match(/CREATE POLICY "([^"]+)"/i);
      description = `Creating policy: ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('CREATE FUNCTION')) {
      const match = statement.match(/CREATE (?:OR REPLACE )?FUNCTION (\S+)/i);
      description = `Creating function ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('CREATE TRIGGER')) {
      const match = statement.match(/CREATE TRIGGER (\S+)/i);
      description = `Creating trigger ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('ALTER TABLE')) {
      const match = statement.match(/ALTER TABLE (\S+)/i);
      description = `Altering table ${match ? match[1] : 'unknown'}`;
    }

    process.stdout.write(`${i + 1}/${statements.length}: ${description}... `);

    try {
      // We can't execute raw SQL directly through the anon key
      // This would need service_role key or database connection
      console.log('⚠️  Cannot execute DDL statements with anon key');
      errorCount++;
      errors.push({
        statement: description,
        error: 'DDL statements require service_role key or direct database access'
      });
    } catch (error) {
      console.log('❌');
      errorCount++;
      errors.push({
        statement: description,
        error: error.message
      });
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Note: The anon key cannot execute DDL statements (CREATE TABLE, etc.)');
    console.log('You need to either:');
    console.log('1. Run the migration in the Supabase Dashboard SQL Editor');
    console.log('2. Use the service_role key (get it from Supabase Dashboard > Settings > API)');
    console.log('3. Connect directly to the database with psql or another PostgreSQL client');
  }

  // Test what we CAN do with the anon key
  console.log('\n🔍 Testing current database state...');

  // Check if we can query auth.users (should work)
  const { data: authTest, error: authError } = await supabase.auth.getUser();
  if (!authError) {
    console.log('✅ Authentication endpoint accessible');
  } else {
    console.log('❌ Authentication test failed:', authError.message);
  }

  // Try to check if tables exist by querying them
  const tables = ['profiles', 'connections', 'campaigns', 'message_templates'];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('not found')) {
        console.log(`❌ Table '${table}' does not exist`);
      } else {
        console.log(`⚠️  Table '${table}': ${error.message}`);
      }
    } else {
      console.log(`✅ Table '${table}' exists and is accessible`);
    }
  }
}

runMigration().catch(console.error);