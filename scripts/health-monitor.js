#!/usr/bin/env node

// Health monitoring service
const fetch = require('node-fetch');

const HEALTH_CHECK_INTERVAL = process.env.HEALTH_CHECK_INTERVAL || 60000;
const ALERT_THRESHOLD = process.env.ALERT_THRESHOLD || 3;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

let failureCount = 0;

async function checkHealth() {
  try {
    const response = await fetch(`${APP_URL}/api/health`, {
      timeout: 10000
    });

    const data = await response.json();

    if (data.status === 'healthy') {
      if (failureCount > 0) {
        console.log(`✅ Service recovered after ${failureCount} failures`);
      }
      failureCount = 0;
      console.log(`Health check passed: ${JSON.stringify(data.metrics)}`);
    } else if (data.status === 'degraded') {
      console.warn(`⚠️ Service degraded: ${JSON.stringify(data.checks)}`);
    } else {
      throw new Error(`Unhealthy status: ${data.status}`);
    }
  } catch (error) {
    failureCount++;
    console.error(`❌ Health check failed (${failureCount}/${ALERT_THRESHOLD}): ${error.message}`);

    if (failureCount >= ALERT_THRESHOLD) {
      await sendAlert(error);
    }
  }
}

async function sendAlert(error) {
  console.error('🚨 CRITICAL: Service health check failed multiple times!');
  console.error('Error details:', error);

  // In production, send email/Slack/PagerDuty alert here
  if (process.env.ALERT_EMAIL) {
    console.log(`Alert would be sent to: ${process.env.ALERT_EMAIL}`);
  }

  // Reset counter after alerting
  failureCount = 0;
}

// Check runner health
async function checkRunnerHealth() {
  try {
    const runnerUrl = process.env.RUNNER_URL || 'http://localhost:3001';
    const response = await fetch(`${runnerUrl}/health`, {
      timeout: 5000
    });

    if (!response.ok) {
      console.error(`Runner health check failed: ${response.status}`);
    } else {
      console.log('Runner health check passed');
    }
  } catch (error) {
    console.error(`Runner health check error: ${error.message}`);
  }
}

// Monitor system resources
function checkSystemResources() {
  const usage = process.memoryUsage();
  const heapUsed = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(usage.heapTotal / 1024 / 1024);
  const percentage = Math.round((heapUsed / heapTotal) * 100);

  console.log(`Memory: ${heapUsed}MB / ${heapTotal}MB (${percentage}%)`);

  if (percentage > 90) {
    console.error('⚠️ Critical memory usage detected!');
  }
}

console.log('🏥 Health Monitor started');
console.log(`Checking health every ${HEALTH_CHECK_INTERVAL}ms`);
console.log(`Alert threshold: ${ALERT_THRESHOLD} consecutive failures`);

// Initial check
checkHealth();
checkRunnerHealth();
checkSystemResources();

// Schedule periodic checks
setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
setInterval(checkRunnerHealth, HEALTH_CHECK_INTERVAL * 2);
setInterval(checkSystemResources, HEALTH_CHECK_INTERVAL * 5);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Health monitor shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Health monitor shutting down...');
  process.exit(0);
});