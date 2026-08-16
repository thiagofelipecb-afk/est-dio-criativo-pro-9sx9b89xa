export type ProjectType = 'video' | 'reel' | 'carousel' | 'post' | 'youtube'

export interface SubtitleBlock {
  id: string
  startTime: number // in seconds
  endTime: number
  text: string
  highlightWordIndex?: number
  position?: { x: number; y: number }
  style?: {
    fontSize: number
    color: string
    bgColor?: string
    fontFamily: string
    shadow: boolean
    animation: 'none' | 'fade' | 'slide' | 'bounce' | 'typewriter' | 'pop'
  }
}

export interface TimelineClip {
  id: string
  track: 'video' | 'insert' | 'text' | 'audio'
  name: string
  startTime: number // position on timeline
  duration: number
  sourceUrl?: string
  mediaType: 'video' | 'audio' | 'image' | 'text' | 'sticker' | 'shape'
  volume?: number
  fadeIn?: number
  fadeOut?: number
  ducking?: boolean
  filter?: string
  transitionIn?: 'none' | 'dissolve' | 'slide' | 'zoom' | 'wipe' | 'glitch'
  transitionDuration?: number
  // Visual placement
  x?: number
  y?: number
  scale?: number
  rotation?: number
  opacity?: number
  content?: string // for text or sticker type
  color?: string
}

export interface Project {
  id: string
  title: string
  type: ProjectType
  createdAt: string
  updatedAt: string
  duration: number // seconds
  thumbnail: string
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5'
  resolution?: '1080p' | '4K' | '720p'
  clips: TimelineClip[]
  subtitles: SubtitleBlock[]
  status: 'draft' | 'ready' | 'scheduled' | 'published'
  scriptText?: string
  bRollSuggestions?: string[]
  tags?: string[]
}

export interface MediaItem {
  id: string
  title: string
  type: 'video' | 'image' | 'audio'
  url: string
  duration?: number
  size?: string
  createdAt: string
  tags: string[]
  category: 'recording' | 'b-roll' | 'music' | 'sfx' | 'upload' | 'template'
}

/* ===========================================================================
   PROMPT 2 — Modelo canônico único de mídia (MediaAsset)
   --------------------------------------------------------------------------
   Esta é a fonte única de verdade para mídias de toda a aplicação.
   Persistida em `lumen_media_assets` (via mediaService). Substitui o uso
   disperso de `lumen_media`, `lumen_media_library` e do `DEFAULT_MEDIA` fake.
   O tipo `MediaItem` acima é mantido como legado/alias para não quebrar imports.
   =========================================================================== */

/** Tipo de mídia canônico. */
export type MediaType = 'image' | 'video' | 'audio'

/** Origem do ativo na biblioteca canônica. */
export type MediaAssetSource = 'upload' | 'recording' | 'generated' | 'pexels' | 'library'

/** Créditos/atribuição de um ativo (ex.: vídeo do Pexels). */
export interface MediaAssetCredits {
  provider: string
  author?: string
  url?: string
  license?: string
}

/** Ativo de mídia canônico (única fonte de verdade para /midias, /biblioteca,
 *  Gravadora e Editor). Persistido em `lumen_media_assets`. */
export interface MediaAsset {
  id: string
  workspaceId: string
  projectId?: string
  name: string
  type: MediaType
  source: MediaAssetSource
  /** Chave de storage (no fluxo local, igual ao id — reservado para storage remoto). */
  storageKey: string
  /** URL pública (no fluxo local, um data URL base64). */
  publicUrl?: string
  thumbnailKey?: string
  thumbnailUrl?: string
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
  /** Duração em milissegundos (vídeos/áudios). */
  durationMs?: number
  createdAt: string
  updatedAt: string
  credits?: MediaAssetCredits
  /** Metadados livres. Itens demo usam { demo: true }. */
  metadata?: Record<string, unknown>
}

