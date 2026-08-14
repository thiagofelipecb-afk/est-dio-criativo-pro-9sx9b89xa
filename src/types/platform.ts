// Tipos da Plataforma de Marketing e Vendas com IA
// Modelo de dados baseado na especificação funcional

// ---------- Brand OS (Módulo 1) ----------
export interface BrandBase {
  niche: string
  subniche: string
  service: string
  audience: string
  result: string
  differential: string
  voice: string
  mainOffer: string
}

export interface ResearchAnswer {
  group: number
  fieldKey: string
  value: string
}

export interface InterviewAnswer {
  guideCode: string // G1..G8
  transcript: string
  wordCount: number
}

export type BrandAssetType =
  | 'posicionamento'
  | 'promessa'
  | 'arquetipo'
  | 'inimigo_narrativo'
  | 'tom_de_voz'
  | 'vocabulario'
  | 'storytelling'
  | 'stack_de_prova'
  | 'identidade_visual'
  | 'pilares_de_conteudo'
  | 'linha_editorial'
  | 'bio_taglines'
  | 'oferta_principal'

export interface BrandAsset {
  type: BrandAssetType
  layer:
    | 'quem_voce_e'
    | 'como_voce_fala'
    | 'como_voce_prova'
    | 'como_voce_publica'
    | 'como_voce_vende'
  title: string
  content: string
}

export interface BrandProfileVersion {
  version: number
  snapshot: {
    base: BrandBase
    research: ResearchAnswer[]
    interview: InterviewAnswer[]
  }
  createdAt: string
}

export interface BrandProfile {
  base: BrandBase
  research: ResearchAnswer[]
  interview: InterviewAnswer[]
  assets: BrandAsset[]
  activeVersion: number
  versions: BrandProfileVersion[]
  lastGeneratedAt: string | null
  lastModel: string | null
  lastDurationMs: number | null
}

// ---------- Geração de IA ----------
export type GenerationStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'superseded'

export interface GenerationJob {
  id: string
  kind: string
  status: GenerationStatus
  model: string
  promptVersion: string
  contextVersion: number // versão do Brand OS usada
  durationMs: number | null
  error: string | null
  clientRequestId: string
  createdAt: string
}

// ---------- Conteúdo (Módulo 2) ----------
export type FunnelStage = 'topo' | 'meio' | 'fundo'
export type Awareness = 1 | 2 | 3 | 4 | 5

// Tipos de bloco expandidos (aditivo — mantém compatibilidade com blockType livre)
export type ContentBlockType =
  | 'headline'
  | 'body'
  | 'cta'
  | 'hashtags'
  | 'caption'
  | 'gancho_visual'
  | 'gancho_verbal'
  | 'setup'
  | 'desenvolvimento'
  | 'insight'
  | 'payoff'
  | 'legenda'
  | 'card'
  | 'slide'
  // mantém os tipos legados usados no código existente (roles de carrossel etc.)
  | string

export interface ContentBlock {
  id: string
  blockType: ContentBlockType
  position: number
  text: string
  version: number
  // Campos aditivos (opcionais p/ blocos antigos)
  aiGenerated?: boolean
  locked?: boolean
  order?: number
  regeneratedAt?: string
}

export type ContentStatus =
  | 'rascunho'
  | 'gerando'
  | 'gerado'
  | 'aprovado'
  | 'em_revisao'
  // Novos status alinhados ao Módulo Conteúdo consolidado
  | 'draft'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'cancelled'
  | 'pronto'
  | 'agendado'

export interface ContentItem {
  id: string
  type: 'post' | 'story' | 'reel' | 'carrossel' | 'video'
  title: string
  blocks: ContentBlock[]
  funnelStage: FunnelStage
  awareness: Awareness
  cta: string
  status: ContentStatus
  contextVersion: number
  createdAt: string
  updatedAt: string
  // Campos aditivos (opcionais p/ itens antigos)
  funnel_stage?: FunnelStage | null
  objective?: string
  theme?: string
  brand_profile_version_id?: string | null
  source_creative_id?: string | null
  metadata?: Record<string, any>
  scheduled_at?: string | null
  published_at?: string | null
  // Snapshot da geração (prompt/modelo) para auditoria
  prompt_version?: string
  model?: string
  generated_at?: string | null
  durationMs?: number | null
}

// Helper para mapear projetos antigos do Estúdio (StudioContext) para ContentItem
// sem perder dados — aditivo, não substitui os tipos antigos.
export function projectToContentItem(p: {
  id: string
  title: string
  type: string
  status?: string
  scriptText?: string
  updatedAt?: string
  createdAt?: string
}): ContentItem {
  const typeMap: Record<string, ContentItem['type']> = {
    reel: 'reel',
    video: 'video',
    youtube: 'video',
    carousel: 'carrossel',
    post: 'post',
  }
  const now = new Date().toISOString()
  return {
    id: `legacy-${p.id}`,
    type: typeMap[p.type] || 'post',
    title: p.title,
    blocks: p.scriptText
      ? [
          {
            id: `blk-${p.id}`,
            blockType: 'body',
            position: 0,
            text: p.scriptText,
            version: 1,
          },
        ]
      : [],
    funnelStage: 'topo',
    awareness: 3,
    cta: '',
    status: 'rascunho',
    contextVersion: 0,
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
    source_creative_id: p.id,
    metadata: { legacy: true, originalType: p.type },
  }
}

