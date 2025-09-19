# LinkedIn Messenger Automation Platform

A production-grade, extensible web application for automated LinkedIn messaging with human-like behavior, built with Next.js, Supabase, and Playwright.

🚀 **Live Demo**: https://linkedin-messenger.vercel.app

## ⚠️ Important Disclaimer

**WARNING:** This tool automates LinkedIn interactions, which may violate LinkedIn's Terms of Service. Using this tool could result in:
- Account restrictions or permanent bans
- Loss of LinkedIn access
- Legal action from LinkedIn

This project is for **educational purposes only**. Use at your own risk. Always respect LinkedIn's terms of service and rate limits.

## 🎯 Features

- **Secure Authentication**: Magic link authentication via Supabase
- **Connection Management**: Import and manage LinkedIn 1st-degree connections
- **Smart Templating**: Create reusable message templates with variables and conditionals
- **Campaign Management**: Create targeted campaigns with filters and rate limits
- **Human-like Behavior**: Random delays, mouse movements, and typing patterns
- **Safety Controls**: Rate limiting, quiet hours, and manual approval workflows
- **Persistent Sessions**: Maintain LinkedIn login across runner restarts
- **Real-time Monitoring**: Track campaign progress with logs and screenshots
- **Extensible Architecture**: Separate runner service for scalability

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│   Supabase   │◀────│ Playwright      │
│   (Vercel)      │     │   (Database) │     │ Runner          │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

### Components

- **Next.js App**: Modern React UI with App Router, server actions, and RSC
- **Supabase**: PostgreSQL database with RLS, authentication, and real-time subscriptions
- **Playwright Runner**: Headful Chrome automation with persistent sessions
- **Queue System**: PostgreSQL-based task queue with atomic claiming

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL (via Supabase)
- Docker (optional, for runner deployment)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/linkedin-messenger.git
cd linkedin-messenger
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations:

```bash
# Copy the migration file content from supabase/migrations/001_initial_schema.sql
# Paste and run in Supabase SQL Editor
```

3. Enable Email Auth in Supabase Dashboard
4. Configure Storage buckets:
   - Create bucket: `screenshots`
   - Create bucket: `sessions`

### 3. Configure Environment Variables

```bash
# Copy example env file
cp .env.local.example .env.local

# Edit .env.local with your values:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RUNNER_SHARED_SECRET=generate_secure_random_string
```

### 4. Install Dependencies and Run

```bash
# Install web app dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000

### 5. Set Up the Runner

```bash
cd runner
npm install

# Copy and configure runner env
cp .env.example .env

# Generate a runner token (you'll need to implement this endpoint or use the secret directly)
# Edit .env with your configuration

# Start the runner
npm start
```

## 🐳 Docker Deployment

### Runner with Docker

```bash
# Build and run the runner
docker-compose up -d

# View logs
docker-compose logs -f runner

# Access runner session (for manual LinkedIn login)
docker exec -it linkedin-runner /bin/bash
```

### Production Deployment

#### Web App (Vercel)

1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy

#### Runner (Fly.io/Railway/VPS)

```bash
# Deploy runner to Fly.io
fly launch
fly secrets set RUNNER_TOKEN=your_token API_BASE_URL=https://your-app.vercel.app/api/runner
fly deploy
```

## 📖 Usage Guide

### Initial Setup

1. **Sign Up/Login**: Use magic link authentication
2. **Connect LinkedIn**:
   - Start the runner
   - Navigate to /run in the UI
   - Follow instructions to log into LinkedIn in the runner browser
3. **Import Connections**:
   - Export connections from LinkedIn as CSV
   - Import via the Connections page

### Creating a Campaign

1. **Create Template**:
   - Go to Templates → New Template
   - Use variables like `{{first_name}}`, `{{company}}`
   - Preview with test data

2. **Setup Campaign**:
   - Go to Campaigns → New Campaign
   - Select template
   - Set filters (company, tags, etc.)
   - Configure rate limits
   - Choose approval mode

3. **Launch Campaign**:
   - Review targets
   - Approve messages (if manual approval enabled)
   - Start campaign

### Safety Features

- **Rate Limits**:
  - Default: 8/hour, 80/day
  - Minimum 90 seconds between messages
  - Configurable per campaign

- **Quiet Hours**:
  - Default: 10 PM - 7 AM
  - Timezone-aware
  - Prevents late-night sending

- **Human Behavior**:
  - Random typing speed (30-100ms/char)
  - Mouse movements and scrolling
  - Variable delays (1-5 seconds)
  - Occasional pauses

## 🔧 Configuration

### Global Settings

Edit in `/settings` page:

```javascript
{
  "global_daily_cap": 80,
  "global_hourly_cap": 8,
  "min_between_messages_ms": 90000,
  "humanize": true
}
```

### Campaign Settings

Per-campaign controls:

```javascript
{
  "daily_cap": 25,
  "hourly_cap": 5,
  "jitter_ms": 5000,      // Random delay 0-5000ms
  "dwell_ms": 3000,       // Pause on page
  "require_manual_approval": true
}
```

## 🔒 Security

- All user data isolated via Row Level Security (RLS)
- Runner authentication via signed JWTs
- Encrypted session storage
- No password storage - only OAuth/magic links

## 🧪 Testing

```bash
# Run tests
npm test

# E2E tests with Playwright
npm run test:e2e

# Test template rendering
npm run test:templates
```

## 📊 Monitoring

- **Logs**: Check runner logs at `runner/runner.log`
- **Screenshots**: Stored in Supabase Storage
- **Metrics**: View in Analytics dashboard
- **Health Check**: `/api/runner/heartbeat` endpoint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## ⚖️ License

MIT License - See LICENSE file

## 🚨 Legal Notice

This software is provided "as is" without warranty of any kind. The authors are not responsible for any consequences of using this software. Users must comply with LinkedIn's Terms of Service and all applicable laws.

## 📞 Support

- GitHub Issues: [Report bugs](https://github.com/yourusername/linkedin-messenger/issues)
- Documentation: [Full docs](https://docs.yoursite.com)

## 🗺️ Roadmap

- [ ] Multi-account support
- [ ] A/B testing for templates
- [ ] Advanced analytics
- [ ] Webhook integrations
- [ ] AI-powered message personalization
- [ ] Chrome extension for easier setup

## 🙏 Acknowledgments

- Built with Next.js, Supabase, and Playwright
- UI components from shadcn/ui
- Icons from Lucide

---

**Remember**: Use automation responsibly. Respect people's time and LinkedIn's platform.