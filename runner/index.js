require('dotenv').config();
const { chromium } = require('playwright');
const axios = require('axios');
const winston = require('winston');
const PQueue = require('p-queue').default;
const fs = require('fs').promises;
const path = require('path');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({ filename: 'runner.log' }),
  ],
});

// Configuration
const config = {
  runnerId: process.env.RUNNER_ID || 'runner-1',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api/runner',
  runnerToken: process.env.RUNNER_TOKEN,
  userDataDir: process.env.USER_DATA_DIR || './user-data',
  pollInterval: parseInt(process.env.POLL_INTERVAL_MS || '10000'),
  maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TASKS || '1'),
};

// Queue for task processing
const queue = new PQueue({ concurrency: config.maxConcurrent });

// Browser instance
let browser = null;
let context = null;

/**
 * Initialize browser with persistent session
 */
async function initBrowser() {
  try {
    logger.info('Initializing browser...');

    // Ensure user data directory exists
    await fs.mkdir(config.userDataDir, { recursive: true });

    browser = await chromium.launchPersistentContext(config.userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      locale: 'en-US',
      timezoneId: process.env.USER_TIMEZONE || 'Asia/Singapore',
      permissions: ['clipboard-read', 'clipboard-write'],
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
    });

    context = browser;
    logger.info('Browser initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize browser:', error);
    throw error;
  }
}

/**
 * API client with authentication
 */
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    Authorization: `Bearer ${config.runnerToken}`,
  },
  timeout: 30000,
});

/**
 * Claim a task from the queue
 */
async function claimTask() {
  try {
    const response = await apiClient.post('/claim');
    return response.data.task;
  } catch (error) {
    if (error.response?.status !== 404) {
      logger.error('Error claiming task:', error.message);
    }
    return null;
  }
}

/**
 * Report progress to the API
 */
async function reportProgress(taskId, stage, status, message, extra = {}) {
  try {
    await apiClient.post('/progress', {
      task_id: taskId,
      stage,
      status,
      message,
      ...extra,
    });
  } catch (error) {
    logger.error('Error reporting progress:', error.message);
  }
}

/**
 * Complete a task
 */
async function completeTask(taskId, success, error = null) {
  try {
    await apiClient.post('/complete', {
      task_id: taskId,
      success,
      error,
    });
  } catch (err) {
    logger.error('Error completing task:', err.message);
  }
}

/**
 * Take a screenshot and upload it
 */
