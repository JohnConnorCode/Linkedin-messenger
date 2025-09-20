/**
 * LinkedIn Runner with GPT-5 Nano AI Personalization
 * Uses GPT-5 Nano (released August 2025) for cost-effective personalized messaging
 * Model: gpt-5-nano - Cost: $0.05/1M input, $0.40/1M output tokens
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const ProfileScraper = require('./profile-scraper');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
require('dotenv').config();

// Initialize logger
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
    new winston.transports.File({ filename: 'linkedin-runner-ai.log' })
  ]
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const CONFIG = {
  AI_ENABLED: process.env.AI_ENABLED !== 'false',
  AI_TONE: process.env.AI_TONE || 'professional',
  SCRAPE_PROFILES: process.env.SCRAPE_PROFILES !== 'false',
  MESSAGE_DELAY_MIN: 180000, // 3 minutes
  MESSAGE_DELAY_MAX: 420000, // 7 minutes
  COOKIES_PATH: path.join(__dirname, 'linkedin-sessions', 'cookies.json'),
  SCREENSHOTS_DIR: './screenshots'
};

let browser, context, page, scraper;

async function initialize() {
  console.log('🚀 Starting LinkedIn Runner with AI Personalization...\n');
  console.log(`   AI Mode: ${CONFIG.AI_ENABLED ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Tone: ${CONFIG.AI_TONE}`);
  console.log(`   Profile Scraping: ${CONFIG.SCRAPE_PROFILES ? '✅ Enabled' : '❌ Disabled'}\n`);

  // Launch browser
  browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  // Check for saved cookies
  let cookies = [];
  try {
    const cookieData = await fs.readFile(CONFIG.COOKIES_PATH, 'utf-8');
    cookies = JSON.parse(cookieData);
    console.log(`💾 Loaded ${cookies.length} saved cookies`);
  } catch {
    console.log('🔐 No saved session found - manual login required');
  }

  // Create context with cookies
  context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    storageState: cookies.length > 0 ? { cookies } : undefined
  });

  page = await context.newPage();

  // Initialize profile scraper
  scraper = new ProfileScraper(page, logger);

  // Check login status
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
    await fs.mkdir(path.dirname(CONFIG.COOKIES_PATH), { recursive: true });
    await fs.writeFile(CONFIG.COOKIES_PATH, JSON.stringify(newCookies, null, 2));
    console.log('💾 Session saved for future use');
  } else {
    console.log('✅ Already logged in using saved session');
  }

  // Start processing
  console.log('\n📊 Starting AI-enhanced task processor...');
  await processTasks();
}

async function processTasks() {
  while (true) {
    try {
      // Fetch pending AI personalization tasks
      if (CONFIG.AI_ENABLED) {
        await processAIQueue();
      }

      // Fetch pending message tasks
      const { data: tasks } = await supabase
        .from('task_queue')
        .select(`
          *,
          campaign_targets!inner(
            *,
            connections!inner(*),
            campaigns!inner(
              *,
              message_templates(*)
            )
          )
        `)
        .eq('status', 'pending')
        .limit(1);

      if (tasks && tasks.length > 0) {
        const task = tasks[0];
        console.log(`\n📬 Processing task ${task.id}`);

        // Update task status
        await supabase
          .from('task_queue')
          .update({
            status: 'processing',
            started_at: new Date().toISOString()
          })
          .eq('id', task.id);

        // Process with AI if enabled
        let messageToSend = task.campaign_targets.personalized_body;

        if (CONFIG.AI_ENABLED && CONFIG.SCRAPE_PROFILES) {
          const aiResult = await enhanceMessageWithAI(task);
          if (aiResult.success) {
            messageToSend = aiResult.message;
            console.log('   🤖 Message enhanced with AI personalization');
          }
        }

        // Send message
        const success = await sendLinkedInMessage(task, messageToSend);

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

        // Random delay between messages
        const delay = CONFIG.MESSAGE_DELAY_MIN +
                     Math.random() * (CONFIG.MESSAGE_DELAY_MAX - CONFIG.MESSAGE_DELAY_MIN);
        console.log(`   ⏳ Waiting ${Math.round(delay/1000)}s before next message...`);
        await page.waitForTimeout(delay);

      } else {
        console.log('💤 No tasks in queue, checking again in 10s...');
        await page.waitForTimeout(10000);
      }

    } catch (error) {
      console.error('❌ Error in task processor:', error.message);
      logger.error('Task processor error:', error);
      await page.waitForTimeout(10000);
    }
  }
}

async function processAIQueue() {
  try {
    // Claim AI personalization tasks
    const { data: aiTasks } = await supabase
      .rpc('claim_ai_tasks', {
        p_processor_id: process.env.RUNNER_ID || 'local-runner',
        p_limit: 5
      });

    if (aiTasks && aiTasks.length > 0) {
      console.log(`\n🤖 Processing ${aiTasks.length} AI personalization tasks...`);

      for (const aiTask of aiTasks) {
        try {
          // Get connection and template data
          const { data: target } = await supabase
            .from('campaign_targets')
            .select(`
              *,
              connections(*),
              campaigns(
                *,
                message_templates(*)
              )
            `)
            .eq('id', aiTask.target_id)
            .single();

          if (!target) continue;

          const profileUrl = target.connections.linkedin_url;
          const template = target.campaigns.message_templates?.body || '';

          // Scrape profile
          console.log(`   📋 Scraping profile: ${target.connections.name}`);
          const scraped = await scraper.scrapeProfile(profileUrl);

          if (scraped.success) {
            // Save scraped data
            await scraper.saveProfile(target.connection_id, scraped.data);

            // Generate AI personalization
            console.log(`   🧠 Generating AI personalization...`);
            const personalization = await scraper.generatePersonalization(
              scraped.data,
              template,
              CONFIG.AI_TONE
            );

            // Save AI summary
            await supabase
              .from('profile_ai_summaries')
              .upsert({
                connection_id: target.connection_id,
                campaign_id: target.campaign_id,
                template_id: target.campaigns.message_templates?.id,
                tone: CONFIG.AI_TONE,
                persona: personalization.persona,
                summary: personalization.summary,
                first_line: personalization.firstLine,
                midline: personalization.midline,
                custom_variables: personalization.variables,
                risk_flags: personalization.riskFlags,
                confidence_score: personalization.confidence,
                model: 'gpt-5-nano',
                validator_status: personalization.riskFlags.length === 0 ? 'approved' : 'flagged'
              });

            // Update campaign target with personalized message
            const personalizedMessage = buildPersonalizedMessage(
              template,
              personalization,
              scraped.data
            );

            await supabase
              .from('campaign_targets')
              .update({
                personalized_body: personalizedMessage,
                ai_personalized: true,
                ai_confidence: personalization.confidence
              })
              .eq('id', target.id);

            // Mark AI task as completed
            await supabase
              .from('ai_personalization_queue')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('id', aiTask.id);

            console.log(`   ✅ AI personalization completed for ${target.connections.name}`);
          }
        } catch (error) {
          logger.error(`AI task ${aiTask.id} failed:`, error);

          await supabase
            .from('ai_personalization_queue')
            .update({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', aiTask.id);
        }
      }
    }
  } catch (error) {
    logger.error('AI queue processing error:', error);
  }
}

async function enhanceMessageWithAI(task) {
  try {
    const connection = task.campaign_targets.connections;
    const profileUrl = connection.linkedin_url;

    // Check if we already have AI personalization
    const { data: existing } = await supabase
      .from('profile_ai_summaries')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('campaign_id', task.campaign_id)
      .single();

    if (existing && existing.first_line) {
      // Use existing personalization
      const template = task.campaign_targets.campaigns.message_templates?.body || '';
      const personalizedMessage = buildPersonalizedMessage(template, {
        firstLine: existing.first_line,
        midline: existing.midline,
        variables: existing.custom_variables
      }, connection);

      return { success: true, message: personalizedMessage };
    }

    // Scrape and generate new personalization
    console.log('   📋 Scraping profile for AI personalization...');
    const scraped = await scraper.scrapeProfile(profileUrl);

    if (!scraped.success) {
      return { success: false, message: task.campaign_targets.personalized_body };
    }

    const template = task.campaign_targets.campaigns.message_templates?.body || '';
    const personalization = await scraper.generatePersonalization(
      scraped.data,
      template,
      CONFIG.AI_TONE
    );

    const personalizedMessage = buildPersonalizedMessage(
      template,
      personalization,
      scraped.data
    );

    return { success: true, message: personalizedMessage };

  } catch (error) {
    logger.error('AI enhancement error:', error);
    return { success: false, message: task.campaign_targets.personalized_body };
  }
}

function buildPersonalizedMessage(template, personalization, profileData) {
  let message = template;

  // Replace AI tokens
  if (personalization.firstLine) {
    message = personalization.firstLine + '\n\n' + message;
  }

  if (personalization.midline) {
    // Insert midline in the middle of the message
    const lines = message.split('\n');
    const midPoint = Math.floor(lines.length / 2);
    lines.splice(midPoint, 0, personalization.midline);
    message = lines.join('\n');
  }

  // Replace standard variables
  const variables = {
    ...personalization.variables,
    first_name: profileData.name?.split(' ')[0] || '',
    name: profileData.name || '',
    company: profileData.company || '',
    title: profileData.title || '',
    headline: profileData.headline || ''
  };

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    message = message.replace(regex, value);
  }

  // Clean up any remaining placeholders
  message = message.replace(/{{[^}]*}}/g, '');

  return message.trim();
}

async function sendLinkedInMessage(task, message) {
  try {
    const connection = task.campaign_targets.connections;
    if (!connection?.linkedin_url) {
      console.log('   ⚠️  No LinkedIn URL for target');
      return false;
    }

    const profileUrl = connection.linkedin_url;
    console.log(`   👤 Sending to: ${connection.name}`);

    // Navigate to profile
    await page.goto(profileUrl);
    await page.waitForTimeout(2000);

    // Click Message button
    const messageButton = await page.locator('button:has-text("Message")').first();
    if (await messageButton.isVisible()) {
      await messageButton.click();
      await page.waitForTimeout(2000);

      // Type message with human-like speed
      const messageBox = await page.locator('[contenteditable="true"]').last();
      if (await messageBox.isVisible()) {
        // Clear any existing text
        await messageBox.clear();

        // Type character by character with random delays
        for (const char of message) {
          await messageBox.type(char);
          await page.waitForTimeout(30 + Math.random() * 70);

          // Occasional pauses
          if (Math.random() < 0.1) {
            await page.waitForTimeout(300 + Math.random() * 500);
          }
        }

        await page.waitForTimeout(1000);

        // Take screenshot before sending
        const screenshotPath = path.join(CONFIG.SCREENSHOTS_DIR, `${task.id}.png`);
        await fs.mkdir(CONFIG.SCREENSHOTS_DIR, { recursive: true });
        await page.screenshot({ path: screenshotPath });
        console.log(`   📸 Screenshot saved`);

        // Send message
        const sendButton = await page.locator('button:has-text("Send")').first();
        if (await sendButton.isVisible()) {
          await sendButton.click();
          console.log('   ✉️  Message sent!');

          // Upload screenshot to Supabase storage
          await uploadScreenshot(screenshotPath, task.id);

          return true;
        } else {
          console.log('   ⚠️  Send button not found');
          return false;
        }
      }
    }

    console.log('   ⚠️  Could not find message UI elements');
    return false;

  } catch (error) {
    console.error('   ❌ Error sending message:', error.message);
    logger.error('Send message error:', error);
    return false;
  }
}

async function uploadScreenshot(filePath, taskId) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const fileName = `screenshots/${taskId}.png`;

    const { error } = await supabase.storage
      .from('runner-screens')
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    console.log('   ☁️  Screenshot uploaded to storage');
  } catch (error) {
    logger.error('Screenshot upload error:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');

  if (context) {
    // Save cookies before exit
    const cookies = await context.cookies();
    await fs.writeFile(CONFIG.COOKIES_PATH, JSON.stringify(cookies, null, 2));
    console.log('💾 Session saved');

    await context.close();
  }

  if (browser) {
    await browser.close();
  }

  process.exit(0);
});

// Start the runner
initialize().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});