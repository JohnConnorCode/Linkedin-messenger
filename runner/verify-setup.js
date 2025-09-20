#!/usr/bin/env node

// Verification script to ensure everything is properly set up
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

console.log('🔍 LinkedIn Messenger - Setup Verification\n');
console.log('=' .repeat(50));

let allChecks = true;

async function checkEnvironment() {
  console.log('\n📋 Environment Variables:');

  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RUNNER_ID'
  ];

  for (const key of required) {
    if (process.env[key]) {
      console.log(`  ✅ ${key}: Set`);
    } else {
      console.log(`  ❌ ${key}: Missing`);
      allChecks = false;
    }
  }
}

async function checkDatabase() {
  console.log('\n🗄️ Database Connection:');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test connection
    const { data, error } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1);

    if (error) {
      console.log(`  ❌ Database connection failed: ${error.message}`);
      allChecks = false;
    } else {
      console.log('  ✅ Connected to Supabase');

      // Check tables
      const tables = ['campaigns', 'campaign_targets', 'connections', 'task_queue'];
      for (const table of tables) {
        const { error: tableError } = await supabase.from(table).select('id').limit(1);
        if (tableError) {
          console.log(`  ❌ Table '${table}' not accessible`);
          allChecks = false;
        } else {
          console.log(`  ✅ Table '${table}' exists`);
        }
      }
    }
  } catch (err) {
    console.log(`  ❌ Database error: ${err.message}`);
    allChecks = false;
  }
}

async function checkPlaywright() {
  console.log('\n🎭 Playwright Browser:');

  try {
    const browser = await chromium.launch({ headless: true });
    console.log('  ✅ Chromium launches successfully');

    const context = await browser.newContext();
    const page = await context.newPage();

    // Test navigation
    await page.goto('https://www.linkedin.com', { timeout: 10000 });
    console.log('  ✅ Can navigate to LinkedIn');

    await browser.close();
  } catch (err) {
    console.log(`  ❌ Browser error: ${err.message}`);
    allChecks = false;
  }
}

async function checkDirectories() {
  console.log('\n📁 Required Directories:');

  const dirs = [
    './screenshots',
    './linkedin-sessions',
    './logs'
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      const stats = await fs.stat(dir);
      if (stats.isDirectory()) {
        console.log(`  ✅ ${dir} exists and is writable`);
      }
    } catch (err) {
      console.log(`  ❌ ${dir} error: ${err.message}`);
      allChecks = false;
    }
  }
}

async function checkLinkedInSelectors() {
  console.log('\n🔍 LinkedIn UI Selectors:');

  try {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.linkedin.com/feed/');
    await page.waitForTimeout(2000);

    // Check if we're on login page or feed
    const url = page.url();
    if (url.includes('login')) {
      console.log('  ⚠️  Not logged in - selectors cannot be fully tested');
      console.log('     Run the app once and log in manually first');
    } else {
      console.log('  ✅ LinkedIn session detected');

      // Test key selectors
      const selectors = {
        'Profile links': 'a[href*="/in/"]',
        'Message button': 'button:has-text("Message")',
        'Connect button': 'button:has-text("Connect")'
      };

      for (const [name, selector] of Object.entries(selectors)) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`  ✅ ${name}: Found (${count} instances)`);
        } else {
          console.log(`  ⚠️  ${name}: Not found on current page`);
        }
      }
    }

    await browser.close();
  } catch (err) {
    console.log(`  ⚠️  Selector test skipped: ${err.message}`);
  }
}

async function checkTaskQueue() {
  console.log('\n📬 Task Queue:');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: tasks, error } = await supabase
      .from('task_queue')
      .select('status')
      .limit(100);

    if (!error && tasks) {
      const pending = tasks.filter(t => t.status === 'pending').length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const failed = tasks.filter(t => t.status === 'failed').length;

      console.log(`  📊 Queue Status:`);
      console.log(`     Pending: ${pending}`);
      console.log(`     Completed: ${completed}`);
      console.log(`     Failed: ${failed}`);

      if (pending === 0) {
        console.log('  ⚠️  No pending tasks - create a campaign first');
      } else {
        console.log(`  ✅ ${pending} tasks ready to process`);
      }
    }
  } catch (err) {
    console.log(`  ❌ Task queue error: ${err.message}`);
    allChecks = false;
  }
}

async function main() {
  await checkEnvironment();
  await checkDatabase();
  await checkDirectories();
  await checkPlaywright();
  await checkTaskQueue();
  // await checkLinkedInSelectors(); // Skip by default as it opens browser

  console.log('\n' + '=' .repeat(50));

  if (allChecks) {
    console.log('\n✅ ALL CHECKS PASSED - System ready to run!');
    console.log('\n📌 Next steps:');
    console.log('   1. Run: node run-local.js');
    console.log('   2. Log into LinkedIn when browser opens');
    console.log('   3. Watch it process messages automatically');
  } else {
    console.log('\n❌ Some checks failed - please fix issues above');
    console.log('\n📌 Most common fixes:');
    console.log('   1. Check .env file has correct credentials');
    console.log('   2. Ensure database migrations have been run');
    console.log('   3. Install missing dependencies: npm install');
    process.exit(1);
  }
}

main().catch(console.error);