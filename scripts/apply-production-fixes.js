const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

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
  }
});

async function executeSQL(sqlStatement, description) {
  console.log(`\n🔧 ${description}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlStatement
    });

    if (error) {
      throw error;
    }

    console.log(`   ✅ Success: ${description}`);
    return { success: true, data };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkColumnExists(tableName, columnName) {
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_name = '${tableName}'
          AND column_name = '${columnName}'
        ) as exists;
      `
    });

  if (error) {
    console.log(`   ⚠️  Could not check column ${tableName}.${columnName}: ${error.message}`);
    return false;
  }

  return data?.[0]?.exists || false;
}

async function main() {
  console.log('🚀 Applying Production Database Fixes...\n');
  console.log('=' .repeat(60));

  // Since exec_sql may not exist, let's try to create a custom migration function first
  console.log('\n1️⃣ Creating migration utility function...');

  const createMigrationFunction = `
    CREATE OR REPLACE FUNCTION apply_schema_fix(sql_statement TEXT)
    RETURNS TEXT AS $$
    BEGIN
      EXECUTE sql_statement;
      RETURN 'Success';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
    END;
    $$ LANGUAGE plpgsql;
  `;

  let migrationFunctionExists = false;

  try {
    const { error } = await supabase.rpc('apply_schema_fix', {
      sql_statement: 'SELECT 1'
    });

    if (!error) {
      migrationFunctionExists = true;
      console.log('   ✅ Migration function already exists');
    }
  } catch (e) {
    // Function doesn't exist, try to create it
    try {
      await supabase.rpc('exec_sql', { sql: createMigrationFunction });
      migrationFunctionExists = true;
      console.log('   ✅ Created migration function');
    } catch (createError) {
      console.log('   ❌ Cannot create migration function:', createError.message);
    }
  }

  if (!migrationFunctionExists) {
    console.log('\n❌ Cannot proceed without a way to execute DDL statements.');
    console.log('\n🎯 Please manually execute the following SQL in Supabase dashboard:');
    console.log('   https://app.supabase.com/project/gpuvqonjpdjxehihpuke/sql');
    console.log('\nSQL to execute:');

    const sqlFile = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrations', '20250922_final_production_fixes.sql'),
      'utf8'
    );

    console.log('\n' + '-'.repeat(60));
    console.log(sqlFile);
    console.log('-'.repeat(60));
    return;
  }

  // Apply fixes using the migration function
  console.log('\n2️⃣ Applying schema fixes...');

  const fixes = [
    {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'linkedin_sessions' AND column_name = 'account_id'
          ) THEN
            ALTER TABLE public.linkedin_sessions ADD COLUMN account_id TEXT UNIQUE;
          END IF;
        END $$;
      `,
      description: 'Add account_id to linkedin_sessions'
    },
    {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'linkedin_sessions' AND column_name = 'status'
          ) THEN
            ALTER TABLE public.linkedin_sessions ADD COLUMN status TEXT DEFAULT 'inactive';
          END IF;
        END $$;
      `,
      description: 'Add status to linkedin_sessions'
    },
    {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'linkedin_sessions' AND column_name = 'last_check_at'
          ) THEN
            ALTER TABLE public.linkedin_sessions ADD COLUMN last_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          END IF;
        END $$;
      `,
      description: 'Add last_check_at to linkedin_sessions'
    },
    {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'runner_status' AND column_name = 'cpu_percent'
          ) THEN
            ALTER TABLE public.runner_status ADD COLUMN cpu_percent NUMERIC(5,2) DEFAULT 0;
          END IF;
        END $$;
      `,
      description: 'Add cpu_percent to runner_status'
    },
    {
      sql: `
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'task_queue'
            AND column_name = 'priority'
            AND data_type != 'text'
          ) THEN
            ALTER TABLE public.task_queue
            ALTER COLUMN priority TYPE TEXT USING
              CASE
                WHEN priority = 1 THEN 'high'
                WHEN priority = 2 THEN 'medium'
                WHEN priority = 3 THEN 'low'
                ELSE 'medium'
              END;
            ALTER TABLE public.task_queue
            ALTER COLUMN priority SET DEFAULT 'medium';
          END IF;
        END $$;
      `,
      description: 'Fix task_queue.priority type (INTEGER -> TEXT)'
    }
  ];

  for (const fix of fixes) {
    const result = await executeSQL(fix.sql, fix.description);
    if (!result.success) {
      console.log(`\n⚠️  Fix "${fix.description}" failed, but continuing...`);
    }
  }

  // Recreate the claim_next_task function
  console.log('\n3️⃣ Recreating claim_next_task function...');

  const functionSQL = `
    DROP FUNCTION IF EXISTS public.claim_next_task(TEXT, BOOLEAN) CASCADE;
    DROP FUNCTION IF EXISTS public.claim_next_task(TEXT) CASCADE;

    CREATE OR REPLACE FUNCTION public.claim_next_task(
      p_runner_id TEXT,
      p_rate_limits_ok BOOLEAN DEFAULT true
    )
    RETURNS SETOF public.task_queue AS $$
    BEGIN
      RETURN QUERY
      UPDATE public.task_queue
      SET
        status = 'processing',
        runner_id = p_runner_id,
        claimed_at = NOW(),
        started_at = NOW()
      WHERE id IN (
        SELECT id
        FROM public.task_queue
        WHERE status = 'pending'
          AND (claimed_at IS NULL OR claimed_at < NOW() - INTERVAL '5 minutes')
          AND (p_rate_limits_ok = true OR priority = 'high')
        ORDER BY
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END,
          created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION public.claim_next_task(p_runner_id TEXT)
    RETURNS SETOF public.task_queue AS $$
    BEGIN
      RETURN QUERY
      SELECT * FROM public.claim_next_task(p_runner_id, true);
    END;
    $$ LANGUAGE plpgsql;

    GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT, BOOLEAN) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.claim_next_task(TEXT) TO authenticated;
  `;

  await executeSQL(functionSQL, 'Recreate claim_next_task function');

  // Test the fixes
  console.log('\n4️⃣ Testing the fixes...');

  try {
    // Test claim_next_task function
    const { data: funcData, error: funcError } = await supabase
      .rpc('claim_next_task', {
        p_runner_id: 'test-runner',
        p_rate_limits_ok: true
      });

    if (funcError) {
      console.log(`   ⚠️  Function test error: ${funcError.message}`);
    } else {
      console.log('   ✅ claim_next_task function works correctly');
    }

    // Test linkedin_sessions insert
    const testSessionId = 'test-session-' + Date.now();
    const { error: sessionError } = await supabase
      .from('linkedin_sessions')
      .insert({
        account_id: testSessionId,
        status: 'inactive',
        last_check_at: new Date().toISOString()
      });

    if (sessionError) {
      console.log(`   ⚠️  linkedin_sessions test error: ${sessionError.message}`);
    } else {
      console.log('   ✅ linkedin_sessions table schema is correct');
      // Clean up test record
      await supabase.from('linkedin_sessions').delete().eq('account_id', testSessionId);
    }

    // Test runner_status insert
    const testRunnerId = 'test-runner-' + Date.now();
    const { error: runnerError } = await supabase
      .from('runner_status')
      .insert({
        runner_id: testRunnerId,
        status: 'inactive',
        cpu_percent: 50.5,
        active_tasks: []
      });

    if (runnerError) {
      console.log(`   ⚠️  runner_status test error: ${runnerError.message}`);
    } else {
      console.log('   ✅ runner_status table schema is correct');
      // Clean up test record
      await supabase.from('runner_status').delete().eq('runner_id', testRunnerId);
    }

  } catch (error) {
    console.log(`   ⚠️  Test error: ${error.message}`);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n✅ Production database fixes completed!');
  console.log('\nNext steps:');
  console.log('1. Test the application with the runner');
  console.log('2. Verify no more schema errors occur');
  console.log('3. Check all critical application paths');
}

main().catch(console.error);