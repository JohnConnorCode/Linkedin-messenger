# Production Dockerfile for LinkedIn Runner with Playwright
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

# Install additional dependencies for headful browser and VNC
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    fluxbox \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /home/pwuser/linkedin-sessions \
             /app/screenshots \
             /app/logs \
    && chown -R pwuser:pwuser /home/pwuser/linkedin-sessions \
                               /app/screenshots \
                               /app/logs

# Copy supervisor configuration
RUN echo "[supervisord]\n\
nodaemon=true\n\
[program:xvfb]\n\
command=/usr/bin/Xvfb :99 -screen 0 1920x1080x24\n\
autorestart=true\n\
[program:x11vnc]\n\
command=/usr/bin/x11vnc -display :99 -forever -shared -nopw\n\
autorestart=true\n\
[program:fluxbox]\n\
command=/usr/bin/fluxbox\n\
autorestart=true\n\
environment=DISPLAY=\":99\"\n\
[program:runner]\n\
command=node index-production.js\n\
autorestart=true\n\
environment=DISPLAY=\":99\"" > /etc/supervisor/conf.d/supervisord.conf

# Switch to non-root user
USER pwuser

# Environment variables for production
ENV NODE_ENV=production \
    USER_DATA_DIR=/home/pwuser/linkedin-sessions \
    SCREENSHOT_DIR=/app/screenshots \
    LOG_DIR=/app/logs \
    DISPLAY=:99 \
    RUNNER_ID=docker-runner \
    POLL_INTERVAL_MS=10000 \
    MAX_CONCURRENT_TASKS=1 \
    USER_TIMEZONE=America/New_York

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Volume mounts for persistent data
VOLUME ["/home/pwuser/linkedin-sessions", "/app/screenshots", "/app/logs"]

# Expose VNC port for manual login assistance
EXPOSE 5900

# Expose health check port
EXPOSE 3001

# Start supervisor to manage all processes
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]