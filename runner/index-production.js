require('dotenv').config({ path: __dirname + '/.env' });
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
 * Create deterministic canonical string for signing
 * Sorts keys to ensure consistent ordering across JS engines
 */
function createCanonicalString(payload, timestamp) {
  const sortedPayload = sortObjectKeys({ ...payload, _timestamp: timestamp });
  return JSON.stringify(sortedPayload);
}

/**
 * Recursively sort object keys for deterministic serialization
 */
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortObjectKeys(obj[key]);
      return sorted;
    }, {});
}

/**
 * Sign request payload with HMAC-SHA256 for secure API communication
 * Uses deterministic key ordering to prevent signature mismatches
 */
function signRequest(payload) {
  const secret = config.runnerSharedSecret;
  if (!secret) {
    throw new Error('RUNNER_SHARED_SECRET is required for secure API communication');
  }

  const timestamp = Date.now();
  const canonicalString = createCanonicalString(payload, timestamp);

  const signature = crypto
    .createHmac('sha256', secret)
    .update(canonicalString)
    .digest('hex');

  return `${timestamp}.${signature}`;
}

/**
 * Create headers for signed API request
 * SECURITY: Only uses HMAC signature, no service key in headers
 */
function createSignedHeaders(payload) {
  return {
    'Content-Type': 'application/json',
    'X-Signature': signRequest(payload),
    'X-Runner-ID': config.runnerId
    // NOTE: Service key removed - use HMAC signature only
  };
}

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
 * Defer a task to run later (e.g., during quiet hours)
 * Sets status to 'deferred' with a scheduled run time
 */
