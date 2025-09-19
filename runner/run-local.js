const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let browser, context, page;
const COOKIES_PATH = path.join(__dirname, 'linkedin-sessions', 'cookies.json');

async function initialize() {
  console.log('🚀 Starting LinkedIn Runner (Local Mode)...\n');

  // Launch browser
  browser = await chromium.launch({
    headless: false, // Show browser for debugging
    slowMo: 100,
  });

  // Check for saved cookies
  let cookies = [];
  try {
    const cookieData = await fs.readFile(COOKIES_PATH, 'utf-8');
    cookies = JSON.parse(cookieData);
    console.log(`💾 Loaded ${cookies.length} saved cookies`);
  } catch {
    console.log('🔐 No saved session found - manual login required');
  }

  // Create context with cookies if available
  context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    storageState: cookies.length > 0 ? { cookies } : undefined
  });

  page = await context.newPage();

  // Check if we're logged in
  await page.goto('https://www.linkedin.com/feed/');
  await page.waitForTimeout(3000);

  if (page.url().includes('login')) {
    console.log('⚠️  Not logged in - please log in manually');
    await page.goto('https://www.linkedin.com/login');
    console.log('   Waiting for manual login...');

    await page.waitForURL('**/feed/**', { timeout: 120000 });
    console.log('✅ Login successful!');

    // Save cookies
    const newCookies = await context.cookies();
    await fs.mkdir(path.dirname(COOKIES_PATH), { recursive: true });
    await fs.writeFile(COOKIES_PATH, JSON.stringify(newCookies, null, 2));
    console.log('💾 Session saved for future use');
  } else {
    console.log('✅ Already logged in using saved session');
  }

  // Start processing loop
  console.log('\n📊 Starting task processor...');
  await processTasks();
}

async function processTasks() {
  while (true) {
    try {
      // Check for pending tasks
      const { data: tasks } = await supabase
        .from('task_queue')
        .select(`
          *,
          campaign_targets (
            *,
            connections (*)
          )
        `)
        .eq('status', 'queued')
        .limit(1);

      if (tasks && tasks.length > 0) {
        const task = tasks[0];
        console.log(`\n📬 Processing task ${task.id}`);

        // Update task status
        await supabase
          .from('task_queue')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', task.id);

        // Send message
        const success = await sendLinkedInMessage(task);

        // Update task with result
        await supabase
          .from('task_queue')
          .update({
            status: success ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            last_error: success ? null : 'Message sending failed'
          })
          .eq('id', task.id);

        console.log(`   ${success ? '✅ Success' : '❌ Failed'}`);

        // Random delay between messages (30-60 seconds)
        const delay = 30000 + Math.random() * 30000;
        console.log(`   ⏳ Waiting ${Math.round(delay/1000)}s before next message...`);
        await page.waitForTimeout(delay);

      } else {
        console.log('💤 No tasks in queue, checking again in 10s...');
        await page.waitForTimeout(10000);
      }

    } catch (error) {
      console.error('❌ Error in task processor:', error.message);
      await page.waitForTimeout(10000);
    }
  }
}

async function sendLinkedInMessage(task) {
  try {
    const { campaign_targets } = task;
    if (!campaign_targets?.connections?.linkedin_url) {
      console.log('   ⚠️  No LinkedIn URL for target');
      return false;
    }

    const profileUrl = campaign_targets.connections.linkedin_url;
    const message = campaign_targets.personalized_body || 'Hello! This is a test message.';

    console.log(`   👤 Sending to: ${campaign_targets.connections.name}`);

    // Navigate to profile
    await page.goto(profileUrl);
    await page.waitForTimeout(2000);

    // Click Message button
    const messageButton = await page.locator('button:has-text("Message")').first();
    if (await messageButton.isVisible()) {
      await messageButton.click();
      await page.waitForTimeout(2000);

      // Type message
      const messageBox = await page.locator('[contenteditable="true"]').last();
      if (await messageBox.isVisible()) {
        await messageBox.type(message, { delay: 50 });
        await page.waitForTimeout(1000);

        // Take screenshot
        const screenshotPath = path.join(__dirname, 'screenshots', `${task.id}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`   📸 Screenshot saved`);

        // Send message (commented out for safety)
        // const sendButton = await page.locator('button:has-text("Send")').first();
        // await sendButton.click();

        console.log('   ✉️  Message prepared (not sent in test mode)');
        return true;
      }
    }

    console.log('   ⚠️  Could not find message UI elements');
    return false;

  } catch (error) {
    console.error('   ❌ Error sending message:', error.message);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  if (browser) await browser.close();
  process.exit(0);
});

// Start the runner
initialize().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});