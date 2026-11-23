-- ==============================================================================
-- SIDDHARTH GIRASE PORTFOLIO — SUPABASE PRODUCTION DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================
-- Authorized Owner: Siddharth Girase (girasejitendra249@gmail.com)
-- This SQL script sets up the PostgreSQL tables, Row Level Security (RLS),
-- storage buckets, and audit log tracking for production deployment.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    duration TEXT,
    client TEXT,
    year TEXT,
    aspect_ratio TEXT DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '9:16', '1:1')),
    published BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SHOWREEL TABLE
CREATE TABLE IF NOT EXISTS public.showreel (
    id TEXT PRIMARY KEY DEFAULT 'current_showreel',
    title TEXT NOT NULL DEFAULT 'Cinematic Showreel',
    video_url TEXT NOT NULL,
    poster_url TEXT,
    published BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SECURITY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    user_email TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) ACTIVATION
-- ==============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showreel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLICIES FOR 'projects' TABLE
-- ==============================================================================

-- Public Visitors: Allow read-only access ONLY to PUBLISHED projects
DROP POLICY IF EXISTS "Public can view published projects" ON public.projects;
CREATE POLICY "Public can view published projects"
    ON public.projects
    FOR SELECT
    USING (published = true);

-- Authorized Owner: Full read/write access to ALL projects (including drafts)
-- STRICT CHECK: Only girasejitendra249@gmail.com
DROP POLICY IF EXISTS "Owner full access on projects" ON public.projects;
CREATE POLICY "Owner full access on projects"
    ON public.projects
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = 'girasejitendra249@gmail.com'
    )
    WITH CHECK (
        auth.jwt() ->> 'email' = 'girasejitendra249@gmail.com'
    );

-- ==============================================================================
-- POLICIES FOR 'showreel' TABLE
-- ==============================================================================

-- Public Visitors: Allow read-only access to published showreel
DROP POLICY IF EXISTS "Public can view published showreel" ON public.showreel;
CREATE POLICY "Public can view published showreel"
    ON public.showreel
    FOR SELECT
    USING (published = true);

-- Authorized Owner: Full access to manage showreel
DROP POLICY IF EXISTS "Owner full access on showreel" ON public.showreel;
CREATE POLICY "Owner full access on showreel"
    ON public.showreel
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = 'girasejitendra249@gmail.com'
    )
    WITH CHECK (
        auth.jwt() ->> 'email' = 'girasejitendra249@gmail.com'
    );

-- ==============================================================================
-- POLICIES FOR 'audit_logs' TABLE
-- ==============================================================================

-- Public Visitors: NO ACCESS
-- Authorized Owner: Read-only access to audit trail
DROP POLICY IF EXISTS "Owner can view audit logs" ON public.audit_logs;
CREATE POLICY "Owner can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'email' = 'girasejitendra249@gmail.com'
    );

-- Server / Functions / Owner: Can insert audit log entries
DROP POLICY IF EXISTS "Authorized insert to audit logs" ON public.audit_logs;
CREATE POLICY "Authorized insert to audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- ==============================================================================
-- STORAGE BUCKET POLICIES (Supabase Storage)
-- ==============================================================================
-- Buckets: 'videos' and 'thumbnails'

-- Insert buckets if not present
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for video & thumbnail files
DROP POLICY IF EXISTS "Public can view videos" ON storage.objects;
CREATE POLICY "Public can view videos"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('videos', 'thumbnails'));

-- Owner-only upload access
DROP POLICY IF EXISTS "Owner can upload media" ON storage.objects;
CREATE POLICY "Owner can upload media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id IN ('videos', 'thumbnails')
        AND (auth.jwt() ->> 'email' = 'girasejitendra249@gmail.com')
    );

-- Owner-only update access
DROP POLICY IF EXISTS "Owner can update media" ON storage.objects;
CREATE POLICY "Owner can update media"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id IN ('videos', 'thumbnails')
        AND (auth.jwt() ->> 'email' = 'girasejitendra249@gmail.com')
    );

-- Owner-only delete access
DROP POLICY IF EXISTS "Owner can delete media" ON storage.objects;
CREATE POLICY "Owner can delete media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id IN ('videos', 'thumbnails')
        AND (auth.jwt() ->> 'email' = 'girasejitendra249@gmail.com')
    );
