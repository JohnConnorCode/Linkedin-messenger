require('dotenv').config();
const axios = require('axios');
const winston = require('winston');
const LinkedInRunner = require('./linkedin-runner');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs').promises;

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
  runnerId: process.env.RUNNER_ID || `runner-${Date.now()}`,
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api/runner',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  runnerSharedSecret: process.env.RUNNER_SHARED_SECRET,
  userDataDir: process.env.USER_DATA_DIR || './user-data',
  screenshotDir: process.env.SCREENSHOT_DIR || './screenshots',
  pollInterval: parseInt(process.env.POLL_INTERVAL_MS || '10000'),
  timezone: process.env.USER_TIMEZONE || 'America/New_York',
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000')
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// LinkedIn Runner instance
let linkedInRunner = null;

// Health metrics
const metrics = {
  tasksProcessed: 0,
  tasksSucceeded: 0,
  tasksFailed: 0,
  lastTaskAt: null,
  startedAt: new Date(),
  version: '1.0.0'
};

/**
 * Generate JWT for API authentication
 */
function generateToken() {
  return jwt.sign(
    {
      runnerId: config.runnerId,
      type: 'runner',
      timestamp: Date.now()
    },
    config.runnerSharedSecret,
    { expiresIn: '1h' }
  );
}

/**
 * API client with authentication
 */
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${generateToken()}`;
  return config;
});

/**
 * Initialize the runner
 */
async function initialize() {
  logger.info('Initializing Production Runner...', { runnerId: config.runnerId });

  // Create necessary directories
  await fs.mkdir(config.userDataDir, { recursive: true });
  await fs.mkdir(config.screenshotDir, { recursive: true });

  // Initialize LinkedIn Runner
  linkedInRunner = new LinkedInRunner({
    userDataDir: config.userDataDir,
    screenshotDir: config.screenshotDir,
    timezone: config.timezone
  });

  await linkedInRunner.initialize();

  // Check initial session status
  const sessionStatus = await linkedInRunner.checkSession();
  logger.info('Initial session status:', sessionStatus);

  if (sessionStatus.status === 'AUTH_REQUIRED') {
    await handleAuthRequired();
  }

  // Start heartbeat
  startHeartbeat();

  logger.info('Runner initialized successfully');
}

/**
 * Claim a task from the queue
 */
async function claimTask() {
  try {
    // Check rate limits first
    const { data: { user } } = await supabase.auth.admin.listUsers();

    // Use Supabase RPC to claim task atomically
    const { data: tasks, error } = await supabase
      .rpc('claim_next_task', {
        p_runner_id: config.runnerId,
        p_rate_limits_ok: true
      });

    if (error) {
      logger.error('Error claiming task:', error);
      return null;
    }

    if (!tasks || tasks.length === 0) {
      return null;
    }

    const task = tasks[0];

    // Fetch full task details with relations
    const { data: fullTask } = await supabase
      .from('task_queue')
      .select(`
        *,
        campaigns(
          *,
          message_templates(*),
          user_settings(*)
        ),
        campaign_targets(
          *,
          connections(*)
        )
      `)
      .eq('id', task.task_id)
      .single();

    logger.info('Task claimed:', { taskId: task.task_id });
    return fullTask;
  } catch (error) {
    logger.error('Error claiming task:', error);
    return null;
  }
}

/**
 * Process a task
 */
async function processTask(task) {
  logger.info('Processing task:', { taskId: task.id });

  const startTime = Date.now();
  let result = null;

  try {
    // Extract task details
    const connection = task.campaign_targets.connections;
    const template = task.campaigns.message_templates;
    const campaign = task.campaigns;

    // Render message with template variables
    const message = renderTemplate(template.body, {
      first_name: connection.first_name,
      last_name: connection.last_name,
      company: connection.company,
      headline: connection.headline,
      // Add more variables as needed
    });

    // Check quiet hours
    if (isInQuietHours(campaign.quiet_hours)) {
      logger.info('In quiet hours, deferring task');
      await deferTask(task.id, 'QUIET_HOURS');
      return;
    }

    // Add jitter
    const jitter = Math.floor(Math.random() * (campaign.jitter_ms || 5000));
    await sleep(jitter);

    // Process with LinkedIn Runner
    result = await linkedInRunner.processTask({
      profileUrl: connection.linkedin_url,
      message: task.campaign_targets.personalized_body || message,
      connectionName: connection.full_name
    });

    // Log each stage
    for (const log of result.logs) {
      await createSendLog(task.id, log);
    }

    // Upload screenshots to Supabase Storage
    const screenshotUrls = await uploadScreenshots(result.screenshots);

    if (result.success) {
      await markTaskSuccess(task.id, {
        sentAt: result.sentAt,
        screenshots: screenshotUrls,
        selectorVersion: result.selectorVersion
      });

      // Update connection last messaged
      await updateConnectionLastMessaged(connection.id);

      // Increment rate limit counter
      await incrementRateLimit(task.user_id);

      metrics.tasksSucceeded++;
    } else {
      await markTaskFailed(task.id, result.error, result.needsIntervention);
      metrics.tasksFailed++;
    }

  } catch (error) {
    logger.error('Task processing error:', error);
    await markTaskFailed(task.id, error.message, false);
    metrics.tasksFailed++;
  } finally {
    metrics.tasksProcessed++;
    metrics.lastTaskAt = new Date();

    const duration = Date.now() - startTime;
    logger.info('Task completed', {
      taskId: task.id,
      success: result?.success || false,
      duration
    });

    // Add delay between tasks
    const minDelay = task.campaigns.user_settings?.min_between_messages_ms || 90000;
    await sleep(minDelay);
  }
}

/**
 * Mark task as successful
 */
async function markTaskSuccess(taskId, metadata) {
  const { error } = await supabase
    .from('task_queue')
    .update({
      status: 'succeeded',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      screenshot_url: metadata.screenshots?.afterSend
    })
    .eq('id', taskId);

  if (error) {
    logger.error('Error marking task success:', error);
  }

  // Update campaign stats
  await updateCampaignStats(taskId, 'success');
}

/**
 * Mark task as failed
 */
async function markTaskFailed(taskId, errorMessage, needsIntervention) {
  const { data: task } = await supabase
    .from('task_queue')
    .select('attempt, max_retries')
    .eq('id', taskId)
    .single();

  const shouldRetry = !needsIntervention && task.attempt < task.max_retries;

  if (shouldRetry) {
    // Calculate next retry time with exponential backoff
    const nextRunTime = calculateBackoff(task.attempt);

    const { error } = await supabase
      .from('task_queue')
      .update({
        status: 'deferred',
        run_after: nextRunTime,
        attempt: task.attempt + 1,
        last_error: errorMessage,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      logger.error('Error deferring task:', error);
    }
  } else {
    const { error } = await supabase
      .from('task_queue')
      .update({
        status: 'failed',
        last_error: errorMessage,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      logger.error('Error marking task failed:', error);
    }

    // Update campaign stats
    await updateCampaignStats(taskId, 'failure');
  }
}

/**
 * Create send log entry
 */
async function createSendLog(taskId, log) {
  const { error } = await supabase
    .from('send_logs')
    .insert({
      task_id: taskId,
      stage: log.stage,
      status: log.status,
      message: log.message,
      selector_version: log.selectorVersion,
      meta: log.meta || {},
      created_at: log.timestamp
    });

  if (error) {
    logger.error('Error creating send log:', error);
  }
}

/**
 * Upload screenshots to Supabase Storage
 */
async function uploadScreenshots(screenshots) {
  const urls = {};

  for (const [key, filepath] of Object.entries(screenshots || {})) {
    if (!filepath) continue;

    try {
      const fileContent = await fs.readFile(filepath);
      const filename = `${config.runnerId}/${Date.now()}-${key}.png`;

      const { data, error } = await supabase.storage
        .from('screenshots')
        .upload(filename, fileContent, {
          contentType: 'image/png'
        });

      if (error) {
        logger.error('Error uploading screenshot:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('screenshots')
        .getPublicUrl(filename);

      urls[key] = publicUrl;

      // Clean up local file
      await fs.unlink(filepath).catch(() => {});
    } catch (error) {
      logger.error('Screenshot upload error:', error);
    }
  }

  return urls;
}

/**
 * Send heartbeat to API
 */
async function sendHeartbeat() {
  try {
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();

    const { error } = await supabase
      .from('runner_status')
      .insert({
        runner_id: config.runnerId,
        last_heartbeat: new Date().toISOString(),
        status: 'healthy',
        cpu_percent: (cpuUsage.user + cpuUsage.system) / 1000000,
        memory_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        active_tasks: 0,
        version: metrics.version,
        metadata: metrics
      });

    if (error) {
      logger.error('Error sending heartbeat:', error);
    }
  } catch (error) {
    logger.error('Heartbeat error:', error);
  }
}

/**
 * Start heartbeat interval
 */
function startHeartbeat() {
  setInterval(sendHeartbeat, config.heartbeatInterval);
  sendHeartbeat(); // Send immediately
}

/**
 * Handle authentication required
 */
async function handleAuthRequired() {
  logger.warn('Authentication required - manual intervention needed');

  // Update LinkedIn account status
  const { error } = await supabase
    .from('linkedin_sessions')
    .update({
      status: 'disconnected',
      last_check_at: new Date().toISOString()
    })
    .eq('runner_instance', config.runnerId);

  if (error) {
    logger.error('Error updating account status:', error);
  }

  // Create error log
  await supabase
    .from('error_logs')
    .insert({
      error_class: 'AUTH_REQUIRED',
      error_message: 'LinkedIn session expired, manual login required',
      context: { runnerId: config.runnerId },
      created_at: new Date().toISOString()
    });

  logger.info('Waiting for manual login... Visit /run page in the app');
}

/**
 * Template rendering with Mustache-like syntax
 */
function renderTemplate(template, variables) {
  let rendered = template;

  // Simple variable replacement
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, value || '');
  }

  // Handle conditionals (simplified)
  rendered = rendered.replace(/{{#(\w+)}}(.*?){{\/\1}}/gs, (match, key, content) => {
    return variables[key] ? content : '';
  });

  rendered = rendered.replace(/{{^\w+}}(.*?){{\/\w+}}/gs, (match, key, content) => {
    return !variables[key] ? content : '';
  });

  return rendered;
}

/**
 * Check if currently in quiet hours
 */
function isInQuietHours(quietHours) {
  if (!quietHours) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const startHour = parseInt(quietHours.start.split(':')[0]);
  const endHour = parseInt(quietHours.end.split(':')[0]);

  if (startHour > endHour) {
    // Overnight quiet hours
    return currentHour >= startHour || currentHour < endHour;
  } else {
    return currentHour >= startHour && currentHour < endHour;
  }
}

/**
 * Calculate exponential backoff
 */
function calculateBackoff(attempt) {
  const delays = [
    10 * 60 * 1000,  // 10 minutes
    30 * 60 * 1000,  // 30 minutes
    2 * 60 * 60 * 1000,  // 2 hours
    24 * 60 * 60 * 1000  // 24 hours
  ];

  const delay = delays[Math.min(attempt, delays.length - 1)];
  return new Date(Date.now() + delay).toISOString();
}

/**
 * Update campaign statistics
 */
async function updateCampaignStats(taskId, result) {
  const { data: task } = await supabase
    .from('task_queue')
    .select('campaign_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  const field = result === 'success' ? 'total_sent' : 'total_failed';

  await supabase.rpc('increment', {
    table_name: 'campaigns',
    column_name: field,
    row_id: task.campaign_id
  });

  // Update last_sent_at for successful sends
  if (result === 'success') {
    await supabase
      .from('campaigns')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', task.campaign_id);
  }
}

/**
 * Update connection last messaged timestamp
 */
async function updateConnectionLastMessaged(connectionId) {
  await supabase
    .from('connections')
    .update({ last_messaged_at: new Date().toISOString() })
    .eq('id', connectionId);
}

/**
 * Increment rate limit counter
 */
async function incrementRateLimit(userId) {
  await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_limit_type: 'daily'
  });

  await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_limit_type: 'hourly'
  });
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main loop
 */
async function mainLoop() {
  logger.info('Starting main loop');

  while (true) {
    try {
      // Claim a task
      const task = await claimTask();

      if (task) {
        await processTask(task);
      } else {
        // No tasks available, wait before polling again
        await sleep(config.pollInterval);
      }

      // Check session periodically
      if (metrics.tasksProcessed % 10 === 0) {
        const sessionStatus = await linkedInRunner.checkSession();
        if (sessionStatus.status !== 'CONNECTED') {
          logger.warn('Session check failed:', sessionStatus);
          await handleAuthRequired();
          await sleep(60000); // Wait 1 minute before retrying
        }
      }

    } catch (error) {
      logger.error('Main loop error:', error);
      await sleep(30000); // Wait 30 seconds on error
    }
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down runner...');

  // Release any locked tasks
  await supabase
    .from('task_queue')
    .update({
      status: 'queued',
      locked_by: null,
      locked_at: null
    })
    .eq('locked_by', config.runnerId)
    .eq('status', 'in_progress');

  // Close LinkedIn Runner
  if (linkedInRunner) {
    await linkedInRunner.close();
  }

  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  shutdown();
});

// Start the runner
(async () => {
  try {
    await initialize();
    await mainLoop();
  } catch (error) {
    logger.error('Fatal error:', error);
    await shutdown();
  }
})();