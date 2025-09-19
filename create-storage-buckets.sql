-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create buckets table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    owner UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    public BOOLEAN DEFAULT false,
    avif_autodetection BOOLEAN DEFAULT false,
    file_size_limit BIGINT,
    allowed_mime_types TEXT[]
);

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('screenshots', 'screenshots', false, 52428800, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']),
    ('sessions', 'sessions', false, 10485760, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

-- Create objects table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_id TEXT REFERENCES storage.buckets(id),
    name TEXT,
    owner UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    path_tokens TEXT[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    UNIQUE(bucket_id, name)
);

-- Create indexes for storage
CREATE INDEX IF NOT EXISTS idx_objects_bucket_id_name ON storage.objects(bucket_id, name);
CREATE INDEX IF NOT EXISTS buckets_owner_idx ON storage.buckets(owner);
CREATE INDEX IF NOT EXISTS objects_owner_idx ON storage.objects(owner);

-- Create RLS policies for storage buckets
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for screenshots bucket
CREATE POLICY "Users can upload their own screenshots" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'screenshots' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view their own screenshots" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'screenshots' AND
        owner = auth.uid()
    );

CREATE POLICY "Users can delete their own screenshots" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'screenshots' AND
        owner = auth.uid()
    );

-- Policy for sessions bucket
CREATE POLICY "Users can upload their own sessions" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'sessions' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view their own sessions" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'sessions' AND
        owner = auth.uid()
    );

CREATE POLICY "Users can delete their own sessions" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'sessions' AND
        owner = auth.uid()
    );

-- Verify buckets were created
SELECT id, name, public FROM storage.buckets WHERE id IN ('screenshots', 'sessions');