export interface CarouselSlide {
  id: string
  title: string
  subtitle?: string
  bodyText: string
  bgType: 'color' | 'gradient' | 'image'
  bgColor: string
  bgGradient: string
  bgImage?: string
  elements: {
    id: string
    type: 'text' | 'arrow' | 'badge' | 'avatar' | 'shape' | 'step'
    content: string
    x: number
    y: number
    color?: string
    size?: number
  }[]
  layoutTemplate?: string
}

export interface CarouselProject {
  id: string
  title: string
  aspectRatio: '1:1' | '4:5'
  slides: CarouselSlide[]
  createdAt: string
  updatedAt: string
  thumbnail: string
}

export interface StaticPostProject {
  id: string
  title: string
  aspectRatio: '1:1' | '4:5' | '9:16'
  bgType: 'color' | 'gradient' | 'image'
  bgColor: string
  bgGradient: string
  bgImage?: string
  blurAmount: number
  headline: string
  subtitle: string
  authorName: string
  authorHandle: string
  authorAvatar: string
  badgeText: string
  watermark: boolean
  filter: 'none' | 'cinematic' | 'vintage' | 'neon' | 'matte' | 'bw'
  createdAt: string
  updatedAt: string
  thumbnail: string
}

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube'

export interface ScheduledPost {
  id: string
  projectId?: string
  title: string
  mediaUrl: string
  mediaType: 'video' | 'carousel' | 'post'
  platforms: SocialPlatform[]
  scheduledDate: string // ISO string
  caption: string
  hashtags: string[]
  customCoverUrl?: string
  status: 'scheduled' | 'published' | 'error'
  errorMessage?: string
  analyticsEstimate?: {
    views: number
    likes: number
    engagementRate: string
  }
  /** ID do post na plataforma (preenchido quando a publicação é real). */
  platformPostId?: string
  /** URL do post na plataforma (preenchido quando a publicação é real). */
  platformPostUrl?: string
}

export interface AISuggestion {
  id: string
  type: 'subtitles' | 'cuts' | 'transitions' | 'clips' | 'music' | 'broll' | 'review'
  title: string
  description: string
  applied: boolean
  payload: any
  timestamp: string
}

/* ===========================================================================
   LUMEN Studio — Núcleo do Estúdio de Gravação (FASE 1)
   Tipos aditivos. Nenhum tipo existente foi removido ou alterado.
   =========================================================================== */

/**
 * Layout do palco.
 * - 'full'       → câmera em tela cheia (legacy).
 * - 'split-top'  → câmera em cima (~60%) + mídia embaixo (~40%).
 * - 'split-bottom' → mídia em cima (~40%) + câmera embaixo (~60%).
 * O valor legado 'split' é tratado como 'split-top' na Gravadora.
 */
export type StageLayout = 'split' | 'full' | 'split-top' | 'split-bottom'

/** Modo da parte inferior do layout dividido (FASE 3 usará mais modos). */
export type LowerPanelMode = 'none' | 'arts' | 'reaction' | 'board' | 'broll'

/** Guias de zona segura do canvas (apenas preview, não entram na exportação). */
export interface SafeGuides {
  enabled: boolean
  /** Linha horizontal a ~85% da altura (área de botões das redes sociais). */
  buttons: boolean
  /** Linha horizontal a ~92% da altura (área de legenda das redes sociais). */
  caption: boolean
}

