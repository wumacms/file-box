-- Supabase Database Schema Backup
-- Project: image-box (aemvcnjagnfrtpcuphzo)
-- Generated: 2026-04-28

-- ==========================================
-- 1. Tables
-- ==========================================

-- Table: public.images
-- Stores metadata for uploaded images
CREATE TABLE IF NOT EXISTS public.images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    path text NOT NULL,
    url text NOT NULL,
    size bigint,
    type text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: public.oss_configs
-- Stores Aliyun OSS bucket configurations for users
CREATE TABLE IF NOT EXISTS public.oss_configs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    bucket text NOT NULL,
    region text NOT NULL,
    access_key text NOT NULL,
    secret_key text NOT NULL,
    endpoint text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 2. Security (RLS)
-- ==========================================

-- Enable Row Level Security
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oss_configs ENABLE ROW LEVEL SECURITY;

-- Policies for public.images
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'images' AND policyname = 'Users can only see their own images') THEN
        CREATE POLICY "Users can only see their own images" ON public.images
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policies for public.oss_configs
DO $$ 
BEGIN
    -- Select policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oss_configs' AND policyname = 'Users can view their own oss_configs') THEN
        CREATE POLICY "Users can view their own oss_configs" ON public.oss_configs
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Insert policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oss_configs' AND policyname = 'Users can insert their own oss_configs') THEN
        CREATE POLICY "Users can insert their own oss_configs" ON public.oss_configs
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Update policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oss_configs' AND policyname = 'Users can update their own oss_configs') THEN
        CREATE POLICY "Users can update their own oss_configs" ON public.oss_configs
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Delete policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'oss_configs' AND policyname = 'Users can delete their own oss_configs') THEN
        CREATE POLICY "Users can delete their own oss_configs" ON public.oss_configs
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ==========================================
-- 3. Comments
-- ==========================================

COMMENT ON TABLE public.images IS 'Stores metadata for uploaded images';
COMMENT ON TABLE public.oss_configs IS 'Stores Aliyun OSS bucket configurations for users';