async function deferTask(taskId, reason) {
  try {
    // Calculate when to run next (after quiet hours end, or default 8 hours)
    const runAfter = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('task_queue')
      .update({
        status: 'deferred',
        run_after: runAfter,
        runner_id: null,
        claimed_at: null,
        error_message: `Deferred: ${reason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      logger.error('Failed to defer task:', { taskId, error });
    } else {
      logger.info('Task deferred:', { taskId, reason, runAfter });
    }
  } catch (err) {
    logger.error('Exception deferring task:', { taskId, err });
  }
}

/**
 * Release a claimed task back to pending state
 * Called when we fail to fetch details after claiming
 */
async function releaseTask(taskId, reason) {
  try {
    const { error } = await supabase
      .from('task_queue')
      .update({
        status: 'pending',
        runner_id: null,
        claimed_at: null,
        error_message: `Released: ${reason}`
      })
      .eq('id', taskId);

    if (error) {
      logger.error('Failed to release task:', { taskId, error });
    } else {
      logger.info('Task released back to queue:', { taskId, reason });
    }
  } catch (err) {
    logger.error('Exception releasing task:', { taskId, err });
  }
}

/**
 * Fetch full task details with all relations
 * If fetch fails, releases the task back to the queue
 */
async function fetchFullTaskDetails(taskId) {
  const { data: fullTask, error } = await supabase
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
    .eq('id', taskId)
    .single();

  if (error) {
    logger.error('Error fetching task details:', error);
    // Release the task so it can be claimed again
    await releaseTask(taskId, `Fetch failed: ${error.message}`);
    return null;
  }

  return fullTask;
}

/**
 * Claim a task from the queue using atomic RPC with FOR UPDATE SKIP LOCKED
 * This prevents race conditions when multiple runners are active
 *
 * SECURITY: No fallback to legacy RPC - prevents race condition where
 * two runners could claim the same task via different RPC signatures
 */
async function claimTask() {
  try {
    // Use atomic RPC to claim task - prevents race conditions
    const { data: tasks, error } = await supabase.rpc('claim_next_task', {
      p_runner_id: config.runnerId
    });

    if (error) {
      // SECURITY: No fallback - if RPC doesn't exist, fail cleanly
      // This prevents race conditions from multiple RPC versions
      if (error.message?.includes('function') || error.code === '42883') {
        logger.error('claim_next_task RPC not found. Please run database migrations.', {
          code: error.code,
          hint: 'Run: supabase db push or apply migration 20251222_critical_fixes.sql'
        });
      } else {
        logger.error('Error claiming task:', error);
      }
      return null;
    }

    if (!tasks || tasks.length === 0) {
      return null;
    }

    const task = tasks[0];

    // Fetch full task details using helper
    const taskId = task.id || task.task_id;
    logger.info('Task claimed:', { taskId });
    return await fetchFullTaskDetails(taskId);
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
    // Extract task details with NULL checks
    const target = task.campaign_targets;
    const campaign = task.campaigns;

    if (!target || !campaign) {
      logger.error('Task missing required relations', {
        taskId: task.id,
        hasTarget: !!target,
        hasCampaign: !!campaign
      });
      await markTaskFailed(task.id, 'Missing campaign_targets or campaigns relation', true);
      return;
    }

    const connection = target.connections;
    const template = campaign.message_templates;

    if (!connection) {
      logger.error('Target missing connection relation', {
        taskId: task.id,
        targetId: target.id
      });
      await markTaskFailed(task.id, 'Missing connection relation on target', true);
      return;
    }

    // Determine which message to use
    let message;

    // Priority 1: Use existing personalized_message if already generated
    if (target.personalized_message) {
      message = target.personalized_message;
      logger.info('Using existing personalized message');
    }
    // Priority 2: Use SuperDebate if enabled on campaign
    else if (campaign.superdebate_enabled) {
      logger.info('Generating SuperDebate message...');
      const superDebate = await generateSuperDebateMessage(connection, campaign, target.id);

      if (superDebate.success && superDebate.message) {
        message = superDebate.message;

        // Check if escalation is needed (high-value prospect)
        if (superDebate.meta?.shouldEscalate) {
          logger.info('High-value prospect detected, flagging for review', {
            reason: superDebate.meta.escalateReason,
            audienceType: superDebate.classification?.primary
          });
          // Optionally pause for manual approval
          // For now, just log it - could be enhanced to require approval
        }
      } else {
        // Fallback to template if SuperDebate fails
        logger.warn('SuperDebate failed, falling back to template');
        message = renderTemplate(template?.body || '', {
          first_name: connection.first_name,
          last_name: connection.last_name,
          company: connection.company,
          headline: connection.headline,
        });
      }
    }
    // Priority 3: Use basic template rendering
    else {
      message = renderTemplate(template?.body || '', {
        first_name: connection.first_name,
        last_name: connection.last_name,
        company: connection.company,
        headline: connection.headline,
      });
    }

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
      message: message,
      connectionName: connection.full_name
    });

    // Log each stage
    for (const log of result.logs) {
      await createSendLog(task.id, log);
    }

    // Upload screenshots to Supabase Storage
    const screenshotUrls = await uploadScreenshots(result.screenshots);

    if (result.success) {
      // ATOMIC: All post-send updates in one transaction
      // Prevents partial state if any update fails
      const { data: atomicResult, error: atomicError } = await supabase.rpc(
        'mark_task_success_atomic',
        {
          p_task_id: task.id,
          p_screenshot_url: screenshotUrls?.afterSend || null,
          p_sent_at: result.sentAt || new Date().toISOString()
        }
      );

      if (atomicError) {
        logger.error('Atomic task success failed:', atomicError);
        // Fall back to non-atomic if RPC doesn't exist yet
        if (atomicError.code === '42883') {
          logger.warn('mark_task_success_atomic RPC not found, using fallback');
          await markTaskSuccess(task.id, {
            sentAt: result.sentAt,
            screenshots: screenshotUrls,
            selectorVersion: result.selectorVersion
          });
          await updateConnectionLastMessaged(connection.id);
          await updateTargetSentAt(target.id);
          await incrementRateLimit(task.user_id);
        } else {
          throw new Error(`Atomic update failed: ${atomicError.message}`);
        }
      } else if (!atomicResult?.success) {
        logger.error('Atomic task success returned failure:', atomicResult?.error);
        throw new Error(`Atomic update failed: ${atomicResult?.error || 'Unknown error'}`);
      } else {
        logger.info('Task success recorded atomically', {
          taskId: task.id,
          targetId: atomicResult.target_id
        });
      }

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
  const { data: task, error: fetchError } = await supabase
    .from('task_queue')
    .select('attempt, max_retries')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) {
    logger.error('Failed to fetch task for retry check:', { taskId, fetchError });
    // Mark as failed without retry since we can't determine state
    await supabase
      .from('task_queue')
      .update({
        status: 'failed',
        last_error: errorMessage,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
    return;
  }

  const shouldRetry = !needsIntervention && (task.attempt || 0) < (task.max_retries || 3);

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

    // Build heartbeat data with all required columns
    const heartbeatData = {
      runner_id: config.runnerId,
      last_heartbeat: new Date().toISOString(),
      status: 'healthy',
      cpu_percent: (cpuUsage.user + cpuUsage.system) / 1000000,
      memory_percent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      memory_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      active_tasks: [],
      error_count: 0,
      version: metrics.version,
      metadata: metrics,
      metrics: {
        ...metrics,
        memory_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        cpu_usage: (cpuUsage.user + cpuUsage.system) / 1000000
      }
    }

    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from('runner_status')
      .upsert(heartbeatData, {
        onConflict: 'runner_id'
      });

    if (error) {
      logger.error('Error sending heartbeat:', error);

      // Try with minimal data if error occurs
      if (error) {
        logger.warn('Trying heartbeat with minimal data due to error');

        const minimalData = {
          runner_id: config.runnerId,
          last_heartbeat: new Date().toISOString(),
          status: 'healthy'
        };

        const { error: minimalError } = await supabase
          .from('runner_status')
          .upsert(minimalData, {
            onConflict: 'runner_id'
          });

        if (minimalError) {
          logger.error('Minimal heartbeat also failed:', minimalError);
        }
      }
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

  // Update LinkedIn account status with all columns
  const updateData = {
    status: 'disconnected',
    is_active: false,
    is_authenticated: false,
    last_check_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    last_used: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    runner_instance: config.runnerId
  };

  const { error } = await supabase
    .from('linkedin_sessions')
    .update(updateData)
    .eq('runner_id', config.runnerId)
    .or(`runner_instance.eq.${config.runnerId}`);

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
 * Calculate exponential backoff with jitter
 * Jitter prevents thundering herd when many tasks fail at once
 */
function calculateBackoff(attempt) {
  const delays = [
    10 * 60 * 1000,  // 10 minutes
    30 * 60 * 1000,  // 30 minutes
    2 * 60 * 60 * 1000,  // 2 hours
    24 * 60 * 60 * 1000  // 24 hours
  ];

  const baseDelay = delays[Math.min(attempt || 0, delays.length - 1)];
  // Add +/- 20% jitter to prevent thundering herd
  const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
  const delay = Math.round(baseDelay + jitter);

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
 * Update campaign target sent_at (critical for follow-up scheduling)
 */
async function updateTargetSentAt(targetId) {
  const { error } = await supabase
    .from('campaign_targets')
    .update({
      sent_at: new Date().toISOString(),
      status: 'sent',
      messaged_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', targetId);

  if (error) {
    logger.error('Error updating target sent_at:', error);
  }
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
 * Generate message using SuperDebate AI service
 */
async function generateSuperDebateMessage(connection, campaign, targetId) {
  try {
    const webappUrl = process.env.WEBAPP_URL || 'http://localhost:3000';

    const payload = {
      connectionId: connection.id,
      campaignId: campaign.id,
      profileData: {
        name: connection.full_name,
        headline: connection.headline,
        company: connection.company,
        title: connection.headline?.split(' at ')?.[0] || connection.headline,
        about: connection.about || '',
        location: connection.location,
        skills: connection.skills || [],
        linkedinUrl: connection.linkedin_url,
      }
    };

    const response = await axios.post(
      `${webappUrl}/api/superdebate/generate`,
      payload,
      {
        headers: createSignedHeaders(payload),
        timeout: 30000
      }
    );

    if (response.data?.success) {
      logger.info('SuperDebate message generated', {
        connectionId: connection.id,
        audienceType: response.data.classification?.primary,
        confidence: response.data.classification?.confidence,
        isUnique: response.data.message?.isUnique
      });

      return {
        success: true,
        message: response.data.message.full,
        classification: response.data.classification,
        meta: response.data.meta
      };
    }

    logger.warn('SuperDebate generation failed', { response: response.data });
    return { success: false, message: null };
  } catch (error) {
    logger.error('SuperDebate API error:', error.message);
    return { success: false, message: null, error: error.message };
  }
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