/** Configuração do palco/canvas 1080×1920. */
export interface StageConfig {
  layout: StageLayout
  lowerPanelMode: LowerPanelMode
  /** Enquadramento cover: 0 a 1, passo 0.01, padrão 1. */
  cameraCover: number
  guides: SafeGuides
  previewHidden: boolean
  focusMode: boolean
  /**
   * GAP 2 — Enquadramento (cover) da câmera. 0 a 1, passo 0.01, padrão 1.
   * Persistido em `lumen_gravadora_stage` para sobreviver ao recarregamento.
   * Não altera a resolução final do canvas (1080×1920); controla apenas o
   * zoom/escala aplicado ao preview da câmera.
   */
  cameraScale?: number
  /**
   * GAP 3 — Toggle das guias de zona segura (Botões 85% + Legenda 92%).
   * Persistido em `lumen_gravadora_stage`. A exportação nunca inclui as guias
   * (camada `pointer-events-none`).
   */
  showGuides?: boolean
  /**
   * FASE 2 / GAP 1 — Modo de desempenho do preview.
   * 'auto' (padrão) reduz efeitos opcionais automaticamente quando o FPS cai;
   * 'quality' mantém todos os efeitos; 'performance' força redução permanente.
   * NUNCA afeta a resolução de saída (1080×1920) nem o MediaRecorder/áudio.
   */
  performanceMode?: 'auto' | 'quality' | 'performance'
  /**
   * NOVO (split screen) — Mídia exibida na "outra metade" quando o layout é
   * 'split-top' ou 'split-bottom'. Pode ser uma imagem estática, vídeo ou
   * B-roll da biblioteca de mídias. Quando ausente, a metade secundária fica
   * com um placeholder neutro.
   */
  splitMediaUrl?: string
  /** Tipo da mídia dividida: 'image' | 'video'. */
  splitMediaType?: 'image' | 'video'
  /**
   * Proporção (0–1) da altura ocupada pela CÂMERA no layout dividido.
   * Padrão 0.6 (60%). A outra metade ocupa o restante.
   */
  splitCameraRatio?: number
}

/** Cadeia de captação de áudio. */
export interface AudioConfig {
  inputDeviceId: string
  /** Redução de ruído (noiseSuppression) — padrão LIGADO. */
  noiseSuppression: boolean
  /** Ganho automático (autoGainControl) — padrão DESLIGADO. */
  autoGainControl: boolean
  /** Cancelamento de eco (echoCancellation) — padrão LIGADO. */
  echoCancellation: boolean
  /** Ganho manual: 0 a 2 (0%–200%), passo 0.05, padrão 1. Aplicado via GainNode. */
  manualGain: number
}

/** Take de gravação salvo na sessão do Estúdio. */
export interface RecordingTake {
  id: string
  url: string
  duration: number
  timeString: string
  createdAt: string
  /** Manifesto de recuperação mínimo (JSON versionado). */
  recoveryManifest?: RecoveryManifest
  /* PROMPT 69 / GAP 3 — Campos adicionais do take (aditivos). */
  /** Resolução real do vídeo gravado. */
  resolution?: { width: number; height: number }
  /** MIME type real do Blob gravado (ex.: 'video/webm;codecs=vp8,opus'). */
  mimeType?: string
  /** Avisos detectados na captura (ex.: sem áudio, resolução < 720p). */
  warnings?: string[]
  /** Thumbnail (dataUrl JPEG) de um frame capturado no stopRecording. */
  thumbnail?: string | null
  /** Unix timestamp (ms) da gravação. */
  timestamp?: number
}

/* ===========================================================================
   LUMEN Studio — Roteiro & Teleprompter por Blocos (FASE 2)
   Tipos aditivos. Nenhum tipo existente foi removido ou alterado.
   =========================================================================== */

/** Status de gravação de um bloco de roteiro. */
export type ScriptBlockStatus = 'ready' | 'pending'

/** Modo de exibição do teleprompter integrado na Gravadora. */
export type TeleprompterMode = 'blocks' | 'continuous' | 'fixed'

/** Cor do texto do teleprompter. */
export type TeleprompterTextColor = 'white' | 'green' | 'yellow'

/** Bloco de roteiro gerado pelo parser a partir do texto livre. */
export interface ScriptBlock {
  id: string
  /** Texto completo do bloco. */
  text: string
  /** Rótulo opcional (ex.: "Bloco 1", "Cena 2") detectado no parser. */
  title?: string
  /** Status de gravação — alterna manualmente. */
  status: ScriptBlockStatus
  /** Duração estimada em segundos, com base em ~150 palavras/min. */
  estimatedSeconds: number
}

/** Estado completo do roteiro dentro da Gravadora. */
export interface ScriptState {
  /** Texto bruto no editor (fonte da verdade para re-parse). */
  rawText: string
  /** Blocos derivados do rawText. */
  blocks: ScriptBlock[]
  /** Índice do bloco ativo/selecionado no teleprompter. */
  activeBlockIndex: number
  /** GAP PROMPT 8 — Versão do parser que salvou este roteiro. */
  parserVersion?: number
}

