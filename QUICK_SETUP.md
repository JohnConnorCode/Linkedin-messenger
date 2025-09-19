# 🚀 Quick Setup - LinkedIn Messenger

## Step 1: Run Database Migration (2 minutes)

1. **Open Supabase Dashboard:**
   https://supabase.com/dashboard/project/gpuvqonjpdjxehihpuke/sql/new

2. **Copy & Paste:**
   - Open the file `setup-database.sql` in this folder
   - Copy ALL contents (Cmd+A, Cmd+C)
   - Paste into the SQL Editor
   - Click the green "Run" button

3. **Expected Result:**
   - You should see "Success. No rows returned"
   - This creates all tables, indexes, and security policies

## Step 2: Create Storage Buckets (1 minute)

1. **Go to Storage:**
   https://supabase.com/dashboard/project/gpuvqonjpdjxehihpuke/storage/buckets

2. **Create Two Buckets:**
   - Click "New bucket"
   - Name: `screenshots`, Public: OFF ❌
   - Click "Create"
   - Click "New bucket" again
   - Name: `sessions`, Public: OFF ❌
   - Click "Create"

## Step 3: Get Service Role Key (Optional, for full features)

1. **Go to API Settings:**
   https://supabase.com/dashboard/project/gpuvqonjpdjxehihpuke/settings/api

2. **Copy the service_role key** (NOT the anon key)
   - It starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Update .env.local:**
   - Replace `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here`
   - With your actual service role key

## Step 4: Test the Application

The app is already running at http://localhost:3003

1. **Sign Up:**
   - Go to http://localhost:3003
   - Enter your email
   - Check email for magic link
   - Click the link to login

2. **Verify Setup:**
   ```bash
   node test-supabase.js
   ```
   Should show all tables exist ✅

## That's It! 🎉

The application is now fully configured and ready to use.

### Next Steps:
- Import some LinkedIn connections (CSV)
- Create a message template
- Start a campaign
- Test the approval queue

### Need Help?
- Check SETUP_INSTRUCTIONS.md for detailed information
- Review the specification document for feature details