const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test basic query
    const { data: tables, error } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database query error:', error);
      return;
    }

    console.log('✅ Database connection successful!');
    
    // Check if tables exist
    const tablesToCheck = ['profiles', 'campaigns', 'message_templates', 'campaign_targets'];
    
    for (const table of tablesToCheck) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        console.log(`❌ Table '${table}' - Error:`, error.message);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }
  } catch (err) {
    console.error('Connection test failed:', err);
  }
}

testConnection();