/* ===========================================================================
   LUMEN Studio — Camadas e Mídias no Modo Estúdio (FASE 3)
   Tipos aditivos. Nenhum tipo existente foi removido ou alterado.
   =========================================================================== */

/** Arte (imagem) anexada a um bloco de roteiro. Armazenada como data URL base64. */
export interface BlockArt {
  /** Identificador único da arte dentro do bloco. */
  id: string
  /** Data URL base64 da imagem (JPEG/PNG). */
  dataUrl: string
  /** Nome original do arquivo (opcional). */
  name?: string
  /** PROMPT 67 / GAP 1 — ID do ativo no AssetManager (refcount), se registrado. */
  assetId?: string
}

/** Posição configurável de um overlay no canvas (4 cantos). */
export type OverlayCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** Vídeo de reação sobreposto ao canvas durante a gravação. */
export interface ReactionVideo {
  /** Data URL base64 do vídeo (MP4/WebM). */
  dataUrl: string
  /** Nome original do arquivo. */
  name?: string
  /** Tamanho relativo ao canvas: 0.1 a 0.4 (10%–40%). Padrão 0.2. */
  size: number
  /** Canto onde o vídeo aparece. Padrão bottom-right. */
  corner: OverlayCorner
  /** PROMPT 67 / GAP 1 — ID do ativo no AssetManager (refcount), se registrado. */
  assetId?: string
}

/** Tipos de elemento do quadro editável (estilo Excalidraw). */
export type WhiteboardTool =
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'brush'
  | 'text'
  | 'image'
  | 'eraser'
  /* PROMPT 46/47 — Ferramentas adicionais (aditivas). */
  | 'diamond'
  | 'pan'
  | 'frame'
  | 'embed'
  | 'shape'
  | 'laser'
  | 'eyedropper'

/** Elemento serializável do quadro. */
export interface WhiteboardElement {
  id: string
  type: WhiteboardTool
  /** Coordenadas em espaço do canvas (não em pixels de tela). */
  x: number
  y: number
  width: number
  height: number
  /** Pontos do traço livre (brush) — coordenadas relativas. */
  points?: { x: number; y: number }[]
  /** Texto (apenas type='text'). */
  text?: string
  /** Cor de traço/preenchimento. */
  color: string
  /** Espessura da linha em px. */
  strokeWidth: number
  /** Visibilidade (olho). */
  visible: boolean
  /** Bloqueio de posição (cadeado). */
  locked: boolean
  /** Data URL de imagem (apenas type='image'). */
  dataUrl?: string
  /* PROMPT 47/50/51 — Propriedades opcionais adicionais (aditivas). */
  /** Cor de preenchimento (fill) — aplicado antes do contorno. */
  fillColor?: string
  /** Família tipográfica para texto (Inter, serif, mono). */
  fontFamily?: string
  /** Tamanho da fonte para texto (px lógicos). */
  fontSize?: number
  /** Link/URL associado ao elemento (renderiza ícone de corrente). */
  link?: string
  /** Linha/seta curva (quadrática) — Prompt 51. */
  curved?: boolean
  /** Recorte de imagem {x,y,w,h} no espaço da imagem original — Prompt 51. */
  crop?: { x: number; y: number; w: number; h: number }
  /** URL de embed (type='embed') — Prompt 47. */
  embedUrl?: string
  /** Subtipo de forma pré-definida (type='shape') — Prompt 47. */
  shapeType?: 'star' | 'triangle' | 'cloud' | 'heart' | 'checkmark' | 'x'
  /** Rótulo exibido em elementos tipo frame. */
  label?: string
}

/** Grupo de elementos do quadro (para agrupar/desagrupar). */
export interface WhiteboardGroup {
  id: string
  /** IDs dos elementos membros. */
  memberIds: string[]
}