export interface IdeaItem {
  id: string
  pillar: string
  title: string
  angle: string
  transformed: boolean
  createdAt: string
}

// ---------- Funis (Módulo 3) ----------
export type FunnelDiagnosisState = 'diagnostico' | 'recomendado' | 'aprovado' | 'em_revisao'

// Faixas de ticket médio (Raio-X)
export type TicketFaixa = 'ate_97' | '97_297' | '297_997' | '997_2497' | '2497_9997' | 'acima_9997'

export type ValidacaoMercado =
  | 'nao_validado'
  | 'alguns_clientes'
  | 'clientes_recorrentes'
  | 'escalando'
  | 'dominante'

export type AudienciaFaixa = '0_500' | '500_2k' | '2k_10k' | '10k_50k' | '50k_200k' | '200k_mais'

export type ObjetivoFunnel =
  | 'aquisicao_leads'
  | 'vendas_diretas'
  | 'nutricao_relacionamento'
  | 'lancamento'
  | 'recorrencia_retencao'
  | 'escala_anuncios'

export type HorasDisponiveis = '1_5h' | '5_10h' | '10_20h' | '20_40h' | 'full_time_equipe'

export type OrcamentoMensal = '0_500' | '500_2000' | '2000_10000' | '10000_mais'

export type FazVideo = 'nao_gravo' | 'esporadicamente' | 'regularmente' | 'avancado'

export type EquipeFunnel =
  | 'solo'
  | 'freelancers_pontuais'
  | 'equipe_enxuta'
  | 'equipe_4_10'
  | 'agencia_empresa'

export type AquecimentoAudiencia = 'fria' | 'morna' | 'quente' | 'mista'

export interface FunnelDiagnosis {
  oferta_esteira: string
  produto_principal: string
  ticket: TicketFaixa | ''
  validacao: ValidacaoMercado | ''
  audiencia: AudienciaFaixa | ''
  objetivo: ObjetivoFunnel | ''
  horas_semana: HorasDisponiveis | ''
  orcamento: OrcamentoMensal | ''
  faz_video: FazVideo | ''
  equipe: EquipeFunnel | ''
  aquecimento: AquecimentoAudiencia | ''
  nicho: string
}

// Snapshot versionado do diagnóstico (Raio-X)
export interface FunnelDiagnosisVersion {
  version: number
  snapshot: FunnelDiagnosis
  createdAt: string
  label?: string
}

export interface FunnelDiagnosisRecord {
  current: FunnelDiagnosis
  versions: FunnelDiagnosisVersion[]
}

export interface FunnelCatalogItem {
  id: string
  nome: string
  descricao: string
  etapa: 'entrada' | 'nutricao' | 'conversao'
  faixas_ticket: TicketFaixa[]
  requisitos: string[]
  ativos_necessarios: string[]
  status: 'ativo' | 'beta' | 'em_breve'
  categoria: string
  dificuldade: 'iniciante' | 'intermediario' | 'avancado'
  tempo_estimado: string
  // Campos auxiliares legados (opcionais) — mantidos p/ compat com versões antigas
  name?: string
  stage?: 'entrada' | 'nutricao' | 'conversao'
  ticketTags?: TicketFaixa[]
  requirements?: {
    objective?: string[]
    validation?: string[]
    audience?: string[]
  }
  description?: string
  // Audiência mínima exigida (índice AudienciaFaixa) — opcional
  audiencia_minima?: AudienciaFaixa
}

export interface FunnelEcosystemSelected {
  catalogItemId: string
  etapa: 'entrada' | 'nutricao' | 'conversao'
  justificativa: string
}

export interface FunnelEcosystem {
  diagnosis: FunnelDiagnosis
  status: FunnelDiagnosisState
  tese_geral: string
  justificativas: Record<string, string>
  selected: FunnelEcosystemSelected[]
  approvedSelected?: FunnelEcosystemSelected[]
  version: number
  createdAt: string
  approvedAt?: string | null
  updatedAt?: string | null
  // Campos legados (compat)
  rationale?: string
}

export type ChecklistPrioridade = 'baixa' | 'media' | 'alta' | 'critica'

export interface ChecklistItem {
  id: string
  title: string
  prioridade: ChecklistPrioridade
  concluido_em: string | null
  // Campos legados (compat)
  priority?: ChecklistPrioridade
  done?: boolean
  doneAt?: string | null
}

// Etapa estruturada de um funil
export interface FunnelPlanStage {
  nome: string
  descricao: string
  canal: string
  duracao: string
  ordem: number
}

