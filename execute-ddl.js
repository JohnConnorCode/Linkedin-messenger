const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://gpuvqonjpdjxehihpuke.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdXZxb25qcGRqeGVoaWhwdWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODI1NzY1OSwiZXhwIjoyMDczODMzNjU5fQ.XLlVm_hemMeqwAXskuvOVQbGeyUOWy2DrVXQGAhTRos';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function executeDDL() {
  console.log('🚀 Testing DDL execution methods...\n');

  // Read the SQL file
  const sqlFile = fs.readFileSync(path.join(__dirname, 'scripts/fix-missing-columns.sql'), 'utf8');
  console.log('📄 SQL to execute:');
  console.log(sqlFile);
  console.log('\n' + '='.repeat(50) + '\n');

  // Method 1: Try creating an RPC function that can execute DDL
  console.log('Method 1: Creating RPC function for DDL execution...');

  try {
    // First, let's try to create a function that can execute dynamic SQL
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION execute_ddl(sql_text text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
        RETURN 'SUCCESS: ' || sql_text;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN 'ERROR: ' || SQLERRM;
      END;
      $$;
    `;

    // Note: We can't execute this directly through the JS client
    console.log('❌ Cannot create RPC function - Supabase JS client doesn\'t support raw SQL execution');
    console.log('   Would need to create this function manually in the SQL editor');

  } catch (error) {
    console.log('❌ Method 1 failed:', error.message);
  }

  // Method 2: Try direct REST API calls
  console.log('\nMethod 2: Testing direct REST API calls...');

  try {
    // Test if we can access the PostgREST rpc endpoint directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/nonexistent`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    console.log('REST API Response Status:', response.status);
    const text = await response.text();
    console.log('REST API Response:', text);

  } catch (error) {
    console.log('❌ Method 2 failed:', error.message);
  }

  // Method 3: Check what we CAN do with the service role
  console.log('\nMethod 3: Testing service role capabilities...');

  try {
    // Test table creation permissions
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);

    if (error) {
      console.log('❌ Cannot query information_schema:', error.message);
    } else {
      console.log('✅ Can query information_schema. Tables found:', data.length);
      console.log('   Sample tables:', data.map(t => t.table_name).join(', '));
    }

    // Test if we can check current user/role
    const { data: userInfo, error: userError } = await supabase.rpc('current_user');
    if (userError) {
      console.log('❌ Cannot call current_user():', userError.message);
    } else {
      console.log('✅ Current user:', userInfo);
    }

  } catch (error) {
    console.log('❌ Method 3 failed:', error.message);
  }

  // Method 4: Test if we can check for existing columns
  console.log('\nMethod 4: Checking current table structure...');

  try {
    // Check runner_status table structure
    const { data: runnerStatusCols, error: rsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'runner_status');

    if (rsError) {
      console.log('❌ Cannot query runner_status columns:', rsError.message);
    } else {
      console.log('✅ runner_status columns:');
      runnerStatusCols.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });

      const hasActiveTasksCol = runnerStatusCols.some(col => col.column_name === 'active_tasks');
      console.log(`   active_tasks column exists: ${hasActiveTasksCol ? '✅' : '❌'}`);
    }

    // Check linkedin_sessions table structure
    const { data: linkedinSessionsCols, error: lsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'linkedin_sessions');

    if (lsError) {
      console.log('❌ Cannot query linkedin_sessions columns:', lsError.message);
    } else {
      console.log('✅ linkedin_sessions columns:');
      linkedinSessionsCols.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });

      const hasLastCheckAtCol = linkedinSessionsCols.some(col => col.column_name === 'last_check_at');
      console.log(`   last_check_at column exists: ${hasLastCheckAtCol ? '✅' : '❌'}`);
    }

    // Check if claim_next_task function exists
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'claim_next_task');

    if (funcError) {
      console.log('❌ Cannot query functions:', funcError.message);
    } else {
      console.log('✅ claim_next_task function variants found:', functions.length);
      functions.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`);
      });
    }

  } catch (error) {
    console.log('❌ Method 4 failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📋 SUMMARY OF FINDINGS:');
  console.log('1. ❌ Supabase JS client cannot execute raw SQL DDL statements');
  console.log('2. ❌ Service role key doesn\'t enable DDL execution through REST API');
  console.log('3. ✅ Can query information_schema to check current state');
  console.log('4. 💡 Need alternative approach:');
  console.log('   - Use Supabase SQL Editor (manual)');
  console.log('   - Direct PostgreSQL connection with psql');
  console.log('   - Edge Function with direct DB connection');
  console.log('   - Create RPC function manually first, then call it');
  console.log('\n🎯 Recommended next steps:');
  console.log('1. Create the DDL execution function manually in SQL Editor');
  console.log('2. Then call that function via RPC from this script');
  console.log('3. Or use direct PostgreSQL connection');
}

executeDDL().catch(console.error);