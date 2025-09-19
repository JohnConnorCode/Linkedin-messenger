-- LinkedIn Messenger Database Setup
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company TEXT,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    linkedin_url TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    headline TEXT,
    company TEXT,
    location TEXT,
    connection_degree TEXT,
    is_connected BOOLEAN DEFAULT false,
    connected_at TIMESTAMP WITH TIME ZONE,
    last_contacted TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, linkedin_url)
);

-- Create message templates table
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    variables TEXT[],
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_id UUID NOT NULL REFERENCES public.message_templates(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    daily_cap INT DEFAULT 25,
    hourly_cap INT DEFAULT 5,
    total_cap INT,
    sent_count INT DEFAULT 0,
    response_count INT DEFAULT 0,
    click_count INT DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign targets table
CREATE TABLE IF NOT EXISTS public.campaign_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'responded')),
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    personalized_body TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, connection_id)
);

-- Create task queue table
CREATE TABLE IF NOT EXISTS public.task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.campaign_targets(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    runner_id TEXT,
    claimed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    priority INT DEFAULT 0,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign stats table
CREATE TABLE IF NOT EXISTS public.campaign_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    response_count INT DEFAULT 0,
    click_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, date)
);

-- Create runner status table
CREATE TABLE IF NOT EXISTS public.runner_status (
    runner_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'idle',
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_task_id UUID REFERENCES public.task_queue(id),
    tasks_completed INT DEFAULT 0,
    tasks_failed INT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create runner config table
CREATE TABLE IF NOT EXISTS public.runner_config (
    runner_id TEXT PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create LinkedIn sessions table
CREATE TABLE IF NOT EXISTS public.linkedin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    runner_id TEXT,
    cookies TEXT,
    local_storage TEXT,
    user_agent TEXT,
    viewport JSONB,
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rate limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_duration INTERVAL NOT NULL,
    count INT DEFAULT 0,
    max_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, action_type, window_start)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON public.connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_linkedin_url ON public.connections(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign_id ON public.campaign_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_status ON public.campaign_targets(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON public.task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_campaign_id ON public.task_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_sessions_user_id ON public.linkedin_sessions(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name = 'updated_at'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at()', t, t);
    END LOOP;
END $$;

-- Create function for claiming tasks atomically
CREATE OR REPLACE FUNCTION public.claim_next_task(p_runner_id TEXT)
RETURNS TABLE(task_id UUID, campaign_id UUID, target_id UUID) AS $$
DECLARE
    v_task_id UUID;
    v_campaign_id UUID;
    v_target_id UUID;
BEGIN
    -- Select and lock the next available task
    SELECT t.id, t.campaign_id, t.target_id
    INTO v_task_id, v_campaign_id, v_target_id
    FROM public.task_queue t
    JOIN public.campaigns c ON t.campaign_id = c.id
    WHERE t.status = 'queued'
    AND c.status = 'active'
    ORDER BY t.priority DESC, t.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- If a task was found, update its status
    IF v_task_id IS NOT NULL THEN
        UPDATE public.task_queue
        SET status = 'processing',
            runner_id = p_runner_id,
            claimed_at = NOW()
        WHERE id = v_task_id;

        -- Update runner status
        UPDATE public.runner_status
        SET current_task_id = v_task_id,
            status = 'processing',
            last_heartbeat = NOW()
        WHERE runner_id = p_runner_id;

        RETURN QUERY SELECT v_task_id, v_campaign_id, v_target_id;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create function for rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_action_type TEXT,
    p_window_duration INTERVAL,
    p_max_count INT
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INT;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    v_window_start := date_trunc('hour', NOW());

    -- Get or create rate limit record
    INSERT INTO public.rate_limits (user_id, action_type, window_start, window_duration, count, max_count)
    VALUES (p_user_id, p_action_type, v_window_start, p_window_duration, 0, p_max_count)
    ON CONFLICT (user_id, action_type, window_start)
    DO NOTHING;

    -- Check current count
    SELECT count INTO v_count
    FROM public.rate_limits
    WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start = v_window_start;

    -- If under limit, increment and return true
    IF v_count < p_max_count THEN
        UPDATE public.rate_limits
        SET count = count + 1
        WHERE user_id = p_user_id
        AND action_type = p_action_type
        AND window_start = v_window_start;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Connections policies
CREATE POLICY "Users can view own connections" ON public.connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON public.connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON public.connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON public.connections
    FOR DELETE USING (auth.uid() = user_id);

-- Message templates policies
CREATE POLICY "Users can view own templates" ON public.message_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON public.message_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.message_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.message_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Campaigns policies
CREATE POLICY "Users can view own campaigns" ON public.campaigns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns" ON public.campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" ON public.campaigns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns" ON public.campaigns
    FOR DELETE USING (auth.uid() = user_id);

-- Campaign targets policies
CREATE POLICY "Users can view own campaign targets" ON public.campaign_targets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = campaign_targets.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own campaign targets" ON public.campaign_targets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = campaign_targets.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Task queue policies
CREATE POLICY "Users can view own tasks" ON public.task_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = task_queue.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Campaign stats policies
CREATE POLICY "Users can view own campaign stats" ON public.campaign_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE campaigns.id = campaign_stats.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- LinkedIn sessions policies
CREATE POLICY "Users can view own sessions" ON public.linkedin_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON public.linkedin_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Rate limits policies
CREATE POLICY "Users can view own rate limits" ON public.rate_limits
    FOR SELECT USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets (run in Supabase Dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('sessions', 'sessions', false);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create storage buckets "screenshots" and "sessions" in Supabase Dashboard';
    RAISE NOTICE '2. Configure authentication providers in Supabase Dashboard';
    RAISE NOTICE '3. Update environment variables in your application';
END $$;