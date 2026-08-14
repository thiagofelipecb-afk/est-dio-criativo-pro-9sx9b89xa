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

export interface ContentBlock {
  id: string
  blockType: string
  position: number
  text: string
  version: number
}

export type ContentStatus = 'rascunho' | 'gerando' | 'gerado' | 'aprovado' | 'em_revisao'

export interface ContentItem {
  id: string
  type: 'post' | 'story' | 'reel' | 'carrossel'
  title: string
  blocks: ContentBlock[]
  funnelStage: FunnelStage
  awareness: Awareness
  cta: string
  status: ContentStatus
  contextVersion: number
  createdAt: string
  updatedAt: string
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

export interface FunnelDiagnosis {
  ladder: string
  offerName: string
  ticket: string
  validation: 'nunca_vendeu' | '1_2_vezes' | 'recorrente'
  audience: 'sem' | 'pequena_fria' | 'pequena_engajada' | 'media' | 'grande' | 'parada'
  objective:
    | 'leads'
    | 'aquecer'
    | 'fechar_direto'
    | 'lancar'
    | 'crescer_seguidores'
    | 'vender_digital'
  hoursPerWeek: number
  budget: string
  appearsInVideo: boolean
  hasTeam: boolean
  heating: 'organico' | 'pago' | 'hibrido'
  niche: string
}

export interface FunnelCatalogItem {
  id: string
  name: string
  stage: 'entrada' | 'nutricao' | 'conversao'
  ticketTags: ('baixo' | 'medio' | 'alto')[]
  requirements: {
    objective?: string[]
    validation?: string[]
    audience?: string[]
  }
  description: string
}

export interface FunnelEcosystem {
  diagnosis: FunnelDiagnosis
  status: FunnelDiagnosisState
  rationale: string
  version: number
  selected: {
    catalogItemId: string
    stage: 'entrada' | 'nutricao' | 'conversao'
    justification: string
  }[]
  createdAt: string
}

export interface ChecklistItem {
  id: string
  title: string
  priority: 'alta' | 'media' | 'baixa'
  done: boolean
  doneAt: string | null
}

export interface FunnelPlan {
  catalogItemId: string
  order: number
  analysis: string
  structure: string[]
  techConfig: string[]
  cadence: string[]
  alerts: string[]
  map: string[]
  assets: { type: string; recommended: string; rationale: string }[]
  checklist: ChecklistItem[]
  generatedAt: string | null
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
export type CreativeSource = 'anuncio' | 'instagram' | 'reel'

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