/** Estado persistido do quadro editável. */
export interface WhiteboardState {
  elements: WhiteboardElement[]
  groups: WhiteboardGroup[]
  zoom: number
  /* PROMPT 48 — Estado de visualização do canvas (aditivo). */
  showGrid?: boolean
  snapToGrid?: boolean
  /** Tema do canvas: 'dark' (#0F0F15) ou 'light' (#F5F5F5). */
  theme?: 'dark' | 'light'
  /** Modo de visualização: 'editor' (com ferramentas) ou 'preview'. */
  viewMode?: 'editor' | 'preview'
}

/* ===========================================================================
   LUMEN Studio — Fundo e Título do Modo Estúdio (FASE 4)
   Tipos aditivos. Nenhum tipo existente foi removido ou alterado.
   =========================================================================== */

/** Tipo de fundo do canvas 9:16 da Gravadora. */
export type BackgroundType = 'none' | 'blur' | 'preset' | 'image'

/** Cor de fundo preset disponível no seletor. */
export interface BackgroundPresetColor {
  id: string
  name: string
  value: string
}

/** Configuração persistida do fundo do canvas (lumen_gravadora_fundo). */
export interface BackgroundConfig {
  type: BackgroundType
  /** Intensidade do desfoque (quando type='blur'): 4–25px. Padrão 12. */
  blurAmount?: number
  /** Cor selecionada nos presets (quando type='preset'). */
  presetColor?: string
  /** Data URL base64 da imagem (quando type='image'). */
  imageDataUrl?: string
  /** Nome original do arquivo de imagem. */
  imageName?: string
  /** Tenta remover o fundo da câmera via segmentação do navegador. */
  segmentationEnabled: boolean
}

/** Fontes de título disponíveis no seletor. */
export type TitleFont = 'Anton' | 'Montserrat' | 'Caveat'

/** Alinhamento horizontal do título. */
export type TitleAlignment = 'left' | 'center' | 'right'

/** Posição vertical preset do título. */
export type TitleVerticalPosition = 'top' | 'middle' | 'bottom' | 'custom'

/** Duração de exibição do título. */
export type TitleDuration = 'full' | 'seconds'

/** Configuração persistida do título do canvas (lumen_gravadora_titulo). */
export interface TitleConfig {
  /** Toggle "Exibir título". Padrão OFF. */
  enabled: boolean
  /** Texto do título (até 100 caracteres). */
  text: string
  /** Família tipográfica. */
  font: TitleFont
  /** Tamanho em px (30–180, passo 2). Padrão 64. */
  fontSize: number
  /** Largura relativa ao canvas em % (20–100, passo 5). Padrão 80. */
  width: number
  /** Cor do texto. */
  color: string
  /** Fundo do texto ativado. */
  bgEnabled: boolean
  /** Cor do fundo do texto (ou 'transparent'). */
  bgColor: string
  /** Alinhamento horizontal. */
  alignment: TitleAlignment
  /** Posição vertical preset (ou 'custom' para arraste livre). */
  position: TitleVerticalPosition
  /** Coordenada X normalizada (0–1) usada no arraste livre / custom. */
  normalizedX: number
  /** Coordenada Y normalizada (0–1) usada no arraste livre / custom. */
  normalizedY: number
  /** Tipo de duração. */
  duration: TitleDuration
  /** Segundos de exibição (1–120) quando duration='seconds'. */
  durationSeconds: number
}

/** Atribuição de mídia a um bloco de roteiro (PROMPT 3 — Restaurar artes por bloco). */
export interface BlockMediaAssignment {
  id: string
  projectId: string
  blockId: string
  assetId: string
  kind: 'art' | 'reaction' | 'broll'
  order: number
  enabled: boolean
  fit: 'contain' | 'cover' | 'fill'
  positionX: number // 0-1 normalized
  positionY: number // 0-1 normalized
  scale: number // 0.5-2
  backgroundColor: string
  createdAt: string
}

