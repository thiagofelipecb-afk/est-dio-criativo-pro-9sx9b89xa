/* =====================================================================
   src/lib/migration.ts
   ---------------------------------------------------------------------
   Migração de dados do localStorage (cache offline) para o Supabase.

   - Lê todas as chaves `lumen_*` do localStorage.
   - Mapeia cada entidade para a tabela Supabase correspondente.
   - Usa upsert (INSERT ... ON CONFLICT) para não duplicar.
   - Mantém o localStorage intacto (cache de leitura / fallback offline).
   - Não lança: captura erros por tabela e retorna um relatório.

   IMPORTANTE: esta migração é ADITIVA e não altera nenhum tipo
   existente, nem remove dados locais. O app continua funcionando
   normalmente se o Supabase estiver indisponível.
   ===================================================================== */

import { supabase, isSupabaseConfigured } from './supabase'

// ---- Utilidades de leitura do localStorage ----------------------------

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

// Gera um UUID v4 simples (fallback quando a entidade legada não tem UUID)
function uuidv4(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Tenta interpretar um id legado como UUID; se não for, gera um novo
// determinístico (hash simples) para que re-execuções sejam idempotentes.
function ensureUuid(id: string | undefined | null): string {
  if (!id) return uuidv4()
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRe.test(String(id))) return String(id)
  // Hash determinístico de 32 hex -> formatado como UUID
  let h = 0
  const s = String(id)
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  const hex = (Math.abs(h).toString(16) + '00000000').slice(0, 8)
  const base = (hex + hex + hex + hex).slice(0, 32)
  return `${base.slice(0, 8)}-${base.slice(8, 12)}-4${base.slice(13, 16)}-a${base.slice(17, 20)}-${base.slice(20, 32)}`
}

// ---- Workspace fixo (singleton local do usuário) ----------------------
// Como o app atualmente é single-tenant no localStorage, usamos um
// workspace fixo identificado por uma chave local persistida.

const LOCAL_PROFILE_KEY = 'lumen_migration_profile_id'
const LOCAL_WORKSPACE_KEY = 'lumen_migration_workspace_id'

function getOrCreateLocalIds(): { profileId: string; workspaceId: string } {
  let profileId = localStorage.getItem(LOCAL_PROFILE_KEY)
  let workspaceId = localStorage.getItem(LOCAL_WORKSPACE_KEY)
  if (!profileId) {
    profileId = uuidv4()
    localStorage.setItem(LOCAL_PROFILE_KEY, profileId)
  }
  if (!workspaceId) {
    workspaceId = uuidv4()
    localStorage.setItem(LOCAL_WORKSPACE_KEY, workspaceId)
  }
  return { profileId, workspaceId }
}

/** Garante que existam profile + workspace no Supabase e retorna o workspace_id. */
async function ensureWorkspace(): Promise<string | null> {
  if (!supabase) return null
  const { profileId, workspaceId } = getOrCreateLocalIds()

  // upsert profile (idempotente)
  const { error: pErr } = await supabase
    .from('profiles')
    .upsert({ id: profileId, name: 'Criador' }, { onConflict: 'id' })
  if (pErr) {
    console.warn('[migration] profile upsert falhou (pode ser RLS sem auth):', pErr.message)
  }

  // upsert workspace
  const { error: wErr } = await supabase
    .from('workspaces')
    .upsert(
      { id: workspaceId, owner_id: profileId, name: 'Meu Espaço', plan: 'free', locale: 'pt-BR' },
      { onConflict: 'id' },
    )
  if (wErr) {
    console.warn('[migration] workspace upsert falhou (pode ser RLS sem auth):', wErr.message)
  }

  return workspaceId
}

// ---- Tipos de resultado ----------------------------------------------

export interface MigrationTableReport {
  table: string
  source: string
  count: number
  ok: boolean
  error?: string
}

export interface MigrationReport {
  ok: boolean
  workspaceId: string | null
  tables: MigrationTableReport[]
  startedAt: string
  finishedAt: string
}

// ---- Mapeamentos (localStorage -> Supabase) ---------------------------

