-- =====================================================================
-- LUMEN Studio — Schema completo (29 tabelas)
-- Migration aditiva: cria tabelas, habilita RLS e cria policies.
-- Segura para re-execução (idempotente via IF NOT EXISTS / DROP POLICY).
-- =====================================================================

-- Extensão necessária para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Criador',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. workspaces
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL DEFAULT 'Meu Espaço',
  plan TEXT NOT NULL DEFAULT 'free',
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3. brand_profiles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  active_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 4. brand_profile_versions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brand_profile_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  snapshot_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5. offers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'servico',
  price DECIMAL,
  term TEXT,
  guarantee TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 6. research_answers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  group_key TEXT NOT NULL,
  field_key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, group_key, field_key)
);

-- ---------------------------------------------------------------------
-- 7. interview_answers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  guide_code TEXT NOT NULL,
  transcript TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, guide_code)
);

-- ---------------------------------------------------------------------
-- 8. generation_jobs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  model TEXT NOT NULL DEFAULT 'simulado',
  prompt_version TEXT NOT NULL DEFAULT '1.0',
  context_version INTEGER,
  client_request_id TEXT,
  error TEXT,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 9. content_items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  objective TEXT,
  funnel_stage TEXT,
  awareness INTEGER,
  cta TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  brand_profile_version_id UUID,
  source_creative_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 10. content_blocks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 11. content_schedules
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL DEFAULT 'instagram',
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 12. media_assets
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  storage_path TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 13. captured_creatives
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS captured_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  transcript TEXT,
  hash TEXT,
  author TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 14. profile_captures
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  snapshot_json JSONB NOT NULL DEFAULT '{}',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 15. analysis_reports
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  analysis_json JSONB NOT NULL DEFAULT '{}',
  generation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 16. funnel_catalog_items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funnel_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  stage_tags TEXT[] NOT NULL DEFAULT '{}',
  ticket_tags TEXT[] NOT NULL DEFAULT '{}',
  requirements_json JSONB NOT NULL DEFAULT '{}',
  assets_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ativo',
  difficulty TEXT NOT NULL DEFAULT 'medio',
  estimated_time TEXT NOT NULL DEFAULT '1-2 semanas',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 17. funnel_diagnoses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funnel_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  offer_id UUID,
  validation TEXT,
  audience TEXT,
  objective TEXT,
  resources_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 18. funnel_ecosystems
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funnel_ecosystems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  diagnosis_id UUID NOT NULL REFERENCES funnel_diagnoses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'recomendado',
  rationale TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 19. funnel_plans
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funnel_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecosystem_id UUID NOT NULL REFERENCES funnel_ecosystems(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES funnel_catalog_items(id),
  "order" INTEGER NOT NULL DEFAULT 0,
  plan_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 20. checklist_items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_plan_id UUID NOT NULL REFERENCES funnel_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'media',
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 21. asset_requirements
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_plan_id UUID NOT NULL REFERENCES funnel_plans(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 22. page_projects
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'topo',
  objective TEXT,
  voice TEXT,
  accent TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 23. page_sections
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES page_projects(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  content_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 24. video_scripts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  duration TEXT,
  inputs_json JSONB NOT NULL DEFAULT '{}',
  script_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 25. sales_assist_requests
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_assist_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  input_mode TEXT NOT NULL DEFAULT 'texto',
  situation TEXT NOT NULL DEFAULT '',
  context_json JSONB NOT NULL DEFAULT '{}',
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 26. metric_readings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 27. support_conversations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  messages_json JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'aberta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 28. capture_tokens
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS capture_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 29. audit_events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
-- profiles: permissão anon/authenticated para SELECT/INSERT/UPDATE/DELETE (pode filtrar por id = auth.uid() se autenticado)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (true);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (true);

-- workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (true);
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE USING (true);
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE USING (true);

-- Tabela com workspace_id
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brand_profiles_select" ON brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_insert" ON brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_update" ON brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_delete" ON brand_profiles;
CREATE POLICY "brand_profiles_select" ON brand_profiles FOR SELECT USING (true);
CREATE POLICY "brand_profiles_insert" ON brand_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "brand_profiles_update" ON brand_profiles FOR UPDATE USING (true);
CREATE POLICY "brand_profiles_delete" ON brand_profiles FOR DELETE USING (true);

ALTER TABLE brand_profile_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brand_profile_versions_select" ON brand_profile_versions;
DROP POLICY IF EXISTS "brand_profile_versions_insert" ON brand_profile_versions;
DROP POLICY IF EXISTS "brand_profile_versions_update" ON brand_profile_versions;
DROP POLICY IF EXISTS "brand_profile_versions_delete" ON brand_profile_versions;
CREATE POLICY "brand_profile_versions_select" ON brand_profile_versions FOR SELECT USING (true);
CREATE POLICY "brand_profile_versions_insert" ON brand_profile_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "brand_profile_versions_update" ON brand_profile_versions FOR UPDATE USING (true);
CREATE POLICY "brand_profile_versions_delete" ON brand_profile_versions FOR DELETE USING (true);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offers_select" ON offers;
DROP POLICY IF EXISTS "offers_insert" ON offers;
DROP POLICY IF EXISTS "offers_update" ON offers;
DROP POLICY IF EXISTS "offers_delete" ON offers;
CREATE POLICY "offers_select" ON offers FOR SELECT USING (true);
CREATE POLICY "offers_insert" ON offers FOR INSERT WITH CHECK (true);
CREATE POLICY "offers_update" ON offers FOR UPDATE USING (true);
CREATE POLICY "offers_delete" ON offers FOR DELETE USING (true);

ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "generation_jobs_select" ON generation_jobs;
DROP POLICY IF EXISTS "generation_jobs_insert" ON generation_jobs;
DROP POLICY IF EXISTS "generation_jobs_update" ON generation_jobs;
DROP POLICY IF EXISTS "generation_jobs_delete" ON generation_jobs;
CREATE POLICY "generation_jobs_select" ON generation_jobs FOR SELECT USING (true);
CREATE POLICY "generation_jobs_insert" ON generation_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "generation_jobs_update" ON generation_jobs FOR UPDATE USING (true);
CREATE POLICY "generation_jobs_delete" ON generation_jobs FOR DELETE USING (true);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_items_select" ON content_items;
DROP POLICY IF EXISTS "content_items_insert" ON content_items;
DROP POLICY IF EXISTS "content_items_update" ON content_items;
DROP POLICY IF EXISTS "content_items_delete" ON content_items;
CREATE POLICY "content_items_select" ON content_items FOR SELECT USING (true);
CREATE POLICY "content_items_insert" ON content_items FOR INSERT WITH CHECK (true);
CREATE POLICY "content_items_update" ON content_items FOR UPDATE USING (true);
CREATE POLICY "content_items_delete" ON content_items FOR DELETE USING (true);

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "media_assets_select" ON media_assets;
DROP POLICY IF EXISTS "media_assets_insert" ON media_assets;
DROP POLICY IF EXISTS "media_assets_update" ON media_assets;
DROP POLICY IF EXISTS "media_assets_delete" ON media_assets;
CREATE POLICY "media_assets_select" ON media_assets FOR SELECT USING (true);
CREATE POLICY "media_assets_insert" ON media_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "media_assets_update" ON media_assets FOR UPDATE USING (true);
CREATE POLICY "media_assets_delete" ON media_assets FOR DELETE USING (true);

ALTER TABLE captured_creatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "captured_creatives_select" ON captured_creatives;
DROP POLICY IF EXISTS "captured_creatives_insert" ON captured_creatives;
DROP POLICY IF EXISTS "captured_creatives_update" ON captured_creatives;
DROP POLICY IF EXISTS "captured_creatives_delete" ON captured_creatives;
CREATE POLICY "captured_creatives_select" ON captured_creatives FOR SELECT USING (true);
CREATE POLICY "captured_creatives_insert" ON captured_creatives FOR INSERT WITH CHECK (true);
CREATE POLICY "captured_creatives_update" ON captured_creatives FOR UPDATE USING (true);
CREATE POLICY "captured_creatives_delete" ON captured_creatives FOR DELETE USING (true);

ALTER TABLE profile_captures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_captures_select" ON profile_captures;
DROP POLICY IF EXISTS "profile_captures_insert" ON profile_captures;
DROP POLICY IF EXISTS "profile_captures_update" ON profile_captures;
DROP POLICY IF EXISTS "profile_captures_delete" ON profile_captures;
CREATE POLICY "profile_captures_select" ON profile_captures FOR SELECT USING (true);
CREATE POLICY "profile_captures_insert" ON profile_captures FOR INSERT WITH CHECK (true);
CREATE POLICY "profile_captures_update" ON profile_captures FOR UPDATE USING (true);
CREATE POLICY "profile_captures_delete" ON profile_captures FOR DELETE USING (true);

ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analysis_reports_select" ON analysis_reports;
DROP POLICY IF EXISTS "analysis_reports_insert" ON analysis_reports;
DROP POLICY IF EXISTS "analysis_reports_update" ON analysis_reports;
DROP POLICY IF EXISTS "analysis_reports_delete" ON analysis_reports;
CREATE POLICY "analysis_reports_select" ON analysis_reports FOR SELECT USING (true);
CREATE POLICY "analysis_reports_insert" ON analysis_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "analysis_reports_update" ON analysis_reports FOR UPDATE USING (true);
CREATE POLICY "analysis_reports_delete" ON analysis_reports FOR DELETE USING (true);

ALTER TABLE funnel_diagnoses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "funnel_diagnoses_select" ON funnel_diagnoses;
DROP POLICY IF EXISTS "funnel_diagnoses_insert" ON funnel_diagnoses;
DROP POLICY IF EXISTS "funnel_diagnoses_update" ON funnel_diagnoses;
DROP POLICY IF EXISTS "funnel_diagnoses_delete" ON funnel_diagnoses;
CREATE POLICY "funnel_diagnoses_select" ON funnel_diagnoses FOR SELECT USING (true);
CREATE POLICY "funnel_diagnoses_insert" ON funnel_diagnoses FOR INSERT WITH CHECK (true);
CREATE POLICY "funnel_diagnoses_update" ON funnel_diagnoses FOR UPDATE USING (true);
CREATE POLICY "funnel_diagnoses_delete" ON funnel_diagnoses FOR DELETE USING (true);

ALTER TABLE funnel_ecosystems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "funnel_ecosystems_select" ON funnel_ecosystems;
DROP POLICY IF EXISTS "funnel_ecosystems_insert" ON funnel_ecosystems;
DROP POLICY IF EXISTS "funnel_ecosystems_update" ON funnel_ecosystems;
DROP POLICY IF EXISTS "funnel_ecosystems_delete" ON funnel_ecosystems;
CREATE POLICY "funnel_ecosystems_select" ON funnel_ecosystems FOR SELECT USING (true);
CREATE POLICY "funnel_ecosystems_insert" ON funnel_ecosystems FOR INSERT WITH CHECK (true);
CREATE POLICY "funnel_ecosystems_update" ON funnel_ecosystems FOR UPDATE USING (true);
CREATE POLICY "funnel_ecosystems_delete" ON funnel_ecosystems FOR DELETE USING (true);

ALTER TABLE page_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "page_projects_select" ON page_projects;
DROP POLICY IF EXISTS "page_projects_insert" ON page_projects;
DROP POLICY IF EXISTS "page_projects_update" ON page_projects;
DROP POLICY IF EXISTS "page_projects_delete" ON page_projects;
CREATE POLICY "page_projects_select" ON page_projects FOR SELECT USING (true);
CREATE POLICY "page_projects_insert" ON page_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "page_projects_update" ON page_projects FOR UPDATE USING (true);
CREATE POLICY "page_projects_delete" ON page_projects FOR DELETE USING (true);

ALTER TABLE video_scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_scripts_select" ON video_scripts;
DROP POLICY IF EXISTS "video_scripts_insert" ON video_scripts;
DROP POLICY IF EXISTS "video_scripts_update" ON video_scripts;
DROP POLICY IF EXISTS "video_scripts_delete" ON video_scripts;
CREATE POLICY "video_scripts_select" ON video_scripts FOR SELECT USING (true);
CREATE POLICY "video_scripts_insert" ON video_scripts FOR INSERT WITH CHECK (true);
CREATE POLICY "video_scripts_update" ON video_scripts FOR UPDATE USING (true);
CREATE POLICY "video_scripts_delete" ON video_scripts FOR DELETE USING (true);

ALTER TABLE sales_assist_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_assist_requests_select" ON sales_assist_requests;
DROP POLICY IF EXISTS "sales_assist_requests_insert" ON sales_assist_requests;
DROP POLICY IF EXISTS "sales_assist_requests_update" ON sales_assist_requests;
DROP POLICY IF EXISTS "sales_assist_requests_delete" ON sales_assist_requests;
CREATE POLICY "sales_assist_requests_select" ON sales_assist_requests FOR SELECT USING (true);
CREATE POLICY "sales_assist_requests_insert" ON sales_assist_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "sales_assist_requests_update" ON sales_assist_requests FOR UPDATE USING (true);
CREATE POLICY "sales_assist_requests_delete" ON sales_assist_requests FOR DELETE USING (true);

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "support_conversations_select" ON support_conversations;
DROP POLICY IF EXISTS "support_conversations_insert" ON support_conversations;
DROP POLICY IF EXISTS "support_conversations_update" ON support_conversations;
DROP POLICY IF EXISTS "support_conversations_delete" ON support_conversations;
CREATE POLICY "support_conversations_select" ON support_conversations FOR SELECT USING (true);
CREATE POLICY "support_conversations_insert" ON support_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "support_conversations_update" ON support_conversations FOR UPDATE USING (true);
CREATE POLICY "support_conversations_delete" ON support_conversations FOR DELETE USING (true);

ALTER TABLE capture_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "capture_tokens_select" ON capture_tokens;
DROP POLICY IF EXISTS "capture_tokens_insert" ON capture_tokens;
DROP POLICY IF EXISTS "capture_tokens_update" ON capture_tokens;
DROP POLICY IF EXISTS "capture_tokens_delete" ON capture_tokens;
CREATE POLICY "capture_tokens_select" ON capture_tokens FOR SELECT USING (true);
CREATE POLICY "capture_tokens_insert" ON capture_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "capture_tokens_update" ON capture_tokens FOR UPDATE USING (true);
CREATE POLICY "capture_tokens_delete" ON capture_tokens FOR DELETE USING (true);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_events_select" ON audit_events;
DROP POLICY IF EXISTS "audit_events_insert" ON audit_events;
DROP POLICY IF EXISTS "audit_events_update" ON audit_events;
DROP POLICY IF EXISTS "audit_events_delete" ON audit_events;
CREATE POLICY "audit_events_select" ON audit_events FOR SELECT USING (true);
CREATE POLICY "audit_events_insert" ON audit_events FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_events_update" ON audit_events FOR UPDATE USING (true);
CREATE POLICY "audit_events_delete" ON audit_events FOR DELETE USING (true);

-- funnel_catalog_items: catálogo global
ALTER TABLE funnel_catalog_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "funnel_catalog_items_select" ON funnel_catalog_items;
DROP POLICY IF EXISTS "funnel_catalog_items_insert" ON funnel_catalog_items;
DROP POLICY IF EXISTS "funnel_catalog_items_update" ON funnel_catalog_items;
DROP POLICY IF EXISTS "funnel_catalog_items_delete" ON funnel_catalog_items;
CREATE POLICY "funnel_catalog_items_select" ON funnel_catalog_items FOR SELECT USING (true);
CREATE POLICY "funnel_catalog_items_insert" ON funnel_catalog_items FOR INSERT WITH CHECK (true);
CREATE POLICY "funnel_catalog_items_update" ON funnel_catalog_items FOR UPDATE USING (true);
CREATE POLICY "funnel_catalog_items_delete" ON funnel_catalog_items FOR DELETE USING (true);

ALTER TABLE research_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "research_answers_all" ON research_answers;
CREATE POLICY "research_answers_all" ON research_answers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE interview_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "interview_answers_all" ON interview_answers;
CREATE POLICY "interview_answers_all" ON interview_answers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_blocks_all" ON content_blocks;
CREATE POLICY "content_blocks_all" ON content_blocks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE content_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_schedules_all" ON content_schedules;
CREATE POLICY "content_schedules_all" ON content_schedules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE funnel_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "funnel_plans_all" ON funnel_plans;
CREATE POLICY "funnel_plans_all" ON funnel_plans FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_items_all" ON checklist_items;
CREATE POLICY "checklist_items_all" ON checklist_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE asset_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asset_requirements_all" ON asset_requirements;
CREATE POLICY "asset_requirements_all" ON asset_requirements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "page_sections_all" ON page_sections;
CREATE POLICY "page_sections_all" ON page_sections FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE metric_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "metric_readings_all" ON metric_readings;
CREATE POLICY "metric_readings_all" ON metric_readings FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- updated_at automático para tabelas com essa coluna
-- =====================================================================
CREATE OR REPLACE FUNCTION lumen_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offers_updated_at ON offers;
CREATE TRIGGER trg_offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_generation_jobs_updated_at ON generation_jobs;
CREATE TRIGGER trg_generation_jobs_updated_at BEFORE UPDATE ON generation_jobs
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_content_items_updated_at ON content_items;
CREATE TRIGGER trg_content_items_updated_at BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_content_blocks_updated_at ON content_blocks;
CREATE TRIGGER trg_content_blocks_updated_at BEFORE UPDATE ON content_blocks
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_content_schedules_updated_at ON content_schedules;
CREATE TRIGGER trg_content_schedules_updated_at BEFORE UPDATE ON content_schedules
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_funnel_diagnoses_updated_at ON funnel_diagnoses;
CREATE TRIGGER trg_funnel_diagnoses_updated_at BEFORE UPDATE ON funnel_diagnoses
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_funnel_ecosystems_updated_at ON funnel_ecosystems;
CREATE TRIGGER trg_funnel_ecosystems_updated_at BEFORE UPDATE ON funnel_ecosystems
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_funnel_plans_updated_at ON funnel_plans;
CREATE TRIGGER trg_funnel_plans_updated_at BEFORE UPDATE ON funnel_plans
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_page_projects_updated_at ON page_projects;
CREATE TRIGGER trg_page_projects_updated_at BEFORE UPDATE ON page_projects
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_video_scripts_updated_at ON video_scripts;
CREATE TRIGGER trg_video_scripts_updated_at BEFORE UPDATE ON video_scripts
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();

DROP TRIGGER IF EXISTS trg_support_conversations_updated_at ON support_conversations;
CREATE TRIGGER trg_support_conversations_updated_at BEFORE UPDATE ON support_conversations
  FOR EACH ROW EXECUTE FUNCTION lumen_set_updated_at();