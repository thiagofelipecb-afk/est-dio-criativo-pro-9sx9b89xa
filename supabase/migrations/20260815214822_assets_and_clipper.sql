-- Migration: Auto-Clipper IA and Assets Packs
-- Date: 2026-08-15

-- 1. Create table for Auto-Clipper projects & clips
CREATE TABLE IF NOT EXISTS public.clipper_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'youtube' or 'upload'
  source_url TEXT,
  duration_target TEXT NOT NULL, -- '15s', '30s', '60s', '90s', '120s', or custom
  status TEXT NOT NULL DEFAULT 'draft', -- 'processing', 'completed', 'failed'
  transcription TEXT,
  video_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clipper_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.clipper_projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  duration_seconds NUMERIC NOT NULL,
  viral_score INTEGER NOT NULL DEFAULT 90,
  hook_summary TEXT,
  word_timestamps JSONB DEFAULT '[]'::jsonb,
  preview_url TEXT,
  thumbnail_url TEXT,
  applied_overlay TEXT,
  applied_sfx TEXT,
  applied_music TEXT,
  is_exported BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create tables for Packs: Overlays, SFX and Tracks
CREATE TABLE IF NOT EXISTS public.overlay_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Glitter', 'Poeira', 'Retro', 'Cyber', 'Seta', 'Film Burns', 'Light Leaks'
  blend_mode TEXT NOT NULL DEFAULT 'screen', -- 'screen', 'additive'
  preview_color TEXT DEFAULT '#7C5CFC',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sfx_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Woosh', 'Teclado', 'Mensagem', 'Dinheiro', 'Cliques'
  audio_url TEXT NOT NULL,
  duration_seconds NUMERIC DEFAULT 0.5,
  icon_name TEXT DEFAULT 'Volume2',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.capcut_tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'Trilha CapCut',
  audio_url TEXT NOT NULL,
  duration_seconds NUMERIC DEFAULT 120,
  bpm INTEGER DEFAULT 110,
  genre TEXT DEFAULT 'Viral',
  cover_url TEXT,
  has_auto_ducking BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.clipper_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipper_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overlay_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sfx_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capcut_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_clipper_projects" ON public.clipper_projects;
CREATE POLICY "authenticated_clipper_projects" ON public.clipper_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_clipper_clips" ON public.clipper_clips;
CREATE POLICY "authenticated_clipper_clips" ON public.clipper_clips
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_overlay_assets" ON public.overlay_assets;
CREATE POLICY "public_overlay_assets" ON public.overlay_assets
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_sfx_assets" ON public.sfx_assets;
CREATE POLICY "public_sfx_assets" ON public.sfx_assets
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_capcut_tracks" ON public.capcut_tracks;
CREATE POLICY "public_capcut_tracks" ON public.capcut_tracks
  FOR SELECT TO public USING (true);
