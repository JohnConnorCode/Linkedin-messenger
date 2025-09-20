# LinkedIn Messenger - Quick Start Guide

## Current Status ✅
- **Web App**: Deployed to Vercel at your-app.vercel.app
- **Database**: Connected to Supabase (tables created, ready to use)
- **Runner**: Ready to run locally on your computer

## How to Use This App

### Step 1: Create Campaigns (Web UI)
1. Go to your Vercel app
2. Create a campaign with:
   - Name and message template
   - Upload CSV of LinkedIn profile URLs
   - Set daily limits (e.g., 20 messages/day)

### Step 2: Run the Automation (Local)
```bash
# Navigate to runner directory
cd runner

# Run the automation
node run-local.js
```

**First time running?**
- The browser will open LinkedIn
- Log in manually (one time only)
- Your session will be saved for next time

### Step 3: Monitor Progress
- Go back to your web app
- View sent messages, responses, and analytics
- The runner uploads screenshots as proof of sending

## How It Works

1. **Web App (Vercel)** = Control Center
   - Create campaigns
   - Upload contact lists
   - View results
   - Manage templates

2. **Runner (Your Computer)** = The Worker
   - Opens Chrome with your LinkedIn
   - Fetches tasks from database
   - Sends messages with human-like delays
   - Takes screenshots
   - Updates database with results

## Safety Features Built In

- ⏱️ **Rate Limiting**: 3-7 minute delays between messages
- 🕐 **Quiet Hours**: No messages outside 9 AM - 5 PM (recipient's timezone)
- 📸 **Screenshot Proof**: Every message is documented
- 🔒 **Session Persistence**: Uses your real LinkedIn account
- 🚫 **Duplicate Prevention**: Never messages same person twice

## Simple Commands

```bash
# Run the automation
cd runner
node run-local.js

# Stop anytime
Press Ctrl+C

# Check logs
cat linkedin-runner.log
```

## Why Local Instead of Cloud?

LinkedIn blocks cloud servers (AWS, Vercel, etc.) because:
- They recognize datacenter IPs
- Cloud browsers look suspicious
- No consistent "device fingerprint"

Running locally means:
- Uses your home IP (looks normal)
- Real browser with your cookies
- LinkedIn sees you as a regular user
- Much less likely to get flagged

## Next Steps

1. **Test with Small Campaign**
   - Create campaign with 5 targets
   - Run locally
   - Verify messages sent

2. **Scale Gradually**
   - Start with 10-20 messages/day
   - Increase slowly over weeks
   - Monitor for any LinkedIn warnings

3. **Optional: Move to VPS Later**
   - Once comfortable, can run on a $5/month VPS
   - Gives 24/7 operation without your laptop
   - Same local-style operation, just remote

## Troubleshooting

**"Not logged in" every time?**
- Cookies aren't saving properly
- Check `linkedin-sessions/` folder exists

**Messages not sending?**
- LinkedIn may have updated their UI
- Check `linkedin-runner.log` for errors
- May need selector updates

**Database connection failed?**
- Check `.env` file has correct Supabase credentials
- Verify internet connection

## That's It! 🎉

You have a working LinkedIn automation system:
- Professional web interface
- Safe, local automation
- Built-in safety features
- Ready to use now

Just run `node run-local.js` and watch it work!