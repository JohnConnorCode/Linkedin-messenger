# LinkedIn Messenger Setup Instructions

## Current Status
The application is running locally on port 3003. The Supabase database needs to be set up with the required tables and configurations.

## Immediate Setup Required

### 1. Database Setup
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gpuvqonjpdjxehihpuke
2. Navigate to the SQL Editor
3. Open the file `setup-database.sql` in this repository
4. Copy the entire contents and paste into the SQL editor
5. Click "Run" to execute the migration

### 2. Storage Buckets Setup
In the Supabase Dashboard:
1. Go to Storage section
2. Create a new bucket called `screenshots` (private)
3. Create a new bucket called `sessions` (private)

### 3. Authentication Setup
In the Supabase Dashboard:
1. Go to Authentication > Providers
2. Enable Email provider with Magic Link
3. Configure the email templates as needed

### 4. Get Service Role Key
1. Go to Settings > API in Supabase Dashboard
2. Copy the `service_role` key (different from anon key)
3. Update `.env.local` with: `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here`

## Testing the Application

### Local Testing
The app is currently running at http://localhost:3003

1. **Test Authentication:**
   - Go to http://localhost:3003
   - You should be redirected to /login
   - Enter your email for magic link authentication
   - Check your email and click the link

2. **Test Health Endpoint:**
   ```bash
   curl http://localhost:3003/api/health
   ```
   Should return health status (will be "healthy" after database setup)

3. **Test Runner Endpoints:**
   These require proper authentication tokens configured in the runner

## Application Features

### Completed Features
- ✅ Authentication with Supabase (magic links)
- ✅ Dashboard with metrics and overview
- ✅ Connections management (import, view, search, filter)
- ✅ Message templates with variables
- ✅ Campaign creation wizard
- ✅ Manual approval queue for messages
- ✅ Task queue system for message sending
- ✅ Runner API for automated sending
- ✅ Rate limiting (hourly and daily caps)
- ✅ Health monitoring endpoint
- ✅ Form validation and error handling
- ✅ Loading states and skeletons

### Pending Features
- ⏳ Real-time updates with Supabase subscriptions
- ⏳ CSV export for campaigns
- ⏳ Dark mode toggle
- ⏳ Comprehensive error boundaries
- ⏳ Onboarding flow for new users
- ⏳ Unit tests

## Runner Setup (After Database Setup)

1. Navigate to the runner directory:
   ```bash
   cd runner
   npm install
   ```

2. Create runner `.env` file:
   ```
   API_BASE_URL=http://localhost:3003
   RUNNER_ID=runner-1
   SHARED_SECRET=dev_secret_key_123
   SUPABASE_URL=https://gpuvqonjpdjxehihpuke.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Run the runner:
   ```bash
   npm start
   ```

## Important Notes

- The application uses Row Level Security (RLS) - users can only see their own data
- Rate limiting is enforced at both application and database levels
- The runner implements human-like behavior patterns for safety
- All messages require manual approval before sending (configurable)
- LinkedIn sessions are persistent and reused across campaigns

## Troubleshooting

### Database Tables Not Found
Run the `setup-database.sql` migration in Supabase SQL Editor

### Authentication Not Working
1. Check Email provider is enabled in Supabase
2. Verify environment variables are correct
3. Check Supabase Dashboard for auth logs

### Health Check Shows "Degraded"
This is expected until:
1. Database tables are created
2. Storage buckets are configured
3. Service role key is added

## Next Steps

1. Complete database setup (run migration)
2. Configure storage buckets
3. Add service role key to environment
4. Test authentication flow
5. Import some test connections
6. Create a test campaign
7. Test the approval queue
8. Set up and test the runner