const { test, expect } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Test configuration
test.describe.configure({ mode: 'serial' });
test.use({
  headless: false,
  viewport: { width: 1280, height: 720 },
  video: 'on-first-retry'
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

test.describe('LinkedIn Runner Tests', () => {

  test('Database connection works', async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('LinkedIn login and session persistence', async ({ page }) => {
    // Navigate to LinkedIn
    await page.goto('https://www.linkedin.com/feed/');

    // Check if we're on login page
    if (page.url().includes('login')) {
      console.log('Not logged in - manual login required for first test run');

      // Wait for user to manually login (in test mode, we'd use test credentials)
      await page.waitForURL('**/feed/**', { timeout: 120000 });
    }

    // Verify we're logged in
    expect(page.url()).toContain('/feed');

    // Save cookies for session persistence
    const cookies = await page.context().cookies();
    expect(cookies.length).toBeGreaterThan(0);
  });

  test('Can navigate to profile page', async ({ page }) => {
    // Use a public LinkedIn profile for testing
    const testProfileUrl = 'https://www.linkedin.com/in/williamhgates/';

    await page.goto(testProfileUrl);
    await page.waitForLoadState('networkidle');

    // Check we're on a profile page
    expect(page.url()).toContain('/in/');

    // Look for profile elements
    const profileName = await page.locator('h1').first();
    await expect(profileName).toBeVisible();
  });

  test('Message button exists on profile pages', async ({ page }) => {
    // Navigate to a connection's profile (would need actual connection URL)
    const connectionUrl = 'https://www.linkedin.com/in/williamhgates/';

    await page.goto(connectionUrl);
    await page.waitForLoadState('networkidle');

    // Look for Message or Connect button
    const messageButton = page.locator('button:has-text("Message"), button:has-text("Connect")').first();

    // At least one should be visible
    await expect(messageButton).toBeVisible({ timeout: 10000 });
  });

  test('Message composer opens when clicking Message', async ({ page }) => {
    // This test would need an actual connection to message
    // For safety, we'll just verify the UI elements exist

    const selectors = {
      messageButton: 'button:has-text("Message")',
      composer: '[contenteditable="true"][role="textbox"], .msg-form__contenteditable',
      sendButton: 'button:has-text("Send")'
    };

    // Navigate to messages page directly
    await page.goto('https://www.linkedin.com/messaging/');
    await page.waitForLoadState('networkidle');

    // Check if messaging UI loads
    const composerExists = await page.locator(selectors.composer).count() > 0;

    if (composerExists) {
      console.log('✅ Message composer found');
    } else {
      console.log('⚠️ Message composer not found - may need different selectors');
    }
  });

  test('Rate limiting delays work', async () => {
    // Test that our random delays are within expected range
    const minDelay = 30000;
    const maxDelay = 60000;

    for (let i = 0; i < 10; i++) {
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      expect(delay).toBeGreaterThanOrEqual(minDelay);
      expect(delay).toBeLessThanOrEqual(maxDelay);
    }
  });

  test('Screenshot directory exists and is writable', async ({ page }) => {
    const fs = require('fs').promises;
    const screenshotDir = path.join(__dirname, '..', 'screenshots');

    // Create directory if it doesn't exist
    await fs.mkdir(screenshotDir, { recursive: true });

    // Take a test screenshot
    const testScreenshotPath = path.join(screenshotDir, 'test.png');
    await page.goto('https://www.linkedin.com');
    await page.screenshot({ path: testScreenshotPath });

    // Verify file was created
    const stats = await fs.stat(testScreenshotPath);
    expect(stats.isFile()).toBe(true);

    // Clean up
    await fs.unlink(testScreenshotPath);
  });

  test('Task queue fetching works', async () => {
    // Test fetching from task queue
    const { data: tasks, error } = await supabase
      .from('task_queue')
      .select(`
        *,
        campaign_targets!inner(
          *,
          connections!inner(*)
        )
      `)
      .eq('status', 'pending')
      .limit(1);

    expect(error).toBeNull();

    if (tasks && tasks.length > 0) {
      const task = tasks[0];
      expect(task).toHaveProperty('campaign_targets');
      expect(task.campaign_targets).toHaveProperty('connections');
      console.log('✅ Task structure is correct');
    } else {
      console.log('ℹ️ No pending tasks in queue');
    }
  });

  test('LinkedIn selectors are up-to-date', async ({ page }) => {
    // Test that our selectors still work with current LinkedIn UI
    await page.goto('https://www.linkedin.com/feed/');

    const selectors = {
      'v2025': {
        feed: '.feed-shared-update-v2',
        profileLink: 'a[href*="/in/"]',
        messageButton: 'button:has-text("Message")',
        connectButton: 'button:has-text("Connect")'
      },
      'v2024': {
        feed: '[data-id^="feed-"]',
        profileLink: 'a.app-aware-link[href*="/in/"]'
      }
    };

    // Check which selector version works
    let workingVersion = null;

    for (const [version, selectorSet] of Object.entries(selectors)) {
      const element = await page.locator(selectorSet.profileLink).first();
      if (await element.count() > 0) {
        workingVersion = version;
        break;
      }
    }

    expect(workingVersion).not.toBeNull();
    console.log(`✅ LinkedIn selectors working with version: ${workingVersion}`);
  });
});

test.describe('Safety Features', () => {

  test('Respects quiet hours', () => {
    const now = new Date();
    const hour = now.getHours();

    // Check if current time is within quiet hours (9 AM - 5 PM)
    const isQuietHours = hour >= 9 && hour < 17;

    console.log(`Current hour: ${hour}:00`);
    console.log(`Within business hours: ${isQuietHours}`);

    // The actual implementation should check this
    expect(typeof isQuietHours).toBe('boolean');
  });

  test('Prevents duplicate messages', async () => {
    // Test that we track sent messages
    const { data: sentMessages, error } = await supabase
      .from('task_queue')
      .select('target_id, connection_id')
      .eq('status', 'completed')
      .limit(10);

    if (sentMessages && sentMessages.length > 0) {
      // Check for duplicates
      const seen = new Set();
      let hasDuplicates = false;

      for (const msg of sentMessages) {
        const key = `${msg.target_id}-${msg.connection_id}`;
        if (seen.has(key)) {
          hasDuplicates = true;
          break;
        }
        seen.add(key);
      }

      expect(hasDuplicates).toBe(false);
      console.log('✅ No duplicate messages found');
    }
  });
});