/** B-roll (vídeo do Pexels) anexado a um bloco de roteiro. */
export interface BlockBRoll {
  /** ID do vídeo no Pexels. */
  pexelsId: number
  /** URL do arquivo de vídeo (loop mudo durante a gravação). */
  url: string
  /** URL da miniatura. */
  thumbnail: string
  /** Nome do autor no Pexels (para crédito). */
  author: string
  /** Duração em segundos. */
  duration: number
  /** Resolução (ex.: "1920×1080"). */
  resolution?: string
  /** PROMPT 58 — URL da página do vídeo no Pexels (para atribuição/licença). */
  licenseUrl?: string
  /** PROMPT 67 / GAP 1 — ID do ativo no AssetManager (refcount), se registrado. */
  assetId?: string
}

/* ===========================================================================
   LUMEN Studio — Edição, Recuperação e Exportação (FASE 5)
   Tipos aditivos. Nenhum tipo existente foi removido ou alterado.
   =========================================================================== */

/**
 * Segmento de timeline não destrutiva.
 * Representa um pedaço contíguo do vídeo bruto entre dois pontos de corte.
 * O vídeo bruto NUNCA é alterado — apenas metadados aqui.
 */
export interface TimelineSegment {
  /** Identificador único do segmento (UUID). */
  id: string
  /** Início (segundos) no vídeo bruto. */
  start: number
  /** Fim (segundos) no vídeo bruto. */
  end: number
  /** Segmento marcado como excluído (não entra na reprodução/exportação). */
  excluded: boolean
  /** Rótulo opcional do segmento. */
  label?: string
}

/**
 * Estado completo da timeline não destrutiva de um projeto.
 * Persistido dentro do ProjectSnapshot.
 */
export interface TimelineState {
  /** Pontos de corte ordenados (segundos no vídeo bruto). */
  segments: TimelineSegment[]
  /** Marcador de entrada (in) em segundos no vídeo bruto. */
  inPoint: number
  /** Marcador de saída (out) em segundos no vídeo bruto. */
  outPoint: number
  /** Posição do cursor de reprodução (segundos no vídeo bruto). */
  cursor: number
}

/**
 * Snapshot versionado de todo o projeto do Estúdio.
 * Inclui roteiro (blocos com IDs estáveis), artes/B-roll por blockId,
 * configurações de fundo/título, takes gravados e estado da timeline.
 */
export interface ProjectSnapshot {
  /** Versão do schema do snapshot. */
  version: number
  /** ISO string do último salvamento. */
  savedAt: string
  /** ID do projeto ao qual o snapshot pertence. */
  projectId: string
  /** Título do projeto no momento do snapshot. */
  title: string
  /** Roteiro: blocos com IDs estáveis (UUID por bloco, nunca por índice). */
  blocks: ScriptBlock[]
  /** Texto bruto do roteiro. */
  scriptText: string
  /** Artes por blockId (chave = blockId, valor = lista de artes). */
  artsByBlock: Record<string, BlockArt[]>
  /** B-roll por blockId (chave = blockId, valor = B-roll ou null). */
  brollByBlock: Record<string, BlockBRoll | null>
  /** Configuração de fundo. */
  background: BackgroundConfig
  /** Configuração de título (overlay). */
  titleConfig: TitleConfig
  /** Configuração de áudio da Gravadora. */
  audio: AudioConfig
  /** Layout do palco da Gravadora. */
  stageLayout: StageLayout
  /** Enquadramento cover. */
  cameraCover: number
  /** Takes gravados nesta sessão. */
  takes: RecordingTake[]
  /** Estado da timeline não destrutiva. */
  timeline: TimelineState
  /** URL do vídeo bruto (blob URL em memória — não persiste entre sessões). */
  rawVideoUrl?: string
  /** Duração do vídeo bruto em segundos. */
  rawVideoDuration?: number
}

/** Progresso da exportação MP4 (renderização Canvas + MediaRecorder). */
export interface ExportProgress {
  /** Fase atual do pipeline. */
  phase:
    | 'idle'
    | 'preparing'
    | 'loading-video'
    | 'rendering'
    | 'finalizing'
    | 'done'
    | 'cancelled'
    | 'error'
  /** Percentual 0–100. */
  percent: number
  /** Mensagem amigável (pt-BR). */
  message: string
  /** Erro técnico (quando phase='error'). */
  error?: string
}