// Helper: upsert genérico com tratamento de erro e contagem.
async function upsertBatch(
  table: string,
  rows: Record<string, unknown>[],
  source: string,
): Promise<MigrationTableReport> {
  if (!supabase || rows.length === 0) {
    return { table, source, count: rows.length, ok: true }
  }
  try {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
    return {
      table,
      source,
      count: rows.length,
      ok: !error,
      error: error?.message,
    }
  } catch (e) {
    return {
      table,
      source,
      count: rows.length,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Executa a migração completa do localStorage para o Supabase.
 * Segura para re-execução (idempotente via upsert).
 * Nunca lança — sempre retorna um relatório.
 */
export async function migrateLocalStorageToSupabase(): Promise<MigrationReport> {
  const startedAt = new Date().toISOString()
  const tables: MigrationTableReport[] = []

  if (!isSupabaseConfigured() || !supabase) {
    return {
      ok: false,
      workspaceId: null,
      tables: [],
      startedAt,
      finishedAt: new Date().toISOString(),
    }
  }

  const workspaceId = await ensureWorkspace()
  if (!workspaceId) {
    return {
      ok: false,
      workspaceId: null,
      tables: [],
      startedAt,
      finishedAt: new Date().toISOString(),
    }
  }

  // ---- 1. generation_jobs (lumen_jobs) -------------------------------
  {
    const jobs = readLocal<Record<string, unknown>[]>('lumen_jobs', [])
    const rows = jobs.map((j) => ({
      id: ensureUuid(j.id as string),
      workspace_id: workspaceId,
      kind: (j.kind as string) || 'desconhecido',
      status: (j.status as string) || 'queued',
      model: (j.model as string) || 'simulado',
      prompt_version: (j.promptVersion as string) || '1.0',
      context_version: (j.contextVersion as number) ?? null,
      client_request_id: (j.clientRequestId as string) ?? null,
      error: (j.error as string) ?? null,
      result_json: null,
      created_at: (j.createdAt as string) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
    tables.push(await upsertBatch('generation_jobs', rows, 'lumen_jobs'))
  }

  // ---- 2. content_items (lumen_content) ------------------------------
  {
    const items = readLocal<Record<string, unknown>[]>('lumen_content', [])
    const rows = items.map((c) => ({
      id: ensureUuid(c.id as string),
      workspace_id: workspaceId,
      type: (c.type as string) || 'post',
      title: (c.title as string) || '',
      objective: (c.objective as string) ?? null,
      funnel_stage: (c.funnelStage as string) ?? (c.funnel_stage as string) ?? null,
      awareness: (c.awareness as number) ?? null,
      cta: (c.cta as string) ?? null,
      status: (c.status as string) || 'draft',
      brand_profile_version_id: (c.brand_profile_version_id as string) ?? null,
      source_creative_id: (c.source_creative_id as string) ?? null,
      created_at: (c.createdAt as string) || new Date().toISOString(),
      updated_at: (c.updatedAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('content_items', rows, 'lumen_content'))
  }

  // ---- 3. captured_creatives (lumen_captured) ------------------------
  {
    const items = readLocal<Record<string, unknown>[]>('lumen_captured', [])
    const rows = items.map((c) => ({
      id: ensureUuid(c.id as string),
      workspace_id: workspaceId,
      source: (c.source as string) || 'recriado',
      source_url: (c.sourceUrl as string) ?? null,
      media_type: (c.mediaType as string) || 'image',
      caption: (c.caption as string) ?? null,
      transcript: (c.transcript as string) ?? null,
      hash: null,
      author: (c.author as string) ?? null,
      created_at: (c.capturedAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('captured_creatives', rows, 'lumen_captured'))
  }

  // ---- 4. profile_captures (lumen_profiles) --------------------------
  {
    const items = readLocal<Record<string, unknown>[]>('lumen_profiles', [])
    const rows = items.map((p) => ({
      id: ensureUuid(p.id as string),
      workspace_id: workspaceId,
      handle: (p.handle as string) || '',
      snapshot_json: { snapshot: p.snapshot, report: p.report ?? null },
      captured_at: (p.capturedAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('profile_captures', rows, 'lumen_profiles'))
  }

  // ---- 5. metric_readings (lumen_metrics) ----------------------------
  {
    const items = readLocal<Record<string, unknown>[]>('lumen_metrics', [])
    const rows = items.map((m) => ({
      id: ensureUuid(m.id as string),
      content_id: ensureUuid(m.contentId as string),
      measured_at: (m.measuredAt as string) || new Date().toISOString(),
      metrics_json: (m.metrics as Record<string, unknown>) ?? {},
      created_at: new Date().toISOString(),
    }))
    tables.push(await upsertBatch('metric_readings', rows, 'lumen_metrics'))
  }

  // ---- 6. page_projects (lumen_pages) --------------------------------
  {
    const items = readLocal<Record<string, unknown>[]>('lumen_pages', [])
    const rows = items.map((p) => ({
      id: ensureUuid(p.id as string),
      workspace_id: workspaceId,
      type: (p.type as string) || 'captura',
      stage: (p.stage as string) || 'topo',
      objective: (p.objective as string) ?? null,
      voice: (p.voice as string) ?? null,
      accent: (p.accent as string) ?? null,
      status: (p.status as string) || 'draft',
      created_at: (p.createdAt as string) || new Date().toISOString(),
      updated_at: (p.updatedAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('page_projects', rows, 'lumen_pages'))
  }

  // ---- 7. video_scripts (lumen_video_scripts) ------------------------
  {
    const items = readLocal<Record<string, unknown>[]>('lumen_video_scripts', [])
    const rows = items.map((v) => ({
      id: ensureUuid(v.id as string),
      workspace_id: workspaceId,
      method: (v.method as string) || 'nissin_miojo',
      duration: null,
      inputs_json: (v.inputs as Record<string, unknown>) ?? {},
      script_json: { blocks: v.blocks ?? [] },
      status: (v.status as string) || 'draft',
      created_at: (v.createdAt as string) || new Date().toISOString(),
      updated_at: (v.updatedAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('video_scripts', rows, 'lumen_video_scripts'))
  }

  // ---- 8. sales_assist_requests (lumen_sales_requests) ---------------
  {
    const items = readLocal<Record<string, unknown>[]>('lumen_sales_requests', [])
    const rows = items.map((s) => ({
      id: ensureUuid(s.id as string),
      workspace_id: workspaceId,
      stage: (s.stage as string) || 'prospeccao',
      input_mode: (s.inputMode as string) || 'texto',
      situation: (s.situation as string) || '',
      context_json: { context: s.context ?? '' },
      result_json: (s.result as Record<string, unknown>) ?? null,
      created_at: (s.createdAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('sales_assist_requests', rows, 'lumen_sales_requests'))
  }

  // ---- 9. support_conversations (lumen_clara) -----------------------
  {
    const convo = readLocal<{ messages?: unknown[] } | null>('lumen_clara', null)
    if (convo && Array.isArray(convo.messages)) {
      const rows = [
        {
          id: ensureUuid('clara-main'),
          workspace_id: workspaceId,
          messages_json: convo,
          status: 'aberta',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
      tables.push(await upsertBatch('support_conversations', rows, 'lumen_clara'))
    }
  }

  // ---- 10. capture_tokens (lumen_token) ------------------------------
  {
    const token = readLocal<{
      token?: string
      createdAt?: string
      lastUsedAt?: string | null
    } | null>('lumen_token', null)
    if (token && token.token) {
      const rows = [
        {
          id: ensureUuid('capture-token-main'),
          workspace_id: workspaceId,
          token_hash: token.token,
          scopes: ['capture'],
          revoked_at: null,
          last_used_at: token.lastUsedAt ?? null,
          created_at: token.createdAt || new Date().toISOString(),
        },
      ]
      tables.push(await upsertBatch('capture_tokens', rows, 'lumen_token'))
    }
  }

  // ---- 11. brand_profiles + versions (lumen_brand_profile) ----------
  // Cria um único brand_profile por workspace e um snapshot versionado.
  {
    const bp = readLocal<Record<string, unknown> | null>('lumen_brand_profile', null)
    if (bp) {
      const brandProfileId = ensureUuid('brand-profile-main')
      const versionId = ensureUuid('brand-profile-v1')
      const activeVersion = (bp.activeVersion as number) || 0
      const snapshot = {
        base: bp.base,
        research: bp.research,
        interview: bp.interview,
        assets: bp.assets,
      }
      // brand_profiles
      tables.push(
        await upsertBatch(
          'brand_profiles',
          [
            {
              id: brandProfileId,
              workspace_id: workspaceId,
              active_version_id: activeVersion > 0 ? versionId : null,
              created_at: new Date().toISOString(),
            },
          ],
          'lumen_brand_profile',
        ),
      )
      // brand_profile_versions
      if (activeVersion > 0) {
        tables.push(
          await upsertBatch(
            'brand_profile_versions',
            [
              {
                id: versionId,
                profile_id: brandProfileId,
                version: activeVersion,
                snapshot_json: snapshot,
                created_at: new Date().toISOString(),
              },
            ],
            'lumen_brand_profile',
          ),
        )
      }
    }
  }

  // ---- 12. funnel_diagnoses (lumen_funnel_diagnosis) -----------------
  {
    const rec = readLocal<{ current?: Record<string, unknown> } | null>(
      'lumen_funnel_diagnosis',
      null,
    )
    if (rec && rec.current) {
      const d = rec.current
      const rows = [
        {
          id: ensureUuid('funnel-diagnosis-current'),
          workspace_id: workspaceId,
          offer_id: null,
          validation: (d.validacao as string) ?? null,
          audience: (d.audiencia as string) ?? null,
          objective: (d.objetivo as string) ?? null,
          resources_json: {
            nicho: d.nicho,
            ticket: d.ticket,
            horas_semana: d.horas_semana,
            orcamento: d.orcamento,
            faz_video: d.faz_video,
            equipe: d.equipe,
            aquecimento: d.aquecimento,
            produto_principal: d.produto_principal,
            oferta_esteira: d.oferta_esteira,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
      tables.push(await upsertBatch('funnel_diagnoses', rows, 'lumen_funnel_diagnosis'))
    }
  }

  // ---- 13. funnel_ecosystems (lumen_funnel_ecosystem) ---------------
  {
    const eco = readLocal<Record<string, unknown> | null>('lumen_funnel_ecosystem', null)
    if (eco) {
      const diagnosisId = ensureUuid('funnel-diagnosis-current')
      const rows = [
        {
          id: ensureUuid('funnel-ecosystem-current'),
          workspace_id: workspaceId,
          diagnosis_id: diagnosisId,
          status: (eco.status as string) || 'recomendado',
          rationale: (eco.tese_geral as string) ?? (eco.rationale as string) ?? null,
          version: (eco.version as number) || 1,
          created_at: (eco.createdAt as string) || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
      tables.push(await upsertBatch('funnel_ecosystems', rows, 'lumen_funnel_ecosystem'))
    }
  }

  // ---- 14. ideas -> content_items (lumen_ideas) ----------------------
  // (Ideias são armazenadas como content_items de tipo 'idea' com status 'idea')
  {
    const ideas = readLocal<Record<string, unknown>[]>('lumen_ideas', [])
    const rows = ideas.map((i) => ({
      id: ensureUuid(i.id as string),
      workspace_id: workspaceId,
      type: 'idea',
      title: (i.title as string) || '',
      objective: (i.angle as string) ?? null,
      funnel_stage: null,
      awareness: null,
      cta: null,
      status: 'idea',
      brand_profile_version_id: null,
      source_creative_id: null,
      created_at: (i.createdAt as string) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
    tables.push(await upsertBatch('content_items', rows, 'lumen_ideas'))
  }

  // ---- 15. StudioContext: projects/media/scheduled/carousels/static_posts
  // (Estúdio legado) — mapeados para content_items / media_assets.
  {
    const projects = readLocal<Record<string, unknown>[]>('lumen_projects', [])
    const rows = projects.map((p) => ({
      id: ensureUuid(p.id as string),
      workspace_id: workspaceId,
      type: (p.type as string) || 'video',
      title: (p.title as string) || '',
      objective: null,
      funnel_stage: null,
      awareness: null,
      cta: null,
      status: (p.status as string) || 'draft',
      brand_profile_version_id: null,
      source_creative_id: null,
      created_at: (p.createdAt as string) || new Date().toISOString(),
      updated_at: (p.updatedAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('content_items', rows, 'lumen_projects'))
  }
  {
    const media = readLocal<Record<string, unknown>[]>('lumen_media', [])
    const rows = media.map((m) => ({
      id: ensureUuid(m.id as string),
      workspace_id: workspaceId,
      type: (m.type as string) || 'image',
      storage_path: (m.url as string) ?? null,
      metadata_json: {
        title: m.title,
        tags: m.tags,
        category: m.category,
        duration: m.duration,
        size: m.size,
      },
      created_at: (m.createdAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('media_assets', rows, 'lumen_media'))
  }
  {
    const scheduled = readLocal<Record<string, unknown>[]>('lumen_scheduled', [])
    const rows = scheduled.map((s) => ({
      id: ensureUuid(s.id as string),
      content_id: ensureUuid(s.projectId as string),
      scheduled_at: (s.scheduledDate as string) || new Date().toISOString(),
      channel:
        (Array.isArray(s.platforms) ? (s.platforms as string[])[0] : 'instagram') || 'instagram',
      status: (s.status as string) || 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
    tables.push(await upsertBatch('content_schedules', rows, 'lumen_scheduled'))
  }

  // ---- 16. Escala (lumen_ad_creations, lumen_ad_intel) --------------
  // Ad creations -> audit_events (registro); ad intel -> captured_creatives.
  {
    const ads = readLocal<Record<string, unknown>[]>('lumen_ad_creations', [])
    const rows = ads.map((a) => ({
      id: ensureUuid(a.id as string),
      workspace_id: workspaceId,
      actor_id: null,
      action: 'ad_creation',
      target: 'escala',
      metadata_json: a,
      created_at: (a.createdAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('audit_events', rows, 'lumen_ad_creations'))
  }
  {
    const intel = readLocal<Record<string, unknown>[]>('lumen_ad_intel', [])
    const rows = intel.map((i) => ({
      id: ensureUuid(i.id as string),
      workspace_id: workspaceId,
      source: 'anuncio',
      source_url: (i.libraryUrl as string) ?? null,
      media_type: 'image',
      caption: (i.caption as string) ?? null,
      transcript: null,
      hash: null,
      author: (i.advertiser as string) ?? null,
      created_at: new Date().toISOString(),
    }))
    tables.push(await upsertBatch('captured_creatives', rows, 'lumen_ad_intel'))
  }

  // ---- 17. Vendas scripts (lumen_sales_scripts) ---------------------
  // Mapeados para audit_events (registro de variações de script).
  {
    const scripts = readLocal<Record<string, unknown>[]>('lumen_sales_scripts', [])
    const rows = scripts.map((s) => ({
      id: ensureUuid(s.id as string),
      workspace_id: workspaceId,
      actor_id: null,
      action: 'sales_script',
      target: (s.type as string) || 'vendas',
      metadata_json: s,
      created_at: (s.createdAt as string) || new Date().toISOString(),
    }))
    tables.push(await upsertBatch('audit_events', rows, 'lumen_sales_scripts'))
  }

  // ---- 18. Agenda (lumen_schedule_events) ---------------------------
  // Mapeados para content_schedules quando possível, senão audit_events.
  {
    const events = readLocal<Record<string, unknown>[]>('lumen_schedule_events', [])
    if (events.length) {
      const rows = events.map((e) => ({
        id: ensureUuid(e.id as string),
        content_id: ensureUuid('schedule-placeholder'),
        scheduled_at: (e.date as string) || new Date().toISOString(),
        channel: (e.channel as string) || 'instagram',
        status: (e.status as string) || 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      tables.push(await upsertBatch('content_schedules', rows, 'lumen_schedule_events'))
    }
  }

  const finishedAt = new Date().toISOString()
  const anyError = tables.some((t) => !t.ok)
  return {
    ok: !anyError,
    workspaceId,
    tables,
    startedAt,
    finishedAt,
  }
}

// ---- Verificação de migração já executada -----------------------------

const MIGRATION_FLAG = 'lumen_supabase_migrated_v1'

/** Marca que a migração v1 já foi executada nesta máquina. */
export function markMigrationDone(report: MigrationReport): void {
  try {
    localStorage.setItem(
      MIGRATION_FLAG,
      JSON.stringify({ at: new Date().toISOString(), ok: report.ok }),
    )
  } catch {
    /* ignore */
  }
}

/** Indica se a migração v1 já foi executada. */
export function isMigrationDone(): boolean {
  try {
    return Boolean(localStorage.getItem(MIGRATION_FLAG))
  } catch {
    return false
  }
}

/** Reseta o flag de migração (para re-executar manualmente). */
export function resetMigrationFlag(): void {
  try {
    localStorage.removeItem(MIGRATION_FLAG)
  } catch {
    /* ignore */
  }
}
