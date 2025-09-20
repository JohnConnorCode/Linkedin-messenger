# LinkedIn Messenger - Quick Start Guide

## 🚀 5-Minute Setup

### ✅ System Requirements Met
- Node.js 22.17.1 ✓
- Playwright with Chromium ✓
- Supabase configured ✓
- OpenAI API key added ✓

### 📋 Step-by-Step Guide

## 1️⃣ Start the Application

```bash
# If not already running
npm run dev
```

**Open browser**: http://localhost:8082

## 2️⃣ Create Your First Campaign

1. Click **"Campaigns"** → **"New Campaign"**
2. Fill in:
   - **Name**: "Test Campaign"
   - **Description**: "First AI-powered outreach"
   - **Template**:
   ```
   Hi {{firstName}},

   I noticed you work at {{company}} as {{position}}.

   {{ai_personalized_line}}

   Would love to connect and discuss mutual interests.

   Best,
   [Your Name]
   ```

3. **AI Settings**:
   - Enable AI Personalization ✓
   - Tone: Professional
   - Model: GPT-5 Nano (auto-selects GPT-3.5 until available)

4. **Rate Limits** (recommended for safety):
   - Messages per hour: 3
   - Messages per day: 15
   - Delay between messages: 120 seconds

5. Click **"Create Campaign"**

## 3️⃣ Import LinkedIn Connections

1. **Export from LinkedIn**:
   - Go to LinkedIn.com → Settings → Data Privacy
   - Download "Connections" as CSV

2. **Import to App**:
   - Click **"Connections"** → **"Import CSV"**
   - Upload your connections file
   - Map columns:
     - First Name → firstName
     - Last Name → lastName
     - Company → company
     - Position → position
     - Email → email (optional)

3. **Add to Campaign**:
   - Go to your campaign
   - Click **"Add Targets"**
   - Select connections
   - Click **"Add Selected"**

## 4️⃣ Start the LinkedIn Runner

Open a new terminal:

```bash
cd runner
node run-local.js
```

**What happens**:
1. Chrome browser opens
2. LinkedIn login page appears
3. **YOU MUST**: Log in manually with your credentials
4. Session saves automatically
5. Keep browser window open

## 5️⃣ Launch Your Campaign

1. Go back to the app (http://localhost:8082)
2. Open your campaign
3. Click **"Review & Approve"** to check messages
4. Click **"Start Campaign"**

**Watch it work**:
- Messages send automatically
- See real-time progress in dashboard
- Screenshots captured for each message
- AI personalizes each message uniquely

## 📊 Monitor Progress

### Dashboard Views
- **Queue**: See pending/sent messages
- **Logs**: View detailed activity
- **Analytics**: Track success rates
- **Screenshots**: Verify sent messages

### Status Indicators
- 🟢 **Active**: Campaign running
- 🟡 **Paused**: Temporarily stopped
- 🔴 **Stopped**: Campaign ended
- ⏳ **Rate Limited**: Waiting for next window

## 🛡️ Safety Tips

1. **Start Small**: Test with 5-10 connections first
2. **Use Conservative Limits**: 3-5 messages/hour maximum
3. **Monitor Account**: Check LinkedIn for warnings
4. **Natural Timing**: Run during business hours only
5. **Personalize**: Let AI create unique messages

## ⚡ Commands Cheat Sheet

```bash
# Start app
npm run dev

# Start runner (with UI)
cd runner && node run-local.js

# Start runner (headless/production)
cd runner && HEADLESS_MODE=true node index-production.js

# Test system
node test-complete-system.js

# Check production readiness
node production-check.js

# View logs
tail -f runner/logs/linkedin-runner.log

# PM2 production mode
npm run pm2:start  # Start all services
npm run pm2:status # Check status
npm run pm2:logs   # View logs
npm run pm2:stop   # Stop all
```

## 🔧 Troubleshooting

### "Browser won't open"
```bash
cd runner
npx playwright install chromium --with-deps
```

### "OpenAI error"
- Check API key in `.env.local`
- Verify billing is active at platform.openai.com

### "Database error"
```bash
node production-check.js
# Should show all green checkmarks
```

### "LinkedIn detected automation"
- Stop campaign immediately
- Wait 24-48 hours
- Reduce rate limits by 50%
- Increase delays to 180+ seconds

## 📈 Best Practices

### Message Templates
- Keep under 300 characters
- Use 2-3 variables maximum
- Always include {{ai_personalized_line}}
- Avoid spam trigger words

### Timing
- **Best hours**: 9 AM - 5 PM recipient timezone
- **Best days**: Tuesday - Thursday
- **Avoid**: Weekends and holidays

### AI Personalization
- **Professional tone**: B2B outreach
- **Friendly tone**: Networking
- **Casual tone**: Creative industries

### Campaign Size
- **Test**: 5-10 connections
- **Small**: 25-50 connections
- **Medium**: 100-200 connections
- **Large**: 500+ (use with caution)

## ✅ Success Checklist

Before launching campaign:
- [ ] OpenAI API key configured
- [ ] LinkedIn account logged in via runner
- [ ] Campaign created with template
- [ ] Connections imported and added
- [ ] Messages reviewed and approved
- [ ] Rate limits set conservatively
- [ ] Runner started and connected

## 🎯 Next Steps

1. **Create Templates Library**: Save successful templates
2. **A/B Testing**: Try different messages
3. **Analytics Review**: Optimize based on data
4. **Scale Gradually**: Increase volume slowly
5. **Team Training**: Share best practices

## 💡 Pro Tips

1. **Session Persistence**: Login once, lasts weeks
2. **Bulk Operations**: Select multiple connections with checkboxes
3. **Quick Pause**: Hit "Pause" if you see issues
4. **Export Data**: Download campaign results as CSV
5. **AI Memory**: GPT-5 Nano learns from your style

## 🚨 Emergency Stop

If something goes wrong:

```bash
# Stop everything immediately
npm run pm2:stop

# Or manually
pkill -f "node.*runner"
pkill -f "npm run dev"
```

---

**Ready to start?** Follow steps 1-5 above. Your first campaign will be running in 5 minutes!

**Need help?** Check `/help` in the app or run `node production-check.js` for diagnostics.