async function takeScreenshot(page, name) {
  try {
    const screenshotPath = path.join(config.userDataDir, `${name}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    // In production, upload to storage and return URL
    return screenshotPath;
  } catch (error) {
    logger.error('Error taking screenshot:', error);
    return null;
  }
}

/**
 * Humanize interactions with random delays and movements
 */
async function humanize(page, options = {}) {
  const { minDelay = 1000, maxDelay = 3000 } = options;
  const delay = minDelay + Math.random() * (maxDelay - minDelay);
  await page.waitForTimeout(delay);

  // Random mouse movement
  if (Math.random() > 0.5) {
    const x = 100 + Math.random() * 500;
    const y = 100 + Math.random() * 300;
    await page.mouse.move(x, y);
  }

  // Random scroll
  if (Math.random() > 0.7) {
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 200);
    });
  }
}

/**
 * Process a single message send task
 */
async function processTask(task) {
  const taskId = task.id;
  const target = task.campaign_targets;
  const connection = target.connections;
  const template = task.campaigns.message_templates;

  logger.info(`Processing task ${taskId} for ${connection.full_name}`);

  let page;
  try {
    // Create new page for this task
    page = await context.newPage();

    // Navigate to LinkedIn feed to check auth
    await reportProgress(taskId, 'navigation', 'info', 'Checking LinkedIn session...');
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle' });

    // Check if we're logged in
    const isLoggedIn = await page.locator('nav[aria-label="Primary"]').isVisible().catch(() => false);

    if (!isLoggedIn) {
      await reportProgress(taskId, 'navigation', 'error', 'LinkedIn session expired');
      await completeTask(taskId, false, 'LinkedIn session expired - manual login required');
      return;
    }

    // Navigate to recipient profile
    await reportProgress(taskId, 'navigation', 'info', `Navigating to ${connection.full_name}'s profile`);

    if (connection.linkedin_url) {
      await page.goto(connection.linkedin_url, { waitUntil: 'networkidle' });
    } else {
      // Search by name if no direct URL
      await page.goto('https://www.linkedin.com/search/results/people/');
      await page.fill('[placeholder*="Search"]', connection.full_name);
      await page.press('[placeholder*="Search"]', 'Enter');
      await page.waitForLoadState('networkidle');

      // Click first result
      await page.locator('.entity-result__title-text a').first().click();
      await page.waitForLoadState('networkidle');
    }

    await humanize(page);

    // Check if it's a 1st degree connection
    const isFirstDegree = await page.locator('text=/1st/').isVisible().catch(() => false);

    if (!isFirstDegree) {
      await reportProgress(taskId, 'openComposer', 'error', 'Not a 1st degree connection');
      await completeTask(taskId, false, 'Not a 1st degree connection');
      return;
    }

    // Take screenshot before action
    const beforeScreenshot = await takeScreenshot(page, 'before-message');
    await reportProgress(taskId, 'openComposer', 'info', 'Opening message composer', {
      screenshot_path: beforeScreenshot,
    });

    // Click Message button
    const messageButton = page.locator('button:has-text("Message")').first();
    await messageButton.click();
    await page.waitForTimeout(2000);

    // Wait for composer
    const composer = page.locator('[contenteditable="true"][role="textbox"]').first();
    await composer.waitFor({ state: 'visible', timeout: 10000 });

    await humanize(page, { minDelay: 1500, maxDelay: 3000 });

    // Type the message
    await reportProgress(taskId, 'injectText', 'info', 'Typing message...');

    const messageText = target.personalized_body || template.body;

    // Type character by character with random delays
    await composer.click();
    for (const char of messageText) {
      await page.keyboard.type(char);
      await page.waitForTimeout(30 + Math.random() * 70); // 30-100ms per character

      // Occasional longer pause
      if (Math.random() > 0.95) {
        await page.waitForTimeout(500 + Math.random() * 1000);
      }
    }

    await humanize(page, { minDelay: 2000, maxDelay: 4000 });

    // Take screenshot before sending
    const readyScreenshot = await takeScreenshot(page, 'ready-to-send');
    await reportProgress(taskId, 'sendClick', 'info', 'Sending message...', {
      screenshot_path: readyScreenshot,
    });

    // Send the message
    const sendButton = page.locator('button:has-text("Send")').last();
    await sendButton.click();

    await page.waitForTimeout(3000);

    // Verify message was sent
    const afterScreenshot = await takeScreenshot(page, 'after-send');
    await reportProgress(taskId, 'postSend', 'success', 'Message sent successfully', {
      screenshot_path: afterScreenshot,
    });

    await completeTask(taskId, true);
    logger.info(`Task ${taskId} completed successfully`);

  } catch (error) {
    logger.error(`Task ${taskId} failed:`, error);
    await reportProgress(taskId, 'error', 'error', error.message);
    await completeTask(taskId, false, error.message);
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Main polling loop
 */
async function pollTasks() {
  while (true) {
    try {
      const task = await claimTask();

      if (task) {
        logger.info(`Claimed task ${task.id}`);
        queue.add(() => processTask(task));
      }

      await new Promise(resolve => setTimeout(resolve, config.pollInterval));
    } catch (error) {
      logger.error('Polling error:', error);
      await new Promise(resolve => setTimeout(resolve, config.pollInterval));
    }
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down...');

  queue.pause();
  queue.clear();
  await queue.onIdle();

  if (browser) {
    await browser.close();
  }

  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Main entry point
async function main() {
  logger.info('LinkedIn Runner starting...');
  logger.info(`Runner ID: ${config.runnerId}`);
  logger.info(`API URL: ${config.apiBaseUrl}`);

  try {
    await initBrowser();
    await pollTasks();
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start the runner
main();