// Ativo referenciado por ID real do Brand OS
export interface FunnelPlanAsset {
  assetId: string // ID real do ativo do Brand OS (BrandAssetType)
  nome: string
  rationale: string
  status: 'pronto' | 'pendente' | 'ausente' | 'gerando' | 'concluido' | 'falhou'
  // Status da geração do ativo (pendente/gerando/concluído/falhou)
  genStatus?: 'pendente' | 'gerando' | 'concluido' | 'falhou'
  // Snapshot da geração (prompt/modelo/versão do Brand OS) para auditoria
  brand_profile_version_id?: string | null
  prompt_version?: string | null
  model?: string | null
  generated_at?: string | null
  // Texto gerado para o ativo (copy/HTML/etc.)
  content?: string
}

export interface FunnelPlan {
  catalogItemId: string
  order: number
  analysis: string
  estrutura: FunnelPlanStage[]
  techConfig: string[]
  cadence: string[]
  alerts: string[]
  mapa: string[]
  ativos: FunnelPlanAsset[]
  checklist: ChecklistItem[]
  generatedAt: string | null
  // Campos legados (compat) — mantidos para não quebrar Ativos.tsx
  structure?: string[]
  map?: string[]
  assets?: { type: string; recommended: string; rationale: string }[]
}

// ---------- Ativos (Módulo 4) ----------
export interface PageSection {
  id: string
  sectionType: string
  position: number
  content: string
}

export interface PageProject {
  id: string
  type: 'captura' | 'vsl' | 'carta' | 'aplicacao' | 'obrigado'
  stage: FunnelStage
  objective: string
  voice: string
  accent: string
  sections: PageSection[]
  status: ContentStatus
  contextVersion: number
  createdAt: string
  updatedAt: string
  // Snapshot da geração (prompt/modelo/versão do Brand OS) para auditoria
  brand_profile_version_id?: string | null
  prompt_version?: string | null
  model?: string | null
  generated_at?: string | null
  durationMs?: number | null
}

export type VideoScriptMethod = 'vsl_benson' | 'nissin_miojo' | 'aula_vendas'

export interface VideoScript {
  id: string
  method: VideoScriptMethod
  inputs: Record<string, string>
  blocks: ContentBlock[]
  status: ContentStatus
  contextVersion: number
  createdAt: string
  updatedAt: string
  // Snapshot da geração (prompt/modelo/versão do Brand OS) para auditoria
  brand_profile_version_id?: string | null
  prompt_version?: string | null
  model?: string | null
  generated_at?: string | null
  durationMs?: number | null
}

// ---------- Escala (Módulo 5) ----------
export interface AdCreation {
  id: string
  description: string
  contextVersion: number
  recommendation: string
  createdAt: string
}

export interface AdIntelItem {
  id: string
  keyword: string
  advertiser: string
  daysActive: number
  caption: string
  mediaUrl: string
  libraryUrl: string
}

// ---------- Vendas (Módulo 6) ----------
export type SalesStage =
  | 'prospeccao'
  | 'qualificacao'
  | 'reuniao'
  | 'objecao'
  | 'follow_up'
  | 'fechamento'

export type SalesInputMode = 'descrever' | 'colar' | 'print'

export interface SalesAssistRequest {
  id: string
  stage: SalesStage
  inputMode: SalesInputMode
  situation: string
  context: string
  result: {
    script: string
    avoid: string[]
    nextStep: string
    confidence?: 'Alta' | 'Média' | 'Baixa'
    missing?: string[]
  } | null
  contextVersion: number
  createdAt: string
}

export interface SalesScript {
  id: string
  type: string
  contextNote: string
  variations: string[]
  contextVersion: number
  createdAt: string
}

// ---------- Transversais ----------
export type CreativeSource = 'anuncio' | 'instagram' | 'reel' | 'recriado'

export interface CapturedCreative {
  id: string
  source: CreativeSource
  sourceUrl: string
  author: string
  mediaType: 'video' | 'image'
  caption: string
  transcript: string
  capturedAt: string
  analysis: string | null
}

export interface ProfileCapture {
  id: string
  handle: string
  postsCount: number
  snapshot: string
  capturedAt: string
  report: {
    summary: string
    socialSelling: string
    mix: { type: string; pct: number }[]
    patterns: string[]
    hooks: string[]
    ideas: string[]
  } | null
}

export interface MetricReading {
  id: string
  contentId: string
  contentTitle: string
  contentType: 'carrossel' | 'reel' | 'post'
  measuredAt: string
  metrics: Record<string, number>
}

export interface ExtensionToken {
  token: string
  createdAt: string
  lastUsedAt: string | null
}

export interface SupportConversation {
  messages: { role: 'clara' | 'user'; text: string; at: string }[]
}

// ---------- Calendar ----------
export interface ScheduleEvent {
  id: string
  title: string
  date: string // ISO date
  channel: string
  status: 'planejado' | 'aprovado' | 'publicado' | 'cancelado'
}