/** Resultado de uma exportação concluída com sucesso. */
export interface ExportResult {
  /** Blob URL do vídeo final gerado. */
  url: string
  /** Blob gerado (para download). */
  blob: Blob
  /** Duração total do vídeo exportado em segundos. */
  duration: number
  /** MIME type escolhido. */
  mimeType: string
  /** Nome do arquivo gerado. */
  filename: string
  /** Thumbnail data URL do primeiro frame. */
  thumbnail?: string
}

/** Registro de blob de vídeo bruto salvo para recuperação de falha. */
export interface RawVideoRecord {
  /** ISO string de quando foi salvo. */
  savedAt: string
  /** Duração estimada em segundos. */
  duration: number
  /** MIME type do blob. */
  mimeType: string
  /** ID do projeto associado. */
  projectId: string
  /** Flag: snapshot correspondente já foi salvo (take finalizado com sucesso). */
  hasSnapshot: boolean
}

/* ===========================================================================
  LUMEN Studio — Manifesto de Recuperação Completo (PROMPT 69 / GAP 3)
  Tipos aditivos. Nenhum tipo existente foi removido ou alterado.
  =========================================================================== */

/** Versão atual do schema do manifesto de recuperação. */
export const RECOVERY_MANIFEST_SCHEMA_VERSION = 1

/** Dispositivos de captura usados na gravação (para reabertura/recuperação). */
export interface CaptureDevice {
  /** Label do dispositivo de vídeo (câmera). */
  videoLabel: string
  /** Label do dispositivo de áudio (microfone). */
  audioLabel: string
}

/**
 * Manifesto de recuperação versionado e completo.
 * Inclui informações suficientes para restaurar a sessão de gravação após
 * uma falha ou para reabrir/importar um take em outra máquina.
 */
export interface RecoveryManifest {
  /** Versão do schema (começa em 1). */
  schemaVersion: number
  /** Layout do palco na gravação. */
  layout: StageLayout
  /** Enquadramento cover. */
  cameraCover: number
  /** Configuração de áudio. */
  audio: Pick<
    AudioConfig,
    'noiseSuppression' | 'autoGainControl' | 'echoCancellation' | 'manualGain'
  >
  /** Texto do roteiro (teleprompter). */
  scriptText?: string
  /* PROMPT 69 / GAP 3 — Campos adicionais (aditivos). */
  /** Unix timestamp (ms) de criação do manifesto. */
  createdAt?: number
  /** Unix timestamp (ms) da última atualização. */
  updatedAt?: number
  /** Dispositivos de captura usados (labels), ou null se indisponível. */
  captureDevice?: CaptureDevice | null
  /** Duração da gravação em milissegundos. */
  durationMs?: number
  /** ID do take (para pareamento vídeo + JSON na importação). */
  takeId?: string
  /** IDs dos blocos do roteiro presentes na gravação. */
  blockIds?: string[]
  /** MIME type do vídeo bruto. */
  mimeType?: string
  /** Resolução real do vídeo. */
  resolution?: { width: number; height: number }
  /** Avisos detectados na captura. */
  warnings?: string[]
  /** Thumbnail (dataUrl JPEG). */
  thumbnail?: string | null
}
/* ===========================================================================
   LUMEN Studio — Máquina de Estados do Modo Estúdio (FASE 6)
   Tipos aditivos. Nenhum tipo existente foi removido ou alterado.
   =========================================================================== */

/**
 * Estado do Modo Estúdio. Camada de validação ADICIONAL sobre a lógica
 * existente da Gravadora — não substitui isRecording/isPaused/etc.
 */
export type StudioMode =
  | 'prepare' // Câmera não iniciada, configurando
  | 'prompter' // Câmera ativa, pronto para gravar, teleprompter disponível
  | 'recording' // Gravando ativamente
  | 'paused' // Gravação pausada
  | 'processing' // Salvando vídeo bruto + snapshot após parar
  | 'recovering' // Gravação interrompida detectada, banner de recuperação
  | 'error' // Permissão negada ou dispositivo desconectado
