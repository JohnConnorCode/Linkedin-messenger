module.exports = {
  apps: [
    {
      // Next.js Application
      name: 'linkedin-messenger-web',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_file: './logs/web-combined.log',
      time: true,
      // Auto-restart on failure
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      // LinkedIn Runner Service
      name: 'linkedin-runner',
      script: './runner/index-production.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        HEADLESS_MODE: 'true'
      },
      error_file: './logs/runner-error.log',
      out_file: './logs/runner-out.log',
      log_file: './logs/runner-combined.log',
      time: true,
      // Auto-restart with exponential backoff
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s',
      restart_delay: 4000,
      // Cron restart daily at 3 AM to clear memory
      cron_restart: '0 3 * * *'
    },
    {
      // AI Processor Worker
      name: 'ai-processor',
      script: './scripts/start-ai-processor.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/ai-error.log',
      out_file: './logs/ai-out.log',
      log_file: './logs/ai-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      // Health Monitor
      name: 'health-monitor',
      script: './scripts/health-monitor.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        HEALTH_CHECK_INTERVAL: 60000, // 1 minute
        ALERT_THRESHOLD: 3 // Alert after 3 consecutive failures
      },
      error_file: './logs/monitor-error.log',
      out_file: './logs/monitor-out.log',
      time: true,
      autorestart: true
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/linkedin-messenger.git',
      path: '/var/www/linkedin-messenger',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    },
    staging: {
      user: 'deploy',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/linkedin-messenger.git',
      path: '/var/www/linkedin-messenger-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};