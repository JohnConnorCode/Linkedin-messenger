const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase connection details from your provided information
const supabaseUrl = 'https://gpuvqonjpdjxehihpuke.supabase.co';
const projectRef = 'gpuvqonjpdjxehihpuke';

// Extract connection details from URL
const host = `db.${projectRef}.supabase.co`;
const port = 5432;
const database = 'postgres';
const user = 'postgres';

// Connection configurations to try
const connectionConfigs = [
  {
    name: 'Direct connection (need password)',
    config: {
      host: host,
      port: port,
      database: database,
      user: user,
      // password: 'YOUR_PASSWORD_HERE', // Would need the actual password
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Service Role as Connection String',
    config: {
      connectionString: `postgresql://${user}:SERVICE_ROLE_KEY@${host}:${port}/${database}?sslmode=require`,
      ssl: { rejectUnauthorized: false }
    }
  }
];

async function tryDirectConnection() {
  console.log('🔗 Attempting direct PostgreSQL connections...\n');

  // Method 1: Test connection capabilities
  console.log('Method 1: Testing connection parameters...');
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
  console.log(`Database: ${database}`);
  console.log(`User: ${user}`);
  console.log('');

  // Method 2: Try to connect with different configurations
  for (const { name, config } of connectionConfigs) {
    console.log(`Trying: ${name}`);

    const client = new Client(config);

    try {
      console.log('  Connecting...');
      await client.connect();
      console.log('  ✅ Connected successfully!');

      // Test a simple query
      const result = await client.query('SELECT version()');
      console.log(`  PostgreSQL Version: ${result.rows[0].version.substring(0, 50)}...`);

      // Now try to execute our DDL
      await executeDDLStatements(client);

      await client.end();
      return true; // Success!

    } catch (error) {
      console.log(`  ❌ Connection failed: ${error.message}`);
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    console.log('');
  }

  return false;
}

async function executeDDLStatements(client) {
  console.log('  📝 Executing DDL statements...');

  // Read the SQL file
  const sqlFile = fs.readFileSync(path.join(__dirname, 'scripts/fix-missing-columns.sql'), 'utf8');

  // Split into individual statements
  const statements = sqlFile
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .map(s => s + ';');

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and empty statements
    if (statement.trim().startsWith('--') || statement.trim().length <= 1) {
      continue;
    }

    // Extract description
    let description = 'SQL statement';
    if (statement.includes('ALTER TABLE')) {
      const match = statement.match(/ALTER TABLE (\S+)/i);
      description = `Altering table ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
      const match = statement.match(/CREATE OR REPLACE FUNCTION (\S+)/i);
      description = `Creating function ${match ? match[1] : 'unknown'}`;
    } else if (statement.includes('GRANT')) {
      description = 'Granting permissions';
    } else if (statement.includes('SELECT')) {
      description = 'Verification query';
    }

    console.log(`    ${i + 1}/${statements.length}: ${description}`);

    try {
      const result = await client.query(statement);

      if (result.rows && result.rows.length > 0) {
        console.log(`      ✅ Success (${result.rows.length} rows returned)`);
        // If it's a verification query, show the results
        if (statement.includes('SELECT')) {
          console.log(`      Results:`, result.rows);
        }
      } else {
        console.log(`      ✅ Success (${result.rowCount || 0} rows affected)`);
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.message}`);
    }
  }
}

// Alternative method: Use environment variable for password
async function tryWithEnvPassword() {
  console.log('Method 3: Trying with environment password...');

  const password = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

  if (!password) {
    console.log('  ❌ No password found in environment variables');
    console.log('  💡 Set SUPABASE_DB_PASSWORD or DB_PASSWORD environment variable');
    return false;
  }

  const client = new Client({
    host: host,
    port: port,
    database: database,
    user: user,
    password: password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('  Connecting with environment password...');
    await client.connect();
    console.log('  ✅ Connected successfully!');

    await executeDDLStatements(client);
    await client.end();
    return true;

  } catch (error) {
    console.log(`  ❌ Connection failed: ${error.message}`);
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Testing direct PostgreSQL connection for DDL execution...\n');

  // Try different connection methods
  let success = await tryDirectConnection();

  if (!success) {
    success = await tryWithEnvPassword();
  }

  if (!success) {
    console.log('\n❌ All connection attempts failed.');
    console.log('\n🎯 Next steps:');
    console.log('1. Get your Supabase database password from the Dashboard');
    console.log('2. Set it as environment variable: export SUPABASE_DB_PASSWORD="your_password"');
    console.log('3. Or use the Supabase SQL Editor manually');
    console.log('4. Or try the psql command line tool');
    console.log('\npsql command:');
    console.log(`psql -h ${host} -p ${port} -d ${database} -U ${user}`);
    console.log('\nThen run the SQL from scripts/fix-missing-columns.sql');
  } else {
    console.log('\n✅ DDL execution completed successfully!');
  }
}

main().catch(console.error);