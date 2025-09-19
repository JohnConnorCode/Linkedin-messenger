const { chromium } = require('playwright');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

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
    new winston.transports.File({ filename: 'linkedin-runner.log' }),
  ],
});

// Selector packs with versioning
const SELECTOR_PACKS = {
  'v2025.01.1': {
    messageButton: { role: 'button', name: /message/i },
    composer: { selector: '[contenteditable="true"][role="textbox"]' },
    sendButton: { role: 'button', name: /^send$/i },
    connectButton: { role: 'button', name: /connect/i },
    moreButton: { role: 'button', name: /more/i },
    profileName: { selector: 'h1' },
    profileHeadline: { selector: '[data-generated-suggestion-target]' },
    firstDegreeIndicator: { text: '1st' },
    messageComposer: { selector: '.msg-form__contenteditable' },
    messageSendButton: { selector: '.msg-form__send-button' }
  },
  'v2024.12.1': {
    // Fallback selectors for older LinkedIn UI
    messageButton: { selector: 'button[aria-label*="Message"]' },
    composer: { selector: '.msg-form__contenteditable' },
    sendButton: { selector: 'button[type="submit"]' }
  }
};

class LinkedInRunner {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.currentSelectorPack = SELECTOR_PACKS['v2025.01.1'];
    this.selectorVersion = 'v2025.01.1';
  }

  async initialize() {
    try {
      logger.info('Initializing LinkedIn Runner...');

      // Ensure user data directory exists
      await fs.mkdir(this.config.userDataDir, { recursive: true });

      // Launch persistent context for session persistence
      this.context = await chromium.launchPersistentContext(this.config.userDataDir, {
        headless: false, // Must be headful for anti-detection
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: this.config.timezone || 'America/New_York',
        permissions: ['clipboard-read', 'clipboard-write'],
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
      });

      this.page = await this.context.newPage();

      // Anti-detection measures
      await this.context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
      });

      logger.info('LinkedIn Runner initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize LinkedIn Runner:', error);
      throw error;
    }
  }

  async checkSession() {
    try {
      await this.page.goto('https://www.linkedin.com/feed/', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Check if we're logged in
      const isLoggedIn = await this.page.evaluate(() => {
        return !window.location.href.includes('/login') &&
               !window.location.href.includes('/checkpoint');
      });

      if (!isLoggedIn) {
        logger.warn('LinkedIn session expired or not logged in');
        return { status: 'AUTH_REQUIRED', needsLogin: true };
      }

      // Check for rate limiting or suspicious activity warnings
      const hasWarning = await this.page.locator('text=/temporarily restricted/i').count() > 0;
      if (hasWarning) {
        logger.warn('LinkedIn rate limit detected');
        return { status: 'LIMIT_REACHED', needsCooldown: true };
      }

      return { status: 'CONNECTED', ready: true };
    } catch (error) {
      logger.error('Session check failed:', error);
      return { status: 'ERROR', error: error.message };
    }
  }

  async navigateToProfile(profileUrl) {
    try {
      logger.info(`Navigating to profile: ${profileUrl}`);

      // Add random delay before navigation
      await this.humanDelay(2000, 4000);

      await this.page.goto(profileUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for profile to load
      await this.page.waitForSelector('h1', { timeout: 10000 });

      // Verify it's a 1st-degree connection
      const isFirstDegree = await this.page.locator('text=/1st/').count() > 0;

      if (!isFirstDegree) {
        logger.warn('Not a 1st-degree connection');
        return { success: false, error: 'NOT_FIRST_DEGREE' };
      }

      // Humanize: scroll through profile
      await this.humanizeScrolling();

      return { success: true };
    } catch (error) {
      logger.error('Navigation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async openMessageComposer() {
    try {
      logger.info('Opening message composer');

      // Try multiple selector strategies
      let messageButton = null;

      // Strategy 1: Role-based selector
      try {
        messageButton = await this.page.getByRole(
          this.currentSelectorPack.messageButton.role,
          { name: this.currentSelectorPack.messageButton.name }
        );
      } catch (e) {
        logger.debug('Role-based selector failed, trying alternatives');
      }

      // Strategy 2: Text-based selector
      if (!messageButton) {
        messageButton = await this.page.locator('button:has-text("Message")').first();
      }

      // Strategy 3: Aria-label selector
      if (!messageButton) {
        messageButton = await this.page.locator('button[aria-label*="Message"]').first();
      }

      if (!messageButton || await messageButton.count() === 0) {
        throw new Error('Message button not found');
      }

      // Human-like hover before click
      await messageButton.hover();
      await this.humanDelay(500, 1000);

      await messageButton.click();
      await this.humanDelay(1000, 2000);

      // Wait for composer to appear
      const composer = await this.page.waitForSelector(
        this.currentSelectorPack.composer.selector,
        { timeout: 10000 }
      );

      if (!composer) {
        throw new Error('Message composer did not open');
      }

      return { success: true, composer };
    } catch (error) {
      logger.error('Failed to open message composer:', error);

      // Try fallback selector pack
      if (this.selectorVersion === 'v2025.01.1') {
        logger.info('Trying fallback selectors');
        this.currentSelectorPack = SELECTOR_PACKS['v2024.12.1'];
        this.selectorVersion = 'v2024.12.1';
        return await this.openMessageComposer();
      }

      return { success: false, error: error.message };
    }
  }

  async typeMessage(message) {
    try {
      logger.info('Typing message');

      const composer = await this.page.locator(this.currentSelectorPack.composer.selector).first();

      if (!composer) {
        throw new Error('Composer not found');
      }

      // Click to focus
      await composer.click();
      await this.humanDelay(500, 1000);

      // Clear any existing text
      await composer.clear();

      // Type message with human-like speed and occasional pauses
      await this.humanizedTyping(composer, message);

      return { success: true };
    } catch (error) {
      logger.error('Failed to type message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendMessage() {
    try {
      logger.info('Sending message');

      // Find send button
      let sendButton = null;

      // Try multiple strategies
      try {
        sendButton = await this.page.getByRole(
          this.currentSelectorPack.sendButton.role,
          { name: this.currentSelectorPack.sendButton.name }
        );
      } catch (e) {
        sendButton = await this.page.locator(this.currentSelectorPack.sendButton.selector).first();
      }

      if (!sendButton || await sendButton.count() === 0) {
        // Try pressing Enter as alternative
        await this.page.keyboard.press('Enter');
      } else {
        // Human-like hover and click
        await sendButton.hover();
        await this.humanDelay(300, 700);
        await sendButton.click();
      }

      // Wait for message to be sent
      await this.humanDelay(2000, 3000);

      // Verify message was sent (look for sent indicator)
      const sentIndicator = await this.page.locator('text=/Sent/i').count() > 0;

      return { success: sentIndicator, sentAt: new Date().toISOString() };
    } catch (error) {
      logger.error('Failed to send message:', error);
      return { success: false, error: error.message };
    }
  }

  async captureScreenshot(prefix) {
    try {
      const filename = `${prefix}-${Date.now()}.png`;
      const filepath = path.join(this.config.screenshotDir || './screenshots', filename);

      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await this.page.screenshot({
        path: filepath,
        fullPage: false
      });

      logger.info(`Screenshot saved: ${filename}`);
      return filepath;
    } catch (error) {
      logger.error('Failed to capture screenshot:', error);
      return null;
    }
  }

  async processTask(task) {
    const logs = [];
    const screenshots = {};

    try {
      // Check session first
      const sessionStatus = await this.checkSession();
      logs.push({
        stage: 'session_check',
        status: sessionStatus.status === 'CONNECTED' ? 'success' : 'error',
        message: `Session status: ${sessionStatus.status}`,
        timestamp: new Date().toISOString()
      });

      if (sessionStatus.status !== 'CONNECTED') {
        return {
          success: false,
          error: sessionStatus.status,
          logs,
          needsIntervention: true
        };
      }

      // Navigate to profile
      screenshots.beforeNavigation = await this.captureScreenshot('before-nav');

      const navResult = await this.navigateToProfile(task.profileUrl);
      logs.push({
        stage: 'navigation',
        status: navResult.success ? 'success' : 'error',
        message: navResult.error || 'Successfully navigated to profile',
        timestamp: new Date().toISOString()
      });

      if (!navResult.success) {
        screenshots.navigationError = await this.captureScreenshot('nav-error');
        return {
          success: false,
          error: navResult.error,
          logs,
          screenshots
        };
      }

      screenshots.profileLoaded = await this.captureScreenshot('profile');

      // Open message composer
      const composerResult = await this.openMessageComposer();
      logs.push({
        stage: 'openComposer',
        status: composerResult.success ? 'success' : 'error',
        message: composerResult.error || 'Message composer opened',
        selectorVersion: this.selectorVersion,
        timestamp: new Date().toISOString()
      });

      if (!composerResult.success) {
        screenshots.composerError = await this.captureScreenshot('composer-error');
        return {
          success: false,
          error: composerResult.error,
          logs,
          screenshots,
          selectorVersion: this.selectorVersion
        };
      }

      screenshots.composerOpen = await this.captureScreenshot('composer-open');

      // Type message
      const typeResult = await this.typeMessage(task.message);
      logs.push({
        stage: 'injectText',
        status: typeResult.success ? 'success' : 'error',
        message: typeResult.error || 'Message typed successfully',
        timestamp: new Date().toISOString()
      });

      if (!typeResult.success) {
        return {
          success: false,
          error: typeResult.error,
          logs,
          screenshots
        };
      }

      screenshots.messageTyped = await this.captureScreenshot('message-typed');

      // Send message
      const sendResult = await this.sendMessage();
      logs.push({
        stage: 'sendClick',
        status: sendResult.success ? 'success' : 'error',
        message: sendResult.error || 'Message sent successfully',
        timestamp: new Date().toISOString()
      });

      screenshots.afterSend = await this.captureScreenshot('after-send');

      return {
        success: sendResult.success,
        sentAt: sendResult.sentAt,
        logs,
        screenshots,
        selectorVersion: this.selectorVersion
      };

    } catch (error) {
      logger.error('Task processing failed:', error);
      screenshots.error = await this.captureScreenshot('error');

      logs.push({
        stage: 'unknown',
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: error.message,
        logs,
        screenshots
      };
    }
  }

  // Humanization helpers
  async humanDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanizedTyping(element, text) {
    for (const char of text) {
      await element.type(char);

      // Variable typing speed
      const typingDelay = Math.floor(Math.random() * 100 + 50);
      await new Promise(resolve => setTimeout(resolve, typingDelay));

      // Occasional longer pauses (thinking)
      if (Math.random() < 0.1) {
        await this.humanDelay(500, 1500);
      }
    }
  }

  async humanizeScrolling() {
    const scrolls = Math.floor(Math.random() * 3 + 2);

    for (let i = 0; i < scrolls; i++) {
      const scrollDistance = Math.floor(Math.random() * 300 + 100);
      await this.page.mouse.wheel(0, scrollDistance);
      await this.humanDelay(500, 1500);
    }

    // Scroll back up a bit
    await this.page.mouse.wheel(0, -200);
  }

  async humanizeMouseMovement() {
    const moves = Math.floor(Math.random() * 3 + 2);

    for (let i = 0; i < moves; i++) {
      const x = Math.floor(Math.random() * 800 + 100);
      const y = Math.floor(Math.random() * 600 + 100);
      await this.page.mouse.move(x, y);
      await this.humanDelay(200, 500);
    }
  }

  async close() {
    if (this.context) {
      await this.context.close();
    }
  }
}

module.exports = LinkedInRunner;