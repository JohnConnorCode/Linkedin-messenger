#!/usr/bin/env node
import { chromium, BrowserContext, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import { program } from 'commander';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.local.runner' });

// CLI configuration
program
  .option('--health', 'Check session health and exit')
  .option('--dry-run', 'Navigate and compose but do not send')
  .option('--pack <version>', 'Use specific selector pack version')
  .option('--target <id>', 'Process single task by ID')
  .option('--sandbox', 'Run against local sandbox')
  .option('--max <n>', 'Maximum messages this run', parseInt)
  .parse();

const options = program.opts();

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  runnerId: process.env.RUNNER_ID || 'local-runner',
  timezone: process.env.USER_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone,
  sessionRoot: process.env.SESSION_ROOT || path.join(homedir(), '.linkedin-runner', 'sessions'),
  screenshotBucket: process.env.SCREENSHOT_BUCKET || 'runner-screens',
  sessionBucket: process.env.SESSION_BUCKET || 'runner-sessions',
  pollInterval: parseInt(process.env.POLL_INTERVAL_MS || '5000'),
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '1'),
};

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({
      filename: path.join(homedir(), '.linkedin-runner', 'logs', 'runner.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

// Load selector pack
async function loadSelectorPack(version?: string): Promise<any> {
  const packVersion = version || options.pack || 'v2025.09.1';
  const packPath = path.join(__dirname, '..', '..', 'shared', 'selector-packs', `${packVersion}.json`);

  try {
    const packContent = await fs.readFile(packPath, 'utf-8');
    return JSON.parse(packContent);
  } catch (error) {
    logger.error(`Failed to load selector pack ${packVersion}`, error);
    throw error;
  }
}

class LinkedInRunner {
  private browser?: BrowserContext;
  private context?: BrowserContext;
  private page?: Page;
  private selectors: any;
  private messagesProcessed = 0;

  constructor(private userId: string, private accountId: string) {}

  async initialize(): Promise<void> {
    this.selectors = await loadSelectorPack();
    logger.info(`Loaded selector pack version ${this.selectors.version}`);

    const userDataDir = path.join(config.sessionRoot, this.userId, this.accountId);
    await fs.mkdir(userDataDir, { recursive: true });

    this.browser = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
    });

    this.context = this.browser;
    this.page = this.context!.pages()[0] || await this.context!.newPage();

    // Anti-detection
    await this.context!.addInitScript(() => {
      Object.defineProperty((globalThis as any).navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty((globalThis as any).navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });
  }

  async checkHealth(): Promise<'connected' | 'needs_login' | 'suspect'> {
    try {
      await this.page!.goto('https://www.linkedin.com/feed/', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      const url = this.page!.url();

      if (url.includes('/login') || url.includes('/checkpoint')) {
        return 'needs_login';
      }

      if (url.includes('/feed')) {
        // Check for key elements
        const feedVisible = await this.page!.locator(this.selectors.selectors.feed.feedContainer).isVisible();
        if (feedVisible) {
          logger.info('Session healthy - feed accessible');
          return 'connected';
        }
      }

      return 'suspect';
    } catch (error) {
      logger.error('Health check failed', error);
      return 'needs_login';
    }
  }

  async login(): Promise<boolean> {
    logger.info('Manual login required - opening LinkedIn...');
    await this.page!.goto('https://www.linkedin.com/login');

    logger.info('Please log in manually in the browser window');
    logger.info('Waiting for successful login...');

    try {
      await this.page!.waitForURL('**/feed/**', { timeout: 300000 }); // 5 minutes
      logger.info('Login successful!');

      // Save session backup
      await this.backupSession();
      return true;
    } catch {
      logger.error('Login timeout - please try again');
      return false;
    }
  }

  async backupSession(): Promise<void> {
    try {
      const cookies = await this.context!.cookies();
      const sessionData = {
        cookies,
        timestamp: new Date().toISOString(),
        runnerId: config.runnerId
      };

      const { error } = await supabase.storage
        .from(config.sessionBucket)
        .upload(
          `${this.userId}/${this.accountId}/backup-${Date.now()}.json`,
          JSON.stringify(sessionData),
          { contentType: 'application/json' }
        );

      if (!error) {
        logger.info('Session backed up to Supabase');
      }
    } catch (error) {
      logger.warn('Session backup failed', error);
    }
  }

  async processTask(task: any): Promise<boolean> {
    if (options.dryRun) {
      logger.info(`[DRY RUN] Would process task ${task.id}`);
    }

    try {
      const { campaign_targets } = task;
      const profileUrl = campaign_targets?.connections?.linkedin_url;
      const message = campaign_targets?.personalized_body;

      if (!profileUrl || !message) {
        logger.warn(`Task ${task.id} missing required data`);
        return false;
      }

      // Navigate to profile
      await this.page!.goto(profileUrl);
      await this.page!.waitForTimeout(this.selectors.waits.pageLoad);

      // Click Message button
      const messageButton = await this.page!.locator(
        `${this.selectors.selectors.messaging.messageButton}, ${this.selectors.selectors.messaging.messageButtonAlt}`
      ).first();

      if (await messageButton.isVisible()) {
        await messageButton.click();
        await this.page!.waitForTimeout(this.selectors.waits.afterClick);

        // Type message
        const messageBox = await this.page!.locator(this.selectors.selectors.messaging.messageTextarea).last();
        if (await messageBox.isVisible()) {
          await messageBox.type(message, { delay: this.selectors.waits.typing });

          // Screenshot
          const screenshotPath = path.join(homedir(), '.linkedin-runner', 'screenshots', `${task.id}.png`);
          await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
          await this.page!.screenshot({ path: screenshotPath });

          if (!options.dryRun) {
            // Send message
            const sendButton = await this.page!.locator(
              `${this.selectors.selectors.messaging.sendButton}, ${this.selectors.selectors.messaging.sendButtonAlt}`
            ).first();

            await sendButton.click();
            logger.info(`Message sent for task ${task.id}`);
          } else {
            logger.info(`[DRY RUN] Message composed but not sent for task ${task.id}`);
          }

          this.messagesProcessed++;
          return true;
        }
      }

      logger.warn(`Could not find message UI for task ${task.id}`);
      return false;

    } catch (error) {
      logger.error(`Failed to process task ${task.id}`, error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main runner loop
async function runTaskLoop() {
  logger.info(`Starting LinkedIn Runner - ${config.runnerId}`);
  logger.info(`Timezone: ${config.timezone}`);
  logger.info(`Poll interval: ${config.pollInterval}ms`);

  // For now, use a default user/account - in production, this would be dynamic
  const runner = new LinkedInRunner('default-user', 'default-account');
  await runner.initialize();

  // Health check
  const health = await runner.checkHealth();

  if (options.health) {
    console.log(`Health status: ${health}`);
    await runner.cleanup();
    process.exit(health === 'connected' ? 0 : 1);
  }

  if (health === 'needs_login') {
    const loginSuccess = await runner.login();
    if (!loginSuccess) {
      logger.error('Login failed - exiting');
      await runner.cleanup();
      process.exit(1);
    }
  }

  logger.info('Starting task processing loop...');
  let processedCount = 0;
  const maxMessages = options.max || Infinity;

  while (processedCount < maxMessages) {
    try {
      // Fetch next task
      const query = supabase
        .from('task_queue')
        .select(`
          *,
          campaign_targets (
            *,
            connections (*)
          )
        `)
        .eq('status', 'queued')
        .lte('run_after', new Date().toISOString())
        .order('run_after', { ascending: true })
        .limit(1);

      if (options.target) {
        query.eq('id', options.target);
      }

      const { data: tasks, error } = await query;

      if (error) {
        logger.error('Failed to fetch tasks', error);
        await new Promise(resolve => setTimeout(resolve, config.pollInterval));
        continue;
      }

      if (tasks && tasks.length > 0) {
        const task = tasks[0];
        logger.info(`Processing task ${task.id}`);

        // Claim task
        await supabase
          .from('task_queue')
          .update({
            status: 'processing',
            runner_id: config.runnerId,
            started_at: new Date().toISOString()
          })
          .eq('id', task.id);

        // Process
        const success = await runner.processTask(task);

        // Update result
        await supabase
          .from('task_queue')
          .update({
            status: success ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            last_error: success ? null : 'Processing failed'
          })
          .eq('id', task.id);

        processedCount++;

        // Rate limiting
        const delay = 30000 + Math.random() * 30000; // 30-60s
        logger.info(`Waiting ${Math.round(delay / 1000)}s before next task...`);
        await new Promise(resolve => setTimeout(resolve, delay));

      } else {
        logger.debug('No tasks available');
        await new Promise(resolve => setTimeout(resolve, config.pollInterval));
      }

    } catch (error) {
      logger.error('Loop error', error);
      await new Promise(resolve => setTimeout(resolve, config.pollInterval));
    }
  }

  logger.info(`Processed ${processedCount} messages - exiting`);
  await runner.cleanup();
}

// Signal handlers
process.on('SIGINT', async () => {
  logger.info('Received SIGINT - shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM - shutting down gracefully');
  process.exit(0);
});

// Run
if (require.main === module) {
  runTaskLoop().catch(error => {
    logger.error('Fatal error', error);
    process.exit(1);
  });
}