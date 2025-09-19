const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250919_production_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the SQL using Supabase Management API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Try alternative approach - direct SQL endpoint
      const altResponse = await fetch(`${SUPABASE_URL.replace('/v1', '')}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql })
      });

      if (!altResponse.ok) {
        const errorText = await altResponse.text();
        throw new Error(`Failed to run migration: ${errorText}`);
      }

      console.log('✅ Migration applied successfully via SQL endpoint');
      return;
    }

    const result = await response.json();
    console.log('✅ Migration applied successfully');
    console.log('Result:', result);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Log more details about the error
    if (error.response) {
      const errorBody = await error.response.text();
      console.error('Response body:', errorBody);
    }

    process.exit(1);
  }
}

runMigration();