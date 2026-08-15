-- 0003_add_projects_table.sql
-- Adiciona a tabela projects para o useDraftStore e sincronização do LUMEN Studio.

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Sem Título',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Ativa RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Políticas idênticas às de outras tabelas publicas para usuários autenticados
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (true);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.lumen_set_updated_at();
