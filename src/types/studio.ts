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

/** Layout do palco: câmera em cima + parte inferior reservada, ou câmera cheia. */
export type StageLayout = 'split' | 'full'

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
  recoveryManifest?: {
    version: number
    layout: StageLayout
    cameraCover: number
    audio: Pick<
      AudioConfig,
      'noiseSuppression' | 'autoGainControl' | 'echoCancellation' | 'manualGain'
    >
    scriptText?: string
  }
}

/* ===========================================================================
   LUMEN Studio — Roteiro & Teleprompter por Blocos (FASE 2)
   Tipos aditivos. Nenhum tipo existente foi removido ou alterado.
   =========================================================================== */

/** Status de gravação de um bloco de roteiro. */
export type ScriptBlockStatus = 'ready' | 'pending'

/** Modo de exibição do teleprompter integrado na Gravadora. */
export type TeleprompterMode = 'blocks' | 'continuous'

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
}
